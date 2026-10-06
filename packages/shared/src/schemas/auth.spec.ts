import {
  changePasswordInputSchema,
  currentUserSchema,
  forgotPasswordInputSchema,
  loginInputSchema,
  resetPasswordInputSchema,
  updateProfileInputSchema,
} from './auth'

describe('loginInputSchema', () => {
  it('normaliza o e-mail (trim + minúsculas)', () => {
    const parsed = loginInputSchema.parse({ email: '  A@B.COM ', password: 'x' })
    expect(parsed.email).toBe('a@b.com')
  })

  it('rejeita e-mail inválido e senha vazia', () => {
    expect(loginInputSchema.safeParse({ email: 'nao-e-email', password: 'x' }).success).toBe(false)
    expect(loginInputSchema.safeParse({ email: 'a@b.com', password: '' }).success).toBe(false)
  })

  it('rejeita campo extra (mass assignment, 08-seguranca § 8)', () => {
    expect(loginInputSchema.safeParse({ email: 'a@b.com', password: 'x', role: 'admin' }).success).toBe(false)
  })
})

describe('currentUserSchema', () => {
  it('não tem campo de senha', () => {
    expect(Object.keys(currentUserSchema.shape)).not.toContain('passwordHash')
  })

  it('rejeita passwordHash como campo extra', () => {
    expect(
      currentUserSchema.safeParse({ id: '11111111-1111-1111-1111-111111111111', email: 'a@b.com', passwordHash: 'x' })
        .success,
    ).toBe(false)
  })
})

describe('updateProfileInputSchema', () => {
  it('normaliza o e-mail e barra nome vazio', () => {
    expect(updateProfileInputSchema.parse({ name: 'Eduardo', email: '  A@B.COM ' })).toEqual({
      name: 'Eduardo',
      email: 'a@b.com',
    })
    expect(updateProfileInputSchema.safeParse({ name: '  ', email: 'a@b.com' }).success).toBe(false)
  })

  it('rejeita campo extra', () => {
    expect(updateProfileInputSchema.safeParse({ name: 'Eduardo', email: 'a@b.com', role: 'admin' }).success).toBe(false)
  })
})

describe('changePasswordInputSchema', () => {
  it('exige os dois campos preenchidos', () => {
    expect(changePasswordInputSchema.safeParse({ currentPassword: '', newPassword: 'x' }).success).toBe(false)
    expect(changePasswordInputSchema.safeParse({ currentPassword: 'x', newPassword: '' }).success).toBe(false)
    expect(changePasswordInputSchema.safeParse({ currentPassword: 'x', newPassword: 'y' }).success).toBe(true)
  })
})

describe('forgotPasswordInputSchema', () => {
  it('normaliza o e-mail e rejeita inválido', () => {
    expect(forgotPasswordInputSchema.parse({ email: ' A@B.COM ' })).toEqual({ email: 'a@b.com' })
    expect(forgotPasswordInputSchema.safeParse({ email: 'nao-e-email' }).success).toBe(false)
  })
})

describe('resetPasswordInputSchema', () => {
  it('exige token e nova senha', () => {
    expect(resetPasswordInputSchema.safeParse({ token: '', newPassword: 'x' }).success).toBe(false)
    expect(resetPasswordInputSchema.safeParse({ token: 't', newPassword: '' }).success).toBe(false)
    expect(resetPasswordInputSchema.safeParse({ token: 't', newPassword: 'x' }).success).toBe(true)
  })
})
