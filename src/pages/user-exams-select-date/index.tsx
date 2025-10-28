import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View, Dimensions } from 'react-native';
import { Button, Card, Text, useTheme } from 'react-native-paper';
import { RouteProp, useRoute } from '@react-navigation/native';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import { navigate } from '../../router/navigationRef';
import { useExames } from '../../context/exames-context';
import { useConsultas } from '../../context/consultas-context';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../network/api';
import { generateRequestHeader } from '../../utils/app-utils';
import { useDadosUsuario } from '../../context/pessoa-dados-context';

dayjs.locale('pt-br'); 

type UserExamsSelectDateRouteParams = {
  params: {
    item: ExamsLocals;
  };
};

const { width } = Dimensions.get('window');
const DAY_BUTTON_SIZE = (width - 64) / 4; 

export default function UserExamsSelectDate() {
  const { colors } = useTheme();
  const route = useRoute<RouteProp<UserExamsSelectDateRouteParams>>();
  const { item } = route.params;
  const { scheduleRequest, setScheduleRequestData } = useExames();
  const { userSchedules, setUserSchedulesData } = useConsultas();
  const { dadosUsuarioData } = useDadosUsuario();
  const { authData } = useAuth();

  const today = new Date();
  const maxDate = new Date();
  maxDate.setDate(today.getDate() + 13); 

  const generateAvailableDays = () => {
    const days = [];
    const currentDate = new Date(today);
    while (currentDate <= maxDate) {
      if (currentDate.getDay() !== 0) days.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return days;
  };
  const availableDays = generateAvailableDays();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Buscar agendamentos ao carregar
  useEffect(() => {
    const fetchUserSchedules = async () => {
      if (!authData.access_token || !dadosUsuarioData.pessoaDados?.id_pessoa_pes) return;
      try {
        const cod_paciente = dadosUsuarioData.pessoaDados.id_pessoa_pes;
        const response = await api.get(`/integracao/listAgendamentos?cod_paciente=${cod_paciente}`, generateRequestHeader(authData.access_token));
        setUserSchedulesData(response.data || []);
      } catch (err) {
        console.log('Erro ao buscar agendamentos:', err);
      }
    };
    fetchUserSchedules();
  }, [authData.access_token, dadosUsuarioData.pessoaDados]);

const saveAndContinue = () => {
  if (!selectedDate) {
    Alert.alert('Atenção', 'Por favor, selecione um dia para continuar.');
    return;
  }

  const selectedDay = dayjs(selectedDate);
  const currentHour = dayjs().hour();

  // Validação: não permitir agendamento no período da tarde (após 12h)
  if (currentHour >= 12) {
    Alert.alert(
      'Atenção',
      'Não é permitido agendar exames no período da tarde (após as 12h).'
    );
    return;
  }

  setScheduleRequestData({
    ...scheduleRequest,
    data_agenda: selectedDay.format('YYYY-MM-DD'),
    cod_parceiro: item.cod_parceiro,
    cod_paciente: scheduleRequest.cod_pessoa_pes,
  });

  navigate('user-select-payment-method');
};


  return (
    <View style={[styles.container, { backgroundColor: colors.fundo }]}>
      {/* Progress Steps */}
      <View style={{ flexDirection: 'row', marginBottom: 25, marginTop: 28,marginEnd: 15,        marginStart: 15,
 gap: 0 }}>
        {[1, 2, 3].map((_, index) => (
          <View
            key={index}
            style={{
 flex: 1,
        height: 6,
          marginEnd: 20,
        marginStart:20,
        borderRadius: 5,
              backgroundColor: index < 2 ? colors.primary : colors.onSecondary,
            }}
          />
        ))}
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Card Principal */}
        <Card style={[styles.card, { backgroundColor: colors.surface }]} mode="elevated">
          <Card.Title 
            style={[{ backgroundColor: colors.primary }]}
            title={item.empresa} 
            titleStyle={[styles.cardTitle, { color: colors.onSecondary }]}
            subtitle={`${item.cidade} - ${item.estado}`}
            subtitleStyle={[styles.cardSubtitle, { color: colors.onSecondary }]}
            titleNumberOfLines={2}
          />
          
          {/* Seção de seleção de data */}
          <Card.Content style={[styles.selectionSection, { backgroundColor: colors.surface2 }]}>
            <View style={styles.headerContainer}>
              
              <Text variant="titleMedium" style={[styles.sectionHeader, { color: colors.onSurface }]}>
                Selecione o dia do seu Agendamento:
              </Text>
            </View>
            
           <View style={styles.dateRangeContainer}>
  <Text variant="labelLarge" style={[styles.dateRangeText, { color: colors.onSurfaceVariant }]}>
    {`${dayjs(today).format('D [de] MMMM')} - ${dayjs(maxDate).format('D [de] MMMM')}`}
  </Text>
</View>
            <ScrollView horizontal showsHorizontalScrollIndicator={true}>

            {/* Dias disponíveis em grid */}
            <View style={styles.daysGrid}>
              {availableDays.map((day) => {
                const dayNumber = day.getDate();
                const dayName = dayjs(day).locale('pt-br').format('ddd');
                const isToday = day.toDateString() === today.toDateString();
                const isSelected = selectedDate && day.toDateString() === selectedDate.toDateString();
                
                return (
                  <View key={day.toString()} style={styles.dayContainer}>
                    <Button
                      mode={isSelected ? 'contained' : 'outlined'}
                      onPress={() => setSelectedDate(day)}
                      style={[
                        styles.dayButton,
                        isSelected && { backgroundColor: colors.primary },
                        isToday && !isSelected && { borderColor: colors.primary }
                      ]}
                      labelStyle={[
                        styles.dayButtonLabel,
                        isSelected && { color: colors.onPrimary }
                      ]}
                    >
                      <View style={styles.dayButtonContent}>
                        <Text 
                          style={[
                            styles.dayNumber, 
                            isSelected && { color: colors.onPrimary },
                            isToday && !isSelected && { color: colors.primary }
                          ]}
                        >
                          {dayNumber}
                        </Text>
                        <Text 
                          style={[
                            styles.dayName, 
                            isSelected && { color: colors.onPrimary },
                            isToday && !isSelected && { color: colors.primary }
                          ]}
                        >
                          {dayName.toUpperCase()}
                        </Text>
                      </View>
                    </Button>
                  </View>
                );
              })}
            </View>
            </ScrollView>

          </Card.Content>
        </Card>
        <Button
          mode="contained"
          onPress={saveAndContinue}
          contentStyle={styles.continueButtonContent}
          style={[styles.continueButton, { 
            backgroundColor: selectedDate ? colors.primary : colors.primary,
            shadowColor: colors.shadow
          }]}
          labelStyle={[styles.buttonLabel, { color: selectedDate ? colors.onPrimary : colors.onSurfaceVariant }]}
          disabled={!selectedDate}
        >
          Continuar
        </Button>
      </ScrollView>

    
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  progressStep: {
    height: 4,
    borderRadius: 2,
    flex: 1,
    maxWidth: 100,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  cardTitle: {
    paddingTop:20,
    fontWeight: '700',
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: 0.15,
    textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.25,
    opacity: 0.8,
    marginBottom: 16,
    textAlign: 'center',
  },
  selectionSection: {
    padding: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    textAlign: 'center',
    marginBottom: 16,
    marginLeft:15,
  },
  headerIcon: {
    marginRight: 12,
  },
  sectionHeader: {
    fontWeight: '600',
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 24,
  },
  dateRangeContainer: {
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
  },
  dateRangeText: {
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  daysGrid: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  dayContainer: {
    width: DAY_BUTTON_SIZE,
    marginBottom: 12,
  },
  dayButton: {
    borderRadius: 12,
    borderWidth: 1,
    height: DAY_BUTTON_SIZE,
    justifyContent: 'center',
    width: '100%',
    elevation: 0,
  },

  dayButtonLabel: {
    marginVertical: 0,
  },
  
  dayButtonContent: {
  alignItems: 'center',
  justifyContent: 'center',
  paddingVertical: 4,
},
dayNumber: {
  fontSize: 18,
  fontWeight: 'bold',
  marginBottom: 2,
},
dayName: {
  fontSize: 10,
  fontWeight: '500',
  letterSpacing: 0.4,
},
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingBottom: 72,
  },
  continueButton: {
    borderRadius: 12,
    marginTop:15,
    elevation: 3,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    borderColor:' #6a31ff',
  },
  continueButtonContent: {
    height: 50,
  },
  buttonLabel: {
    fontWeight: '600',
    fontSize: 16,
    letterSpacing: 0.5,
  },
});