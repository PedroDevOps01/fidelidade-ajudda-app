import { useEffect, useState } from 'react';
import { StyleSheet, View, FlatList } from 'react-native';
import { useTheme } from 'react-native-paper';
import { api } from '../../network/api';
import { RouteProp, useRoute } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { createRequestHeader } from '../../utils/app-utils';
import ContratoParcelaDetailsCard from './contrato-parcela-details-card';
import LoadingFull from '../../components/loading-full';

type ContratoParcelaDetails = {
  id_contrato_parcela_config_cpc: number;
  dta_dia_cpc: string;
  dta_mes_cpc: string;
  vlr_parcela_cpc: number;
  id_contrato_cpc: number;
  is_ativo_cpc: number;
  dth_cadastro_cpc: string;
  dth_alteracao_cpc: string;
  id_usr_cadastro_cpc: number;
  id_usr_alteracao_cpc: number;
  valor_pago?: string;
  ano_pagamento?: string;
  des_nome_fmp?: string;
  des_descricao_tsi?: string;
  cod_numparcela_cpc: number;
  id_situacao_cpp?: number;
};

type ContratoParcelaDetailsRouteParams = {
  params: {
    idContrato: number;
  };
};

const ContratoParcelaDetailScren = () => {
  const theme = useTheme();
  const route = useRoute<RouteProp<ContratoParcelaDetailsRouteParams, 'params'>>();
  const { authData } = useAuth();
  const idContrato = route.params.idContrato;

  const [loading, setLoading] = useState<boolean>(false);
  const [contratoParcelaDetails, setContratoParcelaDetails] = useState<ContratoParcelaDetails[]>([]);

  async function fetchData() {
    setLoading(true);
    console.log(`/parcela/${idContrato}`);
    try {
      const { data } = await api(`/parcela/${idContrato}`, {
        headers: createRequestHeader(authData.access_token),
      });
      const filteredData = data.data.data.filter(
        (item: ContratoParcelaDetails) =>
          !item.des_descricao_tsi?.includes("Adesao") &&
          item.id_situacao_cpp !== 17
      );
      setContratoParcelaDetails(filteredData);
    } catch (err: any) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    (async () => {
      await fetchData();
    })();
  }, []);

  return (
    <View style={styles.outerContainer}>
      {loading ? (
        <LoadingFull 
          size={300} 
          colors={['#A497FB', '#EE70E8']}
        />
      ) : (
       <FlatList
  data={contratoParcelaDetails}
  keyExtractor={(item) => item.cod_numparcela_cpc.toString()}
  renderItem={({ item }) => (
    <ContratoParcelaDetailsCard
      item={item}
      onPay={(clicked) => {
        console.log('[PAGAR] Parcela selecionada:', {
          id_parcela_config: clicked.id_contrato_parcela_config_cpc,
          num: clicked.cod_numparcela_cpc,
          valor: clicked.vlr_parcela_cpc,
          contrato: clicked.id_contrato_cpc,
          forma: clicked.des_nome_fmp,
          situacao: clicked.id_situacao_cpp,
        });
        navigate('user-contratos-payment-resume-screen', { item: clicked });
      }}
    />
  )}
  removeClippedSubviews={false}
/>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#f7f7f7',
  },
});

export default ContratoParcelaDetailScren;