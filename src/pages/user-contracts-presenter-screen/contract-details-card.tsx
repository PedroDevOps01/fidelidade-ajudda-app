import { Text, TouchableRipple, useTheme } from 'react-native-paper';
import { StyleSheet, View, Animated } from 'react-native';
import { maskBrazilianCurrency } from '../../utils/app-utils';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { fetchPlanoPagamentoByPlanoPadrao, PaymentMethod } from './fetchPlanoPagamentoByPlanoPadrao';
import { fetchPlanoPagamentoByPlano, PaymentMethodCortesia } from './fetchPlanoPagamentoByPlano';
import { useAuth } from '../../context/AuthContext';
import LinearGradient from 'react-native-linear-gradient';
import { useDadosUsuario } from '../../context/pessoa-dados-context';
import { api } from '../../network/api';
import { goHome } from '../../router/navigationRef';

interface ContractDetailCardProps {
  contract: Plano;
  onPress: () => void;
}

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

export default function ContractDetailCard({ contract, onPress }: ContractDetailCardProps) {
  const { colors } = useTheme();
  const isPopular = contract.id_plano_pla === 72;
  const scaleValue = useRef(new Animated.Value(1)).current;
  const [formasPagamento, setFormasPagamento] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const { dadosUsuarioData } = useDadosUsuario();
  const { authData } = useAuth();
  const [selectingPlan, setSelectingPlan] = useState(false);

// console.log(JSON.stringify(dadosUsuarioData, null, 2));
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
      setSelectingPlan(true); // 👈 novo estado

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

      goHome(); // ✅ redireciona
    } catch (error) {
      console.error('Erro ao criar contrato cortesia:', error);
    } finally {
      setSelectingPlan(false); // 👈 reset do estado
    }
  } else {
    onPress();
  }
};


  const CardContainer = isPopular ? LinearGradient : View;

  return (
    <Animated.View 
      style={[
        { transform: [{ scale: scaleValue }] },
        styles.cardShadow
      ]}
    >
      <TouchableRipple
        onPress={handlePlanSelection}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.touchable, isPopular && styles.popularTouchable]}
        rippleColor="rgba(255, 255, 255, 0.3)"
      >
        <CardContainer
          colors={isPopular ? ['#ea7c5bc2', '#AF91F9'] : ['#FFF', '#FFF']}
          style={[styles.card, isPopular && styles.popularCard]}
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

          {/* Payment Methods Section */}
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
                  formasPagamento.map((forma, index) => (
                    <View 
                      key={forma.value} 
                      style={[
                        styles.paymentMethodItem,
                        index === 0 && styles.firstPaymentMethod
                      ]}
                    >
                      <Icon
                        name="credit-card"
                        size={14}
                        color={isPopular ? '#FFD700' : colors.primary}
                        style={styles.paymentMethodIcon}
                      />
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
                    </View>
                  ))
                ) : (
                  <View style={styles.noPaymentContainer}>
                   
                  </View>
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
                    color={isPopular ? '#FFD700' : '#48BB78'}
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
    <ActivityIndicator size="small" color={isPopular ? '#AF91F9' : '#FFF'} />
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

// Styles remain the same
const styles = StyleSheet.create({
  cardShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    marginVertical: 8,
    marginHorizontal: 4,
  },
  touchable: {
    borderRadius: 20,
    backgroundColor: '#FFF',
    overflow: 'hidden',
  },
  popularTouchable: {
    shadowColor: '#ea7c5bc2',
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  card: {
    borderRadius: 20,
    padding: 24,
    position: 'relative',
  },
  popularCard: {
    minHeight: 420,
  },
  cardHeader: {
    marginBottom: 16,
  },
  planNameContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planName: {
    fontSize: 24,
    fontWeight: '800',
    flex: 1,
    letterSpacing: -0.5,
  },
  popularIcon: {
    padding: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
  },
  priceContainer: {
    marginBottom: 20,
  },
  priceText: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -1,
  },
  priceLabel: {
    fontSize: 15,
    marginTop: 4,
    fontWeight: '500',
    opacity: 0.9,
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
    borderLeftColor: '#AF91F9',
  },
  paymentMethodIcon: {
    marginRight: 8,
  },
  paymentMethodText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  noPaymentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    opacity: 0.7,
  },
  noPaymentText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  featuresContainer: {
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  featureIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  featureText: {
    fontSize: 15,
    flex: 1,
    fontWeight: '500',
    lineHeight: 20,
  },
  dependentsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  popularDependents: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  dependentsText: {
    fontSize: 14,
    marginLeft: 10,
    fontWeight: '600',
  },
  selectButton: {
    flexDirection: 'row',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#AF91F9',
    shadowColor: '#AF91F9',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  popularSelectButton: {
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOpacity: 0.1,
  },
  selectButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  popularSelectButtonText: {
    color: '#ea7c5bc2',
  },
  arrowIcon: {
    marginLeft: 8,
  },
});