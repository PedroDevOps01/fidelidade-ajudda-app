import { createContext, ReactNode, useContext, useState } from "react";

interface PlanoPagamento {
  id_plano_pagamento_ppg: number;
  num_parcelas_ppg: number;
  vlr_parcela_ppg: number;
  is_anual: boolean;
  // ... other properties as needed
}

interface Plano {
  id_plano_pla: number;
  des_nome_pla: string;
  vlr_adesao_pla: number | null;
  des_descricao_pla: string;
  qtd_max_dependentes_pla: number; // Ensure this is number to match contract-details-card.tsx
  formasPagamento?: {
    label: string;
    value: number;
    num_parcelas_ppg: number;
    vlr_parcela_ppg: number;
    is_padrao_ppg: boolean | number;
  }[];
  isLoadingFormasPagamento?: boolean;
}

interface PessoaContratoNew {
  id_contrato_ctt: number;
  // ... other properties
}

interface ContratoParcela {
  id_parcela_cpp: number;
  vlr_parcela_cpp: number;
  // ... other properties
}

interface AccquirePlanContextProps {
  voucher: string | null;
  setVoucher: (voucher: string) => void;
  plano: Plano | null;
  setPlano: (plano: Plano) => void;
  idFormaPagamento: number | null;
  setIdFormaPagamento: (idFormaPagamento: number) => void;
  contratoCreated: PessoaContratoNew | null;
  setContratoCreated: (contratoParcela: PessoaContratoNew) => void;
  contratoParcela: ContratoParcela | null;
  setContratoParcela: (contratoParcela: ContratoParcela) => void;
  isAnual: boolean;
  setIsAnual: (isAnual: boolean) => void;
  planoPagamento: PlanoPagamento | null;
  setPlanoPagamento: (planoPagamento: PlanoPagamento) => void;
  clearPlano: () => void;
}

const initialValue: AccquirePlanContextProps = {
  voucher: null,
  setVoucher: () => {},
  plano: null,
  setPlano: () => {},
  idFormaPagamento: null,
  setIdFormaPagamento: () => {},
  contratoCreated: null,
  setContratoCreated: () => {},
  contratoParcela: null,
  setContratoParcela: () => {},
  isAnual: false,
  setIsAnual: () => {},
  planoPagamento: null,
  setPlanoPagamento: () => {},
  clearPlano: () => {},
};

const AccquirePlanContext = createContext<AccquirePlanContextProps>(initialValue);

export const AccquirePlanProvider = ({ children }: { children: ReactNode }) => {
  const [voucherContext, setVoucherContext] = useState<string | null>(null);
  const [planoContext, setPlanoContext] = useState<Plano | null>(null);
  const [idFormaPagamentoContext, setIdFormaPagamentoContext] = useState<number | null>(null);
  const [contratoCreatedContext, setContratoCreatedContext] = useState<PessoaContratoNew | null>(null);
  const [contratoParcelaContext, setContratoParcelaContext] = useState<ContratoParcela | null>(null);
  const [isAnual, setIsAnual] = useState<boolean>(false);
  const [planoPagamento, setPlanoPagamento] = useState<PlanoPagamento | null>(null);

  return (
    <AccquirePlanContext.Provider
      value={{
        voucher: voucherContext,
        setVoucher: (voucher: string) => setVoucherContext(voucher),
        plano: planoContext,
        setPlano: (plano: Plano) => setPlanoContext(plano),
        idFormaPagamento: idFormaPagamentoContext,
        setIdFormaPagamento: (idFormaPagamento: number) => setIdFormaPagamentoContext(idFormaPagamento),
        contratoCreated: contratoCreatedContext,
        setContratoCreated: (contrato: PessoaContratoNew) => setContratoCreatedContext(contrato),
        contratoParcela: contratoParcelaContext,
        setContratoParcela: (contratoParcela: ContratoParcela) => setContratoParcelaContext(contratoParcela),
        isAnual,
        setIsAnual: (isAnual: boolean) => setIsAnual(isAnual),
        planoPagamento,
        setPlanoPagamento: (planoPagamento: PlanoPagamento) => setPlanoPagamento(planoPagamento),
        clearPlano: () => setPlanoContext(null),
      }}
    >
      {children}
    </AccquirePlanContext.Provider>
  );
};

export const useAccquirePlan = () => {
  const context = useContext(AccquirePlanContext);
  if (!context) {
    throw new Error("useAccquirePlan must be used within a useAccquirePlanProvider");
  }
  return context;
};