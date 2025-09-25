import { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, View, Image } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import { checkMultiple, PERMISSIONS, requestMultiple, RESULTS } from 'react-native-permissions';
import { goBack, navigate } from '../../router/navigationRef';
import { useDadosUsuario } from '../../context/pessoa-dados-context';
import ModalContainer from '../../components/modal';
import { log } from '../../utils/app-utils';

const UserTelemedScreen = () => {
  const { colors } = useTheme();
  const { dadosUsuarioData } = useDadosUsuario();
  const [permissionsGranted, setPermissionsGranted] = useState<boolean>(false);
  const [pendentModalVisible, setPendentModalVisible] = useState(false);
  const isLogged = !dadosUsuarioData.user.id_usuario_usr ? false : true;
  const hasPendent = dadosUsuarioData.pessoaAssinatura?.inadimplencia.length || dadosUsuarioData.pessoaAssinatura?.inadimplencia.length! >  0;

  const permissions = Platform.select({
    android: [PERMISSIONS.ANDROID.CAMERA, PERMISSIONS.ANDROID.RECORD_AUDIO],
    ios: [PERMISSIONS.IOS.CAMERA, PERMISSIONS.IOS.MICROPHONE],
  }) || [];

  const checkPermissions = async () => {
    const statuses = await checkMultiple(permissions);
    const allGranted = Object.values(statuses).every(status => status === RESULTS.GRANTED);
    setPermissionsGranted(allGranted);
  };

  const requestPermissions = async () => {
    await requestMultiple(permissions);
    await checkPermissions(); // revalida depois do pedido
  };

  const handlePress = async () => {
    if (hasPendent) {
      setPendentModalVisible(true);
      return;
    }

    if (!permissionsGranted) {
      await requestPermissions();
      return;
    }

    if (!isLogged) {
      navigate('user-login-screen-telemed');
      return;
    }

    navigate('user-telemed-queue-screen');
  };

  useEffect(() => {
    (async () => {
      const grantedInitially = await checkPermissions()
    })();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.onTertiary }]}>
      <ModalContainer visible={pendentModalVisible} handleVisible={() => setPendentModalVisible(false)}>
        <View style={styles.modalContent}>
          
          <Text style={[styles.modalTitle, { color: colors.onSurface }]}>
            ⚠️ Atenção: Pendências Detectadas ⚠️
          </Text>
          <Text style={[styles.modalText, { color: colors.onSurfaceVariant }]}>
            Você possui pendências que precisam ser resolvidas antes de acessar o atendimento.
          </Text>
          <Text style={[styles.modalText, { color: colors.onSurfaceVariant, marginBottom: 20 }]}>
            Por favor, regularize sua situação para continuar.
          </Text>
          <Button
            onPress={() => {
              setPendentModalVisible(false);
              goBack()
            }}
            mode="contained"
            contentStyle={styles.modalButtonContent}
            labelStyle={styles.modalButtonText}
            style={[styles.modalButton, { backgroundColor: colors.primary }]}>
            Regularizar Agora
          </Button>
        </View>
      </ModalContainer>
      
      
      <ScrollView contentContainerStyle={[styles.contentContainer, { flexGrow: 1 }]}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            
            <Text style={[styles.cardTitle, { color: colors.onSurface }]}>
              Como funciona a Telemedicina?
            </Text>
          </View>
          
          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Text style={styles.featureNumber}>1</Text>
            </View>
            <Text style={[styles.featureText, { color: colors.onSurfaceVariant }]}>
              Conecte-se com médicos especialistas em tempo real
            </Text>
          </View>
          
          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Text style={styles.featureNumber}>2</Text>
            </View>
            <Text style={[styles.featureText, { color: colors.onSurfaceVariant }]}>
              Realize consultas de onde estiver, sem precisar se deslocar
            </Text>
          </View>
          
          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Text style={styles.featureNumber}>3</Text>
            </View>
            <Text style={[styles.featureText, { color: colors.onSurfaceVariant }]}>
              Receba orientações médicas e prescrições quando necessário
            </Text>
          </View>
        </View>

        <View style={[styles.infoCard, { backgroundColor: '#FFFFFF' }]}>
          <Text style={[styles.infoTitle, { color: colors.onSurface }]}>
            Estamos felizes em atendê-lo! 🏥
          </Text>
          <Text style={[styles.infoText, { color: colors.onSurfaceVariant }]}>
            Sua conexão com especialistas em saúde está a apenas um clique de distância.
          </Text>
          <Text style={[styles.infoText, { color: colors.onSurfaceVariant }]}>
            Sabemos o quanto seu bem-estar é importante, e nossa missão é garantir que você receba os melhores cuidados, onde quer que esteja.
          </Text>
        </View>
      </ScrollView>

      {/* Botão fixo no fundo da tela */}
      <View style={[styles.buttonContainer, { backgroundColor: colors.background }]}>
        <Button
          mode="contained"
          style={[styles.button, { backgroundColor: permissionsGranted ? colors.primary : colors.error }]}
          contentStyle={styles.buttonContent}
          labelStyle={styles.buttonText}
          icon={permissionsGranted ? "video" : "camera"}
          onPress={handlePress}>
          {permissionsGranted ? 'Iniciar Atendimento' : 'Permitir Câmera e Microfone'}
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroContainer: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    backgroundColor: '#FFF',
  },
  heroImage: {
    width: 200,
    height: 150,
    resizeMode: 'contain',
    marginBottom: 15,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    maxWidth: 300,
  },
  contentContainer: {
    backgroundColor:'#f7f7f7',
    padding: 20,
    paddingBottom: 210,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardIcon: {
    width: 40,
    height: 40,
    marginRight: 15,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  featureIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  featureNumber: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  featureText: {
    fontSize: 16,
    flex: 1,
  },
  infoCard: {
    borderRadius: 16,
    padding: 20,
    elevation: 2,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 15,
  },
  infoText: {
    fontSize: 16,
    marginBottom: 12,
    lineHeight: 24,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  button: {
    borderRadius: 12,
    paddingVertical: 10,
  },
  buttonContent: {
    height: 50,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContent: {
    alignItems: 'center',
    padding: 20,
  },
  modalIcon: {
    width: 60,
    height: 60,
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 22,
  },
  modalButton: {
    borderRadius: 10,
    paddingVertical: 8,
    marginTop: 10,
    width: '100%',
  },
  modalButtonContent: {
    height: 50,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default UserTelemedScreen;