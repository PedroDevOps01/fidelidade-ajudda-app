import dayjs from 'dayjs';
import { z } from 'zod';

export const stepOneSchema = z.object({
  cod_cpf_pes: z
    .string()
    .min(11, 'Preencha o CPF!')
    .transform(value => value.replace(/\D/g, '')),
  des_nome_pes: z
    .string()
    .min(1, 'Preencha o nome corretamente!')
    .refine(value => value.trim().split(/\s+/).length > 1, {
      message: 'O nome deve conter pelo menos duas palavras.',
    }),
  dta_nascimento_pes: z.string().refine(date => dayjs(date, 'YYYY-MM-DD', true).isValid(), {
    message: 'Preencha a data corretamente!',
  }),
});
