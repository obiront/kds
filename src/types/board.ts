// View-model types shared by the display components. These describe how the
// screen holds data it received from the repository — they are not database
// shapes and are never persisted.

import type { ModifiersByOrderItem } from '../data/ordersRepository'
import type { OrderItem, OrderStatus } from './models'

/**
 * The statuses that get a column. 'served' is a terminal state and leaves the
 * board, so it is not one of them.
 */
export type BoardStatus = Extract<OrderStatus, 'new' | 'prep' | 'ready'>

/** Everything a single order card needs beyond the order row itself. */
export interface OrderDetails {
  items: OrderItem[]
  modifiersByItemId: ModifiersByOrderItem
}

/** Station filter value meaning "do not filter". */
export const ALL_STATIONS = 'all'

export type StationFilterValue = typeof ALL_STATIONS | string
