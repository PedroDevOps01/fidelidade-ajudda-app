import {useEffect, useState} from 'react';
import {Alert, Platform, ScrollView, StyleSheet, View} from 'react-native';
import {Button, TextInput, useTheme} from 'react-native-paper';
import LoadingFull from '../../components/loading-full';
import {useAuth} from '../../context/AuthContext';
import {api} from '../../network/api';
import {useDadosUsuario} from '../../context/pessoa-dados-context';
import {Controller, useForm} from 'react-hook-form';
import {ParceiroSchema, ParceiroSchemaFormType} from '../../form-objects/parceiro-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {applyPhoneMask, logout} from '../../utils/app-utils';
import InputAlert from '../../components/input-alert';
import {CommonActions} from '@react-navigation/native';
import { reset } from '../../router/navigationRef';

interface ParceiroDataScreenProps {
  navigation: any;
}

export default function ParceiroDataScreen({navigation}: ParceiroDataScreenProps) {
  const {authData} = useAuth();
  const {colors} = useTheme();

  const {dadosUsuarioData, clearDadosUsuarioData, clearLoginDadosUsuarioData} = useDadosUsuario();

  const [loading, setLoading] = useState<boolean>(true);
  const [parceiroData, setParceiroData] = useState<ApiResponse<Parceiro>>();

  const [isInputAlertVisible, setIsInputAlertVisible] = useState<boolean>(false);
  const [hashPassword, setHashPassword] = useState<string>('');

  //console.log('dadosUsuarioData', JSON.stringify(dadosUsuarioData, null, 2));

  const {
    control,
    handleSubmit,
    watch,
    getValues,
    setValue,
    formState: {errors},
  } = useForm<ParceiroSchemaFormType>({
    resolver: zodResolver(ParceiroSchema),
  });

  useEffect(() => {
    if (parceiroData?.response.data) {
      const {data} = parceiroData?.response;7
      console.log('data', data[0]);
      setValue('des_nome_fantasia_prc', data[0].des_nome_fantasia_prc ?? '');
      setValue('des_razao_social_prc', data[0].des_razao_social_prc ?? '');
      setValue('des_endereco_web_prc', data[0].des_endereco_web_prc ?? '');
      setValue('cod_documento_prc', data[0].cod_documento_prc ?? '');
      setValue('des_endereco_prc', data[0].des_endereco_prc ?? '');
      setValue('des_bairro_prc', data[0].des_bairro_prc ?? '');
      setValue('des_complemento_prc', data[0].des_complemento_prc ?? '');
      setValue('num_telefone_prc', data[0].num_telefone_prc ?? '');
      setValue('num_celular_prc', data[0].num_celular_prc ?? '');
      setValue('dth_cadastro_prc', data[0].dth_cadastro_prc ?? '');
      setValue('des_municipio_mun', data[0].des_municipio_mun ?? '');
      setValue('id_municipio_prc', data[0].id_municipio_prc ?? '');
    }
  }, [parceiroData]);

  async function requestUserData() {
    console.log(`/parceiro?cod_documento_prc=${dadosUsuarioData.pessoaDados!.cod_cpf_pes}`);

    try {
      const response = await api.get(`/parceiro?cod_documento_prc=${dadosUsuarioData.pessoaDados!.cod_cpf_pes}`, {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `bearer ${authData.access_token}`,
        },
      });

      if (response.status == 200) {
        const {data} = response;
        setParceiroData(data);
      }
    } catch (err: any) {
      console.log('err', err);
      Alert.alert('Aviso', 'Erro ao carregar dados.', [
        {
          text: 'Ok',
          onPress: () => {
            navigation.navigate('HomeParceiro');
          },
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const onInputAlertConfirmButtonPress = async () => {
    setLoading(true);
    try {
      const request = await api.put(
        `/usuario/${dadosUsuarioData.pessoaDados!.usuario_id}`,
        {
          hash_senha_usr: hashPassword,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `bearer ${authData.access_token}`,
          },
        },
      );
      if (request.status === 200) {
        const {data} = request;
        Alert.alert('Aviso', data.message);
      }
    } catch (err: any) {
      Alert.alert('Aviso', 'Erro ao atualizar senha. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
      setIsInputAlertVisible(false);
      setHashPassword('');
    }
  };

  useEffect(() => {
    (async () => {
      requestUserData();
    })();
  }, []);

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
          logout(authData.access_token);
          reset([{name: "logged-home-screen"}], 0)
        },
      },
    ]);
    return true;
  };

  return (
    <>
      {loading ? (
        <LoadingFull />
      ) : (
        <View style={{flex: 1, backgroundColor: colors.background}}>
          <ScrollView style={styles.scrollContainer}>
            <Controller
              control={control}
              name="des_nome_fantasia_prc"
              render={({field: {onChange, onBlur, value}}) => (
                <TextInput
                  label="Nome fantasia"
                  mode="outlined"
                  error={!!errors.des_nome_fantasia_prc}
                  onBlur={onBlur}
                  onChangeText={e => {
                    onChange(e);
                  }}
                  value={value}
                  style={styles.input}
                />
              )}
            />

            <Controller
              control={control}
              name="des_razao_social_prc"
              render={({field: {onChange, onBlur, value}}) => (
                <TextInput
                  label="Razão social"
                  mode="outlined"
                  error={!!errors.des_razao_social_prc}
                  onBlur={onBlur}
                  onChangeText={e => {
                    onChange(e);
                  }}
                  value={value}
                  style={styles.input}
                />
              )}
            />

            <Controller
              control={control}
              name="des_endereco_web_prc"
              render={({field: {onChange, onBlur, value}}) => (
                <TextInput
                  label="Endereço Web"
                  mode="outlined"
                  error={!!errors.des_endereco_web_prc}
                  onBlur={onBlur}
                  onChangeText={e => {
                    onChange(e);
                  }}
                  value={value}
                  style={styles.input}
                />
              )}
            />

            <Controller
              control={control}
              name="des_endereco_prc"
              render={({field: {onChange, onBlur, value}}) => (
                <TextInput
                  label="Endereço"
                  mode="outlined"
                  error={!!errors.des_endereco_prc}
                  onBlur={onBlur}
                  onChangeText={e => {
                    onChange(e);
                  }}
                  value={value}
                  style={styles.input}
                />
              )}
            />

            <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
              <Controller
                control={control}
                name="des_bairro_prc"
                render={({field: {onChange, onBlur, value}}) => (
                  <TextInput
                    label="Bairro"
                    mode="outlined"
                    error={!!errors.des_bairro_prc}
                    onBlur={onBlur}
                    onChangeText={e => {
                      onChange(e);
                    }}
                    value={value}
                    style={[styles.input, {width: '48%'}]}
                  />
                )}
              />

              <Controller
                control={control}
                name="des_complemento_prc"
                render={({field: {onChange, onBlur, value}}) => (
                  <TextInput
                    label="Complemento"
                    mode="outlined"
                    error={!!errors.des_complemento_prc}
                    onBlur={onBlur}
                    onChangeText={e => {
                      onChange(e);
                    }}
                    value={value}
                    style={[styles.input, {width: '48%'}]}
                  />
                )}
              />
            </View>

            <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
              {/* <Controller
                control={control}
                name="des_bairro_prc"
                render={({field: {onChange, onBlur, value}}) => (
                  <TextInput
                    label="CEP"
                    mode="outlined"
                    error={!!errors.des_bairro_prc}
                    onBlur={onBlur}
                    onChangeText={e => {
                      onChange(e);
                    }}
                    value={value}
                    style={[styles.input, {width: '48%'}]}
                  />
                )}
              /> */}

              <Controller
                control={control}
                name="des_municipio_mun"
                render={({field: {onChange, onBlur, value}}) => (
                  <TextInput
                    label="Municipio"
                    mode="outlined"
                    error={!!errors.des_municipio_mun}
                    onBlur={onBlur}
                    onChangeText={e => {
                      onChange(e);
                    }}
                    value={value}
                    style={[styles.input, {width: '100%'}]}
                  />
                )}
              />
            </View>

            <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
              <Controller
                control={control}
                name="num_telefone_prc"
                render={({field: {onChange, onBlur, value}}) => (
                  <TextInput
                    label="WhatsApp"
                    mode="outlined"
                    error={!!errors.num_telefone_prc}
                    onBlur={onBlur}
                    onChangeText={e => {
                      onChange(e);
                    }}
                    value={applyPhoneMask(value)}
                    style={[styles.input, {width: '48%'}]}
                  />
                )}
              />

              <Controller
                control={control}
                name="num_celular_prc"
                render={({field: {onChange, onBlur, value}}) => (
                  <TextInput
                    label="Celular"
                    mode="outlined"
                    error={!!errors.num_celular_prc}
                    onBlur={onBlur}
                    onChangeText={e => {
                      onChange(e);
                    }}
                    value={applyPhoneMask(value)}
                    style={[styles.input, {width: '48%'}]}
                  />
                )}
              />
            </View>
          </ScrollView>

          <View style={[styles.endButtonContainer, {backgroundColor: colors.background}]}>
            <Button
              mode="outlined"
              onPress={() => {
                setIsInputAlertVisible(true);
              }}>
              Alterar senha
            </Button>

            <Button
              icon={'logout'}
              textColor={colors.error}
              mode="outlined"
              style={[styles.button, {borderColor: colors.error}]}
              onPress={handleLogout}>
              Sair
            </Button>
          </View>

          <InputAlert
            value={hashPassword}
            isVisible={isInputAlertVisible}
            onTextChange={setHashPassword}
            title={'Alterar senha'}
            dismissable
            setIsVisible={() => {
              setIsInputAlertVisible(false);
            }}
            onConfirmButtonPress={onInputAlertConfirmButtonPress}
          />
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    padding: 10,
    flex: 0.9,
    marginTop: 50
  },
  input: {
    marginBottom: 16,
  },
  endButtonContainer: {
    paddingHorizontal: 10,
  },
  button: {
    marginTop: 10,
    justifyContent: 'center',
    marginBottom: Platform.OS === 'ios' ? 20 : 10,
  },
});
