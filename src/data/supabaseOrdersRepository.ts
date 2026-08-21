// -----------------------------------------------------------------------------
// The Supabase implementation of OrdersRepository — the one the real kitchen
// runs on. ordersRepository.ts picks between this and the demo mock; nothing
// else in the application imports either directly.
//
// Two consequences of the row level security migration are visible here:
//
//   - updateOrderStatus calls the advance_order_status function rather than
//     updating the table. The publishable key holds no UPDATE privilege on
//     orders; it may only ask the database to take one legal step forward.
//
//   - getOrders never sees served orders. The display's SELECT policy stops at
//     `status <> 'served'`, so a filter here would be redundant — the query is
//     written without one and the database does the work.
//
// order_status_history is not written from here. A trigger records every
// transition, which is what makes the log worth reading: it cannot be skipped
// or forged by a client.
// -----------------------------------------------------------------------------

import type { RealtimeChannel } from '@supabase/supabase-js'

import { getSupabase } from './supabaseClient'
import type { Modifier, Order } from '../types/models'
import type { ModifiersByOrderItem, OrdersRepository } from './repositoryContract'

// -----------------------------------------------------------------------------
// Subscribers
// -----------------------------------------------------------------------------

const subscribers = new Set<(orders: Order[]) => void>()

/**
 * Re-reads the board and hands every listener the same snapshot.
 *
 * Realtime delivers the fact that something changed; the snapshot comes from a
 * fresh query so that row level security is applied the same way it is on the
 * initial load, and so a listener can never assemble state from a partial event.
 */
async function refreshSubscribers(): Promise<void> {
  if (subscribers.size === 0) {
    return
  }

  const orders = await fetchOrders()
  for (const subscriber of subscribers) {
    subscriber([...orders])
  }
}

// -----------------------------------------------------------------------------
// Queries
// -----------------------------------------------------------------------------

async function fetchOrders(): Promise<Order[]> {
  const { data, error } = await getSupabase()
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })

  if (error !== null) {
    throw new Error(`Не вдалося завантажити замовлення: ${error.message}`)
  }

  return data
}

// -----------------------------------------------------------------------------
// The realtime channel
// -----------------------------------------------------------------------------
//
// One channel serves every subscriber, opened when the first arrives and torn
// down when the last leaves — the same shape the mock used for its timer.
//
// The topic carries a unique suffix. A Supabase client allows one channel per
// topic, and React's StrictMode mounts an effect, unmounts it and mounts it
// again; with a fixed name the remount collides with a teardown that has not
// finished yet and the channel dies as CLOSED.

let channel: RealtimeChannel | null = null

function openChannel(): void {
  if (channel !== null) {
    return
  }

  channel = getSupabase()
    .channel(`kds-orders-${crypto.randomUUID()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
      void refreshSubscribers()
    })
    .subscribe((status, error) => {
      // A display that quietly stops receiving updates is worse than one that
      // fails loudly: the cook keeps trusting a frozen board. CLOSED is not
      // reported — it is the normal end of a teardown.
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.warn(`[kds] realtime channel ${status}`, error ?? '')
      }
    })
}

function closeChannel(): void {
  if (channel === null) {
    return
  }

  const closing = channel
  channel = null
  void getSupabase().removeChannel(closing)
}


// -----------------------------------------------------------------------------
// Implementation
// -----------------------------------------------------------------------------

export const supabaseOrdersRepository: OrdersRepository = {
  async getStations() {
    const { data, error } = await getSupabase()
      .from('stations')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error !== null) {
      throw new Error(`Не вдалося завантажити станції: ${error.message}`)
    }

    return data
  },

  async getOrders() {
    return fetchOrders()
  },

  async getOrderItems(orderId) {
    const { data, error } = await getSupabase()
      .from('order_items')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true })

    if (error !== null) {
      throw new Error(`Не вдалося завантажити позиції замовлення: ${error.message}`)
    }

    return data
  },

  async getOrderItemModifiers(orderId) {
    // One round trip: the line ids come from the same query that carries their
    // modifier rows, rather than a lookup followed by an `in` filter.
    const { data, error } = await getSupabase()
      .from('order_items')
      .select('id, order_item_modifiers(modifiers(*))')
      .eq('order_id', orderId)

    if (error !== null) {
      throw new Error(`Не вдалося завантажити модифікатори: ${error.message}`)
    }

    const grouped: ModifiersByOrderItem = {}

    for (const item of data) {
      const modifiers = item.order_item_modifiers
        .map((link) => link.modifiers)
        .filter((modifier): modifier is Modifier => modifier !== null)

      if (modifiers.length > 0) {
        grouped[item.id] = modifiers
      }
    }

    return grouped
  },

  async updateOrderStatus(orderId, newStatus, _userId) {
    // userId is ignored on purpose: the history trigger reads auth.uid() server
    // side, so a client cannot claim to be someone else. The parameter stays in
    // the signature because the interface is the contract components code
    // against, and it becomes meaningful again once staff log in.
    const { data, error } = await getSupabase().rpc('advance_order_status', {
      p_order_id: orderId,
      p_new_status: newStatus,
    })

    if (error !== null) {
      throw new Error(`Не вдалося змінити статус замовлення: ${error.message}`)
    }

    // A served order leaves the display's visible set, so realtime will not
    // report the change that removed it. Refresh here, exactly as the mock
    // notified its subscribers after a write.
    await refreshSubscribers()

    return data
  },

  subscribeToOrders(callback) {
    subscribers.add(callback)
    openChannel()

    return () => {
      subscribers.delete(callback)
      if (subscribers.size === 0) {
        closeChannel()
      }
    }
  },
}
