'use client'

import type { Account, AccountType } from '@gastos/shared'
import { AlertTriangle, Check, EllipsisVertical } from 'lucide-react'
import { AccountActionsSheet } from './account-actions-sheet'
import { AccountBillingSheet } from './account-billing-sheet'
import { AccountNameSheet } from './account-name-sheet'
import { BankLogoPicker } from './bank-logo-picker'
import { Button } from '@/components/ui/Button'
import { BackIcon, IconButton } from '@/components/ui/IconButton'
import { InlineAlert } from '@/components/ui/InlineAlert'
import { Input } from '@/components/ui/Input'
import { BankAvatar } from '@/components/finance/BankAvatar'
import { formatAccountType } from '@/lib/utils/format-account-type'
import { formatSyncedAt } from '@/lib/utils/format-date'
import { formatMoney } from '@/lib/utils/format-money'
import { useAccountsPage } from './use-accounts-page'

const TYPE_OPTIONS: AccountType[] = ['CREDIT_CARD', 'CHECKING', 'CASH']

export default function AccountsPage() {
  const {
    accounts,
    isLoadingAccounts,
    isFormOpen,
    openForm,
    closeForm,
    register,
    errors,
    type,
    setType,
    onSubmit,
    isSubmitting,
    ruleError,
    toggleBenefitAccount,
    onConnectBank,
    isConnectingBank,
    connectError,
    onSyncBanks,
    isSyncingBanks,
    syncError,
    archive,
    removedAccounts,
    restore,
    restoringId,
    pickingLogoForId,
    openLogoPicker,
    closeLogoPicker,
    selectBankLogo,
    billingId,
    closingDayDraft,
    dueDayDraft,
    closedBillDraft,
    setClosedBillDraft,
    setClosingDayDraft,
    setDueDayDraft,
    billingErrors,
    openBilling,
    closeBilling,
    onSaveBilling,
    menuAccountId,
    openMenu,
    closeMenu,
    renamingId,
    renameDraft,
    setRenameDraft,
    renameError,
    isRenaming,
    openRename,
    closeRename,
    onSaveRename,
  } = useAccountsPage()

  const connectedAccounts = accounts.filter((account) => account.source === 'PLUGGY')
  const manualAccounts = accounts.filter((account) => account.source !== 'PLUGGY')

  const moreButton = (account: Account) => (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="w-[34px] !px-0"
      onClick={() => openMenu(account.id)}
      aria-label={`Mais ações de ${account.name}`}
    >
      <EllipsisVertical size={18} strokeWidth={1.8} />
    </Button>
  )

  const menuAccount = accounts.find((account) => account.id === menuAccountId)

  return (
    <main className="mx-auto flex min-h-screen max-w-[420px] flex-col gap-6 px-4 pb-28 md:pb-10 pt-8">
      <div className="flex items-center gap-3">
        <IconButton href="/">
          <BackIcon />
        </IconButton>
        <h1 className="display-number text-[2rem] text-ink">Contas</h1>
      </div>

      {connectError && <InlineAlert>{connectError}</InlineAlert>}
      {syncError && <InlineAlert>{syncError}</InlineAlert>}

      {isLoadingAccounts && <p className="text-text">Carregando…</p>}

      {!isLoadingAccounts && accounts.length === 0 && !isFormOpen && (
        <p className="text-text">Nenhuma conta ainda. Conecte um banco ou crie a primeira abaixo.</p>
      )}

      {connectedAccounts.length > 0 && (
        <section>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-bold text-ink">Conectadas pelo banco</h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              state={isSyncingBanks ? 'loading' : 'idle'}
              onClick={onSyncBanks}
            >
              Atualizar agora
            </Button>
          </div>
          <ul className="mt-1 flex flex-col">
            {connectedAccounts.map((account) => (
              <li key={account.id} className="flex flex-col gap-2 border-b border-surface py-3.5 last:border-b-0">
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => openLogoPicker(account.id)} aria-label="Escolher bandeira">
                    <BankAvatar
                      bankLogo={account.bankLogo}
                      fallbackInitial={account.name.charAt(0).toUpperCase()}
                      size={44}
                    />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink" title={account.name}>
                      {account.name}
                    </p>
                    <p className="text-sm text-muted">{formatAccountType(account.type)}</p>
                  </div>
                  {moreButton(account)}
                </div>

                <div className="ml-14 flex flex-wrap items-center gap-x-3 gap-y-1">
                  {account.disconnected ? (
                    <span className="flex items-center gap-1.5 text-sm font-medium text-danger">
                      <AlertTriangle size={15} strokeWidth={2.2} />
                      Desconectada — conecte de novo
                    </span>
                  ) : account.lastSyncAt ? (
                    <span className="flex items-center gap-1.5 text-sm font-medium text-primary-ink">
                      <Check size={15} strokeWidth={2.4} />
                      Atualizado {formatSyncedAt(account.lastSyncAt)}
                    </span>
                  ) : null}
                  {account.isBenefitAccount && account.balanceCents != null && (
                    <span className="text-sm text-muted">
                      Alimenta a renda de benefícios: {formatMoney(account.balanceCents)}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {removedAccounts.length > 0 && (
        <section>
          <h2 className="text-base font-bold text-ink">Removidas</h2>
          <p className="text-sm text-muted">
            Contas de banco que você removeu. Ao conectar o banco de novo elas continuam aqui; restaure para voltar.
          </p>
          <ul className="mt-1 flex flex-col">
            {removedAccounts.map((account) => (
              <li key={account.id} className="flex items-center gap-3 border-b border-surface py-3.5 last:border-b-0">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink" title={account.name}>
                    {account.name}
                  </p>
                  <p className="text-sm text-muted">{formatAccountType(account.type)}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  state={restoringId === account.id ? 'loading' : 'idle'}
                  onClick={() => restore(account.id)}
                >
                  Restaurar
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {manualAccounts.length > 0 && (
        <section>
          <h2 className="text-base font-bold text-ink">Manuais</h2>
          <ul className="mt-1 flex flex-col">
            {manualAccounts.map((account) => (
              <li key={account.id} className="flex items-center gap-3 border-b border-surface py-3.5 last:border-b-0">
                <button type="button" onClick={() => openLogoPicker(account.id)} aria-label="Escolher bandeira">
                  <BankAvatar
                    bankLogo={account.bankLogo}
                    fallbackInitial={account.name.charAt(0).toUpperCase()}
                    size={44}
                  />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink" title={account.name}>
                    {account.name}
                  </p>
                  <p className="text-sm text-muted">{formatAccountType(account.type)}</p>
                </div>
                {moreButton(account)}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-col gap-3">
        <Button variant="outline" state={isConnectingBank ? 'loading' : 'idle'} onClick={onConnectBank}>
          Conectar banco
        </Button>

        {!isFormOpen && (
          <Button variant="outline" onClick={openForm}>
            Nova conta
          </Button>
        )}
      </div>

      {isFormOpen && (
        <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
          {ruleError && <InlineAlert>{ruleError}</InlineAlert>}
          <Input label="Nome" placeholder="Nubank, Carteira..." error={errors.name?.message} {...register('name')} />

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-text">Tipo</span>
            <div className="flex flex-wrap gap-2">
              {TYPE_OPTIONS.map((option) => (
                <Button
                  key={option}
                  type="button"
                  size="sm"
                  variant={type === option ? 'primary' : 'outline'}
                  onClick={() => setType(option)}
                >
                  {formatAccountType(option)}
                </Button>
              ))}
            </div>
          </div>

          <div className="mt-2 flex gap-3">
            <Button type="submit" state={isSubmitting ? 'loading' : 'idle'}>
              Salvar
            </Button>
            <Button type="button" variant="link" onClick={closeForm}>
              Cancelar
            </Button>
          </div>
        </form>
      )}

      {menuAccount && (
        <AccountActionsSheet
          account={menuAccount}
          onRename={() => {
            closeMenu()
            openRename(menuAccount.id, menuAccount.name)
          }}
          onPickLogo={() => {
            closeMenu()
            openLogoPicker(menuAccount.id)
          }}
          onBilling={() => {
            closeMenu()
            openBilling(menuAccount.id, menuAccount.closingDay, menuAccount.dueDay, menuAccount.closedBillCents)
          }}
          onToggleBenefit={() => {
            closeMenu()
            toggleBenefitAccount(menuAccount.id, !menuAccount.isBenefitAccount)
          }}
          onRemove={() => {
            closeMenu()
            archive(menuAccount.id)
          }}
          onClose={closeMenu}
        />
      )}

      {billingId && (
        <AccountBillingSheet
          accountName={accounts.find((account) => account.id === billingId)?.name ?? ''}
          closingDay={closingDayDraft}
          dueDay={dueDayDraft}
          closedBill={closedBillDraft}
          onChangeClosedBill={setClosedBillDraft}
          onChangeClosingDay={setClosingDayDraft}
          onChangeDueDay={setDueDayDraft}
          onSave={onSaveBilling}
          onClose={closeBilling}
          isSaving={isRenaming}
          errors={billingErrors}
        />
      )}

      {renamingId && (
        <AccountNameSheet
          name={renameDraft}
          onChange={setRenameDraft}
          onSave={onSaveRename}
          onClose={closeRename}
          isSaving={isRenaming}
          error={renameError}
        />
      )}

      {pickingLogoForId &&
        (() => {
          const account = accounts.find((item) => item.id === pickingLogoForId)
          if (!account) return null
          return (
            <BankLogoPicker
              accountName={account.name}
              current={account.bankLogo}
              onSelect={(logo) => selectBankLogo(account.id, logo)}
              onClose={closeLogoPicker}
            />
          )
        })()}
    </main>
  )
}
