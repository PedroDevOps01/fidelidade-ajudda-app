import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoggedHome from '../pages/logged-home';
import PartnersScreen from '../pages/user-create-credit-card/partners-screen';
import PdfViewerScreen from '../pages/logged-home'; // Adjust the path as needed
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from 'react-native-paper';
import { useDadosUsuario } from '../context/pessoa-dados-context';
import { Platform } from 'react-native';
import { useUserCart } from '../context/user-cart-context';
import { useExames } from '../context/exames-context';
import SchedulesStackNavigator from './schedules-stack-navigator';
import ProfileStackNavigator from './profile-stack-navigator';
import { MdvStackNavigator } from './mdv-stack-navigator';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import UserPersonalCarteirinhaScreen from '../pages/user-personal-carteirinha-screen';

const Tab = createBottomTabNavigator();
const RootStack = createNativeStackNavigator();

// Componente principal com a estrutura de navegação
const MainTabs = () => {
  const { colors } = useTheme();
  const { selectedExams } = useExames();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      backBehavior="initialRoute"
      initialRouteName={'Home'}
      screenOptions={({ route }) => ({
        tabBarShowLabel: true,
        tabBarHideOnKeyboard: true,
        headerTintColor: colors.onSurface,
        headerShown: false,
        headerStyle: {
          backgroundColor: colors.surface,
          shadowColor: 'transparent',
        },
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopWidth: 0.3,
          height: 60 + insets.bottom, // altura base + safe area inferior
          paddingBottom: insets.bottom,
          elevation: 0,
        },
        tabBarIcon: ({ color, size }) => {
          let iconName;
          switch (route.name) {
            case 'Home':
              iconName = 'home';
              break;
            case 'user-data':
              iconName = 'account-cog';
              break;
            case 'user-mdv':
              iconName = 'account-cash';
              break;
            case 'Shopping':
              iconName = 'cart';
              break;
            case 'user-schedules':
              iconName = 'calendar';
              break;
            case 'user-personal-carteirinha-screen':
              iconName = 'card-account-details-star';
              break;
            default:
              iconName = 'circle';
          }
          return <Icon name={iconName} size={24} color={color} />;
        },
        tabBarActiveTintColor: colors.onPrimary,
        tabBarInactiveTintColor: colors.onSurfaceVariant,
        tabBarActiveBackgroundColor: colors.primary,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        tabBarItemStyle: {
          paddingVertical: 8,
          borderRadius: 0,
        },
        tabBarIconStyle: {
          marginTop: 4,
          padding: 0,
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={LoggedHome}
        options={{
          tabBarLabel: 'Início',
          title: 'Bem Vindo!',
        }}
      />
      <Tab.Screen
        name="user-schedules"
        component={SchedulesStackNavigator}
        options={{
          tabBarLabel: 'Agendar',
          headerShown: false,
          headerShadowVisible: false,
          title: 'Agendamentos',
          tabBarBadge: selectedExams.length > 0 ? selectedExams.length : undefined,
          tabBarBadgeStyle: {
            backgroundColor: '#4003ff',
          },
        }}
      />
      <Tab.Screen
        name="user-mdv"
        component={MdvStackNavigator}
        options={{
          tabBarLabel: 'Indique',
          headerShown: false,
          headerTitleAlign: 'center',
          headerStyle: { backgroundColor: colors.primaryContainer },
          headerTintColor: colors.onPrimaryContainer,
          headerShadowVisible: true,
          title: 'Minhas Vendas',
        }}
      />
      
      <Tab.Screen
        name="user-personal-carteirinha-screen"
        component={UserPersonalCarteirinhaScreen}
        options={{
          tabBarLabel: 'Carteirinha',
          headerShown: false,
          headerShadowVisible: false,
          title: 'Carteirinha',
        }}
      />
      <Tab.Screen
        name="user-data"
        component={ProfileStackNavigator}
        options={{
          tabBarLabel: 'Perfil',
          headerShown: false,
          headerShadowVisible: true,
          title: 'Meus Dados',
        }}
      />
      
    </Tab.Navigator>
  );
};

// Navigator raiz que gerencia as telas modais/stack
const LoggedDrawerNavigator: React.FC = () => {
  const { colors } = useTheme();

  return (
    <RootStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <RootStack.Screen name="MainTabs" component={MainTabs} />
      <RootStack.Screen
        name="ParceirosScreen"
        component={PartnersScreen}
        options={{
          // presentation: 'modal',
    headerBackTitle: 'Voltar', // só afeta iOS

          title: 'Nossos Parceiros',
          headerShown: true,
          headerTitleAlign: 'center',
          headerStyle: { backgroundColor: colors.primaryContainer },
          headerTintColor: colors.onPrimaryContainer,
        }}
      />
      <RootStack.Screen
        name="PdfViewerScreen"
        component={PdfViewerScreen}
        options={{
          presentation: 'modal',
          title: 'Termos de Adesão',
          headerShown: true,
          headerTitleAlign: 'center',
          headerStyle: { backgroundColor: colors.primaryContainer },
          headerTintColor: colors.onPrimaryContainer,
        }}
      />
    </RootStack.Navigator>
  );
};

export default LoggedDrawerNavigator;