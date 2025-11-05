import { Button, IconButton, Portal, Text, useTheme, Modal, FAB } from 'react-native-paper';
import { DatePickerModal } from 'react-native-paper-dates';
import { useAuth } from '../../context/AuthContext';
import { FlatList, RefreshControl, StyleSheet, View, TouchableOpacity, Animated } from 'react-native';
import React, { useEffect, useState, useCallback } from 'react';
import LoadingFull from '../../components/loading-full';
import { api } from '../../network/api';
import { useDadosUsuario } from '../../context/pessoa-dados-context';
import { generateRequestHeader } from '../../utils/app-utils';
import UserScheduleCard from '../user-schedules-screen/user-schedule-card';
import ScheduleDataModal from '../user-schedules-screen/schedule-data-modal';
import CustomToast from '../../components/custom-toast';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { useFocusEffect } from '@react-navigation/native';

interface UserSchedule {
  agenda_exames_id: string;
  nome_procedimento: string | string[];
  nome_profissional?: string;
  data: string;
  fachada_profissional?: string;
  inicio: string;
  situacao?: string;
  nome_unidade?: string;
}

const UserSchedulesWaitScreen = ({ navigation }: { navigation: any }) => {
  const { colors } = useTheme();
  const { dadosUsuarioData } = useDadosUsuario();
  const { authData } = useAuth();

  const [loading, setLoading] = useState(true);
  const [userSchedules, setUserSchedules] = useState<UserSchedule[]>([]);
  const [filteredSchedules, setFilteredSchedules] = useState<UserSchedule[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [listItemIndex, setListItemIndex] = useState<number>(0);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [currentDateField, setCurrentDateField] = useState<'start' | 'end' | null>(null);

  // Animação da lista
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(20));

  useEffect(() => {
    if (!loading) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(20);
    }
  }, [filteredSchedules, loading]);

  // Busca agendamentos EM ESPERA
  const fetchWaitingSchedules = useCallback(async () => {
    setLoading(true);
    const token = dadosUsuarioData.pessoaDados?.id_pessoa_pes;
    const cod_paciente = dadosUsuarioData.pessoaDados?.id_pessoa_pes;

    if (!token || !authData.access_token || !cod_paciente) {
      CustomToast('Dados do paciente não encontrados', colors, 'error');
      setLoading(false);
      return;
    }

    try {
      const response = await api.get(
        `/integracao/listHistoricoAgendamentos?token_paciente=${token}&cod_paciente=${cod_paciente}`,
        generateRequestHeader(authData.access_token)
      );

      const data: UserSchedule[] = Array.isArray(response.data)
        ? response.data
            .filter(item => item?.situacao?.trim().toUpperCase() === 'ESPERA')
            .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
        : [];

      setUserSchedules(data);
      setFilteredSchedules(data);
    } catch (error: any) {
      console.error('Erro ao carregar agendamentos em espera:', error);
      CustomToast('Erro ao carregar agendamentos em espera', colors, 'error');
      setUserSchedules([]);
      setFilteredSchedules([]);
    } finally {
      setLoading(false);
    }
  }, [dadosUsuarioData, authData.access_token, colors]);

  useFocusEffect(
    useCallback(() => {
      fetchWaitingSchedules();
    }, [fetchWaitingSchedules])
  );

  const applyDateFilter = () => {
    if (!startDate && !endDate) {
      setFilteredSchedules(userSchedules);
      setIsFilterModalVisible(false);
      return;
    }

    const filtered = userSchedules
      .filter(schedule => {
        const scheduleDate = parseISO(schedule.data);
        if (startDate && endDate) {
          return isWithinInterval(scheduleDate, { start: startOfDay(startDate), end: endOfDay(endDate) });
        } else if (startDate) {
          return scheduleDate >= startOfDay(startDate);
        } else if (endDate) {
          return scheduleDate <= endOfDay(endDate);
        }
        return true;
      })
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

    setFilteredSchedules(filtered);
    setIsFilterModalVisible(false);
  };

  const clearFilters = () => {
    setStartDate(null);
    setEndDate (null);
    setFilteredSchedules(userSchedules);
    setIsFilterModalVisible(false);
  };

  const openDatePicker = (field: 'start' | 'end') => {
    setCurrentDateField(field);
    setDatePickerVisible(true);
  };

  const onDateConfirm = (date: Date) => {
    if (currentDateField === 'start') setStartDate(date);
    else if (currentDateField === 'end') setEndDate(date);
    setDatePickerVisible(false);
  };

  const NoSchedulesComponent = () => (
    <View style={[styles.containerErrorComponent, { backgroundColor: colors.background }]}>
      <IconButton icon="calendar-remove-outline" size={64} iconColor={colors.primary} style={styles.icon} />
      <Text variant="headlineMedium" style={styles.text}>
        {startDate || endDate
          ? 'Nenhum agendamento em espera no período'
          : 'Você não possui agendamentos em espera.'}
      </Text>
           <Button onPress={fetchWaitingSchedules}>Recarregar</Button>
     
    </View>
  );

  const showModal = (index: number) => {
    setListItemIndex(index);
    setIsModalVisible(true);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f7f7f7' }}>
      {loading ? (
        <LoadingFull title="Carregando sala de espera..." />
      ) : (
        <View style={{ flex: 1 }}>
          {filteredSchedules.length > 0 ? (
            <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
              <FlatList
                data={filteredSchedules}
                renderItem={({ item, index }) => (
                  <UserScheduleCard
                    index={index}
                    appointment={item}
                    onPress={showModal}
                    showCheckinButton={false}
                    setGlobalLoading={setLoading}
                    status="ESPERA"
                  />
                )}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchWaitingSchedules} />}
                contentContainerStyle={styles.listContent}
                keyExtractor={(item) => item.agenda_exames_id}
              />
            </Animated.View>
          ) : (
            <NoSchedulesComponent />
          )}

          <Portal>
            {filteredSchedules.length > 0 && (
              <ScheduleDataModal
                appointment={filteredSchedules[listItemIndex]}
                visible={isModalVisible}
                close={() => setIsModalVisible(false)}
              />
            )}
          </Portal>
        </View>
      )}

      {/* Modal de Filtro */}
      <Portal>
        <Modal
          visible={isFilterModalVisible}
          onDismiss={() => setIsFilterModalVisible(false)}
          contentContainerStyle={[styles.filterModal, { backgroundColor: colors.surface }]}
        >
          <View style={styles.filterModalHeader}>
            <Text variant="titleMedium" style={[styles.filterModalTitle, { color: '#fff' }]}>
              Filtrar por Período
            </Text>
            <IconButton
              icon="close"
              size={20}
              onPress={() => setIsFilterModalVisible(false)}
              iconColor="#fff"
            />
          </View>

          <View style={styles.dateInputsContainer}>
            {['start', 'end'].map((field) => (
              <View style={styles.dateInput} key={field}>
                <Text variant="bodyMedium" style={[styles.dateLabel, { color: colors.onSurfaceVariant }]}>
                  {field === 'start' ? 'Data Inicial' : 'Data Final'}
                </Text>
                <TouchableOpacity
                  style={[styles.dateButton, { backgroundColor: colors.background }]}
                  onPress={() => openDatePicker(field as 'start' | 'end')}
                  activeOpacity={0.7}
                >
                  <IconButton icon="calendar" size={20} iconColor={colors.primary} />
                  <Text style={[styles.dateButtonText, { color: colors.onSurface }]}>
                    {field === 'start'
                      ? startDate ? format(startDate, 'dd/MM/yyyy') : 'Selecionar data'
                      : endDate ? format(endDate, 'dd/MM/yyyy') : 'Selecionar data'}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>

          <View style={styles.filterActions}>
            <Button
              mode="outlined"
              onPress={clearFilters}
              style={[styles.filterButtonAction, { borderColor: colors.primary }]}
              textColor={colors.primary}
            >
              Limpar
            </Button>
            <Button
              mode="contained"
              onPress={applyDateFilter}
              style={styles.filterButtonAction}
              buttonColor={colors.primary}
            >
              Aplicar Filtro
            </Button>
          </View>
        </Modal>

        <DatePickerModal
          locale="pt-BR"
          mode="single"
          visible={datePickerVisible}
          onDismiss={() => setDatePickerVisible(false)}
          date={currentDateField === 'start' ? startDate : endDate || new Date()}
          onConfirm={({ date }) => onDateConfirm(date)}
          label={currentDateField === 'start' ? 'Selecione a data inicial' : 'Selecione a data final'}
          saveLabel="Confirmar"
          uppercase={false}
        />
      </Portal>

      {/* FAB sem animação de rotação */}
      {/* <FAB
        icon="filter-variant"
        style={{
          position: 'absolute',
          right: 25,
          bottom: 25,
          backgroundColor: colors.primary,
        }}
        onPress={() => setIsFilterModalVisible(true)}
      /> */}
    </View>
  );
};

const styles = StyleSheet.create({
  listContent: { paddingBottom: 16 },
  containerErrorComponent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  icon: { marginBottom: 16 },
  text: {
    textAlign: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filterModal: {
    margin: 20,
    borderRadius: 16,
    padding: 0,
    overflow: 'hidden',
  },
  filterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#44005F',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterModalTitle: {
    fontWeight: '600',
    color: '#fff',
  },
  dateInputsContainer: { padding: 16 },
  dateInput: { marginBottom: 16 },
  dateLabel: { marginBottom: 8, fontWeight: '500' },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dateButtonText: { marginLeft: 8, fontSize: 16 },
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  filterButtonAction: {
    flex: 1,
    marginHorizontal: 6,
    borderRadius: 8,
  },
});

export default UserSchedulesWaitScreen;