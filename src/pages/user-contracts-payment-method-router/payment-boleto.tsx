import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View, Clipboard, Linking } from 'react-native';
import { Button, Card, Text, useTheme } from 'react-native-paper';
import { useAuth } from '../../context/AuthContext';
import { useAccquirePlan } from '../../context/accquirePlanContext';
import { useDadosUsuario } from '../../context/pessoa-dados-context';
import { api } from '../../network/api';
import { generateRequestHeader, maskBrazilianCurrency } from '../../utils/app-utils';
import { toast } from 'sonner-native';
import { navigate, goBack } from '../../router/navigationRef';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import ModalContainer from '../../components/modal';
import { ModalContent } from '../../components/modal-content';
import LoadingFull from '../../components/loading-full';

interface BoletoResponse {
  codigoPagamento: string;
  boleto_url: string;
  boleto_barcode: string;
  boleto_pdf: string;
  vlr_parcela_cpp: number;
  dta_pagamento_cpp: string;
  boleto_expiration_date: string;
  instructions: string;
  interest: {
    days: number;
    type: string;
    amount: number;
  };
  fine: {
    days: number;
    type: string;
    amount: number;
  };
  customer: {
    name: string;
    email: string;
    document: string;
    document_type: string;
    address: {
      line_1: string;
      line_2: string;
      zip_code: string;
      city: string;
      state: string;
      country: string;
    };
    phones: {
      mobile_phone: {
        country_code: string;
        number: string;
        area_code: string;
      };
    };
  };
  items: {
    description: string;
    amount: number;
    quantity: number;
  }[];
  charges: {
    payment_method: string;
    status: string;
    last_transaction: {
      instructions: string;
      due_at: string;
      interest: {
        days: number;
        type: string;
        amount: number;
      };
      fine: {
        days: number;
        type: string;
        amount: number;
      };
    };
  }[];
  split_values: {
    vlr_diretor_pla: number;
    vlr_gerente_pla: number;
    vlr_vendedor_pla: number;
    vlr_sistema: number;
  };
}

export function formatDateToDDMMYYYY(input: string | Date): string {
  let dateString: string;
  if (input instanceof Date) {
    const year = input.getFullYear();
    const month = String(input.getMonth() + 1).padStart(2, '0');
    const day = String(input.getDate()).padStart(2, '0');
    dateString = `${year}-${month}-${day}`;
  } else {
    dateString = input;
  }
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
}

