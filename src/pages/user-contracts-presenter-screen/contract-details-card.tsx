import { Text, TouchableRipple, useTheme } from 'react-native-paper';
import { StyleSheet, View, Animated, Alert } from 'react-native';
import { maskBrazilianCurrency } from '../../utils/app-utils';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { fetchPlanoPagamentoByPlanoPadrao, PaymentMethod } from './fetchPlanoPagamentoByPlanoPadrao';
import { fetchPlanoPagamentoByPlano } from './fetchPlanoPagamentoByPlano';
import { useAuth } from '../../context/AuthContext';
import { useDadosUsuario } from '../../context/pessoa-dados-context';
import { api } from '../../network/api';
import { goHome } from '../../router/navigationRef';
import { useAccquirePlan } from '../../context/accquirePlanContext';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Define the navigation stack param list
type RootStackParamList = {
  'user-contracts-payment-method': undefined;
  // ... other routes as needed
};

interface Plano {
  id_plano_pla: number;
  des_nome_pla: string;
  vlr_adesao_pla: number | null;
  des_descricao_pla: string;
  qtd_max_dependentes_pla: number;
  formasPagamento?: {
    label: string;
    value: number;
    num_parcelas_ppg: number;
    vlr_parcela_ppg: number;
    is_padrao_ppg: boolean | number;
  }[];
  isLoadingFormasPagamento?: boolean;
}

interface ContractDetailCardProps {
  contract: Plano;
  onPress: () => void;
}

