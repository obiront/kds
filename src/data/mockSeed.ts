// -----------------------------------------------------------------------------
// In-memory copy of the seed data from
// supabase/migrations/20260820120000_kds_schema.sql
//
// Values are transcribed from the migration, not invented. Timestamps that the
// migration expresses as `now() - interval 'N minutes'` are resolved against the
// moment this module is first imported, so a freshly loaded display shows a
// service in progress rather than a set of stale rows.
//
// line_total is stored here as a literal, exactly as Postgres would have
// materialised the generated column. Nothing reads these figures back out of an
// expression — they are data, the same as the prices they were derived from.
// -----------------------------------------------------------------------------

import type {
  MenuItem,
  Modifier,
  Order,
  OrderItem,
  OrderItemModifier,
  OrderStatusHistoryEntry,
  Station,
} from '../types/models'

const BOOTED_AT = Date.now()

function minutesAgo(minutes: number): string {
  return new Date(BOOTED_AT - minutes * 60_000).toISOString()
}

export const SEED_STATIONS: Station[] = [
  { id: 'a0000000-0000-4000-8000-000000000001', code: 'grill', name_uk: 'Гриль', sort_order: 1 },
  { id: 'a0000000-0000-4000-8000-000000000002', code: 'hot', name_uk: 'Гаряча', sort_order: 2 },
  { id: 'a0000000-0000-4000-8000-000000000003', code: 'cold', name_uk: 'Холодна', sort_order: 3 },
  { id: 'a0000000-0000-4000-8000-000000000004', code: 'bar', name_uk: 'Бар', sort_order: 4 },
]

const GRILL = SEED_STATIONS[0].id
const HOT = SEED_STATIONS[1].id
const COLD = SEED_STATIONS[2].id
const BAR = SEED_STATIONS[3].id

export const SEED_MENU_ITEMS: MenuItem[] = [
  { id: 'b0000000-0000-4000-8000-000000000001', name: 'Шашлик зі свинячої шиї', station_id: GRILL, unit_type: 'weight', unit_price: null, price_per_100g: 89.0, is_active: true },
  { id: 'b0000000-0000-4000-8000-000000000002', name: 'Шашлик з курячого філе', station_id: GRILL, unit_type: 'weight', unit_price: null, price_per_100g: 69.0, is_active: true },
  { id: 'b0000000-0000-4000-8000-000000000003', name: 'Ребра свинячі гриль', station_id: GRILL, unit_type: 'weight', unit_price: null, price_per_100g: 95.0, is_active: true },
  { id: 'b0000000-0000-4000-8000-000000000004', name: 'Ковбаски домашні гриль', station_id: GRILL, unit_type: 'weight', unit_price: null, price_per_100g: 79.0, is_active: true },
  { id: 'b0000000-0000-4000-8000-000000000005', name: 'Стейк з лосося на грилі', station_id: GRILL, unit_type: 'weight', unit_price: null, price_per_100g: 165.0, is_active: true },
  { id: 'b0000000-0000-4000-8000-000000000006', name: 'Овочі гриль', station_id: GRILL, unit_type: 'weight', unit_price: null, price_per_100g: 55.0, is_active: true },
  { id: 'b0000000-0000-4000-8000-000000000007', name: 'Картопля по-селянськи', station_id: HOT, unit_type: 'weight', unit_price: null, price_per_100g: 39.0, is_active: true },
  { id: 'b0000000-0000-4000-8000-000000000008', name: 'Борщ український з пампушками', station_id: HOT, unit_type: 'portion', unit_price: 185.0, price_per_100g: null, is_active: true },
  { id: 'b0000000-0000-4000-8000-000000000009', name: 'Деруни зі сметаною', station_id: HOT, unit_type: 'portion', unit_price: 155.0, price_per_100g: null, is_active: true },
  { id: 'b0000000-0000-4000-8000-00000000000a', name: 'Сало копчене з часником', station_id: COLD, unit_type: 'weight', unit_price: null, price_per_100g: 45.0, is_active: true },
  { id: 'b0000000-0000-4000-8000-00000000000b', name: 'Салат «Лісова галявина»', station_id: COLD, unit_type: 'portion', unit_price: 175.0, price_per_100g: null, is_active: true },
  { id: 'b0000000-0000-4000-8000-00000000000c', name: 'Узвар домашній', station_id: BAR, unit_type: 'portion', unit_price: 65.0, price_per_100g: null, is_active: true },
]

