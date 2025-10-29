import React from 'react';
import { useTheme } from 'react-native-paper';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginCheckCpf from '../pages/login-check-cpf';
import LoginCheckPassword from '../pages/login-check-password';
import { PessoaCreateProvider } from '../context/create-pessoa-context';
import RegisterStepOne from '../pages/register-step-one';
import RegisterStepTwo from '../pages/register-step-two';
import RegisterStepThree from '../pages/register-step-three';
import RegisterStepFour from '../pages/register-step-four';
import RegisterStepFive from '../pages/register-step-five';
import LoggedDrawerNavigator from './logged-router';
import ParceiroProdutoCreateScreen from '../pages/parceiro-produto-create';
import UserSchedulesHistoryScreen from '../pages/user-schedules-history-screen';
import UserSchedulesWaitScreen from '../pages/user-schedules-wait-screen';

import { TelemedcineStackNavigator } from './telemedicine-stack-navigator';
import { NewContractStackNavigator } from './new-contract-stack-navigator';
import TelepetStackNavigator from './telepet-stack-navigator';
import ContractsStackNavigator from './contracts-stack-navigator';
import { useDadosUsuario } from '../context/pessoa-dados-context';
import ParceiroLoggedDrawerNavigator from './parceiro-router';
// import PdfViewerScreen from '../pages/register-step-four/PdfViewerScreen';
const RegistrationRouter = ({ initialRoute }: { initialRoute: string }) => {
  const theme = useTheme();
  const { dadosUsuarioData } = useDadosUsuario();
  const Stack = createNativeStackNavigator();

  function handleUserId() {
    if (!dadosUsuarioData.user) {
      return 'user';
    }

    if (dadosUsuarioData.user.id_origem_usr == 0) {
      return 'user';
    }

    if (dadosUsuarioData.user.id_origem_usr == 2) {
      return 'user';
    }
    if (dadosUsuarioData.user.id_origem_usr == 14) {
      return 'partner';
    }
  }

  return (
    <PessoaCreateProvider>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{
          headerTintColor: theme.colors.onSurface,
          statusBarStyle: 'dark',
          statusBarColor: theme.colors.background,
          headerStyle: {
            backgroundColor: theme.colors.surface,
          },
          headerShadowVisible: false,
          headerBackTitle: 'Voltar',
        }}>
        <Stack.Screen
          name="register-step-one"
          component={RegisterStepOne}
          options={{
            headerShown: true,
            title: 'Cadastro',
            headerTitleAlign: 'center',

            headerStyle: { backgroundColor: theme.colors.primaryContainer },
            headerTintColor: theme.colors.onPrimaryContainer,
          }}
        />
        <Stack.Screen
          name="register-step-two"
          component={RegisterStepTwo}
          options={{
            headerShown: true,
            title: 'Endereço',
            headerTitleAlign: 'center',

            headerStyle: { backgroundColor: theme.colors.primaryContainer },
            headerTintColor: theme.colors.onPrimaryContainer,
          }}
        />
        <Stack.Screen
          name="register-step-three"
          component={RegisterStepThree}
          options={{
            headerShown: true,
            title: 'Dados pessoais',
            headerTitleAlign: 'center',

            headerStyle: { backgroundColor: theme.colors.primaryContainer },
            headerTintColor: theme.colors.onPrimaryContainer,
          }}
        />
        <Stack.Screen
          name="register-step-four"
          component={RegisterStepFour}
          options={{
            headerShown: true,
            title: 'Telefone',
            headerTitleAlign: 'center',

            headerStyle: { backgroundColor: theme.colors.primaryContainer },
            headerTintColor: theme.colors.onPrimaryContainer,
          }}
        />
        <Stack.Screen
          name="register-step-five"
          component={RegisterStepFive}
          options={{
            headerShown: true,
            title: 'Senha',
            headerBackVisible: false,
            headerTitleAlign: 'center',

            headerStyle: { backgroundColor: theme.colors.primaryContainer },
            headerTintColor: theme.colors.onPrimaryContainer,
          }}
        />
        <Stack.Screen
          name="user-telepet-stack"
          component={TelepetStackNavigator}
          options={{
            headerShown: true,
            title: 'Telepet',
            headerTitleAlign: 'center',

            headerStyle: { backgroundColor: theme.colors.primaryContainer },
            headerTintColor: theme.colors.onPrimaryContainer,
          }}
        />
        <Stack.Screen
          name="user-telemed-stack"
          component={TelemedcineStackNavigator}
          options={{
            headerShown: true,
            title: 'Telemedicina',
            headerTitleAlign: 'center',

            headerStyle: { backgroundColor: theme.colors.primaryContainer },
            headerTintColor: theme.colors.onPrimaryContainer,
          }}
        />
        <Stack.Screen
          name="user-contracts-stack"
          component={ContractsStackNavigator}
          options={{
            headerShown: true,
            title: 'Planos',
            headerTitleAlign: 'center',

            headerStyle: { backgroundColor: theme.colors.primaryContainer },
            headerTintColor: theme.colors.onPrimaryContainer,
          }}
        />
        <Stack.Screen
          name="logged-home-screen"
          component={handleUserId() === 'user' ? LoggedDrawerNavigator : ParceiroLoggedDrawerNavigator}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="new-contract-stack"
          component={NewContractStackNavigator}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="user-shcdules-history-screen"
          component={UserSchedulesHistoryScreen}
          options={{
            headerShown: true,
            title: 'Histórico',
            headerTitleAlign: 'center',

            headerStyle: { backgroundColor: theme.colors.primaryContainer },
            headerTintColor: theme.colors.onPrimaryContainer,
          }}
        />
        <Stack.Screen
          name="user-shcdules-wait-screen"
          component={UserSchedulesWaitScreen}
          options={{
            headerShown: true,
            title: 'Sala de Espera',
            headerTitleAlign: 'center',

            headerStyle: { backgroundColor: theme.colors.primaryContainer },
            headerTintColor: theme.colors.onPrimaryContainer,
          }}
        />
        <Stack.Screen
          name="parceiro-produto-router"
          component={ParceiroProdutoCreateScreen}
          options={{
            headerShown: true,
            title: 'Criar Produto',
            headerTitleAlign: 'center',

            headerStyle: { backgroundColor: theme.colors.primaryContainer },
            headerTintColor: theme.colors.onPrimaryContainer,
          }}
        />
        {/* <Stack.Screen
  name="PdfViewerScreen"
  component={PdfViewerScreen}
  options={{
    headerShown: true,
    title: 'Termo de Adesão',
            headerTitleAlign: 'center',

    headerStyle: { backgroundColor: theme.colors.primaryContainer },
    headerTintColor: theme.colors.onPrimaryContainer,
  }}
/> */}
      </Stack.Navigator>
    </PessoaCreateProvider>
  );
};

export default RegistrationRouter;
