// -----------------------------------------------------------------------------
// The single data-access module for the whole application.
//
// Nothing outside this file's re-exports talks to a data source. Components
// import `ordersRepository` and nothing else; they never see a query, a
// channel, a Supabase client or a mock store — and they cannot tell which of
// the two implementations they were handed.
//
// The choice is made here, once, at module load, from a build-time flag. It is
// deliberately not a runtime toggle: a kitchen display must never be one stray
// click away from showing invented tickets as if they were real orders.
// -----------------------------------------------------------------------------

import { mockOrdersRepository } from './mockOrdersRepository'
import { supabaseOrdersRepository } from './supabaseOrdersRepository'
import type { OrdersRepository } from './repositoryContract'

export type { ModifiersByOrderItem, OrdersRepository, Unsubscribe } from './repositoryContract'

/**
 * True when the board runs on seeded demo data instead of the database.
 *
 * Exported so the interface can say so on screen. Nothing else should branch on
 * it: behaviour differences belong inside the implementations, not scattered
 * through the components.
 */
export const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true'

export const ordersRepository: OrdersRepository = isDemoMode
  ? mockOrdersRepository
  : supabaseOrdersRepository
