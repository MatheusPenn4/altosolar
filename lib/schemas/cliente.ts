import { z } from "zod";
import { validarCpfOuCnpj } from "@/lib/format";

export const clienteSchema = z.object({
  id: z.string().uuid().optional(),
  tipoPessoa: z.enum(["fisica", "juridica"]),
  nomeRazaoSocial: z.string().min(2, "Informe o nome ou razão social."),
  cpfCnpj: z
    .string()
    .optional()
    .refine((v) => !v || v.trim() === "" || validarCpfOuCnpj(v), {
      message: "CPF/CNPJ inválido.",
    }),
  telefone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email("E-mail inválido.").optional().or(z.literal("")),
  cep: z.string().optional(),
  endereco: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().max(2).optional(),
  unidadeConsumidora: z.string().optional(),
  concessionaria: z.string().optional(),
  tipoInstalacao: z.string().optional(),
  observacoes: z.string().optional(),
});

export type ClienteFormValues = z.infer<typeof clienteSchema>;

export const ESTADOS_BR = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];
