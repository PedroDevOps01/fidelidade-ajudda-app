import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Modal, FlatList, Dimensions } from 'react-native';
import { ActivityIndicator, Text, useTheme, FAB, Button } from 'react-native-paper';
import dayjs from 'dayjs';
import { maskBrazilianCurrency } from '../../utils/app-utils';
import { navigate } from '../../router/navigationRef';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { api } from '../../network/api';
import { generateRequestHeader } from '../../utils/app-utils';
import LoadingFull from '../../components/loading-full';
import { fetchPlanoPagamentoByPlano, PaymentMethodCortesia } from '../user-contracts-presenter-screen/fetchPlanoPagamentoByPlano';
import { goHome } from '../../router/navigationRef';
import { toast } from 'sonner-native';
import { useAuth } from '../../context/AuthContext';
import { useDadosUsuario } from '../../context/pessoa-dados-context';

interface ContratoResponse {
  id_contrato_ctt: number;
  des_nome_pes: string;
  dth_cadastro_ctt: string;
  des_nome_pla: string;
  vlr_inicial_ctt: number;
  qtd_parcelas_ctt: number;
  qtd_max_dependentes_pla: number;
  vlr_dependente_adicional_pla: number;
  vlr_exclusao_dependente_pla: number;
  inclui_telemedicina_pla: boolean;
  is_ativo_ctt: boolean;
  id_plano_ctt: number;
}

interface Plan {
  id_plano_pla: number;
  des_nome_pla: string;
}

interface ContratosDetailScreenProps {
  contrato: ContratoResponse;
  title: string;
}

const { width } = Dimensions.get('window');

