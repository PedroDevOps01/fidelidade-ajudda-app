import React from 'react';
import { StyleSheet, View, Dimensions, Animated, Easing, Image } from 'react-native';
import { Card, Text, Button, useTheme, IconButton } from 'react-native-paper';
import { goHome } from '../../router/navigationRef';
import { api } from '../../network/api';
import { useDadosUsuario } from '../../context/pessoa-dados-context';
import { generateRequestHeader } from '../../utils/app-utils';
import { useAuth } from '../../context/AuthContext';
import SucessoImage from '../../assets/images/sucesso.png';

export default function UserContractPaymentSuccessfull() {
  const { colors } = useTheme();
  const { dadosUsuarioData, setDadosUsuarioData } = useDadosUsuario();
  const { authData } = useAuth();

  const scaleValue = React.useRef(new Animated.Value(0.5)).current;
  const opacityValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleValue, {
        toValue: 1,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.timing(opacityValue, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePress = async () => {
    const response = await api.get(
      `/refresh/${dadosUsuarioData.pessoaDados?.id_pessoa_pes}`,
      generateRequestHeader(authData.access_token)
    );

    if (response.status === 200) {
      const { data } = response;
      setDadosUsuarioData({
        pessoa: { ...data.user, cod_cpf_pes: dadosUsuarioData.pessoa?.cod_cpf_pes },
        pessoaDados: data.dados,
        pessoaAssinatura: data.assinatura,
        errorCadastroPagarme: data.errorCadastroPagarme,
        user: data.user,
      });
    }
        goHome();

  };

  return (
    <View style={[styles.container, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
      <Animated.View style={[styles.animatedContainer, { transform: [{ scale: scaleValue }], opacity: opacityValue }]}>
        <Card mode="elevated" style={[styles.card, { backgroundColor: colors.surface }]}>
          <Card.Content style={styles.content}>
            <Text variant="headlineSmall" style={[styles.title, { color: colors.primary }]}>
              Pagamento Realizado com Sucesso!
            </Text>

            <Image source={SucessoImage} style={styles.successImage} resizeMode="contain" />

            <View style={styles.messageContainer}>
              <Text variant="bodyMedium" style={[styles.message, { color: colors.onSurface }]}>
                Seu pagamento está sendo processado no momento. Agora, você pode continuar utilizando nossos serviços.
              </Text>
            </View>
          </Card.Content>

          <Card.Actions style={styles.actions}>
            <Button
              mode="contained"
              onPress={handlePress}
              style={[styles.button, { backgroundColor: colors.primary }]}
              labelStyle={styles.buttonLabel}
              contentStyle={styles.buttonContent}
            >
              Voltar ao Início
            </Button>
          </Card.Actions>
        </Card>
      </Animated.View>
    </View>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width,
    height,
    zIndex: 100,
  },
  animatedContainer: {
    width: '90%',
    maxWidth: 400,
  },
  card: {
    borderRadius: 24,
    padding: 24,
    paddingTop: 20,
    paddingBottom: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
  },
  successImage: {
    width: 160,
    height: 160,
    marginBottom: 16,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 8,
    marginTop: 16,
    marginBottom: 8,
  },
  title: {
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  messageContainer: {
    marginVertical: 8,
  },
  message: {
    textAlign: 'center',
    lineHeight: 22,
  },
  actions: {
    width: '100%',
    paddingHorizontal: 0,
    marginTop: 16,
  },
  button: {
    width: '100%',
    borderRadius: 12,
    paddingVertical: 2,
    elevation: 0,
  },
  buttonContent: {
    height: 48,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
