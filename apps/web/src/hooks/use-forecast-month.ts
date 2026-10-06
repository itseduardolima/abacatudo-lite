import { useState } from 'react'
import { currentMonthKey, shiftMonthKey } from '@/lib/utils/format-month'

const MONTH_KEY = /^\d{4}-(0[1-9]|1[0-2])$/

export function useForecastMonth(lastForecastMonth: string | null, initialMonth?: string | null) {
  const currentMonth = currentMonthKey()
  const [requested, setRequested] = useState(initialMonth && MONTH_KEY.test(initialMonth) ? initialMonth : currentMonth)

  const lastMonth = lastForecastMonth && lastForecastMonth > currentMonth ? lastForecastMonth : currentMonth
  const month = requested < currentMonth ? currentMonth : requested > lastMonth ? lastMonth : requested

  return {
    month,
    isForecast: month > currentMonth,
    canGoPrevious: month > currentMonth,
    canGoNext: month < lastMonth,
    goToPreviousMonth: () => setRequested(shiftMonthKey(month, -1)),
    goToNextMonth: () => setRequested(shiftMonthKey(month, 1)),
  }
}
