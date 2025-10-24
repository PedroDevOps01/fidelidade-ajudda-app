import { Button, Modal, Portal, Text, useTheme } from 'react-native-paper';
import { useAuth } from '../../context/AuthContext';
import { useEffect, useRef, useState } from 'react';
import { api } from '../../network/api';
import { useAccquirePlan } from '../../context/accquirePlanContext';
import { generateRequestHeader, getCurrentDate, log } from '../../utils/app-utils';
import { Alert, StyleSheet, View } from 'react-native';
import { useDadosUsuario } from '../../context/pessoa-dados-context';
import LoadingFull from '../../components/loading-full';
import PaymentPix from './payment-pix';
import PaymentCreditCard from './payment-credit-card';
import PaymentBoleto from './payment-boleto';
import { reset } from '../../router/navigationRef';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type RootStackParamList = {
  'user-contracts-payment-method': undefined;
  'logged-home-screen': undefined;
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

export default function UserContractsPaymentMethodRouter() {
  const { colors } = useTheme();
  const { authData } = useAuth();
  const { dadosUsuarioData } = useDadosUsuario();
  const { idFormaPagamento, plano, setContratoCreated, setContratoParcela, isAnual, setPlanoPagamento } = useAccquirePlan();
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMessage, setLoadingMessage] = useState<string>();
  const [alertErrorMessage, setAlertErrorMessage] = useState<string>();
  const [alertErrorMessageVisible, setAlertErrorMessageVisible] = useState(false);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const hasFetched = useRef(false);

  useEffect(() => {
    if (alertErrorMessage) {
      setAlertErrorMessageVisible(true);
    }
  }, [alertErrorMessage]);

  async function getPlanoPagamentoData() {
    try {
      const response = await api.get(
        `/plano-pagamento?id_forma_pagamento_ppg=${idFormaPagamento}&is_ativo_ppg=1`,
        generateRequestHeader(authData.access_token)
      );

      const { data } = response;
      log('getPlanoPagamentoData response', data);

      if (!plano) {
        setAlertErrorMessage('Nenhum plano selecionado!');
        setLoading(false);
        return;
      }

      if (!data?.response?.data?.length) {
        setAlertErrorMessage('Nenhum plano de pagamento encontrado para a forma de pagamento selecionada!');
        setLoading(false);
        return;
      }

      const planoCorreto = data.response.data.find(
        (p: any) => plano && p.id_plano_ppg === plano.id_plano_pla
      );
      if (!planoCorreto) {
        setAlertErrorMessage('Plano de pagamento não encontrado para este plano!');
        console.log('Plano de pagamento não encontrado para este plano!');
        setLoading(false);
        return;
      }

      setPlanoPagamento(planoCorreto); // Save selected payment plan to context
      createContrato(planoCorreto);
      setLoadingMessage('Obtendo informações');
    } catch (err: any) {
      console.log('getPlanoPagamentoData error', err.response?.data || err);
      setAlertErrorMessage('Erro ao carregar dados do plano de pagamento. Tente novamente mais tarde.');
      setLoading(false);
    }
  }

  async function createContrato(planoPagamento: PlanoPagamento) {
    console.log('2 - createContrato');
    try {
      const vlrTotalAnual = isAnual && planoPagamento 
        ? planoPagamento.num_parcelas_ppg * planoPagamento.vlr_parcela_ppg 
        : plano?.vlr_adesao_pla || 0;

      let dataToSent = {
        id_pessoa_ctt: dadosUsuarioData.pessoaDados?.id_pessoa_pes,
        vlr_inicial_ctt: vlrTotalAnual,
        vlr_adesao_ctt: vlrTotalAnual,
        id_plano_pagamento_ctt: planoPagamento?.id_plano_pagamento_ppg,
        id_situacao_ctt: 15,
        id_origem_ctt: 12,
        dta_dia_cpc: Number(getCurrentDate().split('-')[2]),
        vlr_parcela_cpc: planoPagamento?.vlr_parcela_ppg,
        is_anual: isAnual ? 1 : 0,
        is_mobile: true,
      };

      const response = await api.post(`/contrato`, dataToSent, generateRequestHeader(authData.access_token));
      const { data } = response;

      log('criar contrato', data);

      if (data.data) {
        setLoadingMessage('Criando seu contrato');
        setContratoCreated(data.data);
        getContratoParcela(data.data);
      } else {
        setAlertErrorMessage('Falha ao criar contrato. Dados inválidos retornados.');
        setLoading(false);
      }
    } catch (err: any) {
      console.log('createContrato error', err.response?.data || err);
      setAlertErrorMessage(err.response?.data?.message || 'Erro ao criar contrato. Tente novamente mais tarde.');
      setLoading(false);
    }
  }

  async function getContratoParcela(contratoCreated: any) {
    console.log('3 - getContratoParcela');
    if (!contratoCreated?.id_contrato_ctt) {
      setAlertErrorMessage('ID do contrato inválido.');
      setLoading(false);
      return;
    }

    const maxRetries = 3;
    let retries = 0;
    while (retries < maxRetries) {
      try {
        const response = await api.get(`/parcela/${contratoCreated.id_contrato_ctt}`, generateRequestHeader(authData.access_token));
        const { data } = response;
        log('getContratoParcela response', JSON.stringify(data, null, 2));

        if (response.status === 200 && data?.data?.data?.length > 0) {
          setContratoParcela(data.data.data[0]);
          setLoadingMessage('Obtendo parcela');
          setLoading(false);
          return;
        } else {
          console.log(`getContratoParcela: No parcels found, retry ${retries + 1}/${maxRetries}`);
          retries++;
          if (retries < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      } catch (err: any) {
        console.log('getContratoParcela error', err.response?.data || err);
        retries++;
        if (retries < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    setAlertErrorMessage('Nenhuma parcela encontrada para o contrato após várias tentativas. Tente novamente mais tarde.');
    setLoading(false);
  }

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;

      (async () => {
        if (idFormaPagamento === 10003) {
          Alert.alert(
            'Confirmação de Pagamento',
            'O pagamento via boleto pode levar até 1 a 3 dias úteis até a compensação. Deseja continuar?',
            [
              {
                text: 'Cancelar',
                style: 'cancel',
                onPress: () => {
                  reset([{ name: 'user-contracts-payment-method' }], 0);
                },
              },
              {
                text: 'Continuar',
                onPress: async () => {
                  setLoading(true);
                  await getPlanoPagamentoData();
                },
              },
            ],
            { cancelable: false }
          );
        } else {
          setLoading(true);
          await getPlanoPagamentoData();
        }
      })();
    }
  }, []);

  return (
    <>
      <Portal>
        <Modal visible={alertErrorMessageVisible} onDismiss={() => setAlertErrorMessageVisible(false)} contentContainerStyle={styles.containerModal}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Atenção</Text>
            <Text style={styles.modalMessage}>{alertErrorMessage}</Text>
            <Button
              mode="contained"
              onPress={() => {
                setAlertErrorMessageVisible(false);
                reset([{ name: 'logged-home-screen' }], 0);
              }}
              style={styles.closeButton}
            >
              Fechar
            </Button>
          </View>
        </Modal>
      </Portal>

      {loading ? (
        <LoadingFull title={loadingMessage} />
      ) : (
        <>
          {idFormaPagamento === 10001 ? (
            <PaymentPix />
          ) : idFormaPagamento === 10002 ? (
            <PaymentCreditCard />
          ) : idFormaPagamento === 10003 ? (
            <PaymentBoleto />
          ) : (
            <View style={styles.errorContainer}>
              <Text style={[styles.errorText, { color: colors.error }]}>Forma de pagamento inválida</Text>
            </View>
          )}
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  containerModal: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  modalMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
  closeButton: {
    width: '100%',
    borderRadius: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    fontWeight: '500',
  },
});