import React, { useCallback } from 'react';
import { IconButton, Text, FAB, useTheme, Badge, Button, Modal, Portal } from 'react-native-paper';
import { useDadosUsuario } from '../../context/pessoa-dados-context';
import { api } from '../../network/api';
import { useAuth } from '../../context/AuthContext';
import { useEffect, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, TouchableOpacity } from 'react-native';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { View } from 'react-native';
import UserScheduleCard from './user-schedule-card';
import { navigate } from '../../router/navigationRef';
import LoadingFull from '../../components/loading-full';
import { ProcedureMethodTypes, useConsultas } from '../../context/consultas-context';
import { useExames } from '../../context/exames-context';
import ScheduleDataModal from './schedule-data-modal';
import CustomToast from '../../components/custom-toast';

export default function UserSchedulesScreen({ navigation }: { navigation: any }) {
  const { dadosUsuarioData } = useDadosUsuario();
  const { authData } = useAuth();
  const { setCurrentProcedureMethod, userSchedules, setUserSchedulesData, currentProcedureMethod } = useConsultas();
  const { selectedExams, openBottomSheet } = useExames();
  const { colors } = useTheme();

  const [fabGroupVisible, setFabGroupVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [listItemIndex, setListItemIndex] = useState<number>(0);

  let initialFabOptionsState = [
    {
      icon: 'calendar-today',
      onPress: () => handleFabPress('consulta'),
      label: 'Nova Consulta',
      style: { backgroundColor: colors.primary },
    },
    {
      icon: 'stethoscope',
      onPress: () => handleFabPress('exame'),
      label: `${selectedExams.length > 0 ? 'Adicionar' : 'Novo'} Exame`,
      style: { backgroundColor: colors.primary },
    },
    {
      icon: 'history',
      onPress: () => {
        navigate('user-shcdules-history-screen');
      },
      label: 'Agendamentos Realizados',
      style: { backgroundColor: colors.primary },
    },
  ];

  const [fabOptions, setFabOptions] = useState<{ icon: string; onPress: () => void; label: string }[]>(initialFabOptionsState);

  const isFocused = useIsFocused();

  useEffect(() => {
    if (selectedExams.length > 0) {
      setFabOptions(prev => {
        const hasOption = prev.some(option => option.label === 'Visualizar Agendamentos');
        const meuCarrinho = prev.some(option => option.label === 'Meu carrinho');

        if (hasOption || meuCarrinho) return prev; // Evita adicionar duplicatas

        return [
          ...prev,
          {
            icon: 'cart',
            onPress: () => openBottomSheet(),
            label: 'Meu carrinho',
            style: { backgroundColor: colors.primary },
          },
        ];
      });
    } else {
      setFabOptions(initialFabOptionsState);
    }
  }, [selectedExams]);

  const fetchSchedules = async () => {
    setLoading(true);
    const token = dadosUsuarioData.pessoaDados?.cod_token_pes;
    const cod_paciente = dadosUsuarioData.pessoaDados?.id_pessoa_pes;

    try {
      const response = await api.get(`/integracao/listAgendamentos?cod_paciente=${cod_paciente}`, {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${authData.access_token}`,
        },
      });

      if (response.status == 200) {
        const { data } = response;
   
        setUserSchedulesData(data);
                console.log(data) 

      }
    } catch (err: any) {
      //console.log(err);
    } finally {
      setLoading(false);
    }
  };
useEffect(() => {
  if (isFocused) {
    fetchSchedules();
  }
}, [isFocused]);
  const NoSchedulesComponent = () => (
    <View style={[styles.containerErrorComponent, { backgroundColor: colors.background }]}>
      <IconButton icon="calendar-remove-outline" size={64} iconColor={colors.primary} style={styles.icon} />
      <Text variant="headlineMedium" style={styles.text}>
        Você não possui agendamentos marcados
      </Text>
      <Button onPress={fetchSchedules}>Recarregar</Button>
    </View>
  );

  function handleFabPress(scheduleType: ProcedureMethodTypes) {
    setCurrentProcedureMethod(scheduleType);
    navigate('user-consultas-screen-list', { type: scheduleType }); // Substitua com a tela ou ação desejada
  }

  function showModal(e: number) {
    console.log(e);
    setListItemIndex(e);
    setIsModalVisible(true);
  }

  return (
    <>
      {loading ? (
        <LoadingFull />
      ) : (
        <View style={[styles.container, { backgroundColor: '#f7f7f7' }]}>
          {userSchedules.length > 0 ? (
            <FlatList
              data={userSchedules}
              renderItem={({ item, index }) => <UserScheduleCard index={index} appointment={item} onPress={e => showModal(e)} setGlobalLoading={setLoading} />}
              refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchSchedules} />}
              removeClippedSubviews={false}
            />
          ) : (
            <NoSchedulesComponent />
          )}

          <Portal>
            {userSchedules.length > 0 ? <ScheduleDataModal appointment={userSchedules[listItemIndex!]} visible={isModalVisible} close={() => setIsModalVisible(false)} /> : <></>}
          </Portal>

          {/*  */}

          {/* Floating Action Button */}

          <FAB.Group
            open={fabGroupVisible}
            visible={isFocused}
            icon={'plus'}
            actions={fabOptions}
            onStateChange={({ open }) => setFabGroupVisible(open)}
            fabStyle={styles.fabStyle}
          />
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  containerErrorComponent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  icon: {
    marginBottom: 16,
  },
  text: {
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  iconContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'red',
    color: 'white',
  },
  fabStyle: {
    shadowColor: 'transparent',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    elevation: 0,
  },
});
