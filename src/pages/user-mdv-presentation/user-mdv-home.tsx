import { useCallback, useState } from 'react';
import { Alert, RefreshControl, SafeAreaView, ScrollView, StyleSheet, TouchableOpacity, View, Dimensions } from 'react-native';
import { Button, Icon, Menu, Text, useTheme } from 'react-native-paper';
import { navigate } from '../../router/navigationRef';
import { Dropdown } from 'react-native-element-dropdown';
import SalesChart from './charts/sales-charts';
import { api } from '../../network/api';
import { useDadosUsuario } from '../../context/pessoa-dados-context';
import { generateRequestHeader, log } from '../../utils/app-utils';
import { useAuth } from '../../context/AuthContext';
import TotalSalesValue from './charts/total-sales-value';
import CopyMdvLink from './charts/copy-mdv-link';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import ModalContainer from '../../components/modal';
import CustomDatePicker from '../../components/custom-date-picker';
import { TextInput } from 'react-native-paper';
import { useLayoutEffect } from "react";
import dayjs from 'dayjs';

type DashboardDates = {
  startDate: Date | null;
  endDate: Date | null;
};

const { width } = Dimensions.get('window');

export default function UserMdvHome({ navigation }: { navigation: any }) {
  const { colors } = useTheme();
  const { dadosUsuarioData } = useDadosUsuario();
  const { authData } = useAuth();
  const [codigoPromocional, setCodigoPromocional] = useState<string | undefined>(undefined);

  const [modalCodigoVisible, setModalCodigoVisible] = useState(false);
  const [inputCodigo, setInputCodigo] = useState('');
  const [loading, setLoading] = useState<boolean>(false);
  const [periodModalVisible, setPeriodModalVisible] = useState<boolean>(false);
  const [menuVisible, setMenuVisible] = useState(false);

  const [dates, setDates] = useState<DashboardDates>({
    startDate: null,
    endDate: null,
  });

  const [totalSales, setTotalSales] = useState<Sale[]>([]);
  
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      title: 'Minhas Vendas',
      headerTitleAlign: 'center',
      headerStyle: { 
        backgroundColor: colors.primaryContainer,
        elevation: 0,
        shadowOpacity: 0,
      },
      headerTintColor: colors.onPrimary,
      headerTitleStyle: {
        fontWeight: '700',
        fontSize: 20,
      },
    });
  }, [navigation]);

  const data = dadosUsuarioData.pessoaMdv?.map(e => {
    let tipo = '';
    if (e.id_tipo_cargo_umv == 1) tipo = 'Diretor';
    if (e.id_tipo_cargo_umv == 2) tipo = 'Gerente';
    if (e.id_tipo_cargo_umv == 3) tipo = 'Vendedor';

    return {
      label: tipo,
      value: e.id_usuario_mdv_umv,
    };
  });

  const [value, setValue] = useState(data![0].value);
  const [isFocus, setIsFocus] = useState(false);

  const fetchMonthlySales = async () => {
    setLoading(true);

    const id_pessoa = value;
    let qry = `usuario-mdv/relatorio/vendas?id_usuario=${id_pessoa}`;

    if (dates.startDate && dates.endDate) {
      qry += `&first_date=${dayjs(dates.startDate).format('YYYY-MM-DD')}&second_date=${dayjs(dates.endDate).format('YYYY-MM-DD')}`;
    }

    const response = await api.get(qry, generateRequestHeader(authData.access_token));
    if (response.status == 200) {
      const { data } = response;
      setTotalSales(data.response);
      console.log('fetchMonthlySales -> data', data);
      setLoading(false);
    } else {
      Alert.alert('Aviso', 'Erro ao carregar vendas! Tente novamente mais tarde.');
    }
  };

  const handleFocusEffect = useCallback(() => {
    fetchMonthlySales();
  }, [value]);

  useFocusEffect(handleFocusEffect);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        padding: 16,
        paddingBottom: 30,
      }}
      refreshControl={
        <RefreshControl
          colors={[colors.primary]}
          tintColor={colors.primary}
          onRefresh={fetchMonthlySales}
        />
      }
    >
      {/* Filtros */}
      <View style={styles.filtersContainer}>
        <View style={[styles.filterCard, { backgroundColor: colors.surface, borderRadius: 16, elevation: 3 }]}>
          <Text variant="labelMedium" style={[styles.filterLabel, { color: colors.onSurfaceVariant }]}>
            NÍVEL DE VENDEDOR
          </Text>
          <Dropdown
            style={[
              styles.dropdown,
              {
                backgroundColor: colors.surface,
                borderColor: isFocus ? colors.primaryContainer : colors.primaryContainer,
              },
            ]}
            placeholderStyle={[styles.placeholderStyle, { color: colors.primaryContainer }]}
            selectedTextStyle={[styles.selectedTextStyle, { color: colors.primaryContainer }]}
            iconStyle={[styles.iconStyle, { tintColor: colors.primary }]}
            data={data!}
            labelField="label"
            valueField="value"
            placeholder={!isFocus ? 'Selecione' : '...'}
            value={value ?? data![0]}
            onFocus={() => setIsFocus(true)}
            onBlur={() => setIsFocus(false)}
            onChange={item => {
              setValue(item.value);
              setIsFocus(false);
            }}
          />
        </View>
      </View>
      
      <TouchableOpacity 
        onPress={() => setPeriodModalVisible(true)} 
        style={[styles.dateFilterButton, { backgroundColor: colors.surface, borderColor: colors.primary }]}
      >
        <Icon source="calendar" size={20} color={colors.primary} />
        <Text variant="labelMedium" style={{ color: colors.primary, marginLeft: 8 }}>
          Filtro Data: {dates.startDate ? formatDate(dates.startDate) : 'Início'} - {dates.endDate ? formatDate(dates.endDate) : 'Fim'}
        </Text>

      </TouchableOpacity>
                      <CopyMdvLink id={value} codigoPromocional={codigoPromocional} />

      {/* Dashboard de Métricas */}
      <View style={styles.metricsContainer}>
        <TotalSalesValue salesData={totalSales} currentMdv={value} />

        <View style={[styles.chartContainer, { backgroundColor: colors.surface, borderRadius: 16, elevation: 2 }]}>
          <SalesChart salesData={totalSales} loading={loading} />
        </View>
      </View>

      {/* Ações Rápidas */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.surface, borderColor: colors.primary }]}
          onPress={() => navigate('user-mdv-sales-extract', { recipient_id: dadosUsuarioData.pessoaMdv?.filter(e => e.id_usuario_mdv_umv == value)[0].cod_recipients_umv })}>
          <Icon source="file-document" size={24} color={colors.primary} />
          <Text variant="labelLarge" style={[styles.actionText, { color: colors.primary }]}>
            Meu extrato
          </Text>
        </TouchableOpacity>

      </View>

      {/* Modal de Código Promocional */}
      <ModalContainer visible={modalCodigoVisible} handleVisible={() => setModalCodigoVisible(false)}>
        <View style={styles.modalHeader}>
          <Text variant="titleMedium" style={styles.modalTitle}>
            Código Promocional
          </Text>
        </View>

        <TextInput
          mode="outlined"
          label="Digite seu código"
          value={inputCodigo}
          onChangeText={setInputCodigo}
          style={styles.textInput}
          outlineColor={colors.outline}
          activeOutlineColor={colors.primary}
        />

        <View style={styles.modalActions}>
          <Button 
            mode="outlined" 
            style={[styles.modalButton, { borderColor: colors.primary }]} 
            onPress={() => setModalCodigoVisible(false)}
            labelStyle={{ color: colors.primary }}
          >
            Cancelar
          </Button>
          <Button
            mode="contained"
            style={styles.modalButton}
            onPress={async () => {
              setLoading(true);
              const novoCodigo = await enviarCodigoPromo(value, inputCodigo, authData.access_token);
              setLoading(false);
              setModalCodigoVisible(false);

              if (novoCodigo) {
                setCodigoPromocional(novoCodigo);
                setInputCodigo(novoCodigo);
              }
            }}
            labelStyle={{ color: colors.onPrimary }}
          >
            Salvar
          </Button>
        </View>
      </ModalContainer>

      {/* Modal de Período */}
      <ModalContainer visible={periodModalVisible} handleVisible={() => setPeriodModalVisible(false)}>
        <View style={styles.modalHeader}>
          <Text variant="titleMedium" style={styles.modalTitle}>
            Selecionar Período
          </Text>
        </View>

        <View style={styles.datePickerContainer}>
          <View style={styles.dateInput}>
            <Text variant="bodyMedium" style={[styles.dateLabel, { color: colors.onSurface }]}>
              Data Inicial
            </Text>
            <CustomDatePicker value={dates.startDate} onChange={(e, date) => date && setDates(prev => ({ ...prev, startDate: date }))} mode="date" />
          </View>

          <View style={styles.dateInput}>
            <Text variant="bodyMedium" style={[styles.dateLabel, { color: colors.onSurface }]}>
              Data Final
            </Text>
            <CustomDatePicker value={dates.endDate} onChange={(e, date) => date && setDates(prev => ({ ...prev, endDate: date }))} mode="date" />
          </View>
        </View>

        <View style={styles.modalActions}>
          <Button 
            mode="outlined" 
            style={[styles.modalButton, { borderColor: colors.primary }]} 
            onPress={() => setPeriodModalVisible(false)}
            labelStyle={{ color: colors.primary }}
          >
            Cancelar
          </Button>
          <Button
            mode="contained"
            style={styles.modalButton}
            onPress={() => {
              setPeriodModalVisible(false);
              fetchMonthlySales();
            }}
            labelStyle={{ color: colors.onPrimary }}
          >
            Aplicar
          </Button>
        </View>
      </ModalContainer>
    </ScrollView>
  );
}

