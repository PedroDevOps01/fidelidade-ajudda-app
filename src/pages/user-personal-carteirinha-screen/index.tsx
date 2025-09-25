import { Image, Platform, StyleSheet, Dimensions, View, TouchableOpacity, ScrollView } from 'react-native';
import { useDadosUsuario } from '../../context/pessoa-dados-context';
import { IconButton, Text, useTheme } from 'react-native-paper';
import { useLayoutEffect, useState, useEffect } from 'react';
import { formatDateToDDMMYYYY, log } from '../../utils/app-utils';
import { useAuth } from '../../context/AuthContext'; // Import useAuth for access token

const { width: windowWidth, height: windowHeight } = Dimensions.get('window');

const UserPersonalCarteirinhaScreen = ({ navigation }: { navigation: any }) => {
  const { dadosUsuarioData } = useDadosUsuario();
  const { authData } = useAuth(); // Access auth context for token
  const { colors } = useTheme();
  const [isZoomed, setIsZoomed] = useState(false);

  // Check if user is logged in
  const isLogged = !!dadosUsuarioData.user?.id_usuario_usr && !!authData.access_token;

  useEffect(() => {
    // Similar to LoggedHome, update navigation options based on login state
    navigation.setOptions({
      headerShown: true,
      headerTitleAlign: 'center',

      headerStyle: {
            backgroundColor: colors.primaryContainer,
          },
          headerTintColor: colors.onPrimaryContainer,
      headerTitle: isLogged ? 'Carteirinha' : 'Acesso Negado',
      headerLeft: () => (isLogged ? null : (
        <IconButton
          icon=""
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        />
      )),
    });
  }, [isLogged, navigation]);

  const toggleZoom = () => setIsZoomed(!isZoomed);

  const cardWidth = isZoomed ? windowHeight * 0.6 : windowWidth * 0.9;
  const cardHeight = isZoomed ? windowHeight * 0.4 : windowWidth * 0.65;

  if (!isLogged) {
    return (
      <View style={[styles.mainContainer, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.noAccessContainer}>
            <Text style={styles.noAccessTitle}>Você não tem acesso!</Text>
            <Text style={styles.noAccessMessage}>
              Por favor, faça login para visualizar sua carteirinha.
            </Text>
            <TouchableOpacity
  style={styles.loginButton}
  onPress={() => navigation.navigate('user-data')}
  activeOpacity={0.8}
>
  <Text style={styles.loginButtonText}>Fazer Login</Text>
</TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.mainContainer, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Instrução de toque */}
        {!isZoomed && (
          <View style={styles.instructionContainer}>
            <Text style={styles.instructionText}>Toque na carteirinha para ampliar</Text>
          </View>
        )}

        {/* Wrapper que rotaciona a carteirinha somente no zoom */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={toggleZoom}
          style={[
            styles.landscapeWrapper,
            isZoomed && styles.landscapeRotate,
          ]}
        >
          <View
            style={[
              styles.cardContainer,
              {
                width: cardWidth,
                height: cardHeight,
              },
              isZoomed && styles.zoomedCard,
            ]}
          >
            {/* Fundo gradiente */}
            <View style={styles.gradientBackground} />

            {/* Logo */}
            <View style={styles.logoContainer}>
              <Image
                source={require('../../assets/images/logonova.png')}
                style={[styles.cardLogo, isZoomed && styles.zoomedLogo]}
                resizeMode="contain"
              />
            </View>

            {/* Efeito de chip (como em cartões de crédito) */}
            <View style={styles.chipContainer}>
              <View style={styles.chip}>
                <View style={styles.chipLines} />
              </View>
            </View>

            {/* Informações do membro */}
            <View style={styles.memberInfoContainer}>
              <View style={styles.infoField}>
                <Text style={styles.infoLabel}>NOME COMPLETO</Text>
                <Text style={[styles.infoValue, isZoomed && styles.zoomedText]} numberOfLines={1}>
                  {formatarNome(dadosUsuarioData.pessoaDados?.des_nome_pes)}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <View style={[styles.infoField, styles.infoFieldSmall]}>
                  <Text style={styles.infoLabel}>CPF</Text>
                  <Text style={[styles.infoValue, isZoomed && styles.zoomedText]}>
                    {formatarCPF(dadosUsuarioData.pessoaDados?.cod_cpf_pes)}
                  </Text>
                </View>

                <View style={[styles.infoField, styles.infoFieldSmall]}>
                  <Text style={styles.infoLabel}>NASCIMENTO</Text>
                  <Text style={[styles.infoValue, isZoomed && styles.zoomedText]}>
                    {formatDateToDDMMYYYY(dadosUsuarioData.pessoaDados?.dta_nascimento_pes)}
                  </Text>
                </View>
                
              </View>

              {isZoomed && (
                <>
                  <View style={styles.infoRow}>
                    <View style={[styles.infoField, styles.infoFieldSmall]}>
                      <Text style={styles.infoLabel}>MATRÍCULA</Text>
                      <Text style={[styles.infoValue, isZoomed && styles.zoomedText]}>
                        {dadosUsuarioData.pessoaDados?.id_pessoa_pes}
                      </Text>
                    </View>

                    <View style={[styles.infoField, styles.infoFieldSmall]}>
                      <Text style={styles.infoLabel}>STATUS</Text>
                      <Text style={[styles.infoValue, isZoomed && styles.zoomedText, styles.statusActive]}>
                        ATIVO
                      </Text>
                    </View>
                  </View>

                  <View style={styles.infoField}>
                    <Text style={styles.infoLabel}>EMAIL</Text>
                    <Text style={[styles.infoValue, isZoomed && styles.zoomedText, styles.emailText]} numberOfLines={1}>
                      {dadosUsuarioData.pessoaDados?.des_email_pda}
                    </Text>
                  </View>
                </>
              )}
            </View>

            {/* Rodapé */}
            <View style={[styles.cardFooter, isZoomed && styles.zoomedFooter]}>
              <Text style={[styles.footerText, isZoomed && styles.zoomedFooterText]}>
                {isZoomed ? 'Carteirinha Válida em todo território nacional' : `Matrícula: ${dadosUsuarioData.pessoaDados?.id_pessoa_pes}`}
              </Text>
            </View>

            {/* Elementos decorativos */}
            <View style={styles.decorativeCircle1} />
            <View style={styles.decorativeCircle2} />
            <View style={styles.decorativePattern} />
          </View>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  noAccessContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noAccessTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#7b5cbf',
    marginBottom: 10,
    textAlign: 'center',
  },
  noAccessMessage: {
    fontSize: 16,
    color: '#4a3a75',
    textAlign: 'center',
    marginBottom: 20,
  },
  loginButton: {
    backgroundColor: '#AF91F9',
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 25,
    elevation: 3,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    marginLeft: 10,
  },
  instructionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: 'rgba(177, 131, 255, 0.1)',
    padding: 8,
    borderRadius: 8,
  },
  instructionText: {
    marginLeft: 8,
    color: '#AF91F9',
    fontSize: 14,
  },
  landscapeWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
  },
  landscapeRotate: {
    transform: [{ rotate: '-90deg' }],
    marginVertical: 40,
  },
  cardContainer: {
    borderRadius: 22,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    position: 'relative',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#AF91F9',
  },
  gradientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    opacity: 0.95,
  },
  zoomedCard: {
    elevation: 12,
    shadowOpacity: 0.3,
  },
  logoContainer: {
    position: 'absolute',
    top: -45,
    right: 10,
    zIndex: 2,
  },
  cardLogo: {
    width: 180,
    height: 180,
    opacity: 0.9,
  },
  zoomedLogo: {
    width: 180,
    height: 180,
  },
  chipContainer: {
    position: 'absolute',
    top: 30,
    left: 20,
  },
  chip: {
    width: 40,
    height: 30,
    backgroundColor: '#d4af37',
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipLines: {
    width: 30,
    height: 20,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#b38c25',
    borderRadius: 3,
  },
  memberInfoContainer: {
    flex: 1,
    padding: 20,
    paddingTop: 70,
    justifyContent: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoField: {
    marginBottom: 12,
  },
  infoFieldSmall: {
    flex: 1,
    marginRight: 10,
  },
  infoLabel: {
    color: '#7b5cbf',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  infoValue: {
    color: '#4a3a75',
    fontSize: 14,
    fontWeight: '600',
  },
  zoomedText: {
    fontSize: 16,
  },
  statusActive: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  emailText: {
    fontSize: 16,
  },
  cardFooter: {
    backgroundColor: '#AF91F9',
    padding: 12,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  zoomedFooter: {
    padding: 14,
  },
  footerText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  zoomedFooterText: {
    fontSize: 14,
  },
  decorativeCircle1: {
    position: 'absolute',
    top: -30,
    left: -30,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(177, 131, 255, 0.1)',
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -40,
    right: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(177, 131, 255, 0.05)',
  },
  decorativePattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(177, 131, 255, 0.1)',
    borderRadius: 22,
  },
});

// Funções auxiliares mantidas iguais
const formatarNome = (nomeCompleto?: string): string => {
  if (!nomeCompleto) return '';
  
  const partes = nomeCompleto.trim().split(/\s+/);
  
  if (partes.length === 1) {
    // Apenas uma palavra
    return partes[0].toUpperCase();
  } else if (partes.length === 2) {
    // Dois nomes
    return `${partes[0]} ${partes[1]}`.toUpperCase();
  } else {
    // Mais de dois nomes, mostrar primeiro e último
    return `${partes[0]} ${partes[partes.length - 1]}`.toUpperCase();
  }
};
const formatarCPF = (cpf?: string | number): string => {
  if (!cpf) return '';
  const apenasNumeros = cpf.toString().replace(/\D/g, '').padStart(11, '0');
  return apenasNumeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

export default UserPersonalCarteirinhaScreen;