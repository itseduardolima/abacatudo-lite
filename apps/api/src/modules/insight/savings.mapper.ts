import type { DuplicateCharge, SavingsItem, SpendingBreakdownItem, SubscriptionItem } from '@gastos/shared'

// 03-regras-negocio § Relatórios e insights: ranking por potencial = variação para cima + recorrências
// candidatas a cancelar + categorias acima do normal, cada item com o cálculo à mostra. Junta os três sinais
// (já calculados por spendingReport, subscriptions e detectDuplicateCharges) e ordena do maior potencial pro
// menor.
export function buildSavingsReport(
  aboveNormalCategories: SpendingBreakdownItem[],
  subscriptions: SubscriptionItem[],
  duplicateCharges: DuplicateCharge[],
): SavingsItem[] {
  const items: SavingsItem[] = [
    ...duplicateCharges.map((duplicate) => ({
      type: 'DUPLICATE_CHARGE' as const,
      label: duplicate.label,
      amountCents: duplicate.amountCents,
      calculation: 'Mesmo estabelecimento e valor cobrados duas vezes em menos de 24h.',
      sourceKey: duplicate.key,
    })),
    ...aboveNormalCategories
      .filter((category) => category.aboveNormal)
      .map((category) => ({
        type: 'ABOVE_NORMAL_CATEGORY' as const,
        label: category.label,
        amountCents: category.amountCents - category.averageLast3MonthsCents,
        calculation: `Gasto de ${category.vsAverageLast3MonthsPercent}% acima da média dos últimos 3 meses.`,
        sourceKey: category.key,
      })),
    ...subscriptions.map((subscription) => ({
      type: 'SUBSCRIPTION' as const,
      label: subscription.label,
      amountCents: subscription.monthlyCents,
      calculation: `Cobrança recorrente todo dia ${subscription.chargeDay}, ${subscription.occurrences}x nos últimos meses.`,
      sourceKey: subscription.key,
    })),
  ]
  return items.sort((a, b) => b.amountCents - a.amountCents)
}
