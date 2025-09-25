import { useEffect, useState } from 'react';
import { RefreshControl, StyleSheet, View, TouchableOpacity } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { FAB, Text, useTheme, Chip } from 'react-native-paper';
import { api } from '../../network/api';
import { useDadosUsuario } from '../../context/pessoa-dados-context';
import { toast } from 'sonner-native';
import LoadingFull from '../../components/loading-full';
import { generateRequestHeader, maskBrazilianCurrency, applyCpfMask } from '../../utils/app-utils';
import { useAuth } from '../../context/AuthContext';
import dayjs from 'dayjs';
import ModalContainer from '../../components/modal';
import { ModalContent } from '../../components/modal-content';
import { navigate } from '../../router/navigationRef';
import Icon from 'react-native-vector-icons/MaterialIcons';

export default function UserDependentsScreen() {
  const { colors } = useTheme();
  const { userContracts } = useDadosUsuario();
  const { authData } = useAuth();
  const [dependentes, setDependentes] = useState<Dependente[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isModalOfQtdMaxDepPlaVisible, setIsModalOfQtdMaxDepPlaVisible] = useState(false);
  const [expandedCard, setExpandedCard] = useState<number | null>(null);

  async function fetchDependentes() {
    setLoading(true);

    const contratoId = userContracts.filter(e => e.is_ativo_ctt == 1)[0].id_contrato_ctt;
    const response = await api.get(`/contrato/${contratoId}/dependente`, generateRequestHeader(authData.access_token));

    if (response.status == 200) {
      const { data } = response;
      setDependentes(data.response.data);
      setLoading(false);
    } else {
      toast.error('Erro ao carregar dependentes!', { position: 'bottom-center' });
      setLoading(false);
    }
  }

  function handleFabPress() {
    if (dependentes.length >= userContracts[0].qtd_max_dependentes_pla!) {
      setIsModalOfQtdMaxDepPlaVisible(true);
      return;
    }
    navigate('register-step-one', { tipo: 'DEPENDENT' });
  }

  function toggleExpandCard(index: number) {
    if (expandedCard === index) {
      setExpandedCard(null);
    } else {
      setExpandedCard(index);
    }
  }

  useEffect(() => {
    (async () => {
      fetchDependentes();
    })();
  }, []);

  return (
    <KeyboardAwareScrollView
      refreshControl={
        <RefreshControl 
          refreshing={loading} 
          onRefresh={fetchDependentes}
          tintColor={colors.primary}
        />
      }
      contentContainerStyle={[styles.container, { backgroundColor: colors.onTertiary }]}>
      {loading ? (
        <LoadingFull />
      ) : (
        <>
          <ModalContainer visible={isModalOfQtdMaxDepPlaVisible} handleVisible={() => setIsModalOfQtdMaxDepPlaVisible(false)}>
            <ModalContent
              confirmButtonAction={() => {
                navigate('register-step-one', { tipo: 'DEPENDENT' });
                setIsModalOfQtdMaxDepPlaVisible(false);
              }}
              confirmButtonText="Sim"
              description={`A quantidade de dependentes sem custo adicional está cheia. Deseja adicionar mais um dependente por ${maskBrazilianCurrency(
                userContracts[0].vlr_dependente_adicional_pla ?? 0,
              )}?`}
              isBackButtonVisible
              title="Aviso"
              backButtonAction={() => setIsModalOfQtdMaxDepPlaVisible(false)}
              backButtonText="Não"
            />
          </ModalContainer>

          <View style={styles.header}>
            <View style={[styles.headerCard, { backgroundColor: colors.onError }]}>
              <Icon name="family-restroom" size={24} color={colors.primary} />
              <Text variant="titleMedium" style={[styles.headerTitle, { color: colors.primary }]}>
                Meus Dependentes
              </Text>
              <Text style={[styles.subtitle, { color: colors.primary }]}>
                {dependentes.length}/{userContracts[0]?.qtd_max_dependentes_pla || 0} cadastrados sem custo adicional
              </Text>
            </View>
          </View>

          {dependentes.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <Icon name="account-multiple" size={48} color={colors.primary} />
              </View>
              <Text variant="titleMedium" style={[styles.emptyTitle, { color: colors.primary }]}>
                Nenhum dependente cadastrado
              </Text>
              <Text style={[styles.emptyText, { color: colors.primary }]}>
                Adicione seus dependentes para gerenciar a saúde de toda sua família
              </Text>
            </View>
          ) : (
            <View style={styles.dependentsList}>
              <Text variant="titleSmall" style={[styles.listTitle, { color: colors.onSurfaceVariant }]}>
                Dependentes cadastrados
              </Text>
              
              {dependentes.map((dependente, index) => (
                <TouchableOpacity 
                  key={index} 
                  onPress={() => toggleExpandCard(index)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.dependentCard, { backgroundColor: colors.surface }]}>
                    <View style={styles.dependentHeader}>
                      <View style={[styles.avatar, { backgroundColor: dependente.is_ativo_rtd ? colors.primary : colors.error }]}>
                        <Icon name="person" size={20} color="white" />
                      </View>
                      <View style={styles.dependentInfo}>
                        <Text style={[styles.dependentName, { color: colors.onSurface }]}>
                          {dependente.des_nome_pes}
                        </Text>
                        <View style={styles.statusRow}>
                          <Chip 
                            mode="outlined" 
                            style={[styles.statusChip, { 
                              backgroundColor: dependente.is_ativo_rtd ? colors.primary + '20' : colors.error + '20',
                              borderColor: dependente.is_ativo_rtd ? colors.primary : colors.error
                            }]}
                            textStyle={{ 
                              color: dependente.is_ativo_rtd ? colors.primary : colors.error,
                              fontSize: 12
                            }}
                          >
                            {dependente.is_ativo_rtd ? 'Ativo' : 'Inativo'}
                          </Chip>
                          <Icon 
                            name={expandedCard === index ? "expand-less" : "expand-more"} 
                            size={20} 
                            color={colors.onSurfaceVariant} 
                          />
                        </View>
                      </View>
                    </View>

                    {expandedCard === index && (
                      <View style={styles.dependentDetails}>
                        <View style={styles.detailRow}>
                          <Icon name="fingerprint" size={16} color={colors.onSurfaceVariant} />
                          <Text style={[styles.detailLabel, { color: colors.onSurfaceVariant }]}>CPF:</Text>
                          <Text style={[styles.detailValue, { color: colors.onSurface }]}>
                            {applyCpfMask(dependente.cod_cpf_pes)}
                          </Text>
                        </View>
                        
                        <View style={styles.detailRow}>
                          <Icon name="event-available" size={16} color={colors.onSurfaceVariant} />
                          <Text style={[styles.detailLabel, { color: colors.onSurfaceVariant }]}>Cadastro:</Text>
                          <Text style={[styles.detailValue, { color: colors.onSurface }]}>
                            {dayjs(dependente.dth_cadastro_rtd).format('DD/MM/YYYY HH:mm')}
                          </Text>
                        </View>
                        
                        <View style={styles.detailRow}>
                          <Icon name="update" size={16} color={colors.onSurfaceVariant} />
                          <Text style={[styles.detailLabel, { color: colors.onSurfaceVariant }]}>Última alteração:</Text>
                          <Text style={[styles.detailValue, { color: colors.onSurface }]}>
                            {dayjs(dependente.dth_alteracao_rtd).format('DD/MM/YYYY HH:mm')}
                          </Text>
                        </View>
                        
                        <View style={styles.detailRow}>
                          <Icon name="receipt" size={16} color={colors.onSurfaceVariant} />
                          <Text style={[styles.detailLabel, { color: colors.onSurfaceVariant }]}>ID do Contrato:</Text>
                          <Text style={[styles.detailValue, { color: colors.onSurface }]}>
                            #{dependente.id_contrato_rtd}
                          </Text>
                        </View>
                        
                        <View style={styles.detailRow}>
                          <Icon name="link" size={16} color={colors.onSurfaceVariant} />
                          <Text style={[styles.detailLabel, { color: colors.onSurfaceVariant }]}>ID do Vínculo:</Text>
                          <Text style={[styles.detailValue, { color: colors.onSurface }]}>
                            #{dependente.id_rel_titular_dependente_rtd}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </>
      )}
      <FAB 
        icon="plus" 
        style={[styles.fab, { backgroundColor: colors.primary }]} 
        color={colors.onPrimary}
        onPress={handleFabPress}
        label="Adicionar dependente"
      />
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  headerCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTitle: {
    marginTop: 8,
    marginBottom: 4,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    marginBottom: 8,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  dependentsList: {
    marginTop: 8,
    
  },
  listTitle: {
    marginBottom: 16,
    fontWeight: '600',
  },
  dependentCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dependentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dependentInfo: {
    flex: 1,
  },
  dependentName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusChip: {
    height: 34,
    borderRadius: 12,
  },
  dependentDetails: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.08)',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 8,
    marginRight: 4,
    width: 120,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 16,
    bottom: 16,
    borderRadius: 16,
    paddingHorizontal: 16,
  },
});