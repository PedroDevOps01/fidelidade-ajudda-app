import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Animated, Dimensions, Image } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import LinearGradient from 'react-native-linear-gradient';

const screenHeight = Dimensions.get('window').height;

const LoadingFull = () => {
  const fillAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [imageLoaded, setImageLoaded] = useState(false);
  const [restartKey, setRestartKey] = useState(Date.now());

  useEffect(() => {
    // Reinicia animação sempre que `restartKey` mudar
    fadeAnim.setValue(0);
    fillAnim.setValue(0);
    setImageLoaded(false);
  }, [restartKey]);

  useEffect(() => {
    if (imageLoaded) {
      // Fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();

      // Water fill animation loop
      Animated.loop(
        Animated.sequence([
          Animated.timing(fillAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: false,
          }),
          Animated.timing(fillAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: false,
          }),
        ])
      ).start();
    }
  }, [imageLoaded]);


  const translateY = fillAnim.interpolate({
  inputRange: [0, 1],
  outputRange: [400, 0], // começa embaixo, sobe pra cima
});

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {!imageLoaded && (
        <View style={[styles.placeholder, { width: 300, height: 300 }]} />
      )}
     <MaskedView
  key={restartKey} // força o remount
  style={{ width: 300, height: 300, position: 'absolute' }}
  maskElement={
    <Image
      source={require('../assets/images/logotransparente.png')}
      style={{ width: 300, height: 300 }}
      resizeMode="cover"
      onLoad={() => {
        setImageLoaded(true);
      }}
    />
  }
>
  <View style={styles.background} />
  <Animated.View style={[{
  position: 'absolute',
  bottom: 0,
  width: 400,
  height: 400,
  transform: [{ translateY }],
}]}>
    <LinearGradient
      colors={['#44005F', '#43018E']} // aqui você define as cores do gradient
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={{ flex: 1 }}
    />
  </Animated.View>
</MaskedView>
    </Animated.View>
  );
};

export default LoadingFull;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f7f7',
    justifyContent: 'center',
    alignItems: 'center',
        zIndex: 999,

  },
  placeholder: {
    backgroundColor: '#d3c1e0',
    borderRadius: 200,
  },
  background: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  fill: {
    position: 'absolute',
    bottom: 0,
    backgroundColor: '#f7f7f7',
  },
});
