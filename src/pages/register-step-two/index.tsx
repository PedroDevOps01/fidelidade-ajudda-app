import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { Button, ProgressBar, TextInput, Checkbox, useTheme } from 'react-native-paper';
import { usePessoaCreate } from '../../context/create-pessoa-context';
import { api } from '../../network/api';
import axios from 'axios';
import { z } from 'zod';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
require('dayjs/locale/pt-br');

// Modified schema to handle conditional validation
const dynamicStepTwoSchema = (noCep: boolean) =>
  z.object({
    cod_cep_pda: noCep ? z.string().optional() : z.string().min(8, 'CEP deve ter 8 dígitos').max(8, 'CEP deve ter 8 dígitos'),
    des_bairro_pda: z.string().min(1, 'Bairro é obrigatório'),
    des_endereco_completo_pda: z.string().min(1, 'Endereço completo é obrigatório'), // Made always required, as it's derived
    des_endereco_pda: z.string().min(1, 'Endereço é obrigatório'),
    id_municipio_pda: noCep ? z.number().optional() : z.number().min(1, 'Município é obrigatório'),
    num_endereco_pda: z.string().min(1, 'Número é obrigatório'),
    des_ponto_referencia_pda: z.string().min(1, 'Ponto de referência é obrigatório'),
  });

type StepTwoSchemaFormType = z.infer<ReturnType<typeof dynamicStepTwoSchema>>;

