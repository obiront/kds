// -----------------------------------------------------------------------------
// The contract every data implementation honours.
//
// It lives in its own file because there are now two implementations — Supabase
// and the demo mock — and both must depend on the shape without depending on
// each other. Components import from ./ordersRepository and never see this file
// directly; it exists so that adding or swapping an implementation cannot drag
// the interface along with it.
// -----------------------------------------------------------------------------

import type { Modifier, Order, OrderItem, OrderStatus, Station } from '../types/models'

export type Unsubscribe = () => void

/** Modifiers of one order's line items, keyed by order_item_id. */
export type ModifiersByOrderItem = Record<string, Modifier[]>

export interface OrdersRepository {
  /** The kitchen stations, in display order. */
  getStations(): Promise<Station[]>

  /** All orders, newest first. */
  getOrders(): Promise<Order[]>

  /** Line items belonging to one order, in the order they were added. */
  getOrderItems(orderId: string): Promise<OrderItem[]>

  /**
   * Modifiers attached to the line items of one order. Items without modifiers
   * are simply absent from the returned map.
   */
  getOrderItemModifiers(orderId: string): Promise<ModifiersByOrderItem>

  /**
   * Moves an order to a new status and records the transition in the status
   * history. Resolves with the updated order. Item statuses are not touched:
   * the schema tracks them independently.
   */
  updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    userId: string | null,
  ): Promise<Order>

  /**
   * Notifies the callback with a fresh snapshot of all orders whenever the set
   * of orders changes. Does not fire on subscribe. Returns an unsubscribe
   * function; call it on unmount.
   */
  subscribeToOrders(callback: (orders: Order[]) => void): Unsubscribe
}
