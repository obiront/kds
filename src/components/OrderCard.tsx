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
  // The warm accent belongs to 'ready' and nowhere else: the dish is cooked and
  // going cold, so handing it over is the only thing on the board that cannot
  // wait. 'new' and 'prep' are work in progress and stay quiet.
  const isReady = status === 'ready'

  const items = details?.items ?? []

  const visibleItems =
    stationFilter === ALL_STATIONS
      ? items
      : items.filter((item) => item.station_id === stationFilter)

  const hiddenCount = items.length - visibleItems.length

  // Sum of what the database already worked out per line. The card never
  // derives a total from weights and prices itself.
  const orderTotal = items.reduce((sum, item) => sum + (item.line_total ?? 0), 0)

  // Elevation without shadow: lighter surface, accent edge, and a 2px lift.
  const elevation = isReady
    ? 'bg-surface-raised border-accent -translate-y-0.5'
    : 'bg-surface border-edge'

  const action = isPending
    ? 'bg-surface-raised border-edge text-muted'
    : isReady
      ? 'bg-accent border-accent text-canvas hover:bg-accent-hover hover:border-accent-hover'
      : 'border-edge text-ink hover:bg-surface-raised hover:border-cool'

  return (
    <article className={`rounded-card border p-2 transition-all ${elevation}`}>
      <header className="flex items-baseline justify-between gap-4 leading-tight">
        <h3 className="text-ink text-xl font-semibold tabular-nums">
          Стіл {order.table_number}
        </h3>
        <span className="font-heading tracking-heading text-cool text-xl font-medium tabular-nums">
          {formatElapsed(order.created_at, now)}
        </span>
      </header>

      {details === undefined ? (
        <p className="text-muted mt-2 text-lg leading-tight">Завантаження позицій…</p>
      ) : (
        <ul className="divide-edge mt-2 divide-y">
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
        <p className="text-muted mt-2 text-lg leading-tight">
          Ще {hiddenCount} позиц. інших станцій
        </p>
      )}

      {/* Total and action share one row: the card loses a whole block of
          vertical space, and the figure still starts at the same x on every
          card, so totals read down the column. */}
      <div className="mt-2 flex items-center justify-between gap-4">
        <p className="flex items-baseline gap-2 leading-tight whitespace-nowrap">
          <span className="text-muted text-lg">Сума</span>
          <span className="text-ink text-xl font-semibold tabular-nums">
            {formatHryvnia(orderTotal)}
          </span>
        </p>

        <button
          type="button"
          onClick={() => onAdvance(order.id, NEXT_STATUS[status])}
          disabled={isPending}
          className={`font-heading tracking-heading rounded-control min-h-14 shrink-0 border px-6 text-xl font-semibold transition-colors ${action}`}
        >
          {isPending ? 'Зачекайте…' : ACTION_LABEL[status]}
        </button>
      </div>
    </article>
  )
}