export const SEED_MODIFIERS: Modifier[] = [
  { id: 'c0000000-0000-4000-8000-000000000001', name_uk: 'Без цибулі' },
  { id: 'c0000000-0000-4000-8000-000000000002', name_uk: 'Гостре' },
  { id: 'c0000000-0000-4000-8000-000000000003', name_uk: 'Не гостре' },
  { id: 'c0000000-0000-4000-8000-000000000004', name_uk: 'Добре просмажене' },
  { id: 'c0000000-0000-4000-8000-000000000005', name_uk: 'Середня просмаженість' },
  { id: 'c0000000-0000-4000-8000-000000000006', name_uk: 'Соус окремо' },
  { id: 'c0000000-0000-4000-8000-000000000007', name_uk: 'Без солі' },
  { id: 'c0000000-0000-4000-8000-000000000008', name_uk: 'Додатковий соус' },
]

export const SEED_ORDERS: Order[] = [
  { id: 'd0000000-0000-4000-8000-000000000001', table_number: 3, waiter_id: null, status: 'served', created_at: minutesAgo(95), updated_at: minutesAgo(40) },
  { id: 'd0000000-0000-4000-8000-000000000002', table_number: 5, waiter_id: null, status: 'served', created_at: minutesAgo(70), updated_at: minutesAgo(25) },
  { id: 'd0000000-0000-4000-8000-000000000003', table_number: 7, waiter_id: null, status: 'ready', created_at: minutesAgo(28), updated_at: minutesAgo(3) },
  { id: 'd0000000-0000-4000-8000-000000000004', table_number: 2, waiter_id: null, status: 'prep', created_at: minutesAgo(18), updated_at: minutesAgo(12) },
  { id: 'd0000000-0000-4000-8000-000000000005', table_number: 9, waiter_id: null, status: 'prep', created_at: minutesAgo(11), updated_at: minutesAgo(8) },
  { id: 'd0000000-0000-4000-8000-000000000006', table_number: 12, waiter_id: null, status: 'new', created_at: minutesAgo(2), updated_at: minutesAgo(2) },
]

