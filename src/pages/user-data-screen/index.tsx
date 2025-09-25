import { View, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
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

const UserDataScreen = ({ navigation }: { navigation: any }) => {
  const theme = useTheme();
  const { colors } = useTheme();
  const { dadosUsuarioData, clearLoginDadosUsuarioData, clearDadosUsuarioData } = useDadosUsuario();
  const { clearSelectedExams } = useExames();
  const { authData, clearAuthData } = useAuth();
  const { setUserSchedulesData } = useConsultas();
// console.log("dadosUsuarioData:", JSON.stringify(dadosUsuarioData, null, 2));

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
      navigation.setOptions({ headerShown: true,
                  title: 'Perfil',
                          headerTitleAlign: 'center',

                    headerStyle: { backgroundColor: theme.colors.primaryContainer },
    headerTintColor: theme.colors.onPrimaryContainer,
  
       });
    }, [navigation]);
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
     

      <View style={styles.profileOptions}>
        {/* Dados pessoais */}
        <TouchableOpacity style={styles.optionCard} onPress={() => navigation.navigate('user-personal-data-screen')}>
          <View style={styles.optionIconContainer}>
            <Icon name="account-circle" size={24} color={theme.colors.onTertiary} />
          </View>
          <View style={styles.optionTextContainer}>
            <Text style={styles.optionTitle}>Dados pessoais</Text>
            <Text style={styles.optionSubtitle}>Atualize seus dados pessoais</Text>
          </View>
          <Icon name="chevron-right" size={24} color="#999" />
        </TouchableOpacity>

        {/* Cartões de crédito e Meu Plano */}
        {dadosUsuarioData.pessoaDados?.id_situacao_pda == 1 && (
          <>
            <TouchableOpacity style={styles.optionCard} onPress={() => navigation.navigate('user-personal-credit-cards-screen')}>
              <View style={styles.optionIconContainer}>
                <Icon name="credit-card-multiple" size={24} color={theme.colors.onTertiary} />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionTitle}>Cartões de crédito</Text>
                <Text style={styles.optionSubtitle}>Atualize seus cartões de crédito</Text>
              </View>
              <Icon name="chevron-right" size={24} color="#999" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionCard}
              onPress={() => {
                console.log(dadosUsuarioData.pessoaAssinatura);
                if (dadosUsuarioData.pessoaAssinatura?.id_contrato_ctt) {
                  navigate('user-contracts-stack');
                  return;
                }
                navigate('new-contract-stack');
              }}>
              <View style={styles.optionIconContainer}>
                <Icon name="file-document" size={24} color={theme.colors.onTertiary} />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionTitle}>Planos</Text>
                <Text style={styles.optionSubtitle}>Confira detalhes sobre seu plano</Text>
              </View>
              <Icon name="chevron-right" size={24} color="#999" />
            </TouchableOpacity>
          </>
        )}

        {/* Carteirinha */}
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

        <Button icon={'logout'} textColor={theme.colors.error} mode="outlined" style={[styles.button, { borderColor: theme.colors.error, marginTop:20 }]} onPress={handleLogout}>
          Sair
        </Button>
      </View>

      {/* Bottom Navigation */}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  button: {
    justifyContent: 'center',
    marginBottom: 20,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
    backgroundColor: '#f0f0f0',
  },
  greeting: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subscription: {
    fontSize: 14,
    color: '#666',
  },
  profileOptions: {
    padding: 15,
    paddingTop: 0,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
  },
  optionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#AF91F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 13,
    color: '#999',
  },
  logoutButton: {
    margin: 20,
    padding: 15,
    borderRadius: 8,
    backgroundColor: '#fff',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ff4444',
  },
  logoutText: {
    color: '#ff4444',
    fontWeight: 'bold',
    fontSize: 16,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  navItem: {
    alignItems: 'center',
  },
  navText: {
    fontSize: 12,
    marginTop: 5,
  },
});

export default UserDataScreen;
