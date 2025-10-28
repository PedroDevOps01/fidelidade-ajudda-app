import React, { useCallback, useEffect, useState, useRef } from 'react';
import { View, StyleSheet, FlatList, ScrollView, SafeAreaView, Animated, Dimensions, Modal, TouchableWithoutFeedback, Image, TouchableOpacity } from 'react-native';
import { Card, useTheme, Text, Portal, ActivityIndicator, Avatar, Button, IconButton, Badge } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { card_data } from './card_data';
import { promotion_data } from './promotion_data';
import { useDadosUsuario } from '../../context/pessoa-dados-context';
import PagarmeErrorsDialog from './pagarme-errors-dialog';
import ProximosAgendamentosDialog from './proximosagendamentosdialog';
import { navigate } from '../../router/navigationRef';
import InadimplenciaDialog from './inadimplencias-dialog';
import { useConsultas } from '../../context/consultas-context';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../network/api';
import { formatDateToDDMMYYYY, generateRequestHeader } from '../../utils/app-utils';
import MinimalCardComponent from './minimal-card-component';
import BannerHorizontalItem from './banner-card-component';
import LoadingFull from '../../components/loading-full';
import { Platform } from 'react-native';
import notifee, { AndroidImportance } from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import CustomToast from '../../components/custom-toast';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { ImageBackground } from 'react-native';
import { Linking } from 'react-native';
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
import { Alert } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

interface UserSchedule {
  agenda_exames_id: string;
  nome_procedimento: string | string[];
  nome_profissional?: string;
  data: string;
  fachada_profissional?: string;
  inicio: string;
}

interface Parceiro {
  id_parceiro_prc: number;
  des_nome_fantasia_prc: string;
  des_razao_social_prc: string;
  des_endereco_prc: string;
  des_complemento_prc: string;
  des_bairro_prc: string;
  des_municipio_mun: string;
  des_email_responsavel_prc: string;
  des_nome_responsavel_prc: string;
  des_endereco_web_prc: string;
  cod_documento_prc: string;
  num_celular_prc: string;
  num_telefone_prc: string;
  img_parceiro_prc: string | null;
  is_ativo_prc: number;
  is_parceiro_padrao_prc: number;
  dth_cadastro_prc: string;
  dth_alteracao_prc: string;
  id_municipio_prc: number;
  des_parceiro_prc: string | null;
  num_cred_prc: string | null;
  cred_ativo_prc: '0' | '1' | null;
}

interface Termo {
  id_termo_declaracao_tde: number;
  des_descricao_tde: string;
  txt_texto_tde: string;
}

interface Contrato {
  des_descricao_tsi: string;
  des_nome_pes: string;
  des_nome_pla: string;
  des_origem_ori: string;
  dth_cadastro_ctt: string;
  id_contrato_ctt: number;
  inclui_telemedicina_pla: number;
  is_ativo_ctt: number;
  qtd_max_dependentes_pla: number;
  qtd_parcelas_ctt: number;
  vlr_dependente_adicional_pla: number;
  vlr_exclusao_dependente_pla: number;
  vlr_inicial_ctt: number;
}

const TelemedicineCard: React.FC<{ onPress: () => void }> = ({ onPress }) => {
  const { colors } = useTheme();
  const scaleValue = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleValue }], marginBottom: 16 }}>
      <TouchableOpacity onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut} activeOpacity={0.8}>
        <ImageBackground
          source={require('../../assets/images/telemedicina.png')}
          style={styles.telemedicineCard}
          imageStyle={{ borderRadius: 16 }} // mantém os cantos arredondados
        >
          <View style={styles.telemedicineContent}>
            <View style={styles.telemedicineHeader}></View>
          </View>
        </ImageBackground>
      </TouchableOpacity>
    </Animated.View>
  );
};

