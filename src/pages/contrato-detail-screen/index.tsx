import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity } from 'react-native';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';
import dayjs from 'dayjs';
import { maskBrazilianCurrency } from '../../utils/app-utils';
import { navigate } from '../../router/navigationRef';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface ContratosDetailScreenProps {
  contrato: ContratoResponse;
  title: string;
}

const ContratosDetailScreen = ({ contrato, title }: ContratosDetailScreenProps) => {
  const theme = useTheme();
  const [loading, setLoading] = useState<boolean>(false);
  console.log('Contrato Details:', contrato);
  const getIcon = (icon: string) => {
    switch (icon) {
      case 'Sistema': return 'monitor';
      case 'APP': return 'cellphone';
      default: return 'help-circle';
    }
  };

  const renderDetailItem = (icon: string, title: string, value: string, action?: () => void, isLink = false) => {
    return (
      <TouchableOpacity 
        style={styles.detailItem} 
        onPress={action}
        activeOpacity={action ? 0.7 : 1}
      >
        <View style={styles.iconContainer}>
          <Icon name={icon} size={24} color={theme.colors.onTertiary} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.itemTitle}>{title}</Text>
          <Text style={[styles.itemValue, isLink && styles.linkText]}>{value}</Text>
        </View>
        {action && <Icon name="chevron-right" size={24} color="#999" />}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!contrato) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <Text style={styles.emptyText}>Nenhum dado disponível</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Header */}
  

        {/* Status Card */}
        <View style={[
          styles.statusCard,
          { 
            backgroundColor: contrato.is_ativo_ctt ? '#E8F5E9' : '#FFEBEE',
            borderLeftColor: contrato.is_ativo_ctt ? theme.colors.primary : theme.colors.error
          }
        ]}>
          <Icon 
            name={contrato.is_ativo_ctt ? 'check-circle' : 'close-circle'} 
            size={24} 
            color={contrato.is_ativo_ctt ? theme.colors.primary : theme.colors.error} 
          />
          <Text style={styles.statusText}>
            {contrato.is_ativo_ctt ? 'Plano Ativo' : 'Plano Inativo'}
          </Text>
        </View>

        {/* User Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informações do Titular</Text>
          {renderDetailItem('account', 'Nome do Cliente', contrato.des_nome_pes)}
          {renderDetailItem('calendar', 'Data de Cadastro', dayjs(contrato.dth_cadastro_ctt).format('DD/MM/YYYY'))}
        </View>

        {/* Plan Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detalhes do Plano</Text>
          {renderDetailItem('currency-usd', 'Valor Inicial', `${maskBrazilianCurrency(contrato.vlr_inicial_ctt)}`)}
          {renderDetailItem(
            'file-document-multiple-outline', 
            'Parcelas', 
            `${contrato.qtd_parcelas_ctt} (Ver parcelas)`,
            () => navigate('contrato-parcela-details', { idContrato: contrato.id_contrato_ctt }),
            true
          )}
          {renderDetailItem(getIcon(contrato.des_origem_ori), 'Origem', contrato.des_origem_ori)}
          {renderDetailItem('card-text-outline', 'Descrição', contrato.des_descricao_tsi)}
        </View>

        {/* Dependents Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dependentes</Text>
          {renderDetailItem(
            'account-multiple', 
            'Ver dependentes', 
            'Gerenciar dependentes',
            () => navigate('user-dependents-screen'),
            true
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  scrollContainer: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 4,
  },
  planName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    borderLeftWidth: 4,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#AF91F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  itemValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  linkText: {
    color: '#1a73e8',
  },
});

export default ContratosDetailScreen;