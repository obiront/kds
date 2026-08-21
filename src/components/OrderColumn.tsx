import { OrderCard } from './OrderCard'
import type { Order, OrderStatus } from '../types/models'
import type { BoardStatus, OrderDetails, StationFilterValue } from '../types/board'

interface OrderColumnProps {
  title: string
  status: BoardStatus
  orders: Order[]
  detailsByOrderId: Record<string, OrderDetails>
  stationFilter: StationFilterValue
  now: number
  pendingOrderIds: ReadonlySet<string>
  onAdvance: (orderId: string, nextStatus: OrderStatus) => void
}

export function OrderColumn({
  title,
  status,
  orders,
  detailsByOrderId,
  stationFilter,
  now,
  pendingOrderIds,
  onAdvance,
}: OrderColumnProps) {
  return (
    <section className="border-edge rounded-panel flex min-h-0 flex-1 flex-col border">
      <h2 className="flex items-baseline gap-4 px-6 pt-6 pb-4 text-3xl font-semibold">
        <span className="text-cool">{title}</span>
        <span className="text-muted text-xl font-normal tabular-nums">{orders.length}</span>
      </h2>

      <div className="flex flex-col gap-4 overflow-y-auto px-6 pt-2 pb-6">
        {orders.length === 0 ? (
          <p className="text-muted text-xl">Порожньо</p>
        ) : (
          orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              status={status}
              details={detailsByOrderId[order.id]}
              stationFilter={stationFilter}
              now={now}
              isPending={pendingOrderIds.has(order.id)}
              onAdvance={onAdvance}
            />
          ))
        )}
      </div>
    </section>
  )
}
