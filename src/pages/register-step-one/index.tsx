import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { Button, ProgressBar, TextInput, useTheme } from 'react-native-paper';
import { DatePickerInput } from 'react-native-paper-dates';
import { usePessoaCreate } from '../../context/create-pessoa-context';
import { z } from 'zod';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { stepOneSchema } from '../../form-objects/step-one-form';
import dayjs from 'dayjs';
import { applyCpfMask, generateRequestHeader, removeAccents } from '../../utils/app-utils';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { api } from '../../network/api';
import { toast } from 'sonner-native';
import { goBack, navigate } from '../../router/navigationRef';
import { RouteProp, useRoute } from '@react-navigation/native';
require('dayjs/locale/pt-br');

type RegisterStepOneRouteParams = {
  params: {
    tipo: 'NEW_USER' | 'DEPENDENT';
  };
};

const RegisterStepOne = () => {
  const theme = useTheme();

  const { setPessoaCreateData, pessoaCreateData } = usePessoaCreate();

  const route = useRoute<RouteProp<RegisterStepOneRouteParams, 'params'>>();
  const tipo = route.params.tipo ?? 'NEW_USER';

  type StepOneSchemaFormType = z.infer<typeof stepOneSchema>;

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<StepOneSchemaFormType>({
    resolver: zodResolver(stepOneSchema),
    defaultValues: {
      cod_cpf_pes: pessoaCreateData.cod_cpf_pes ?? '',
      des_nome_pes: pessoaCreateData.des_nome_pes ?? '',
      dta_nascimento_pes: pessoaCreateData.dta_nascimento_pes ?? '',
    },
  });

  const onSubmit = async (submitData: StepOneSchemaFormType) => {
    //checar cpf
    api
      .get(`/pessoa?cod_cpf_pes=${submitData.cod_cpf_pes}`)
      .then(response => {
        const { data } = response;

        if (data.response.data.length > 0) {
          if (tipo == 'DEPENDENT') {
            toast.error('Usuário já cadastrado no sistema!', { position: 'bottom-center' });
            return;
          }

          toast.success('Realize um login para continuar', { position: 'bottom-center' });
          goBack();
          //navigate('check-password', { cod_cpf_pes: submitData.cod_cpf_pes });
        } else {
          console.log('else');

          const localData = {
            ...pessoaCreateData,
            ...submitData,
            cod_cpf_pes: removeAccents(submitData.cod_cpf_pes),
            tipo: route.params.tipo,
            id_situacao_pda: tipo == 'NEW_USER' ? '1' : '2',
          };

          console.log(localData);

          setPessoaCreateData(localData);

          navigate('register-step-two');
        }
      })
      .catch(err => {
        console.log(err);
      });
  };

  const onError = (errors: any) => {
    console.log('errors', errors);
  };

  return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>

    <KeyboardAwareScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ProgressBar progress={0.2} color={theme.colors.primary} style={{ height: 8, borderRadius: 4, marginBottom: 16 }} />
      <Text style={[styles.title, { color: theme.colors.primary }]}>Vamos precisar de algumas informações antes de continuar</Text>

      <View>
        <Controller
          control={control}
          name="cod_cpf_pes"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label="CPF"
              mode="outlined"
              onChangeText={e => onChange(applyCpfMask(e))}
              value={value}
              keyboardType="number-pad"
              error={!!errors.cod_cpf_pes}
              style={styles.input}
            />
          )}
        />

        <Controller
          control={control}
          name="des_nome_pes"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput label="Nome Completo" mode="outlined" error={!!errors.des_nome_pes} onBlur={onBlur} onChangeText={onChange} value={value} style={styles.input} />
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
              }}
              mode="outlined"
              hasError={!!errors.dta_nascimento_pes}
            />
          )}
        />
        <Button mode="contained" style={{ marginTop: 80 }} onPress={handleSubmit(onSubmit, onError)}>
          Continuar
        </Button>
      </View>
    </KeyboardAwareScrollView>
      </SafeAreaView>

  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#333',
  },

  input: {
    marginBottom: 20,
  },
  footer: {
    justifyContent: 'flex-end',
    paddingVertical: 16,
    bottom: 10,
  },
  button: {
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    color: 'white',
  },
});

export default RegisterStepOne;
