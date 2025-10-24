import { Alert, StyleSheet, View, TouchableOpacity, Animated } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Button, Icon, Text, TextInput, useTheme, Card } from 'react-native-paper';
import { CreditCardFormField, CreditCardView } from 'react-native-credit-card-input';
import { useEffect, useState, useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { CreditCardSchema, CreditCardSchemaFormType } from '../../form-objects/credit-card-form-object';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDadosUsuario } from '../../context/pessoa-dados-context';
import { generateRequestHeader, getCardBrand, getCurrentDate, log } from '../../utils/app-utils';
import { toast } from 'sonner-native';
import { useAccquirePlan } from '../../context/accquirePlanContext';
import { api } from '../../network/api';
import { useAuth } from '../../context/AuthContext';
import { goBack, navigate } from '../../router/navigationRef';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import ModalContainer from '../../components/modal';
import { ModalContent } from '../../components/modal-content';

type RootStackParamList = {
  'user-contracts-payment-successfull': undefined;
  'user-contracts-payment-failed': undefined;
};

interface PlanoPagamento {
  id_plano_pagamento_ppg: number;
  num_parcelas_ppg: number;
  vlr_parcela_ppg: number;
  is_anual: boolean;
}

interface Plano {
  id_plano_pla: number;
  vlr_adesao_pla: number | null;
}

interface UserCreditCard {
  id: string;
  brand: string;
  last_digits: string;
  exp_month: string;
  exp_year: string;
}

