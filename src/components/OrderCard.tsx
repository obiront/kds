import { OrderItemRow } from './OrderItemRow'
import { formatElapsed, formatHryvnia } from '../lib/format'
import type { Order, OrderStatus } from '../types/models'
import {
  ALL_STATIONS,
  type BoardStatus,
  type OrderDetails,
  type StationFilterValue,
} from '../types/board'

/** Where the big button sends the order, and what it says. */
const NEXT_STATUS: Record<BoardStatus, OrderStatus> = {
  new: 'prep',
  prep: 'ready',
  ready: 'served',
}

const ACTION_LABEL: Record<BoardStatus, string> = {
  new: 'В роботу',
  prep: 'Готово',
  ready: 'Видано',
}

interface OrderCardProps {
  order: Order
  status: BoardStatus
  details: OrderDetails | undefined
  stationFilter: StationFilterValue
  now: number
  isPending: boolean
  onAdvance: (orderId: string, nextStatus: OrderStatus) => void
}

export function OrderCard({
  order,
  status,
  details,
  stationFilter,
  now,
  isPending,
  onAdvance,
}: OrderCardProps) {
  const items = details?.items ?? []

  const visibleItems =
    stationFilter === ALL_STATIONS
      ? items
      : items.filter((item) => item.station_id === stationFilter)

  const hiddenCount = items.length - visibleItems.length

  // Sum of what the database already worked out per line. The card never
  // derives a total from weights and prices itself.
  const orderTotal = items.reduce((sum, item) => sum + (item.line_total ?? 0), 0)

  return (
    <article className="rounded-xl bg-neutral-800 p-5 shadow-lg">
      <header className="flex items-baseline justify-between gap-4">
        <h3 className="text-4xl font-bold text-neutral-50">Стіл {order.table_number}</h3>
        <span className="font-mono text-4xl tabular-nums text-neutral-300">
          {formatElapsed(order.created_at, now)}
        </span>
      </header>

      {details === undefined ? (
        <p className="mt-4 text-2xl text-neutral-500">Завантаження позицій…</p>
      ) : (
        <ul className="mt-4 divide-y divide-neutral-700">
          {visibleItems.map((item) => (
            <OrderItemRow
              key={item.id}
              item={item}
              modifiers={details.modifiersByItemId[item.id] ?? []}
            />
          ))}
        </ul>
      )}

      {hiddenCount > 0 && (
        <p className="mt-3 text-xl text-neutral-500">
          Ще {hiddenCount} позиц. інших станцій
        </p>
      )}

      <p className="mt-4 text-2xl text-neutral-400">
        Сума замовлення:{' '}
        <span className="font-semibold text-neutral-100">{formatHryvnia(orderTotal)}</span>
      </p>

      <button
        type="button"
        onClick={() => onAdvance(order.id, NEXT_STATUS[status])}
        disabled={isPending}
        className="mt-5 min-h-20 w-full rounded-lg bg-emerald-600 text-3xl font-bold text-white transition-colors hover:bg-emerald-500 disabled:bg-neutral-600 disabled:text-neutral-400"
      >
        {isPending ? 'Зачекайте…' : ACTION_LABEL[status]}
      </button>
    </article>
  )
}
