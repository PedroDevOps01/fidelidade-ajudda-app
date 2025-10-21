import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { Button, ProgressBar, RadioButton, SegmentedButtons, TextInput, useTheme } from 'react-native-paper';
import { DatePickerInput } from 'react-native-paper-dates';
import { usePessoaCreate } from '../../context/create-pessoa-context';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { stepThreeSchema } from '../../form-objects/step-three-form';
import dayjs from 'dayjs';
import { z } from 'zod';
import { api } from '../../network/api';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { maskBrazilianCurrency } from '../../utils/app-utils';
require('dayjs/locale/pt-br');

const RegisterStepThree = ({ route, navigation }: { route: any; navigation: any }) => {
  const theme = useTheme();
  const { pessoaCreateData, setPessoaCreateData } = usePessoaCreate();

  type StepThreeSchemaFormType = z.infer<typeof stepThreeSchema>;

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<StepThreeSchemaFormType>({
    resolver: zodResolver(stepThreeSchema),
    defaultValues: {
      cod_rg_pda: pessoaCreateData.cod_rg_pda ?? '',
      des_email_pda: pessoaCreateData.des_email_pda ?? '',
      des_estado_civil_pda: pessoaCreateData.des_estado_civil_pda ?? '',
      des_genero_pes: pessoaCreateData.des_genero_pes ?? '',
      des_sexo_biologico_pes: pessoaCreateData.des_sexo_biologico_pes ?? '',
      dta_emissao_rg_pda: '2020-01-01', // valor mocado fixo
      id_situacao_pda: pessoaCreateData.id_situacao_pda ?? '',
      vlr_renda_mensal_pda: pessoaCreateData.vlr_renda_mensal_pda ?? 100,
      des_nome_mae_pda: pessoaCreateData.des_nome_mae_pda ?? '',
      des_ocupacao_profissional_pda: pessoaCreateData.des_ocupacao_profissional_pda ?? '',
    },
  });

  const onSubmit = (data: StepThreeSchemaFormType) => {
    console.log('StepThreeSchemaFormType', data);

    api
      .get(`/pessoa?des_email_pda=${data.des_email_pda.toLowerCase().trim()}`)
      .then(result => {
        const { data: dataResp } = result;

        if (dataResp.response.data.length > 0) {
          setError('des_email_pda', { message: 'Email já cadastrado!' }, { shouldFocus: true });
          Alert.alert('Aviso', 'Já existe um usuário com este email cadastrado!');
          return;
        }

        const localData = {
          ...pessoaCreateData,
          ...data,
        };
        setPessoaCreateData(localData);

        // Navigate to the next step or perform other actions
        navigation.navigate('register-step-four');
      })
      .catch(err => {
        Alert.alert('Aviso', 'Erro ao consultar dados. Tente novamente mais tarde.');
      });
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
            Alert.alert(
              'Aviso',
              'Informar o sexo biológico é essencial para garantir um atendimento de saúde mais preciso, orientar diagnósticos, tratamentos adequados e exames preventivos, além de contribuir para estudos e políticas públicas que melhoram a qualidade dos serviços e promovem o bem-estar de todos',
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

      {/* Situação */}
      {/* <View style={styles.section}>
        <Text style={[styles.label, { color: theme.colors.secondary }]}>Situação</Text>
        <Controller
          control={control}
          name="id_situacao_pda"
          render={({ field: { onChange, value } }) => (
            <SegmentedButtons
              value={value}
              onValueChange={onChange}
              buttons={[
                { value: '1', label: 'Titular' },
                { value: '2', label: 'Dependente' },
              ]}
              style={styles.segmentedButtons}
            />
          )}
        />
      </View> */}

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
          <TextInput inputMode="numeric" label="Número do RG" value={value} onChangeText={onChange} mode="outlined" style={styles.input} error={!!errors.cod_rg_pda} />
        )}
      />

      {/* Data de Emissão RG
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
            style={styles.datePickerInput}
            mode="outlined"
            hasError={!!errors.dta_emissao_rg_pda}
          />
        )}
      /> */}

      {/* Email */}
      <Controller
        control={control}
        name="des_email_pda"
        render={({ field: { onChange, value } }) => (
          <TextInput label="Email" value={value} onChangeText={onChange} mode="outlined" keyboardType="email-address" style={styles.input} error={!!errors.des_email_pda} />
        )}
      />

      {/* mae */}
      <Controller
        control={control}
        name="des_nome_mae_pda"
        render={({ field: { onChange, value } }) => (
          <TextInput label="Nome da mãe" value={value} onChangeText={onChange} mode="outlined" keyboardType="ascii-capable" style={styles.input} error={!!errors.des_nome_mae_pda} />
        )}
      />

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

      {/* mae */}
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
  button: {
    marginTop: 16,
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
  },
});

export default RegisterStepThree;