const LoggedHome = ({ route, navigation }: { route: any; navigation: any }) => {
  const { colors } = useTheme();
  const { dadosUsuarioData, userCreditCards, setCreditCards, userContracts, setContracts, setDadosUsuarioData } = useDadosUsuario();
  // console.log(JSON.stringify(dadosUsuarioData, null, 2));
  const { authData } = useAuth();
  const { setUserSchedulesData, userSchedules } = useConsultas();
  const [lastHistoricSchedule, setLastHistoricSchedule] = useState<UserSchedule | null>(null);
  const [parceiros, setParceiros] = useState<Parceiro[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pagarmeErrors, setPagarmeErrors] = useState<any | null>(null);
  const [pagarmeErrorsDialogVisible, setPagarmeErrorsDialogVisible] = useState<boolean>(false);
  const [inadimplenciasDialogVisible, setInadimplenciasDialogVisible] = useState<boolean>(false);
  const [agendamentosDialogVisible, setAgendamentosDialogVisible] = useState<boolean>(false);
  const [schedulesLoading, setSchedulesLoading] = useState<boolean>(false);
  const [parceirosCredenciados, setParceirosCredenciados] = useState<Parceiro[]>([]);

  const scrollXCredenciados = useRef(new Animated.Value(0)).current;
  const [modalCredenciadosVisible, setModalCredenciadosVisible] = useState(false);
  const [selectedParceiroCredenciadoId, setSelectedParceiroCredenciadoId] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [partnersLoading, setPartnersLoading] = useState<boolean>(true);
  const [hasTelemedicine, setHasTelemedicine] = useState<boolean>(false); // New state for telemedicine
  const scrollXPromo = useRef(new Animated.Value(0)).current;
  const scrollXConsultas = useRef(new Animated.Value(0)).current;
  const isLogged = !!dadosUsuarioData.user.id_usuario_usr;
  const [showTerms, setShowTerms] = useState(false);
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedParceiroId, setSelectedParceiroId] = useState<number | null>(null);
  const [terms, setTerms] = useState<Termo[]>([]);
  const [termsLoading, setTermsLoading] = useState<boolean>(false);
  const [termsError, setTermsError] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const maisConsultasData: { id: string; image: any; action: () => void }[] = parceiros.map(parceiro => ({
    id: parceiro.id_parceiro_prc.toString(),
    image: parceiro.img_parceiro_prc ? { uri: `${parceiro.img_parceiro_prc}` } : require('../../assets/images/logonova.png'),
    action: () => handleParceiroPress(parceiro.id_parceiro_prc),
  }));

  useEffect(() => {
    const isSigned = dadosUsuarioData.pessoa?.is_assinado_pes === 1 || dadosUsuarioData.pessoaDados?.is_assinado_pes === 1;
    const isLogged = !!dadosUsuarioData.user?.id_usuario_usr && !!authData.access_token;

    if (!isSigned && isLogged) {
      setShowTerms(true);
      fetchTerms();
    } else {
      setShowTerms(false);
    }
  }, [dadosUsuarioData, authData.access_token]);

  useEffect(() => {
    const inadimplencias = dadosUsuarioData?.pessoaAssinatura?.inadimplencia;

    if (Array.isArray(inadimplencias) && inadimplencias.length > 0) {
      setInadimplenciasDialogVisible(true);
    } else {
      setInadimplenciasDialogVisible(false);
    }
  }, [dadosUsuarioData?.pessoaAssinatura?.inadimplencia]);
  useEffect(() => {
    navigation.setOptions({
      tabBarStyle: showTerms
        ? { display: 'none' }
        : {
            backgroundColor: colors.background,
            borderTopWidth: 0.3,
            height: 60 + insets.bottom,
            paddingBottom: insets.bottom,
            elevation: 0,
          },
    });
  }, [navigation, showTerms, colors.background, insets.bottom]);
  const AppointmentCard = ({ appointment, onPress, type }: { appointment: any; onPress: () => void; type: 'next' | 'history' }) => {
    const { colors } = useTheme();
    const scaleValue = useRef(new Animated.Value(1)).current;

    const getStatusInfo = () => {
      if (type === 'next') {
        const today = new Date();
        const appointmentDate = new Date(appointment.data);
        const diffTime = appointmentDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return { text: 'Hoje', color: '#FF6B6B', icon: 'today' };
        if (diffDays === 1) return { text: 'Amanhã', color: '#FFA726', icon: 'event-available' };
        if (diffDays <= 7) return { text: `Em ${diffDays} dias`, color: '#42A5F5', icon: 'event' };
        return { text: formatDateToDDMMYYYY(appointment.data), color: colors.onSurfaceVariant, icon: 'calendar-month' };
      } else {
        const appointmentDate = new Date(appointment.data);
        const today = new Date();
        const diffTime = today.getTime() - appointmentDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const isRecent = diffDays <= 7;
        return {
          text: formatDateToDDMMYYYY(appointment.data),
          color: colors.primary,
          icon: 'event',
          isRecent,
        };
      }
    };

    const status = getStatusInfo();

    const handlePressIn = () => {
      Animated.spring(scaleValue, {
        toValue: 0.98,
        useNativeDriver: true,
      }).start();
    };

    const handlePressOut = () => {
      Animated.spring(scaleValue, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }).start();
    };

    return (
      <Animated.View style={{ transform: [{ scale: scaleValue }], marginVertical: 8 }}>
        <TouchableOpacity onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut} activeOpacity={0.9}>
          <Card style={[styles.card, type === 'next' ? styles.nextAppointmentCard : styles.historyCard]}>
            <View style={{ overflow: 'hidden', borderRadius: 16 }}>
              <Card.Content style={styles.cardContent}>
                {/* Header */}
                <View style={styles.cardHeader}>
                  <View style={styles.statusContainer}>
                    <Icon name={status.icon} size={16} color={status.color} />
                    <Text variant={type === 'next' ? 'labelSmall' : 'bodyMedium'} style={[styles.statusText, { color: status.color }]}>
                      {status.text}
                    </Text>
                  </View>
                  {type === 'next' ? (
                    <IconButton icon="chevron-right" size={20} iconColor={colors.onSurfaceVariant} style={styles.chevron} />
                  ) : (
                    status.isRecent && <Badge style={[styles.recentBadge, { backgroundColor: colors.primary }]}>Recente</Badge>
                  )}
                </View>

                {/* Main Content */}
                <View style={styles.mainContent}>
                  <Image
                    source={appointment.fachada_profissional ? { uri: appointment.fachada_profissional } : require('../../assets/images/fallback_image.png')}
                    style={styles.professionalImage}
                    resizeMode="cover"
                    onError={() => console.log('Image load error')}
                  />
                  <View style={styles.infoContainer}>
                    <Text variant="titleMedium" style={[styles.procedureName, { color: colors.onSurface }]} numberOfLines={2}>
                      {Array.isArray(appointment.nome_procedimento) ? appointment.nome_procedimento.join(', ') : appointment.nome_procedimento}
                    </Text>
                    <View style={styles.professionalInfo}>
                      <Icon name="person" size={14} color={colors.primary} />
                      <Text variant="bodyMedium" style={[styles.professionalName, { color: colors.primary }]} numberOfLines={1}>
                        {appointment.nome_profissional || 'Profissional não especificado'}
                      </Text>
                    </View>
                    <View style={styles.detailsRow}>
                      <View style={styles.detailItem}>
                        <Icon name="access-time" size={14} color={colors.onSurfaceVariant} />
                        <Text variant="bodySmall" style={[styles.detailText, { color: colors.onSurfaceVariant }]}>
                          {String(appointment.inicio).substring(0, 5)}
                        </Text>
                      </View>
                      <View style={styles.detailItem}>
                        <Icon name={type === 'next' ? 'location-on' : 'location-on'} size={14} color={colors.onSurfaceVariant} />
                        <Text variant="bodySmall" style={[styles.detailText, { color: colors.onSurfaceVariant }]} numberOfLines={1}>
                          {appointment.nome_unidade}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Footer */}
                <View style={[styles.cardFooter, { backgroundColor: `${colors.onSecondary}15`, borderTopWidth: 0 }]}>
                  {type === 'next' ? (
                    <>
                      <View style={[styles.priorityIndicator, { backgroundColor: status.color }]} />
                      <Text variant="bodySmall" style={[styles.footerText, { color: colors.onSurfaceVariant }]}>
                        Confirme sua presença com antecedência
                      </Text>
                    </>
                  ) : (
                    <>
                      <Icon name="check-circle" size={16} color={colors.primary} />
                      <Text variant="bodySmall" style={[styles.footerText, { color: colors.onSurfaceVariant }]}>
                        Consulta realizada
                      </Text>
                    </>
                  )}
                </View>
              </Card.Content>
            </View>
          </Card>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const EmptyAppointmentCard = ({ type = 'next', onPress }: { type?: 'next' | 'history'; onPress: () => void }) => {
    const { colors } = useTheme();
    const scaleValue = useRef(new Animated.Value(1)).current;

    const config = {
      next: {
        title: 'Nenhum agendamento',
        subtitle: 'Toque para agendar uma nova consulta',
        icon: 'event-available',
        color: colors.primary,
      },
      history: {
        title: 'Nenhum histórico',
        subtitle: 'Seus agendamentos aparecerão aqui',
        icon: 'history',
        color: colors.primary,
      },
    };

    const { title, subtitle, icon, color } = config[type];

    const handlePressIn = () => {
      Animated.spring(scaleValue, {
        toValue: 0.98,
        useNativeDriver: true,
      }).start();
    };

    const handlePressOut = () => {
      Animated.spring(scaleValue, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }).start();
    };

    return (
      <Animated.View style={{ transform: [{ scale: scaleValue }], marginVertical: 8 }}>
        <TouchableOpacity onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut} activeOpacity={0.8}>
          <Card style={[styles.card, styles.emptyCard]}>
            <View style={{ overflow: 'hidden', borderRadius: 16 }}>
              <Card.Content style={styles.emptyCardContent}>
                <Icon name={icon} size={48} color={`${color}40`} style={styles.emptyIcon} />
                <Text variant="titleMedium" style={[styles.emptyTitle, { color: colors.onSurface }]}>
                  {title || 'Nenhum agendamento'}
                </Text>
                <Text variant="bodyMedium" style={[styles.emptySubtitle, { color: colors.onSurfaceVariant }]}>
                  {subtitle || 'Toque para continuar'}
                </Text>
              </Card.Content>
            </View>
          </Card>
        </TouchableOpacity>
      </Animated.View>
    );
  };
  useEffect(() => {
    if (maisConsultasData.length <= 1) return;

    const interval = setInterval(() => {
      let nextIndex = currentIndex + 1;
      if (nextIndex >= maisConsultasData.length) {
        nextIndex = 0;
      }
      setCurrentIndex(nextIndex);
      flatListRef.current?.scrollToIndex({
        index: nextIndex,
        animated: true,
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [currentIndex, maisConsultasData.length]);

  // async function createNotificationChannel() {
  //   if (Platform.OS === 'android') {
  //     await notifee.createChannel({
  //       id: 'schedule-channel',
  //       name: 'Schedule Notifications',
  //       importance: AndroidImportance.HIGH,
  //     });
  //   }
  // }

  async function fetchTerms(): Promise<void> {
    if (!authData.access_token) {
      setTermsError('Token de autenticação não disponível.');
      return;
    }

    setTermsLoading(true);
    setTermsError(null);

    try {
      const headers = generateRequestHeader(authData.access_token);
      const response = await api.get('/termo-declaracao?is_adesao_tde=1&is_ativo_tde=1', headers);
      const dataApi = response.data;
      if (dataApi?.response?.data?.length > 0) {
        setTerms(dataApi.response.data);
      } else {
        setTermsError('Nenhum termo encontrado.');
      }
    } catch (error: any) {
      console.error('Erro ao buscar termos:', error.message, error.response?.data);
      setTermsError('Erro ao buscar os termos. Tente novamente mais tarde.');
    } finally {
      setTermsLoading(false);
    }
  }

  const generateContractHtml = () => {
    let content = '';
    if (terms.length > 0) {
      content = terms
        .map(
          termo => `
          <div style="margin-bottom: 30px; border-bottom: 1px solid #eee; padding-bottom: 20px;">
            <h2 style="color: #644086; font-size: 24px; margin-bottom: 15px; font-weight: 600; text-align: center;">
              ${termo.des_descricao_tde}
            </h2>
            <div style="font-size: 14px; color: #333; line-height: 1.6;">
              ${termo.txt_texto_tde
                .split('\n')
                .map(line => `<p style="margin-bottom: 10px;">${line.trim()}</p>`)
                .join('')}
            </div>
          </div>
        `,
        )
        .join('');
    } else {
      content = '<div style="text-align: center; padding: 40px; color: #666;"><p>Nenhum termo disponível.</p></div>';
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, sans-serif; 
            line-height: 1.6; 
            padding: 20px;
            color: #333;
          }
          h2 { 
            color: #644086; 
            font-size: 18px; 
            margin-bottom: 15px; 
            font-weight: 600;
          }
          p { 
            margin: 10px 0; 
            font-size: 14px;
          }
          strong {
            font-weight: 600;
          }
        </style>
      </head>
      <body>
        ${content}
      </body>
      </html>
    `;
  };

  async function acceptTerms() {
    try {
      if (!isLogged) {
        setTermsError('Usuário não autenticado.');
        return;
      }

      let token = authData.access_token;
      if (!token) {
        setTermsError('Token de autenticação não disponível.');
        return;
      }

      const idPessoa = dadosUsuarioData.pessoaDados?.id_pessoa_pes;
      if (!idPessoa) {
        setTermsError('ID da pessoa não encontrado.');
        return;
      }

      const headers = generateRequestHeader(token);
      await api.put(`/pessoa/${idPessoa}`, { is_assinado_pes: 1 }, headers);

      setDadosUsuarioData({
        ...dadosUsuarioData,
        pessoaDados: {
          ...dadosUsuarioData.pessoaDados,
          is_assinado_pes: 1,
        },
      });
      setShowTerms(false);

      CustomToast('Termo aceito com sucesso!', colors, 'success');
    } catch (error: any) {
      console.error('Erro ao aceitar termos:', error.message);
      setTermsError('Erro ao aceitar os termos.');
    }
  }

  useEffect(() => {
    if (userSchedules && userSchedules.length > 0) {
      setAgendamentosDialogVisible(true);
    }
  }, [userSchedules]);

  const handleParceiroPress = (parceiroId: number) => {
    setSelectedParceiroId(parceiroId);
    setModalVisible(true);
  };

  async function fetchLastHistoricSchedule(): Promise<void> {
    const token = dadosUsuarioData.pessoaDados?.cod_token_pes;
    const cod_paciente = dadosUsuarioData.pessoaDados?.id_pessoa_pes;

    if (!token || !authData.access_token) return;

    try {
      const response = await api.get(`/integracao/listHistoricoAgendamentos?token_paciente=${token}&cod_paciente=${cod_paciente}`, generateRequestHeader(authData.access_token));

      const data = response.data;
      if (data.length > 0) {
        setLastHistoricSchedule(data[0]);
      }
    } catch (error) {
      console.log('Erro ao buscar histórico mais recente:', error);
    }
  }

  async function fetchParceiros(): Promise<void> {
    setPartnersLoading(true);
    try {
      const headers =
        isLogged && authData.access_token
          ? generateRequestHeader(authData.access_token)
          : {
              headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
              },
            };
      const response = await api.get('/parceiro/app', headers);
      const dataApi = response.data;
      if (dataApi && dataApi.response && dataApi.response.data && dataApi.response.data.length > 0) {
        setParceiros(dataApi.response.data);
      } else {
        console.log('Nenhum parceiro encontrado');
      }
    } catch (error: any) {
      console.error('Erro ao buscar parceiros:', error.message, error.response?.data);
    } finally {
      setPartnersLoading(false);
    }
  }
  async function fetchParceirosCredenciados(): Promise<void> {
    try {
      setLoading(true);
      const headers =
        isLogged && authData.access_token
          ? generateRequestHeader(authData.access_token)
          : {
              headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
              },
            };
      const response = await api.get('/parceiro/appcred', headers);
      const dataApi = response.data;
      if (dataApi && dataApi.response && dataApi.response.data && dataApi.response.data.length > 0) {
        setParceirosCredenciados(dataApi.response.data);
      } else {
        console.log('Nenhum parceiro credenciado encontrado');
      }
    } catch (error: any) {
      console.error('Erro ao buscar parceiros credenciados:', error.message);
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      fetchParceiros();
      fetchParceirosCredenciados();
    }, []),
  );

  useFocusEffect(
    useCallback(() => {
      if (dadosUsuarioData.user.id_usuario_usr && authData.access_token) {
        // createNotificationChannel();
        fetchAllData().then(() => {
          // showAppointmentReminder(dadosUsuarioData.user.id_usuario_usr.toString());
        });
      }
    }, [dadosUsuarioData, authData]),
  );

  async function fetchSchedules(access_token: string): Promise<void> {
    const token = dadosUsuarioData.pessoaDados?.cod_token_pes!;
    const cod_paciente = dadosUsuarioData.pessoaDados?.id_pessoa_pes;

    return new Promise(async (resolve, reject) => {
      if (userSchedules.length > 0) {
        reject('Já existem dados');
      }

      try {
        const response = await api.get(`/integracao/listAgendamentos?cod_paciente=${cod_paciente}`, generateRequestHeader(access_token));
        if (response.status == 200) {
          const { data } = response;
          setUserSchedulesData(data);
          resolve();
        }
      } catch (err: any) {
        reject('Erro ao carregar os agendamentos: ');
      }
    });
  }

  async function fetchCreditCards(idPessoaPes: number): Promise<void> {
    return new Promise(async (resolve, reject) => {
      if (userCreditCards.length > 0) {
        reject('Já possuem cartoes de credito');
      }

      try {
        const response = await api.get(`/integracaoPagarMe/consultarCartaoCliente?id_pessoa_pes=${idPessoaPes}`, {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `bearer ${authData.access_token}`,
          },
        });

        if (response.status == 200) {
          const { data } = response;
          setCreditCards(data.data);
          resolve();
        }
      } catch (err: any) {
        reject('Erro ao carregar cartões. Tente novamente mais tarde');
      }
    });
  }

  async function fetchContratos(id_pessoa_usr: number): Promise<void> {
    return new Promise(async (resolve, reject) => {
      if (userContracts.length > 0) {
        reject('Já existem contratos');
      }

      try {
        const resp = await api.get(`/contrato?id_pessoa_ctt=${id_pessoa_usr}&is_ativo_ctt=1`, generateRequestHeader(authData.access_token));
        if (resp.status == 200) {
          const { data: content } = resp;
          setContracts(content.response.data);
          console.log('Contratos fetched:', content.response.data);
          // Check if any contract has telemedicine active
          const hasTelemed = content.response.data.some((contract: Contrato) => contract.inclui_telemedicina_pla === 1);
          setHasTelemedicine(hasTelemed);
          resolve();
        }
      } catch (err: any) {
        reject(err.message);
      }
    });
  }

  async function fetchAllData() {
    setLoading(true);
    Promise.allSettled([
      fetchCreditCards(dadosUsuarioData.pessoaDados?.id_pessoa_pes!),
      fetchContratos(dadosUsuarioData.user.id_pessoa_usr),
      fetchSchedules(authData.access_token),
      fetchLastHistoricSchedule(),
      fetchParceiros(),
      fetchParceirosCredenciados(),
    ])
      .then(_ => {})
      .catch(err => {
        console.log('Erro em alguma promise: ', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }
  const renderCredenciadosItem = ({ item }: { item: Parceiro }) => {
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => {
          setSelectedParceiroCredenciadoId(item.id_parceiro_prc);
          setModalCredenciadosVisible(true);
        }}
        style={[styles.credenciadoCard, { backgroundColor: '#f7f7f7' }]}>
        <View style={styles.credenciadoContent}>
          <Image
            source={item.img_parceiro_prc ? { uri: `${item.img_parceiro_prc}` } : require('../../assets/images/logonova.png')}
            style={[styles.credenciadoImage, { width: 100, height: 100 }]}
          />
          <View style={styles.credenciadoInfo}>
            <Text variant="titleMedium" style={[styles.credenciadoTitle, { color: colors.primary }]}>
              {item.des_nome_fantasia_prc}
            </Text>
            <Text variant="bodySmall" style={[styles.credenciadoLocation, { color: colors.primary }]}>
              {item.des_municipio_mun}
            </Text>
            <View style={[styles.credenciadoBadge, { backgroundColor: colors.corpadrao }]}>
              <Text variant="labelSmall" style={[styles.credenciadoBadgeText, { color: colors.onPrimary }]}>
                Credenciado
              </Text>
            </View>
          </View>
          <IconButton icon="chevron-right" size={24} iconColor={colors.primary} style={styles.credenciadoArrow} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderPromoIndicator = () => {
    return (
      <View style={styles.indicatorContainer}>
        {promotion_data.map((_, i) => {
          const opacity = scrollXPromo.interpolate({
            inputRange: [(i - 1) * SCREEN_WIDTH, i * SCREEN_WIDTH, (i + 1) * SCREEN_WIDTH],
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              key={`promo-indicator-${i}`}
              style={[
                styles.indicator,
                {
                  backgroundColor: colors.primary,
                  opacity,
                },
              ]}
            />
          );
        })}
      </View>
    );
  };

  const renderConsultasIndicator = () => {
    return (
      <View style={styles.indicatorContainer}>
        {maisConsultasData.map((_, i) => {
          const opacity = scrollXConsultas.interpolate({
            inputRange: [(i - 1) * (SCREEN_WIDTH * 0.9 + 10), i * (SCREEN_WIDTH * 0.9 + 10), (i + 1) * (SCREEN_WIDTH * 0.9 + 10)],
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              key={`consultas-indicator-${i}`}
              style={[
                styles.indicator,
                {
                  backgroundColor: colors.primary,
                  opacity,
                },
              ]}
            />
          );
        })}
      </View>
    );
  };

  const renderConsultasItem = ({ item, index }: { item: any; index: number }) => {
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={item.action}
        style={{
          width: SCREEN_WIDTH * 0.7,
          marginRight: index === maisConsultasData.length - 1 ? 0 : 10,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Image
          source={item.image}
          style={{
            width: '100%',
            height: 200,
            borderRadius: 15,
            backgroundColor: '#f7f7f7',
          }}
        />
      </TouchableOpacity>
    );
  };

  const handleQuickAccessPress = () => {
    CustomToast('Funcionalidade em manutenção', colors, 'error');
  };

  const handleTelemedicinePress = () => {
    CustomToast('Telemedicina em manutenção', colors, 'error');
    // Add navigation or logic for telemedicine consultation here
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f7f7f7' }}>
      {showTerms ? (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
          {termsLoading ? (
    <View
  style={{
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
  }}
>              <ActivityIndicator animating={true} size="large" color={colors.primary} />
              <Text style={{ marginTop: 15, color: colors.text, fontSize: 16 }}>Carregando termos...</Text>
            </View>
          ) : termsError ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
              <IconButton icon="alert-circle-outline" size={40} color={colors.error} style={{ marginBottom: 10 }} />
              <Text style={{ textAlign: 'center', marginBottom: 20, fontSize: 16, color: colors.text }}>{termsError}</Text>
              <Button mode="contained" onPress={fetchTerms} style={{ borderRadius: 8, width: '80%' }} labelStyle={{ fontSize: 16 }} contentStyle={{ height: 50 }}>
                Tentar novamente
              </Button>
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              <View style={styles.termsHeader}>
                <Text variant="headlineSmall" style={{ color: 'white', fontWeight: 'bold', textAlign: 'center' }}>
                  Termos e Condições
                </Text>
                <Text variant="bodyMedium" style={{ color: 'white', textAlign: 'center', marginTop: 5 }}>
                  Por favor, leia e aceite os termos para continuar
                </Text>
              </View>
              <View style={styles.webViewContainer}>
                <WebView
                  originWhitelist={['*']}
                  source={{ html: generateContractHtml() }}
                  style={{ flex: 1 }}
                  injectedJavaScript={`
                    document.body.style.background = '#ffffff';
                    document.body.style.color = '#333333';
                    document.body.style.fontFamily = '-apple-system, BlinkMacSystemFont, sans-serif';
                    document.body.style.lineHeight = '1.6';
                    document.body.style.padding = '20px';
                    true;
                  `}
                />
              </View>
              <View style={styles.termsFooter}>
                <Button
                  mode="contained"
                  onPress={acceptTerms}
                  style={[styles.acceptButton, { backgroundColor: colors.primary }]}
                  labelStyle={{ color: 'white', fontSize: 16, fontWeight: '600' }}
                  contentStyle={{ height: 50 }}>
                  Aceitar e Continuar
                </Button>
                <Text style={styles.footerText}>Ao aceitar, você concorda com os termos acima</Text>
              </View>
            </View>
          )}
        </SafeAreaView>
      ) : loading ? (
        <LoadingFull title="Carregando..." />
      ) : (
        <View style={styles.container}>
          <LinearGradient
            colors={['#A497FB', '#f15d4d']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              height: Platform.select({
                ios: Platform.isPad ? SCREEN_HEIGHT * 0.2 : SCREEN_HEIGHT * 0.35,
                android: Platform.isPad ? SCREEN_HEIGHT * 0.5 : SCREEN_HEIGHT * 0.35,
              }),
              justifyContent: 'flex-start',
              alignItems: 'center',
              paddingTop: Platform.select({
                ios: Platform.isPad ? 10 : 0,
                android: Platform.isPad ? 10 : 0,
              }),
            }}>
            <Image source={require('../../assets/images/logotransparente.png')} style={styles.logo} resizeMode="contain" />
            <View style={styles.welcomeContainer}>
              <Text style={styles.welcomeText}>Olá {dadosUsuarioData.pessoaDados?.des_genero_pes || ''}!!</Text>
              <Text style={styles.subtitleText}>
                {dadosUsuarioData.pessoaDados?.des_sexo_biologico_pes === 'M'
                  ? 'Seja Bem Vindo.'
                  : dadosUsuarioData.pessoaDados?.des_sexo_biologico_pes === 'F'
                  ? 'Seja Bem Vinda.'
                  : 'Seja Bem Vindo(a).'}
              </Text>
            </View>
          </LinearGradient>

          <ScrollView style={styles.whiteSection} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {error && <Text style={{ color: 'red', textAlign: 'center', marginVertical: 10 }}>{error}</Text>}

            {/* Telemedicine Card Section */}

            {/* Seção de Parceiros */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleContainer}>
                  <Icon name="store" size={20} color={colors.primary} />
                  <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.primary }]}>
                    Nossos Parceiros
                  </Text>
                </View>
                <Button
                  mode="text"
                  compact
                  labelStyle={[styles.seeAllButton, { color: colors.primary }]}
                  onPress={() => navigation.navigate('ParceirosScreen', { partnerType: 'regular' })}
                  icon="arrow-right">
                  Ver todos
                </Button>
              </View>

              {partnersLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator animating={true} size="small" color={colors.primary} />
                  <Text style={[styles.loadingText, { color: colors.onSurfaceVariant }]}>Carregando parceiros...</Text>
                </View>
              ) : parceiros.length > 0 ? (
                <>
                  <Animated.FlatList
                    ref={flatListRef}
                    data={maisConsultasData}
                    renderItem={renderConsultasItem}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    snapToInterval={SCREEN_WIDTH * 0.8}
                    decelerationRate="fast"
                    contentContainerStyle={styles.partnersListContainer}
                    onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollXConsultas } } }], { useNativeDriver: true })}
                    scrollEventThrottle={16}
                    removeClippedSubviews={true}
                    snapToAlignment="start"
                    pagingEnabled={false}
                    initialNumToRender={3}
                    windowSize={5}
                    getItemLayout={(data, index) => ({
                      length: SCREEN_WIDTH * 0.7 + 10,
                      offset: (SCREEN_WIDTH * 0.7 + 10) * index,
                      index,
                    })}
                  />
                  {renderConsultasIndicator()}
                </>
              ) : (
                <Card style={styles.emptyStateCard}>
                  <Card.Content style={styles.emptyStateContent}>
                    <Icon name="store-mall-directory" size={48} color="#ccc" />
                    <Text variant="bodyMedium" style={[styles.emptyStateText, { color: colors.onSurfaceVariant }]}>
                      Nenhum parceiro disponível no momento
                    </Text>
                  </Card.Content>
                </Card>
              )}
            </View>
            {hasTelemedicine && (
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleAndIcon}> {/* Agrupando ícone e texto */}
                    <Icon name="monitor-heart" size={22} color={colors.primary} style={styles.sectionIcon} /> {/* Exemplo de ícone para telemedicina */}
                    <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.primary, marginBottom: 0 }]}> {/* Removi o marginBottom do título para alinhar melhor */}
                      Telemedicina
                    </Text>
                  </View>
                  {/* Se houver um botão "Ver mais" ou seta aqui, ele iria neste ponto */}
                </View>
                <TelemedicineCard onPress={handleTelemedicinePress} />
              </View>
            )}
            {/* Seção de Credenciados */}
       
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleContainer}>
                  <Icon name="verified" size={20} color="#A497FB" />
                  <Text variant="titleMedium" style={[styles.sectionTitle, { color: '#A497FB' }]}>
                    Nossos Credenciados
                  </Text>
                </View>
                <Button
                  mode="text"
                  compact
                  labelStyle={[styles.seeAllButton, { color: '#A497FB' }]}
                  onPress={() => navigation.navigate('ParceirosScreen', { partnerType: 'accredited' })}
                  icon="arrow-right">
                  Ver todos
                </Button>
              </View>

              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator animating={true} size="small" color="#A497FB" />
                  <Text style={[styles.loadingText, { color: colors.onSurfaceVariant }]}>Carregando credenciados...</Text>
                </View>
              ) : parceirosCredenciados.length > 0 ? (
                <View style={styles.credenciadosList}>
                  {parceirosCredenciados.slice(0, 4).map(item => (
                    <TouchableOpacity
                      key={item.id_parceiro_prc}
                      activeOpacity={0.8}
                      onPress={() => {
                        setSelectedParceiroCredenciadoId(item.id_parceiro_prc);
                        setModalCredenciadosVisible(true);
                      }}
                      style={styles.credenciadoCard}>
                      <LinearGradient colors={['#fff', '#fff']} style={styles.credenciadoGradient}>
                        {/* Badge de Credenciado */}
                        {/* <View style={styles.credenciadoBadge}>
              <Icon name="verified" size={12} color="#fff" />
              <Text style={styles.credenciadoBadgeText}>Credenciado</Text>
            </View> */}

                        {/* Conteúdo do Card */}
                        <View style={styles.credenciadoContent}>
                          {/* Imagem do Parceiro */}
                          <Image
                            source={item.img_parceiro_prc ? { uri: `${item.img_parceiro_prc}` } : require('../../assets/images/logonova.png')}
                            style={styles.credenciadoImage}
                          />

                          {/* Informações */}
                          <View style={styles.credenciadoInfo}>
                            <Text variant="titleSmall" style={styles.credenciadoTitle} numberOfLines={2}>
                              {item.des_nome_fantasia_prc}
                            </Text>
                            <View style={styles.credenciadoLocation}>
                              <Icon name="location-on" size={14} color="#A497FB" />
                              <Text variant="bodySmall" style={styles.credenciadoLocationText} numberOfLines={1}>
                                {item.des_municipio_mun}
                              </Text>
                            </View>

                            {/* Indicador de Status */}
                            {item.cred_ativo_prc === '1' && (
                              <View style={styles.activeIndicator}>
                                <View style={styles.activeDot} />
                                <Text style={styles.activeText}>Ativo</Text>
                              </View>
                            )}
                          </View>

                          {/* Botão de Ação */}
                          <View style={styles.credenciadoAction}>
                            <Icon name="chevron-right" size={18} color="#A497FB" />
                          </View>
                        </View>
                      </LinearGradient>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <Card style={styles.emptyStateCard}>
                  <Card.Content style={styles.emptyStateContent}>
                    <Icon name="verified-user" size={48} color="#ccc" />
                    <Text variant="bodyMedium" style={[styles.emptyStateText, { color: colors.onSurfaceVariant }]}>
                      Nenhum credenciado disponível no momento
                    </Text>
                  </Card.Content>
                </Card>
              )}
            </View>

            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleAndIcon}>
                  <Icon name="event-available" size={22} color={colors.primary} style={styles.sectionIcon} />
                  <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.primary }]}>
                    Marcar Consultas
                  </Text>
                </View>
                {/* Aqui não haverá seta nem botão */}
              </View>
              <View>
                <Animated.FlatList
                  data={promotion_data}
                  renderItem={({ item }) => <BannerHorizontalItem item={item} colors={colors} />}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{
                    marginTop: 0,
                    width: '100%',
                  }}
                  onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollXPromo } } }], { useNativeDriver: true })}
                  scrollEventThrottle={16}
                />
                {renderPromoIndicator()}
              </View>
            </View>

            {/* Próximos Agendamentos */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}> {/* Este View agora será o container flex com justify-content: 'space-between' */}
                <View style={styles.sectionTitleAndIcon}>
                  <Icon name="event" size={22} color={colors.primary} style={styles.sectionIcon} />
                  <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.primary }]}>
                    Próximos Agendamentos
                  </Text>
                </View>
                {/* Botão "Ver todos" com ícone de seta */}
                <Button
                  mode="text"
                  compact
                  labelStyle={[styles.seeAllButton, { color: colors.primary }]}
                  onPress={() => navigate('user-schedules')}
                  icon="arrow-right"> {/* Use 'arrow-right' ou 'chevron-right' */}
                  Ver todos
                </Button>
              </View>

              {schedulesLoading ? (
                <ActivityIndicator style={{ marginTop: 10 }} color={colors.primary} />
              ) : userSchedules.length === 0 ? (
                <EmptyAppointmentCard type="next" onPress={() => navigate('user-schedules')} />
              ) : (
                <AppointmentCard appointment={userSchedules[0]} onPress={() => navigate('user-schedules')} type="next" />
              )}
            </View>

            {/* Histórico de Agendamentos */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}> {/* Este View agora será o container flex com justify-content: 'space-between' */}
                <View style={styles.sectionTitleAndIcon}>
                  <Icon name="history" size={22} color={colors.primary} style={styles.sectionIcon} />
                  <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.primary }]}>
                    Histórico de Agendamentos
                  </Text>
                </View>
                {/* Botão "Ver histórico" com ícone de seta */}
                <Button
                  mode="text"
                  compact
                  labelStyle={[styles.seeAllButton, { color: colors.primary }]}
                  onPress={() => navigate('user-shcdules-history-screen')}
                  icon="arrow-right"> {/* Use 'arrow-right' ou 'chevron-right' */}
                  Ver todos
                </Button>
              </View>

              {lastHistoricSchedule ? (
                <AppointmentCard appointment={lastHistoricSchedule} onPress={() => navigate('user-shcdules-history-screen')} type="history" />
              ) : (
                <EmptyAppointmentCard type="history" onPress={() => navigate('user-shcdules-history-screen')} />
              )}
            </View>

            <Portal>
              <PagarmeErrorsDialog
                errors={pagarmeErrors}
                visible={pagarmeErrorsDialogVisible}
                navigation={navigation}
                handlePress={status => setPagarmeErrorsDialogVisible(status)}
              />
              <InadimplenciaDialog
                errors={dadosUsuarioData.pessoaAssinatura?.inadimplencia}
                visible={inadimplenciasDialogVisible}
                navigation={navigation}
                handlePress={status => setInadimplenciasDialogVisible(status)}
              />
              <ProximosAgendamentosDialog
                schedules={userSchedules}
                visible={agendamentosDialogVisible}
                navigation={navigation}
                handlePress={status => setAgendamentosDialogVisible(status)}
              />
            </Portal>
            <Modal animationType="slide" transparent={true} visible={modalCredenciadosVisible} onRequestClose={() => setModalCredenciadosVisible(false)}>
              <TouchableWithoutFeedback onPress={() => setModalCredenciadosVisible(false)}>
                <View style={styles.modalOverlay} />
              </TouchableWithoutFeedback>

              <View style={styles.modalContainer}>
                {selectedParceiroCredenciadoId &&
                  (() => {
                    const selectedParceiro = parceirosCredenciados.find(p => p.id_parceiro_prc === selectedParceiroCredenciadoId);

                    if (!selectedParceiro) return null;

                    const openWhatsApp = () => {
                      const phone = selectedParceiro.num_celular_prc?.replace(/\D/g, '');
                      if (!phone) {
                        Alert.alert('Atenção', 'Número de WhatsApp não disponível');
                        return;
                      }

                      const message = encodeURIComponent(`Olá, quero fazer um agendamento com ${selectedParceiro.des_nome_fantasia_prc}. Pode me informar as opções disponíveis?`);
                      const url = `https://wa.me/55${phone}?text=${message}`;
                      Linking.openURL(url);
                    };

                    return (
                      <>
                        {/* Header do Modal */}
                        <View style={styles.modalHeader}>
                          <View style={styles.modalHeaderContent}>
                            <Text variant="titleLarge" style={styles.modalTitle}>
                              {selectedParceiro.des_nome_fantasia_prc}
                            </Text>
                            <View style={styles.credentialStatus}>
                              <Icon name="verified" size={16} color="#A497FB" />
                              <Text style={styles.credentialStatusText}>Parceiro Credenciado</Text>
                            </View>
                          </View>
                          <IconButton icon="close" size={24} onPress={() => setModalCredenciadosVisible(false)} style={styles.modalCloseIcon} />
                        </View>

                        {/* Imagem */}
                        <Image
                          source={selectedParceiro.img_parceiro_prc ? { uri: `${selectedParceiro.img_parceiro_prc}` } : require('../../assets/images/logonova.png')}
                          style={styles.modalImage}
                        />

                        {/* Conteúdo */}
                        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                          {/* Informações Básicas */}
                          <Card style={styles.infoCard}>
                            <Card.Content>
                              <View style={styles.infoItem}>
                                <Icon name="business" size={20} color={colors.primary} />
                                <View style={styles.infoText}>
                                  <Text variant="labelSmall" style={styles.infoLabel}>
                                    Razão Social
                                  </Text>
                                  <Text variant="bodyMedium" style={styles.infoValue}>
                                    {selectedParceiro.des_razao_social_prc}
                                  </Text>
                                </View>
                              </View>

                              <View style={styles.infoItem}>
                                <Icon name="location-on" size={20} color={colors.primary} />
                                <View style={styles.infoText}>
                                  <Text variant="labelSmall" style={styles.infoLabel}>
                                    Endereço
                                  </Text>
                                  <Text variant="bodyMedium" style={styles.infoValue}>
                                    {selectedParceiro.des_endereco_prc}, {selectedParceiro.des_bairro_prc}
                                  </Text>
                                  <Text variant="bodySmall" style={styles.infoSubValue}>
                                    {selectedParceiro.des_municipio_mun}
                                  </Text>
                                </View>
                              </View>
                            </Card.Content>
                          </Card>

                          {/* Contato */}
                          <Card style={styles.infoCard}>
                            <Card.Content>
                              <Text variant="titleSmall" style={styles.sectionTitleModal}>
                                Contato
                              </Text>

                              {selectedParceiro.des_email_responsavel_prc && (
                                <TouchableOpacity style={styles.contactItem}>
                                  <Icon name="email" size={20} color={colors.primary} />
                                  <Text variant="bodyMedium" style={styles.contactText}>
                                    {selectedParceiro.des_email_responsavel_prc}
                                  </Text>
                                </TouchableOpacity>
                              )}

                              {(selectedParceiro.num_celular_prc || selectedParceiro.num_telefone_prc) && (
                                <TouchableOpacity style={styles.contactItem}>
                                  <Icon name="phone" size={20} color={colors.primary} />
                                  <Text variant="bodyMedium" style={styles.contactText}>
                                    {selectedParceiro.num_celular_prc || selectedParceiro.num_telefone_prc}
                                  </Text>
                                </TouchableOpacity>
                              )}
                            </Card.Content>
                          </Card>

                          {/* Descrição */}
                          {selectedParceiro.des_parceiro_prc && (
                            <Card style={styles.infoCard}>
                              <Card.Content>
                                <Text variant="titleSmall" style={styles.sectionTitleModal}>
                                  Descrição
                                </Text>
                                <Text variant="bodyMedium" style={styles.descriptionText}>
                                  {selectedParceiro.des_parceiro_prc}
                                </Text>
                              </Card.Content>
                            </Card>
                          )}

                          {/* Botão de WhatsApp para assinantes */}
                          {dadosUsuarioData.pessoaAssinatura?.assinatura_liberada && (
                            <Button mode="contained" icon="whatsapp" onPress={openWhatsApp} style={styles.whatsappButton} labelStyle={styles.whatsappButtonLabel}>
                              Fazer Agendamento via WhatsApp
                            </Button>
                          )}
                        </ScrollView>
                      </>
                    );
                  })()}
              </View>
            </Modal>
            <Modal 
  animationType="slide" 
  transparent={true} 
  visible={modalVisible} 
  onRequestClose={() => setModalVisible(false)}
>
  <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
    <View style={styles.modalOverlay} />
  </TouchableWithoutFeedback>

  <View style={styles.modalContainer}>
    {selectedParceiroId && (() => {
      const selectedParceiro = parceiros.find(p => p.id_parceiro_prc === selectedParceiroId);

      if (!selectedParceiro) return null;

      return (
        <>
          {/* Header do Modal */}
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderContent}>
              <Text variant="titleLarge" style={styles.modalTitle}>
                {selectedParceiro.des_nome_fantasia_prc}
              </Text>
        
              <View style={styles.credentialStatus}>
                <Icon name="store" size={16} color={colors.primary} />
                <Text style={[styles.credentialStatusText, { color: colors.primary }]}>
                  Parceiro
                </Text>
              </View>
            </View>
            <IconButton 
              icon="close" 
              size={24} 
              onPress={() => setModalVisible(false)} 
              style={styles.modalCloseIcon} 
            />
          </View>

          {/* Imagem */}
          <Image
            source={
              selectedParceiro.img_parceiro_prc
                ? { uri: `${selectedParceiro.img_parceiro_prc}` }
                : require('../../assets/images/logonova.png')
            }
            style={styles.modalImage}
          />

          {/* Conteúdo */}
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Informações Básicas */}
            

            {/* Contato */}
            <Card style={styles.infoCard}>
              <Card.Content>
                <Text variant="titleSmall" style={styles.sectionTitleModal}>
                  Contato
                </Text>
                
                {selectedParceiro.des_email_responsavel_prc && (
                  <TouchableOpacity style={styles.contactItem}>
                    <Icon name="email" size={20} color="#666" />
                    <Text variant="bodyMedium" style={styles.contactText}>
                      {selectedParceiro.des_email_responsavel_prc}
                    </Text>
                  </TouchableOpacity>
                )}

                {(selectedParceiro.num_celular_prc || selectedParceiro.num_telefone_prc) && (
                  <TouchableOpacity style={styles.contactItem}>
                    <Icon name="phone" size={20} color="#666" />
                    <Text variant="bodyMedium" style={styles.contactText}>
                      {selectedParceiro.num_celular_prc || selectedParceiro.num_telefone_prc}
                    </Text>
                  </TouchableOpacity>
                )}

                {selectedParceiro.des_endereco_web_prc && (
                  <TouchableOpacity style={styles.contactItem}>
                    <Icon name="language" size={20} color="#666" />
                    <Text variant="bodyMedium" style={styles.contactText}>
                      {selectedParceiro.des_endereco_web_prc}
                    </Text>
                  </TouchableOpacity>
                )}
              </Card.Content>
            </Card>

            {/* Descrição */}
            {selectedParceiro.des_parceiro_prc && (
              <Card style={styles.infoCard}>
                <Card.Content>
                  <Text variant="titleSmall" style={styles.sectionTitleModal}>
                    Sobre
                  </Text>
                  <Text variant="bodyMedium" style={styles.descriptionText}>
                    {selectedParceiro.des_parceiro_prc}
                  </Text>
                </Card.Content>
              </Card>
            )}

            {/* Informações Adicionais */}
            {/* <Card style={styles.infoCard}>
              <Card.Content>
                <Text variant="titleSmall" style={styles.sectionTitleModal}>
                  Informações Adicionais
                </Text>
                
                <View style={styles.infoItem}>
                  <Icon name="person" size={20} color={colors.primary} />
                  <View style={styles.infoText}>
                    <Text variant="labelSmall" style={styles.infoLabel}>
                      Responsável
                    </Text>
                    <Text variant="bodyMedium" style={styles.infoValue}>
                      {selectedParceiro.des_nome_responsavel_prc || 'Não informado'}
                    </Text>
                  </View>
                </View>

                <View style={styles.infoItem}>
                  <Icon name="badge" size={20} color={colors.primary} />
                  <View style={styles.infoText}>
                    <Text variant="labelSmall" style={styles.infoLabel}>
                      Documento
                    </Text>
                    <Text variant="bodyMedium" style={styles.infoValue}>
                      {selectedParceiro.cod_documento_prc || 'Não informado'}
                    </Text>
                  </View>
                </View>
              </Card.Content>
            </Card> */}

            {/* Botão de Fechar */}
            <Button 
              mode="outlined" 
              onPress={() => setModalVisible(false)} 
              style={styles.closeButton}
              labelStyle={styles.closeButtonLabel}
            >
              Fechar
            </Button>
          </ScrollView>
        </>
      );
    })()}
  </View>
