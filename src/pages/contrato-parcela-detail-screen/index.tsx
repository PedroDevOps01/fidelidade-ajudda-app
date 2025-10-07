import { useEffect, useState } from 'react';
import { StyleSheet, View, FlatList } from 'react-native';
import { useTheme } from 'react-native-paper';
import { api } from '../../network/api';
import { RouteProp, useRoute } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { createRequestHeader } from '../../utils/app-utils';
import ContratoParcelaDetailsCard from './contrato-parcela-details-card';
import LoadingFull from '../../components/loading-full';

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
      setContratoParcelaDetails(data.data.data);
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
          colors={['#A497FB', '#EE70E8']} // 🔹 usa as duas cores aqui
        />
      ) : (
        <FlatList
          data={contratoParcelaDetails}
          keyExtractor={item => item.cod_numparcela_cpc.toString()}
          renderItem={({ item }) => (
            <ContratoParcelaDetailsCard item={item} key={item.id_contrato_parcela_config_cpc} />
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
