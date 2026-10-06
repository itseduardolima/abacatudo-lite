import { z } from 'zod'

// Allowlist explícita (.strict()): campo extra é rejeitado, não ignorado (08-seguranca § 8).
export const loginInputSchema = z
  .object({
    email: z.string().trim().toLowerCase().email('Informe um e-mail válido.'),
    password: z.string().min(1, 'Informe a senha.'),
  })
  .strict()
export type LoginInput = z.infer<typeof loginInputSchema>

// Nunca inclui passwordHash (08-seguranca § 9): resposta montada a partir deste schema, não do registro do Prisma.
// `name` vem da Person isSelf (não existe User.name — mesmo dado, uma fonte só), não é opcional porque todo
// User tem uma Person isSelf desde o seed.
export const currentUserSchema = z
  .object({
    id: z.string().uuid(),
    email: z.string().email(),
    name: z.string(),
  })
  .strict()
export type CurrentUser = z.infer<typeof currentUserSchema>

// Login normal (status OK) x 2FA ligado (status MFA_REQUIRED, sem sessão ainda — precisa de
// POST /auth/login/2fa com o mfaToken + o código) — 08-seguranca § 4, "2FA é pedido no login".
export const loginResultSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('OK'), user: currentUserSchema }).strict(),
  z.object({ status: z.literal('MFA_REQUIRED'), mfaToken: z.string() }).strict(),
])
export type LoginResult = z.infer<typeof loginResultSchema>

export const verifyTwoFactorInputSchema = z
  .object({
    mfaToken: z.string().min(1),
    code: z.string().min(1, 'Informe o código.'),
  })
  .strict()
export type VerifyTwoFactorInput = z.infer<typeof verifyTwoFactorInputSchema>

// Setup do 2FA (1.6): `secret` é o texto pra digitar manualmente (fallback de quem não consegue escanear o
// QR) e `otpauthUri` é o que vira o QR na tela — os dois vêm juntos porque o front nunca monta a URI (a
// formatação otpauth:// é regra do backend, não do frontend).
export const twoFactorSetupSchema = z.object({ secret: z.string(), otpauthUri: z.string() }).strict()
export type TwoFactorSetup = z.infer<typeof twoFactorSetupSchema>

export const confirmTwoFactorInputSchema = z.object({ code: z.string().min(1, 'Informe o código.') }).strict()
export type ConfirmTwoFactorInput = z.infer<typeof confirmTwoFactorInputSchema>

// Só aparecem essa uma vez, na hora de confirmar o setup — o backend nunca devolve os códigos de novo
// depois disso (só o hash fica guardado).
export const twoFactorRecoveryCodesSchema = z.object({ recoveryCodes: z.array(z.string()) }).strict()
export type TwoFactorRecoveryCodes = z.infer<typeof twoFactorRecoveryCodesSchema>

export const twoFactorStatusSchema = z.object({ enabled: z.boolean() }).strict()
export type TwoFactorStatus = z.infer<typeof twoFactorStatusSchema>

export const disableTwoFactorInputSchema = z.object({ password: z.string().min(1, 'Informe a senha atual.') }).strict()
export type DisableTwoFactorInput = z.infer<typeof disableTwoFactorInputSchema>

// Nome + e-mail num formulário só (mesma tela "Meu perfil"); senha é outro formulário/endpoint — trocar
// senha tem regra de segurança diferente (confirmar a atual), não faz sentido misturar payload.
export const updateProfileInputSchema = z
  .object({
    name: z.string().trim().min(1, 'Informe o nome.').max(100, 'Nome muito longo.'),
    email: z.string().trim().toLowerCase().email('Informe um e-mail válido.'),
  })
  .strict()
export type UpdateProfileInput = z.infer<typeof updateProfileInputSchema>

// Sem confirmação da senha nova (repetir o campo) — nenhum form do app pede isso hoje. Tamanho mínimo de
// verdade é responsabilidade do backend (assertStrongPassword, MIN_PASSWORD_LENGTH) — aqui só barra vazio.
export const changePasswordInputSchema = z
  .object({
    currentPassword: z.string().min(1, 'Informe a senha atual.'),
    newPassword: z.string().min(1, 'Informe a nova senha.'),
  })
  .strict()
export type ChangePasswordInput = z.infer<typeof changePasswordInputSchema>

export const forgotPasswordInputSchema = z
  .object({ email: z.string().trim().toLowerCase().email('Informe um e-mail válido.') })
  .strict()
export type ForgotPasswordInput = z.infer<typeof forgotPasswordInputSchema>

// Devolvido pra tela de redefinir senha confirmar "é essa a sua conta" antes de mostrar o formulário —
// nunca mais que o e-mail (sem nome: evitaria vazar dado a quem só tem o link, ex. encaminhado por engano).
export const resetTokenInfoSchema = z.object({ email: z.string().email() }).strict()
export type ResetTokenInfo = z.infer<typeof resetTokenInfoSchema>

export const resetPasswordInputSchema = z
  .object({
    token: z.string().min(1, 'Link inválido.'),
    newPassword: z.string().min(1, 'Informe a nova senha.'),
  })
  .strict()
export type ResetPasswordInput = z.infer<typeof resetPasswordInputSchema>
