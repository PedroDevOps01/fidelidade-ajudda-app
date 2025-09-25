import React from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, Image } from 'react-native';
import { useTheme, Button, Title, Paragraph, Text } from 'react-native-paper';
import { goBack, navigate } from '../../router/navigationRef';
import { RouteProp, useRoute } from '@react-navigation/native';
import { useDadosUsuario } from '../../context/pessoa-dados-context';
import Icon from 'react-native-vector-icons/MaterialIcons';

type UserPaymentAttemptScreenRouteParams = {
  params: {
    url: string;
  };
};

export default function UserPaymentAttemptScreen() {
  const { colors } = useTheme();
  const { dadosUsuarioData } = useDadosUsuario()
  const isLogged = !dadosUsuarioData.user.id_usuario_usr ? false : true;

  const route = useRoute<RouteProp<UserPaymentAttemptScreenRouteParams, 'params'>>();
  const url = 'user-contracts-presenter-screen'

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Cabeçalho com ícone decorativo */}
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
          <Icon name="loyalty" size={40} color={colors.primary} />
        </View>
        <Title style={[styles.title, { color: colors.primary }]}>Plano Fidelidade</Title>
        <Paragraph style={[styles.subtitle, { color: colors.text }]}>
          Experiência completa de saúde com benefícios exclusivos
        </Paragraph>
      </View>

      {/* Conteúdo Principal */}
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.highlightCard, { backgroundColor: colors.primary + '15' }]}>
          <Text style={[styles.highlightText, { color: colors.primary }]}>
            Desbloqueie todos os recursos premium e aproveite ao máximo nosso aplicativo!
          </Text>
        </View>

        <View style={styles.benefitsSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Com o Plano Fidelidade você tem:</Text>
          
          <View style={styles.benefitsContainer}>
            <View style={styles.benefitItem}>
              <View style={[styles.benefitIcon, { backgroundColor: colors.primary }]}>
                <Icon name="videocam" size={20} color="white" />
              </View>
              <View style={styles.benefitTextContainer}>
                <Text style={[styles.benefitTitle, { color: colors.text }]}>Telemedicina Ilimitada</Text>
                <Text style={[styles.benefitDescription, { color: colors.text }]}>Consultas sem custo adicional</Text>
              </View>
            </View>
            
            <View style={styles.benefitItem}>
              <View style={[styles.benefitIcon, { backgroundColor: colors.primary }]}>
                <Icon name="local-offer" size={20} color="white" />
              </View>
              <View style={styles.benefitTextContainer}>
                <Text style={[styles.benefitTitle, { color: colors.text }]}>Descontos Exclusivos</Text>
                <Text style={[styles.benefitDescription, { color: colors.text }]}>Em consultas e exames</Text>
              </View>
            </View>
            
            <View style={styles.benefitItem}>
              <View style={[styles.benefitIcon, { backgroundColor: colors.primary }]}>
                <Icon name="event-available" size={20} color="white" />
              </View>
              <View style={styles.benefitTextContainer}>
                <Text style={[styles.benefitTitle, { color: colors.text }]}>Agendamento Personalizado</Text>
                <Text style={[styles.benefitDescription, { color: colors.text }]}>Horários prioritários</Text>
              </View>
            </View>
            
            <View style={styles.benefitItem}>
              <View style={[styles.benefitIcon, { backgroundColor: colors.primary }]}>
                <Icon name="family-restroom" size={20} color="white" />
              </View>
              <View style={styles.benefitTextContainer}>
                <Text style={[styles.benefitTitle, { color: colors.text }]}>Dependentes Inclusos</Text>
                <Text style={[styles.benefitDescription, { color: colors.text }]}>Toda família protegida</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Rodapé com Botões */}
      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <Button
          key={'assinar_plano'}
          mode="contained"
          onPress={() => {
            if (!isLogged) {
              navigate('user-login-screen-new-contract');
              return;
            }
            navigate('new-contract-stack', { screen: 'user-contracts-presenter-screen' });
          }}
          style={[styles.primaryButton, { backgroundColor: colors.primary }]}
          labelStyle={styles.primaryButtonLabel}
          icon="star"
        >
          Confira nossos planos
        </Button>

        <Button 
          key={'voltar_free'} 
          mode="outlined" 
          onPress={() => goBack()}
          style={styles.secondaryButton}
          labelStyle={[styles.secondaryButtonLabel, { color: colors.text }]}
        
        >
          Voltar
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.8,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  highlightCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
  },
  highlightText: {
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
  benefitsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  benefitsContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  benefitIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  benefitTextContainer: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  benefitDescription: {
    fontSize: 14,
    opacity: 0.7,
  },
  footer: {
    padding: 24,
  },
  primaryButton: {
    borderRadius: 12,
    paddingVertical: 10,
    marginBottom: 12,
    elevation: 2,
  },
  primaryButtonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    paddingVertical: 4,
  },
  secondaryButton: {
    borderRadius: 12,
    paddingVertical: 6,
    borderWidth: 1.5,
  },
  secondaryButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
});