export default function PaymentBoleto() {
  const { colors } = useTheme();
  const { authData } = useAuth();
  const { idFormaPagamento, contratoParcela, plano, contratoCreated } = useAccquirePlan();
  const { dadosUsuarioData, setDadosUsuarioData } = useDadosUsuario();
  const [boletoResponse, setBoletoResponse] = useState<BoletoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string>('pending');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const alreadyRequested = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    console.log('PaymentBoleto context values:', {
      idFormaPagamento,
      contratoParcela,
      plano,
      contratoCreated,
    });
  }, [idFormaPagamento, contratoParcela, plano, contratoCreated]);

  async function checkPaid(cod_pagamento: string) {
    try {
      const response = await api.get(
        `/integracaoPagarMe/verificarPagamento?cod_pedido_pgm=${cod_pagamento}`,
        generateRequestHeader(authData.access_token)
      );
      console.log('checkPaid response:', response.data);
      if (response.status === 200) {
        const status = response.data.response[0]?.des_status_pgm;
        setPaymentStatus(status);
        if (status === 'paid') {
          await getSignatureDataAfterPaid();
        } else if (status === 'failed' || status === 'expired') {
          toast.error(status === 'failed' ? 'Erro ao realizar pagamento. Tente novamente.' : 'O boleto expirou. Gere um novo pagamento.', {
            position: 'bottom-center',
          });
          navigate('user-contracts-payment-failed');
        }
      } else {
        toast.error('Erro ao verificar pagamento. Status: ' + response.status, { position: 'bottom-center' });
        setPaymentStatus('error');
      }
    } catch (error: any) {
      console.error('checkPaid error:', error.response?.data || error);
      toast.error('Erro ao verificar pagamento. Tente novamente.', { position: 'bottom-center' });
      setPaymentStatus('error');
    }
  }

  async function getSignatureDataAfterPaid() {
    try {
      const response = await api.get(
        `/pessoa/${dadosUsuarioData.pessoaDados?.id_pessoa_pes}/signature`,
        generateRequestHeader(authData.access_token)
      );
      if (response.status === 200) {
        setDadosUsuarioData({
          ...dadosUsuarioData,
          pessoaAssinatura: response.data.response,
        });
        toast.success('Dados atualizados com sucesso', { position: 'bottom-center' });
        navigate('user-contracts-payment-successfull');
      }
    } catch (err) {
      console.error('getSignatureDataAfterPaid error:', err);
    }
  }

  async function requestPayment() {
    if (!idFormaPagamento || !contratoParcela || !plano) {
      setErrorMessage(
        `Dados de pagamento inválidos. Faltando: ${[
          !idFormaPagamento && 'Forma de Pagamento',
          !contratoParcela && 'Parcela do Contrato',
          !plano && 'Plano',
        ]
          .filter(Boolean)
          .join(', ')}`
      );
      toast.error('Dados de pagamento inválidos.', { position: 'bottom-center' });
      setLoading(false);
      return;
    }

    if (!authData?.access_token) {
      setErrorMessage('Token de autenticação inválido. Faça login novamente.');
      toast.error('Token de autenticação inválido.', { position: 'bottom-center' });
      setLoading(false);
      return;
    }

    setLoading(true);
    const { vlr_adesao_pla = 0 } = plano;

    const baseData = {
      id_origem_pagamento_cpp: 7,
      cod_origem_pagamento_cpp: contratoParcela.id_contrato_parcela_config_cpc,
      num_cod_externo_cpp: 0,
      vlr_adesao_pla,
      dta_pagamento_cpp: formatDateToDDMMYYYY(new Date()).split('/').reverse().join('-'),
      id_origem_cpp: 7,
      id_forma_pagamento_cpp: idFormaPagamento,
    };

    try {
      console.log('requestPayment sending:', baseData);
      const response = await Promise.race([
        api.post(`/pagamento-parcela`, baseData, generateRequestHeader(authData.access_token)),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Request timeout')), 10000)), // 10s timeout
      ]);
      console.log('requestPayment response:', response.data);
      if (response.status === 200) {
        const boleto = response.data.response.boleto;
        setBoletoResponse({
          codigoPagamento: boleto.codigoPagamento,
          boleto_url: boleto.boleto_url,
          boleto_barcode: boleto.boleto_barcode,
          boleto_pdf: boleto.boleto_pdf,
          vlr_parcela_cpp: plano.vlr_adesao_pla,
          dta_pagamento_cpp: boleto.dta_pagamento_cpp,
          boleto_expiration_date: boleto.boleto_expiration_date,
          customer: boleto.customer,
          items: boleto.items,
          charges: boleto.charges,
          split_values: boleto.split_values,
          instructions: boleto.instructions,
          interest: boleto.interest,
          fine: boleto.fine,
        });
      } else {
        setErrorMessage('Erro ao iniciar pagamento. Status: ' + response.status);
        toast.error('Erro ao iniciar pagamento. Tente novamente.', { position: 'bottom-center' });
      }
    } catch (error: any) {
      console.error('requestPayment error:', error.response?.data || error.message);
      setErrorMessage('Erro ao iniciar pagamento: ' + (error.response?.data?.message || error.message));
      toast.error('Erro ao iniciar pagamento. Tente novamente.', { position: 'bottom-center' });
    } finally {
      setLoading(false);
    }
  }

  const handleBackButtonPress = async () => {
    try {
      await api.delete(`/contrato/${contratoCreated?.id_contrato_ctt}`, generateRequestHeader(authData.access_token));
      goBack();
    } catch (error) {
      console.error('handleBackButtonPress error:', error);
      toast.error('Erro ao cancelar contrato. Tente novamente.', { position: 'bottom-center' });
    }
  };

  useEffect(() => {
    if (!authData?.access_token) {
      setErrorMessage('Token de autenticação inválido. Faça login novamente.');
      setLoading(false);
      return;
    }
    if (contratoParcela && !alreadyRequested.current) {
      alreadyRequested.current = true;
      requestPayment();
    } else if (!contratoParcela) {
      setErrorMessage('Parcela do contrato não encontrada. Tente novamente.');
      setLoading(false);
    }
  }, [contratoParcela, authData]);

  useEffect(() => {
    if (boletoResponse?.codigoPagamento && boletoResponse.boleto_expiration_date) {
      intervalRef.current = setInterval(() => {
        checkPaid(boletoResponse.codigoPagamento);
      }, 20000);
      const expiresAt = new Date(boletoResponse.boleto_expiration_date).getTime();
      if (isNaN(expiresAt)) {
        console.error('Invalid boleto_expiration_date:', boletoResponse.boleto_expiration_date);
        setPaymentStatus('error');
        setErrorMessage('Data de expiração do boleto inválida.');
        toast.error('Data de expiração do boleto inválida.', { position: 'bottom-center' });
        navigate('user-contracts-payment-failed');
        if (intervalRef.current) clearInterval(intervalRef.current);
        return;
      }
      const timeout = setTimeout(() => {
        if (paymentStatus !== 'paid') {
          setPaymentStatus('expired');
          setErrorMessage('O boleto expirou. Gere um novo pagamento.');
          toast.error('O boleto expirou. Gere um novo pagamento.', { position: 'bottom-center' });
          navigate('user-contracts-payment-failed');
        }
        if (intervalRef.current) clearInterval(intervalRef.current);
      }, expiresAt - Date.now());
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        clearTimeout(timeout);
      };
    }
  }, [boletoResponse?.codigoPagamento, boletoResponse?.boleto_expiration_date, paymentStatus]);

  const copyToClipboard = () => {
    if (boletoResponse?.boleto_barcode) {
      Clipboard.setString(boletoResponse.boleto_barcode);
      setCopied(true);
      toast.success('Código de barras copiado com sucesso!', { position: 'bottom-center' });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Safe date formatting
  const formatDateSafely = (dateString?: string): string => {
    if (!dateString || isNaN(new Date(dateString).getTime())) {
      return 'N/A';
    }
    return formatDateToDDMMYYYY(dateString);
  };

  if (loading) {
    return <LoadingFull />;
  }

  if (errorMessage) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>{errorMessage}</Text>
        <Button
          mode="contained"
          onPress={() => {
            setErrorMessage('');
            setLoading(true);
            alreadyRequested.current = false; // Allow retry
            requestPayment();
          }}
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
        >
          Tentar Novamente
        </Button>
        {/* <Button
          mode="outlined"
          disabled={loading}
          onPress={() => setIsModalVisible(true)}
          labelStyle={{ fontSize: 16 }}
          style={styles.backButton}
          contentStyle={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}
        >
          <MaterialCommunityIcons name="arrow-left" size={18} color={colors.primary} />
          <Text style={{ color: colors.primary }}> Voltar</Text>
        </Button> */}
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}>
      <ModalContainer handleVisible={() => setIsModalVisible(false)} visible={isModalVisible}>
        <ModalContent
          isBackButtonVisible={true}
          backButtonText="Não"
          confirmButtonText="Sim"
          confirmButtonAction={handleBackButtonPress}
          title="Aviso!"
          description="Deseja cancelar o pagamento?"
          backButtonAction={() => setIsModalVisible(false)}
        />
      </ModalContainer>

      <Card mode="elevated" style={[styles.card, { backgroundColor: colors.surface }]}>
        <Card.Title
          title="Pagamento via Boleto"
          subtitle="Realize seu pagamento o quanto antes."
          titleStyle={[styles.title, { color: colors.primary }]}
          subtitleStyle={[styles.subtitle, { color: colors.onSurfaceVariant }]}
          left={props => <MaterialCommunityIcons {...props} name="barcode" size={28} color={colors.primary} />}
          titleContainerStyle={styles.titleContainer}
        />
        <Card.Content style={styles.content}>
          

          <View style={styles.section}>
            {/* <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.onSurface }]}>
              Detalhes do Boleto
            </Text>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="cash" size={20} color={colors.onSurfaceVariant} />
              <Text style={[styles.infoText, { color: colors.onSurface }]}>Valor: {maskBrazilianCurrency(boletoResponse?.vlr_parcela_cpp ?? 0)}</Text>
            </View>
            */}
            {/* {boletoResponse?.items && boletoResponse.items.length > 0 && (
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="information-outline" size={20} color={colors.onSurfaceVariant} />
                <Text style={[styles.infoText, { color: colors.onSurface }]}>Descrição: {boletoResponse.items[0].description}</Text>
              </View>
            )}
            {boletoResponse?.instructions && (
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="information" size={20} color={colors.onSurfaceVariant} />
                <Text style={[styles.infoText, { color: colors.onSurface }]}>Instruções: {boletoResponse.instructions}</Text>
              </View>
            )}
            {boletoResponse?.interest && (
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="percent" size={20} color={colors.onSurfaceVariant} />
                <Text style={[styles.infoText, { color: colors.onSurface }]}>
                  Juros após vencimento: {boletoResponse.interest.amount}% após {boletoResponse.interest.days} dia(s)
                </Text>
              </View>
            )}
            {boletoResponse?.fine && (
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="alert" size={20} color={colors.onSurfaceVariant} />
                <Text style={[styles.infoText, { color: colors.onSurface }]}>
                  Multa após vencimento: {boletoResponse.fine.amount}% após {boletoResponse.fine.days} dia(s)
                </Text>
              </View>
            )} */}
          
            <Button
              mode="contained-tonal"
              icon="content-copy"
              onPress={copyToClipboard}
              style={[styles.copyButton, { backgroundColor: colors.primaryContainer }]}
              labelStyle={[styles.buttonLabel, { color: colors.onPrimaryContainer }]}
            >
              Copiar Código de Barras
            </Button>
            {copied && <Text style={[styles.copiedText, { color: colors.primary }]}>Código copiado!</Text>}
            <View style={styles.buttonRow}>
              <Button
                mode="contained"
                icon="download"
                onPress={() => boletoResponse?.boleto_url && Linking.openURL(boletoResponse.boleto_url)}
                style={[styles.actionButton, { backgroundColor: colors.primary }]}
                labelStyle={styles.buttonLabel}
              >
               Visualizar Boleto (HTML)
              </Button>
              <Button
                mode="contained"
                icon="file-pdf-box"
                onPress={() => boletoResponse?.boleto_pdf && Linking.openURL(boletoResponse.boleto_pdf)}
                style={[styles.actionButton, { backgroundColor: '#F1591E' }]}
                labelStyle={styles.buttonLabel}
              >
                Baixar PDF
              </Button>
            </View>
          </View>

          {/* <View style={styles.statusContainer}>
            <MaterialCommunityIcons name="timer-outline" size={24} color={colors.onSurfaceVariant} />
            <Text variant="bodyMedium" style={[styles.statusText, { color: colors.onSurface }]}>
              Aguardando confirmação do pagamento... (Status: {paymentStatus})
            </Text>
          </View> */}
        </Card.Content>
      </Card>

      {/* <Button
        mode="outlined"
        disabled={loading}
        onPress={() => setIsModalVisible(true)}
        labelStyle={{ fontSize: 16 }}
        style={styles.backButton}
        contentStyle={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}
      >
        <MaterialCommunityIcons name="arrow-left" size={18} color={colors.primary} />
        <Text style={{ color: colors.primary }}> Voltar</Text>
      </Button> */}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 24,
  },
  card: {
    borderRadius: 24,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  title: {
    fontWeight: '800',
    fontSize: 22,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 16,
  },
  titleContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  content: {
    paddingVertical: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontWeight: '700',
    fontSize: 18,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoText: {
    marginLeft: 12,
    flex: 1,
    fontSize: 14,
  },
  infoTextT: {
    marginLeft: 12,
    flex: 1,
    fontSize: 14,
  },
  copyButton: {
    borderRadius: 12,
    marginTop: 12,
    marginBottom: 8,
  },
  buttonLabel: {
    fontWeight: '700',
    fontSize: 16,
  },
  copiedText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 12,
  },
  statusContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  statusText: {
    marginTop: 8,
    fontWeight: '500',
    textAlign: 'center',
  },
  backButton: {
    borderRadius: 12,
    marginTop: 8,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    borderRadius: 12,
    marginBottom: 16,
  },
});