export const SEED_ORDER_ITEMS: OrderItem[] = [
  // Order 1 (table 3, served)
  { id: 'e0000000-0000-4000-8000-000000000001', order_id: SEED_ORDERS[0].id, menu_item_id: 'b0000000-0000-4000-8000-000000000001', station_id: GRILL, item_name_snapshot: 'Шашлик зі свинячої шиї', unit_type: 'weight', quantity: null, weight_grams: 340.0, unit_price_snapshot: null, price_per_100g_snapshot: 89.0, line_total: 302.6, item_status: 'served', created_at: minutesAgo(95) },
  { id: 'e0000000-0000-4000-8000-000000000002', order_id: SEED_ORDERS[0].id, menu_item_id: 'b0000000-0000-4000-8000-000000000007', station_id: HOT, item_name_snapshot: 'Картопля по-селянськи', unit_type: 'weight', quantity: null, weight_grams: 210.0, unit_price_snapshot: null, price_per_100g_snapshot: 39.0, line_total: 81.9, item_status: 'served', created_at: minutesAgo(95) },
  { id: 'e0000000-0000-4000-8000-000000000003', order_id: SEED_ORDERS[0].id, menu_item_id: 'b0000000-0000-4000-8000-00000000000c', station_id: BAR, item_name_snapshot: 'Узвар домашній', unit_type: 'portion', quantity: 2, weight_grams: null, unit_price_snapshot: 65.0, price_per_100g_snapshot: null, line_total: 130.0, item_status: 'served', created_at: minutesAgo(95) },

  // Order 2 (table 5, served)
  { id: 'e0000000-0000-4000-8000-000000000004', order_id: SEED_ORDERS[1].id, menu_item_id: 'b0000000-0000-4000-8000-000000000008', station_id: HOT, item_name_snapshot: 'Борщ український з пампушками', unit_type: 'portion', quantity: 2, weight_grams: null, unit_price_snapshot: 185.0, price_per_100g_snapshot: null, line_total: 370.0, item_status: 'served', created_at: minutesAgo(70) },
  { id: 'e0000000-0000-4000-8000-000000000005', order_id: SEED_ORDERS[1].id, menu_item_id: 'b0000000-0000-4000-8000-00000000000a', station_id: COLD, item_name_snapshot: 'Сало копчене з часником', unit_type: 'weight', quantity: null, weight_grams: 120.0, unit_price_snapshot: null, price_per_100g_snapshot: 45.0, line_total: 54.0, item_status: 'served', created_at: minutesAgo(70) },

  // Order 3 (table 7, ready)
  { id: 'e0000000-0000-4000-8000-000000000006', order_id: SEED_ORDERS[2].id, menu_item_id: 'b0000000-0000-4000-8000-000000000003', station_id: GRILL, item_name_snapshot: 'Ребра свинячі гриль', unit_type: 'weight', quantity: null, weight_grams: 520.0, unit_price_snapshot: null, price_per_100g_snapshot: 95.0, line_total: 494.0, item_status: 'ready', created_at: minutesAgo(28) },
  { id: 'e0000000-0000-4000-8000-000000000007', order_id: SEED_ORDERS[2].id, menu_item_id: 'b0000000-0000-4000-8000-000000000006', station_id: GRILL, item_name_snapshot: 'Овочі гриль', unit_type: 'weight', quantity: null, weight_grams: 260.0, unit_price_snapshot: null, price_per_100g_snapshot: 55.0, line_total: 143.0, item_status: 'ready', created_at: minutesAgo(28) },
  { id: 'e0000000-0000-4000-8000-000000000008', order_id: SEED_ORDERS[2].id, menu_item_id: 'b0000000-0000-4000-8000-00000000000b', station_id: COLD, item_name_snapshot: 'Салат «Лісова галявина»', unit_type: 'portion', quantity: 1, weight_grams: null, unit_price_snapshot: 175.0, price_per_100g_snapshot: null, line_total: 175.0, item_status: 'ready', created_at: minutesAgo(28) },

  // Order 4 (table 2, prep)
  { id: 'e0000000-0000-4000-8000-000000000009', order_id: SEED_ORDERS[3].id, menu_item_id: 'b0000000-0000-4000-8000-000000000005', station_id: GRILL, item_name_snapshot: 'Стейк з лосося на грилі', unit_type: 'weight', quantity: null, weight_grams: 280.0, unit_price_snapshot: null, price_per_100g_snapshot: 165.0, line_total: 462.0, item_status: 'prep', created_at: minutesAgo(18) },
  { id: 'e0000000-0000-4000-8000-00000000000a', order_id: SEED_ORDERS[3].id, menu_item_id: 'b0000000-0000-4000-8000-000000000009', station_id: HOT, item_name_snapshot: 'Деруни зі сметаною', unit_type: 'portion', quantity: 1, weight_grams: null, unit_price_snapshot: 155.0, price_per_100g_snapshot: null, line_total: 155.0, item_status: 'ready', created_at: minutesAgo(18) },

  // Order 5 (table 9, prep)
  { id: 'e0000000-0000-4000-8000-00000000000b', order_id: SEED_ORDERS[4].id, menu_item_id: 'b0000000-0000-4000-8000-000000000004', station_id: GRILL, item_name_snapshot: 'Ковбаски домашні гриль', unit_type: 'weight', quantity: null, weight_grams: 380.0, unit_price_snapshot: null, price_per_100g_snapshot: 79.0, line_total: 300.2, item_status: 'prep', created_at: minutesAgo(11) },
  { id: 'e0000000-0000-4000-8000-00000000000c', order_id: SEED_ORDERS[4].id, menu_item_id: 'b0000000-0000-4000-8000-00000000000c', station_id: BAR, item_name_snapshot: 'Узвар домашній', unit_type: 'portion', quantity: 3, weight_grams: null, unit_price_snapshot: 65.0, price_per_100g_snapshot: null, line_total: 195.0, item_status: 'ready', created_at: minutesAgo(11) },

  // Order 6 (table 12, new)
  { id: 'e0000000-0000-4000-8000-00000000000d', order_id: SEED_ORDERS[5].id, menu_item_id: 'b0000000-0000-4000-8000-000000000002', station_id: GRILL, item_name_snapshot: 'Шашлик з курячого філе', unit_type: 'weight', quantity: null, weight_grams: 430.0, unit_price_snapshot: null, price_per_100g_snapshot: 69.0, line_total: 296.7, item_status: 'new', created_at: minutesAgo(2) },
  { id: 'e0000000-0000-4000-8000-00000000000e', order_id: SEED_ORDERS[5].id, menu_item_id: 'b0000000-0000-4000-8000-000000000008', station_id: HOT, item_name_snapshot: 'Борщ український з пампушками', unit_type: 'portion', quantity: 1, weight_grams: null, unit_price_snapshot: 185.0, price_per_100g_snapshot: null, line_total: 185.0, item_status: 'new', created_at: minutesAgo(2) },
]

