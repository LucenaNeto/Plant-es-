import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Informe um e-mail válido.").trim().toLowerCase(),
  password: z.string().min(1, "Informe sua senha."),
});

export const registerSchema = z
  .object({
    confirmPassword: z.string().min(1, "Confirme sua senha."),
    email: z.email("Informe um e-mail válido.").trim().toLowerCase(),
    name: z.string().trim().min(2, "Informe seu nome."),
    password: z
      .string()
      .min(8, "A senha precisa ter pelo menos 8 caracteres.")
      .regex(/[A-Za-zÀ-ÿ]/, "A senha precisa ter pelo menos uma letra.")
      .regex(/[0-9]/, "A senha precisa ter pelo menos um número."),
    profession: z.string().trim().min(2, "Informe sua profissão."),
    specialty: z.string().trim().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não conferem.",
    path: ["confirmPassword"],
  });

export const profileUpdateSchema = z.object({
  city: z.string().trim().max(120).optional(),
  name: z.string().trim().min(2, "Informe seu nome."),
  phone: z.string().trim().max(40).optional(),
  profession: z.string().trim().min(2, "Informe sua profissão."),
  specialty: z.string().trim().max(120).optional(),
});
