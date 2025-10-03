import { RouteProp, useRoute } from '@react-navigation/native';
import { FlatList, StyleSheet, View, TouchableOpacity } from 'react-native';
import { Card, Text, useTheme, Divider, Icon } from 'react-native-paper';
import { formatDateToDDMMYYYY, maskBrazilianCurrency } from '../../utils/app-utils';
import { useNavigation } from '@react-navigation/native';

type UserMdvSalesDetailsRouteParams = {
  params: {
    sales: Sale[];
  };
};

type Sale = {
  des_nome_pes: string;
  des_nome_pla: string;
  des_nome_fmp: string;
  vlr_parcela_ppg: number;
  dta_pagamento_cpp: string | null;
};

export default function UserMdvSalesDetails() {
  const { colors } = useTheme();
  const route = useRoute<RouteProp<UserMdvSalesDetailsRouteParams, 'params'>>();
  const { sales } = route.params;
  const navigation = useNavigation();
    console.log(sales);

  const RenderLine = ({ item }: { item: Sale }) => (
    <Card
      mode="elevated"
      style={[styles.card, { backgroundColor: colors.surface }]}
      elevation={2}
    >
      <Card.Title
        title={item.des_nome_pes}
        titleStyle={[styles.cardTitle, { color: colors.onSurface }]}
        subtitle={`Plano: ${item.des_nome_pla}`}
        subtitleStyle={[styles.cardSubtitle, { color: colors.onSurfaceVariant }]}
        left={(props) => <Icon {...props} source="account-circle" color={colors.primary} />}
      />
      <Divider style={[styles.divider, { backgroundColor: colors.outline }]} />
      <Card.Content style={styles.cardContent}>
        <View style={styles.infoRow}>
          <Text style={[styles.label, { color: colors.onSurface }]}>Forma de Pagamento:</Text>
          <Text style={[styles.value, { color: colors.onSurface }]}>{item.des_nome_fmp}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.label, { color: colors.onSurface }]}>Valor:</Text>
         <Text style={[styles.value, { color: colors.primary }]}>
  {maskBrazilianCurrency(item.valor_pago ?? 0)}
</Text>


        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.label, { color: colors.onSurface }]}>Data de Pagamento:</Text>
          
<Text style={[styles.value, { color: colors.onSurface }]}>
  {item.dta_pagamento_cpp ? formatDateToDDMMYYYY(item.dta_pagamento_cpp) : 'Não pago'}
</Text>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.fundo }]}>
     
      <FlatList
        data={sales}
        renderItem={RenderLine}
        keyExtractor={(item, index) => `${item.des_nome_pes}-${index}`}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon source="alert-circle-outline" size={48} color={colors.onSurfaceVariant} />
            <Text style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>
              Nenhuma venda encontrada
            </Text>
          </View>
        }
        removeClippedSubviews={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  headerTitle: {
    fontWeight: 'bold',
    marginLeft: 16,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    marginVertical: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  cardSubtitle: {
    fontSize: 14,
    fontWeight: '400',
  },
  divider: {
    marginHorizontal: 16,
  },
  cardContent: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    fontWeight: '400',
    flex: 1,
    textAlign: 'right',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
  },
});