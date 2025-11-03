// fetchPlanoPagamentoByPlano.ts
import { api } from '../../network/api';

export interface PaymentMethodCortesia {
  label: string;
  value: number;
  num_parcelas_ppg: number;
  vlr_parcela_ppg: number;
id_plano_pagamento_ppg: number;
}

export async function fetchPlanoPagamentoByPlano(
  planoId: number,
  accessToken: string
): Promise<PaymentMethodCortesia[]> {
  try {
    const response = await api.get(
      `/plano-pagamento?id_plano_ppg=${planoId}&is_ativo_ppg=1`,
      {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `bearer ${accessToken}`,
        },
      }
    );

    if (response.status === 200) {
      const { data } = response;
      const formasPagamento = data.response?.data || [];
      return formasPagamento
        .map((forma: any) => ({
          value: forma.id_forma_pagamento_ppg,
    label: forma.des_nome_fmp,
    num_parcelas_ppg: forma.num_parcelas_ppg,
    vlr_parcela_ppg: forma.vlr_parcela_ppg,
      id_plano_pagamento_ppg: forma.id_plano_pagamento_ppg, // ✅ isso aqui é essencial!

        }));
    } else {
      throw new Error('Erro ao carregar formas de pagamento');
    }
  } catch (err) {
    throw new Error('Erro ao carregar formas de pagamento');
  }
}
