import axios from 'axios';
import { log } from '../utils/app-utils';

export const api = axios.create({
  //baseURL: 'http://52.20.221.114/backend-apresentacaoh/api',
   baseURL: 'http://52.20.221.114/fidelidade/api',
  //baseURL: 'http://52.20.221.114/backend-dediqteste/api/',
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

api.interceptors.request.use(
  (request) => {
    // Retorna a resposta normalmente se não houver erro

    if(__DEV__) {
      log(`request: ${request.url}`, request.data)
      
    }

    return request;
  },
  (error) => {
    console.log("request error: ", JSON.stringify(error, null, 2))

  });

// api.interceptors.response.use(
//   response => {
//     if (__DEV__) {
//       //console.log("response: ", JSON.stringify(response.data, null, 2))
//     }

//     // Retorna a resposta normalmente se não houver erro
//     return response;
//   },
//   error => {
//     if (__DEV__) {
//       console.log('response error: ', JSON.stringify(error.data, null, 2));
//     }

//     // Verifica se a resposta tem o payload esperado
//     if (error.response && error.response.data.error === 'access_denied.' && error.response.data.message.includes('{access_token}')) {
//       // Exibe alerta e redireciona para login
//       Alert.alert('Sessão Expirada', 'Não foi possível acessar o sistema. Faça login novamente.', [
//         {
//           text: 'OK',
//           onPress: () => {
//             reset([{ name: 'check-cpf' }]);
//           },
//         },
//       ]);
//     }

//     // Retorna a rejeição para ser tratada pelos chamadores
//     return Promise.reject(error);
//   },
// );
