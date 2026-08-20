// -----------------------------------------------------------------------------
// Domain aliases over the generated database types.
//
// ./database.ts is regenerated from the schema and must stay mechanical; this
// file is the hand-written layer on top of it. Everything here is a re-export or
// a narrowing of a generated type — no independent definitions, so the two
// cannot drift.
// -----------------------------------------------------------------------------

import type { Enums, Tables } from './database'

export type UnitType = Enums<'unit_type'>
export type OrderStatus = Enums<'order_status'>

export type Station = Tables<'stations'>
export type MenuItem = Tables<'menu_items'>
export type Order = Tables<'orders'>
export type OrderItem = Tables<'order_items'>
export type Modifier = Tables<'modifiers'>
export type OrderItemModifier = Tables<'order_item_modifiers'>
export type OrderStatusHistoryEntry = Tables<'order_status_history'>
