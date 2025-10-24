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
const validateCpf = (cpf: string): boolean => {
  // Remove caracteres que não sejam números
  cpf = cpf.replace(/\D/g, '');

  // Verifica se tem 11 dígitos
  if (cpf.length !== 11) return false;

  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  // Valida os dois últimos dígitos (dígitos verificadores)
  for (let t = 9; t < 11; t++) {
    let d = 0;
    for (let c = 0; c < t; c++) {
      d += parseInt(cpf[c], 10) * ((t + 1) - c);
    }
    d = ((10 * d) % 11) % 10;
    if (parseInt(cpf[t], 10) !== d) return false;
  }

  return true;
};
  const route = useRoute<RouteProp<RegisterStepOneRouteParams, 'params'>>();
  const tipo = route.params.tipo ?? 'NEW_USER';

  // 🔹 Adicionamos uma regra de até 25 caracteres no schema base
  const schema = stepOneSchema.extend({
    des_nome_pes: z
      .string()
      .min(1, { message: 'O nome é obrigatório' })
      .max(25, { message: 'O nome deve ter no máximo 25 caracteres' }),
  });

  type StepOneSchemaFormType = z.infer<typeof schema>;

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<StepOneSchemaFormType>({
    resolver: zodResolver(schema),
    defaultValues: {
      cod_cpf_pes: pessoaCreateData.cod_cpf_pes ?? '',
      des_nome_pes: pessoaCreateData.des_nome_pes ?? '',
      dta_nascimento_pes: pessoaCreateData.dta_nascimento_pes ?? '',
    },
  });

  const onSubmit = async (submitData: StepOneSchemaFormType) => {
  // Valida CPF antes de consultar a API
  if (!validateCpf(submitData.cod_cpf_pes)) {
    toast.error('CPF não existe!', { position: 'bottom-center' });
    return;
  }

  try {
    const response = await api.get(`/pessoa?cod_cpf_pes=${submitData.cod_cpf_pes}`);
    const pessoas = response.data.response?.data ?? [];

    if (pessoas.length > 0) {
      toast.error('CPF já cadastrado no sistema!', { position: 'bottom-center' });
      return;
    }

    const localData = {
      ...pessoaCreateData,
      ...submitData,
      cod_cpf_pes: removeAccents(submitData.cod_cpf_pes),
      tipo: route.params.tipo,
      id_situacao_pda: tipo == 'NEW_USER' ? '1' : '2',
    };

    setPessoaCreateData(localData);
    navigate('register-step-two');
  } catch (err) {
    console.log(err);
    toast.error('Erro ao validar CPF. Tente novamente.');
  }
};

  const onError = (errors: any) => {
    console.log('errors', errors);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <KeyboardAwareScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <ProgressBar
          progress={0.2}
          color={theme.colors.primary}
          style={{ height: 8, borderRadius: 4, marginBottom: 16 }}
        />
        <Text style={[styles.title, { color: theme.colors.primary }]}>
          Vamos precisar de algumas informações antes de continuar
        </Text>

        <View>
          {/* CPF */}
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
          {errors.cod_cpf_pes && (
            <Text style={styles.errorText}>{errors.cod_cpf_pes.message}</Text>
          )}

          {/* Nome completo */}
          <Controller
            control={control}
            name="des_nome_pes"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Nome Completo"
                mode="outlined"
                maxLength={25} // 🔹 limita diretamente o input
                error={!!errors.des_nome_pes}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                style={styles.input}
              />
            )}
          />
          {errors.des_nome_pes && (
            <Text style={styles.errorText}>{errors.des_nome_pes.message}</Text>
          )}

          {/* Data de nascimento */}
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

          <Button
            mode="contained"
            style={{ marginTop: 80 }}
            onPress={handleSubmit(onSubmit, onError)}
          >
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
    marginBottom: 12,
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 13,
    marginBottom: 8,
  },
});

export default RegisterStepOne;
