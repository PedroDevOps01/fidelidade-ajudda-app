import { Alert, PermissionsAndroid, Platform, View } from "react-native";
import { WebView } from "react-native-webview";
import { useDadosUsuario } from "../../context/pessoa-dados-context";
import { useEffect, useState } from "react";
import { ActivityIndicator, useTheme } from "react-native-paper";
import { RouteProp, useFocusEffect, useRoute } from "@react-navigation/native";
import { goBack } from "../../router/navigationRef";
import CustomToast from "../../components/custom-toast";



type UserTelemedMeetScreenRouteParams = {
  params: {
    url: string;
  };
};



export default function UserTelemedMeetScreen() {
  //create env
  const baseUrl = "https://telemedicina.gees.com.br/";
  const { dadosUsuarioData } = useDadosUsuario();
  const username = dadosUsuarioData.pessoa?.des_nome_pes?.split(" ")[0];
  const disableDeepLink = "config.disableDeepLinking=true";
  const { colors } = useTheme();
  const [permissionsGranted, setPermissionsGranted] = useState(false);

  const route =
      useRoute<RouteProp<UserTelemedMeetScreenRouteParams, 'params'>>();

  console.log(
    `${baseUrl}${route.params.url}#userInfo.displayName=${username}&${disableDeepLink}`
  );

  const handleMessage = (event: any) => {

    console.log('event', event)


    if (event.nativeEvent.data === 'CALL_ENDED') {
      goBack(); // ou qualquer ação ao encerrar a chamada
    }

    if (event.nativeEvent.data === "ALONE_IN_ROOM") {
      goBack();
      // Você pode encerrar a chamada, mostrar aviso, etc.
    }
  };



  useEffect(() => {
    const requestPermissions = async () => {
      if (Platform.OS === 'android') {
        try {
          const granted = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.CAMERA,
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
            
          ]);

          const cameraGranted = granted[PermissionsAndroid.PERMISSIONS.CAMERA] === 'granted';
          const micGranted = granted[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] === 'granted';


          console.log(cameraGranted, micGranted)

          if (!cameraGranted || !micGranted) {
            CustomToast('É necessário permitir câmera e microfone para a videoconferência.', colors);
          } else {
            setPermissionsGranted(true);
          }
        } catch (err) {
          console.warn(err);
        }
      } else {
        // iOS já pergunta automaticamente com Info.plist configurado
        setPermissionsGranted(true);
      }
    };

    requestPermissions();
  }, []);




  if (!permissionsGranted) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <ActivityIndicator size="large" />
      </View>
    );
  }






  return (
    <View style={{ flex: 1 }}>
      <WebView
        javaScriptEnabled={true}
        domStorageEnabled={true}
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback={true}
        originWhitelist={['*']}
        allowsFullscreenVideo={true}
        source={{
          uri: `${baseUrl}${route.params.url}#userInfo.displayName=${username}&${disableDeepLink}`,
        }}
        onMessage={handleMessage}
        style={{ flex: 1 }}
      />
    </View>
  );
}
