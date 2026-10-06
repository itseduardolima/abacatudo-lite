import { baseConfig } from '@gastos/config/eslint.base.mjs'

export default [
  { ignores: ['dist/**'] },
  ...baseConfig,
  {
    // 08-seguranca § 1: User e Session não têm RLS (exceção documentada) — só o AuthRepository pode
    // tocar nelas. Isto é um guarda-rede, não uma garantia absoluta (casa só `algo.prisma.user`/
    // `.session`); a barreira de verdade é a RLS nas tabelas que a têm.
    files: ['src/**/*.ts'],
    ignores: ['src/modules/auth/**', '**/*.spec.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "MemberExpression[property.name='user'][object.property.name='prisma'], MemberExpression[property.name='user'][object.name='prisma']",
          message: 'User não tem RLS — acesso só pelo AuthRepository (08-seguranca § 1).',
        },
        {
          selector:
            "MemberExpression[property.name='session'][object.property.name='prisma'], MemberExpression[property.name='session'][object.name='prisma']",
          message: 'Session não tem RLS — acesso só pelo AuthRepository (08-seguranca § 1).',
        },
        {
          selector:
            "MemberExpression[property.name='passwordResetToken'][object.property.name='prisma'], MemberExpression[property.name='passwordResetToken'][object.name='prisma']",
          message: 'PasswordResetToken não tem RLS — acesso só pelo AuthRepository (08-seguranca § 1).',
        },
        {
          selector:
            "MemberExpression[property.name='twoFactorRecoveryCode'][object.property.name='prisma'], MemberExpression[property.name='twoFactorRecoveryCode'][object.name='prisma']",
          message: 'TwoFactorRecoveryCode não tem RLS — acesso só pelo AuthRepository (08-seguranca § 1).',
        },
        {
          selector:
            "MemberExpression[property.name='twoFactorChallenge'][object.property.name='prisma'], MemberExpression[property.name='twoFactorChallenge'][object.name='prisma']",
          message: 'TwoFactorChallenge não tem RLS — acesso só pelo AuthRepository (08-seguranca § 1).',
        },
      ],
    },
  },
]
