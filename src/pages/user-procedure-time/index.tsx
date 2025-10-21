import { FlatList, RefreshControl, StyleSheet, View, Animated, Easing, ScrollView, Dimensions } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Button, Searchbar, Text, useTheme, Card, Divider } from 'react-native-paper';
import { useEffect, useRef, useState } from 'react';
import { api } from '../../network/api';
import LoadingFull from '../../components/loading-full';
import ProcedureError from '../user-procedure-details-screen/procedure-error';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { convertStringToNumber, formatDateToDDMMYYYY, formatTimeToHHMM } from '../../utils/app-utils';
import { useDadosUsuario } from '../../context/pessoa-dados-context';
import { useConsultas } from '../../context/consultas-context';
import { navigate } from '../../router/navigationRef';
import CustomBackdrop from '../../components/custom-backdrop-component';
import CustomToast from '../../components/custom-toast';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import { maskBrazilianCurrency } from '../../utils/app-utils';
import { Alert } from 'react-native';

dayjs.locale('pt-br');

interface UserProcedureTimeProps {
  navigation: any;
  route: any;
}

const { width } = Dimensions.get('window');
const DAY_BUTTON_SIZE = (width - 64) / 4; // 4 colunas com padding

export default function UserProcedureTime({ navigation, route }: UserProcedureTimeProps) {
  const { authData } = useAuth();
  const { colors } = useTheme();
  const { dadosUsuarioData } = useDadosUsuario();
  const { procedureTimeDetailsData, setProcedureTimeDetailsData } = useConsultas();
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedProfessional, setSelectedProfessional] = useState<any>(null);

  const bottomSheetRef = useRef<BottomSheet>(null);

  const openBottomSheet = () => {
    bottomSheetRef.current?.expand();
  };

  async function fetchDatasAndTimeByProcedure(cod_procedimento: string, cod_empresa: string, cod_parceiro: number) {
    const url = `/integracao/listHorariosUnidade?cod_procedimento=${cod_procedimento}&cod_empresa=${cod_empresa}&cod_parceiro=${cod_parceiro}`;

    // const url = cod_profissional
    //   ? `/integracao/listProfissionaisHorariosUnidade?cod_procedimento=${cod_procedimento}&cod_empresa=${cod_empresa}&cod_profissional=${cod_profissional}`
    //   : `/integracao/listHorariosUnidade?cod_procedimento=${cod_procedimento}&cod_empresa=${cod_empresa}`;

    setLoading(true);
    setRefreshing(true);

    try {
      const response = await api.get(url, {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `bearer ${authData.access_token}`,
        },
      });

      console.log('Response Status:', authData.access_token);
      const { data } = response;
      setProcedureTimeDetailsData(data);
      console.log('Dados de horários recebidos:', data);
      // Extrai as datas disponíveis da resposta
      const dates = Object.keys(data);
      setAvailableDates(dates);
      if (dates.length > 0 && !selectedDate) {
        setSelectedDate(dates[0]); // Seleciona a primeira data por padrão
      }

      // Animação ao carregar os dados
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
    } catch (err: any) {
      console.log(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    navigation.setOptions({
      title: '',
      headerStyle: {
        backgroundColor: colors.primaryContainer,
      },
      headerTintColor: colors.onPrimaryContainer,
    });

    fetchDatasAndTimeByProcedure(route.params.procedimento.cod_procedimento, route.params.procedimento.cod_empresa, route.params.procedimento.cod_parceiro);
  }, [navigation]);

  const onRefresh = async () => {
    await fetchDatasAndTimeByProcedure(route.params.procedimento.cod_procedimento, route.params.procedimento.cod_empresa, route.params.procedimento.cod_parceiro);
  };

  const getScheduleRequestData = (assinante: boolean, procedure: any) => {
  if (dadosUsuarioData.user.id_usuario_usr == 0) {
    CustomToast('Você precisa estar logado para continuar.', colors, 'error');
    navigate('user-login-screen-exams');
    return;
  }
console.log('dadosUsuarioData', JSON.stringify(dadosUsuarioData, null, 2));
  // 🚨 Verificação de assinatura antes de seguir
  if (assinante && !dadosUsuarioData.pessoaAssinatura?.assinatura_liberada) {
    Alert.alert(
      'Torne-se um Assinante!',
      'Não é assinante? Venha agora e aproveite descontos exclusivos para agendar seus procedimentos com preços especiais!',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Assinar Agora',
          onPress: () => navigate('user-contracts-stack'),
          style: 'default',
        },
      ],
      { cancelable: true }
    );
    return;
  }

  let schedule: ScheduleRequest = {
    data_agenda: selectedDate!,
    cod_agenda: Number(procedure.cod_agenda),
    cod_empresa: Number(procedure.cod_empresa),
    cod_horarioagenda: Number(procedure.cod_horarioagenda),
    cod_paciente: Number(dadosUsuarioData.pessoaDados?.id_pessoa_pes),

    cod_pessoa_pes: Number(dadosUsuarioData.pessoaDados?.id_pessoa_pes),
    cod_procedimento: assinante
      ? Number(procedure.cod_procedimento_assinatura)
      : Number(procedure.cod_procedimento_particular),
    cod_profissional: Number(procedure.cod_profissional),
    cod_sala: Number(procedure.cod_sala),
    hora_agenda: procedure.selected_time.split(':').slice(0, 2).join(':'), // Normaliza HH:MM
    payment_method: null,
    token_paciente: dadosUsuarioData.pessoaDados?.cod_token_pes!,
    vlr_procedimento: assinante
      ? convertStringToNumber(procedure.vlr_procedimento_assinatura)
      : convertStringToNumber(procedure.vlr_procedimento_particular),
    cod_parceiro: Number(route.params.procedimento.cod_parceiro),
  };

  navigate('user-select-payment-method', schedule);
};

