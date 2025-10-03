import { Alert, StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Button, Icon, Text, TextInput, useTheme } from 'react-native-paper';
import { CreditCardFormField, CreditCardView } from 'react-native-credit-card-input';
import { useEffect, useState } from 'react';
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
import ModalContainer from '../../components/modal';
import { ModalContent } from '../../components/modal-content';

export default function PaymentCreditCard() {
  const { colors } = useTheme();
  const { dadosUsuarioData, setDadosUsuarioData } = useDadosUsuario();
  const { authData } = useAuth();
  const { contratoParcela, idFormaPagamento, contratoCreated, plano } = useAccquirePlan();
  const [focusedField, setFocusedField] = useState<CreditCardFormField | undefined>('number');
  const [loading, setLoading] = useState<boolean>(false);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const navigation = useNavigation();
  const [errorMessage, setErrorMessage] = useState<string>('');

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
      id_pessoa_pes: dadosUsuarioData.pessoaDados?.id_pessoa_pes!,
      number: '',
    },
  });

  // Atualiza o cartão enquanto o usuário digita
  const cardValues = watch();

  const cardBrand = getCardBrand(watch('number'));

  useEffect(() => {
    setValue('brand', cardBrand ?? '');
  }, [cardBrand]);

  useEffect(() => {
    navigation.setOptions({
      headerBackVisible: false,
    });
  }, [navigation]);

  const handleBackButtonPress = async () => {
    goBack();
    await api.delete(`/contrato/${contratoCreated?.id_contrato_ctt}`, generateRequestHeader(authData.access_token));
  };

  async function getSignatureDataAfterPaid() {
    try {
      const response = await api.get(`/pessoa/${dadosUsuarioData.pessoaDados?.id_pessoa_pes}/signature`, generateRequestHeader(authData.access_token));
      const { data } = response;

      const assinatura = data.response;
      if (response.status == 200) {
        setDadosUsuarioData({
          ...dadosUsuarioData,
          pessoaAssinatura: assinatura,
        });
        toast.success('Dados atualizados com sucesso', { position: 'bottom-center' });
        navigate('user-contracts-payment-successfull');
      }
    } catch (err) {
      console.log('cat err', err);
    }
  }

  //1 - Cadastrar o cartao da pessoa
  async function registerCard(data: CreditCardSchemaFormType) {
    setLoading(true);
    if (!dadosUsuarioData.pessoaDados?.id_pessoa_pes) {
      toast.error('Falha ao continuar. Tente novamente');
      setLoading(false);
      return;
    }

    let dataToSent = {
      ...data,
      id_pessoa_pes: dadosUsuarioData.pessoaDados?.id_pessoa_pes,
    };

    const res = await api.post(`/integracaoPagarMe/criarCartaoCliente`, dataToSent, generateRequestHeader(authData.access_token));
    //console.log('1 res', res);
    const { data: dataRes } = res;

    if (res.status == 200) {
      if (dataRes.error) {
        toast.error('Falha ao continuar. Tente novamente');
        setLoading(false);
        return;
      }
      //2 - Realizar o pagamento com o id do cartao cadastrado
      makePayment(dataRes.data);
    } else {
      console.log('1 fail');
      toast.error('Falha ao cadastrar cartão. Verifique os dados e tente novamente.');
      setLoading(false);
    }
  }

  //2 - Realizar o pagamento com o id do cartao cadastrado
  async function makePayment(card: UserCreditCard) {
    if (!idFormaPagamento || !contratoParcela || !plano) {
      setErrorMessage(
        `Dados de pagamento inválidos. Faltando: ${[!idFormaPagamento && 'Forma de Pagamento', !contratoParcela && 'Parcela do Contrato', !plano && 'Plano']
          .filter(Boolean)
          .join(', ')}`,
      );
      toast.error('Dados de pagamento inválidos.', { position: 'bottom-center' });
      setLoading(false);
      return;
    }
    const { vlr_adesao_pla = 0 } = plano;

    let baseData = {
      id_origem_pagamento_cpp: 7,
      cod_origem_pagamento_cpp: contratoParcela?.id_contrato_parcela_config_cpc,
      num_cod_externo_cpp: 0,
      vlr_adesao_pla,

      id_forma_pagamento_cpp: idFormaPagamento,
      dta_pagamento_cpp: getCurrentDate(),
      id_origem_cpp: 7,
      card_id: card.id,
    };

    log('baseData', baseData);

    const response = await api.post(`/pagamento-parcela`, baseData, generateRequestHeader(authData.access_token));

    const { data } = response;

    log(`makePayment status ${response.status}`, data);

    if (response.status == 500) {
      toast.error('Ocorreu um problema ao processar o pagamento. Tente novamente mais tarde.');
      setLoading(false);
      return;
    }

    if (response.status == 200) {
      if (data.response.error) {
        console.log(data.response.error);
        toast.error('Erro ao realizar pagamento. Tente novamente.');
        setLoading(false);
        return;
      }

      console.log('deveria passar');

      // update
      getSignatureDataAfterPaid();
    } else {
      toast.error('Erro ao realizar pagamento. Tente novamente.');
      setLoading(false);
    }
  }

  const onSubmit = (data: CreditCardSchemaFormType) => {
    registerCard(data);
  };

  const onError = (errors: any) => {
    Alert.alert('Erro', 'Erro ao realizar pagamento. Revise os dados ou tente novamente mais tarde.');
  };

  return (
    <KeyboardAwareScrollView keyboardShouldPersistTaps="always" contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}>
      <ModalContainer handleVisible={() => setIsModalVisible(false)} visible={isModalVisible}>
        <ModalContent
          isBackButtonVisible={true}
          backButtonText="Não"
          confirmButtonText="Sim"
          confirmButtonAction={handleBackButtonPress}
          title="Aviso!"
          description="Deseja cancelar o pagamento?"
          backButtonAction={() => {
            setIsModalVisible(false);
          }}
        />
      </ModalContainer>

      {/* Cartão Atualizando em Tempo Real */}
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
        {/* Número do Cartão */}
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
            />
          )}
        />
        {errors.number && <Text style={styles.errorText}>{errors.number.message}</Text>}

        {/* Data de Expiração */}
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
              />
            )}
          />
        </View>
        {errors.exp_month || errors.exp_year ? <Text style={styles.errorText}>Data de expiração inválida</Text> : null}

        {/* CVC */}
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
            />
          )}
        />
        {errors.cvv && <Text style={styles.errorText}>{errors.cvv.message}</Text>}

        {/* Nome do Titular */}
        <Controller
          control={control}
          name="holder_name"
          render={({ field: { onChange, value } }) => (
            <TextInput label="Nome do Titular" mode="outlined" style={styles.input} onChangeText={onChange} value={value} onFocus={() => setFocusedField('name')} />
          )}
        />
        {errors.holder_name && <Text style={styles.errorText}>{errors.holder_name.message}</Text>}

        {/* CPF do Titular */}
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
            />
          )}
        />
        {errors.holder_document && <Text style={styles.errorText}>{errors.holder_document.message}</Text>}
      </View>

      {/* Botão de Pagamento */}
      <Button mode="contained" disabled={loading} onPress={handleSubmit(onSubmit, onError)} labelStyle={{ fontSize: 16 }} style={{ marginTop: 10 }}>
        {loading ? 'Aguarde' : 'Realizar Pagamento'}
      </Button>

      <Button
        mode="outlined"
        key={'goBack'}
        disabled={loading}
        onPress={() => setIsModalVisible(true)}
        labelStyle={{ fontSize: 16 }}
        style={{ marginTop: 10 }}
        contentStyle={{
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
        <Icon source={'arrow-left'} size={18} color={colors.primary} />
        <Text style={{ color: colors.primary }}> Voltar</Text>
      </Button>
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
  },
  expiryInput: {
    width: '48%',
  },
  button: {
    paddingVertical: 10,
    borderRadius: 8,
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginBottom: 8,
  },
});