const RegisterStepTwo = ({ route, navigation }: { route: any; navigation: any }) => {
  const theme = useTheme();
  const { pessoaCreateData, setPessoaCreateData } = usePessoaCreate();
  const [noCep, setNoCep] = useState(false); // State for "Não sei meu CEP" checkbox

  const {
    control,
    handleSubmit,
    getValues,
    setValue,
    watch,
    formState: { errors },
  } = useForm<StepTwoSchemaFormType>({
    resolver: zodResolver(dynamicStepTwoSchema(noCep)),
    defaultValues: {
      cod_cep_pda: pessoaCreateData.cod_cep_pda ?? '',
      des_bairro_pda: pessoaCreateData.des_bairro_pda ?? '',
      des_endereco_completo_pda: pessoaCreateData.des_endereco_completo_pda ?? '',
      des_endereco_pda: pessoaCreateData.des_endereco_pda ?? '',
      id_municipio_pda: pessoaCreateData.id_municipio_pda ?? 0,
      num_endereco_pda: pessoaCreateData.num_endereco_pda ?? '',
      des_ponto_referencia_pda: pessoaCreateData.des_ponto_referencia_pda == '' ? 'Não possui' : pessoaCreateData.des_ponto_referencia_pda,
    },
  });

  const codCepPda = watch('cod_cep_pda');

  const [loading, setLoading] = useState(false);
  const [addressData, setAddressData] = useState<AddressResponse | null>(null);

  const getAddressByCep = async (cep: string) => {
    setLoading(true);
    try {
      const response = await axios.get(`https://viacep.com.br/ws/${cep}/json/`);
      console.log('getAddressByCep response', response);
      const { data } = response;
      console.log('getAddressByCep data', data);
      setAddressData(data);
    } catch (err: any) {
      Alert.alert('Aviso', 'Erro, CEP não encontrado. Tente mais tarde.');
      console.log('getAddressByCep', err);
    } finally {
      setLoading(false);
    }
  };

  const getMunicipioId = async (municipio: string) => {
    setLoading(true);
    try {
      const response = await api.get(`/municipio?des_municipio_mun=${municipio}`);
      const { data } = response;
      const municpioId = data.response.data.filter((e: any) => e.des_municipio_mun === municipio)[0].id_municipio_mun;
      setValue('id_municipio_pda', municpioId);
      console.log('municpioId', municpioId);
    } catch (err: any) {
      Alert.alert('Aviso', 'Erro, município não encontrado. Tente mais tarde.');
      console.log('getMunicipioId', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (addressData && !noCep) {
      console.log('addressData', addressData);
      console.log('addressData', noCep);

      // Preencher os campos do formulário com os dados retornados
      setValue('des_endereco_pda', addressData!.logradouro);
      setValue('des_bairro_pda', addressData!.bairro);
      setValue('des_endereco_completo_pda', addressData!.logradouro ? `${addressData!.logradouro} ${getValues().num_endereco_pda}`.trim().substring(0, 100) : ''); // Fixed to trim and 100 chars
      getMunicipioId(addressData?.localidade!);
    }
  }, [addressData, noCep]);

  useEffect(() => {
    if (noCep) {
      setValue('id_municipio_pda', 0); // Clear municipio ID
      // setValue('des_endereco_completo_pda', ''); // Already commented out
    } else if (codCepPda.length === 8) {
      getAddressByCep(codCepPda);
    }
  }, [codCepPda, noCep]);

  // New effect: Dynamically update des_endereco_completo_pda on changes to des_endereco_pda or num_endereco_pda
  useEffect(() => {
    const endereco = getValues('des_endereco_pda');
    const num = getValues('num_endereco_pda');
    if (endereco && num) {
      const completo = `${endereco} ${num}`.trim().substring(0, 100);
      setValue('des_endereco_completo_pda', completo, { shouldValidate: true });
    }
  }, [watch('des_endereco_pda'), watch('num_endereco_pda')]);

  // Update form validation when noCep changes
  useEffect(() => {
    // Trigger re-validation for affected fields
    setValue('cod_cep_pda', getValues('cod_cep_pda'), { shouldValidate: true });
    setValue('id_municipio_pda', getValues('id_municipio_pda'), { shouldValidate: true });
    setValue('des_endereco_completo_pda', getValues('des_endereco_completo_pda'), { shouldValidate: true });
  }, [noCep]);

  const onSubmit = (data: StepTwoSchemaFormType) => {
    const enderecoCompleto = `${data.num_endereco_pda}`.trim().substring(0, 100);
    console.log('enderecoCompleto', enderecoCompleto);
    const localData = {
      ...pessoaCreateData,
      ...data,
      des_endereco_completo_pda: enderecoCompleto, // Always set, no conditional
    };
    console.log('StepTwoSchemaFormType', localData);  
    setPessoaCreateData(localData);
    navigation.navigate('register-step-three');
  };

  const onError = (err: any) => {
    console.log('step two errors', err);
  };

  return (
    <KeyboardAwareScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ProgressBar progress={0.4} color={theme.colors.primary} style={{ height: 8, borderRadius: 4, marginBottom: 16 }} />
      <Text style={[styles.title, { color: theme.colors.primary }]}>Informe os dados sobre o seu endereço</Text>

      <View>
        <View style={styles.section}>
          <View style={styles.checkboxContainer}>
            <Checkbox.Android
              status={noCep ? 'checked' : 'unchecked'}
              onPress={() => setNoCep(!noCep)}
              color={theme.colors.primary}
              uncheckedColor={theme.colors.onSurface}
            />
            <Text style={styles.checkboxLabel}>Não sei meu CEP</Text>
          </View>

          <Controller
            control={control}
            name="cod_cep_pda"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="CEP"
                disabled={loading}
                mode="outlined"
                error={!!errors.cod_cep_pda}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                keyboardType="number-pad"
                maxLength={8}
                style={styles.input}
              />
            )}
          />

          <Controller
            control={control}
            name="des_endereco_pda"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Endereço"
                disabled={loading}
                mode="outlined"
                error={!!errors.des_endereco_pda}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                style={styles.input}
              />
            )}
          />

          <Controller
            control={control}
            name="des_ponto_referencia_pda"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Ponto de referência"
                disabled={loading}
                mode="outlined"
                error={!!errors.des_ponto_referencia_pda}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                style={styles.input}
              />
            )}
          />
        </View>

        <View style={styles.rowStyle}>
          <Controller
            control={control}
            name="des_bairro_pda"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Bairro"
                numberOfLines={1}
                disabled={loading}
                mode="outlined"
                error={!!errors.des_bairro_pda}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                style={[styles.input, styles.halfWidth]}
              />
            )}
          />

          <Controller
            control={control}
            name="num_endereco_pda"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Número"
                disabled={loading}
                mode="outlined"
                error={!!errors.num_endereco_pda}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                style={[styles.input, styles.halfWidth]}
              />
            )}
          />
        </View>
        <Button mode="contained" onPress={handleSubmit(onSubmit, onError)}>
          Continuar
        </Button>
      </View>
    </KeyboardAwareScrollView>
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
  section: {},
  rowStyle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    alignItems: 'flex-start', // adiciona isso
  },
  form: {
    flex: 1,
  },
  input: {
    marginBottom: 16,
    height: 50, // altura padrão recomendada pela react-native-paper
  },
  halfWidth: {
    width: '48%',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#333',
  },
});

export default RegisterStepTwo;