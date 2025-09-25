import React, { useRef } from 'react';
import { StyleSheet, FlatList, Animated, View, TouchableOpacity } from 'react-native';
import { useTheme, Text } from 'react-native-paper';
import LoadingFull from '../../components/loading-full';
import { useConsultas, ConsultaReposta, ConsultasAgrupadas } from '../../context/consultas-context';
import { navigate } from '../../router/navigationRef';
import { useExames } from '../../context/exames-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Easing } from 'react-native';

interface GroupedListProps {
  list: ConsultasAgrupadas;
  loading: boolean;
}

const GroupedList = ({ list, loading }: GroupedListProps) => {
  const { colors } = useTheme();
  const { currentProcedureMethod } = useConsultas();
  const { addSelectedExam } = useExames();

  const [openGroups, setOpenGroups] = React.useState<string[]>([]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  React.useEffect(() => {
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
  }, []);

  const handleItemPress = (procedimento: ConsultaReposta) => {
    if (currentProcedureMethod === 'exame') {
      addSelectedExam(procedimento);
    } else {
      try {
        navigate('user-procedure-details-screen', { procedimento });
      } catch (error) {
        console.error('Navigation error:', error);
      }
    }
  };

  // Extrai render do item para usar tanto na lista "consulta" quanto no accordion
  const renderProcedureItem = ({ item: procedimento, index }: { item: ConsultaReposta; index: number }) => {
    // Quando for exame, mostra des_grupo_tpr (com fallback para des_descricao_tpr)
    const title =
      currentProcedureMethod === 'exame'
        ? procedimento.des_grupo_tpr && procedimento.des_grupo_tpr.trim().length > 0
          ? procedimento.des_grupo_tpr
          : procedimento.des_descricao_tpr
        : procedimento.des_descricao_tpr;

    return (
      <TouchableOpacity
        key={`proc-${procedimento.id_procedimento_tpr}-${index}`}
        onPress={() => handleItemPress(procedimento)}
        activeOpacity={0.8}
      >
   <View
  style={[
    styles.listItem,
    {
      backgroundColor: colors.onError,
      marginTop: index === 0 ? 0 : 12,
      borderWidth: 1,
      borderColor: colors.primaryContainer,
      borderRadius: 12,

      // Shadow iOS
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,

      // Shadow Android
      elevation: 4,
    },
  ]}
>
          <View style={styles.itemContent}>
            <MaterialIcons
              name={currentProcedureMethod === 'exame' ? 'science' : 'healing'}
              size={28}
              color={colors.primary}
              style={styles.itemIcon}
            />
            <View style={styles.textContainer}>
              <Text
                style={[styles.listItemTitle, { color: colors.onSurface }]}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {title}
              </Text>
              <View style={styles.codeContainer}>
                <MaterialIcons name="tag" size={16} color={colors.onSurfaceVariant} />
                <Text
                  style={[styles.listItemDescription, { color: colors.onSurfaceVariant }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  Código: {procedimento.id_procedimento_tpr}
                </Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={colors.onSurfaceVariant} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // transforma objeto em [grupo, procedimentos][]
  const groupedData = Object.entries(list).filter(
    ([_, procedimentos]) => Array.isArray(procedimentos) && procedimentos.length > 0
  );

  // Se for "consulta", desagrupa tudo e mostra uma lista única com todos procedimentos
  const isConsulta = currentProcedureMethod === 'consulta';
  const allProcedures: ConsultaReposta[] = groupedData.reduce((acc, [, procedimentos]) => {
    return acc.concat(procedimentos as ConsultaReposta[]);
  }, [] as ConsultaReposta[]);

  const renderAccordion = ({ item, index }: { item: [string, ConsultaReposta[]]; index: number }) => {
    const [grupo, procedimentos] = item;
    const isOpen = openGroups.includes(grupo);

    if (!Array.isArray(procedimentos) || procedimentos.length === 0) return null;

    return (
      <Animated.View
        key={`group-${grupo}-${index}`}
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
      >
        <View
          style={[
            styles.groupContainer,
            {
              backgroundColor: colors.surface,
              marginTop: index === 0 ? 0 : 16,
              shadowColor: colors.shadow,
              elevation: 4,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.groupHeader}
            activeOpacity={0.7}
            onPress={() =>
              setOpenGroups(prev => (prev.includes(grupo) ? prev.filter(g => g !== grupo) : [...prev, grupo]))
            }
          >
            <MaterialIcons name="medical-services" size={28} color={colors.primary} style={styles.groupIcon} />
            <Text variant="titleMedium" style={[styles.accordionTitle, { color: colors.onSurface }]}>
              {grupo}
            </Text>
            <MaterialIcons
              name="chevron-right"
              size={28}
              color={colors.onSurfaceVariant}
              style={{
                transform: [{ rotate: isOpen ? '90deg' : '0deg' }],
                marginLeft: 8,
              }}
            />
          </TouchableOpacity>

          {isOpen && (
            <View style={styles.procedimentosContainer}>
              {procedimentos.map((procedimento, idx) => renderProcedureItem({ item: procedimento, index: idx }))}
            </View>
          )}
        </View>
      </Animated.View>
    );
  };

  if (loading) return <LoadingFull />;

  // Render principal: se for consulta, lista desagrupada; se não, lista agrupada (accordion)
  return isConsulta ? (
    <FlatList
      data={allProcedures}
      keyExtractor={(item, index) => `proc-${item.id_procedimento_tpr}-${index}`}
      renderItem={renderProcedureItem}
      style={{
        backgroundColor: colors.background,
        paddingHorizontal: 16,
        paddingTop: 16,
      }}
      contentContainerStyle={{ paddingBottom: 24 }}
      removeClippedSubviews={false}
      showsVerticalScrollIndicator={false}
    />
  ) : (
    <FlatList
      data={groupedData}
      keyExtractor={(item, index) => `group-${item[0]}-${index}`}
      renderItem={renderAccordion}
      style={{
        backgroundColor: colors.background,
        paddingHorizontal: 16,
        paddingTop: 16,
      }}
      contentContainerStyle={{ paddingBottom: 24 }}
      removeClippedSubviews={false}
      showsVerticalScrollIndicator={false}
    />
  );
};

const styles = StyleSheet.create({
  groupContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    padding: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
  },
  groupIcon: {
    marginRight: 12,
  },
  accordionTitle: {
    fontWeight: '700',
    flex: 1,
  },
  procedimentosContainer: {
    paddingVertical: 8,
  },
  listItem: {
    borderRadius: 12,
    padding: 16,
    overflow: 'hidden',
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemIcon: {
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listItemDescription: {
    fontSize: 14,
    marginLeft: 8,
  },
});

export default GroupedList;