</Modal>
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f7f7',
  },
  purpleSection: {
    backgroundColor: '#A497FB',
    height: Platform.select({
      ios: Platform.isPad ? SCREEN_HEIGHT * 0.2 : SCREEN_HEIGHT * 0.35,
      android: Platform.isPad ? SCREEN_HEIGHT * 0.5 : SCREEN_HEIGHT * 0.35,
    }),
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: Platform.select({
      ios: Platform.isPad ? 10 : 15,
      android: Platform.isPad ? 10 : 15,
    }),
  },
  logo:
    Platform.select({
      ios: {
        width: 200,
        height: 205,
        marginTop: -30,
      },
      android: {
        width: 200,
        height: 170,
        marginTop: 30,
      },
    }) || {},
  welcomeContainer: {
    alignItems: 'center',
    marginTop: -40,
  },
  welcomeText: {
    fontSize: 22,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 0,
  },
  subtitleText: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between', // Para alinhar o título/ícone à esquerda e a seta à direita
    marginBottom: 8,
},
sectionTitleAndIcon: {
    flexDirection: 'row',
    alignItems: 'center',
},
sectionIcon: {
    marginRight: 8,
},
actionIcon: { // Estilo para a seta
    marginLeft: 8, // Pode ajustar o espaçamento se necessário
},
  whiteSection: {
    flex: 1,
    backgroundColor: '#f7f7f7',
    marginTop: Platform.OS === 'ios' ? -100 : -95, // 20 para iOS, 10 para Android

    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  sectionContainer: {
    marginTop: 15,
    marginBottom: 15,
  },
  
  sectionTitle: {
    fontWeight: '700',
    fontSize: 18,
    letterSpacing: 0.2,
  },

  emptyCard: {
    justifyContent: 'center', // centraliza verticalmente
    alignItems: 'center', // centraliza horizontalmente
    minHeight: 140, // altura mínima
    borderColor: '#A497FB', // cor da borda
    borderWidth: 1, // largura da borda
    borderRadius: 12, // cantos arredondados (opcional)
    padding: 16, // espaçamento interno
  },

  scheduleCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  avatar: {
    marginRight: 16,
    borderRadius: 12,
  },
  scheduleInfo: {
    flex: 1,
  },
  professionalContainer: {
    marginVertical: 4,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
   closeButton: {
    marginTop: 16,
    marginBottom: 20,
    borderColor: '#A497FB',
    borderRadius: 12,
  },
  closeButtonLabel: {
    color: '#A497FB',
    fontWeight: '600',
    fontSize: 14,
  },
  dateBadge: {
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginRight: 8,
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  termsHeader: {
    backgroundColor: '#A497FB',
    padding: 25,
    paddingTop: Platform.OS === 'android' ? 40 : 15, // Topo maior no Android
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  webViewContainer: {
    flex: 1,
    margin: 15,
    marginBottom: 0,
    borderRadius: 10,
    backgroundColor: 'white',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  termsFooter: {
    padding: 20,
    paddingTop: 15,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  acceptButton: {
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%', // Simplificado para '100%'
    alignSelf: 'center',
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: Platform.select({
      ios: Platform.isPad ? 10 : 25,
      android: Platform.isPad ? 10 : 15,
    }),
    // ✅ Mude de 'maxHeight' para 'height' com um valor fixo ou porcentual
    height: '85%', // <-- Defina uma altura fixa, por exemplo, 85% da tela.
    // Remova as chaves de width, pois já estão em '100%'
  },
  modalImage: {
    width: '100%',
    height: 250,
    borderRadius: 15,
    marginBottom: 15,
  },

  modalDescription: {
    marginBottom: 15,
    textAlign: 'center',
    color: '#666',
  },
  modalSectionTitle: {
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 10,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  benefitIcon: {
    margin: 0,
    marginRight: 8,
    padding: 0,
  },
  benefitText: {
    flex: 1,
  },
  modalButton: {
    marginTop: Platform.select({
      ios: Platform.isPad ? 12 : -6,
      android: Platform.isPad ? 12 : 15,
    }),
    borderRadius: Platform.select({
      ios: Platform.isPad ? 6 : 8,
      android: Platform.isPad ? 6 : 8,
    }),
    paddingVertical: Platform.select({
      ios: Platform.isPad ? 6 : 2,
      android: Platform.isPad ? 6 : 2,
    }),
    minHeight: 44,
  },
  modalButtonText: {
    fontWeight: 'bold',
  },
  modalCloseButton: {
    marginTop: Platform.select({
      ios: Platform.isPad ? 8 : 2,
      android: Platform.isPad ? 8 : 5,
    }),
    borderRadius: Platform.select({
      ios: Platform.isPad ? 6 : 8,
      android: Platform.isPad ? 6 : 8,
    }),
    paddingVertical: Platform.select({
      ios: Platform.isPad ? 4 : 2,
      android: Platform.isPad ? 4 : 2,
    }),
    borderWidth: 1,
    minHeight: 44,
  },
  modalCloseButtonText: {
    fontWeight: 'bold',
  },
  telemedicineCard: {
    width: '100%', // Responsive width (70% of screen width)
    height: 200, // Fixed height for consistency
  },
  telemedicineContent: {
    flex: 1,
  },
  telemedicineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  telemedicineIcon: {
    marginRight: 12,
  },
  telemedicineTitle: {
    color: '#fff',
    fontWeight: '700',
    flex: 1,
  },
  badge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  telemedicineDescription: {
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 16,
    fontSize: 14,
    lineHeight: 20,
  },
  telemedicineButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  telemedicineButtonText: {
    color: '#A497FB',
    fontWeight: '600',
    fontSize: 16,
  },

  card: {
    borderRadius: 16,
    marginVertical: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    backgroundColor: '#fff',
  },
  nextAppointmentCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#A497FB',
  },
  historyCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#A497FB',
  },

  cardContent: {
    padding: 16,
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 6,
  },
  statusText: {
    fontWeight: '600',
    fontSize: 12,
  },
  chevron: {
    margin: -8,
  },
  recentBadge: {
    fontSize: 10,
    paddingHorizontal: 12,
    paddingVertical: -2,
  },
  mainContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  professionalImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginRight: 16,
    backgroundColor: '#ffffffff',
  },
  infoContainer: {
    flex: 1,
  },
  procedureName: {
    fontWeight: '600',
    marginBottom: 6,
    fontSize: 16,
  },
  professionalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 4,
  },
  professionalName: {
    fontWeight: '500',
    fontSize: 14,
  },
  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 8,
  },
  priorityIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  footerText: {
    fontSize: 12,
    flex: 1,
  },
  emptyIcon: {
    marginBottom: 10,
    alignSelf: 'center', // garante centralização horizontal
  },
  emptyTitle: {
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  emptyCardContent: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  emptySubtitle: {
    textAlign: 'center',
    fontSize: 14,
  },

  credenciadoAction: {
    marginRight: 10, // Reduzido para equilíbrio
  },

  partnersListContainer: {
    paddingHorizontal: (SCREEN_WIDTH - SCREEN_WIDTH * 0.99) / 2,
  },

  // Estilos do Modal melhorado
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalHeaderContent: {
    flex: 1,
  },
  modalTitle: {
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: 4,
  },
  credentialStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  credentialStatusText: {
    color: '#A497FB',
    fontSize: 12,
    fontWeight: '500',
  },
  modalCloseIcon: {
    margin: -8,
  },
  modalContent: {
    maxHeight: SCREEN_HEIGHT * 0.6,
  },
  infoCard: {
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  infoText: {
    flex: 1,
  },
  infoLabel: {
    color: '#666',
    marginBottom: 2,
  },
  infoValue: {
    color: '#2d3748',
    fontWeight: '500',
  },
  infoSubValue: {
    color: '#666',
    marginTop: 2,
  },
  sectionTitleModal: {
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: 12,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  contactText: {
    color: '#2d3748',
  },
  descriptionText: {
    color: '#4a5568',
    lineHeight: 20,
  },
  whatsappButton: {
    backgroundColor: '#25D366',
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 20,
  },
  whatsappButtonLabel: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  credenciadosList: {
    gap: 0,
    paddingBottom: 0,
  },
 credenciadoCard: {
    borderRadius: 16,
    marginBottom: 12,

},
credenciadoGradient: {
    borderRadius: 16,
    paddingTop: 10,
    paddingBottom: 5,
        paddingLeft: 5,

height: Platform.OS === 'ios' ? 110 : 90,
    width: '100%',
    // Sem propriedades de sombra aqui
},

credenciadoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 5, // Como você especificou
},
credenciadoImage: {
    width: 60, // Ajustei o tamanho da imagem para caber melhor
    height: 60,
    borderRadius: 12,
    marginRight: 10,
},
  credenciadoBadge: { // Este é o badge que vai no topo do card
    position: 'absolute',
    top: 12,
    right: 22,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#A497FB', // Use colors.corpadrao se preferir
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    zIndex: 1, // Garante que o badge fique por cima
},
credenciadoBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
},
  
  credenciadoInfo: {
    flex: 1,
  },
  credenciadoTitle: {
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: 4, // Ajustei a margem
    fontSize: 16,
},
credenciadoLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4, // Ajustei a margem
},
credenciadoLocationText: {
    color: '#666',
    fontSize: 14,
},
  activeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#A497FB',
  },
  activeText: {
    fontSize: 12,
    color: '#A497FB',
    fontWeight: '500',
  },


  // Estilos para estados vazios
  emptyStateCard: {
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderStyle: 'dashed',
  },
  emptyStateContent: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    textAlign: 'center',
    marginTop: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 12,
  },

  // Estilos da seção
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  seeAllButton: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default LoggedHome;
