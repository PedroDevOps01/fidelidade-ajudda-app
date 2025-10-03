import { Alert, StyleSheet, View, Platform, ImageBackground } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Button, useTheme } from 'react-native-paper';
import { navigate } from '../../router/navigationRef';
import { useDadosUsuario } from '../../context/pessoa-dados-context';

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
          {/* Botão de Ação ao Final */}
          <Button 
  mode="contained" 
  onPress={handleButtonPress}
  style={[styles.button, { 
    backgroundColor: colors.primary,
    borderWidth: 2,         // espessura da borda
    borderColor: 'white' || 'white', // cor da borda
  }]}
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
    paddingTop:20,
    flex: 1,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'flex-end', // botão fica no final
    padding: 16,
  },
  content: {
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  button: {
    borderRadius: 12,
    elevation: 3,
    marginBottom: Platform.OS === 'ios' ? 25 : 16, // espaço inferior
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
