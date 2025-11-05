import { Button, IconButton, Portal, Text, useTheme, Modal, FAB } from 'react-native-paper';
import { DatePickerModal } from 'react-native-paper-dates';
import { useAuth } from '../../context/AuthContext';
import { FlatList, RefreshControl, StyleSheet, View, TouchableOpacity, Animated, Easing } from 'react-native';
import React, { useEffect, useState, useCallback } from 'react';
import LoadingFull from '../../components/loading-full';
import { api } from '../../network/api';
import { useDadosUsuario } from '../../context/pessoa-dados-context';
import { generateRequestHeader } from '../../utils/app-utils';
import UserScheduleCard from '../user-schedules-screen/user-schedule-card';
import ScheduleDataModal from '../user-schedules-screen/schedule-data-modal';
import CustomToast from '../../components/custom-toast';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';

const UserSchedulesHistoryScreen = ({ navigation }: { navigation: any }) => {
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

  // Animação do botão de filtro
  const rotateAnim = new Animated.Value(0);

  useEffect(() => {
    Animated.timing(rotateAnim, {
      toValue: isFilterModalVisible ? 1 : 0,
      duration: 300,
      easing: Easing.ease,
      useNativeDriver: true,
    }).start();
  }, [isFilterModalVisible]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  // Animação da lista de agendamentos
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(20));

  useEffect(() => {
    if (!loading) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(20);
    }
  }, [filteredSchedules, loading]);

  const fetchSchedules = useCallback(async () => {
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

    const data: UserSchedule[] = Array.isArray(response.data) ? response.data : [];

    // Filtra apenas os agendamentos FINALIZADOS
    const finishedSchedules = data
      .filter(item => item?.situacao?.trim().toUpperCase() === 'FINALIZADO')
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

    setUserSchedules(finishedSchedules);
    setFilteredSchedules(finishedSchedules);
  } catch (error: any) {
    console.error('Erro ao carregar agendamentos finalizados:', error);
    CustomToast('Erro ao carregar agendamentos finalizados', colors, 'error');
    setUserSchedules([]);
    setFilteredSchedules([]);
  } finally {
    setLoading(false);
  }
}, [dadosUsuarioData, authData.access_token, colors]);

  useEffect(() => {
    fetchSchedules();
  }, []);

  const applyDateFilter = () => {
    if (!startDate && !endDate) {
      setFilteredSchedules(userSchedules);
      return;
    }

    const filtered = userSchedules.filter(schedule => {
  const scheduleDate = parseISO(schedule.data);

  if (startDate && endDate) {
    return isWithinInterval(scheduleDate, {
      start: startOfDay(startDate),
      end: endOfDay(endDate),
    });
  } else if (startDate) {
    return scheduleDate >= startOfDay(startDate);
  } else if (endDate) {
    return scheduleDate <= endOfDay(endDate);
  }

  return true;
}).sort((a, b) => parseISO(b.data).getTime() - parseISO(a.data).getTime()); // ordena do mais recente

setFilteredSchedules(filtered);
setIsFilterModalVisible(false);
  };

  const clearFilters = () => {
    setStartDate(null);
    setEndDate(null);
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
        {startDate || endDate ? 'Nenhum agendamento encontrado no período' : 'Você não possui Histórico.'}
      </Text>
      <Button onPress={fetchSchedules}>Recarregar</Button>
    </View>
  );

  const showModal = (index: number) => {
    setListItemIndex(index);
    setIsModalVisible(true);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f7f7f7' }}>
      {loading ? (
        <LoadingFull />
      ) : (
        <View style={{ flex: 1 }}>
          {filteredSchedules.length > 0 ? (
            <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
              <FlatList
                style={{ width: '100%' }}
                data={filteredSchedules}
                renderItem={({ item, index }) => (
                  <UserScheduleCard
                    index={index}
                    appointment={item}
                    onPress={showModal}
                    showCheckinButton={false}
                    setGlobalLoading={setLoading}
                  />
                )}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchSchedules} />}
                removeClippedSubviews={false}
                contentContainerStyle={styles.listContent}
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
            <Text variant="titleMedium" style={[styles.filterModalTitle, { color: colors.onSecondary }]}>
              Filtrar por Período
            </Text>
            <IconButton
              icon="close"
              size={20}
              onPress={() => setIsFilterModalVisible(false)}
              iconColor={colors.onSecondary}
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

        {/* Date Picker Modal */}
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

      {/* Botão Flutuante */}
      <FAB
        icon="filter-variant"
        style={{
          position: 'absolute',
          right: 25,
          bottom: 25,
          backgroundColor: colors.primary,
        }}
        onPress={() => setIsFilterModalVisible(true)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  listContent: { paddingBottom: 16 },
  containerErrorComponent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  icon: { marginBottom: 16 },
  text: { textAlign: 'center', paddingHorizontal: 16, marginBottom: 16 },
  filterModal: { margin: 20, borderRadius: 16, padding: 0, overflow: 'hidden' },
  filterModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, backgroundColor: '#44005F', borderBottomColor: '#f0f0f0' },
  filterModalTitle: { fontWeight: '600', color: 'white' },
  dateInputsContainer: { padding: 16 },
  dateInput: { marginBottom: 16 },
  dateLabel: { marginBottom: 8, fontWeight: '500' },
  dateButton: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 8, borderWidth: 1, borderColor: '#e0e0e0' },
  dateButtonText: { marginLeft: 8, fontSize: 16 },
  filterActions: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  filterButtonAction: { flex: 1, marginHorizontal: 6, borderRadius: 8 },
});

export default UserSchedulesHistoryScreen;
