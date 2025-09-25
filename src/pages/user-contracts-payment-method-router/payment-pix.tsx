import { useCallback, useEffect, useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAccquirePlan } from '../../context/accquirePlanContext';
import { api } from '../../network/api';
import { formatDateToDDMMYYYY, generateRequestHeader, maskBrazilianCurrency } from '../../utils/app-utils';
import { ActivityIndicator, Clipboard, Image, StyleSheet, TouchableOpacity, View, ScrollView } from 'react-native';
import dayjs from 'dayjs';
import { Button, Card, Text, useTheme, Chip } from 'react-native-paper';
import { toast } from 'sonner-native';
import { goBack, navigate } from '../../router/navigationRef';
import { useDadosUsuario } from '../../context/pessoa-dados-context';
import LoadingFull from '../../components/loading-full';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

interface PixResponse {
  vlr_parcela_cpp: number;
  codigoPagamento: string;
  qrcode_url: string;
  qrcode: string;
  dta_pagamento_cpp: string;
}

export default function PaymentPix() {
  const { authData } = useAuth();
  const { colors } = useTheme();
  const { dadosUsuarioData, setDadosUsuarioData } = useDadosUsuario();
  const [pixResponse, setPixResponse] = useState<PixResponse>();
  const [loading, setLoading] = useState(true);
  const { idFormaPagamento, contratoParcela, contratoCreated } = useAccquirePlan();
  const [errorMessage, setErrorMessage] = useState<string>('');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const copyToClipboard = () => {
    Clipboard.setString(pixResponse?.qrcode!);
    toast.success('Código copiado!', { position: 'bottom-center' });
  };

  async function getSignatureDataAfterPixPaid() {
    try {
      const response = await api.get(
        `/pessoa/${dadosUsuarioData.pessoaDados?.id_pessoa_pes}/signature`,
        generateRequestHeader(authData.access_token)
      );
      if (response.status == 200) {
        setDadosUsuarioData({
          ...dadosUsuarioData,
          pessoaAssinatura: response.data.response,
        });
        toast.success('Dados atualizados com sucesso', { position: 'bottom-center' });
        navigate('user-contracts-payment-successfull');
      }
    } catch (err) {
      console.log(err);
    }
  }

  async function checkPaid(cod_pagamento: string) {
    setErrorMessage('');
    console.log('Verificando pagamento...');
    const response = await api.get(
      `/integracaoPagarMe/verificarPagamento?cod_pedido_pgm=${cod_pagamento}`,
      generateRequestHeader(authData.access_token)
    );
console.log(response);
    if (response.status == 200) {
      const status = response.data.response[0]?.des_status_pgm;
      if (status === 'paid') await getSignatureDataAfterPixPaid();
      if (status === 'failed') navigate('user-contracts-payment-failed');
    } else {
      setErrorMessage('Erro ao verificar pagamento');
      setLoading(false);
    }
  }

  async function requestPayment() {
    setErrorMessage('');
    if (!idFormaPagamento) return;
    setLoading(true);
    console.log('Solicitando pagamento...');
    try {
      const baseData = {
        id_origem_pagamento_cpp: 8,
        cod_origem_pagamento_cpp: contratoParcela?.id_contrato_parcela_config_cpc,
        num_cod_externo_cpp: 0,
        dta_pagamento_cpp: dayjs().format('YYYY-MM-DD'),
        id_origem_cpp: 7,
        id_forma_pagamento_cpp: idFormaPagamento,
      };
      const response = await api.post(`/pagamento-parcela`, baseData, generateRequestHeader(authData.access_token));
      console.log(response);
      if (response.status === 200) setPixResponse(response.data.response);
    } catch {
      setErrorMessage('Erro ao realizar checagem de pagamento');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (contratoParcela) requestPayment();
  }, [contratoParcela]);

  useEffect(() => {
    if (pixResponse?.codigoPagamento) {
      intervalRef.current = setInterval(() => {
        checkPaid(pixResponse?.codigoPagamento!);
      }, 20000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [pixResponse?.codigoPagamento]);

  const handleBackButtonPress = async () => {
    await api.delete(`/contrato/${contratoCreated?.id_contrato_ctt}`, generateRequestHeader(authData.access_token));
    goBack();
  };

  if (loading) return <LoadingFull />;

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}>
      {errorMessage ? (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.error }]}>{errorMessage}</Text>
          <Button mode="contained" onPress={requestPayment} style={styles.retryButton} buttonColor={colors.primary}>
            Tentar novamente
          </Button>
        </View>
      ) : (
        <>
          <Card mode="elevated" style={[styles.card, { backgroundColor: colors.surface }]}>
            <Card.Title
              title="Pagamento via Pix"
              subtitle="Escaneie o QR Code ou copie o código abaixo para pagar."
              titleStyle={[styles.title, { color: colors.primary }]}
              subtitleStyle={[styles.subtitle, { color: colors.onSurfaceVariant }]}
              left={props => <MaterialCommunityIcons {...props} name="qrcode-scan" size={28} color={colors.primary} />}
              titleContainerStyle={styles.titleContainer}
            />
            <Card.Content style={styles.content}>
              <View style={styles.valueContainer}>
                <Text variant="bodyMedium" style={[styles.label, { color: colors.onSurface }]}>
                  Valor:
                </Text>
                <Text variant="headlineMedium" style={[styles.value, { color: colors.primary }]}>
                  {maskBrazilianCurrency(pixResponse?.vlr_parcela_cpp! ?? 0)}
                </Text>
              </View>

              <View style={styles.qrContainer}>
                <Chip
                  icon="information-outline"
                  mode="outlined"
                  style={[styles.chip, { borderColor: colors.primaryContainer }]}
                  textStyle={{ color: colors.onSurface }}
                >
                  Escaneie o QR Code
                </Chip>

                <View style={[styles.qrBorder, { borderColor: colors.primaryContainer }]}>
                  <Image source={{ uri: pixResponse?.qrcode_url }} style={styles.qrCode} resizeMode="contain" />
                </View>
              </View>

              <Button
                mode="contained-tonal"
                icon="content-copy"
                onPress={copyToClipboard}
                style={[styles.copyButton, { backgroundColor: colors.primaryContainer }]}
                labelStyle={[styles.buttonLabel, { color: colors.onPrimaryContainer }]}
              >
                Copiar código Pix
              </Button>
            </Card.Content>
          </Card>

          <Card mode="elevated" style={[styles.infoCard, { backgroundColor: colors.surface }]}>
            <Card.Content>
              <View style={styles.infoSection}>
                <MaterialCommunityIcons name="timer-outline" size={20} color={colors.onSurfaceVariant} />
                <Text variant="bodyMedium" style={[styles.infoText, { color: colors.onSurface }]}>
                  Prazo de validade: 30 minutos
                </Text>
              </View>

              <View style={styles.infoSection}>
                <MaterialCommunityIcons name="autorenew" size={20} color={colors.onSurfaceVariant} />
                <Text variant="bodyMedium" style={[styles.infoText, { color: colors.onSurface }]}>
                  Atualização automática do status
                </Text>
              </View>

              <View style={styles.infoSection}>
                <MaterialCommunityIcons name="information-outline" size={20} color={colors.onSurfaceVariant} />
                <Text variant="bodyMedium" style={[styles.infoText, { color: colors.onSurface }]}>
                  Não feche o aplicativo durante o pagamento
                </Text>
              </View>
            </Card.Content>
          </Card>

          <View style={styles.statusContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text variant="bodyMedium" style={[styles.statusText, { color: colors.onSurface }]}>
              Aguardando confirmação do pagamento...
            </Text>
          </View>
        </>
      )}
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
  title: { fontWeight: '800', fontSize: 22, textAlign: 'center' },
  subtitle: { textAlign: 'center', fontSize: 16 },
  titleContainer: { justifyContent: 'center', alignItems: 'center', flexDirection: 'row' },
  content: { paddingVertical: 16 },
  valueContainer: { alignItems: 'center', marginBottom: 24 },
  label: { marginBottom: 4, fontWeight: '500' },
  value: { fontWeight: '800' },
  qrContainer: { alignItems: 'center', marginBottom: 20 },
  chip: { marginBottom: 16, backgroundColor: 'transparent' },
  qrBorder: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#FFF',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  qrCode: { width: 220, height: 220 },
  copyButton: { borderRadius: 12, marginTop: 8 },
  buttonLabel: { fontWeight: '700', fontSize: 16 },
  infoCard: { borderRadius: 16, marginBottom: 24, elevation: 2 },
  infoSection: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  infoText: { marginLeft: 12, flex: 1 },
  statusContainer: { alignItems: 'center', paddingVertical: 16 },
  statusText: { marginTop: 16, fontWeight: '500', textAlign: 'center' },
  errorContainer: { padding: 24, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 16, textAlign: 'center', marginBottom: 16 },
  retryButton: { borderRadius: 12 },
});