const ContratosDetailScreen = ({ contrato, title }: ContratosDetailScreenProps) => {
  const theme = useTheme();
  const { authData } = useAuth();
  const { dadosUsuarioData } = useDadosUsuario();

  const [loading, setLoading] = useState<boolean>(false);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [planDropdownVisible, setPlanDropdownVisible] = useState<boolean>(false);
  const [paymentDropdownVisible, setPaymentDropdownVisible] = useState<boolean>(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodCortesia[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<number | null>(null);
  const [selectedPlanName, setSelectedPlanName] = useState<string>('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<number | null>(null);
  const [selectedPaymentMethodName, setSelectedPaymentMethodName] = useState<string>('');

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
        style={[
          styles.detailItem,
          action && styles.detailItemAction
        ]} 
        onPress={action}
        activeOpacity={action ? 0.7 : 1}
      >
        <View style={[
          styles.iconContainer,
          { backgroundColor: theme.colors.primaryContainer }
        ]}>
          <Icon 
            name={icon} 
            size={20} 
            color={theme.colors.onPrimaryContainer} 
          />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.itemTitle}>{title}</Text>
          <Text style={[
            styles.itemValue, 
            isLink && styles.linkText,
            { color: theme.colors.onSurface }
          ]}>
            {value}
          </Text>
        </View>
        {action && (
          <Icon 
            name="chevron-right" 
            size={20} 
            color={theme.colors.outline} 
          />
        )}
      </TouchableOpacity>
    );
  };

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const response = await api.get('/plano?is_ativo_pla=1&is_plano_b2b_pla=0', generateRequestHeader(authData?.access_token));
      const { data } = response;
      setPlans(data.response.data);
    } catch (err: any) {
      console.error('Erro ao buscar planos:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentMethods = async (planoId: number) => {
    setLoading(true);
    try {
      const paymentMethods = await fetchPlanoPagamentoByPlano(planoId, authData.access_token);
      setPaymentMethods(paymentMethods);
    } catch (err: any) {
      console.error('Erro ao buscar formas de pagamento:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      await fetchPlans();
    })();
  }, []);

  const handlePlanSelect = (plan: Plan) => {
    setSelectedPlan(plan.id_plano_pla);
    setSelectedPlanName(plan.des_nome_pla);
    setPlanDropdownVisible(false);
    setSelectedPaymentMethod(null);
    setSelectedPaymentMethodName('');
    fetchPaymentMethods(plan.id_plano_pla);
  };

  const handlePaymentMethodSelect = (paymentMethod: PaymentMethodCortesia) => {
    setSelectedPaymentMethod(paymentMethod.id_plano_pagamento_ppg);
    setSelectedPaymentMethodName(paymentMethod.label);
    setPaymentDropdownVisible(false);
  };

  const handleUpgradeContrato = async () => {
    if (!selectedPlan || !selectedPaymentMethod) {
      console.error('Selecione um plano e uma forma de pagamento.');
      return;
    }

    try {
      setLoading(true);
      const dataToSend = {
        id_plano_ctt: selectedPlan,
        id_plano_pagamento_ctt: selectedPaymentMethod,
      };

      const response = await api.post(`/contrato/upgrade/${contrato.id_contrato_ctt}`, dataToSend, {
        headers: {
          Authorization: `Bearer ${authData.access_token}`,
        },
      });

      console.log('Contrato atualizado com sucesso:', response.data);
      goHome();
      
      setModalVisible(false);
    } catch (error) {
      console.error('Erro ao atualizar contrato:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !modalVisible) {
    return <LoadingFull />;
  }

  if (!contrato) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <Icon name="file-document-outline" size={48} color={theme.colors.outline} />
        <Text style={[styles.emptyText, { color: theme.colors.outline }]}>
          Nenhum dado disponível
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        

        {/* Status Card */}
        <View style={[
          styles.statusCard,
          { 
            backgroundColor: contrato.is_ativo_ctt 
              ? theme.colors.surfaceVariant 
              : theme.colors.errorContainer,
            borderLeftColor: contrato.is_ativo_ctt 
              ? theme.colors.primary 
              : theme.colors.error
          }
        ]}>
          <View style={styles.statusContent}>
            <Icon 
              name={contrato.is_ativo_ctt ? 'check-circle' : 'close-circle'} 
              size={20} 
              color={contrato.is_ativo_ctt ? theme.colors.primary : theme.colors.error} 
            />
            <View style={styles.statusTextContainer}>
              <Text style={[
                styles.statusText,
                { 
                  color: contrato.is_ativo_ctt 
                    ? theme.colors.onSurfaceVariant 
                    : theme.colors.onErrorContainer 
                }
              ]}>
                {contrato.is_ativo_ctt ? 'Plano Ativo' : 'Plano Inativo'}
              </Text>
              <Text style={[
                styles.statusSubtext,
                { 
                  color: contrato.is_ativo_ctt 
                    ? theme.colors.onSurfaceVariant 
                    : theme.colors.onErrorContainer 
                }
              ]}>
                {contrato.is_ativo_ctt ? 'Seu plano está ativo e funcionando' : 'Seu plano está inativo'}
              </Text>
            </View>
          </View>
        </View>

        {/* User Info Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="account" size={20} color={theme.colors.primary} />
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Informações do Titular
            </Text>
          </View>
          <View style={styles.sectionContent}>
            {renderDetailItem('account-outline', 'Nome do Cliente', contrato.des_nome_pes)}
            {renderDetailItem('calendar-outline', 'Data de Cadastro', dayjs(contrato.dth_cadastro_ctt).format('DD/MM/YYYY'))}
          </View>
        </View>

        {/* Plan Details Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="package-variant" size={20} color={theme.colors.primary} />
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Detalhes do Plano
            </Text>
          </View>
          <View style={styles.sectionContent}>
            {renderDetailItem('tag-outline', 'Nome do Plano', contrato.des_nome_pla || '—')}
            {renderDetailItem('currency-usd', 'Valor Inicial', maskBrazilianCurrency(contrato.vlr_inicial_ctt))}
            {renderDetailItem(
              'file-document-multiple-outline', 
              'Parcelas', 
              `${contrato.qtd_parcelas_ctt} (Ver parcelas)`,
              () => navigate('contrato-parcela-details', { idContrato: contrato.id_contrato_ctt }),
              true
            )}
            {renderDetailItem('account-multiple-plus-outline', 'Qtd. Máx. de Dependentes', `${contrato.qtd_max_dependentes_pla || 0}`)}
            {renderDetailItem('account-plus-outline', 'Valor Dependente Adicional', maskBrazilianCurrency(contrato.vlr_dependente_adicional_pla || 0))}
            {renderDetailItem('account-minus-outline', 'Valor Exclusão de Dependente', maskBrazilianCurrency(contrato.vlr_exclusao_dependente_pla || 0))}
            {renderDetailItem('stethoscope', 'Inclui Telemedicina', contrato.inclui_telemedicina_pla ? 'Sim' : 'Não')}
          </View>
        </View>

        {/* Dependents Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="account-group" size={20} color={theme.colors.primary} />
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Dependentes
            </Text>
          </View>
          <View style={styles.sectionContent}>
            {renderDetailItem(
              'account-multiple-outline', 
              'Ver dependentes', 
              'Gerenciar dependentes',
              () => navigate('user-dependents-screen'),
              true
            )}
          </View>
        </View>
      </ScrollView>

      {/* FAB */}
      {!dadosUsuarioData?.pessoaDados?.is_tipo_contratante_pda && (
        <FAB
          icon="pencil"
          style={[
            styles.fab, 
            { 
              backgroundColor: theme.colors.primary,
              shadowColor: theme.colors.shadow
            }
          ]}
          color={theme.colors.onPrimary}
          onPress={() => setModalVisible(true)}
          size="medium"
        />
      )}

      {/* Modal for Plan and Payment Method Selection */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.onSurface }]}>
                Atualizar Plano
              </Text>
              <TouchableOpacity 
                onPress={() => setModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <Icon name="close" size={24} color={theme.colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>
            
            <Text style={[styles.modalSubtitle, { color: theme.colors.onSurfaceVariant }]}>
              Selecione o novo plano e forma de pagamento
            </Text>

            <View style={styles.modalForm}>
              {/* Plan Selection */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: theme.colors.onSurface }]}>
                  Plano
                </Text>
                <TouchableOpacity
                  style={[
                    styles.dropdownButton,
                    { 
                      borderColor: planDropdownVisible ? theme.colors.primary : theme.colors.outline,
                      backgroundColor: theme.colors.surface
                    }
                  ]}
                  onPress={() => setPlanDropdownVisible(!planDropdownVisible)}
                >
                  <Text style={[
                    styles.dropdownText,
                    { color: selectedPlanName ? theme.colors.onSurface : theme.colors.onSurfaceVariant }
                  ]}>
                    {selectedPlanName || 'Selecione um plano'}
                  </Text>
                  <Icon 
                    name={planDropdownVisible ? 'chevron-up' : 'chevron-down'} 
                    size={20} 
                    color={theme.colors.onSurfaceVariant} 
                  />
                </TouchableOpacity>
                {planDropdownVisible && (
                  <View style={[
                    styles.dropdownContainer,
                    { 
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.outline,
                      shadowColor: theme.colors.shadow
                    }
                  ]}>
                    <FlatList
                      data={plans}
                      keyExtractor={(item) => item.id_plano_pla.toString()}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={[
                            styles.dropdownItem,
                            { 
                              borderBottomColor: theme.colors.outline,
                              backgroundColor: selectedPlan === item.id_plano_pla 
                                ? theme.colors.primaryContainer 
                                : 'transparent'
                            }
                          ]}
                          onPress={() => handlePlanSelect(item)}
                        >
                          <Text style={[
                            styles.dropdownItemText,
                            { 
                              color: selectedPlan === item.id_plano_pla 
                                ? theme.colors.onPrimaryContainer 
                                : theme.colors.onSurface
                            }
                          ]}>
                            {item.des_nome_pla}
                          </Text>
                        </TouchableOpacity>
                      )}
                      style={styles.dropdownList}
                      showsVerticalScrollIndicator={false}
                    />
                  </View>
                )}
              </View>

              {/* Payment Method Selection */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: theme.colors.onSurface }]}>
                  Forma de Pagamento
                </Text>
                <TouchableOpacity
                  style={[
                    styles.dropdownButton,
                    { 
                      borderColor: paymentDropdownVisible ? theme.colors.primary : theme.colors.outline,
                      backgroundColor: theme.colors.surface,
                      opacity: selectedPlan ? 1 : 0.6
                    }
                  ]}
                  onPress={() => selectedPlan && setPaymentDropdownVisible(!paymentDropdownVisible)}
                  disabled={!selectedPlan}
                >
                  <Text style={[
                    styles.dropdownText,
                    { 
                      color: selectedPaymentMethodName 
                        ? theme.colors.onSurface 
                        : theme.colors.onSurfaceVariant
                    }
                  ]}>
                    {selectedPaymentMethodName || 'Selecione a forma de pagamento'}
                  </Text>
                  <Icon 
                    name={paymentDropdownVisible ? 'chevron-up' : 'chevron-down'} 
                    size={20} 
                    color={theme.colors.onSurfaceVariant} 
                  />
                </TouchableOpacity>
                {paymentDropdownVisible && (
                  <View style={[
                    styles.dropdownContainer,
                    { 
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.outline,
                      shadowColor: theme.colors.shadow
                    }
                  ]}>
                    <FlatList
                      data={paymentMethods}
                      keyExtractor={(item) => item.id_plano_pagamento_ppg.toString()}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={[
                            styles.dropdownItem,
                            { 
                              borderBottomColor: theme.colors.outline,
                              backgroundColor: selectedPaymentMethod === item.id_plano_pagamento_ppg 
                                ? theme.colors.primaryContainer 
                                : 'transparent'
                            }
                          ]}
                          onPress={() => handlePaymentMethodSelect(item)}
                        >
                          <Text style={[
                            styles.dropdownItemText,
                            { 
                              color: selectedPaymentMethod === item.id_plano_pagamento_ppg 
                                ? theme.colors.onPrimaryContainer 
                                : theme.colors.onSurface
                            }
                          ]}>
                            {item.label}
                          </Text>
                        </TouchableOpacity>
                      )}
                      style={styles.dropdownList}
                      showsVerticalScrollIndicator={false}
                    />
                  </View>
                )}
              </View>
            </View>

            <View style={styles.modalButtons}>
              <Button
                mode="outlined"
                onPress={() => setModalVisible(false)}
                style={[styles.button, styles.cancelButton]}
                labelStyle={{ color: theme.colors.primary }}
              >
                Cancelar
              </Button>
              <Button
                mode="contained"
                onPress={handleUpgradeContrato}
                disabled={loading || !selectedPlan || !selectedPaymentMethod}
                style={styles.button}
                contentStyle={styles.confirmButtonContent}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={theme.colors.onPrimary} />
                ) : (
                  'Confirmar Atualização'
                )}
              </Button>
            </View>
          </View>
        </View>
      </Modal>
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
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    fontWeight: '400',
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusCard: {
    borderRadius: 12,
    marginBottom: 32,
    padding: 20,
    borderLeftWidth: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  statusTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  statusSubtext: {
    fontSize: 14,
    fontWeight: '400',
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
  },
  sectionContent: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    overflow: 'hidden',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  detailItemAction: {
    paddingRight: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 4,
  },
  itemValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  linkText: {
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    margin: 24,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 0,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    paddingHorizontal: 40,
    paddingTop: 18,
    paddingBottom: 24,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalForm: {
    paddingHorizontal: 24,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1.5,
            borderColor: '#A497FB', // usa a cor principal do tema

    borderRadius: 12,
    marginBottom: 8,
  },
  dropdownText: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  dropdownContainer: {
    maxHeight: 200,
    borderWidth: 1.5,
        borderColor: '#A497FB', // usa a cor principal do tema

    borderRadius: 12,
    marginTop: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  dropdownList: {
    borderRadius: 12,
  },
  dropdownItem: {
    padding: 16,
    borderBottomWidth: 1,
  },
  dropdownItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
  modalButtons: {
    flexDirection: 'row',
    padding: 24,
    paddingTop: 6,
    gap: 12,
  },
  button: {
    flex: 1,
    borderRadius: 12,
  },
  cancelButton: {
    borderWidth: 1.5,
            borderColor: '#A497FB', // usa a cor principal do tema

  },

});

export default ContratosDetailScreen;