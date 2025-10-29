type UserSchedule = {
  data: string;
  inicio: string;
  agenda_exames_id: string;
  presenca_confirmada: boolean | null;
  nome_paciente: string;
  contato_paciente: string;
  contato_wpp_paciente: string;
  email_paciente: string;
  nome_profissional: string;
  conselho_profissional: string;
  conselhonome: string;
  fachada_profissional: string;
  cod_unidade: string;
  nome_unidade: string;
  endereco_unidade: string | null;
  numero_unidade: string;
  bairro_unidade: string;
  cidade_unidade: string;
  estado: string;
    situacao?: string;

  longitude_unidade: string;
  latitude_unidade: string;
  fachada_unidade: string;
  nome_procedimento: string[];
};
