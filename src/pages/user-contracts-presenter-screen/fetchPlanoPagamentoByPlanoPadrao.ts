// fetchPlanoPagamentoByPlanoPadrao.ts
import { api } from '../../network/api';

export interface PaymentMethod {
  label: string;
  value: number;
  num_parcelas_ppg: number;
  vlr_parcela_ppg: number;
  is_padrao_ppg: boolean | number;
}

export async function fetchPlanoPagamentoByPlanoPadrao(
  planoId: number,
  accessToken: string
): Promise<PaymentMethod[]> {
  try {
    const response = await api.get(
      `/plano-pagamento?id_plano_ppg=${planoId}&is_ativo_ppg=1&is_padrao_ppg=1`,
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
        .filter((forma: any) => forma.is_padrao_ppg === true || forma.is_padrao_ppg === 1)
        .map((forma: any) => ({
          value: forma.id_forma_pagamento_ppg,
          label: forma.des_nome_fmp,
          num_parcelas_ppg: forma.num_parcelas_ppg,
          vlr_parcela_ppg: forma.vlr_parcela_ppg,
          is_padrao_ppg: forma.is_padrao_ppg,
        }));
    } else {
      throw new Error('Erro ao carregar formas de pagamento');
    }
  } catch (err) {
    throw new Error('Erro ao carregar formas de pagamento');
  }
}
