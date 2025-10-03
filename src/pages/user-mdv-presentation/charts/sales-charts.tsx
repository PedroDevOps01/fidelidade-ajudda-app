import { ScrollView, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { ActivityIndicator, Button, Icon, Menu, Text, useTheme } from 'react-native-paper';
import { navigate } from '../../../router/navigationRef';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { maskBrazilianCurrency } from '../../../utils/app-utils';

const SalesChart = ({ salesData, loading }: { salesData: Sale[]; loading: boolean }) => {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const [menuVisible, setMenuVisible] = useState(false);

  // Se `salesData` estiver vazio, mostrar um gráfico com valores padrão
  const isEmpty = salesData.length === 0;

  // Agrupar vendas por data
  const dateMap: Record<string, number> = salesData.reduce((acc, item) => {
    acc[item.dta_pagamento_cpp] = (acc[item.dta_pagamento_cpp] || 0) + item.valor_pago;
    return acc;
  }, {} as Record<string, number>);

  const labels = Object.keys(dateMap);
  const valores = Object.values(dateMap);

  // Formatar datas para exibição (DD/MM)
  const formattedLabels = labels.map(date => {
    const [year, month, day] = date.split('-');
    return `${day}/${month}`;
  });

  // Estruturando os dados para o gráfico de barras
  const barChartData = isEmpty
    ? []
    : valores.map((value, index) => ({
        value: value,
        label: formattedLabels[index],
        frontColor: index % 2 === 0 ? colors.primary : colors.secondary,
        topLabelComponent: () => <Text style={[styles.topLabel, { color: colors.onSurface }]}>{maskBrazilianCurrency(value)}</Text>,
      }));

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <>
          {/* Cabeçalho do gráfico */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.onSurface }]}>{isEmpty ? 'Sem vendas registradas!' : `Vendas por Data - Total: ${salesData.length}`}</Text>

            {/* {!isEmpty && (
              <Menu
                visible={menuVisible}
                onDismiss={() => setMenuVisible(false)}
                anchor={
                  <TouchableOpacity onPress={() => setMenuVisible(true)} style={[styles.menuButton, { backgroundColor: colors.primaryContainer }]}>
                    <Icon source="dots-vertical" size={24} color={colors.onPrimaryContainer} />
                  </TouchableOpacity>
                }
                contentStyle={{ backgroundColor: colors.surface }}>
                <Menu.Item
                  onPress={() => {
                    setMenuVisible(false);
                    navigate('user-mdv-sales-details', { sales: salesData });
                  }}
                  title="Ver Detalhes"
                  titleStyle={{ color: colors.onSurface }}
                />
                <Menu.Item 
                  onPress={() => {
                    setMenuVisible(false);
                  }} 
                  title="Exportar Dados" 
                  titleStyle={{ color: colors.onSurface }}
                />
              </Menu>
            )} */}
          </View>

          {/* Gráfico de Barras */}
          {!isEmpty && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chartScrollView}>
              <BarChart
                data={barChartData}
                barWidth={22}
                spacing={20}
                roundedTop
                roundedBottom
                hideRules
                xAxisThickness={0}
                yAxisThickness={0}
                yAxisTextStyle={{ color: colors.onSurface, fontSize: 9 }}
                xAxisLabelTextStyle={{ color: colors.onSurface, fontSize: 10 }}
                noOfSections={4}
                maxValue={Math.max(...valores) * 1.2}
                showFractionalValues
                showYAxisIndices
                yAxisIndicesColor={colors.outline}
                yAxisIndicesWidth={0.5}
                formatYLabel={value => maskBrazilianCurrency(Number(value))}
              />
            </ScrollView>
          )}

          {isEmpty && (
            <View style={styles.emptyState}>
              <Icon source="chart-line" size={48} color={colors.onSurfaceDisabled} />
              <Text style={[styles.emptyText, { color: colors.onSurfaceDisabled }]}>Nenhuma venda encontrada para o período selecionado</Text>
            </View>
          )}

          {!isEmpty && (
            <View style={styles.footer}>
              <Button
                onPress={() => {
                  navigate('user-mdv-sales-details', { sales: salesData });
                }}
                mode="outlined"
                style={[styles.detailsButton, { borderColor: colors.primary }]}
                labelStyle={{ color: colors.primary }}
                icon="chart-bar">
                Ver detalhes
              </Button>
            </View>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    
  },
  loadingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
        textAlign:'center',

    flex: 1,
  },
  menuButton: {
    padding: 8,
    borderRadius: 20,
  },
  chartScrollView: {
    paddingHorizontal: 8,
    paddingBottom: 16,
  },
  topLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    top: -6,
  },
  emptyState: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    marginTop: 12,
    textAlign: 'center',
    fontSize: 14,
  },
  footer: {
    marginTop: 16,
  },
  detailsButton: {
    borderRadius: 12,
    borderWidth: 1,
  },
});

export default SalesChart;
