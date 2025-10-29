import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  ImageBackground,
  Animated,
  Easing,
  SafeAreaView,
} from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { Image } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface WelcomeScreenProps {
  onComplete: () => void; // Prop to hide the welcome screen
}

const WelcomeScreen = ({ onComplete }: WelcomeScreenProps) => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const [currentStep, setCurrentStep] = useState(1);
  const fadeAnim = useState(new Animated.Value(1))[0];

  const handleNext = () => {
    if (currentStep < 2) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        easing: Easing.ease,
        useNativeDriver: true,
      }).start(() => {
        setCurrentStep(currentStep + 1);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          easing: Easing.ease,
          useNativeDriver: true,
        }).start();
      });
    } else {
      // Call onComplete to hide the welcome screen and show LoggedHome content
      onComplete();
    }
  };

  const renderStepContent = () => {
    const content = {
      1: {
        title: 'Bem-vindo ao AJUDDA!!',
        subtitle:
          'Sua saúde em primeiro lugar, com acesso rápido a consultas, exames e muito mais.',
      },
      2: {
        title: 'Agende com facilidade',
        subtitle:
          'Encontre os melhores profissionais e agende consultas em poucos cliques.',
      },
    };

    return (
      <Animated.View style={[styles.contentContainer, { opacity: fadeAnim }]}>
        <Text
          variant="displaySmall"
          style={[styles.title, { color: colors.onPrimary }]}
        >
          {content[currentStep].title}
        </Text>
        <Text
          variant="titleMedium"
          style={[styles.subtitle, { color: colors.onPrimary }]}
        >
          {content[currentStep].subtitle}
        </Text>
      </Animated.View>
    );
  };

  return (
    <ImageBackground
      source={require('../../assets/images/welcome-illustration.png')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <View style={styles.overlay} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Image
            source={require('../../assets/images/logotransparente.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <View style={styles.mainContent}>
          {renderStepContent()}
          <View style={styles.stepIndicatorContainer}>
            {[1, 2].map(step => (
              <View
                key={step}
                style={[
                  styles.stepIndicator,
                  {
                    backgroundColor:
                      step === currentStep
                        ? colors.primary
                        : 'rgba(255,255,255,0.4)',
                    width: step === currentStep ? 24 : 8,
                  },
                ]}
              />
            ))}
          </View>
        </View>
        <View style={styles.footer}>
          <Button
            mode="contained"
            onPress={handleNext}
            style={[styles.button, { backgroundColor: colors.primary }]}
            labelStyle={styles.buttonLabel}
            contentStyle={styles.buttonContent}
          >
            {currentStep < 2 ? 'Próximo' : 'Começar'}
          </Button>
          {currentStep === 2 && (
            <Button
              mode="text"
              onPress={() =>
                navigation.navigate('MainTabs', { screen: 'user-data' })
              }
              style={styles.skipButton}
              labelStyle={[styles.skipButtonLabel, { color: colors.onPrimary }]}
            >
              Já tenho conta
            </Button>
          )}
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingTop: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  logo: {
    width: 180,
    height: 80,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  contentContainer: {
    marginBottom: 40,
  },
  title: {
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.9,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  stepIndicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 40,
  },
  stepIndicator: {
    height: 6,
    borderRadius: 3,
    marginHorizontal: 4,
  },
  footer: {
    padding: 24,
    paddingBottom: 40,
  },
  button: {
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  buttonContent: {
    height: 50,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  skipButton: {
    marginTop: 16,
  },
  skipButtonLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default WelcomeScreen;