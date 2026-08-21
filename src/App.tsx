import { useCallback, useEffect, useMemo, useState } from 'react'
import { OrderColumn } from './components/OrderColumn'
import { StationFilter } from './components/StationFilter'
import { ordersRepository } from './data/ordersRepository'
import { useNow } from './hooks/useNow'
import type { Order, OrderStatus, Station } from './types/models'
import {
  ALL_STATIONS,
  type BoardStatus,
  type OrderDetails,
  type StationFilterValue,
} from './types/board'

const COLUMNS: { status: BoardStatus; title: string }[] = [
  { status: 'new', title: 'Нові' },
  { status: 'prep', title: 'Готуються' },
  { status: 'ready', title: 'Готові' },
]

function describeError(cause: unknown): string {
  return cause instanceof Error ? cause.message : 'Невідома помилка'
}

export default function App() {
  const now = useNow()

  const [stations, setStations] = useState<Station[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [detailsByOrderId, setDetailsByOrderId] = useState<Record<string, OrderDetails>>({})
  const [stationFilter, setStationFilter] = useState<StationFilterValue>(ALL_STATIONS)
  const [pendingOrderIds, setPendingOrderIds] = useState<ReadonlySet<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Initial load. Everything on screen enters through the repository.
  useEffect(() => {
    let cancelled = false

    Promise.all([ordersRepository.getStations(), ordersRepository.getOrders()])
      .then(([loadedStations, loadedOrders]) => {
        if (cancelled) {
          return
        }
        setStations(loadedStations)
        setOrders(loadedOrders)
        setIsLoading(false)
      })
      .catch((cause: unknown) => {
        if (cancelled) {
          return
        }
        setError(describeError(cause))
        setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  // Live updates. The subscription does not replay current state, which is why
  // the initial load above exists.
  useEffect(() => ordersRepository.subscribeToOrders(setOrders), [])

  // Items and modifiers for orders whose details have not been fetched yet —
  // both the seeded ones and every order that arrives later.
  useEffect(() => {
    const missing = orders.filter((order) => detailsByOrderId[order.id] === undefined)
    if (missing.length === 0) {
      return
    }

    let cancelled = false

    Promise.all(
      missing.map(async (order) => {
        const [items, modifiersByItemId] = await Promise.all([
          ordersRepository.getOrderItems(order.id),
          ordersRepository.getOrderItemModifiers(order.id),
        ])
        return [order.id, { items, modifiersByItemId }] as const
      }),
    )
      .then((loaded) => {
        if (cancelled) {
          return
        }
        setDetailsByOrderId((previous) => ({ ...previous, ...Object.fromEntries(loaded) }))
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(describeError(cause))
        }
      })

    return () => {
      cancelled = true
    }
  }, [orders, detailsByOrderId])

  const handleAdvance = useCallback((orderId: string, nextStatus: OrderStatus) => {
    setPendingOrderIds((previous) => new Set(previous).add(orderId))

    ordersRepository
      .updateOrderStatus(orderId, nextStatus, null)
      .catch((cause: unknown) => setError(describeError(cause)))
      .finally(() => {
        setPendingOrderIds((previous) => {
          const next = new Set(previous)
          next.delete(orderId)
          return next
        })
      })
  }, [])

  const ordersByStatus = useMemo(() => {
    // Oldest first: the ticket that has been waiting longest is the one the
    // station needs to see at the top of the column.
    const oldestFirst = [...orders].sort(
      (a, b) => Date.parse(a.created_at) - Date.parse(b.created_at),
    )

    const hasWorkForStation = (orderId: string) => {
      if (stationFilter === ALL_STATIONS) {
        return true
      }
      const details = detailsByOrderId[orderId]
      // Details still in flight: keep the card rather than let it flicker away.
      if (details === undefined) {
        return true
      }
      return details.items.some((item) => item.station_id === stationFilter)
    }

    const grouped: Record<BoardStatus, Order[]> = { new: [], prep: [], ready: [] }
    for (const order of oldestFirst) {
      if (order.status === 'served') {
        continue
      }
      if (!hasWorkForStation(order.id)) {
        continue
      }
      grouped[order.status].push(order)
    }

    return grouped
  }, [orders, detailsByOrderId, stationFilter])

  return (
    <div className="bg-canvas text-ink flex h-full flex-col">
      <header className="flex items-center justify-between gap-6 px-6 py-4">
        <h1 className="text-3xl font-semibold">Лісова пісня — кухня</h1>
        <StationFilter stations={stations} value={stationFilter} onChange={setStationFilter} />
      </header>

      {error !== null && (
        <p className="border-cool bg-surface-raised text-ink rounded-card mx-6 mb-4 border px-6 py-4 text-xl">
          {error}
        </p>
      )}

      {isLoading ? (
        <p className="text-muted px-6 text-2xl">Завантаження…</p>
      ) : (
        <main className="flex min-h-0 flex-1 gap-4 px-6 pb-6">
          {COLUMNS.map((column) => (
            <OrderColumn
              key={column.status}
              title={column.title}
              status={column.status}
              orders={ordersByStatus[column.status]}
              detailsByOrderId={detailsByOrderId}
              stationFilter={stationFilter}
              now={now}
              pendingOrderIds={pendingOrderIds}
              onAdvance={handleAdvance}
            />
          ))}
        </main>
      )}
    </div>
  )
}
