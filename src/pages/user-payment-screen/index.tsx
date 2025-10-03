import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Image, Clipboard, ScrollView } from 'react-native';
import { Text, Card, Button, useTheme, ActivityIndicator } from 'react-native-paper';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { generateRequestHeader, getCurrentDate, maskBrazilianCurrency } from '../../utils/app-utils';
import { api } from '../../network/api';
import { useAuth } from '../../context/AuthContext';
import LoadingFull from '../../components/loading-full';
import { navigate } from '../../router/navigationRef';
import { toast } from 'sonner-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

interface PixResponse {
  vlr_parcela_cpp: number;
  codigoPagamento: string;
  qrcode_url: string;
  qrcode: string;
}

export default function UserPaymentScreen() {
  const route = useRoute();
  const { colors } = useTheme();
  const { authData } = useAuth();

  const [loading, setLoading] = useState<boolean>(true);
  const [pixResponse, setPixResponse] = useState<PixResponse>();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const copyToClipboard = () => {
    Clipboard.setString(pixResponse?.qrcode!);
    toast.success('Código copiado!', { position: 'bottom-center' });
  };

  async function fetchPayment(payload: any) {
    setLoading(true);
    try {
      const response = await api.post(
        '/pagamento-parcela',
        {
          id_origem_pagamento_cpp: 8,
          cod_origem_pagamento_cpp: payload.item.id_contrato_parcela_config_cpc,
          num_cod_externo_cpp: 0,
          id_forma_pagamento_cpp: payload.formaPagamento.id_forma_pagamento_fmp,
          dta_pagamento_cpp: getCurrentDate(),
          id_origem_cpp: 8,
        },
        generateRequestHeader(authData.access_token),
      );
      setPixResponse(response.data.response);
    } catch (err: any) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  }

  async function checkPaid(cod_pagamento: string) {
    const response = await api.get(`/integracaoPagarMe/verificarPagamento?cod_pedido_pgm=${cod_pagamento}`, generateRequestHeader(authData.access_token));

    if (response.status === 200) {
      const status = response.data.response[0]?.des_status_pgm;
      if (status === 'paid') navigate('user-payment-successfull-screen');
      if (status === 'failed') return;
    }
  }

  useFocusEffect(
    useCallback(() => {
      const interval = setInterval(() => {
        checkPaid(pixResponse?.codigoPagamento!);
      }, 20000);
      return () => clearInterval(interval);
    }, [pixResponse?.codigoPagamento]),
  );

  useEffect(() => {
    (async () => {
      await fetchPayment(route.params!);
    })();
  }, [route]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {loading ? (
        <LoadingFull />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Card mode="elevated" style={[styles.card, { backgroundColor: colors.surface }]}>
            <Card.Title
              title="Pagamento via Pix"
              subtitle="Escaneie o QR Code ou copie o código abaixo para pagar."
              titleStyle={[styles.title, { color: colors.primary }]}
              subtitleStyle={[styles.subtitle, { color: colors.onSurfaceVariant }]}
              left={props => <MaterialCommunityIcons {...props} name="qrcode-scan" size={28} color={colors.primary} />}
              titleContainerStyle={styles.titleContainer} // Add custom container style
            />
            <Card.Content style={styles.content}>
              {pixResponse && (
  <View style={styles.valueContainer}>
    <Text variant="bodyMedium" style={[styles.label, { color: colors.onSurface }]}>
      Valor da Parcela:
    </Text>
    <Text variant="headlineMedium" style={[styles.value, { color: colors.primary }]}>
      {maskBrazilianCurrency(pixResponse.vlr_parcela_cpp)}
    </Text>
  </View>
)}

              <View style={styles.qrContainer}>
                <Text variant="bodyMedium" style={[styles.label, { color: colors.onSurface }]}>
                  Escaneie o QR Code:
                </Text>
                <View style={[styles.qrBorder, { borderColor: colors.primaryContainer }]}>
                  <Image source={{ uri: pixResponse!.qrcode_url }} style={styles.qrCode} resizeMode="contain" />
                </View>
                <Button
                  mode="contained-tonal"
                  icon="content-copy"
                  onPress={copyToClipboard}
                  style={[styles.copyButton, { backgroundColor: colors.primaryContainer }]}
                  labelStyle={{ color: colors.onPrimaryContainer }}>
                  Copiar código Pix
                </Button>
              </View>
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
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContainer: { padding: 16, paddingBottom: 24 },
  card: {
    borderRadius: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  title: { fontWeight: '800', fontSize: 22, textAlign: 'center' }, // Removed marginLeft: -8
  subtitle: { textAlign: 'center', fontSize: 16 }, // Adjust fontSize as needed
  content: { paddingVertical: 16 },
  valueContainer: { alignItems: 'center', marginBottom: 24 },
  label: { fontWeight: '500', marginBottom: 4 },
  value: { fontWeight: '800' },
  qrContainer: { alignItems: 'center', marginBottom: 20 },
  qrBorder: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#FFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    marginBottom: 8,
  },
  qrCode: { width: 220, height: 220 },
  copyButton: { borderRadius: 12, marginTop: 8 },
  titleContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row', // Ensure icon and text are aligned properly
  },
  infoCard: {
    borderRadius: 16,
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  infoSection: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  infoText: { marginLeft: 12, flex: 1 },
  statusContainer: { alignItems: 'center', paddingVertical: 16 },
  statusText: { marginTop: 16, fontWeight: '500', textAlign: 'center' },
});
