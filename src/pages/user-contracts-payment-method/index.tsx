import { Alert, FlatList, StyleSheet, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Text, useTheme, Card, List } from 'react-native-paper';
import { useAccquirePlan } from '../../context/accquirePlanContext';
import { useEffect, useState } from 'react';
import { api } from '../../network/api';
import { generateRequestHeader } from '../../utils/app-utils';
import LoadingFull from '../../components/loading-full';
import { navigate } from '../../router/navigationRef';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

export default function UserContractsPaymentMethod() {
  const { authData } = useAuth();
  const { colors } = useTheme();
  const { setIdFormaPagamento, idFormaPagamento } = useAccquirePlan();

  const [loading, setLoading] = useState<boolean>(false);
  const [formasPagamento, setFormasPagamento] = useState<FormaPagamento[]>([]);

  async function getPaymentMethods() {
    setLoading(true);
    try {
      const request = await api.get('/formapagamento?is_ativo_fmp=1', generateRequestHeader(authData.access_token));
      const { data } = request;
    
      if (request.status === 200) {
        const trueData: FormaPagamento[] = data.response.data;
          console.log(trueData);
        if (trueData) {
          const filtered = trueData.filter(e => e.id_forma_pagamento_fmp.toString().length > 4);
          console.log(filtered)
          setFormasPagamento(filtered);
        
          console.log(data.response.data.length);
        }
      }
    } catch (err) {
      Alert.alert('Erro ao carregar as formas de pagamento. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    (async function () {
      await getPaymentMethods();
    })();
  }, []);

  const getPaymentIcon = (id: string) => {
    switch (id) {
      case '10001': // PIX
        return 'qrcode';
      case '10002': // Cartão de crédito
        return 'credit-card';
      case '10003': // Boleto
        return 'barcode'; // Ícone apropriado para boleto
      default:
        return 'cash';
    }
  };

  const getPaymentColor = (id: string) => {
    switch (id) {
      case '10001': // PIX
        return '#32BCAD';
      case '10002': // Cartão de crédito
        return '#5B6ABF';
      case '10003': // Boleto
        return '#FF9800'; // Cor diferenciada para boleto
      default:
        return colors.primary;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.fundo }]}>
      <Text variant="bodyMedium" style={[styles.headerSubtitle, { color: colors.onSurfaceVariant }]}>
        Selecione como deseja efetuar o pagamento
      </Text>

      {loading ? (
        <LoadingFull />
      ) : (
        <View style={styles.paymentMethodsContainer}>
          <FlatList
            data={formasPagamento}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <Card
                style={[styles.paymentCard, { backgroundColor: colors.surface }]}
                onPress={() => {
                  setIdFormaPagamento(item.id_forma_pagamento_fmp);
                  navigate('user-contracts-payment-method-router');
                }}
              >
                <Card.Content style={styles.cardContent}>
                  <View style={styles.iconContainer}>
                    <MaterialCommunityIcons
                      name={getPaymentIcon(String(item.id_forma_pagamento_fmp))}
                      size={28}
                      color={getPaymentColor(String(item.id_forma_pagamento_fmp))}
                    />
                  </View>
                  <View style={styles.textContainer}>
                    <Text variant="titleMedium" style={[styles.paymentTitle, { color: colors.onSurface }]}>
                      {item.des_nome_fmp}
                    </Text>
                    {item.id_forma_pagamento_fmp === '10001' && (
                      <Text variant="bodySmall" style={[styles.paymentSubtitle, { color: colors.primary }]}>
                        Pagamento instantâneo • Sem taxas
                      </Text>
                    )}
                   
                  </View>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={24}
                    color={colors.onSurfaceVariant}
                  />
                </Card.Content>
              </Card>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            removeClippedSubviews={false}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  headerSubtitle: {
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.8,
    letterSpacing: 0.25,
  },
  paymentMethodsContainer: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 16,
  },
  paymentCard: {
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  iconContainer: {
    marginRight: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(50, 188, 173, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  paymentTitle: {
    fontWeight: '600',
    marginBottom: 2,
  },
  paymentSubtitle: {
    fontWeight: '500',
    fontSize: 13,
  },
  separator: {
    height: 12,
  },
});