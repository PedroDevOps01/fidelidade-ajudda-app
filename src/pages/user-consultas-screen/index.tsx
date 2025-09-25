import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, View, Animated, Easing } from 'react-native';
import { Searchbar, useTheme } from 'react-native-paper';
import { api } from '../../network/api';
import { useAuth } from '../../context/AuthContext';
import { agruparConsultasPorGrupo } from '../../utils/app-utils';
import GroupedList from './grouped-list';
import { useConsultas, ConsultasAgrupadas } from '../../context/consultas-context';
import { Tabs, TabScreen, TabsProvider } from 'react-native-paper-tabs';
import { useFocusEffect } from '@react-navigation/native';
import { useExames } from '../../context/exames-context';
import Fab from '../../components/fab';
import LoadingFull from '../../components/loading-full';

export default function UserConsultasScreen({ navigation }: { navigation: any }) {
  const { colors } = useTheme();
  const { authData } = useAuth();
  const { setConsultasAgrupadasData, consultasAgrupadasData, currentProcedureMethod } = useConsultas();
  const { selectedExams, openBottomSheet } = useExames();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [currentMethod, setCurrentMethod] = useState<string>('consulta');

  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(20))[0];

  async function fetchConsultas() {
    setLoading(true);
    try {
      const endpoint = currentProcedureMethod === 'consulta' ? 'listProcedimentos' : 'listProcedimentosExames';
      const response = await api.get(`/integracao/${endpoint}`, {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `bearer ${authData.access_token}`,
        },
      });

      console.log(`Request /integracao/${endpoint}:`, JSON.stringify(response.data, null, 2)); // Log API response

      if (response.status === 200) {
        const ag = agruparConsultasPorGrupo(response.data);
        console.log('Agrupadas:', JSON.stringify(ag, null, 2));
        setConsultasAgrupadasData(ag.consultasAgrupadas);

        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 600,
            easing: Easing.out(Easing.back(1.5)),
            useNativeDriver: true,
          }),
        ]).start();
      } else {
        throw new Error(`Unexpected response status: ${response.status}`);
      }
    } catch (err: any) {
      console.error('Error fetching consultas:', JSON.stringify(err, null, 2));
      Alert.alert('Aviso', 'Erro ao carregar consultas. Tente novamente mais tarde', [
        {
          text: 'Continuar',
          onPress: () => navigation.goBack(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    navigation.setOptions({
      title: currentProcedureMethod?.charAt(0).toUpperCase() + currentProcedureMethod?.slice(1).toLowerCase() || 'Consultas',
      headerStyle: {
        backgroundColor: colors.primaryContainer,
      },
      headerTintColor: colors.onPrimaryContainer,
    });
  }, [navigation, currentProcedureMethod, colors]);

  useFocusEffect(
    useCallback(() => {
      fetchConsultas();
    }, [currentProcedureMethod])
  );

  const filteredData = () => {
    if (currentMethod !== 'consulta' || !consultasAgrupadasData?.consultasAgrupadas) {
      return {};
    }

    return Object.entries(consultasAgrupadasData.consultasAgrupadas).reduce(
      (acc: ConsultasAgrupadas, [grupo, procedimentos]) => {
        if (!Array.isArray(procedimentos)) {
          console.warn(`Invalid procedimentos for group "${grupo}":`, procedimentos);
          return acc;
        }

        const filteredProcedimentos = procedimentos.filter(procedimento =>
          (procedimento.des_descricao_tpr || '').toLowerCase().includes(searchQuery.toLowerCase())
        );

        if (filteredProcedimentos.length > 0) {
          acc[grupo] = filteredProcedimentos;
        }
        return acc;
      },
      {}
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <LoadingFull />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Buscar..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={[styles.searchbar, { backgroundColor: colors.surface }]}
          iconColor={colors.primary}
          inputStyle={{ color: colors.onSurface }}
          placeholderTextColor={colors.onSurfaceVariant}
          elevation={2}
        />
      </View>

      <Animated.View
        style={{
          flex: 1,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
      >
        <TabsProvider
          defaultIndex={0}
          onChangeIndex={index => setCurrentMethod(index === 0 ? 'consulta' : 'medico')}
        >
          <Tabs
            style={{
              backgroundColor: colors.background,
              elevation: 3,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 6,
            }}
            disableSwipe
            mode="scrollable"
            tabLabelStyle={{ fontWeight: '600' }}
          >
            <TabScreen
              label={currentProcedureMethod === 'exame' ? 'Procedimento' : 'Procedimento'}
              icon="stethoscope"
            >
              <View style={styles.tabContent}>
                <GroupedList list={filteredData()} loading={loading} />
              </View>
            </TabScreen>
          </Tabs>
        </TabsProvider>
      </Animated.View>

      {selectedExams.length > 0 && <Fab icon="cart" onPress={openBottomSheet} />}
    </View>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  searchbar: {
    borderRadius: 12,
  },
  tabContent: {
    backgroundColor: '#f7f7f7',
    flex: 1,
  },
});