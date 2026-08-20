// -----------------------------------------------------------------------------
// The single data-access module for the whole application.
//
// Nothing outside this file talks to a data source. Components import the
// `ordersRepository` object and nothing else; they never see a fetch call, a
// Supabase client, or the mock store below.
//
// Today this is an in-memory mock built on the migration's seed data. In step 4
// the implementation is replaced by a Supabase client while `OrdersRepository`
// stays byte-for-byte the same, so no consumer has to change. That is the whole
// reason the interface is declared separately from the implementation.
//
// Behaviours deliberately matched to the real thing:
//   - every method is async and resolves after a short, variable delay
//   - callers receive deep copies, so nothing can mutate the store by accident
//   - subscribeToOrders does NOT replay current state on subscribe, exactly like
//     a Supabase realtime channel; call getOrders() for the initial load
//   - subscribeToOrders returns an unsubscribe function
// -----------------------------------------------------------------------------

import type {
  MenuItem,
  Modifier,
  Order,
  OrderItem,
  OrderStatus,
  Station,
} from '../types/models'
import {
  SEED_MENU_ITEMS,
  SEED_MODIFIERS,
  SEED_ORDER_ITEM_MODIFIERS,
  SEED_ORDER_ITEMS,
  SEED_ORDER_STATUS_HISTORY,
  SEED_ORDERS,
  SEED_STATIONS,
} from './mockSeed'

// -----------------------------------------------------------------------------
// Public interface — the contract step 3 codes against and step 4 re-implements
// -----------------------------------------------------------------------------

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

// -----------------------------------------------------------------------------
// Mock configuration
// -----------------------------------------------------------------------------

const LATENCY_MIN_MS = 80
const LATENCY_MAX_MS = 260

const NEW_ORDER_MIN_MS = 30_000
const NEW_ORDER_MAX_MS = 60_000

const TABLE_COUNT = 15
const MAX_ITEMS_PER_NEW_ORDER = 3
const MAX_MODIFIERS_PER_NEW_ITEM = 2

// -----------------------------------------------------------------------------
// Mutable in-memory store, seeded from the migration
// -----------------------------------------------------------------------------

