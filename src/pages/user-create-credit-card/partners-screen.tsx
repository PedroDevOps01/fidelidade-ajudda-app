import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  ScrollView,
  Text as RNText
} from 'react-native';
import { useDadosUsuario } from '../../context/pessoa-dados-context';
import { Text, useTheme, Card } from 'react-native-paper';
import { Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../network/api';
import { generateRequestHeader } from '../../utils/app-utils';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');

interface Parceiro {
  id_parceiro_prc: number;
  des_nome_fantasia_prc: string;
  des_razao_social_prc: string;
  des_endereco_prc: string;
  des_complemento_prc: string;
  des_bairro_prc: string;
  des_municipio_mun: string;
  des_email_responsavel_prc: string;
  des_nome_responsavel_prc: string;
  des_endereco_web_prc: string;
  cod_documento_prc: string;
  num_celular_prc: string;
  num_telefone_prc: string;
  img_parceiro_prc: string | null;
  is_ativo_prc: number;
  is_parceiro_padrao_prc: number;
  dth_cadastro_prc: string;
  dth_alteracao_prc: string;
  id_municipio_prc: number;
  num_cred_prc?: string | null;
}

const PartnersScreen = ({ navigation, route }: { navigation: any; route: any }) => {
  const { colors } = useTheme();
  const { authData } = useAuth();
  const { dadosUsuarioData } = useDadosUsuario();
  
  const isLogged = !!dadosUsuarioData.user.id_usuario_usr;

  // Estado
  const [parceiros, setParceiros] = useState<Parceiro[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const partnerType = route.params?.partnerType || 'regular';

  // Mapeia dados para render
  const partnerData = parceiros.map(p => ({
    key: String(p.id_parceiro_prc),
    name: p.des_nome_fantasia_prc,
    image: p.img_parceiro_prc
      ? { uri: p.img_parceiro_prc }
      : require('../../assets/images/logonova.png'),
    discount:
      partnerType === 'accredited' && p.num_cred_prc
        ? `Credenciado: ${p.num_cred_prc}`
        : 'Desconto Exclusivo',
    category: p.des_municipio_mun || 'Parceiro'
  }));

  // Busca parceiros regulares
  async function fetchParceiros(): Promise<void> {
    try {
      setLoading(true);
      setError(null);
      const headers = isLogged ? generateRequestHeader(authData.access_token) : {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      };
      const response = await api.get('/parceiro/app', headers);
      // console.log('Resposta da API /parceiro/app:', response.data); // Log para depuração
      const dataApi = response.data;
      if (dataApi && dataApi.response && dataApi.response.data && dataApi.response.data.length > 0) {
        // console.log('Parceiros encontrados:', dataApi.response.data);
        setParceiros(dataApi.response.data);
      } else {
        console.log('Nenhum parceiro encontrado');
        setParceiros([]);
      }
    } catch (error: any) {
      console.error('Erro ao buscar parceiros:', error.message, error.response?.data);
      setError('Erro ao buscar parceiros: ' + error.message);
      setParceiros([]);
    } finally {
      setLoading(false);
    }
  }

  // Busca parceiros credenciados
  async function fetchParceirosCredenciados(): Promise<void> {
    try {
      setLoading(true);
      setError(null);
      const headers = isLogged ? generateRequestHeader(authData.access_token) : {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      };
      const response = await api.get('/parceiro/appcred', headers);
      console.log('Resposta da API /parceiro/appcred:', response.data); // Log para depuração
      const itens = response.data.response?.data || [];
      setParceiros(itens);
    } catch (e: any) {
      console.error('Erro ao buscar credenciados:', e.message, e.response?.data);
      setError('Erro ao buscar credenciados: ' + e.message);
      setParceiros([]);
    } finally {
      setLoading(false);
    }
  }

  // Efeito de foco
  useFocusEffect(
    useCallback(() => {
      console.log('PartnerType:', partnerType); // Log para depuração
      if (partnerType === 'accredited') {
        fetchParceirosCredenciados();
      } else {
        fetchParceiros();
      }
    }, [authData.access_token, partnerType])
  );

  // Renderização principal
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {partnerType === 'accredited'
            ? 'Parceiros Credenciados'
            : 'Descontos exclusivos para você'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {loading && (
          <RNText style={[styles.message, { color: colors.onSurface }]}>Carregando parceiros...</RNText>
        )}

        {!loading && error && (
          <RNText style={[styles.message, { color: 'red' }]}>{error}</RNText>
        )}

        {!loading && !error && partnerData.length === 0 && (
          <RNText style={[styles.message, { color: colors.onSurfaceVariant }]}>Nenhum parceiro disponível no momento</RNText>
        )}

        {!loading && !error && partnerData.length > 0 && (
          partnerData.map(item => (
            <Card key={item.key} style={styles.card}>
              <Card.Content>
                <View style={styles.cardHeader}>
                  <Text style={styles.category}>{item.category}</Text>
                  <View style={styles.discountBadge}>
                    <Icon name="tag" size={14} color="#fff" />
                    <Text style={styles.discountText}>{item.discount}</Text>
                  </View>
                </View>
                <Image source={item.image} style={styles.image} />
                <Text style={styles.name}>{item.name}</Text>
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f7f7f7' },
  header: { padding: 20, alignItems: 'center' },
  title: { fontSize: 16, color: '#666' },
  container: { padding: 16, paddingBottom: 30 },
  message: { textAlign: 'center', marginVertical: 20 },
  card: { borderRadius: 15, elevation: 4, overflow: 'hidden', marginBottom: 20, backgroundColor: '#fff' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  category: { fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 1 },
  discountBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#6a1b9a', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12 },
  discountText: { color: '#fff', fontSize: 12, marginLeft: 4, fontWeight: 'bold' },
  image: { width: width * 0.5, height: 160, alignSelf: 'center', borderRadius: 15 },
  name: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginVertical: 8, color: '#333' }
});

export default PartnersScreen;