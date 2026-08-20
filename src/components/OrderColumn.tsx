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
    <section className="flex min-h-0 flex-1 flex-col rounded-xl bg-neutral-900">
      <h2 className="flex items-baseline gap-3 px-5 py-4 text-3xl font-bold text-neutral-100">
        {title}
        <span className="text-2xl font-normal text-neutral-500">{orders.length}</span>
      </h2>

      <div className="flex flex-col gap-4 overflow-y-auto px-5 pb-5">
        {orders.length === 0 ? (
          <p className="text-2xl text-neutral-600">Порожньо</p>
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