const stations = structuredClone(SEED_STATIONS)
const modifiers = structuredClone(SEED_MODIFIERS)
const orders: Order[] = structuredClone(SEED_ORDERS)
const orderItems: OrderItem[] = structuredClone(SEED_ORDER_ITEMS)
const orderItemModifiers = structuredClone(SEED_ORDER_ITEM_MODIFIERS)
const statusHistory = structuredClone(SEED_ORDER_STATUS_HISTORY)

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pickRandom<T>(items: readonly T[]): T {
  return items[randomInt(0, items.length - 1)]
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Simulates a round trip to the database. */
function networkDelay(): Promise<void> {
  return delay(randomInt(LATENCY_MIN_MS, LATENCY_MAX_MS))
}

function byNewestFirst(a: Order, b: Order): number {
  return Date.parse(b.created_at) - Date.parse(a.created_at)
}

/**
 * Stands in for the `line_total` STORED generated column while there is no
 * Postgres to compute it.
 *
 * This is the mock playing the role of the database, not application code doing
 * pricing arithmetic: it exists solely to give a synthetic row the value that
 * Postgres would have materialised on insert. It is private to this module, it
 * is never exported, and it disappears entirely in step 4 when the real
 * generated column takes over. No component ever computes a total.
 */
function generatedLineTotal(item: Omit<OrderItem, 'line_total'>): number | null {
  const round2 = (value: number) => Math.round(value * 100) / 100

  switch (item.unit_type) {
    case 'portion':
      return item.quantity !== null && item.unit_price_snapshot !== null
        ? round2(item.quantity * item.unit_price_snapshot)
        : null
    case 'weight':
      return item.weight_grams !== null && item.price_per_100g_snapshot !== null
        ? round2((item.weight_grams / 100) * item.price_per_100g_snapshot)
        : null
  }
}

/** Builds one line item for a synthetic order, snapshotting the menu row. */
function buildOrderItem(orderId: string, menuItem: MenuItem, createdAt: string): OrderItem {
  const isWeight = menuItem.unit_type === 'weight'

  const withoutTotal: Omit<OrderItem, 'line_total'> = {
    id: crypto.randomUUID(),
    order_id: orderId,
    menu_item_id: menuItem.id,
    station_id: menuItem.station_id,
    // snapshot columns: copied at creation time, never refreshed from the menu
    item_name_snapshot: menuItem.name,
    unit_type: menuItem.unit_type,
    quantity: isWeight ? null : randomInt(1, 3),
    weight_grams: isWeight ? randomInt(15, 60) * 10 : null,
    unit_price_snapshot: isWeight ? null : menuItem.unit_price,
    price_per_100g_snapshot: isWeight ? menuItem.price_per_100g : null,
    item_status: 'new',
    created_at: createdAt,
  }

  return { ...withoutTotal, line_total: generatedLineTotal(withoutTotal) }
}

// -----------------------------------------------------------------------------
// Subscriptions and the synthetic order feed
// -----------------------------------------------------------------------------

const subscribers = new Set<(orders: Order[]) => void>()

let newOrderTimer: ReturnType<typeof setTimeout> | null = null

function notifySubscribers(): void {
  const snapshot = structuredClone(orders).sort(byNewestFirst)
  for (const subscriber of subscribers) {
    subscriber(structuredClone(snapshot))
  }
}

function createSyntheticOrder(): void {
  const createdAt = new Date().toISOString()

  const order: Order = {
    id: crypto.randomUUID(),
    table_number: randomInt(1, TABLE_COUNT),
    waiter_id: null,
    status: 'new',
    created_at: createdAt,
    updated_at: createdAt,
  }

  const activeMenu = SEED_MENU_ITEMS.filter((item) => item.is_active)
  const itemCount = randomInt(1, MAX_ITEMS_PER_NEW_ORDER)
  const chosen = new Set<MenuItem>()
  while (chosen.size < itemCount) {
    chosen.add(pickRandom(activeMenu))
  }

  orders.push(order)
  for (const menuItem of chosen) {
    const item = buildOrderItem(order.id, menuItem, createdAt)
    orderItems.push(item)

    // Waiters attach a note to some lines and not others; without this the
    // modifier badges would only ever appear on the seeded orders.
    const modifierCount = randomInt(0, MAX_MODIFIERS_PER_NEW_ITEM)
    const chosenModifiers = new Set<string>()
    while (chosenModifiers.size < modifierCount) {
      chosenModifiers.add(pickRandom(modifiers).id)
    }
    for (const modifierId of chosenModifiers) {
      orderItemModifiers.push({ order_item_id: item.id, modifier_id: modifierId })
    }
  }
  statusHistory.push({
    id: crypto.randomUUID(),
    order_id: order.id,
    from_status: null,
    to_status: 'new',
    changed_by: null,
    changed_at: createdAt,
  })

  notifySubscribers()
}

/**
 * Schedules the next synthetic order 30-60 s out. The feed only runs while
 * something is listening, so an unmounted display leaves no timer behind.
 */
function scheduleNextOrder(): void {
  newOrderTimer = setTimeout(() => {
    createSyntheticOrder()
    if (subscribers.size > 0) {
      scheduleNextOrder()
    } else {
      newOrderTimer = null
    }
  }, randomInt(NEW_ORDER_MIN_MS, NEW_ORDER_MAX_MS))
}

function stopOrderFeed(): void {
  if (newOrderTimer !== null) {
    clearTimeout(newOrderTimer)
    newOrderTimer = null
  }
}

// -----------------------------------------------------------------------------
// Implementation
// -----------------------------------------------------------------------------

export const ordersRepository: OrdersRepository = {
  async getStations() {
    await networkDelay()
    return structuredClone(stations).sort((a, b) => a.sort_order - b.sort_order)
  },

  async getOrders() {
    await networkDelay()
    return structuredClone(orders).sort(byNewestFirst)
  },

  async getOrderItems(orderId) {
    await networkDelay()
    return structuredClone(
      orderItems
        .filter((item) => item.order_id === orderId)
        .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at)),
    )
  },

  async getOrderItemModifiers(orderId) {
    await networkDelay()

    const itemIds = new Set(
      orderItems.filter((item) => item.order_id === orderId).map((item) => item.id),
    )

    const grouped: ModifiersByOrderItem = {}
    for (const link of orderItemModifiers) {
      if (!itemIds.has(link.order_item_id)) {
        continue
      }
      const modifier = modifiers.find((candidate) => candidate.id === link.modifier_id)
      if (modifier === undefined) {
        continue
      }
      grouped[link.order_item_id] ??= []
      grouped[link.order_item_id].push(structuredClone(modifier))
    }

    return grouped
  },

  async updateOrderStatus(orderId, newStatus, userId) {
    await networkDelay()

    const order = orders.find((candidate) => candidate.id === orderId)
    if (order === undefined) {
      throw new Error(`Order ${orderId} not found`)
    }

    const changedAt = new Date().toISOString()
    const previousStatus = order.status

    order.status = newStatus
    order.updated_at = changedAt

    statusHistory.push({
      id: crypto.randomUUID(),
      order_id: orderId,
      from_status: previousStatus,
      to_status: newStatus,
      changed_by: userId,
      changed_at: changedAt,
    })

    notifySubscribers()
    return structuredClone(order)
  },

  subscribeToOrders(callback) {
    subscribers.add(callback)
    if (newOrderTimer === null) {
      scheduleNextOrder()
    }

    return () => {
      subscribers.delete(callback)
      if (subscribers.size === 0) {
        stopOrderFeed()
      }
    }
  },
}
