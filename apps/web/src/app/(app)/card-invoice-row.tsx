'use client'

import type { Account, AccountInvoice } from '@gastos/shared'
import Link from 'next/link'
import { BankAvatar } from '@/components/finance/BankAvatar'
import { MoneyText } from '@/components/finance/MoneyText'

// Linha de "Faturas de [mês]" na Home (protótipo 07-inicio): um card por conta de cartão, com barra de
// progresso mine/total e "Meu R$X de R$Y". A fatura vem pronta da page (useInvoices, um hook só pra todos
// os cartões). `month` só vai no link quando é fatura prevista — a Fatura abre já no mesmo mês.
export function CardInvoiceRow({
  account,
  invoice,
  month,
}: {
  account: Account
  invoice: AccountInvoice | undefined
  month?: string
}) {
  if (!invoice) return null
  const { mineCents, totalCents } = invoice
  const percent = totalCents > 0 ? Math.min((mineCents / totalCents) * 100, 100) : 0

  return (
    <Link
      href={month ? `/transactions?month=${month}` : '/transactions'}
      className="block border-b border-surface py-3.5 last:border-0"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <BankAvatar bankLogo={account.bankLogo} fallbackInitial={account.name.charAt(0).toUpperCase()} size={28} />
          <span className="font-semibold text-ink">{account.name}</span>
        </div>
        {account.dueDay && (
          <span className="rounded-pill bg-surface px-2.5 py-1 text-xs text-text">vence dia {account.dueDay}</span>
        )}
      </div>
      <div className="mt-2.5 h-2 overflow-hidden rounded-pill bg-surface">
        <div className="h-full rounded-pill bg-primary" style={{ width: `${percent}%` }} />
      </div>
      <div className="mt-1.5 flex justify-between text-sm">
        <span className="font-semibold text-ink">
          Meu <MoneyText cents={mineCents} />
        </span>
        <span className="text-muted">
          de <MoneyText cents={totalCents} />
        </span>
      </div>
    </Link>
  )
}