export default function PaymentCreditCard() {
  const { colors } = useTheme();
  const { dadosUsuarioData, setDadosUsuarioData } = useDadosUsuario();
  const { authData, setAuthData } = useAuth();
  const { contratoParcela, idFormaPagamento, contratoCreated, plano, isAnual, planoPagamento } = useAccquirePlan();
  const [focusedField, setFocusedField] = useState<CreditCardFormField | undefined>('number');
  const [loading, setLoading] = useState<boolean>(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [userCreditCards, setUserCreditCards] = useState<UserCreditCard[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const animatedValue = useRef(new Animated.Value(1)).current;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

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

  useEffect(() => {
    navigation.setOptions({
      headerBackVisible: false,
    });
  }, [navigation]);

  // Check token expiration
  const checkTokenExpiration = async () => {
    if (!authData.access_token) {
      toast.error('Nenhum token encontrado. Faça login novamente.', { position: 'bottom-center' });
      navigate('login');
      return false;
    }

    try {
      const decodedToken: any = generateRequestHeader(authData.access_token);
      const currentTime = Math.floor(Date.now() / 1000);
      if (decodedToken.exp < currentTime) {
        try {
          const refreshResponse = await api.post('/refresh', {}, generateRequestHeader(authData.access_token));
          if (refreshResponse.status === 200) {
            const { access_token } = refreshResponse.data;
            setAuthData({ ...authData, access_token });
            localStorage.setItem('access_token', access_token);
            toast.success('Token renovado com sucesso!', { position: 'bottom-center' });
            return true;
          } else {
            throw new Error('Failed to refresh token');
          }
        } catch (error) {
          toast.error('Sessão expirada. Faça login novamente.', { position: 'bottom-center' });
          navigate('login');
          return false;
        }
      }
      return true;
    } catch (error) {
      toast.error('Erro ao verificar o token. Faça login novamente.', { position: 'bottom-center' });
      navigate('login');
      return false;
    }
  };

  // Fetch existing credit cards
  const fetchCreditCards = async (idPessoaPes: number) => {
    if (!(await checkTokenExpiration())) return;
    setLoading(true);
    try {
      const response = await api.get(
        `/integracaoPagarMe/consultarCartaoCliente?id_pessoa_pes=${idPessoaPes}`,
        generateRequestHeader(authData.access_token)
      );
      if (response.status === 200) {
        setUserCreditCards(response.data.data);
      } else {
        toast.error('Erro ao carregar cartões!', { position: 'bottom-center' });
      }
    } catch (err: any) {
      console.error('Erro ao chamar API:', err.message, err.response?.status, err.response?.data);
      toast.error('Erro ao carregar cartões. Tente novamente.', { position: 'bottom-center' });
    } finally {
      setLoading(false);
    }
  };

  // Fetch cards on component mount
  useEffect(() => {
    if (dadosUsuarioData.pessoaDados?.id_pessoa_pes) {
      fetchCreditCards(dadosUsuarioData.pessoaDados.id_pessoa_pes);
    }
  }, [dadosUsuarioData.pessoaDados?.id_pessoa_pes]);

  // Animate card selection
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

  // Handle card selection
  const handleCardSelection = (cardId: string) => {
    setSelectedCardId(cardId);
    animateCardSelection();
  };

  // Handle back button
  const handleBackButtonPress = async () => {
    if (!(await checkTokenExpiration())) return;
    goBack();
    if (contratoCreated?.id_contrato_ctt) {
      try {
        await api.delete(`/contrato/${contratoCreated.id_contrato_ctt}`, generateRequestHeader(authData.access_token));
      } catch (err) {
        console.error('Error deleting contract:', err);
      }
    }
  };

  // Register new card
  async function registerCard(data: CreditCardSchemaFormType) {
    if (!(await checkTokenExpiration())) return;
    setLoading(true);
    if (!dadosUsuarioData.pessoaDados?.id_pessoa_pes) {
      toast.error('Falha ao continuar. Tente novamente', { position: 'bottom-center' });
      setLoading(false);
      return;
    }

    const dataToSent = {
      ...data,
      id_pessoa_pes: dadosUsuarioData.pessoaDados.id_pessoa_pes,
    };

    try {
      const res = await api.post(
        `/integracaoPagarMe/criarCartaoCliente`,
        dataToSent,
        generateRequestHeader(authData.access_token)
      );
      if (res.status === 200 && !res.data.error) {
        toast.success('Cartão cadastrado com sucesso!', { position: 'bottom-center' });
        await makePayment(res.data.data);
        await fetchCreditCards(dadosUsuarioData.pessoaDados.id_pessoa_pes);
      } else {
        setErrorMessage('Falha ao cadastrar cartão. Verifique os dados e tente novamente.');
        toast.error('Falha ao cadastrar cartão. Verifique os dados e tente novamente.', { position: 'bottom-center' });
      }
    } catch (err: any) {
      console.error('Erro ao cadastrar cartão:', err);
      setErrorMessage(err.response?.data?.message || 'Erro ao cadastrar cartão.');
      toast.error(err.response?.data?.message || 'Erro ao cadastrar cartão.', { position: 'bottom-center' });
    } finally {
      setLoading(false);
    }
  }

  // Make payment with selected or new card
  async function makePayment(card: UserCreditCard) {
    if (!(await checkTokenExpiration())) return;
    if (!idFormaPagamento || !contratoParcela || !plano || !planoPagamento) {
      setErrorMessage(
        `Dados de pagamento inválidos. Faltando: ${[
          !idFormaPagamento && 'Forma de Pagamento',
          !contratoParcela && 'Parcela do Contrato',
          !plano && 'Plano',
          !planoPagamento && 'Plano de Pagamento',
        ]
          .filter(Boolean)
          .join(', ')}`
      );
      toast.error('Dados de pagamento inválidos.', { position: 'bottom-center' });
      setLoading(false);
      return;
    }

    const vlrTotalAnual = isAnual && planoPagamento
      ? planoPagamento.num_parcelas_ppg * planoPagamento.vlr_parcela_ppg
      : plano.vlr_adesao_pla || 0;

    const baseData = {
      id_origem_pagamento_cpp: 7,
      cod_origem_pagamento_cpp: contratoParcela?.id_contrato_parcela_config_cpc,
      num_cod_externo_cpp: 0,
      vlr_adesao_pla: vlrTotalAnual,
      id_forma_pagamento_cpp: idFormaPagamento,
      dta_pagamento_cpp: getCurrentDate(),
      id_origem_cpp: 7,
      card_id: card.id,
      is_anual: isAnual ? 1 : 0,
    };

    log('baseData', baseData);

    try {
      const response = await api.post(`/pagamento-parcela`, baseData, generateRequestHeader(authData.access_token));
      log(`makePayment status ${response.status}`, response.data);

      if (response.status === 200 && !response.data.error) {
        toast.success('Pagamento realizado com sucesso!', { position: 'bottom-center' });
        await getSignatureDataAfterPaid();
      } else {
        setErrorMessage(response.data.message || 'Erro ao realizar pagamento.');
        toast.error(response.data.message || 'Erro ao realizar pagamento.', { position: 'bottom-center' });
      }
    } catch (err: any) {
      console.error('Erro ao processar pagamento:', err);
      setErrorMessage(err.response?.data?.message || 'Erro ao processar o pagamento.');
      toast.error(err.response?.data?.message || 'Erro ao processar o pagamento.', { position: 'bottom-center' });
    } finally {
      setLoading(false);
    }
  }

  async function getSignatureDataAfterPaid() {
    if (!(await checkTokenExpiration())) return;
    try {
      const response = await api.get(
        `/pessoa/${dadosUsuarioData.pessoaDados?.id_pessoa_pes}/signature`,
        generateRequestHeader(authData.access_token)
      );
      if (response.status === 200) {
        setDadosUsuarioData({
          ...dadosUsuarioData,
          pessoaAssinatura: response.data.response,
        });
        toast.success('Dados atualizados com sucesso', { position: 'bottom-center' });
        navigate('user-contracts-payment-successfull');
      }
    } catch (err) {
      console.error('Error fetching signature:', err);
      setErrorMessage('Erro ao atualizar dados após pagamento.');
      toast.error('Erro ao atualizar dados após pagamento.', { position: 'bottom-center' });
    }
  }

  const onSubmit = (data: CreditCardSchemaFormType) => {
    registerCard(data);
  };

  const onError = () => {
    Alert.alert('Erro', 'Erro ao realizar pagamento. Revise os dados ou tente novamente mais tarde.');
  };

  return (
    <KeyboardAwareScrollView
      keyboardShouldPersistTaps="always"
      contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
    >
      <ModalContainer handleVisible={() => setIsModalVisible(false)} visible={isModalVisible}>
        <ModalContent
          isBackButtonVisible={true}
          backButtonText="Não"
          confirmButtonText="Sim"
          confirmButtonAction={handleBackButtonPress}
          title="Aviso!"
          description="Deseja cancelar o pagamento?"
          backButtonAction={() => setIsModalVisible(false)}
        />
      </ModalContainer>

      {loading ? (
        <View style={styles.loadingContainer}>
          <Icon name="loading" size={24} color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.onSurface }]}>Carregando...</Text>
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

          {userCreditCards.length > 0 && (
            <View style={styles.cardSelectionContainer}>
              <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Cartões Cadastrados</Text>
              <View>
                {userCreditCards.map((item) => (
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
                        <Icon name="check-circle" size={24} color={colors.primary} />
                      )}
                    </TouchableOpacity>
                  </Animated.View>
                ))}
              </View>
              <Button
                mode="contained"
                disabled={loading || !selectedCardId}
                onPress={async () => {
                  if (!(await checkTokenExpiration())) return;
                  const selectedCard = userCreditCards.find((card) => card.id === selectedCardId);
                  if (selectedCard) {
                    await makePayment(selectedCard);
                  }
                }}
                style={[styles.paymentButton, { backgroundColor: colors.primary }]}
                labelStyle={styles.paymentButtonLabel}
                icon={loading ? undefined : 'credit-card-check'}
                loading={loading}
              >
                {loading ? 'Processando...' : 'Pagar com Cartão Selecionado'}
              </Button>
            </View>
          )}

          <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
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
                  onChangeText={(text) => setValue('number', text)}
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
                    onChangeText={(text) => setValue('exp_month', text, { shouldValidate: true })}
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
                    onChangeText={(text) => setValue('exp_year', text, { shouldValidate: true })}
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
                  onChangeText={(text) => setValue('cvv', text, { shouldValidate: true })}
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
 personally identifiable information removed
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
            disabled={loading}
            onPress={handleSubmit(onSubmit, onError)}
            style={[styles.paymentButton, { backgroundColor: colors.primary }]}
            labelStyle={styles.paymentButtonLabel}
            icon={loading ? undefined : 'credit-card-plus'}
            loading={loading}
          >
            {loading ? 'Processando...' : 'Realizar Pagamento com Novo Cartão'}
          </Button>

          <Button
            mode="outlined"
            disabled={loading}
            onPress={() => setIsModalVisible(true)}
            labelStyle={{ fontSize: 16, color: colors.primary }}
            style={styles.modalCloseButton}
            contentStyle={{
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Icon source="arrow-left" size={18} color={colors.primary} />
            <Text style={{ color: colors.primary }}> Voltar</Text>
          </Button>
        </>
      )}
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  cardView: {
    alignSelf: 'center',
    marginVertical: 10,
    width: '100%',
    maxWidth: 300,
  },
  formContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 10,
    elevation: 5,
    marginBottom: 20,
  },
  input: {
    marginBottom: 12,
    backgroundColor: 'white',
  },
  expiryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  expiryInput: {
    width: '48%',
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginBottom: 8,
  },
  errorCard: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
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
  modalCloseButton: {
    marginTop: 10,
    borderRadius: 8,
    borderWidth: 1,
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