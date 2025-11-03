// fetchPlanoPagamentoByPlanoPadrao.ts
import { api } from '../../network/api';
import { PaymentOption } from '../../types/PaymentOption';

export interface PaymentMethod {
  label: string;
  value: number;
  num_parcelas_ppg: number;
  vlr_parcela_ppg: number;
  is_padrao_ppg: boolean | number;
  vlr_vendedor_ppg?: number;
  vlr_diretor_ppg?: number;
  vlr_gerente_ppg?: number;
}
export async function fetchPlanoPagamentoByPlanoPadrao(
  planoId: number,
  accessToken: string
): Promise<PaymentOption[]> {
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

    if (response.status === 200 && response.data?.response?.data) {
      return response.data.response.data.map((forma: any) => ({
  id_forma_pagamento_fmp: forma.id_forma_pagamento_ppg || forma.id_forma_pagamento_fmp,
  des_nome_fmp: forma.des_nome_fmp,
  qtd_parcelas_fmp: forma.qtd_parcelas_fmp || 0,
  des_nome_ctb: forma.des_nome_ctb || null,
  is_ativo_fmp: forma.is_ativo_ppg,
  id_plano_pagamento_ppg: forma.id_plano_pagamento_ppg,
  vlr_parcela_ppg: forma.vlr_parcela_ppg,
  num_parcelas_ppg: forma.num_parcelas_ppg,
  vlr_vendedor_ppg: forma.vlr_vendedor_ppg ?? 0,
  vlr_diretor_ppg: forma.vlr_diretor_ppg ?? 0,
  vlr_gerente_ppg: forma.vlr_gerente_ppg ?? 0,
}));
    }
    return [];
  } catch (err) {
    console.error('Erro em fetchPlanoPagamentoByPlanoPadrao:', err);
    return [];
  }
}