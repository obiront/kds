import { useEffect, useState } from 'react'

/**
 * A clock shared by every timer on the board. One interval for the whole
 * screen rather than one per card.
 */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs])

  return now
}
