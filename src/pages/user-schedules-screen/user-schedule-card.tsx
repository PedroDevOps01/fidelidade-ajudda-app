import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, Linking, Image, Animated, Easing, Platform } from 'react-native';
import { Card, Text, IconButton, ProgressBar, useTheme } from 'react-native-paper';
import GeolocationCommunity from '@react-native-community/geolocation'; // Para Android
import GeolocationService from 'react-native-geolocation-service'; // Para iOS
import { applyPhoneMask, formatDateToDDMMYYYY } from '../../utils/app-utils';
import { api } from '../../network/api';
import { generateRequestHeader } from '../../utils/app-utils';
import { useAuth } from '../../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';

type Props = {
  index: number;
  appointment: UserSchedule;
  onPress: (index: number) => void;
  setGlobalLoading: (value: boolean) => void;
  showCheckinButton?: boolean;
};

const UserScheduleCard = (props: Props) => {
  const { index, appointment, onPress, setGlobalLoading, showCheckinButton = true } = props;
  const { colors } = useTheme();
  const [checkinRealizado, setCheckinRealizado] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const { authData } = useAuth();

  const rotateAnim = new Animated.Value(0);

  useEffect(() => {
    Animated.timing(rotateAnim, {
      toValue: isExpanded ? 1 : 0,
      duration: 300,
      easing: Easing.ease,
      useNativeDriver: true,
    }).start();
  }, [isExpanded]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  // Função para verificar e solicitar permissão de localização
  const checkLocationPermission = async () => {
    try {
      const permission = Platform.OS === 'android' ? PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION : PERMISSIONS.IOS.LOCATION_WHEN_IN_USE;
      const status = await check(permission);

      console.log(`Status da permissão de localização: ${status}`);

      if (status === RESULTS.DENIED) {
        const result = await request(permission);
        if (result !== RESULTS.GRANTED) {
          throw new Error('Permissão de localização negada. Por favor, ative a localização nas configurações.');
        }
      } else if (status === RESULTS.BLOCKED) {
        throw new Error('Permissão de localização bloqueada. Por favor, ative-a nas configurações.');
      }

      console.log('Permissão de localização verificada com sucesso.');
      return true;
    } catch (error) {
      console.log('Erro ao verificar permissão de localização:', error.message);
      throw error;
    }
  };

  // Função para calcular a distância entre duas coordenadas (em metros)
  const getDistanceFromLatLonInMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371000; // Raio da Terra em metros
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Função para converter graus em radianos
  const deg2rad = (deg: number) => deg * (Math.PI / 180);

  useEffect(() => {
    const carregarCheckin = async () => {
      const checkin = await AsyncStorage.getItem(`checkin_${appointment.agenda_exames_id}`);
      if (checkin === 'true') {
        setCheckinRealizado(true);
      }
    };
    carregarCheckin();
  }, [appointment.agenda_exames_id]);

  const validarCodigoAgendamento = async () => {
    try {
      const body = {
        codigoEticket: appointment.codigoValidadorAgendamento,
        cod_parceiro: appointment.cod_parceiro,
      };
      console.log('Enviando validação de agendamento:', body);
      const response = await api.post(`/integracao/validarCodigoAgendamento`, body, generateRequestHeader(authData.access_token));

      if (response.status === 200) {
        await AsyncStorage.setItem(`checkin_${appointment.agenda_exames_id}`, 'true');
        setCheckinRealizado(true);
        Alert.alert('Sucesso', response.data.text || 'Você entrou na fila de espera.');
      } else {
        Alert.alert('Erro', response.data.text || 'Não foi possível confirmar o agendamento.');
      }
    } catch (error) {
      let errorMessage = 'Falha na validação do código de agendamento.';
      if (error.response) {
        errorMessage = error.response.data?.text || errorMessage;
      } else if (error.request) {
        errorMessage = 'Sem resposta do servidor. Verifique sua conexão.';
      }
      console.log('Erro na validação do agendamento:', errorMessage);
      Alert.alert('Erro', errorMessage);
      throw error;
    }
  };

  const handleChecking = async () => {
    console.log('Iniciando check-in...');

    // 1. Verificar a data do agendamento
    const dataAtual = new Date();
    dataAtual.setHours(0, 0, 0, 0);

    const [ano, mes, dia] = appointment.data.split('-');
    const dataAgendamento = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
    dataAgendamento.setHours(0, 0, 0, 0);

    console.log('Data atual:', dataAtual.toISOString());
    console.log('Data do agendamento:', dataAgendamento.toISOString());

    if (dataAtual.getTime() !== dataAgendamento.getTime()) {
      console.log('Check-in não permitido: data diferente do agendamento.');
      Alert.alert('Check-in não permitido', 'Você só pode fazer o check-in na data do agendamento.');
      return;
    }

    // 2. Verificar permissões de localização
    setIsLoading(true);
    setGlobalLoading(true);

    try {
      const hasPermission = await checkLocationPermission();
      if (!hasPermission) {
        throw new Error('Permissão de localização não concedida.');
      }
      console.log('Permissão de localização confirmada.');
    } catch (error) {
      setIsLoading(false);
      setGlobalLoading(false);
      Alert.alert(
        'Permissões necessárias',
        error.message,
        [
          { text: 'Tentar novamente', onPress: handleChecking },
          { text: 'Abrir Configurações', onPress: () => Linking.openSettings() },
          { text: 'Cancelar', style: 'cancel' },
        ]
      );
      return;
    }

    // 3. Escolher a biblioteca de geolocalização com base na plataforma
    const Geolocation = Platform.OS === 'ios' ? GeolocationService : GeolocationCommunity;

    // 4. Obter localização do usuário
    Geolocation.getCurrentPosition(
      async (position) => {
        const userCoords = position.coords;
        console.log('Coordenadas do usuário:', userCoords);

        // Verificar precisão da localização no iOS
        if (Platform.OS === 'ios' && userCoords.accuracy > 100) {
          console.log('Localização aproximada detectada no iOS.');
          setIsLoading(false);
          setGlobalLoading(false);
          Alert.alert(
            'Localização aproximada',
            'O check-in requer localização precisa. Por favor, ative a localização precisa nas configurações do dispositivo.',
            [
              { text: 'Abrir Configurações', onPress: () => Linking.openSettings() },
              { text: 'Cancelar', style: 'cancel' },
            ]
          );
          return;
        }

        // 5. Comparar com as coordenadas da clínica
        const clinicLatitude = parseFloat(appointment.latitude);
        const clinicLongitude = parseFloat(appointment.longitude);
        console.log('Coordenadas da clínica:', { latitude: clinicLatitude, longitude: clinicLongitude });

        if (isNaN(clinicLatitude) || isNaN(clinicLongitude)) {
          console.log('Erro: coordenadas da clínica inválidas.');
          setIsLoading(false);
          setGlobalLoading(false);
          Alert.alert('Erro', 'Coordenadas da clínica inválidas.');
          return;
        }

        const distance = getDistanceFromLatLonInMeters(userCoords.latitude, userCoords.longitude, clinicLatitude, clinicLongitude);
        console.log(`Distância até a clínica: ${distance.toFixed(2)} metros`);

        // 6. Verificar se está dentro do raio permitido (600 metros)
        if (distance <= 600) {
          console.log('Usuário dentro do raio permitido. Validando código do agendamento...');
          try {
            await validarCodigoAgendamento();
            console.log('Check-in realizado com sucesso.');
          } catch (error) {
            console.log('Erro ao validar código de agendamento:', error);
          }
        } else {
          console.log('Usuário fora do raio permitido (600 metros).');
          Alert.alert('Fora da área', 'Você está fora do raio de 600 metros da clínica para realizar o check-in.');
        }
        setIsLoading(false);
        setGlobalLoading(false);
      },
      (error) => {
        console.log('Erro ao obter localização do usuário:', error);
        setIsLoading(false);
        setGlobalLoading(false);
        let errorMessage = 'Não foi possível obter sua localização. Tente novamente ou configure uma localização no emulador.';

        switch (error.code) {
          case 1:
            errorMessage = 'Permissão de localização negada. Por favor, verifique as configurações.';
            break;
          case 2:
            errorMessage = 'Serviço de localização indisponível. Verifique se a localização está ativada.';
            break;
          case 3:
            errorMessage = 'Tempo limite excedido ao obter a localização. Tente novamente.';
            break;
          default:
            errorMessage = `Erro ao obter localização: ${error.message}`;
        }

        Alert.alert('Erro', errorMessage, [
          { text: 'Tentar novamente', onPress: handleChecking },
          { text: 'Abrir Configurações', onPress: () => Linking.openSettings() },
          { text: 'Cancelar', style: 'cancel' },
        ]);
      },
      {
        enableHighAccuracy: true, // Exigir alta precisão
        timeout: 20000, // Tempo limite de 20 segundos
        maximumAge: Platform.OS === 'ios' ? 1000 : 10000, // Cache de localização mais restrito no iOS
        distanceFilter: Platform.OS === 'ios' ? 0 : 10, // Ajuste para maior precisão no iOS
      }
    );
  };

  return (
    <View style={{ overflow: 'visible' }}>
      <Card style={[styles.card, checkinRealizado && styles.checkedInCard]} mode="elevated">
        {isLoading && <ProgressBar indeterminate color={colors.primary} style={styles.progressBar} />}
        <TouchableOpacity activeOpacity={0.9} onPress={() => setIsExpanded(!isExpanded)} style={styles.cardTouchable}>
          <Card.Content style={styles.cardContent}>
            <View style={styles.headerContainer}>
              <View style={styles.avatarContainer}>
                <Image
                  source={{ uri: appointment.fachada_profissional || 'https://clinicas.gees.com.br/lsantos/clinicas/img/gees1.png' }}
                  style={styles.avatar}
                  resizeMode="cover"
                />
                {checkinRealizado && (
                  <View style={styles.checkinIndicator}>
                    <IconButton icon="check" size={12} iconColor="#FFF" style={styles.checkIcon} />
                  </View>
                )}
              </View>

              <View style={styles.headerTextContainer}>
                <Text variant="titleMedium" style={[styles.professionalName, { color: colors.onSurface }]}>
                  {appointment.nome_profissional}
                </Text>
                <View style={styles.dateTimeContainer}>
                  <View style={styles.dateTimeItem}>
                    <IconButton icon="calendar" size={14} iconColor={colors.primary} style={styles.smallIcon} />
                    <Text variant="bodySmall" style={[styles.dateTimeText, { color: colors.onSurfaceVariant }]}>
                      {formatDateToDDMMYYYY(appointment.data)}
                    </Text>
                  </View>
                  <View style={styles.dateTimeItem}>
                    <IconButton icon="clock-outline" size={14} iconColor={colors.primary} style={styles.smallIcon} />
                    <Text variant="bodySmall" style={[styles.dateTimeText, { color: colors.onSurfaceVariant }]}>
                      {String(appointment.inicio).substring(0, 5)}
                    </Text>
                  </View>
                </View>
              </View>

              <Animated.View style={{ transform: [{ rotate }] }}>
                <IconButton icon="chevron-down" size={24} iconColor={colors.onSurfaceVariant} onPress={() => setIsExpanded(!isExpanded)} />
              </Animated.View>
            </View>

            {isExpanded && (
              <Animated.View style={styles.expandedContent}>
                <View style={styles.divider} />
                <View style={styles.detailSection}>
                  <View style={styles.detailRow}>
                    <IconButton icon="stethoscope" size={18} iconColor={colors.primary} style={styles.icon} />
                    <View style={styles.detailTextContainer}>
                      <Text variant="bodySmall" style={[styles.detailLabel, { color: colors.onSurfaceVariant }]}>
                        Procedimento
                      </Text>
                      <Text variant="bodyMedium" style={[styles.detailValue, { color: colors.onSurface }]}>
                        {appointment.nome_procedimento.join(', ')}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <IconButton icon="hospital-building" size={14} iconColor={colors.primary} style={styles.icon} />
                    <View style={styles.detailTextContainer}>
                      <Text variant="bodySmall" style={[styles.detailLabel, { color: colors.onSurfaceVariant }]}>
                        CLÍNICA/HOSPITAL
                      </Text>
                      <Text variant="bodyMedium" style={[styles.detailValue, { color: colors.onSurface }]}>
                        {appointment.nome_unidade}
                      </Text>
                    </View>
                  </View>

                  {appointment.contato_paciente && (
                    <View style={styles.detailRow}>
                      <IconButton icon="phone" size={18} iconColor={colors.primary} style={styles.icon} />
                      <View style={styles.detailTextContainer}>
                        <Text variant="bodySmall" style={[styles.detailLabel, { color: colors.onSurfaceVariant }]}>
                          Contato
                        </Text>
                        <Text variant="bodyMedium" style={[styles.detailValue, { color: colors.onSurface }]}>
                          {applyPhoneMask(appointment.contato_paciente)}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>

                <View style={styles.actionsContainer}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.detailsButton, { backgroundColor: colors.surface }]}
                    onPress={() => onPress(index)}
                    activeOpacity={0.7}
                  >
                    <IconButton icon="information-outline" size={18} iconColor={colors.primary} />
                    <Text variant="bodyMedium" style={[styles.buttonText, { color: colors.primary }]}>
                      Detalhes
                    </Text>
                  </TouchableOpacity>

                  {showCheckinButton && (
                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        checkinRealizado ? styles.checkedInButton : styles.checkinButton,
                        { backgroundColor: checkinRealizado ? '#E8F5E9' : colors.primary },
                      ]}
                      activeOpacity={0.7}
                      onPress={() => {
                        if (checkinRealizado) {
                          Alert.alert('Já na Sala de Espera', 'Você já realizou o check-in e está na sala de espera.');
                        } else {
                          handleChecking();
                        }
                      }}
                      disabled={isLoading}
                    >
                      <IconButton
                        icon={checkinRealizado ? 'check-circle' : 'map-marker-check'}
                        size={18}
                        iconColor={checkinRealizado ? '#4CAF50' : '#FFF'}
                      />
                      <Text variant="bodyMedium" style={[styles.buttonText, { color: checkinRealizado ? '#4CAF50' : '#FFF' }]}>
                        {checkinRealizado ? 'Na fila' : 'Check-in'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </Animated.View>
            )}
          </Card.Content>
        </TouchableOpacity>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  cardTouchable: {
    flex: 1,
  },
  checkedInCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  progressBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    height: 3,
  },
  cardContent: {
    padding: 16,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatarContainer: {
    marginRight: 12,
    position: 'relative',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f5f5f5',
  },
  checkinIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  checkIcon: {
    margin: 0,
    width: 16,
    height: 16,
  },
  headerTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  professionalName: {
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 4,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dateTimeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 2,
  },
  smallIcon: {
    margin: 0,
    marginLeft: -8,
    width: 18,
    height: 18,
  },
  dateTimeText: {
    fontSize: 13,
  },
  expandedContent: {
    marginTop: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginBottom: 16,
  },
  detailSection: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  icon: {
    margin: 0,
    marginRight: 12,
    width: 24,
    height: 24,
  },
  detailTextContainer: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 2,
    paddingHorizontal: 5,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  detailsButton: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  checkinButton: {
    borderWidth: 0,
  },
  checkedInButton: {
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
    marginRight: 15,
  },
});

export default UserScheduleCard;