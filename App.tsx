import { GestureHandlerRootView } from 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import AppRouter from './src/router/app-router';
import { LightTheme } from './src/themes/app-theme';
import { AuthProvider } from './src/context/AuthContext';
import { DadosUsuarioProvider } from './src/context/pessoa-dados-context';
import { OrientationLocker, PORTRAIT } from 'react-native-orientation-locker';

import { UserCartProvider } from './src/context/user-cart-context';
import { ConsultasProvider } from './src/context/consultas-context';
import { ExamesProvider } from './src/context/exames-context';
import { Toaster } from 'sonner-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from '@react-native-firebase/app';
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance } from '@notifee/react-native';

// Firebase config
const firebaseConfig = {
  apiKey: 'AIzaSyAnguOITNUNxP8QpbUJ3tLfENPBJkuS_wU',
  projectId: 'app-gees',
  messagingSenderId: '961576776441',
  appId: '1:961576776441:android:d166b001970630a5502828',
};

initializeApp(firebaseConfig);

async function createNotificationChannel() {
  if (Platform.OS === 'android') {
    await notifee.requestPermission();

    await notifee.createChannel({
      id: 'default-id-channel',
      name: 'Default Channel',
      importance: AndroidImportance.HIGH,
    });
  } else {
    await notifee.requestPermission();
  }
}

async function requestUserPermission() {
  try {
    //await messaging().registerDeviceForRemoteMessages();
    const token = await messaging().getToken();
    console.log('Device Token:', token);
    await AsyncStorage.setItem('device_token_id', token);
  } catch (error) {
    console.log('Erro ao solicitar permissão de notificação:', error);
  }
}

function App() {
  useEffect(() => {
    // Solicitar permissão e token após a inicialização
    requestUserPermission();
    createNotificationChannel();
  }, []);

  useEffect(() => {
    const unsubscribe = messaging().onMessage(async remoteMessage => {
      console.log('🔔 Notificação recebida no foreground:', remoteMessage.notification);

      await notifee.displayNotification({
        title: remoteMessage!.notification!.title,
        body: remoteMessage!.notification!.body,
        android: {
          channelId: 'default-id-channel',
          smallIcon: 'ic_launcher',
          pressAction: { id: 'default' },
        },
      });
    });

    return unsubscribe;
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
            <OrientationLocker orientation={PORTRAIT} />

      <PaperProvider theme={LightTheme}>
        <AuthProvider>
          <DadosUsuarioProvider>
            <ConsultasProvider>
              <ExamesProvider>
                <UserCartProvider>
                  <AppRouter />
                </UserCartProvider>
              </ExamesProvider>
            </ConsultasProvider>
          </DadosUsuarioProvider>
        </AuthProvider>
        <Toaster />
      </PaperProvider>
    </GestureHandlerRootView>
  );
}

export default App;