export const SEED_ORDER_ITEM_MODIFIERS: OrderItemModifier[] = [
  { order_item_id: 'e0000000-0000-4000-8000-000000000001', modifier_id: 'c0000000-0000-4000-8000-000000000004' },
  { order_item_id: 'e0000000-0000-4000-8000-000000000001', modifier_id: 'c0000000-0000-4000-8000-000000000001' },
  { order_item_id: 'e0000000-0000-4000-8000-000000000005', modifier_id: 'c0000000-0000-4000-8000-000000000006' },
  { order_item_id: 'e0000000-0000-4000-8000-000000000006', modifier_id: 'c0000000-0000-4000-8000-000000000002' },
  { order_item_id: 'e0000000-0000-4000-8000-000000000006', modifier_id: 'c0000000-0000-4000-8000-000000000008' },
  { order_item_id: 'e0000000-0000-4000-8000-000000000009', modifier_id: 'c0000000-0000-4000-8000-000000000005' },
  { order_item_id: 'e0000000-0000-4000-8000-00000000000b', modifier_id: 'c0000000-0000-4000-8000-000000000003' },
  { order_item_id: 'e0000000-0000-4000-8000-00000000000d', modifier_id: 'c0000000-0000-4000-8000-000000000007' },
]

export const SEED_ORDER_STATUS_HISTORY: OrderStatusHistoryEntry[] = [
  { id: 'f0000000-0000-4000-8000-000000000001', order_id: SEED_ORDERS[0].id, from_status: null, to_status: 'new', changed_by: null, changed_at: minutesAgo(95) },
  { id: 'f0000000-0000-4000-8000-000000000002', order_id: SEED_ORDERS[0].id, from_status: 'new', to_status: 'prep', changed_by: null, changed_at: minutesAgo(92) },
  { id: 'f0000000-0000-4000-8000-000000000003', order_id: SEED_ORDERS[0].id, from_status: 'prep', to_status: 'ready', changed_by: null, changed_at: minutesAgo(58) },
  { id: 'f0000000-0000-4000-8000-000000000004', order_id: SEED_ORDERS[0].id, from_status: 'ready', to_status: 'served', changed_by: null, changed_at: minutesAgo(40) },

  { id: 'f0000000-0000-4000-8000-000000000005', order_id: SEED_ORDERS[1].id, from_status: null, to_status: 'new', changed_by: null, changed_at: minutesAgo(70) },
  { id: 'f0000000-0000-4000-8000-000000000006', order_id: SEED_ORDERS[1].id, from_status: 'new', to_status: 'prep', changed_by: null, changed_at: minutesAgo(66) },
  { id: 'f0000000-0000-4000-8000-000000000007', order_id: SEED_ORDERS[1].id, from_status: 'prep', to_status: 'ready', changed_by: null, changed_at: minutesAgo(44) },
  { id: 'f0000000-0000-4000-8000-000000000008', order_id: SEED_ORDERS[1].id, from_status: 'ready', to_status: 'served', changed_by: null, changed_at: minutesAgo(25) },

  { id: 'f0000000-0000-4000-8000-000000000009', order_id: SEED_ORDERS[2].id, from_status: null, to_status: 'new', changed_by: null, changed_at: minutesAgo(28) },
  { id: 'f0000000-0000-4000-8000-00000000000a', order_id: SEED_ORDERS[2].id, from_status: 'new', to_status: 'prep', changed_by: null, changed_at: minutesAgo(26) },
  { id: 'f0000000-0000-4000-8000-00000000000b', order_id: SEED_ORDERS[2].id, from_status: 'prep', to_status: 'ready', changed_by: null, changed_at: minutesAgo(3) },

  { id: 'f0000000-0000-4000-8000-00000000000c', order_id: SEED_ORDERS[3].id, from_status: null, to_status: 'new', changed_by: null, changed_at: minutesAgo(18) },
  { id: 'f0000000-0000-4000-8000-00000000000d', order_id: SEED_ORDERS[3].id, from_status: 'new', to_status: 'prep', changed_by: null, changed_at: minutesAgo(12) },

  { id: 'f0000000-0000-4000-8000-00000000000e', order_id: SEED_ORDERS[4].id, from_status: null, to_status: 'new', changed_by: null, changed_at: minutesAgo(11) },
  { id: 'f0000000-0000-4000-8000-00000000000f', order_id: SEED_ORDERS[4].id, from_status: 'new', to_status: 'prep', changed_by: null, changed_at: minutesAgo(8) },

  { id: 'f0000000-0000-4000-8000-000000000010', order_id: SEED_ORDERS[5].id, from_status: null, to_status: 'new', changed_by: null, changed_at: minutesAgo(2) },
]
