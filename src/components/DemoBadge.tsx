import { isDemoMode } from '../data/ordersRepository'

/**
 * Says, quietly and permanently, that the tickets on screen are invented.
 *
 * Mounted beside the board rather than inside it: the board's components know
 * nothing about where their data comes from, and this one exists precisely to
 * announce that. It never takes a click — a cook reaching for a card must not
 * hit a label instead.
 */
export function DemoBadge() {
  if (!isDemoMode) {
    return null
  }

  return (
    <p
      className="border-edge bg-surface-raised text-muted rounded-control pointer-events-none fixed bottom-2 left-4 z-50 border px-2 py-2 text-lg leading-tight"
      aria-live="polite"
    >
      Демо-дані
    </p>
  )
}
