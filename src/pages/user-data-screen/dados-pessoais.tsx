import { Controller, useForm } from 'react-hook-form';
import { Alert, StyleSheet, View } from 'react-native';
import pessoaSchema from '../../form-objects/pessoa-form';
import { z } from 'zod';
import { Button, RadioButton, SegmentedButtons, Text, TextInput, useTheme } from 'react-native-paper';
import { applyCpfMask, applyPhoneMask, getAddressByCep, getMunicipioId, limitTextLength, logout, maskBrazilianCurrency } from '../../utils/app-utils';
import { DatePickerInput } from 'react-native-paper-dates';
import dayjs from 'dayjs';
import React, { useCallback, useEffect, useState } from 'react';
import { useDadosUsuario } from '../../context/pessoa-dados-context';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../network/api';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFocusEffect } from '@react-navigation/native';
import InputAlert from '../../components/input-alert';
import LoadingFull from '../../components/loading-full';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { reset as resetNavigation } from '../../router/navigationRef';
import { useConsultas } from '../../context/consultas-context';
import { useExames } from '../../context/exames-context';

type PessoaSchemaFormType = z.infer<typeof pessoaSchema>;

const UserPersonalDataScreen = ({ navigation }: { navigation: any }) => {
  const { colors } = useTheme();
  const { dadosUsuarioData, clearLoginDadosUsuarioData, clearDadosUsuarioData, setDadosUsuarioData } = useDadosUsuario();
  const { clearSelectedExams } = useExames()
  const { authData, clearAuthData } = useAuth();
  const { pessoaDados } = dadosUsuarioData;

  const {
    control,
    reset,
    setValue,
    getValues,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<PessoaSchemaFormType>({
    resolver: zodResolver(pessoaSchema),
    defaultValues: {
      id_pessoa_pes: pessoaDados?.id_pessoa_pes,
      des_nome_pes: pessoaDados?.des_nome_pes,
      cod_cpf_pes: pessoaDados?.cod_cpf_pes,
      num_whatsapp_pes: pessoaDados?.num_whatsapp_pes,
      is_ativo_pes: pessoaDados?.is_ativo_pes,
      dta_nascimento_pes: pessoaDados?.dta_nascimento_pes,
      num_celular_pes: pessoaDados?.num_celular_pes,
      num_telefone_pes: pessoaDados?.num_telefone_pes,
      des_genero_pes: pessoaDados?.des_genero_pes,
      dth_cadastro_pes: pessoaDados?.dth_cadastro_pes,
      dth_alteracao_pes: pessoaDados?.dth_alteracao_pes,
      des_sexo_biologico_pes: pessoaDados?.des_sexo_biologico_pes,
      cod_cep_pda: pessoaDados?.cod_cep_pda,
      des_endereco_pda: pessoaDados?.des_endereco_pda,
      num_endereco_pda: pessoaDados?.num_endereco_pda,
      des_email_pda: pessoaDados?.des_email_pda,
      des_endereco_completo_pda: pessoaDados?.des_endereco_completo_pda,
      des_bairro_pda: pessoaDados?.des_bairro_pda,
      dta_emissao_rg_pda: pessoaDados?.dta_emissao_rg_pda,
      des_municipio_mun: pessoaDados?.des_municipio_mun,
      des_estado_civil_pda: pessoaDados?.des_estado_civil_pda,
      cod_rg_pda: pessoaDados?.cod_rg_pda,
      id_situacao_pda: pessoaDados?.id_situacao_pda,
      des_estado_est: pessoaDados?.des_estado_est,
      id_municipio_pda: pessoaDados?.id_municipio_pda,
      des_nome_mae_pda: pessoaDados?.des_nome_mae_pda,
      des_ocupacao_profissional_pda: pessoaDados?.des_ocupacao_profissional_pda,
      des_ponto_referencia_pda: pessoaDados?.des_ponto_referencia_pda,
      vlr_renda_mensal_pda: pessoaDados?.vlr_renda_mensal_pda,
    },
  });

  const currentCEP = watch('cod_cep_pda');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hashPassword, setHashPassword] = useState<string>('');
  const [isInputAlertVisible, setIsInputAlertVisible] = useState<boolean>(false);

  const { setUserSchedulesData } = useConsultas();


  const fetchUserData = async () => {
    try {
      const request = await api.get(`/pessoa/${dadosUsuarioData.user.id_pessoa_usr}`, {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `bearer ${authData.access_token}`,
        },
      });

      const { data } = request;
      reset(data.response.data[0]);
    } catch (err: any) {
      const statusCode = err.response?.status;
      if (statusCode !== 200) {
        Alert.alert('Aviso', 'Ocorreu um erro ao obter os dados. Tente novamente mais tarde.');
        console.log(err.response.data);
        return;
      }
    } finally {
      setIsLoading(false);
    }
  };

  async function fetchMunicipioId() {
    try {
      const municpioId = await getMunicipioId(getValues().des_municipio_mun);
      setValue('id_municipio_pda', municpioId);
    } catch (err) {
      if (err instanceof Error) {
        Alert.alert('Aviso', err.message);
      }
    }
  }

  async function fetchCEPData() {
    setIsLoading(true);
    try {
      const cepData: AddressResponse = await getAddressByCep(currentCEP);
      setValue('des_endereco_pda', cepData.logradouro);
      setValue('des_bairro_pda', cepData.bairro);
      setValue('des_municipio_mun', cepData.localidade);
      setValue('des_estado_est', cepData.uf);
      setValue('des_endereco_completo_pda', limitTextLength(`${cepData.logradouro} ${getValues().num_endereco_pda}`, 11));
      await fetchMunicipioId();
    } catch (err) {
      if (err instanceof Error) {
        //Alert.alert('Aviso', err.message);
      }
    } finally {
      setIsLoading(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      //fetchUserData();
      //setIsLoading(false);
      return () => {
        reset();
      };
    }, []),
  );

  useEffect(() => {
    if (currentCEP.length == 8) {
      fetchCEPData();
    }
  }, [currentCEP]);

  const onSubmit = async (body: PessoaSchemaFormType) => {
    if (getValues().cod_cpf_pes === dadosUsuarioData.pessoa!.cod_cpf_pes) {
      delete body.cod_cpf_pes;
    }

    if (body.dta_emissao_rg_pda == '') {
      delete body.dta_emissao_rg_pda;
    }

    if (body.num_telefone_pes == '') {
      delete body.num_telefone_pes;
    }

    setIsLoading(true);

    console.log(JSON.stringify(body, null, 2));

    try {
      const request = await api.put(`/pessoa/${dadosUsuarioData.user.id_pessoa_usr}`, body, {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `bearer ${authData.access_token}`,
        },
      });

      const { data } = request;

      if (request.status == 200) {
        Alert.alert('Aviso', 'Dados atualizados com sucesso!');

        setDadosUsuarioData({
          ...dadosUsuarioData,
          ...body,
          errorCadastroPagarme: data.errorCadastroPagarme,
        });
      } else {
        Alert.alert('Aviso', 'Erro ao atualizar Dados. Tente novamente.');
      }
    } catch (err: any) {
      console.log('err', err.response.data);
      Alert.alert(JSON.stringify(err.response.data.message));

      // const statusCode = err.response?.status;
      // if (statusCode !== 200) {
      //   Alert.alert('Aviso', 'Erro ao atualizar Dados. Tente novamente.');
      // }
    } finally {
      setIsLoading(false);
    }
  };

  const onError = (err: any) => {
    console.log('onError', JSON.stringify(err, null, 2));
    if (String(err.id_municipio_pda.message).includes('Required')) {
      fetchCEPData();
    }
    console.log('onError ', JSON.stringify(err, null, 2));
    // caso der erro no id municipio, fazer fetch de novo
  };

  const handleLogout = () => {
    Alert.alert('Aviso', 'Deseja sair do aplicativo?', [
      {
        text: 'não',
        onPress: () => null,
        style: 'cancel',
      },
      {
        text: 'Sim',
        onPress: () => {
          clearDadosUsuarioData();
          clearLoginDadosUsuarioData();
          clearAuthData();
          setUserSchedulesData([]);
          clearSelectedExams()
          logout(authData.access_token);
          resetNavigation([{ name: 'logged-home-screen' }]);
        },
      },
    ]);
    return true;
  };

  return (
    <>
      {isLoading ? (
        <LoadingFull />
      ) : (
        <KeyboardAwareScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 10, backgroundColor: colors.background }}>
          <InputAlert
            isVisible={isInputAlertVisible}
            title={'Alterar senha'}
            dismissable
            setIsVisible={() => {
              setIsInputAlertVisible(false);
            }}
          />

          <Controller
            control={control}
            name="des_nome_pes"
            render={({ field: { onChange, value } }) => (
              <TextInput editable={false} label="Nome" value={value} onChangeText={onChange} mode="outlined" style={styles.input} error={!!errors.des_nome_pes} />
            )}
          />

          <Controller
            control={control}
            name="cod_cpf_pes"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="CPF"
                editable={false}
                mode="outlined"
                error={!!errors.cod_cpf_pes}
                onBlur={onBlur}
                onChangeText={e => {
                  let masked = applyCpfMask(e);
                  onChange(masked);
                }}
                value={applyCpfMask(value!)}
                keyboardType="number-pad"
                style={styles.input}
              />
            )}
          />

          <Controller
            control={control}
            name="des_genero_pes"
            render={({ field: { onChange, value } }) => (
              <TextInput label="Como quer ser chamado?" value={value} onChangeText={onChange} mode="outlined" style={styles.input} error={!!errors.des_genero_pes} />
            )}
          />

          <Controller
            control={control}
            name="des_sexo_biologico_pes"
            render={({ field: { onChange, value } }) => (
              <SegmentedButtons
                value={value}
                onValueChange={onChange}
                buttons={[
                  { value: 'M', label: 'Masculino', icon: 'gender-male' },
                  { value: 'F', label: 'Feminino', icon: 'gender-female' },
                ]}
                style={styles.segmentedButtons}
              />
            )}
          />

          <Controller
            control={control}
            name="dta_nascimento_pes"
            render={({ field: { onChange, value } }) => (
              <DatePickerInput
                locale="pt-BR"
                label="Data de Nascimento"
                withDateFormatInLabel={false}
                value={value ? dayjs(value).toDate() : undefined}
                onChange={date => {
                  const formattedDate = date ? dayjs(date).format('YYYY-MM-DD') : '';
                  onChange(formattedDate);
                }}
                inputMode="start"
                style={{
                  maxHeight: 60,
                  alignSelf: 'flex-start',
                  marginBottom: '4%',
                }}
                mode="outlined"
                hasError={!!errors.dta_nascimento_pes}
              />
            )}
          />

          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.primary }]}>Estado Civil</Text>
            <Controller
              control={control}
              name="des_estado_civil_pda"
              render={({ field: { onChange, value } }) => (
                <RadioButton.Group onValueChange={onChange} value={value}>
                  <RadioButton.Item label="Solteiro" value="solteiro" />
                  <RadioButton.Item label="Casado" value="casado" />
                  <RadioButton.Item label="Separado" value="separado" />
                  <RadioButton.Item label="Divorciado" value="divorciado" />
                  <RadioButton.Item label="Viúvo" value="viúvo" />
                </RadioButton.Group>
              )}
            />
          </View>
            <Text style={[styles.label, { color: colors.primary }]}>Informações</Text>

          <Controller
            control={control}
            name="cod_rg_pda"
            render={({ field: { onChange, value } }) => (
              <TextInput
                label="Numero RG"
                value={value}
                keyboardType="numeric"
                onChangeText={e => {
                  onChange(e);
                }}
                mode="outlined"
                style={styles.input}
                error={!!errors.cod_rg_pda}
                maxLength={20}
              />
            )}
          />

          <Controller
            control={control}
            name="dta_emissao_rg_pda"
            render={({ field: { onChange, value } }) => (
              <DatePickerInput
                locale="pt-BR"
                label="Data de Emissão RG"
                withDateFormatInLabel={false}
                value={value ? dayjs(value).toDate() : undefined}
                onChange={date => {
                  const formattedDate = date ? dayjs(date).format('YYYY-MM-DD') : '';
                  onChange(formattedDate);
                }}
                inputMode="start"
                style={{
                  maxHeight: 60,
                  alignSelf: 'flex-start',
                  marginBottom: '4%',
                }}
                mode="outlined"
                hasError={!!errors.dta_emissao_rg_pda}
              />
            )}
          />

          <Controller
            control={control}
            name="num_whatsapp_pes"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="WhatsApp"
                mode="outlined"
                error={!!errors.num_whatsapp_pes}
                onBlur={onBlur}
                onChangeText={e => {
                  let masked = applyPhoneMask(e);
                  onChange(masked);
                }}
                value={applyPhoneMask(value ?? '')}
                keyboardType="number-pad"
                style={styles.input}
              />
            )}
          />

          <Controller
            control={control}
            name="num_celular_pes"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Numero Celular"
                mode="outlined"
                error={!!errors.num_celular_pes}
                onBlur={onBlur}
                onChangeText={e => {
                  let masked = applyPhoneMask(e);
                  onChange(masked);
                }}
                value={applyPhoneMask(value ?? '')}
                keyboardType="number-pad"
                style={styles.input}
              />
            )}
          />

          <Controller
            control={control}
            name="num_telefone_pes"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Telefone"
                mode="outlined"
                error={!!errors.num_telefone_pes}
                onBlur={onBlur}
                onChangeText={e => {
                  let masked = applyPhoneMask(e);
                  onChange(masked);
                }}
                value={applyPhoneMask(value ?? '')}
                keyboardType="number-pad"
                style={styles.input}
              />
            )}
          />

          <Controller
            control={control}
            name="des_email_pda"
            render={({ field: { onChange, value } }) => (
              <TextInput label="Email" value={value} onChangeText={onChange} mode="outlined" style={styles.input} error={!!errors.des_email_pda} />
            )}
          />

          <Controller
            control={control}
            name="des_nome_mae_pda"
            render={({ field: { onChange, value } }) => (
              <TextInput label="Nome da mãe" value={value} onChangeText={onChange} mode="outlined" style={styles.input} error={!!errors.des_nome_mae_pda} />
            )}
          />

          <Controller
            control={control}
            name="des_ocupacao_profissional_pda"
            render={({ field: { onChange, value } }) => (
              <TextInput label="Ocupação profissional" value={value} onChangeText={onChange} mode="outlined" style={styles.input} error={!!errors.des_ocupacao_profissional_pda} />
            )}
          />

          <Controller
            control={control}
            name="vlr_renda_mensal_pda"
            render={({ field: { onChange, value } }) => (
              <TextInput
                label="Renda mensal"
                value={maskBrazilianCurrency(value)}
                onChangeText={e => {
                  const onlyNumbers = e.replace(/\D/g, '');
                  onChange(Number(onlyNumbers));
                }}
                mode="outlined"
                style={styles.input}
                error={!!errors.vlr_renda_mensal_pda}
              />
            )}
          />

          <Text variant="bodyMedium" style={{ marginBottom: 10 }}>
            Endereço
          </Text>

          <Controller
            control={control}
            name="des_endereco_pda"
            render={({ field: { onChange, value } }) => (
              <TextInput
                label="Complemento"
                value={limitTextLength(value, 11)}
                onChangeText={e => {
                  onChange(e);
                }}
                mode="outlined"
                style={styles.input}
                error={!!errors.des_endereco_completo_pda}
                maxLength={11}
              />
            )}
          />

          <Controller
            control={control}
            name="cod_cep_pda"
            render={({ field: { onChange, value } }) => (
              <TextInput
                label="CEP"
                value={value}
                onChangeText={e => {
                  let masked = limitTextLength(e, 8);
                  onChange(masked);
                }}
                mode="outlined"
                style={styles.input}
                error={!!errors.des_endereco_completo_pda}
              />
            )}
          />

          <Controller
            control={control}
            name="des_endereco_completo_pda"
            render={({ field: { onChange, value } }) => (
              <TextInput
                label="Endereço completo"
                value={value}
                onChangeText={e => {
                  onChange(e);
                }}
                mode="outlined"
                style={styles.input}
                error={!!errors.des_endereco_completo_pda}
                maxLength={11}
              />
            )}
          />

          <Controller
            control={control}
            name="num_endereco_pda"
            render={({ field: { onChange, value } }) => (
              <TextInput
                label="Numero"
                value={value}
                onChangeText={e => {
                  onChange(e);
                }}
                mode="outlined"
                style={styles.input}
                error={!!errors.num_endereco_pda}
              />
            )}
          />

          <Controller
            control={control}
            name="des_bairro_pda"
            render={({ field: { onChange, value } }) => (
              <TextInput
                label="Bairro"
                value={value}
                onChangeText={e => {
                  onChange(e);
                }}
                mode="outlined"
                style={styles.input}
                error={!!errors.des_bairro_pda}
              />
            )}
          />

          <Controller
            control={control}
            name="des_ponto_referencia_pda"
            render={({ field: { onChange, value } }) => (
              <TextInput
                label="Ponto de referência"
                value={value}
                onChangeText={e => {
                  onChange(e);
                }}
                mode="outlined"
                style={styles.input}
                error={!!errors.des_ponto_referencia_pda}
              />
            )}
          />

          <Controller
            control={control}
            name="des_municipio_mun"
            render={({ field: { onChange, value } }) => (
              <TextInput
                label="Município"
                value={value}
                onChangeText={e => {
                  onChange(e);
                }}
                mode="outlined"
                style={styles.input}
                error={!!errors.des_municipio_mun}
              />
            )}
          />

          <Controller
            control={control}
            name="des_estado_est"
            render={({ field: { onChange, value } }) => (
              <TextInput
                label="Estado"
                value={value}
                onChangeText={e => {
                  onChange(e);
                }}
                mode="outlined"
                style={styles.input}
                error={!!errors.des_estado_est}
              />
            )}
          />

          <Button
            mode="outlined"
            style={styles.button}
            onPress={() => {
              setIsInputAlertVisible(true);
            }}>
            Alterar senha
          </Button>
          {/* 
          <Button
            mode="outlined"
            style={styles.button}
            onPress={() => {
              navigate('user-contratos-screen');
            }}>
            Meus Contratos
          </Button> */}

          {/* <Button icon={'logout'} textColor={colors.error} mode="outlined" style={[styles.button, { borderColor: colors.error }]} onPress={handleLogout}>
            Sair
          </Button> */}

          <Button mode="contained" style={styles.button} onPress={handleSubmit(onSubmit, onError)}>
            Salvar
          </Button>
        </KeyboardAwareScrollView>
      )}
    </>
  );
};
const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  innerContainer: {
    flex: 1,
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  buttonContainer: {
    paddingHorizontal: 10,
    paddingBottom: 0,
    height: 'auto',
  },
  title: {
    fontFamily: 'Roboto-Bold',
    fontSize: 24,
    color: 'black',
    marginBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 18,
    paddingBottom: 10,
    color: 'black',
    fontWeight: 600,
    marginBottom: 8,
  },
  segmentedButtons: {
    marginBottom: 20,
    backgroundColor: 'ed9c83c2',
  },
  hintText: {
    fontSize: 14,
    color: 'grey',
    marginTop: 4,
  },
  input: {
    marginBottom: 20,
  },
  datePickerInput: {
    marginTop: 8,
    marginBottom: 20,
  },
  button: {
    justifyContent: 'center',
    marginBottom: 20,
  },
  buttonText: {
    fontSize: 16,
    color: 'white',
  },
});

export default UserPersonalDataScreen;
