import React from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Card, Text, IconButton, useTheme, Divider, Button } from 'react-native-paper';
import { convertToReais, transformMonthNumberToString } from '../../utils/app-utils';
import { navigate } from '../../router/navigationRef';

const ContratoParcelaDetailsCard = ({ item }: { item: ContratoParcelaDetails }) => {
  const { colors } = useTheme();
  // Determinar a cor e ícone baseados no status
  const getStatusDetails = () => {
    if (!item.des_descricao_tsi || item.des_descricao_tsi.includes("Aguardando") || item.des_descricao_tsi.includes("Adesao")) {
      return {
        color: colors.error,
        icon: 'alert-circle-outline',
        text: 'Aguardando pagamento'
      };
    }
    if (item.des_descricao_tsi.includes("Pago")) {
      return {
        color: colors.success,
        icon: 'check-circle-outline',
        text: 'Pago'
      };
    }
    if (item.des_descricao_tsi.includes("Processando")) {
      return {
        color: colors.warning,
        icon: 'timer-sand',
        text: 'Processando'
      };
    }
    return {
      color: colors.info,
      icon: 'information-outline',
      text: item.des_descricao_tsi
    };
  };
  
  const status = getStatusDetails();
  const isPayable = !item.des_descricao_tsi || !item.des_descricao_tsi.includes("Pago");

  return (
    <Card style={[styles.card, { backgroundColor: colors.surface }]}>
      <Card.Content>
        {/* Cabeçalho */}
        <View style={styles.header}>
          <View>
            <Text variant="titleLarge" style={styles.parcelNumber}>
              {item.cod_numparcela_cpc}° Parcela
            </Text>
            <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
              Vencimento: {item.dta_dia_cpc} de {transformMonthNumberToString(Number(item.dta_mes_cpc))} {item.ano_pagamento ? `de ${item.ano_pagamento}` : ''}
            </Text>
          </View>
          <IconButton 
            icon={status.icon} 
            iconColor={status.color}
            size={24}
          />
        </View>
        
        <Divider style={[styles.divider, { backgroundColor: colors.outlineVariant }]} />
        
        {/* Valor */}
        <View style={styles.valueRow}>
          <Text variant="bodyMedium">Valor:</Text>
          <Text variant="titleMedium" style={styles.valueText}>
            {convertToReais(item.vlr_parcela_cpc)}
          </Text>
        </View>
        
        {/* Valor pago */}
        {item.valor_pago && (
          <View style={styles.valueRow}>
            <Text variant="bodyMedium">Valor pago:</Text>
            <Text variant="bodyMedium" style={{ color: colors.success }}>
              {convertToReais(item.valor_pago)}
            </Text>
          </View>
        )}
        
        {/* Forma de pagamento */}
        {item.des_nome_fmp && (
          <View style={styles.valueRow}>
            <Text variant="bodyMedium">Forma de pagamento:</Text>
            <Text variant="bodyMedium">{item.des_nome_fmp}</Text>
          </View>
        )}
        
        {/* Status */}
        <View style={[styles.statusContainer, { backgroundColor: `${status.color}20` }]}>
          <Text style={[styles.statusText, { color: status.color }]}>
            {status.text}
          </Text>
        </View>
        
        {/* Botão de pagamento */}
        {isPayable && (
          <Button 
            mode="contained" 
            style={styles.payButton}
            onPress={() => navigate('user-contratos-payment-resume-screen', { item })}
            icon="credit-card-outline"
          >
            Pagar Parcela
          </Button>
        )}
        
        {/* Status inativo */}
        {item.is_ativo_cpc === 0 && (
          <View style={[styles.statusContainer, { backgroundColor: `${colors.error}20` }]}>
            <Text style={[styles.statusText, { color: colors.error }]}>
              Parcela inativa
            </Text>
          </View>
        )}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    margin: 16,
    borderRadius: 12,
    elevation: 2,
    paddingVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  parcelNumber: {
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
  valueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  valueText: {
    fontWeight: '600',
  },
  statusContainer: {
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  statusText: {
    fontWeight: '500',
  },
  payButton: {
    marginTop: 16,
    borderRadius: 8,
  },
});

// Componente para exibir todas as parcelas
const ParcelasScreen = ({ parcelas }) => {
  const { colors } = useTheme();
  
  const filteredParcelas = parcelas.filter(
    item => item.des_descricao_tsi != null && 
            !item.des_descricao_tsi.includes("Adesao") && 
            item.id_situacao_cpp !== 17
  );
  
  return (
    <View style={[screenStyles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={screenStyles.scrollContainer}>
        <Text variant="headlineMedium" style={screenStyles.title}>
          Minhas Parcelas
        </Text>
        <Text variant="bodyMedium" style={[screenStyles.subtitle, { color: colors.onSurfaceVariant }]}>
          {filteredParcelas.length} parcelas encontradas
        </Text>
        
        {filteredParcelas.map((item, index) => (
          <ContratoParcelaDetailsCard key={index} item={item} />
        ))}
      </ScrollView>
    </View>
  );
};

const screenStyles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  scrollContainer: {
    paddingBottom: 20,
  },
  title: {
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    marginBottom: 20,
  },
});

export default ContratoParcelaDetailsCard;
export { ParcelasScreen };