// Função auxiliar para formatar datas (mantida)
const formatDate = (date: Date) => dayjs(date).format('DD/MM/YY');

// Estilos Atualizados (com adições para o novo modal)
const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 50,
  },
  headerTitle: {
    fontWeight: '700',
    fontSize: 22,
  },
  menuButton: {
    padding: 8,
  },
  filtersContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 20,
  },
  filterCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  filterLabel: {
    marginBottom: 8,
    opacity: 0.8,
    fontWeight: '600',
  },
  dateFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  dropdown: {
    height: 45,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  placeholderStyle: {
    fontSize: 14,
  },
  selectedTextStyle: {
    fontSize: 14,
    fontWeight: '500',
  },
  iconStyle: {
    width: 20,
    height: 20,
  },
  metricsContainer: {
    gap: 20,
    marginBottom: 24,
  },
  chartContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    padding: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    minWidth: 120,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  actionText: {
    marginLeft: 12,
    fontWeight: '600',
  },
  modalHeader: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 16,
    marginBottom: 20,
  },
  modalTitle: {
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 18,
  },
  datePickerContainer: {
    gap: 20,
  },
  dateInput: {
    gap: 8,
  },
  dateLabel: {
    opacity: 0.8,
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 32,
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 6,
    borderRadius: 8,
    paddingVertical: 4,
  },
  textInput: {
    marginBottom: 20,
    backgroundColor: 'transparent',
  },
});

async function enviarCodigoPromo(id: number, codigo: string, token: string) {
  try {
    console.log('enviarCodigoPromo chamado com:', { id, codigo });

    const response = await api.post('/usuario-mdv/relatorio/receberCodigoPromo', { id, codigo }, generateRequestHeader(token));
    console.log('Resposta do servidor:', response.data);

    if (response.data.success) {
      Alert.alert('Sucesso', response.data.mensagem);
      return response.data.codigoPromocional; // Retorna o código válido
    }
  } catch (error: any) {
    console.error('Erro ao enviar código promocional:', error);

    if (error.response && error.response.data.errors) {
      const mensagens = Object.values(error.response.data.errors).flat().join('\n');
      Alert.alert('Erro de validação', mensagens);
    } else if (error.response && error.response.data.message) {
      Alert.alert('Erro', error.response.data.message);
    } else {
      Alert.alert('Erro', 'Erro ao validar código promocional.');
    }
  }
}