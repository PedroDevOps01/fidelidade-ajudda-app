import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { Button, ProgressBar, shadow, TextInput, useTheme } from 'react-native-paper';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { stepFourSchema } from '../../form-objects/step-four-form';
import { usePessoaCreate } from '../../context/create-pessoa-context';
import { z } from 'zod';
import { applyPhoneMask, generateRequestHeader, limitTextLength, log } from '../../utils/app-utils';
import { api } from '../../network/api';
import { CreatePessoaResponse } from '../../types/create-pessoa-response';
import { useDadosUsuario } from '../../context/pessoa-dados-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { toast } from 'sonner-native';
import { navigate } from '../../router/navigationRef';
import { useAuth } from '../../context/AuthContext';

const RegisterStepFour = ({ route, navigation }: { route: any; navigation: any }) => {
  const theme = useTheme();
  const { pessoaCreateData, setPessoaCreateData, clearPessoaCreateData } = usePessoaCreate();
  const { setDadosUsuarioData, userContracts, dadosUsuarioData } = useDadosUsuario();
  const { authData } = useAuth();

  type StepFourSchemaFormType = z.infer<typeof stepFourSchema>;

  const [loading, setLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<StepFourSchemaFormType>({
    resolver: zodResolver(stepFourSchema),
    defaultValues: {
      num_celular_pes: '',
      num_telefone_pes: '',
      num_whatsapp_pes: '',
    },
  });

  const onSubmit = async (data: StepFourSchemaFormType) => {
    console.log('onSubmit');

    log('data', data);

    setLoading(true);

    const localData = {
      ...pessoaCreateData,
      num_whatsapp_pes: Number(data.num_whatsapp_pes),
      num_celular_pes: Number(data.num_celular_pes),
      num_telefone_pes: data.num_telefone_pes !== '' ? data.num_telefone_pes : undefined,
    };

    setPessoaCreateData(localData);
    setIsReady(true);
  };

  const onError = (data: any) => {
    console.log('step four errors', JSON.stringify(data, null, 2));
  };

  useEffect(() => {
    if (!isReady) return;

    const sendRequest = async () => {
      try {
        if (pessoaCreateData.num_whatsapp_pes) {
          console.log('pessoaCreateData', JSON.stringify(pessoaCreateData, null, 2));

          const request = await api.post('/pessoa', pessoaCreateData);

          if (request.status === 200) {
            const data: CreatePessoaResponse = request.data;
            setDadosUsuarioData(data);
            navigation.navigate('register-step-five');
          }
        }
        setLoading(false);
      } catch (err: any) {
        const statusCode = err.response?.status;

        let errorMessage = '';
        if (String(err.response.data.message).includes('cpf')) {
          errorMessage = 'O CPF já se encontra registrado no sistema.';
        }

        if (statusCode !== 200) {
          Alert.alert('Aviso', `Ocorreu um erro ao tentar cadastrar.\n${errorMessage}`);
          console.log(JSON.stringify(err.response.data.message, null, 2));
          setLoading(false);
        }
      } finally {
        setIsReady(false);
        setLoading(false);
      }
    };

    //se for dependente
    const registerDependent = async () => {
      const contratoId = userContracts.filter(e => e.is_ativo_ctt == 1)[0].id_contrato_ctt;
      const request = await api.post('/pessoa', pessoaCreateData, generateRequestHeader(authData.access_token));

      if (request.status === 200) {
        console.log('criou pessoa');
        const data: CreatePessoaResponse = request.data;

        const res = await api.post(
          `/contrato/${contratoId}/dependente`,
          {
            id_titular_rtd: dadosUsuarioData.pessoaDados?.id_pessoa_pes,
            id_dependente_rtd: data.pessoa.id_pessoa_pes,
          },
          generateRequestHeader(authData.access_token),
        );
        console.log('status', res.status);

        if (res.status == 200) {
          toast.success('Dependente adicionado com sucesso!', {
            position: 'bottom-center',
            styles: {
              toast: {
                backgroundColor: theme.colors.inverseSurface,
              },
              title: {
                color: theme.colors.inverseOnSurface,
              },
            },
          });
          navigation.navigate('user-dependents-screen');
        } else {
          toast.error('Erro ao adicionar Dependente!', {
            position: 'bottom-center',
            styles: {
              toast: {
                backgroundColor: theme.colors.inverseSurface,
              },
              title: {
                color: theme.colors.inverseOnSurface,
              },
            },
          });
          console.log(res);
        }
      }

      setLoading(false);

      navigate('user-dependents-screen');
    };

    if (pessoaCreateData.tipo == 'NEW_USER') {
      sendRequest();
    } else {
      registerDependent();
    }
  }, [isReady]);

  return (
    <KeyboardAwareScrollView keyboardShouldPersistTaps="handled" style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ProgressBar progress={0.8} color={theme.colors.primary} style={{ height: 8, borderRadius: 4, marginBottom: 16 }} />

      <Text style={[styles.title, { color: theme.colors.primary }]}>Informe seus telefones de contato</Text>

      <Controller
        control={control}
        name="num_whatsapp_pes"
        render={({ field: { onChange, value } }) => (
          <TextInput
            label="WhatsApp"
            keyboardType="number-pad"
            value={value}
            onChangeText={e => {
              onChange(applyPhoneMask(e));
              setValue('num_celular_pes', applyPhoneMask(e));
            }}
            mode="outlined"
            style={styles.input}
            error={!!errors.num_whatsapp_pes}
          />
        )}
      />

      <Controller
        control={control}
        name="num_celular_pes"
        render={({ field: { onChange, value } }) => (
          <TextInput
            label="Número do telefone celular"
            keyboardType="number-pad"
            value={value}
            onChangeText={e => {
              onChange(applyPhoneMask(e));
            }}
            mode="outlined"
            style={styles.input}
            error={!!errors.num_celular_pes}
          />
        )}
      />

      {/* <Controller
        control={control}
        name="num_telefone_pes"
        render={({ field: { onChange, value } }) => (
          <TextInput
            label="Número de telefone"
            keyboardType="number-pad"
            value={value!}
            onChangeText={e => {
              onChange(applyPhoneMask(e, 10));
            }}
            mode="outlined"
            style={styles.input}
            error={!!errors.num_telefone_pes}
          />
        )}
      /> */}

      <View>
        <Button mode="contained" loading={loading} disabled={loading} onPress={handleSubmit(onSubmit, onError)}>
          {loading ? 'Aguarde' : 'Continuar'}
        </Button>
      </View>
    </KeyboardAwareScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  scrollContainer: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    flexGrow: 1,
  },
  title: {
    fontFamily: 'Roboto-Bold',
    fontSize: 24,
    color: 'black',
    marginBottom: 20,
  },
  input: {
    marginBottom: 20,
  },
  footer: {
    padding: 16,
    justifyContent: 'flex-end',
    bottom: 10,
  },
  button: {
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
  },
});

export default RegisterStepFour;
