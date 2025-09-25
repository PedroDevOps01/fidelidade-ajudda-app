type ContratoResponse = {
  des_nome_pes: string;
  des_nome_pla: string;
  qtd_parcelas_ctt: number;
  vlr_inicial_ctt: number;
  is_ativo_ctt: number;
  id_contrato_ctt: number;
      inclui_telemedicina_pla: number;

  dth_cadastro_ctt: string;
  des_origem_ori: string;
  des_descricao_tsi: string;
  title?: string;
  qtd_max_dependentes_pla?: number;
  vlr_exclusao_dependente_pla?: number;
  vlr_dependente_adicional_pla?: number;
};