export default function ContractDetailCard({ contract, onPress }: ContractDetailCardProps) {
  const { colors } = useTheme();
  const isPopular = contract.id_plano_pla === 72;
  const scaleValue = useRef(new Animated.Value(1)).current;
  const [formasPagamento, setFormasPagamento] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const { dadosUsuarioData } = useDadosUsuario();
  const { authData } = useAuth();
  const [selectingPlan, setSelectingPlan] = useState(false);
  const { setIsAnual, setPlano } = useAccquirePlan();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handlePressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  useEffect(() => {
    let isMounted = true;

    async function loadFormasPagamento() {
      try {
        setLoading(true);
        const data = await fetchPlanoPagamentoByPlanoPadrao(contract.id_plano_pla);
        if (isMounted) {
          setFormasPagamento(data);
        }
      } catch (err) {
        console.error('Erro ao buscar formas de pagamento', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadFormasPagamento();

    return () => {
      isMounted = false;
    };
  }, [contract.id_plano_pla]);

  const handlePlanSelection = async () => {
    if (dadosUsuarioData?.pessoaDados?.is_tipo_contratante_pda) {
      try {
        setSelectingPlan(true);
        const paymentMethods = await fetchPlanoPagamentoByPlano(contract.id_plano_pla, authData.access_token);
        if (paymentMethods.length === 0) {
          console.error('Nenhuma forma de pagamento encontrada para o plano.');
          return;
        }

        const selectedPaymentMethod = paymentMethods[0];
        const dataToSend = {
          id_pessoa_ctt: dadosUsuarioData.pessoaDados.id_pessoa_pes,
          id_plano_pagamento_ctt: selectedPaymentMethod.id_plano_pagamento_ppg,
          id_situacao_ctt: 15,
          id_origem_ctt: 12,
          id_vendedor_mdv_ctt: null,
        };

        const response = await api.post('/contrato/cortesia', dataToSend, {
          headers: {
            Authorization: `Bearer ${authData.access_token}`,
          },
        });

        console.log('Contrato cortesia criado com sucesso:', response.data);
        goHome();
      } catch (error) {
        console.error('Erro ao criar contrato cortesia:', error);
      } finally {
        setSelectingPlan(false);
      }
    } else {
      Alert.alert(
        "Escolha o tipo de pagamento",
        "Como você deseja pagar o plano?",
        [
          {
            text: "Mensal",
            onPress: () => {
              setIsAnual(false);
              setPlano(contract);
              navigation.navigate('user-contracts-payment-method');
            }
          },
          {
            text: "Anual",
            onPress: () => {
              setIsAnual(true);
              setPlano(contract);
              navigation.navigate('user-contracts-payment-method');
            }
          },
          {
            text: "Cancelar",
            style: "cancel"
          }
        ]
      );
    }
  };

  const CardContainer = View;

  return (
    <Animated.View 
      style={[
        { transform: [{ scale: scaleValue }] },
        styles.cardShadow
      ]}
    >
      <TouchableRipple
        onPress={selectingPlan ? undefined : handlePlanSelection}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.touchable, isPopular && styles.popularTouchable]}
        rippleColor="rgba(255, 255, 255, 0.2)"
        disabled={selectingPlan}
      >
        <CardContainer
          style={[styles.card, isPopular && styles.popularCard, { backgroundColor: isPopular ? '#A497FB' : '#FFF' }]}
        >
          <View style={styles.cardHeader}>
            <View style={styles.planNameContainer}>
              <Text style={[styles.planName, { color: isPopular ? '#FFF' : colors.primary }]}>
                {contract.des_nome_pla}
              </Text>
              {isPopular && (
                <View style={styles.popularIcon}>
                  <Icon name="whatshot" size={20} color="#FFD700" />
                </View>
              )}
            </View>
          </View>

          <View style={styles.priceContainer}>
            <Text style={[styles.priceText, { color: isPopular ? '#FFF' : '#2D3748' }]}>
              {contract.vlr_adesao_pla != null ? maskBrazilianCurrency(contract.vlr_adesao_pla) : 'N/A'}
            </Text>
            <Text style={[styles.priceLabel, { color: isPopular ? 'rgba(255,255,255,0.8)' : '#718096' }]}>
              Valor de adesão
            </Text>
          </View>

          <View style={styles.paymentMethodsContainer}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={isPopular ? '#FFD700' : colors.primary} />
                <Text style={[styles.loadingText, { color: isPopular ? '#FFF' : '#718096' }]}>
                  Carregando opções...
                </Text>
              </View>
            ) : (
              <View style={styles.paymentMethods}>
                {formasPagamento && formasPagamento.length > 0 ? (
                  <>
                    {/* FORMAS DE PAGAMENTO - cada uma com seu VALOR ANUAL */}
                    {formasPagamento.map((forma) => {
                      const totalAnual = Number(forma.num_parcelas_ppg) * Number(forma.vlr_parcela_ppg);
                      return (
                        <View 
                          key={forma.value} 
                          style={[
                            styles.paymentMethodItem,
                            forma.is_padrao_ppg ? styles.firstPaymentMethod : undefined,
                          ]}
                        >
                          <Icon
                            name="credit-card"
                            size={14}
                            color={isPopular ? '#FFD700' : colors.primary}
                            style={styles.paymentMethodIcon}
                          />
                          <View style={{ flex: 1 }}>
                            {/* Linha principal: parcelas x valor */}
                            <Text
                              style={[
                                styles.paymentMethodText,
                                { color: isPopular ? '#FFF' : '#4A5568' },
                              ]}
                            >
                              {forma.label}: {forma.num_parcelas_ppg}{' '}
                              {forma.num_parcelas_ppg > 1 ? 'parcelas' : 'parcela'} de{' '}
                              {maskBrazilianCurrency(forma.vlr_parcela_ppg)}
                            </Text>

                            {/* Sub-linha: Valor anual desse método */}
                            <View style={styles.anualRow}>
                              <Icon
                                name="calendar-today"
                                size={13}
                                color={isPopular ? '#FFD700' : '#A497FB'}
                                style={{ marginRight: 6 }}
                              />
                              <Text
                                style={[
                                  styles.anualLabel,
                                  { color: isPopular ? '#FFD700' : '#6B7280' },
                                ]}
                              >
                                Valor anual:{' '}
                              </Text>
                              <Text
                                style={[
                                  styles.anualValue,
                                  { color: isPopular ? '#FFD700' : '#4F46E5' },
                                ]}
                              >
                                {maskBrazilianCurrency(totalAnual)}
                              </Text>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </>
                ) : (
                  <View style={styles.noPaymentContainer} />
                )}
              </View>
            )}
          </View>

          <View style={[styles.divider, { backgroundColor: isPopular ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.08)' }]} />

          <View style={styles.featuresContainer}>
            {contract.des_descricao_pla
              ?.split(/\n|\|/)
              .filter((item) => item.trim() !== '')
              .slice(0, 4)
              .map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <Icon
                    name="check-circle"
                    size={16}
                    color={isPopular ? '#FFD700' : '#A497FB'}
                    style={styles.featureIcon}
                  />
                  <Text style={[styles.featureText, { color: isPopular ? '#FFF' : '#2D3748' }]}>
                    {feature.trim()}
                  </Text>
                </View>
              ))}
          </View>

          {Number(contract.qtd_max_dependentes_pla) > 0 && (
            <View style={[styles.dependentsContainer, isPopular && styles.popularDependents]}>
              <Icon
                name="family_restroom"
                size={18}
                color={isPopular ? '#FFD700' : colors.primary}
              />
              <Text style={[styles.dependentsText, { color: isPopular ? '#FFF' : '#4A5568' }]}>
                {`Até ${contract.qtd_max_dependentes_pla} dependente${Number(contract.qtd_max_dependentes_pla) > 1 ? 's' : ''} inclusos`}
              </Text>
            </View>
          )}

          <View style={[styles.selectButton, isPopular && styles.popularSelectButton]}>
            {selectingPlan ? (
              <ActivityIndicator size="small" color={isPopular ? '#A497FB' : '#FFF'} />
            ) : (
              <>
                <Text style={[styles.selectButtonText, isPopular && styles.popularSelectButtonText]}>
                  Selecionar Plano
                </Text>
                <Icon
                  name="arrow-forward"
                  size={18}
                  color={isPopular ? colors.primary : '#FFF'}
                  style={styles.arrowIcon}
                />
              </>
            )}
          </View>
        </CardContainer>
      </TouchableRipple>
    </Animated.View>
  );
}

// Styles
const styles = StyleSheet.create({
  cardShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    marginVertical: 8,
    marginHorizontal: 0,
    marginTop: 15,
  },
  touchable: {
    borderRadius: 16,
    marginVertical: 8,
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    marginTop: 15,
    borderWidth: 1,
    borderColor: '#EEE',
    overflow: 'hidden',
  },
  popularTouchable: {
    backgroundColor: '#A497FB',
    borderColor: 'transparent',
    shadowColor: '#A497FB',
    shadowOpacity: 0.3,
  },
  card: {
    borderRadius: 16,
    padding: 24,
    overflow: 'hidden',
    minHeight: 420,
  },
  popularCard: {
    minHeight: 120,
    backgroundColor: '#A497FB',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  planNameContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planName: {
    fontSize: 22,
    fontWeight: '700',
    flex: 1,
  },
  popularIcon: {
    padding: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  priceText: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  priceLabel: {
    fontSize: 16,
    marginBottom: 4,
    marginLeft: 4,
    fontWeight: '500',
  },
  paymentMethodsContainer: {
    marginBottom: 5,
  },
  loadingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  loadingText: {
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '500',
  },
  paymentMethods: {
    flexDirection: 'column',
    gap: 8,
  },
  paymentMethodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 12,
  },
  firstPaymentMethod: {
    backgroundColor: 'rgba(175, 145, 249, 0.1)',
    borderLeftWidth: 3,
    borderLeftColor: '#A497FB',
  },
  paymentMethodIcon: {
    marginRight: 8,
  },
  paymentMethodText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  anualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  anualLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  anualValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  noPaymentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    opacity: 0.7,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  featuresContainer: {
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureIcon: {
    marginRight: 8,
  },
  featureText: {
    fontSize: 15,
    flex: 1,
    fontWeight: '500',
  },
  dependentsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  popularDependents: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  dependentsText: {
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '500',
  },
  selectButton: {
    flexDirection: 'row',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#A497FB',
  },
  popularSelectButton: {
    backgroundColor: '#FFF',
  },
  selectButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  popularSelectButtonText: {
    color: '#A497FB',
  },
  arrowIcon: {
    marginLeft: 8,
  },
});
