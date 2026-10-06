import { useEffect, useState } from 'react'

// Espera o usuário parar de digitar antes de repassar o valor (busca do extrato não dispara 1 request por
// tecla).
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])
  return debounced
}
