// form-objects/step-three-form.ts
import { z } from 'zod';

export const dynamicStepThreeSchema = (tipo: 'NEW_USER' | 'DEPENDENT') =>
  z.object({
    cod_rg_pda: z
      .string()
      .min(1, 'Número do RG é obrigatório')
      .max(20, 'Número do RG deve ter no máximo 20 dígitos'),
     des_email_pda: z.string().email('Formato de email inválido!'),

    des_estado_civil_pda: z
      .string()
      .min(1, 'Estado civil é obrigatório'),
    des_genero_pes: z
      .string()
      .min(1, 'Gênero é obrigatório'),
    des_sexo_biologico_pes: z
      .string()
      .min(1, 'Sexo biológico é obrigatório'),
    dta_emissao_rg_pda: z
      .string()
      .min(1, 'Data de emissão do RG é obrigatória'),
    id_situacao_pda: z
      .string()
      .min(1, 'Situação é obrigatória'),
    vlr_renda_mensal_pda: z
      .number()
      .min(0, 'Renda mensal deve ser maior ou igual a 0'),
    des_nome_mae_pda: z
      .string()
      .min(1, 'Nome da mãe é obrigatório'),
    des_ocupacao_profissional_pda: z
      .string()
      .min(1, 'Ocupação profissional é obrigatória'),
  });

export type StepThreeSchemaFormType = z.infer<ReturnType<typeof dynamicStepThreeSchema>>;