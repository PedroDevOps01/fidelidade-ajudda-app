import { Text, TouchableRipple, useTheme } from 'react-native-paper';
import { StyleSheet, View, Animated } from 'react-native';
import { maskBrazilianCurrency } from '../../utils/app-utils';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useEffect, useRef } from 'react';

interface ContractDetailCardProps {
  contract: Plano;
  onPress: () => void;
} 

export default function ContractDetailCard({ contract, onPress }: ContractDetailCardProps) {
  const { colors } = useTheme();
  const isPopular = contract.id_plano_pla === 72;
  const scaleValue = useRef(new Animated.Value(1)).current;
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

  return (
    <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
      <TouchableRipple 
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.touchable,
          isPopular && styles.popularTouchable
        ]}
        rippleColor="rgba(255, 255, 255, 0.2)"
      >
        <View style={[
          styles.card,
          isPopular && styles.popularCard
        ]}>
          {isPopular && (
            <View style={styles.popularBadge}>
              <Icon name="star" size={14} color="#FFF" />
              <Text style={styles.popularBadgeText}>POPULAR</Text>
            </View>
          )}

          <View style={styles.cardHeader}>
            <Text style={[
              styles.planName,
              { color: isPopular ? '#FFF' : colors.primary }
            ]}>
              {contract.des_nome_pla}
            </Text>
            {isPopular && (
              <Icon name="whatshot" size={24} color="#FFD700" />
            )}
          </View>

          <View style={styles.priceContainer}>
            <Text style={[
              styles.priceText,
              { color: isPopular ? '#FFF' : colors.primary }
            ]}>
              {maskBrazilianCurrency(contract.vlr_adesao_pla!)}
            </Text>
            <Text style={[
              styles.priceLabel,
              { color: isPopular ? 'rgba(255,255,255,0.8)' : '#666' }
            ]}>
              /mês
            </Text>
          </View>

          <View style={[styles.divider, { 
            backgroundColor: isPopular ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' 
          }]} />

          <View style={styles.featuresContainer}>
  {contract.des_descricao_pla
    ?.split(/\n|\|/) // divide por quebra de linha OU barra reta
    .map((feature, index) => (
      <View key={index} style={styles.featureItem}>
        <Icon
          name="check-circle"
          size={16}
          color={isPopular ? '#FFD700' : colors.primary}
          style={styles.featureIcon}
        />
        <Text
          style={[
            styles.featureText,
            { color: isPopular ? '#FFF' : colors.text }
          ]}
        >
          {feature.trim()} 
        </Text>
      </View>
    ))}
</View>


          {Number(contract.qtd_max_dependentes_pla) > 0 && (
            <View style={[
              styles.dependentsContainer,
              isPopular && styles.popularDependents
            ]}>
              <Icon 
                name="account-multiple" 
                size={18} 
                color={isPopular ? '#FFD700' : colors.primary} 
              />
              <Text style={[
                styles.dependentsText,
                { color: isPopular ? '#FFF' : colors.text }
              ]}>
                {`Até ${contract.qtd_max_dependentes_pla} dependente${Number(contract.qtd_max_dependentes_pla) > 1 ? 's' : ''} inclusos`}
              </Text>
            </View>
          )}

          <View style={[
            styles.selectButton,
            isPopular && styles.popularSelectButton
          ]}>
            <Text style={[
              styles.selectButtonText,
              isPopular && styles.popularSelectButtonText
            ]}>
              Selecionar Plano
            </Text>
            <Icon 
              name="arrow-right" 
              size={18} 
              color={isPopular ? colors.primary : '#FFF'} 
              style={styles.arrowIcon} 
            />
          </View>
        </View>
      </TouchableRipple>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  touchable: {
    borderRadius: 16,
    marginVertical: 8,
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    marginTop:15,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  popularTouchable: {
    backgroundColor: '#AF91F9',
    borderColor: 'transparent',
    shadowColor: '#AF91F9',
    shadowOpacity: 0.3,
  },
  card: {
    borderRadius: 16,
    padding: 24,
    overflow: 'hidden',
  },
  popularCard: {
    backgroundColor: '#AF91F9',
  },
  popularBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  popularBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  planName: {
    fontSize: 22,
    fontWeight: '700',
    flex: 1,
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
    backgroundColor: '#AF91F9',
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
    color: '#AF91F9',
  },
  arrowIcon: {
    marginLeft: 8,
  },
});