import { View, StyleSheet, SafeAreaView, TouchableOpacity, Dimensions } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useLayoutEffect } from 'react';
import { Platform } from 'react-native';
import { navigate } from '../../router/navigationRef';
import { useDadosUsuario } from '../../context/pessoa-dados-context';
import { Alert } from 'react-native';
import { reset as resetNavigation } from '../../router/navigationRef';
import { useAuth } from '../../context/AuthContext';
import { useConsultas } from '../../context/consultas-context';
import { useExames } from '../../context/exames-context';
import { logout } from '../../utils/app-utils';

const { width } = Dimensions.get('window');

const UserDataScreen = ({ navigation }: { navigation: any }) => {
  const theme = useTheme();
  const { colors } = theme;
  const { dadosUsuarioData, clearLoginDadosUsuarioData, clearDadosUsuarioData } = useDadosUsuario();
  const { clearSelectedExams } = useExames();
  const { authData, clearAuthData } = useAuth();
  const { setUserSchedulesData } = useConsultas();

  const handleLogout = () => {
    Alert.alert('Aviso', 'Deseja sair do aplicativo?', [
      {
        text: 'Não',
        onPress: () => null,
        style: 'cancel',
      },
      {
        text: 'Sim',
        onPress: () => {
          clearDadosUsuarioData();
          clearLoginDadosUsuarioData();
          clearAuthData();
          setUserSchedulesData([]);
          clearSelectedExams();
          logout(authData.access_token);
          resetNavigation([{ name: 'logged-home-screen' }]);
        },
      },
    ]);
    return true;
  };

  useLayoutEffect(() => {
    navigation.setOptions({ 
      headerShown: true,
      title: '',
      headerTitleAlign: 'center',
      headerStyle: { 
        backgroundColor: theme.colors.primary,
        elevation: 0,
        shadowOpacity: 0,
        borderBottomWidth: 0,
      },
      headerTintColor: theme.colors.onPrimary,
      headerTitleStyle: {
        fontSize: 20,
        fontWeight: '700',
      },
    });
  }, [navigation]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      
      {/* Header com Gradiente */}
      <View style={[styles.headerContainer, { backgroundColor: theme.colors.primary }]}>
        <View style={styles.headerContent}>
          <View style={[styles.avatarContainer, { backgroundColor: theme.colors.onPrimary }]}>
            <Icon 
              name="account" 
              size={40} 
              color={theme.colors.primary} 
            />
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.greeting, { color: theme.colors.onPrimary }]}>
              Olá, {dadosUsuarioData.pessoaDados?.des_nome_pes || 'Usuário'}!
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: theme.colors.onPrimary }]}>
              <Text style={[styles.statusText, { color: theme.colors.primary }]}>
                {dadosUsuarioData.pessoaDados?.id_situacao_pda == 1 ? 'Plano Ativo' : 'Sem Plano'}
              </Text>
            </View>
          </View>
        </View>
        <View style={[styles.headerWave, { backgroundColor: theme.colors.background }]} />
      </View>

      {/* Cards de Opções */}
      <View style={styles.optionsContainer}>
        {/* Dados pessoais */}
        <TouchableOpacity 
          style={[
            styles.optionCard, 
            { 
              backgroundColor: theme.colors.surface,
              shadowColor: theme.colors.shadow,
            }
          ]} 
          onPress={() => navigation.navigate('user-personal-data-screen')}
        >
          <View style={[
            styles.optionIconContainer,
            { backgroundColor: theme.colors.primaryContainer }
          ]}>
            <Icon name="account-edit" size={24} color={theme.colors.onPrimaryContainer} />
          </View>
          <View style={styles.optionTextContainer}>
            <Text style={[styles.optionTitle, { color: theme.colors.onSurface }]}>
              Dados Pessoais
            </Text>
            <Text style={[styles.optionSubtitle, { color: theme.colors.onSurfaceVariant }]}>
              Atualize suas informações
            </Text>
          </View>
          <View style={[
            styles.optionArrow,
           
          ]}>
            <Icon name="chevron-right" size={20} color={theme.colors.onSurfaceVariant} />
          </View>
        </TouchableOpacity>

        {/* Cartões de crédito e Meu Plano */}
        {dadosUsuarioData.pessoaDados?.id_situacao_pda == 1 && (
          <>
            {/* Cartões de Crédito */}
            <TouchableOpacity 
              style={[
                styles.optionCard, 
                { 
                  backgroundColor: theme.colors.surface,
                  shadowColor: theme.colors.shadow,
                }
              ]} 
              onPress={() => navigation.navigate('user-personal-credit-cards-screen')}
            >
              <View style={[
                styles.optionIconContainer,
                { backgroundColor: '#4CAF50' }
              ]}>
                <Icon name="credit-card-settings" size={24} color="#FFFFFF" />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={[styles.optionTitle, { color: theme.colors.onSurface }]}>
                  Cartões de Crédito
                </Text>
                <Text style={[styles.optionSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                  Gerencie seus cartões
                </Text>
              </View>
              <View style={[
                styles.optionArrow,
              ]}>
                <Icon name="chevron-right" size={20} color={theme.colors.onSurfaceVariant} />
              </View>
            </TouchableOpacity>

            {/* Meu Plano */}
            <TouchableOpacity
              style={[
                styles.optionCard, 
                { 
                  backgroundColor: theme.colors.surface,
                  shadowColor: theme.colors.shadow,
                }
              ]}
              onPress={() => {
                if (dadosUsuarioData.pessoaAssinatura?.id_contrato_ctt) {
                  navigate('user-contracts-stack');
                  return;
                }
                navigate('new-contract-stack');
              }}>
              <View style={[
                styles.optionIconContainer,
                { backgroundColor: theme.colors.secondary }
              ]}>
                <Icon name="shield-account" size={24} color={theme.colors.onSecondary} />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={[styles.optionTitle, { color: theme.colors.onSurface }]}>
                  Meu Plano
                </Text>
                <Text style={[styles.optionSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                  Detalhes e benefícios
                </Text>
              </View>
              <View style={[
                styles.optionArrow,
              ]}>
                <Icon name="chevron-right" size={20} color={theme.colors.onSurfaceVariant} />
              </View>
            </TouchableOpacity>
          </>
        )}

        {/* Carteirinha (comentada) */}
        {/* {dadosUsuarioData.pessoaDados?.id_pessoa_pes != 0 && (
          <TouchableOpacity style={styles.optionCard} onPress={() => navigation.navigate('user-personal-carteirinha-screen')}>
            <View style={styles.optionIconContainer}>
              <Icon name="card-account-details" size={24} color={theme.colors.onTertiary} />
            </View>
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionTitle}>Carteirinha</Text>
              <Text style={styles.optionSubtitle}>Visualize sua carteirinha</Text>
            </View>
            <Icon name="chevron-right" size={24} color="#999" />
          </TouchableOpacity>
        )} */}

        {/* Botão Sair */}
        <TouchableOpacity 
          style={[
            styles.logoutButton,
            { 
             backgroundColor: theme.colors.surface,
                  shadowColor: theme.colors.shadow,
            }
          ]}
          onPress={handleLogout}
        >
          <View style={[
            styles.logoutIconContainer,
            { backgroundColor: theme.colors.errorContainer }
          ]}>
            <Icon name="logout" size={20} color={theme.colors.onErrorContainer} />
          </View>
          <Text style={[styles.logoutText, { color: theme.colors.error }]}>
            Sair do Aplicativo
          </Text>
        </TouchableOpacity>
      </View>

      {/* Decoração de Fundo */}
      <View style={styles.backgroundDecoration}>
        <View style={[styles.circle1, { backgroundColor: theme.colors.primaryContainer }]} />
        <View style={[styles.circle2, { backgroundColor: theme.colors.secondaryContainer }]} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    paddingTop: 1,
    paddingBottom: 50,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 70,
    height: 70,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  userInfo: {
    flex: 1,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  headerWave: {
    position: 'absolute',
    bottom: -20,
    left: 0,
    right: 0,
    height: 40,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  optionsContainer: {
    flex: 1,
    padding: 20,
    marginTop: -20,
    zIndex: 1,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  optionIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  optionSubtitle: {
    fontSize: 13,
    fontWeight: '400',
  },
  optionArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 16,
    marginTop: 20,
     shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  logoutIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  backgroundDecoration: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  circle1: {
    position: 'absolute',
    top: '30%',
    right: -50,
    width: 100,
    height: 100,
    borderRadius: 50,
    opacity: 0.1,
  },
  circle2: {
    position: 'absolute',
    bottom: '20%',
    left: -30,
    width: 80,
    height: 80,
    borderRadius: 40,
    opacity: 0.1,
  },
  button: {
    justifyContent: 'center',
    marginBottom: 20,
  },
});

export default UserDataScreen;