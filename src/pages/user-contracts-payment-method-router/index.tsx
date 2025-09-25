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
import { reset } from '../../router/navigationRef';
import PaymentCreditCard from './payment-credit-card';

export default function UserContractsPaymentMethodRouter() {
  const { colors } = useTheme();
  const { authData } = useAuth();
  const { dadosUsuarioData } = useDadosUsuario();
  const { idFormaPagamento } = useAccquirePlan();
  const { plano, setContratoCreated, setContratoParcela } = useAccquirePlan();
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMessage, setLoadingMessage] = useState<string>();
  const [alertErrorMessage, setAlertErrorMessage] = useState<string>();
  const [alertErrorMessageVisible, setAlertErrorMessageVisible] = useState(false);

  const hasFetched = useRef(false);


  useEffect(() => {
    if (alertErrorMessage) {
      setAlertErrorMessageVisible(true);
    }
  }, [alertErrorMessage]);
  console.log('plano detalhado', plano);
  // 1 - Obter os dados do plano OK
  async function getPlanoPagamentoData() {
  try {
    const response = await api.get(
      `/plano-pagamento?id_forma_pagamento_ppg=${idFormaPagamento}&is_ativo_ppg=1`,
      generateRequestHeader(authData.access_token)
    );

    const { data } = response;
    console.log('1 - getPlanoPagamentoData', data.response.data);
if (!plano) {
  setAlertErrorMessage('Nenhum plano selecionado!');
  setLoading(false);
  return;
}

    if (data.response.data.length > 0) {
      // Filtra pelo id do plano correto
const planoCorreto = data.response.data.find(
  (p: any) => plano && p.id_plano_ppg === plano.id_plano_pla
);

      if (!planoCorreto) {
        setAlertErrorMessage('Plano de pagamento não encontrado para este plano!');
        console.log('Plano de pagamento não encontrado para este plano!');
        return;
      }

      createContrato(planoCorreto);
      setLoadingMessage('Obtendo informações');
    }
  } catch (err) {
    console.log('1 - err', err);
    Alert.alert('Erro', 'Erro ao carregar dados. Tente novamente mais tarde');
    setAlertErrorMessage('erro 1');
  }
}


  // 2 - Criar o contrato
  async function createContrato(planoPagamento: PlanoPagamento) {
    console.log('2 - createContrato');

    try {
      let dataToSent = {
        id_pessoa_ctt: dadosUsuarioData.pessoaDados?.id_pessoa_pes,
        vlr_inicial_ctt: planoPagamento?.vlr_parcela_ppg,
        vlr_adesao_ctt: plano?.vlr_adesao_pla,
        id_plano_pagamento_ctt: planoPagamento?.id_plano_pagamento_ppg,
        id_situacao_ctt: 15,
        id_origem_ctt: 12,
        dta_dia_cpc: Number(getCurrentDate().split('-')[2]),
        vlr_parcela_cpc: planoPagamento?.vlr_parcela_ppg,
        is_mobile: true
      };

      const response = await api.post(`/contrato`, dataToSent, generateRequestHeader(authData.access_token));

      const { data } = response;

      log('ciar contrato', data);

      if (data.data) {
        setLoadingMessage('Criando seu contrato');
        setContratoCreated(data.data);
        getContratoPacela(data.data);
      }
    } catch (err: any) {
      console.log('2 - err', err.response.data);

      setAlertErrorMessage(`${err.response.data.message}`);

      return;
    }
  }

  // 3 - Pegar a primeira parcela
  async function getContratoPacela(contratoCreated: PessoaContratoNew) {
    console.log('3 - getContratoPacela');
    if (contratoCreated) {
      try {
        const response = await api.get(`/parcela/${contratoCreated?.id_contrato_ctt}`, generateRequestHeader(authData.access_token));

        const { data } = response;
        if (data.data.data.length > 0) {
          setContratoParcela(data.data.data[0]);
          setLoadingMessage('Obtendo parcela');
        }
      } catch (err) {
        console.log('3 - err', err);
        Alert.alert('Erro', 'Erro ao carregar dados. Tente novamente mais tarde');
        setAlertErrorMessage('Erro ao realizar pagamento! código -  3');
      } finally {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      (async () => {
        await getPlanoPagamentoData();
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
              style={styles.closeButton}>
              Fechar
            </Button>
          </View>
        </Modal>
      </Portal>

      {loading ? (
        <LoadingFull title={loadingMessage} />
      ) : (
        <>
          {idFormaPagamento == 10001 ? (
            <PaymentPix />
          ) : (
            <>
              <PaymentCreditCard />
            </>
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
    elevation: 5, // Sombra para destacar
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
});
