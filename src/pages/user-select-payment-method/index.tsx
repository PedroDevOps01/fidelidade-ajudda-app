import { useRoute } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, useTheme, Card } from 'react-native-paper';
import { fetchOptionsAutoFormaPagamentoContract } from '../../utils/fetch-select-data';
import { useAuth } from '../../context/AuthContext';
import { navigate } from '../../router/navigationRef';
import { useExames } from '../../context/exames-context';
import { useConsultas } from '../../context/consultas-context';
import LoadingFull from '../../components/loading-full';
import CustomToast from '../../components/custom-toast';
import { log } from '../../utils/app-utils';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const UserSelectPaymentMethod = () => {
  const { colors } = useTheme();
  const { authData } = useAuth();
  const { currentProcedureMethod } = useConsultas();
  const { scheduleRequest, setScheduleRequestData } = useExames();
  const route = useRoute();
  const [formasPagamento, setFormasPagamento] = useState<FormaPagamento[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const handleSubmit = (selectedFormasPagamento: string) => {
    if (!selectedFormasPagamento) {
      CustomToast('Selecione uma forma de pagamento.', colors);
      return;
    }

    let schedule: ScheduleRequest = (route.params as ScheduleRequest) ?? scheduleRequest;
    schedule = {
      ...schedule,
      payment_method: selectedFormasPagamento === '10001' ? 'pix' : 'credit_card',
    };

    log('schedule', schedule);

    if (currentProcedureMethod == 'exame') {
      setScheduleRequestData(schedule);
    }

    if (selectedFormasPagamento === '10001') {
      navigate('user-payment-pix-schedule-screen', schedule);
    } else if (selectedFormasPagamento === '10002') {
      navigate('user-payment-creditcard-schedule-screen', schedule);
    }
  };
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
  const getPaymentIcon = (id: string) => {
    switch (id) {
      case '10001': return 'qrcode';
      case '10002': return 'credit-card';
      default: return 'cash';
    }
  };

  const getPaymentColor = (id: string) => {
    switch (id) {
      case '10001': return '#32BCAD';
      case '10002': return '#5B6ABF';
      default: return colors.primary;
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
};

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

export default UserSelectPaymentMethod;