const handleTimeSelect = (time: string, professional: any) => {
  const normalizedTime = time.split(':').slice(0, 2).join(':'); // HH:mm
  const selectedDateTime = dayjs(`${selectedDate} ${normalizedTime}`, "YYYY-MM-DD HH:mm");

  // 🚨 Verifica se a data/hora selecionada já passou
  if (selectedDateTime.isBefore(dayjs())) {
    Alert.alert(
      "Horário inválido",
      "Esse horário já passou. Por favor, selecione um horário válido."
    );
    return;
  }

  setSelectedProfessional({
    ...professional,
    selected_time: normalizedTime,
  });
  openBottomSheet();
};

  const getFilteredProcedures = () => {
    const procedures = procedureTimeDetailsData.procedureTimeDetails;
    if (!procedures || !selectedDate) return [];
    return procedures[selectedDate] || [];
  };

  return (
    <>
      {loading ? (
        <View style={{ flex: 1 }}>
          <LoadingFull />
        </View>
      ) : (
        <View style={[styles.container, { backgroundColor: colors.fundo }]}>
          {!procedureTimeDetailsData.procedureTimeDetails ? (
            <ProcedureError
              icon="alert-circle"
              title="Nenhum Horário Disponível"
              body="Infelizmente, não há horários para este procedimento no momento. Tente novamente mais tarde."
            />
          ) : (
            <Animated.View
              style={{
                flex: 1,
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              }}>
              {/* Barra de progresso */}
              <View style={{ flexDirection: 'row', marginBottom: 25, marginTop: 28, marginEnd: 15, marginStart: 15, gap: 0 }}>
                {[1, 2, 3].map((_, index) => (
                  <View
                    key={index}
                    style={{
                      flex: 1,
                      height: 6,
                      marginEnd: 20,
                      marginStart: 20,
                      borderRadius: 5,
                      backgroundColor: index < 2 ? colors.primary : colors.onSecondary,
                    }}
                  />
                ))}
              </View>

              <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Card Principal */}
                <Card style={[styles.card, { backgroundColor: colors.surface }]} mode="elevated">
                  <Card.Title
                    style={[{ backgroundColor: colors.primary }]}
                    title={route.params.procedimento.empresa}
                    titleStyle={[styles.cardTitle, { color: colors.onSecondary }]}
                    subtitle={`${route.params.procedimento.cidade} - ${route.params.procedimento.estado}`}
                    subtitleStyle={[styles.cardSubtitle, { color: colors.onSecondary }]}
                    titleNumberOfLines={2}
                  />

                  {/* Seção de seleção de data */}
                  <Card.Content style={[styles.selectionSection, { backgroundColor: colors.surface }]}>
                    <View style={styles.headerContainer}>
                      <Text variant="titleMedium" style={[styles.sectionHeader, { color: colors.onSurface }]}>
                        Selecione o dia do seu Agendamento:
                      </Text>
                    </View>

                    {/* Dias disponíveis em grid */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={styles.daysGrid}>
                        {availableDates.map(date => {
                          const dayjsDate = dayjs(date);
                          const dayNumber = dayjsDate.date();
                          const dayName = dayjsDate.format('ddd').toUpperCase();
                          const isSelected = selectedDate === date;

                          return (
                            <View key={date} style={styles.dayContainer}>
                              <Button
                                mode={isSelected ? 'contained' : 'outlined'}
                                onPress={() => setSelectedDate(date)}
                                style={[styles.dayButton, isSelected && { backgroundColor: colors.primary }]}
                                labelStyle={[styles.dayButtonLabel, isSelected && { color: colors.onPrimary }]}>
                                <View style={styles.dayButtonContent}>
                                  <Text style={[styles.dayNumber, isSelected && { color: colors.onPrimary }]}>{dayNumber}</Text>
                                  <Text style={[styles.dayName, isSelected && { color: colors.onPrimary }]}>{dayName}</Text>
                                </View>
                              </Button>
                            </View>
                          );
                        })}
                      </View>
                    </ScrollView>

                    {/* Horários disponíveis */}
                    {selectedDate &&
                      getFilteredProcedures().map((professional, profIndex) => (
                        <View key={`${professional.cod_profissional}-${professional.cod_agenda}-${profIndex}`} style={styles.professionalContainer}>
                          <View style={styles.professionalHeader}>
                            <MaterialIcons name="person" size={20} color={colors.onSurface} />
                            <Text variant="bodyLarge" style={[styles.professionalName, { color: colors.onSurface }]}>
                              {professional.nome_profissional}
                            </Text>
                          </View>

                          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timesScrollView}>
                            <View style={styles.timesContainer}>
                              {professional.horarios_list.map((time: string, timeIndex: number) => (
                                <Button
                                  key={`${professional.cod_profissional}-${time}-${timeIndex}`}
                                  mode="outlined"
                                  onPress={() => handleTimeSelect(time, professional)}
                                  style={[styles.timeButton, { borderColor: colors.primary }]}
                                  labelStyle={[styles.timeButtonLabel, { color: colors.primary }]}>
                                  {time.slice(0, 5)}
                                </Button>
                              ))}
                            </View>
                          </ScrollView>
                        </View>
                      ))}
                  </Card.Content>
                </Card>
              </ScrollView>
            </Animated.View>
          )}

          {/* Bottom Sheet para confirmação */}
          <BottomSheet
            backdropComponent={props => <CustomBackdrop {...props} opacity={0.7} />}
            ref={bottomSheetRef}
            index={-1}
            snapPoints={['50%', '75%']}
            enablePanDownToClose
            backgroundStyle={{ backgroundColor: colors.surface }}
            handleIndicatorStyle={{ backgroundColor: colors.primary }}
            handleStyle={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
            }}>
            <BottomSheetScrollView contentContainerStyle={[styles.sheetContent, { backgroundColor: colors.surface }]}>
              {selectedProfessional ? (
                <>
                  <View style={styles.sheetHeader}>
                    <MaterialIcons name="event-available" size={28} color={colors.primary} />
                    <Text variant="titleLarge" style={[styles.sheetTitle, { color: colors.onSurface }]}>
                      Confirmar Agendamento
                    </Text>
                  </View>

                  <View style={styles.summaryContainer}>
                    <View style={styles.summaryRow}>
                      <MaterialIcons name="calendar-today" size={20} color={colors.onSurfaceVariant} />
                      <Text variant="bodyLarge" style={[styles.summaryText, { color: colors.onSurface }]}>
                        {formatDateToDDMMYYYY(selectedDate!)}
                      </Text>
                    </View>

                    <View style={styles.summaryRow}>
                      <MaterialIcons name="access-time" size={20} color={colors.onSurfaceVariant} />
                      <Text variant="bodyLarge" style={[styles.summaryText, { color: colors.onSurface }]}>
                        {formatTimeToHHMM(selectedProfessional.selected_time!)}
                      </Text>
                    </View>

                    <View style={styles.summaryRow}>
                      <MaterialIcons name="person" size={20} color={colors.onSurfaceVariant} />
                      <Text variant="bodyLarge" style={[styles.summaryText, { color: colors.onSurface }]}>
                        {selectedProfessional.nome_profissional}
                      </Text>
                    </View>

                    <View style={styles.summaryRow}>
                      <MaterialIcons name="badge" size={20} color={colors.onSurfaceVariant} />
                      <Text variant="bodyLarge" style={[styles.summaryText, { color: colors.onSurface }]}>
                        {selectedProfessional.conselho_profissional}
                      </Text>
                    </View>

                    <View style={styles.divider} />

                    {/* <View style={styles.priceRow}>
                      <Text variant="bodyLarge" style={[styles.priceLabel, { color: colors.onSurface }]}>
                        Valor Assinante:
                      </Text>
                      <Text variant="titleMedium" style={[styles.priceValue, { color: colors.primary }]}>
                        R$ {selectedProfessional.vlr_procedimento_assinatura}
                      </Text>
                    </View>

                    <View style={styles.priceRow}>
                      <Text variant="bodyLarge" style={[styles.priceLabel, { color: colors.onSurface }]}>
                        Valor Particular:
                      </Text>
                      <Text variant="titleMedium" style={[styles.priceValue, { color: colors.primary }]}>
                        R$ {selectedProfessional.vlr_procedimento_particular}
                      </Text>
                    </View> */}

                    <Button
  mode="contained"
  icon="star"
  contentStyle={styles.buttonContent}
  style={[
    styles.button,
    {
      backgroundColor: colors.primary,
      marginTop: 20,
    },
  ]}
  onPress={() => getScheduleRequestData(true, selectedProfessional)}
  labelStyle={styles.buttonLabel}
>
  {`Assinante - R$ ${selectedProfessional.vlr_procedimento_assinatura}`}
</Button>

                    <Button
                      mode="outlined"
                      icon="account-circle"
                      contentStyle={styles.buttonContent}
                      style={[
                        styles.button,
                        {
                          borderColor: colors.primary,
                          marginTop: 12,
                        },
                      ]}
                      onPress={() => getScheduleRequestData(false, selectedProfessional)}
                      labelStyle={[styles.buttonLabel, { color: colors.primary }]}>
                      {`Particular - R$ ${selectedProfessional.vlr_procedimento_particular}`}
                    </Button>
                  </View>
                </>
              ) : (
                <View style={styles.emptyContainer}>
                  <MaterialIcons name="info-outline" size={40} color={colors.onSurfaceVariant} style={styles.emptyIcon} />
                  <Text variant="bodyLarge" style={{ color: colors.onSurfaceVariant, textAlign: 'center' }}>
                    Nenhum horário selecionado. Selecione um horário para continuar.
                  </Text>
                </View>
              )}
            </BottomSheetScrollView>
          </BottomSheet>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
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
    paddingTop: 20,
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
    marginLeft: 15,
  },
  sectionHeader: {
    fontWeight: '600',
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 24,
  },
  daysGrid: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    paddingBottom: 16,
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
  professionalContainer: {
    marginBottom: 20,
  },
  professionalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  professionalName: {
    marginLeft: 8,
    fontWeight: '800',
  },
  professionalInfo: {
    marginLeft: 28,
    marginBottom: 8,
    fontSize: 12,
  },
  timesScrollView: {
    marginVertical: 8,
  },
  timesContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 16,
  },
  timeButton: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 50, // ajuste conforme o tamanho desejado
    minWidth: 70, // opcional: garante um tamanho mínimo
    paddingHorizontal: 8,
    borderRadius: 8,
    margin: 4,
  },
  timeButtonLabel: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    textAlignVertical: 'center', // Android
  },
  sheetContent: {
    flex: 1,
    padding: 24,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  sheetTitle: {
    marginLeft: 12,
    fontSize: 20,
    fontWeight: '700',
  },
  summaryContainer: {
    width: '100%',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryText: {
    marginLeft: 12,
    flex: 1,
    fontSize: 16,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginVertical: 16,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 16,
  },
  priceValue: {
    fontWeight: '700',
    fontSize: 18,
  },
  button: {
    borderRadius: 12,
    height: 70,
  },
  buttonContent: {
    height: '100%',
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyIcon: {
    marginBottom: 16,
  },
});
