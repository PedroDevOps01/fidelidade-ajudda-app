import { navigate } from '../../router/navigationRef';
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  ScrollView,
  Text as RNText,
  Modal,
  TouchableOpacity,
  Alert
} from 'react-native';
import { useDadosUsuario } from '../../context/pessoa-dados-context';
import { Text, useTheme, Card, Button, Portal, Dialog } from 'react-native-paper';
import { Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../network/api';
import { generateRequestHeader } from '../../utils/app-utils';
import { useFocusEffect } from '@react-navigation/native';
import { Linking } from 'react-native';
const { width } = Dimensions.get('window');
// import { ActivityIndicator } from 'react-native-paper'; // Não é mais necessário para o loading principal
import LoadingFull from '../../components/loading-full'; // 👈 Importação do LoadingFull

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
  des_link_promo_prc: string | null;
  id_municipio_prc: number;
  num_cred_prc?: string | null;
}

const PartnersScreen = ({ navigation, route }: { navigation: any; route: any }) => {
  const { colors } = useTheme();
  const { authData } = useAuth();
  const { dadosUsuarioData } = useDadosUsuario();
  
  const isLogged = !!dadosUsuarioData.user.id_usuario_usr;
  const hasSubscription = dadosUsuarioData.pessoaAssinatura?.assinatura_liberada;

  // Estado
  const [parceiros, setParceiros] = useState<Parceiro[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [visibleModal, setVisibleModal] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<Parceiro | null>(null);

  const partnerType = route.params?.partnerType || 'regular';

  // Verifica se é parceiro credenciado
  const isPartnerAccredited = (partner: Parceiro) => {
    return partnerType === 'accredited' && !!partner.num_cred_prc;
  };

  // Função para abrir modal de parceiro
 const openPartnerModal = (partner: Parceiro) => {
  if (isPartnerAccredited(partner)) {
    // Parceiro credenciado - navega diretamente
    if (partner.des_link_promo_prc) {
      Alert.alert(
        'Parceiro Credenciado',
        'Acessando benefícios exclusivos...',
        [
          {
            text: 'Cancelar',
            style: 'cancel',
          },
          {
            text: 'Acessar',
            onPress: async () => {
              const url = partner.des_link_promo_prc;
              try {
                const validUrl = url.startsWith('http://') || url.startsWith('https://')
                  ? url
                  : `https://${url}`;
                const supported = await Linking.canOpenURL(validUrl);
                if (supported) {
                  await Linking.openURL(validUrl);
                } else {
                  Alert.alert('Erro', 'Não foi possível abrir o link no navegador.');
                }
              } catch (error) {
                console.error('Erro ao abrir URL:', error);
                Alert.alert('Erro', 'Ocorreu um erro ao tentar acessar a oferta.');
              }
            },
          },
        ]
      );
    } else {
      Alert.alert('Erro', 'Nenhum link de oferta disponível para este parceiro.');
    }
  } else {
    // Parceiro não credenciado
    setSelectedPartner(partner);
    setVisibleModal(true);
  }
};

  // Função para fechar modal
  const hideModal = () => {
    setVisibleModal(false);
    setSelectedPartner(null);
  };

  // Função para lidar com ação do parceiro
  const handlePartnerAction = () => {
  if (!selectedPartner) return;

  if (hasSubscription) {
    // Usuário com assinatura - redireciona para link promocional
    if (selectedPartner.des_link_promo_prc) {
      Alert.alert(
        'Acessar Oferta',
        'Você será redirecionado para a oferta exclusiva do parceiro.',
        [
          {
            text: 'Cancelar',
            style: 'cancel',
            onPress: hideModal,
          },
          {
            text: 'Acessar',
            onPress: async () => {
              const url = selectedPartner.des_link_promo_prc;
              try {
                // Ensure the URL has a proper protocol (http:// or https://)
                const validUrl = url.startsWith('http://') || url.startsWith('https://')
                  ? url
                  : `https://${url}`;
                const supported = await Linking.canOpenURL(validUrl);
                if (supported) {
                  await Linking.openURL(validUrl);
                } else {
                  Alert.alert('Erro', 'Não foi possível abrir o link no navegador.');
                }
              } catch (error) {
                console.error('Erro ao abrir URL:', error);
                Alert.alert('Erro', 'Ocorreu um erro ao tentar acessar a oferta.');
              }
              hideModal();
            },
          },
        ]
      );
    } else {
      Alert.alert('Erro', 'Nenhum link de oferta disponível para este parceiro.');
      hideModal();
    }
  } else {
    // Usuário sem assinatura - redireciona para contratar
    Alert.alert(
      'Assinatura Necessária',
      'Para acessar esta oferta exclusiva, é necessário ter uma assinatura ativa.',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
          onPress: hideModal,
        },
        {
          text: 'Assinar Agora',
          onPress: () => {
            navigate('user-contracts-stack');
            hideModal();
          },
          style: 'default',
        },
      ]
    );
  }
};

  // Mapeia dados para render
  const partnerData = parceiros.map(p => ({
    key: String(p.id_parceiro_prc),
    name: p.des_nome_fantasia_prc,
    image: p.img_parceiro_prc
      ? { uri: p.img_parceiro_prc }
      : require('../../assets/images/logonova.png'),
    discount:
      partnerType === 'accredited' && p.num_cred_prc
        ? `Credenciado: ${p.num_cred_prc}`
        : 'Desconto Exclusivo',
    category: p.des_municipio_mun || 'Parceiro',
    partner: p // Mantém referência completa do parceiro
  }));

  // Busca parceiros regulares
  async function fetchParceiros(): Promise<void> {
    try {
      setLoading(true);
      setError(null);
      const headers = isLogged ? generateRequestHeader(authData.access_token) : {
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
        setParceiros([]);
      }
    } catch (error: any) {
      console.error('Erro ao buscar parceiros:', error.message, error.response?.data);
      setError('Erro ao buscar parceiros: ' + error.message);
      setParceiros([]);
    } finally {
      setLoading(false);
    }
  }

  // Busca parceiros credenciados
  async function fetchParceirosCredenciados(): Promise<void> {
    try {
      setLoading(true);
      setError(null);
      const headers = isLogged ? generateRequestHeader(authData.access_token) : {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      };
      const response = await api.get('/parceiro/appcred', headers);
      const itens = response.data.response?.data || [];
      setParceiros(itens);
    } catch (e: any) {
      console.error('Erro ao buscar credenciados:', e.message, e.response?.data);
      setError('Erro ao buscar credenciados: ' + e.message);
      setParceiros([]);
    } finally {
      setLoading(false);
    }
  }

  // Efeito de foco
  useFocusEffect(
    useCallback(() => {
      if (partnerType === 'accredited') {
        fetchParceirosCredenciados();
      } else {
        fetchParceiros();
      }
    }, [authData.access_token, partnerType])
  );

  // Renderização principal
  return (
    <SafeAreaView style={styles.safeArea}>
      {loading ? ( // 👈 Utilizando LoadingFull
        <LoadingFull />
      ) : (
        <>
            {/* Header Moderno */}
            <View style={styles.header}>
                <Text style={styles.title}>
                    {partnerType === 'accredited'
                    ? 'Parceiros Credenciados'
                    : 'Descontos Exclusivos'}
                </Text>
                <Text style={styles.subtitle}>
                    {partnerType === 'accredited'
                    ? 'Benefícios especiais para você'
                    : 'Aproveite as melhores ofertas'}
                </Text>
                <View style={styles.headerDecoration} />
            </View>

            {/* Conteúdo Principal */}
            <ScrollView 
                contentContainerStyle={styles.container}
                showsVerticalScrollIndicator={false}
            >
                {/* REMOVIDO: O bloco de loading inline foi substituído por LoadingFull acima */}
                
                {error && (
                    <View style={styles.errorContainer}>
                        <Icon name="alert-circle-outline" size={48} color="#ff6b6b" />
                        <RNText style={[styles.message, styles.errorText]}>{error}</RNText>
                    </View>
                )}

                {!error && partnerData.length === 0 && (
                    <View style={styles.emptyContainer}>
                        <Icon name="storefront-outline" size={64} color="#ccc" />
                        <RNText style={[styles.message, styles.emptyText]}>
                            Nenhum parceiro disponível no momento
                        </RNText>
                    </View>
                )}

                {!error && partnerData.length > 0 && (
                    <View style={styles.gridContainer}>
                        {partnerData.map(item => {
                            const partner = (item as any).partner;
                            return (
                                <TouchableOpacity
                                    key={item.key}
                                    style={styles.cardTouchable}
                                    onPress={() => openPartnerModal(partner)}
                                    activeOpacity={0.8}
                                >
                                    <Card style={[
                                        styles.card,
                                        isPartnerAccredited(partner) && styles.accreditedCard
                                    ]}>
                                        {/* Badge de Status */}
                                        <View style={[
                                            styles.statusBadge,
                                            isPartnerAccredited(partner) 
                                                ? styles.accreditedBadge 
                                                : styles.regularBadge
                                        ]}>
                                            <Icon 
                                                name={isPartnerAccredited(partner) ? "shield-check" : "star"} 
                                                size={12} 
                                                color="#fff" 
                                            />
                                            <Text style={styles.statusText}>
                                                {isPartnerAccredited(partner) ? 'Credenciado' : 'Exclusivo'}
                                            </Text>
                                        </View>

                                        <Card.Content style={styles.cardContent}>
                                            {/* Imagem do Parceiro */}
                                            <View style={styles.imageContainer}>
                                                <Image 
                                                    source={item.image} 
                                                    style={styles.image}
                                                    resizeMode="contain"
                                                />
                                            </View>

                                            {/* Informações do Parceiro */}
                                            <View style={styles.partnerInfo}>
                                                <Text style={styles.category}>{item.category}</Text>
                                                <Text style={styles.name} numberOfLines={2}>
                                                    {item.name}
                                                </Text>
                                                 
                                                {/* Indicador de Ação */}
                                                <View style={styles.actionIndicator}>
                                                    <Icon 
                                                        name={hasSubscription ? "rocket-launch" : "crown"} 
                                                        size={16} 
                                                        color={hasSubscription ? "#4caf50" : "#ffa000"} 
                                                    />
                                                    <Text style={[
                                                        styles.subscriptionHint,
                                                        hasSubscription ? styles.activeHint : styles.inactiveHint
                                                    ]}>
                                                        {hasSubscription 
                                                            ? 'Oferta disponível' 
                                                            : 'Assinatura necessária'
                                                        }
                                                    </Text>
                                                </View>
                                            </View>
                                        </Card.Content>
                                    </Card>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}
            </ScrollView>

            {/* Modal Dialog Moderno */}
            <Portal>
                <Dialog 
                    visible={visibleModal} 
                    onDismiss={hideModal}
                    style={styles.dialog}
                >
                    <View style={styles.dialogHeader}>
                        <View style={[
                            styles.dialogIcon,
                            hasSubscription 
                                ? styles.dialogIconSuccess 
                                : styles.dialogIconPremium
                        ]}>
                            <Icon 
                                name={hasSubscription ? "gift-outline" : "crown"} 
                                size={32} 
                                color="#fff" 
                            />
                        </View>
                    </View>
                     
                    <Dialog.Title style={styles.dialogTitle}>
                        {hasSubscription ? '🎁 Oferta Exclusiva' : '👑 Assinatura Necessária'}
                    </Dialog.Title>
                     
                    <Dialog.Content style={styles.dialogContent}>
                        <Text style={styles.dialogText}>
                            {hasSubscription 
                                ? `Aproveite agora a oferta especial do(a) `
                                : `Desbloqueie descontos exclusivos do(a) `
                            }
                            <Text style={styles.partnerName}>
                                {selectedPartner?.des_nome_fantasia_prc}
                            </Text>
                            {hasSubscription 
                                ? `! Clique em "Acessar Oferta" para ser redirecionado.`
                                : `! Contrate sua assinatura para aproveitar este e outros benefícios.`
                            }
                        </Text>
                    </Dialog.Content>
                     
                    <Dialog.Actions style={styles.dialogActions}>
                        <Button 
                            onPress={hideModal}
                            mode="outlined"
                            style={styles.cancelButton}
                            labelStyle={styles.cancelButtonLabel}
                        >
                            Cancelar
                        </Button>
                        <Button 
                            mode="contained" 
                            onPress={handlePartnerAction}
                            style={[
                                styles.actionButton,
                                hasSubscription 
                                    ? styles.accessButton 
                                    : styles.subscribeButton
                            ]}
                            labelStyle={styles.actionButtonLabel}
                            icon={hasSubscription ? "open-in-new" : "crown"}
                        >
                            {hasSubscription ? 'Acessar Oferta' : 'Assinar Agora'}
                        </Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: '#fff' 
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 20,
    paddingBottom: 10,

   
  },
  
  headerDecoration: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
  },
  title: { 
    fontSize: 28, 
    fontWeight: 'bold',   
    color: '#A497FB',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
  },
  container: { 
    flexGrow: 1,
    padding: 16,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  loadingContainer: { // 👈 Este estilo foi mantido, mas não será usado no loading principal
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingSpinner: { // 👈 Este estilo foi mantido, mas não será usado no loading principal
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#e2e8f0',
    borderTopColor: '#667eea',
    marginBottom: 16,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  message: {
    textAlign: 'center',
    fontSize: 16,
    marginTop: 16,
  },
  errorText: {
    color: '#e53e3e',
    fontSize: 16,
  },
  emptyText: {
    color: '#a0aec0',
    fontSize: 16,
  },
  cardTouchable: {
    width: (width - 40) / 2,
    marginBottom: 20,
  },
  card: {
    borderRadius: 20,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
height:250,
    borderColor: '#f7fafc',
  },
  accreditedCard: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  statusBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    zIndex: 2,
  },
  
  accreditedBadge: {
    backgroundColor: '#F1591E',
  },
  regularBadge: {
    backgroundColor: '#F1591E',
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  cardContent: {
    padding: 15,
  },
  imageContainer: {
    position: 'relative',
    height: 120,
  },
  image: {
    width: '100%',
    height: '100%',
      backgroundColor: '#fff', // 👈 Adicione essa linha

  },
 
  partnerInfo: {
    padding: 12,
  },
  category: {
    fontSize: 10,
    color: '#718096',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '600',
    marginBottom: 4,
  },
  name: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: 8,
    lineHeight: 18,
  },
  actionIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subscriptionHint: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  activeHint: {
    color: '#A497FB',
  },
  inactiveHint: {
    color: '#ed8936',
  },
  // Estilos do Dialog
  dialog: {
    borderRadius: 24,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
    overflow: 'hidden',
  },
  dialogHeader: {
    alignItems: 'center',
    paddingTop: 24,
  },
  dialogIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  dialogIconSuccess: {
    backgroundColor: '#A497FB',
  },
  dialogIconPremium: {
    backgroundColor: '#ed8936',
  },
  dialogTitle: {
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    color: '#A497FB',
    marginBottom: 8,
  },
  dialogContent: {
    paddingHorizontal: 24,
  },
  dialogText: {
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 24,
    color: '#4a5568',
  },
  partnerName: {
    fontWeight: 'bold',
    color: '#667eea',
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 8,
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
    borderColor: '#cbd5e0',
    borderRadius: 12,
  },
  cancelButtonLabel: {
    color: '#718096',
    fontWeight: '600',
  },
  actionButton: {
    flex: 1,
    marginLeft: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  accessButton: {
    backgroundColor: '#A497FB',
  },
  subscribeButton: {
    backgroundColor: '#ed8936',
  },
  actionButtonLabel: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default PartnersScreen;