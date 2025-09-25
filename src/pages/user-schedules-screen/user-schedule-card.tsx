import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, Linking, Image, Animated, Easing } from 'react-native';
import { Card, Text, Avatar, useTheme, IconButton, ProgressBar } from 'react-native-paper';
// import Geolocation from '@react-native-community/geolocation';
import { applyPhoneMask, formatDateToDDMMYYYY } from '../../utils/app-utils';
import { api } from '../../network/api';
import { generateRequestHeader } from '../../utils/app-utils';
import { useAuth } from '../../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
// import { Platform, PermissionsAndroid } from 'react-native';
// import { request, PERMISSIONS, RESULTS, check } from 'react-native-permissions';

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
  const heightAnim = new Animated.Value(0);

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

  // Função comentada: Solicitação de permissões de localização
  /*
  const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
      const status = await check(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);
      if (status === RESULTS.DENIED || status === RESULTS.BLOCKED) {
        const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          throw new Error('Permissão de localização negada ou bloqueada');
        }
      }
    } else {
      const status = await check(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
      if (status === RESULTS.DENIED || status === RESULTS.BLOCKED) {
        const result = await request(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
        if (result !== RESULTS.GRANTED) {
          throw new Error('Permissão de localização negada ou bloqueada');
        }
      }
      if (Platform.OS === 'ios' && parseInt(Platform.Version, 10) >= 14) {
        Geolocation.requestTemporaryFullAccuracy(
          'CheckInPurpose'
        ).then(level => {
          if (level !== 'full') {
            throw new Error('Localização precisa não autorizada. Vá em Ajustes e ative a localização precisa.');
          }
        });
      }
    }
  };
  */

  // Variável comentada: Endereço completo usado para geocoding
  // const enderecoCompleto = `${appointment.endereco_unidade} ${appointment.numero_unidade}, ${appointment.bairro_unidade}, ${appointment.cidade_unidade} - ${appointment.estado}`;

  // Função comentada: Obtenção de coordenadas a partir do endereço
  /*
  const getLatLngFromAddress = async (address: string) => {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (MyApp - contact@example.com)',
        },
      });
      const data = await response.json();
      if (data && data.length > 0) {
        return {
          latitude: parseFloat(data[0].lat),
          longitude: parseFloat(data[0].lon),
        };
      }
      return null;
    } catch (error) {
      console.error('Erro no geocoding:', error);
      return null;
    }
  };
  */

  useEffect(() => {
    const carregarCheckin = async () => {
      const checkin = await AsyncStorage.getItem(`checkin_${appointment.agenda_exames_id}`);
      if (checkin === 'true') {
        setCheckinRealizado(true);
      }
    };
    carregarCheckin();
  }, []);

  // Função comentada: Cálculo de distância entre duas coordenadas
  /*
  const getDistanceFromLatLonInMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371000;
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };
  */

  // Função comentada: Conversão de graus para radianos
  /*
  const deg2rad = (deg: number) => deg * (Math.PI / 180);
  */

  const validarCodigoAgendamento = async () => {
    try {
      const body = {
        codigoEticket: appointment.codigoValidadorAgendamento,
        cod_parceiro: appointment.cod_parceiro, // Adiciona o cod_parceiro
      };
      console.log('🔐 access_token sendo usado:', authData.access_token);
      console.log('📤 Corpo enviado:', body);

      const response = await api.post(`/integracao/validarCodigoAgendamento`, body, generateRequestHeader(authData.access_token));
      console.log('🔍 Status:', response.status);
      console.log('📦 Response data:', response.data);

      if (response.status === 200) {
        await AsyncStorage.setItem(`checkin_${appointment.agenda_exames_id}`, 'true');
        setCheckinRealizado(true);
        setTimeout(() => {
          Alert.alert('Sucesso', response.data.text || 'Você entrou na fila de espera.');
        }, 200);
      } else {
        Alert.alert('Erro', response.data.text || 'Não foi possível confirmar o agendamento.');
      }
    } catch (error) {
      if (error.response) {
        console.log('🚨 Erro status:', error.response.status);
        console.log('🚨 Erro data:', error.response.data);
      } else if (error.request) {
        console.log('⚠️ Erro na requisição, sem resposta do servidor:', error.request);
      } else {
        console.error('❌ Erro desconhecido:', error.message);
      }
      Alert.alert('Erro', 'Falha na validação do código de agendamento.');
    }
  };

  const handleChecking = async () => {
    // Comentado: Verificação de permissões de localização
    /*
    try {
      await requestLocationPermission();
    } catch (err) {
      if (String(err).includes('bloqueada') || String(err).includes('negada') || String(err).includes('precisa')) {
        Alert.alert('Permissões necessárias', String(err), [
          {
            text: 'Tentar novamente',
            onPress: async () => {
              const newStatus = await check(Platform.OS === 'ios' ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);
              if (newStatus === RESULTS.DENIED) {
                const result =
                  Platform.OS === 'android'
                    ? await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION)
                    : await request(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE, { purpose: 'CheckInPurpose' });
                if (result === PermissionsAndroid.RESULTS.GRANTED || result === RESULTS.GRANTED) {
                  handleChecking();
                } else {
                  Alert.alert('Permissão negada', 'Por favor, ative as permissões nas configurações.');
                }
              } else if (newStatus === RESULTS.GRANTED) {
                handleChecking();
              }
            },
          },
          {
            text: 'Abrir Configurações',
            onPress: async () => {
              await Linking.openSettings();
            },
          },
          { text: 'Cancelar', style: 'cancel' },
        ]);
      } else {
        Alert.alert('Permissões necessárias', String(err));
      }
      return;
    }
    */

    const dataAtual = new Date();
    dataAtual.setHours(0, 0, 0, 0);

    const [ano, mes, dia] = appointment.data.split('-');
    const dataAgendamento = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
    dataAgendamento.setHours(0, 0, 0, 0);

    if (dataAtual.getTime() !== dataAgendamento.getTime()) {
      Alert.alert('Check-in não permitido', 'Você só pode fazer o check-in na data do agendamento.');
      return;
    }

    setIsLoading(true);
    setGlobalLoading(true);

    // Comentado: Obtenção de coordenadas da clínica e do usuário
    /*
    const clinicCoords = await getLatLngFromAddress(enderecoCompleto);
    if (!clinicCoords) {
      setIsLoading(false);
      setGlobalLoading(false);
      Alert.alert('Erro', 'Não foi possível obter as coordenadas da clínica.');
      return;
    }

    Geolocation.getCurrentPosition(
      async position => {
        const userCoords = position.coords;
        if (Platform.OS === 'ios' && parseFloat(Platform.Version) >= 14 && userCoords.accuracy > 100) {
          setIsLoading(false);
          setGlobalLoading(false);
          Alert.alert('Localização aproximada', 'O check-in requer localização precisa. Por favor, ative a localização precisa nas configurações do app.', [
            {
              text: 'Abrir Configurações',
              onPress: async () => {
                await Linking.openSettings();
              },
            },
            { text: 'Cancelar', style: 'cancel' },
          ]);
          return;
        }

        const distance = getDistanceFromLatLonInMeters(userCoords.latitude, userCoords.longitude, clinicCoords.latitude, clinicCoords.longitude);
        console.log(`Distância do usuário até a clínica: ${distance} metros`);

        if (distance <= 600) {
          Alert.alert('Check-in permitido', 'Você está dentro da área permitida.');
          await validarCodigoAgendamento();
        } else {
          Alert.alert('Fora da área', 'Você está longe demais para fazer o check-in.');
        }

        setIsLoading(false);
        setGlobalLoading(false);
      },
      error => {
        Alert.alert('Erro', 'Não foi possível obter sua localização. Tente novamente ou desloque-se para o térreo, caso esteja em um local elevado.', [
          {
            text: 'Tentar novamente',
            onPress: () => handleChecking(), // Retry automático
          },
          { text: 'Cancelar', style: 'cancel' },
        ]);
        console.error(error);
        setIsLoading(false);
        setGlobalLoading(false);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 10000 }
    );
    */

    // Nova lógica: Chama validarCodigoAgendamento diretamente após verificar a data
    await validarCodigoAgendamento();
    setIsLoading(false);
    setGlobalLoading(false);
  };

  return (
    <Card style={[styles.card, checkinRealizado && styles.checkedInCard]} mode="elevated">
      {isLoading && <ProgressBar indeterminate color={colors.primary} style={styles.progressBar} />}

      <TouchableOpacity activeOpacity={0.9} onPress={() => setIsExpanded(!isExpanded)} style={styles.cardTouchable}>
        <Card.Content style={styles.cardContent}>
          {/* Header com informações principais */}
          <View style={styles.headerContainer}>
            <View style={styles.avatarContainer}>
              <Image source={{ uri: appointment.fachada_profissional || 'https://clinicas.gees.com.br/lsantos/clinicas/img/gees1.png' }} style={styles.avatar} resizeMode="cover" />
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

              {/* <View style={styles.clinicInfo}>
                <IconButton icon="hospital-building" size={14} iconColor={colors.primary} style={styles.smallIcon} />
                <Text variant="bodySmall" style={[styles.clinicName, { color: colors.onSurfaceVariant }]} numberOfLines={1}>
                  {appointment.nome_unidade}
                </Text>
              </View> */}

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

          {/* Conteúdo expandido */}
          {isExpanded && (
            <Animated.View style={styles.expandedContent}>
              <View style={styles.divider} />

              {/* Detalhes do procedimento */}
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

              {/* Botões de ação */}
              <View style={styles.actionsContainer}>
                <TouchableOpacity style={[styles.actionButton, styles.detailsButton, { backgroundColor: colors.surface }]} onPress={() => onPress(index)} activeOpacity={0.7}>
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
                    disabled={isLoading}>
                    <IconButton icon={checkinRealizado ? 'check-circle' : 'map-marker-check'} size={18} iconColor={checkinRealizado ? '#4CAF50' : '#FFF'} />
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
    overflow: 'hidden',
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
  clinicInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
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
  clinicName: {
    fontSize: 13,
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