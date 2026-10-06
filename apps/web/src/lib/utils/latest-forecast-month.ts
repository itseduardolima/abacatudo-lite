export function latestForecastMonth(months: (string | null | undefined)[]): string | null {
  return (
    months
      .filter((month): month is string => Boolean(month))
      .sort()
      .at(-1) ?? null
  )
}
