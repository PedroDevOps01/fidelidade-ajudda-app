import {api} from '../network/api';
import { log, maskBrazilianCurrency } from './app-utils';
import { NewListItem } from '../types/new__list_item';

export const fetchOptionsAutoPlano = async (
  access_token: string,
): Promise<NewListItem[]> => {
  const request = await api.get(
    `http://52.20.221.114/api/plano?is_ativo_pla=1`,
    {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `bearer ${access_token}`,
      },
    },
  );
  const response = request.data;

  const sortedData = response.response.data.sort(
    (a: Plano, b: Plano) => a.des_nome_pla!.localeCompare(b.des_nome_pla!)
  );

  return sortedData.map((planoConta: Plano) => ({
    _id: String(planoConta.id_plano_pla),
    value: String(planoConta.des_nome_pla),
    optionalValue1: planoConta.vlr_adesao_pla
  }));
};


export const fetchOptionsAutoFormaPagamento = async (
  planoPagamentoId: string | null = null,
  access_token: string,
): Promise<NewListItem[]> => {
  const url =
    planoPagamentoId === null
      ? `http://52.20.221.114/api/plano-pagamento?is_ativo_ppg=1`
      : `http://52.20.221.114/api/plano-pagamento?id_plano_ppg=${planoPagamentoId}&is_ativo_ppg=1`;

  const request = await api.get(url, {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `bearer ${access_token}`,
    },
  });

  const response = request.data;


  const uniqueOptions = response.response.data.reduce(
    (acc: NewListItem[], planoPagamento: PlanoPagamento) => {
      if (!acc.some(option => option.value === planoPagamento.des_nome_fmp)) {
        acc.push({
          _id: String(planoPagamento.id_forma_pagamento_ppg),
          value: planoPagamento.des_nome_fmp,
        });
      }
      return acc;
    },
    [],
  );

  return uniqueOptions;
};

export const fetchOptionsAutoFormaPagamentoContract = async (
  access_token: string,
) => {
  // console.log('token', access_token);
  // console.log('Buscando formas de pagamento...');

  try {
    const request = await api.get('/formapagamento?is_ativo_fmp=1', {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `bearer ${access_token}`,
      },
    });


    const response: FormaPagamento[] = request.data.response?.data;

    if (!response || response.length === 0) {
      console.warn('Nenhuma forma de pagamento encontrada!');
      return [];
    }

    // Filtra apenas formas que começam com "100"
    const responseFiltrada = response.filter(
      e => String(e.id_forma_pagamento_fmp).slice(0, 3) === '100'
    );

    return responseFiltrada;
  } catch (error) {
    console.error('Erro ao buscar formas de pagamento:', error);
    return [];
  }
};


export const fetchOptionsAutoParcelas = async (
  formaPagamentoId: string | null = null,
  access_token: string
): Promise<NewListItem[]> => {
  const url =
    formaPagamentoId === null
      ? `http://52.20.221.114/api/plano-pagamento?id_forma_pagamento_ppg=${formaPagamentoId}?is_ativo_ppg=1`
      : `http://52.20.221.114/api/plano-pagamento?is_ativo_ppg=1`;

  const request = await api.get(url, {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `bearer ${access_token}`,
    },
  });

  const response = request.data;
  
  return response.response.data.map((parcela: PlanoPagamento) => ({
    _id: parcela.id_plano_pagamento_ppg,
    value: `${parcela.num_parcelas_ppg}x de R$: ${maskBrazilianCurrency(
      parcela.vlr_parcela_ppg,
    )}`,
  }));
};
