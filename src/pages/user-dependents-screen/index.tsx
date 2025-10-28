import { useEffect, useState, useRef, useCallback } from 'react';
import { RefreshControl, StyleSheet, View, TouchableOpacity, ScrollView, Image, Clipboard, Alert, Animated } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { FAB, Text, useTheme, Chip, Card, Button, Modal, Portal, TextInput, ActivityIndicator } from 'react-native-paper';
import { api } from '../../network/api';
import { useDadosUsuario } from '../../context/pessoa-dados-context';
import { toast } from 'sonner-native';
import { generateRequestHeader, maskBrazilianCurrency, applyCpfMask, getCardBrand, getCurrentDate } from '../../utils/app-utils';
import { useAuth } from '../../context/AuthContext';
import dayjs from 'dayjs';
import ModalContainer from '../../components/modal';
import { ModalContent } from '../../components/modal-content';
import { navigate } from '../../router/navigationRef';
import Icon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { CreditCardFormField, CreditCardView } from 'react-native-credit-card-input';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

interface Dependente {
  des_nome_pes: string;
  cod_cpf_pes: string;
  is_ativo_rtd: boolean;
  dth_cadastro_rtd: string;
  dth_alteracao_rtd: string;
  id_contrato_rtd: number;
  id_rel_titular_dependente_rtd: number;
}

interface FormaPagamento {
  id_forma_pagamento_fmp: string;
  des_nome_fmp: string;
}

interface PixResponse {
  amount: number;
  codigoPagamento: string;
  qrcode_url: string;
  qrcode: string;
  dta_pagamento_cpp: string;
  id_pagamento_cpp?: string;
}

const CreditCardSchema = z.object({
  number: z.string().min(16, 'Número do cartão inválido').max(19, 'Número do cartão inválido'),
  exp_month: z.string().regex(/^(0[1-9]|1[0-2])$/, 'Mês inválido'),
  exp_year: z.string().regex(/^\d{4}$/, 'Ano inválido'),
  cvv: z.string().regex(/^\d{3,4}$/, 'CVV inválido'),
  holder_name: z.string().min(2, 'Nome do titular inválido'),
  holder_document: z.string().regex(/^\d{11}$/, 'CPF inválido'),
  brand: z.string().optional(),
  id_pessoa_pes: z.number(),
});

type CreditCardSchemaFormType = z.infer<typeof CreditCardSchema>;

// Função para obter ícone da bandeira do cartão
const getCardBrandIcon = (brand: string) => {
  switch (brand?.toLowerCase()) {
    case 'visa':
      return 'card-visa';
    case 'mastercard':
      return 'card-mastercard';
    case 'amex':
      return 'card-amex';
    default:
      return 'credit-card';
  }
};

