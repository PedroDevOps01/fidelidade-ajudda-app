import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, Card, useTheme } from 'react-native-paper';
import { useRoute } from '@react-navigation/native';
import { fetchOptionsAutoFormaPagamentoContract } from '../../utils/fetch-select-data';
import { useAuth } from '../../context/AuthContext';
import { navigate } from '../../router/navigationRef';
import LoadingFull from '../../components/loading-full';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

export default function UserPaymentContractResumeScreen() {
  const route = useRoute();
  const { colors } = useTheme();
  const { authData } = useAuth();
  const item = route.params?.item;

  const [formasPagamento, setFormasPagamento] = useState<FormaPagamento[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
useEffect(() => {
  (async () => {
    setLoading(true);
    const data = await fetchOptionsAutoFormaPagamentoContract(authData.access_token);

    // Filtra apenas pagamentos que começam com "10" e não seja 10003
    const newData = data.filter((item: any) => {
      const id = String(item.id_forma_pagamento_fmp);
      return id.length === 5 && id.startsWith('10') && id !== '10003';
    });

    setFormasPagamento(newData);
    setLoading(false);
  })();
}, []);
  useEffect(() => {
    (async () => {
      setLoading(true);
      const data = await fetchOptionsAutoFormaPagamentoContract(authData.access_token);
      const newData = data.filter((item: any) => {
        return (
          String(item.id_forma_pagamento_fmp).length === 5 &&
          String(item.id_forma_pagamento_fmp).startsWith('10')
        );
      });
      setFormasPagamento(newData);
      setLoading(false);
    })();
  }, []);

  const handleSubmit = (selectedFormasPagamento: string) => {
    if (!selectedFormasPagamento) return;

    if (selectedFormasPagamento === '10001') {
      navigate('user-payment-screen', {
        item,
        formaPagamento: formasPagamento.find(
          forma => forma.id_forma_pagamento_fmp.toString() === selectedFormasPagamento
        ),
      });
    }

    if (selectedFormasPagamento === '10002') {
      navigate('user-payment-creditcard-screen', {
        item,
        formaPagamento: formasPagamento.find(
          forma => forma.id_forma_pagamento_fmp.toString() === selectedFormasPagamento
        ),
      });
    }
  };

  const getPaymentIcon = (id: string) => {
    switch (id) {
      case '10001': // PIX
        return 'qrcode';
      case '10002': // Cartão de crédito
        return 'credit-card';
      default:
        return 'cash';
    }
  };

  const getPaymentColor = (id: string) => {
    switch (id) {
      case '10001':
        return '#32BCAD';
      case '10002':
        return '#5B6ABF';
      default:
        return colors.primary;
    }
  };

  if (!item) {
    return (
      <View style={styles.centered}>
        <Text>Nenhum dado encontrado.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.fundo }]}>
      {/* Barra de progresso igual às outras telas */}
      

      <Text
        variant="bodyMedium"
        style={[styles.headerSubtitle, { color: colors.onSurfaceVariant }]}
      >
        Selecione como deseja efetuar o pagamento
      </Text>

      {loading ? (
        <LoadingFull />
      ) : (
        <FlatList
          data={formasPagamento}
          renderItem={({ item }) => (
            <Card
              style={[styles.paymentCard, { backgroundColor: colors.surface }]}
              onPress={() => handleSubmit(String(item.id_forma_pagamento_fmp))}
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
                  <Text
                    variant="titleMedium"
                    style={[styles.paymentTitle, { color: colors.onSurface }]}
                  >
                    {item.des_nome_fmp}
                  </Text>
                  {item.id_forma_pagamento_fmp === '10001' && (
                    <Text
                      variant="bodySmall"
                      style={[styles.paymentSubtitle, { color: colors.primary }]}
                    >
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
          contentContainerStyle={{ paddingBottom: 16 }}
        />
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
