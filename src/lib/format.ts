// Display formatting only. Nothing here derives money from prices — order
// totals are sums of line_total values that the database already computed.

const hryvniaFormatter = new Intl.NumberFormat('uk-UA', {
  style: 'currency',
  currency: 'UAH',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const gramsFormatter = new Intl.NumberFormat('uk-UA', {
  maximumFractionDigits: 0,
})

export function formatHryvnia(amount: number): string {
  return hryvniaFormatter.format(amount)
}

export function formatGrams(grams: number): string {
  return `${gramsFormatter.format(grams)} г`
}

/**
 * Elapsed time since `fromIso`, as M:SS, or H:MM:SS once past an hour.
 * `now` is passed in so every card on the board ticks off the same clock.
 */
export function formatElapsed(fromIso: string, now: number): string {
  const totalSeconds = Math.max(0, Math.floor((now - Date.parse(fromIso)) / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const pad = (value: number) => String(value).padStart(2, '0')

  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${minutes}:${pad(seconds)}`
}