export default function UserDependentsScreen() {
  const { colors } = useTheme();
  const { userContracts, dadosUsuarioData, setDadosUsuarioData, userCreditCards, setCreditCards } = useDadosUsuario();
  const { authData } = useAuth();
  const [dependentes, setDependentes] = useState<Dependente[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isModalOfQtdMaxDepPlaVisible, setIsModalOfQtdMaxDepPlaVisible] = useState(false);
  const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false);
  const [isCreditCardModalVisible, setIsCreditCardModalVisible] = useState(false);
  const [isPixModalVisible, setIsPixModalVisible] = useState(false);
  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  const [pendingDependent, setPendingDependent] = useState<any>(null);
  const [formasPagamento, setFormasPagamento] = useState<FormaPagamento[]>([]);
  const [pixResponse, setPixResponse] = useState<PixResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [paymentLoading, setPaymentLoading] = useState<boolean>(false);
  const [focusedField, setFocusedField] = useState<CreditCardFormField | undefined>('number');
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasFetchedPaymentMethods = useRef(false);
  const animatedValue = useRef(new Animated.Value(1)).current;

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreditCardSchemaFormType>({
    resolver: zodResolver(CreditCardSchema),
    defaultValues: {
      brand: '',
      cvv: '',
      exp_month: '',
      exp_year: '',
      holder_document: '',
      holder_name: '',
      id_pessoa_pes: dadosUsuarioData.pessoaDados?.id_pessoa_pes || 0,
      number: '',
    },
  });

  const cardValues = watch();
  const cardBrand = getCardBrand(watch('number'));

  useEffect(() => {
    setValue('brand', cardBrand ?? '');
  }, [cardBrand, setValue]);

  const animateCardSelection = () => {
    Animated.sequence([
      Animated.timing(animatedValue, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleCardSelection = (cardId: string) => {
    setSelectedCardId(cardId);
    animateCardSelection();
  };

  async function fetchDependentes() {
    setLoading(true);
    try {
      const contratoId = userContracts.filter(e => e.is_ativo_ctt === 1)[0].id_contrato_ctt;
  const response = await api.get(
      `/contrato/${contratoId}/dependente?is_ativo_rtd=1`, 
      generateRequestHeader(authData.access_token)
    );
          if (response.status === 200) {
        setDependentes(response.data.response.data);
      } else {
        toast.error('Erro ao carregar dependentes!', { position: 'bottom-center' });
      }
    } catch {
      toast.error('Erro ao carregar dependentes!', { position: 'bottom-center' });
    } finally {
      setLoading(false);
    }
  }

  async function fetchPaymentMethods() {
    if (hasFetchedPaymentMethods.current) return;
    hasFetchedPaymentMethods.current = true;
    setPaymentLoading(true);
    try {
      const request = await api.get('/formapagamento?is_ativo_fmp=1', generateRequestHeader(authData.access_token));
      if (request.status === 200) {
        const trueData: FormaPagamento[] = request.data.response.data;
        const filtered = trueData.filter(e => ['10001', '10002'].includes(e.id_forma_pagamento_fmp.toString()));
        setFormasPagamento(filtered);
      } else {
        toast.error('Erro ao carregar formas de pagamento!', { position: 'bottom-center' });
      }
    } catch (error) {
      console.error('Erro ao buscar formas de pagamento:', error);
      toast.error('Erro ao carregar formas de pagamento!', { position: 'bottom-center' });
    } finally {
      setPaymentLoading(false);
    }
  }

 function handleFabPress() {
  if (!userContracts || userContracts.length === 0) {
    toast.error('Nenhum contrato encontrado!', { position: 'bottom-center' });
    return;
  }

  // Check if adding a dependent incurs no additional cost
  if (dependentes.length < userContracts[0]?.qtd_max_dependentes_pla) {
    navigate('register-step-one', {
      tipo: 'DEPENDENT',
      onComplete: (dependentData: any) => handleDependentData(dependentData),
    });
  } else {
    setIsModalOfQtdMaxDepPlaVisible(true);
  }
}

  async function handleDependentData(dependentData: any, paymentId?: number) {
    try {
      const dataToSend = {
        id_titular_rtd: dadosUsuarioData.pessoaDados?.id_pessoa_pes,
        id_dependente_rtd: dependentData.id_pessoa_pes,
        id_pagamento_cpp: paymentId,
      };
      const response = await api.post(`/contrato/${userContracts[0].id_contrato_ctt}/dependente`, dataToSend, generateRequestHeader(authData.access_token));
      if (response.status === 200) {
        toast.success('Dependente cadastrado com sucesso!', { position: 'bottom-center' });
        fetchDependentes();
      } else {
        toast.error('Erro ao cadastrar dependente!', { position: 'bottom-center' });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao cadastrar dependente.', { position: 'bottom-center' });
    }
  }

  function proceedToPayment() {
    fetchPaymentMethods();
    setIsModalOfQtdMaxDepPlaVisible(false);
    setIsPaymentModalVisible(true);
  }

  async function createDependentWithPayment(idFormaPagamento: string) {
    try {
      setPaymentLoading(true);
      const baseData = {
        id_titular_rtd: dadosUsuarioData.pessoaDados?.id_pessoa_pes,
        id_forma_pagamento: idFormaPagamento,
      };
      if (idFormaPagamento === '10002') {
        await fetchCreditCards(dadosUsuarioData.pessoaDados?.id_pessoa_pes || 0);
      }
      const response = await api.post(`/contrato/${userContracts[0].id_contrato_ctt}/generic-payment`, baseData, generateRequestHeader(authData.access_token));
      if (response.status === 200) {
        toast.success('Pagamento iniciado com sucesso!', { position: 'bottom-center' });
        if (idFormaPagamento === '10001') {
          setPixResponse({
            amount: response.data.data.original.charges[0].last_transaction.amount,
            codigoPagamento: response.data.data.original.id,
            qrcode_url: response.data.data.original.charges[0].last_transaction.qr_code_url,
            qrcode: response.data.data.original.charges[0].last_transaction.qr_code,
            dta_pagamento_cpp: response.data.data.original.charges[0].last_transaction.expires_at,
            id_pagamento_cpp: response.data.data.id_pagamento_cpp,
          });
          setIsPaymentModalVisible(false);
          setIsPixModalVisible(true);
        } else if (idFormaPagamento === '10002') {
          setIsPaymentModalVisible(false);
          setIsCreditCardModalVisible(true);
        } else {
          setTimeout(() => {
            setIsPaymentModalVisible(false);
            navigate('register-step-one', {
              tipo: 'DEPENDENT',
              onComplete: (dependentData: any) => handleDependentData(dependentData, response.data.data.id_pagamento_cpp),
            });
          }, 1000);
        }
      } else {
        setErrorMessage(response.data.message || 'Erro ao processar o pagamento.');
      }
    } catch (err: any) {
      console.error('Erro em createDependentWithPayment:', err.message, err.response?.status, err.response?.data);
      setErrorMessage(err.response?.data?.message || 'Erro ao processar o pagamento.');
    } finally {
      setPaymentLoading(false);
    }
  }

  async function fetchCreditCards(idPessoaPes: number): Promise<void> {
    try {
      const response = await api.get(`/integracaoPagarMe/consultarCartaoCliente?id_pessoa_pes=${idPessoaPes}`, {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `bearer ${authData.access_token}`,
        },
      });
      if (response.status === 200) {
        setCreditCards(response.data.data);
      } else {
        toast.error('Erro ao carregar cartões!', { position: 'bottom-center' });
      }
    } catch (err: any) {
      console.error('Erro ao chamar API:', err.message, err.response?.status, err.response?.data);
      toast.error('Erro ao carregar cartões. Tente novamente.', { position: 'bottom-center' });
    }
  }

  async function registerCard(data: CreditCardSchemaFormType) {
    setPaymentLoading(true);
    try {
      const dataToSent = {
        ...data,
        id_pessoa_pes: dadosUsuarioData.pessoaDados?.id_pessoa_pes,
      };
      const res = await api.post(`/integracaoPagarMe/criarCartaoCliente`, dataToSent, generateRequestHeader(authData.access_token));
      if (res.status === 200 && !res.data.error) {
        const baseData = {
          id_titular_rtd: dadosUsuarioData.pessoaDados?.id_pessoa_pes,
          id_forma_pagamento: '10002',
          card_id: res.data.data.id,
        };
        const paymentResponse = await api.post(`/contrato/${userContracts[0].id_contrato_ctt}/generic-payment`, baseData, generateRequestHeader(authData.access_token));
        if (
          paymentResponse.status === 200 &&
          !paymentResponse.data.error &&
          paymentResponse.data.data.original.status === 'paid' &&
          paymentResponse.data.data.charges[0].status === 'paid'
        ) {
          toast.success('Pagamento realizado com sucesso!', { position: 'bottom-center' });
          setTimeout(() => {
            setIsCreditCardModalVisible(false);
            setIsPaymentModalVisible(false);
            navigate('register-step-one', {
              tipo: 'DEPENDENT',
              onComplete: (dependentData: any) => handleDependentData(dependentData, paymentResponse.data.data.id_pagamento_cpp),
            });
          }, 1000);
        } else {
          const errorMsg =
            paymentResponse.data.data.original.status === 'failed' ||
            paymentResponse.data.data.charges[0].status === 'failed' ||
            paymentResponse.data.data.charges[0].last_transaction.status === 'not_authorized'
              ? 'Pagamento não autorizado. Tente outro cartão ou método de pagamento.'
              : 'Erro ao realizar pagamento. Tente novamente.';
          setErrorMessage(errorMsg);
        }
      } else {
        setErrorMessage('Falha ao cadastrar cartão. Verifique os dados e tente novamente.');
      }
    } catch (err) {
      console.error('Erro ao processar pagamento com cartão:', err);
      setErrorMessage('Erro ao processar o pagamento. Tente novamente.');
    } finally {
      setPaymentLoading(false);
    }
  }

  async function requestPixPayment() {
    setErrorMessage('');
    setPaymentLoading(true);
    try {
      const baseData = {
        id_titular_rtd: dadosUsuarioData.pessoaDados?.id_pessoa_pes,
        id_forma_pagamento: '10001',
      };
      const response = await api.post(`/contrato/${userContracts[0].id_contrato_ctt}/generic-payment`, baseData, generateRequestHeader(authData.access_token));
      if (response.status === 200) {
        setPixResponse({ ...response.data.data, id_pagamento_cpp: response.data.data.id_pagamento_cpp });
      } else {
        setErrorMessage('Erro ao realizar checagem de pagamento');
      }
    } catch {
      setErrorMessage('Erro ao realizar checagem de pagamento');
    } finally {
      setPaymentLoading(false);
    }
  }

  async function checkPixPaid(cod_pagamento: string) {
    try {
      const response = await api.get(`/integracaoPagarMe/verificarPagamento?cod_pedido_pgm=${cod_pagamento}`, generateRequestHeader(authData.access_token));
      if (response.status === 200) {
        const status = response.data.response[0]?.des_status_pgm;
        if (status === 'paid') {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          setIsPixModalVisible(false);
          setIsPaymentModalVisible(false);
          setPixResponse(null);
          await getSignatureDataAfterPaid();
          navigate('register-step-one', {
            tipo: 'DEPENDENT',
            onComplete: (dependentData: any) => handleDependentData(dependentData, pixResponse?.id_pagamento_cpp),
          });
        } else if (status === 'failed') {
          setErrorMessage('Pagamento Pix falhou.');
        }
      } else {
        setErrorMessage('Erro ao verificar pagamento');
      }
    } catch (err) {
      console.error('Erro ao verificar pagamento:', err);
      setErrorMessage('Erro ao verificar pagamento');
    }
  }

  async function getSignatureDataAfterPaid() {
    try {
      const response = await api.get(`/pessoa/${dadosUsuarioData.pessoaDados?.id_pessoa_pes}/signature`, generateRequestHeader(authData.access_token));
      if (response.status === 200) {
        setDadosUsuarioData({
          ...dadosUsuarioData,
          pessoaAssinatura: response.data.response,
        });
        toast.success('Dados atualizados com sucesso', { position: 'bottom-center' });
        setIsPaymentModalVisible(false);
        setIsCreditCardModalVisible(false);
        setIsPixModalVisible(false);
        setPendingDependent(null);
        fetchDependentes();
      }
    } catch {
      setErrorMessage('Erro ao atualizar dados após pagamento.');
    }
  }

  function toggleExpandCard(index: number) {
    setExpandedCard(expandedCard === index ? null : index);
  }

  const copyToClipboard = useCallback(() => {
    if (pixResponse?.qrcode) {
      Clipboard.setString(pixResponse.qrcode);
      toast.success('Código copiado!', { position: 'bottom-center' });
    }
  }, [pixResponse]);

  const getPaymentIcon = (id: string) => {
    switch (id) {
      case '10001':
        return 'qrcode';
      case '10002':
        return 'credit-card';
      default:
        return 'cash';
    }
  };

  const getPaymentColor = (id: string) => {
    switch (id) {
      case '10001':
        return '#32BCAD';
      case '10002':
        return '#5B6ABF';
      default:
        return colors.primary;
    }
  };

  useEffect(() => {
    fetchDependentes();
  }, []);

  useEffect(() => {
    if (pixResponse?.codigoPagamento && isPixModalVisible) {
      checkPixPaid(pixResponse.codigoPagamento);
      intervalRef.current = setInterval(() => {
        checkPixPaid(pixResponse.codigoPagamento);
      }, 20000);
      const timeout = setTimeout(() => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setIsPixModalVisible(false);
        setErrorMessage('O prazo para pagamento Pix expirou.');
      }, 1800000);
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        clearTimeout(timeout);
      };
    }
  }, [pixResponse?.codigoPagamento, isPixModalVisible]);

  const onCreditCardSubmit = (data: CreditCardSchemaFormType) => {
    registerCard(data);
  };

  const onCreditCardError = () => {
    Alert.alert('Erro', 'Erro ao realizar pagamento. Revise os dados ou tente novamente mais tarde.');
  };

  return (
    <ScrollView
      refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchDependentes} tintColor={colors.primary} />}
      contentContainerStyle={[styles.container, { backgroundColor: colors.onTertiary }]}
    >
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.onSurface }]}>Carregando...</Text>
        </View>
      ) : (
        <>
          {/* Modal for Maximum Dependents */}
          <ModalContainer visible={isModalOfQtdMaxDepPlaVisible} handleVisible={() => setIsModalOfQtdMaxDepPlaVisible(false)}>
            <ModalContent
              confirmButtonAction={proceedToPayment}
              confirmButtonText="Sim"
              description={`Deseja adicionar um novo dependente? ${
                dependentes.length >= userContracts[0]?.qtd_max_dependentes_pla
                  ? `Será cobrado um valor adicional de ${maskBrazilianCurrency(userContracts[0]?.vlr_dependente_adicional_pla ?? 0)}.`
                  : 'O dependente será adicionado sem custo adicional.'
              }`}
              isBackButtonVisible
              title="Adicionar Dependente"
              backButtonAction={() => {
                setPendingDependent(null);
                setIsModalOfQtdMaxDepPlaVisible(false);
              }}
              backButtonText="Não"
            />
          </ModalContainer>

          {/* Modal for Payment Method Selection */}
          <Portal>
            <Modal
              visible={isPaymentModalVisible}
              onDismiss={() => {
                setIsPaymentModalVisible(false);
                setPendingDependent(null);
              }}
              contentContainerStyle={[styles.modalContainer, { backgroundColor: colors.surface }]}
            >
              <Text variant="titleMedium" style={[styles.modalTitle, { color: colors.primary }]}>
                Selecione a Forma de Pagamento
              </Text>
              {paymentLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={[styles.loadingText, { color: colors.onSurface }]}>Carregando formas de pagamento...</Text>
                </View>
              ) : (
                <View style={styles.paymentListContent}>
                  {formasPagamento.map(item => (
                    <Card
                      key={item.id_forma_pagamento_fmp.toString()}
                      style={[styles.paymentCard, { backgroundColor: colors.surface, marginBottom: 12 }]}
                      onPress={() => createDependentWithPayment(item.id_forma_pagamento_fmp.toString())}
                    >
                      <Card.Content style={styles.paymentCardContent}>
                        <View style={styles.paymentIconContainer}>
                          <MaterialCommunityIcons
                            name={getPaymentIcon(item.id_forma_pagamento_fmp.toString())}
                            size={28}
                            color={getPaymentColor(item.id_forma_pagamento_fmp.toString())}
                          />
                        </View>
                        <View style={styles.paymentTextContainer}>
                          <Text variant="titleMedium" style={[styles.paymentTitle, { color: colors.onSurface }]}>
                            {item.des_nome_fmp}
                          </Text>
                          {item.id_forma_pagamento_fmp.toString() === '10001' && (
                            <Text variant="bodySmall" style={[styles.paymentSubtitle, { color: colors.primary }]}>
                              Pagamento instantâneo • Sem taxas
                            </Text>
                          )}
                        </View>
                        <MaterialCommunityIcons name="chevron-right" size={24} color={colors.onSurfaceVariant} />
                      </Card.Content>
                    </Card>
                  ))}
                </View>
              )}
              <Button
                mode="outlined"
                onPress={() => {
                  setIsPaymentModalVisible(false);
                  setPendingDependent(null);
                }}
                style={styles.modalCloseButton}
              >
                Cancelar
              </Button>
            </Modal>
          </Portal>

          {/* Modal for Credit Card Payment */}
          <Portal>
            <Modal
              visible={isCreditCardModalVisible}
              onDismiss={() => {
                setIsCreditCardModalVisible(false);
                setPendingDependent(null);
                setSelectedCardId(null);
                setErrorMessage('');
              }}
              contentContainerStyle={[styles.modalContainer, { backgroundColor: colors.background }]}
            >
              <KeyboardAwareScrollView contentContainerStyle={styles.creditCardContainer}>
                <Text variant="titleMedium" style={[styles.modalTitle, { color: colors.primary }]}>
                  Pagamento com Cartão de Crédito
                </Text>
                {paymentLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.loadingText, { color: colors.onSurface }]}>Processando pagamento...</Text>
                  </View>
                ) : (
                  <>
                    {errorMessage && (
                      <Card style={[styles.errorCard, { backgroundColor: colors.errorContainer }]}>
                        <Card.Content>
                          <Text style={[styles.errorText, { color: colors.error }]}>{errorMessage}</Text>
                        </Card.Content>
                      </Card>
                    )}

                    {/* Lista de cartões existentes */}
                    {userCreditCards.length > 0 && (
                      <View style={styles.cardSelectionContainer}>
                        <Text variant="titleSmall" style={[styles.sectionTitle, { color: colors.onSurface }]}>
                          Cartões Cadastrados
                        </Text>
                        <View>
                          {userCreditCards.map(item => (
                            <Animated.View key={item.id} style={{ transform: [{ scale: selectedCardId === item.id ? animatedValue : 1 }] }}>
                              <TouchableOpacity
                                onPress={() => handleCardSelection(item.id)}
                                style={[
                                  styles.cardOption,
                                  selectedCardId === item.id && styles.cardOptionSelected,
                                  { borderColor: colors.primary },
                                ]}
                                accessibilityLabel={`Cartão ${item.brand} final ${item.last_digits}, válido até ${item.exp_month}/${item.exp_year}`}
                              >
                                <View style={styles.cardInfo}>
                                  <Text style={[styles.cardText, { color: colors.onSurface }]}>
                                    {item.brand} • **** {item.last_digits}
                                  </Text>
                                  <Text style={[styles.cardSubText, { color: colors.onSurfaceVariant }]}>
                                    Válido até {item.exp_month}/{item.exp_year}
                                  </Text>
                                </View>
                                {selectedCardId === item.id && (
                                  <MaterialCommunityIcons name="check-circle" size={24} color={colors.primary} />
                                )}
                              </TouchableOpacity>
                            </Animated.View>
                          ))}
                        </View>
                        <Button
                          mode="contained"
                          disabled={paymentLoading || !selectedCardId}
                          onPress={async () => {
                            setPaymentLoading(true);
                            try {
                              const baseData = {
                                id_titular_rtd: dadosUsuarioData.pessoaDados?.id_pessoa_pes,
                                id_forma_pagamento: '10002',
                                card_id: selectedCardId,
                              };
                              const response = await api.post(
                                `/contrato/${userContracts[0].id_contrato_ctt}/generic-payment`,
                                baseData,
                                generateRequestHeader(authData.access_token)
                              );
                              if (
                                response.status === 200 &&
                                !response.data.error &&
                                response.data.data.original.status === 'paid' &&
                                response.data.data.charges[0].status === 'paid'
                              ) {
                                toast.success('Pagamento realizado com sucesso!', { position: 'bottom-center' });
                                setTimeout(() => {
                                  setIsCreditCardModalVisible(false);
                                  setIsPaymentModalVisible(false);
                                  navigate('register-step-one', {
                                    tipo: 'DEPENDENT',
                                    onComplete: (dependentData: any) =>
                                      handleDependentData(dependentData, response.data.data.id_pagamento_cpp),
                                  });
                                }, 1000);
                              } else {
                                const errorMsg =
                                  response.data.data.original.status === 'failed' ||
                                  response.data.data.charges[0].status === 'failed' ||
                                  response.data.data.charges[0].last_transaction.status === 'not_authorized'
                                    ? 'Pagamento não autorizado. Tente outro cartão ou método de pagamento.'
                                    : 'Erro ao realizar pagamento. Tente novamente.';
                                setErrorMessage(errorMsg);
                              }
                            } catch (err: any) {
                              setErrorMessage(err.response?.data?.message || 'Erro ao processar o pagamento.');
                            } finally {
                              setPaymentLoading(false);
                            }
                          }}
                          style={[styles.paymentButton, { backgroundColor: colors.primary }]}
                          labelStyle={styles.paymentButtonLabel}
                          icon={paymentLoading ? undefined : 'credit-card-check'}
                          loading={paymentLoading}
                        >
                          {paymentLoading ? 'Processando...' : 'Pagar com Cartão Selecionado'}
                        </Button>
                      </View>
                    )}

                    {/* Formulário para novo cartão */}
                    <Text variant="titleSmall" style={[styles.sectionTitle, { color: colors.onSurface }]}>
                      {userCreditCards.length > 0 ? 'Ou adicionar novo cartão' : 'Adicionar cartão'}
                    </Text>
                    <CreditCardView
                      focusedField={focusedField}
                      number={cardValues.number}
                      cvc={cardValues.cvv}
                      expiry={`${cardValues.exp_month}/${cardValues.exp_year}`}
                      name={cardValues.holder_name}
                      style={styles.cardView}
                      type={cardBrand}
                      placeholders={{
                        number: '**** **** **** ****',
                        expiry: 'Válido até',
                        name: '',
                        cvc: '***',
                      }}
                    />
                    <View style={styles.formContainer}>
                      <Controller
                        control={control}
                        name="number"
                        render={({ field: { onChange, value } }) => (
                          <TextInput
                            label="Número do Cartão"
                            mode="outlined"
                            keyboardType="numeric"
                            maxLength={19}
                            error={!!errors.number}
                            style={styles.input}
                            onChangeText={text => setValue('number', text)}
                            value={value}
                            onFocus={() => setFocusedField('number')}
                            theme={{ colors: { primary: colors.primary, background: colors.surface } }}
                          />
                        )}
                      />
                      {errors.number && <Text style={styles.errorText}>{errors.number.message}</Text>}

                      <View style={styles.expiryContainer}>
                        <Controller
                          control={control}
                          name="exp_month"
                          render={({ field: { onChange, value } }) => (
                            <TextInput
                              label="Mês (MM)"
                              mode="outlined"
                              keyboardType="numeric"
                              maxLength={2}
                              style={[styles.input, styles.expiryInput]}
                              onChangeText={text => setValue('exp_month', text, { shouldValidate: true })}
                              value={value}
                              onFocus={() => setFocusedField('expiry')}
                              theme={{ colors: { primary: colors.primary, background: colors.surface } }}
                            />
                          )}
                        />
                        <Controller
                          control={control}
                          name="exp_year"
                          render={({ field: { onChange, value } }) => (
                            <TextInput
                              label="Ano (YYYY)"
                              mode="outlined"
                              keyboardType="numeric"
                              maxLength={4}
                              style={[styles.input, styles.expiryInput]}
                              onChangeText={text => setValue('exp_year', text, { shouldValidate: true })}
                              value={value}
                              onFocus={() => setFocusedField('expiry')}
                              theme={{ colors: { primary: colors.primary, background: colors.surface } }}
                            />
                          )}
                        />
                      </View>
                      {errors.exp_month || errors.exp_year ? <Text style={styles.errorText}>Data de expiração inválida</Text> : null}

                      <Controller
                        control={control}
                        name="cvv"
                        render={({ field: { onChange, value } }) => (
                          <TextInput
                            label="CVC"
                            mode="outlined"
                            keyboardType="numeric"
                            maxLength={3}
                            style={styles.input}
                            onChangeText={text => setValue('cvv', text, { shouldValidate: true })}
                            value={value}
                            onFocus={() => setFocusedField('cvc')}
                            onBlur={() => setFocusedField('number')}
                            theme={{ colors: { primary: colors.primary, background: colors.surface } }}
                          />
                        )}
                      />
                      {errors.cvv && <Text style={styles.errorText}>{errors.cvv.message}</Text>}

                      <Controller
                        control={control}
                        name="holder_name"
                        render={({ field: { onChange, value } }) => (
                          <TextInput
                            label="Nome do Titular"
                            mode="outlined"
                            style={styles.input}
                            onChangeText={onChange}
                            value={value}
                            onFocus={() => setFocusedField('name')}
                            theme={{ colors: { primary: colors.primary, background: colors.surface } }}
                          />
                        )}
                      />
                      {errors.holder_name && <Text style={styles.errorText}>{errors.holder_name.message}</Text>}

                      <Controller
                        control={control}
                        name="holder_document"
                        render={({ field: { onChange, value } }) => (
                          <TextInput
                            label="CPF do Titular"
                            mode="outlined"
                            keyboardType="numeric"
                            maxLength={11}
                            style={styles.input}
                            onChangeText={text => setValue('holder_document', text)}
                            value={value}
                            onFocus={() => setFocusedField('name')}
                            theme={{ colors: { primary: colors.primary, background: colors.surface } }}
                          />
                        )}
                      />
                      {errors.holder_document && <Text style={styles.errorText}>{errors.holder_document.message}</Text>}
                    </View>
                    <Button
                      mode="contained"
                      disabled={paymentLoading}
                      onPress={handleSubmit(onCreditCardSubmit, onCreditCardError)}
                      style={[styles.paymentButton, { backgroundColor: colors.primary }]}
                      labelStyle={styles.paymentButtonLabel}
                      icon={paymentLoading ? undefined : 'credit-card-plus'}
                      loading={paymentLoading}
                    >
                      {paymentLoading ? 'Processando...' : 'Realizar Pagamento com Novo Cartão'}
                    </Button>
                    <Button
                      mode="outlined"
                      disabled={paymentLoading}
                      onPress={() => {
                        setIsCreditCardModalVisible(false);
                        setIsPaymentModalVisible(true);
                        setErrorMessage('');
                      }}
                      style={styles.modalCloseButton}
                      labelStyle={styles.modalCloseButtonLabel}
                    >
                      Voltar
                    </Button>
                  </>
                )}
              </KeyboardAwareScrollView>
            </Modal>
          </Portal>

          {/* Modal for Pix Payment */}
          <Portal>
            <Modal
              visible={isPixModalVisible}
              onDismiss={() => {
                setIsPixModalVisible(false);
                setPendingDependent(null);
                setPixResponse(null);
                if (intervalRef.current) {
                  clearInterval(intervalRef.current);
                  intervalRef.current = null;
                }
              }}
              contentContainerStyle={[styles.modalContainer, { backgroundColor: colors.background }]}
            >
              <ScrollView contentContainerStyle={styles.pixContainer}>
                {paymentLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.loadingText, { color: colors.onSurface }]}>Processando pagamento...</Text>
                  </View>
                ) : (
                  <>
                    {errorMessage ? (
                      <View style={styles.errorContainer}>
                        <Text style={[styles.errorText, { color: colors.error }]}>{errorMessage}</Text>
                        <Button mode="contained" onPress={requestPixPayment} style={styles.retryButton} buttonColor={colors.primary}>
                          Tentar novamente
                        </Button>
                      </View>
                    ) : (
                      <>
                        <Card mode="elevated" style={[styles.pixCard, { backgroundColor: colors.surface }]}>
                          <Card.Title
                            title="Pagamento via Pix"
                            subtitle="Escaneie o QR Code ou copie o código abaixo para pagar."
                            titleStyle={[styles.pixTitle, { color: colors.primary }]}
                            subtitleStyle={[styles.pixSubtitle, { color: colors.onSurfaceVariant }]}
                            left={props => <MaterialCommunityIcons {...props} name="qrcode-scan" size={28} color={colors.primary} />}
                          />
                          <Card.Content style={styles.pixContent}>
                            <View style={styles.valueContainer}>
                              <Text variant="bodyMedium" style={[styles.label, { color: colors.onSurface }]}>
                                Valor:
                              </Text>
                              <Text variant="headlineMedium" style={[styles.value, { color: colors.primary }]}>
                                {maskBrazilianCurrency(pixResponse?.amount ?? 0)}
                              </Text>
                            </View>
                            <View style={styles.qrContainer}>
                              <Chip
                                icon="information-outline"
                                mode="outlined"
                                style={[styles.chip, { borderColor: colors.primaryContainer }]}
                                textStyle={{ color: colors.onSurface }}
                              >
                                Escaneie o QR Code
                              </Chip>
                              <View style={[styles.qrBorder, { borderColor: colors.primaryContainer }]}>
                                {pixResponse?.qrcode_url ? (
                                  <Image
                                    source={{ uri: pixResponse.qrcode_url }}
                                    style={styles.qrCode}
                                    resizeMode="contain"
                                    onError={() => setErrorMessage('Erro ao carregar o QR code. Tente novamente.')}
                                  />
                                ) : (
                                  <Text style={[styles.errorText, { color: colors.error }]}>QR Code não disponível</Text>
                                )}
                              </View>
                            </View>
                            <Button
                              mode="contained-tonal"
                              icon="content-copy"
                              onPress={copyToClipboard}
                              style={[styles.copyButton, { backgroundColor: colors.primaryContainer }]}
                              labelStyle={[styles.buttonLabel, { color: colors.onPrimaryContainer }]}
                            >
                              Copiar código Pix
                            </Button>
                          </Card.Content>
                        </Card>
                        <Card mode="elevated" style={[styles.infoCard, { backgroundColor: colors.surface }]}>
                          <Card.Content>
                            <View style={styles.infoSection}>
                              <MaterialCommunityIcons name="timer-outline" size={20} color={colors.onSurfaceVariant} />
                              <Text variant="bodyMedium" style={[styles.infoText, { color: colors.onSurface }]}>
                                Prazo de validade: 30 minutos
                              </Text>
                            </View>
                            <View style={styles.infoSection}>
                              <MaterialCommunityIcons name="autorenew" size={20} color={colors.onSurfaceVariant} />
                              <Text variant="bodyMedium" style={[styles.infoText, { color: colors.onSurface }]}>
                                Atualização automática do status
                              </Text>
                            </View>
                            <View style={styles.infoSection}>
                              <MaterialCommunityIcons name="information-outline" size={20} color={colors.onSurfaceVariant} />
                              <Text variant="bodyMedium" style={[styles.infoText, { color: colors.onSurface }]}>
                                Não feche o aplicativo durante o pagamento
                              </Text>
                            </View>
                          </Card.Content>
                        </Card>
                        <View style={styles.statusContainer}>
                          <ActivityIndicator size="large" color={colors.primary} />
                          <Text variant="bodyMedium" style={[styles.statusText, { color: colors.onSurface }]}>
                            Aguardando confirmação do pagamento...
                          </Text>
                        </View>
                        <Button
                          mode="outlined"
                          onPress={() => {
                            setIsPixModalVisible(false);
                            setIsPaymentModalVisible(true);
                          }}
                          style={styles.modalCloseButton}
                        >
                          Voltar
                        </Button>
                      </>
                    )}
                  </>
                )}
              </ScrollView>
            </Modal>
          </Portal>

          {/* Main Content */}
          <View style={styles.header}>
            <View style={[styles.headerCard, { backgroundColor: colors.onError }]}>
              <Icon name="family-restroom" size={24} color={colors.primary} />
              <Text variant="titleMedium" style={[styles.headerTitle, { color: colors.primary }]}>
                Meus Dependentes
              </Text>
              <Text style={[styles.subtitle, { color: colors.primary }]}>
                {dependentes.length}/{userContracts[0]?.qtd_max_dependentes_pla || 0} cadastrados sem custo adicional
              </Text>
            </View>
          </View>

          {dependentes.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <Icon name="account-multiple" size={48} color={colors.primary} />
              </View>
              <Text variant="titleMedium" style={[styles.emptyTitle, { color: colors.primary }]}>
                Nenhum dependente cadastrado
              </Text>
              <Text style={[styles.emptyText, { color: colors.primary }]}>Adicione seus dependentes para gerenciar a saúde de toda sua família</Text>
            </View>
          ) : (
            <View style={styles.dependentsList}>
              <Text variant="titleSmall" style={[styles.listTitle, { color: colors.onSurfaceVariant }]}>
                Dependentes cadastrados
              </Text>
              {dependentes.map((dependente, index) => (
                <TouchableOpacity key={index} onPress={() => toggleExpandCard(index)} activeOpacity={0.7}>
                  <View style={[styles.dependentCard, { backgroundColor: colors.surface }]}>
                    <View style={styles.dependentHeader}>
                      <View style={[styles.avatar, { backgroundColor: dependente.is_ativo_rtd ? colors.primary : colors.error }]}>
                        <Icon name="person" size={20} color="white" />
                      </View>
                      <View style={styles.dependentInfo}>
                        <Text style={[styles.dependentName, { color: colors.onSurface }]}>{dependente.des_nome_pes}</Text>
                        <View style={styles.statusRow}>
                          <Chip
                            mode="outlined"
                            style={[
                              styles.statusChip,
                              {
                                backgroundColor: dependente.is_ativo_rtd ? colors.primary + '20' : colors.error + '20',
                                borderColor: dependente.is_ativo_rtd ? colors.primary : colors.error,
                              },
                            ]}
                            textStyle={{
                              color: dependente.is_ativo_rtd ? colors.primary : colors.error,
                              fontSize: 12,
                            }}
                          >
                            {dependente.is_ativo_rtd ? 'Ativo' : 'Inativo'}
                          </Chip>
                          <Icon name={expandedCard === index ? 'expand-less' : 'expand-more'} size={20} color={colors.onSurfaceVariant} />
                        </View>
                      </View>
                    </View>
                    {expandedCard === index && (
                      <View style={styles.dependentDetails}>
                        <View style={styles.detailRow}>
                          <Icon name="fingerprint" size={16} color={colors.onSurfaceVariant} />
                          <Text style={[styles.detailLabel, { color: colors.onSurfaceVariant }]}>CPF:</Text>
                          <Text style={[styles.detailValue, { color: colors.onSurface }]}>{applyCpfMask(dependente.cod_cpf_pes)}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Icon name="event-available" size={16} color={colors.onSurfaceVariant} />
                          <Text style={[styles.detailLabel, { color: colors.onSurfaceVariant }]}>Cadastro:</Text>
                          <Text style={[styles.detailValue, { color: colors.onSurface }]}>{dayjs(dependente.dth_cadastro_rtd).format('DD/MM/YYYY HH:mm')}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Icon name="update" size={16} color={colors.onSurfaceVariant} />
                          <Text style={[styles.detailLabel, { color: colors.onSurfaceVariant }]}>Última alteração:</Text>
                          <Text style={[styles.detailValue, { color: colors.onSurface }]}>{dayjs(dependente.dth_alteracao_rtd).format('DD/MM/YYYY HH:mm')}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Icon name="receipt" size={16} color={colors.onSurfaceVariant} />
                          <Text style={[styles.detailLabel, { color: colors.onSurfaceVariant }]}>ID do Contrato:</Text>
                          <Text style={[styles.detailValue, { color: colors.onSurface }]}>#{dependente.id_contrato_rtd}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Icon name="link" size={16} color={colors.onSurfaceVariant} />
                          <Text style={[styles.detailLabel, { color: colors.onSurfaceVariant }]}>ID do Vínculo:</Text>
                          <Text style={[styles.detailValue, { color: colors.onSurface }]}>#{dependente.id_rel_titular_dependente_rtd}</Text>
                        </View>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </>
      )}
      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: colors.primary }]}
        color={colors.onPrimary}
        onPress={handleFabPress}
        label="Adicionar dependente"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  headerCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTitle: {
    marginTop: 8,
    marginBottom: 4,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    marginBottom: 8,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  dependentsList: {
    marginTop: 8,
  },
  listTitle: {
    marginBottom: 16,
    fontWeight: '600',
  },
  dependentCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dependentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dependentInfo: {
    flex: 1,
  },
  dependentName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusChip: {
    height: 34,
    borderRadius: 12,
  },
  dependentDetails: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.08)',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 8,
    marginRight: 4,
    width: 120,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 16,
    bottom: 16,
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  modalContainer: {
    margin: 20,
    padding: 24,
    borderRadius: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  modalTitle: {
    fontWeight: '700',
    fontSize: 20,
    marginBottom: 20,
    textAlign: 'center',
  },
  paymentListContent: {
    paddingBottom: 16,
  },
  paymentCard: {
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  paymentCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  paymentIconContainer: {
    marginRight: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(50, 188, 173, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentTextContainer: {
    flex: 1,
  },
  paymentTitle: {
    fontWeight: '600',
    marginBottom: 2,
  },
  paymentSubtitle: {
    fontWeight: '500',
    fontSize: 13,
  },
  modalCloseButton: {
    marginTop: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  modalCloseButtonLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  creditCardContainer: {
    padding: 20,
    flexGrow: 1,
  },
  pixContainer: {
    padding: 16,
    flexGrow: 1,
  },
  cardView: {
    alignSelf: 'center',
    marginVertical: 16,
    width: '100%',
    maxWidth: 300,
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    elevation: 3,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  input: {
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  expiryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  expiryInput: {
    width: '48%',
  },
  errorCard: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    marginVertical: 8,
  },
  cardSelectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontWeight: '600',
    fontSize: 16,
    marginBottom: 16,
    marginTop: 8,
  },
  cardOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardOptionSelected: {
    borderWidth: 2,
    backgroundColor: '#F5F8FF',
  },
  cardInfo: {
    flex: 1,
  },
  cardText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardSubText: {
    fontSize: 14,
    fontWeight: '400',
  },
  paymentButton: {
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 8,
  },
  paymentButtonLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  pixCard: {
    borderRadius: 24,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  pixTitle: {
    fontWeight: '800',
    fontSize: 22,
    textAlign: 'center',
  },
  pixSubtitle: {
    textAlign: 'center',
    fontSize: 16,
  },
  pixContent: {
    paddingVertical: 16,
  },
  valueContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  label: {
    marginBottom: 4,
    fontWeight: '500',
  },
  value: {
    fontWeight: '800',
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  chip: {
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  qrBorder: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#FFF',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  qrCode: {
    width: 220,
    height: 220,
  },
  copyButton: {
    borderRadius: 12,
    marginTop: 8,
  },
  buttonLabel: {
    fontWeight: '700',
    fontSize: 16,
  },
  infoCard: {
    borderRadius: 16,
    marginBottom: 24,
    elevation: 2,
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoText: {
    marginLeft: 12,
    flex: 1,
  },
  statusContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  statusText: {
    marginTop: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  errorContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButton: {
    borderRadius: 12,
    marginTop: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
});