import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Image, Animated } from 'react-native';
import { ActivityIndicator, Text, useTheme, Button } from 'react-native-paper';
import { useAuth } from '../../context/AuthContext';
import { useDadosUsuario } from '../../context/pessoa-dados-context';
import { api } from '../../network/api';
import { generateRequestHeader, log } from '../../utils/app-utils';
import { toast } from 'sonner-native';
import { goBack, navigate } from '../../router/navigationRef';
import LoadingFull from '../../components/loading-full';
import notifee, { AndroidImportance } from '@notifee/react-native';

const UserTelemedQueueScreen = () => {
  const { colors } = useTheme();
  const { authData } = useAuth();
  const { dadosUsuarioData } = useDadosUsuario();
  const [loading, setLoading] = useState(false);
  const [agendaExamesId, setAgendaExamesId] = useState<number>();
  const [hasAlreadyFetched, setHasAlreadyFetched] = useState<boolean>(false);
  const [positionInQueue, setPositionInQueue] = useState<PacienteFila>();
  const [alreadyShownNotification, setAlreadyShownNotification] = useState<boolean>(false);
  const [pulseAnim] = useState(new Animated.Value(1));

  // Animação de pulsação
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  async function getIntoQueue() {
    setLoading(true);
    
    const body = {
      token_paciente: dadosUsuarioData.pessoaDados?.cod_token_pes,
      especialidade: 'geral',
    };

    try {
      const response = await api.post(`/integracao/gravarTeleAtendimento`, body, generateRequestHeader(authData.access_token));

      if (response.status == 200) {
        const { data } = response;
        setAgendaExamesId(data.agenda_exames_id);
      } 
      else if (response.status == 401) {
        getIntoQueue()
      } 
      else {
        setLoading(false);
        toast.error('Erro ao acessar a fila. Contate o suporte e tente novamente', { position: 'bottom-center' });
      }
    } catch (err) {
      console.log('err', err);
      toast.error("Telemedicina indisponivel no momento. Tente mais tarde.", {position: 'bottom-center'})
        goBack()
    }
  }

  async function getQueue() {
    console.log('getQueue')
    const qry = `?especialidade=geral`;

    const response = await api.get(`/integracao/listTeleAtendimento${qry}`, generateRequestHeader(authData.access_token));

    if ((response.status = 200)) {
      const { data }: { data: PacienteFila[] } = response;

      // obter o menor id
      const filteredPosition = data
        .filter(item => item.paciente_id.includes(String(dadosUsuarioData.pessoaDados?.cod_token_pes)))
        .reduce((min, item) => {
          log('item', item);
          //return Number(item.ordem_fila) < Number(min.ordem_fila) ? item : min;
          return item
        }, data[0]);

      setPositionInQueue(filteredPosition);
      setHasAlreadyFetched(true);
      setLoading(false);
    } else {
      setLoading(false);
      toast.error('Erro ao acessar a fila. Contate o suporte e tente novamente', { position: 'bottom-center' });
      goBack();
    }
  }

  async function showNotification() {
    if(alreadyShownNotification) return;

    await notifee.displayNotification({
      title: "Você é o próximo da fila!",
      body: "Você é o próximo da fila! Clique aqui para voltar para o aplicativo.",
      android: {
        channelId: 'default-id-channel',
        smallIcon: 'ic_notification',
                  color: '#44005F',

        pressAction: { id: 'default' },
      },
    });

    setAlreadyShownNotification(true);
  }

  useEffect(() => {
    (async () => {
      if (dadosUsuarioData.pessoaDados?.cod_token_pes && authData.access_token != '') {
        getIntoQueue();
      }
    })();
  }, [dadosUsuarioData, authData]);

  useEffect(() => {
    (async () => {
      if (agendaExamesId) {
        await getQueue();
      }
    })();
  }, [agendaExamesId]);

  useEffect(() => {
    if (!agendaExamesId) return;

    const interval = setInterval(() => {
      getQueue();
    }, 10000); // chama a cada 10 segundos

    return () => clearInterval(interval); // limpa ao desmontar o componente
  }, [agendaExamesId]);

  useEffect(() => {
    if(positionInQueue?.ordem_fila == '1') {
      showNotification();
    }

    if (!positionInQueue && hasAlreadyFetched) {
      navigate('user-telemed-finished');
    }

    if (positionInQueue && positionInQueue.status.includes('EM ATENDIMENTO')) {
      navigate('user-telemed-meet-screen', {
        url: `${agendaExamesId}_${dadosUsuarioData.pessoaDados?.cod_token_pes}`,
      });
    }
  }, [positionInQueue]);

  return (
    <View style={[styles.container, { backgroundColor: '#f7f7f7' }]}>
      {loading ? (
        <LoadingFull title="Entrando na fila..." />
      ) : (
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            
            <Text variant="headlineSmall" style={[styles.title, { color: colors.primary }]}>
              Aguardando sua vez
            </Text>
          </View>
          
          {/* Card de posição na fila */}
          <Animated.View 
            style={[
              styles.queueCard, 
              { 
                backgroundColor: colors.surface,
                transform: [{ scale: pulseAnim }],
                shadowColor: colors.primary,
              }
            ]}
          >
            <View style={styles.cardHeader}>
              <Text variant="titleLarge" style={[styles.cardTitle, { color: colors.onSurface }]}>
                Sua posição na fila
              </Text>
            </View>
            
            <View style={styles.positionContainer}>
              <Text style={[styles.positionNumber, { color: colors.primary }]}>
                {positionInQueue?.ordem_fila || '--'}
              </Text>
              <Text style={[styles.positionLabel, { color: colors.onSurfaceVariant }]}>
                {positionInQueue?.ordem_fila === '1' ? 'PRÓXIMO!' : 'Pessoas à sua frente'}
              </Text>
            </View>
            
            <View style={styles.statusContainer}>
              <View style={[styles.statusDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.statusText, { color: colors.onSurface }]}>
                {positionInQueue?.status || 'AGUARDANDO'}
              </Text>
            </View>
          </Animated.View>
          
          {/* Informações */}
          <View style={styles.infoContainer}>
            <View style={styles.infoItem}>
             
              <Text style={[styles.infoText, { color: colors.onSurfaceVariant }]}>
                Atualizando a cada 10 segundos
              </Text>
            </View>
            
            <View style={styles.infoItem}>
              
              <Text style={[styles.infoText, { color: colors.onSurfaceVariant }]}>
                Você será notificado quando for sua vez
              </Text>
            </View>
            
            <View style={styles.infoItem}>
             
              <Text style={[styles.infoText, { color: colors.onSurfaceVariant }]}>
                Mantenha o aplicativo aberto
              </Text>
            </View>
          </View>
          
          {/* Indicador de carregamento */}
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.onSurfaceVariant }]}>
              Verificando sua posição...
            </Text>
          </View>
          
          {/* Botões de ação */}
          <View style={styles.buttonGroup}>
            <Button 
              mode="outlined" 
              style={[styles.button, { borderColor: colors.primary }]}
              textColor={colors.primary}
              onPress={() => goBack()}
              icon="arrow-left"
            >
              Voltar
            </Button>
            
            {/* <Button 
              mode="contained" 
              style={[styles.button, { backgroundColor: colors.primary }]}
              onPress={() => navigate('support-screen')}
              icon="headset"
            >
              Suporte
            </Button> */}
          </View>
          
          {/* Nota importante */}
          <Text style={[styles.note, { color: colors.onSurfaceVariant }]}>
            Após o fim da consulta, você será redirecionado automaticamente para a Home do aplicativo
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  title: {
    fontWeight: '700',
    marginLeft: 10,
    marginTop: 10,
  },
  queueCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
    elevation: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: 15,
  },
  cardTitle: {
    fontWeight: '700',
  },
  positionContainer: {
    alignItems: 'center',
    marginVertical: 15,
  },
  positionNumber: {
    fontSize: 64,
    fontWeight: '800',
    lineHeight: 70,
  },
  positionLabel: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 5,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  infoContainer: {
    marginBottom: 30,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  infoIcon: {
    marginRight: 15,
  },
  infoText: {
    fontSize: 16,
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  button: {
    backgroundColor:'#fff',
    flex: 1,
    marginHorizontal: 5,
    borderRadius: 12,
    paddingVertical: 8,
  },
  note: {
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 20,
    fontSize: 14,
  },
});

export default UserTelemedQueueScreen;