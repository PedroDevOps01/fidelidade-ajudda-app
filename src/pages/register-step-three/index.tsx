import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button, ProgressBar, RadioButton, SegmentedButtons, TextInput, useTheme } from 'react-native-paper';
import { DatePickerInput } from 'react-native-paper-dates';
import { usePessoaCreate } from '../../context/create-pessoa-context';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { dynamicStepThreeSchema } from '../../form-objects/step-three-form';
import dayjs from 'dayjs';
import { z } from 'zod';
import { api } from '../../network/api';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { maskBrazilianCurrency } from '../../utils/app-utils';
import { toast } from 'sonner-native';
require('dayjs/locale/pt-br');

const RegisterStepThree = ({ route, navigation }: { route: any; navigation: any }) => {
  const theme = useTheme();
  const { pessoaCreateData, setPessoaCreateData } = usePessoaCreate();

  // Obtenha o tipo do contexto
  const tipo = pessoaCreateData.tipo ?? 'NEW_USER';

  // Log para depurar o tipo
  console.log('Tipo de usuário em RegisterStepThree:', tipo);

  type StepThreeSchemaFormType = z.infer<ReturnType<typeof dynamicStepThreeSchema>>;

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<StepThreeSchemaFormType>({
    resolver: zodResolver(dynamicStepThreeSchema(tipo)),
    defaultValues: {
      cod_rg_pda: pessoaCreateData.cod_rg_pda ?? '',
      des_email_pda: pessoaCreateData.des_email_pda ?? '',
      des_estado_civil_pda: pessoaCreateData.des_estado_civil_pda ?? '',
      des_genero_pes: pessoaCreateData.des_genero_pes ?? '',
      des_sexo_biologico_pes: pessoaCreateData.des_sexo_biologico_pes ?? '',
      dta_emissao_rg_pda: '2020-01-01',
      id_situacao_pda: pessoaCreateData.id_situacao_pda ?? '',
      vlr_renda_mensal_pda: pessoaCreateData.vlr_renda_mensal_pda ?? 100,
      des_nome_mae_pda: pessoaCreateData.des_nome_mae_pda ?? '',
      des_ocupacao_profissional_pda: pessoaCreateData.des_ocupacao_profissional_pda ?? '',
    },
  });

  const onSubmit = async (data: StepThreeSchemaFormType) => {
    console.log('StepThreeSchemaFormType', data);

    // Verifique o e-mail apenas se for titular
    if (tipo === 'NEW_USER' && data.des_email_pda) {
      try {
        const result = await api.get(`/pessoa?des_email_pda=${data.des_email_pda.toLowerCase().trim()}`);
        const { data: dataResp } = result;

        if (dataResp.response.data.length > 0) {
          const isTitular = dataResp.response.data.some((pessoa: any) => pessoa.id_situacao_pda === '1');
          const errorMessage = isTitular
            ? 'Este e-mail já está cadastrado como titular!'
            : 'Este e-mail já está cadastrado no sistema!';
          
          setError('des_email_pda', { message: errorMessage }, { shouldFocus: true });
          toast.error(errorMessage, { position: 'bottom-center' });
          return;
        }
      } catch (err) {
        toast.error('Erro ao consultar dados. Tente novamente.', { position: 'bottom-center' });
        return;
      }
    }

    const localData = {
      ...pessoaCreateData,
      ...data,
    };
    setPessoaCreateData(localData);

    // Navigate to the next step
    navigation.navigate('register-step-four');
  };

  const onError = (data: any) => {
    console.log('step three errors', JSON.stringify(data, null, 2));
  };

  return (
    <KeyboardAwareScrollView keyboardShouldPersistTaps="handled" style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ProgressBar progress={0.6} color={theme.colors.primary} style={{ height: 8, borderRadius: 4, marginBottom: 16 }} />
      <Text style={[styles.title, { color: theme.colors.primary }]}>Informe seus dados pessoais</Text>

      {/* Sexo Biológico */}
      <View style={styles.section}>
        <Text style={[styles.label, { color: theme.colors.primary }]}>Sexo Biológico</Text>
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
        <Text
          style={styles.hintText}
          onPress={() => {
            toast.info(
              'Informar o sexo biológico é essencial para garantir um atendimento de saúde mais preciso, orientar diagnósticos, tratamentos adequados e exames preventivos, além de contribuir para estudos e políticas públicas que melhoram a qualidade dos serviços e promovem o bem-estar de todos',
              { position: 'bottom-center' }
            );
          }}>
          Por que pedimos o sexo biológico?
        </Text>
      </View>

      {/* Estado Civil */}
      <View style={styles.section}>
        <Text style={[styles.label, { color: theme.colors.primary }]}>Estado Civil</Text>
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

      {/* Como gostaria de ser chamado */}
      <Controller
        control={control}
        name="des_genero_pes"
        render={({ field: { onChange, value } }) => (
          <TextInput label="Chamado por?" value={value} onChangeText={onChange} mode="outlined" style={styles.input} error={!!errors.des_genero_pes} />
        )}
      />

      {/* Número RG */}
      <Controller
        control={control}
        name="cod_rg_pda"
        render={({ field: { onChange, value } }) => (
          <>
            <TextInput
              label="Número do RG"
              inputMode="numeric"
              value={value}
              onChangeText={text => {
                const onlyNumbers = text.replace(/\D/g, '');
                onChange(onlyNumbers.slice(0, 20));
              }}
              mode="outlined"
              style={styles.input}
              error={!!errors.cod_rg_pda}
            />
            {errors.cod_rg_pda && (
              <Text style={styles.errorText}>{errors.cod_rg_pda.message}</Text>
            )}
          </>
        )}
      />

      {/* Email */}
      <Controller
        control={control}
        name="des_email_pda"
        render={({ field: { onChange, value } }) => (
          <>
            <TextInput
              label="Email"
              value={value}
              onChangeText={onChange}
              mode="outlined"
              keyboardType="email-address"
              style={styles.input}
              error={!!errors.des_email_pda}
            />
            {errors.des_email_pda && (
              <Text style={styles.errorText}>{errors.des_email_pda.message}</Text>
            )}
          </>
        )}
      />

      {/* Nome da mãe */}
      <Controller
        control={control}
        name="des_nome_mae_pda"
        render={({ field: { onChange, value } }) => (
          <TextInput label="Nome da mãe" value={value} onChangeText={onChange} mode="outlined" keyboardType="ascii-capable" style={styles.input} error={!!errors.des_nome_mae_pda} />
        )}
      />

      {/* Renda mensal */}
      <Controller
        control={control}
        name="vlr_renda_mensal_pda"
        render={({ field: { onChange, value } }) => (
          <TextInput
            label="Renda mensal"
            keyboardType='numeric'
            value={maskBrazilianCurrency(value ?? 100)}
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

      {/* Ocupação profissional */}
      <Controller
        control={control}
        name="des_ocupacao_profissional_pda"
        render={({ field: { onChange, value } }) => (
          <TextInput
            label="Ocupação profissional"
            value={value}
            onChangeText={onChange}
            mode="outlined"
            keyboardType="ascii-capable"
            style={styles.input}
            error={!!errors.des_ocupacao_profissional_pda}
          />
        )}
      />

      <View style={{ marginBottom: 40 }}>
        <Button mode="contained" onPress={handleSubmit(onSubmit, onError)}>
          Continuar
        </Button>
      </View>
    </KeyboardAwareScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  title: {
    fontFamily: 'Roboto-Bold',
    fontSize: 24,
    marginBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontFamily: 'Roboto-Bold',
    fontSize: 18,
    marginBottom: 8,
  },
  segmentedButtons: {
    marginTop: 8,
  },
  hintText: {
    fontSize: 14,
    color: 'grey',
    marginTop: 6,
  },
  input: {
    marginBottom: 20,
  },
  datePickerInput: {
    marginTop: 8,
    marginBottom: 20,
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 13,
    marginBottom: 8,
  },
  button: {
    marginTop: 16,
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
  },
});

export default RegisterStepThree;