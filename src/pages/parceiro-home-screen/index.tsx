import React, {useState} from 'react';
import {View, ScrollView, StyleSheet, Dimensions, Platform} from 'react-native';
import {
  ActivityIndicator,
  useTheme,
  Text,
  Avatar,
  Button,
  Card,
} from 'react-native-paper';
import {useNavigation} from '@react-navigation/native';
import {useAuth} from '../../context/AuthContext';
import {useDadosUsuario} from '../../context/pessoa-dados-context';
import {LinearGradient} from 'react-native-linear-gradient';
import {Alert} from 'react-native';
import {applyPhoneMask, logout} from '../../utils/app-utils';
import { useEffect } from 'react';

import { reset } from '../../router/navigationRef';
const {width, height} = Dimensions.get('window');

const ParceiroHomeScreen = () => {
  const navigation = useNavigation();
  const theme = useTheme();
    const {authData} = useAuth();
  const {colors} = useTheme();

  const {dadosUsuarioData, clearDadosUsuarioData, clearLoginDadosUsuarioData} = useDadosUsuario();

  const [loading, setLoading] = useState<boolean>(true);
  const [parceiroData, setParceiroData] = useState<ApiResponse<Parceiro>>();

  const [isInputAlertVisible, setIsInputAlertVisible] = useState<boolean>(false);
  const [hashPassword, setHashPassword] = useState<string>('');
const handleLogout = () => {
    Alert.alert('Aviso', 'Deseja sair do aplicativo?', [
      {
        text: 'não',
        onPress: () => null,
        style: 'cancel',
      },
      {
        text: 'Sim',
        onPress: () => {
          clearDadosUsuarioData();
          clearLoginDadosUsuarioData();
          logout(authData.access_token);
          reset([{name: "logged-home-screen"}], 0)
        },
      },
    ]);
    return true;
  };
  const features = [
    {
      id: 1,
      icon: 'package-variant',
      title: 'Catálogo',
      description: 'Acesse produtos e serviços',
      color: '#A497FB',
    },
    {
      id: 2,
      icon: 'plus-box',
      title: 'Cadastrar',
      description: 'Adicione novos itens',
      color: '#10b981',
    },
    {
      id: 3,
      icon: 'wrench',
      title: 'Manutenção',
      description: 'Gerencie seu conteúdo',
      color: '#f59e0b',
    },
  ];
useEffect(() => {
  // Simula carregamento por 1 segundo
  const timer = setTimeout(() => {
    setLoading(false);
  }, 1000);

  return () => clearTimeout(timer);
}, []);
  // Dimensions responsivas
  const isSmallScreen = width < 375;
  const isTablet = width > 768;

  return (
    <View style={[styles.outerContainer, {backgroundColor: theme.colors.background}]}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, {color: theme.colors.onSurface}]}>
            Carregando...
          </Text>
        </View>
      ) : (
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          {/* Header com Gradient */}
          <LinearGradient
            colors={['#A497FB', '#F1591E']}
            style={[
              styles.headerGradient,
              isSmallScreen && styles.headerGradientSmall
            ]}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
          >
            <View style={[
              styles.header,
              isSmallScreen && styles.headerSmall
            ]}>
              <View style={styles.avatarContainer}>
                <Avatar.Icon 
                  size={isSmallScreen ? 60 : isTablet ? 100 : 80} 
                  icon="account-tie" 
                  style={styles.avatar}
                  color="#A497FB"
                />
                <View style={styles.avatarBadge} />
              </View>
              <View style={styles.welcomeText}>
                <Text style={[
                  styles.greeting,
                  isSmallScreen && styles.greetingSmall
                ]}>Olá, Parceiro!</Text>
                <Text style={[
                  styles.subtitle,
                  isSmallScreen && styles.subtitleSmall
                ]}>
                  Gerencie seus produtos e serviços
                </Text>
              </View>
            </View>
          </LinearGradient>

          {/* Cards de Funcionalidades */}
          <View style={[
            styles.featuresSection,
            isSmallScreen && styles.featuresSectionSmall
          ]}>
            <Text style={[
              styles.sectionTitle,
              isSmallScreen && styles.sectionTitleSmall
            ]}>Funcionalidades</Text>
            <View style={[
              styles.featuresGrid,
              isSmallScreen && styles.featuresGridSmall
            ]}>
              {features.map((feature) => (
                <Card 
                  key={feature.id}
                  style={[
                    styles.featureCard,
                    isSmallScreen && styles.featureCardSmall,
                    isTablet && styles.featureCardTablet
                  ]}
                  mode="elevated"
                  elevation={Platform.OS === 'android' ? 2 : 4}
                  onPress={() => {
                    if (feature.id === 2) {
                      navigation.navigate('parceiro-produto-router');
                    }
                  }}
                >
                  <Card.Content style={[
                    styles.cardContent,
                    isSmallScreen && styles.cardContentSmall
                  ]}>
                    <View 
                      style={[
                        styles.iconContainer,
                        {backgroundColor: feature.color},
                        isSmallScreen && styles.iconContainerSmall
                      ]}
                    >
                      <Avatar.Icon 
                        icon={feature.icon} 
                        size={isSmallScreen ? 24 : 28}
                        color="#ffffff"
                        style={styles.cardIcon}
                      />
                    </View>
                    <Text style={[
                      styles.cardTitle,
                      isSmallScreen && styles.cardTitleSmall
                    ]}>{feature.title}</Text>
                    <Text style={[
                      styles.cardDescription,
                      isSmallScreen && styles.cardDescriptionSmall
                    ]}>{feature.description}</Text>
                  </Card.Content>
                </Card>
              ))}
            </View>
          </View>

          {/* Ação Principal */}
          <View style={[
            styles.primaryAction,
            isSmallScreen && styles.primaryActionSmall
          ]}>
            <Button
              mode="contained"
              icon="plus-circle-outline"
              onPress={() => navigation.navigate('parceiro-produto-router')}
              style={[
                styles.primaryButton,
                isSmallScreen && styles.primaryButtonSmall
              ]}
              contentStyle={styles.buttonContent}
              labelStyle={[
                styles.buttonLabel,
                isSmallScreen && styles.buttonLabelSmall
              ]}
            >
              Novo Produto/Serviço
            </Button>
          </View>

          {/* Status do Sistema */}
          <Card style={[
            styles.statusCard,
            isSmallScreen && styles.statusCardSmall
          ]}>
            <Card.Content style={styles.statusContent}>
              <View style={styles.statusInfo}>
                <View style={styles.statusIndicator}>
                  <View style={styles.statusDot} />
                </View>
                <View style={styles.statusTexts}>
                  <Text style={[
                    styles.statusTitle,
                    isSmallScreen && styles.statusTitleSmall
                  ]}>Sistema Online</Text>
                  <Text style={[
                    styles.statusDescription,
                    isSmallScreen && styles.statusDescriptionSmall
                  ]}>
                    Todas as funcionalidades disponíveis
                  </Text>
                </View>
              </View>
              <Avatar.Icon 
                icon="check-circle" 
                size={isSmallScreen ? 32 : 40}
                color="#10b981"
                style={styles.statusIcon}
              />
            </Card.Content>
          </Card>

          {/* Estatísticas Rápidas */}
          <View style={[
            styles.statsSection,
            isSmallScreen && styles.statsSectionSmall
          ]}>
            <Text style={[
              styles.sectionTitle,
              isSmallScreen && styles.sectionTitleSmall
            ]}>Visão Geral</Text>


             <Button
                          icon={'logout'}
                          mode="outlined"
                          onPress={handleLogout}>
                          Sair
                        </Button>
            <View style={[
              styles.statsGrid,
              isSmallScreen && styles.statsGridSmall
            ]}>
              <Card style={[
                styles.statCard,
                isSmallScreen && styles.statCardSmall
              ]}>
                <Card.Content style={[
                  styles.statContent,
                  isSmallScreen && styles.statContentSmall
                ]}>
                  <Text style={[
                    styles.statNumber,
                    isSmallScreen && styles.statNumberSmall
                  ]}>0</Text>
                  <Text style={[
                    styles.statLabel,
                    isSmallScreen && styles.statLabelSmall
                  ]}>Produtos</Text>
                </Card.Content>
              </Card>
              <Card style={[
                styles.statCard,
                isSmallScreen && styles.statCardSmall
              ]}>
                <Card.Content style={[
                  styles.statContent,
                  isSmallScreen && styles.statContentSmall
                ]}>
                  <Text style={[
                    styles.statNumber,
                    isSmallScreen && styles.statNumberSmall
                  ]}>0</Text>
                  <Text style={[
                    styles.statLabel,
                    isSmallScreen && styles.statLabelSmall
                  ]}>Serviços</Text>
                </Card.Content>
              </Card>
              <Card style={[
                styles.statCard,
                isSmallScreen && styles.statCardSmall
              ]}>
                <Card.Content style={[
                  styles.statContent,
                  isSmallScreen && styles.statContentSmall
                ]}>
                  <Text style={[
                    styles.statNumber,
                    isSmallScreen && styles.statNumberSmall
                  ]}>0</Text>
                  <Text style={[
                    styles.statLabel,
                    isSmallScreen && styles.statLabelSmall
                  ]}>Ativos</Text>
                </Card.Content>
              </Card>
            </View>
          </View>

          {/* Espaço extra para iOS */}
          {Platform.OS === 'ios' && <View style={styles.iosSpacer} />}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },
  headerGradient: {
    
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingTop: Platform.OS === 'ios' ? 45 : 50,
    paddingBottom: 20,
    marginBottom: 24,
  },
  headerGradientSmall: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 24,
  },
  header: {
    paddingBottom: 84,
        paddingEnd: 24,
    paddingStart: 24,

    flexDirection: 'row',
    alignItems: 'center',
  },
  headerSmall: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    backgroundColor: '#ffffff',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    backgroundColor: '#10b981',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  welcomeText: {
    flex: 1,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  greetingSmall: {
    fontSize: 20,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 16,
    color: '#e0e7ff',
    fontWeight: '400',
  },
  subtitleSmall: {
    fontSize: 14,
  },
  featuresSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  featuresSectionSmall: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    color: '#1f2937',
  },
  sectionTitleSmall: {
    fontSize: 18,
    marginBottom: 12,
  },
  featuresGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  featuresGridSmall: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  featureCard: {
    flex: 1,
    borderRadius: 16,
    marginHorizontal: 4,
    backgroundColor: '#ffffff',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  featureCardSmall: {
    borderRadius: 12,
    marginHorizontal: 2,
  },
  featureCardTablet: {
    marginHorizontal: 8,
  },
  cardContent: {
    alignItems: 'center',
    padding: 20,
  },
  cardContentSmall: {
    padding: 16,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainerSmall: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: 8,
  },
  cardIcon: {
    backgroundColor: 'transparent',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
    color: '#1f2937',
  },
  cardTitleSmall: {
    fontSize: 13,
    marginBottom: 2,
  },
  cardDescription: {
    fontSize: 12,
    textAlign: 'center',
    color: '#6b7280',
    lineHeight: 16,
  },
  cardDescriptionSmall: {
    fontSize: 11,
    lineHeight: 14,
  },
  primaryAction: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  primaryActionSmall: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  primaryButton: {
    borderRadius: 12,
    backgroundColor: '#A497FB',
    ...Platform.select({
      ios: {
        shadowColor: '#A497FB',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  primaryButtonSmall: {
    borderRadius: 10,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  buttonLabelSmall: {
    fontSize: 14,
  },
  statusCard: {
    marginHorizontal: 24,
    marginBottom: 24,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderWidth: 1,
  },
  statusCardSmall: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
  },
  statusContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusIndicator: {
    marginRight: 12,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10b981',
  },
  statusTexts: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  statusTitleSmall: {
    fontSize: 15,
  },
  statusDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  statusDescriptionSmall: {
    fontSize: 13,
  },
  statusIcon: {
    backgroundColor: 'transparent',
  },
  statsSection: {
    paddingHorizontal: 24,
  },
  statsSectionSmall: {
    paddingHorizontal: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statsGridSmall: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    marginHorizontal: 4,
    backgroundColor: '#ffffff',
    borderColor: '#f3f4f6',
    borderWidth: 1,
  },
  statCardSmall: {
    borderRadius: 10,
    marginHorizontal: 2,
  },
  statContent: {
    alignItems: 'center',
    padding: 16,
  },
  statContentSmall: {
    padding: 12,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#A497FB',
    marginBottom: 4,
  },
  statNumberSmall: {
    fontSize: 20,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  statLabelSmall: {
    fontSize: 11,
  },
  iosSpacer: {
    height: 20,
  },
});

export default ParceiroHomeScreen;