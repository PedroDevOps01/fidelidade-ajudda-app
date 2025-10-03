import { useWindowDimensions, View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import { generateRequestHeader, log, maskBrazilianCurrency } from '../../../utils/app-utils';
import { useEffect, useState } from 'react';
import { api } from '../../../network/api';
import { useDadosUsuario } from '../../../context/pessoa-dados-context';
import { useAuth } from '../../../context/AuthContext';
import CustomToast from '../../../components/custom-toast';
import { navigate } from '../../../router/navigationRef';
import { BarChart } from 'react-native-gifted-charts';
import { StyleSheet } from 'react-native';

export default function TotalSalesValue({ salesData, currentMdv }: { salesData: Sale[]; currentMdv: number }) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const [loading, setLoading] = useState(false);
  const { authData } = useAuth();

  const [availableAmount, setAvailableAmount] = useState<number>(0);

  // Preparar dados para o gráfico de barras
  const barChartData =
    salesData.length > 0
      ? [
          {
            value: salesData.reduce((sum, item) => sum + (item.vlr_parcela_ppg ?? 0), 0),
            label: 'Total Vendido',
            frontColor: colors.primary,
          },
          {
            value: availableAmount,
            label: 'Disponível',
            frontColor: colors.surfaceTint,
          },
        ]
      : [];

  async function getTotalSalesAvailable() {
  setLoading(true);
  try {
    const response = await api.get(
      `/dashboard/saldo_conta_vendas/${currentMdv}`,
      generateRequestHeader(authData.access_token)
    );

    if (response.status === 200) {
      const data = response.data;

      if (data.data.original.error) {
        CustomToast(`Erro ao obter dados de vendas: ${data.data.original.error}`, colors, 'error');
        return;
      }

      if (typeof data.data.original.available_amount === 'number') {
        setAvailableAmount(data.data.original.available_amount);
        console.log(
          '💰 Valor disponível para saque:',
          maskBrazilianCurrency(data.data.original.available_amount)
        );
        return;
      }
    }

    console.log('Nenhum valor retornado para saque.');
  } catch (error) {
    console.error('Erro ao obter valor disponível para saque:', error);
  } finally {
    setLoading(false);
  }
}


 useEffect(() => {
  (async () => {
    await getTotalSalesAvailable();
  })();
}, [currentMdv]);
useEffect(() => {
  console.log('🔎 availableAmount atualizado:', availableAmount);
}, [availableAmount]);
  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      {/* Título */}
      <Text style={[styles.cardTitle, { color: colors.onSurface }]}>Resumo Financeiro</Text>

      {/* Gráfico de Barras */}
      {salesData.length > 0 && (
        <View style={styles.chartContainer}>
          <BarChart
  data={barChartData}
  barWidth={40}
  spacing={40}
  roundedTop
  roundedBottom
  hideRules
  xAxisThickness={0}
  yAxisThickness={0}
  yAxisTextStyle={{ color: colors.onSurface, fontSize: 9 }}
  noOfSections={4}
  // ✅ força um mínimo de 1 para não esconder valores baixos
  maxValue={Math.max(1, Math.max(...barChartData.map(item => item.value)) * 1.2)}
  yAxisLabelTexts={Array.from({ length: 5 }, (_, i) =>
    maskBrazilianCurrency(
      Math.round(
        (Math.max(1, Math.max(...barChartData.map(item => item.value)) * 1.2) * i) / 4
      )
    )
  )}
  renderTooltip={(item: any) => (
    <View style={[styles.tooltip, { backgroundColor: colors.elevation.level3 }]}>
      <Text style={{ color: colors.onSurface, fontSize: 12 }}>
        {maskBrazilianCurrency(item.value)}
      </Text>
    </View>
  )}
/>
        </View>
      )}

      {/* Valores */}
      <View style={styles.valuesContainer}>
        <View style={styles.valueRow}>
          <View style={styles.valueLabelContainer}>
            <View style={[styles.colorIndicator, { backgroundColor: colors.primary }]} />
            <Text style={[styles.valueLabel, { color: colors.onSurface }]}>Total Vendido:</Text>
          </View>
          <Text style={[styles.valueAmount, { color: colors.onSurface }]}>{maskBrazilianCurrency(salesData.reduce((sum, item) => sum + (item.valor_pago ?? 0), 0))}</Text>
        </View>

        <View style={styles.valueRow}>
          <View style={styles.valueLabelContainer}>
            <View style={[styles.colorIndicator, { backgroundColor: colors.surfaceTint }]} />
            <Text style={[styles.valueLabel, { color: colors.onSurface }]}>Disponível para Saque:</Text>
          </View>
          <Text style={[styles.valueAmount, { color: colors.onSurface }]}>{maskBrazilianCurrency(availableAmount)}</Text>
        </View>
      </View>

      {/* Botão de Transferência */}
      <Button
        mode="contained"
        disabled={availableAmount <= 0}
        onPress={() => {
          navigate('user-mdv-withdraw', { value: availableAmount, id_usario_mdv: currentMdv });
        }}
        style={styles.transferButton}
        contentStyle={styles.buttonContent}
        labelStyle={styles.buttonLabel}>
        {availableAmount > 0 ? 'Transferir para Minha Conta' : 'Sem saldo disponível'}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,

    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 36,
  },
  chartContainer: {
    height: 200,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tooltip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    position: 'absolute',
    bottom: 10,
  },
  valuesContainer: {
    marginBottom: 16,
    marginTop: 16,
  },
  valueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  valueLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  valueLabel: {
    fontSize: 14,
  },
  valueAmount: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  transferButton: {
    borderRadius: 12,
    elevation: 2,
  },
  buttonContent: {
    height: 48,
  },
  buttonLabel: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});
