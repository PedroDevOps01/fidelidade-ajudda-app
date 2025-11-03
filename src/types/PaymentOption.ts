// src/types/PaymentOption.ts
export interface PaymentOption {
  id_forma_pagamento_fmp: number;
  des_nome_fmp: string;
  qtd_parcelas_fmp: number;
  des_nome_ctb: string | null;
  is_ativo_fmp: number;
  id_plano_pagamento_ppg: number;
  vlr_parcela_ppg: number;
  num_parcelas_ppg: number;
  vlr_vendedor_ppg?: number;
  vlr_diretor_ppg?: number;
  vlr_gerente_ppg?: number;
}