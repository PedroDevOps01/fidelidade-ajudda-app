import { Alert, StyleSheet, View, Platform, ImageBackground, Dimensions } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Button, useTheme } from 'react-native-paper';
import { navigate, goHome } from '../../router/navigationRef'; // Adicione goHome
import { useDadosUsuario } from '../../context/pessoa-dados-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'; // Adicione Icon
import { TouchableOpacity } from 'react-native'; // Adicione TouchableOpacity
const { width } = Dimensions.get('window');

export default function NoMdvFound() {
  const { colors } = useTheme();
  const { dadosUsuarioData } = useDadosUsuario();

  const handleButtonPress = () => {
    const pessoaAssinatura = dadosUsuarioData.pessoaAssinatura;
    const isTipoContratante = dadosUsuarioData.pessoaDados?.is_tipo_contratante_pda;
    console.log(isTipoContratante, pessoaAssinatura);
    console.log(
      'Dados do usuário ao tentar acessar registro MDV:',
      JSON.stringify(dadosUsuarioData, null, 2)
    );

    // Bloqueia apenas se não for assinante e não for do tipo contratante
    if (!pessoaAssinatura && !isTipoContratante) {
      Alert.alert(
        'Aviso',
        'É necessário ser assinante antes de se tornar um vendedor\nDeseja assinar um plano?',
        [
          { text: 'Sim', onPress: () => navigate('new-contract-navigator') },
          { text: 'Não', onPress: () => {} },
        ]
      );
      return;
    }

    // Se for assinante ou tipo contratante, libera
    navigate('user-mdv-registration', { newAccount: true });
  };

  return (
    <ImageBackground
      source={require('../../assets/images/welcome.png')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <KeyboardAwareScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Ícone de voltar no canto superior esquerdo
          <TouchableOpacity style={styles.backButton} onPress={goHome}>
            <Icon name="arrow-left" size={24} color={colors.onSurface} />
          </TouchableOpacity> */}

          {/* Botão de Ação ao Final */}
          <Button
            mode="contained"
            onPress={handleButtonPress}
            style={[
              styles.button,
              {
                backgroundColor: colors.primary,
                borderWidth: 2,
                borderColor: 'white',
              },
            ]}
            labelStyle={styles.buttonLabel}
            contentStyle={styles.buttonContent}
          >
            Quero ser um vendedor!
          </Button>
        </View>
      </KeyboardAwareScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    paddingTop: 20,
    flex: 1,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    padding: 16,
  },
  content: {
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
    position: 'relative', // Necessário para posicionar o botão de voltar
  },
  backButton: {
  position: 'absolute',
  top: Platform.OS === 'ios' && width >= 768 ? 20 : -750,
  left: 10,
  zIndex: 2, // Garante que o botão fique acima de outros elementos

  // Adicionando estilo visual
  backgroundColor: '#fff', // Cor de fundo (você pode usar colors.primary ou algo similar)
  borderRadius: 24,           // Deixa o botão circular (ajuste conforme o padding)
  padding: 4,                // Espaço interno para dar espaço ao ícone
  borderWidth: 2,             // Espessura da borda (opcional)
  borderColor: '#A497FB',        // Cor da borda (opcional)
},
  button: {
    borderRadius: 12,
    elevation: 3,
    marginBottom: Platform.OS === 'ios' ? 35 : 36,
  },
  buttonLabel: {
    fontWeight: 'bold',
    fontSize: 16,
    color: 'white',
  },
  buttonContent: {
    height: 50,
  },
});