-- =============================================================================
-- Lisova Pisnya — Kitchen Display System
-- Migration 001: core schema + seed data
-- =============================================================================
--
-- WHY PRICES AND NAMES ARE SNAPSHOTTED INTO order_items
--
-- An order is a historical record of something that happened in the dining
-- room at a particular moment. It is not a live view of the current menu.
--
-- If order_items only stored menu_item_id and we joined to menu_items to get
-- the name and the price, then every future menu edit would silently rewrite
-- the past. Raise the price of pork ribs tomorrow morning and last night's
-- closed bills would suddenly show a different total than the guest actually
-- paid. Rename a dish and last week's receipts would show a name the guest
-- never saw. Deactivate or delete a seasonal item and old orders would lose
-- their line description entirely.
--
-- So at the moment the waiter adds a line to an order, we copy the values that
-- were true right then — the dish name, the unit type, the per-portion price,
-- the price per 100 g — into the order_items row itself. menu_item_id stays as
-- a soft reference for reporting ("how often do we sell ribs"), but nothing in
-- pricing or printing ever reads through it. The menu can change freely; the
-- history stays frozen.
--
--
-- WHY line_total IS A GENERATED COLUMN IN THE DATABASE
--
-- Most dishes here are sold by weight: the waiter weighs the portion and types
-- the grams, and the money is grams / 100 * price per 100 g. That arithmetic is
-- the single most important number in the whole system, and it must produce the
-- same answer no matter who asks.
--
-- If each client computed it — the waiter tablet, the kitchen display, the
-- reporting job, a CSV export — we would eventually get four slightly different
-- answers, because one of them rounds differently, or forgets that this row is
-- a weight row and not a portion row, or was deployed a week later than the
-- others. Those bugs show up as money discrepancies at end of shift and are
-- painful to trace.
--
-- Making line_total a STORED generated column means Postgres computes it, once,
-- at write time, from the snapshot columns in the same row. It cannot drift, it
-- cannot be forgotten, it cannot be overwritten by a client, and it is already
-- materialized so summing a bill is a plain aggregate. Application code reads
-- line_total; it never calculates it.
--
-- =============================================================================


-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------

create type unit_type as enum ('portion', 'weight');

create type order_status as enum ('new', 'prep', 'ready', 'served');


-- -----------------------------------------------------------------------------
-- stations — the four kitchen stations tickets are routed to
-- -----------------------------------------------------------------------------

create table stations (
  id          uuid primary key default gen_random_uuid(),
  code        text        not null unique,
  name_uk     text        not null,
  sort_order  integer     not null default 0
);


-- -----------------------------------------------------------------------------
-- menu_items — the CURRENT menu. Freely editable; never read by past orders.
-- -----------------------------------------------------------------------------

create table menu_items (
  id              uuid primary key default gen_random_uuid(),
  name            text        not null,
  station_id      uuid        not null references stations (id) on delete restrict,
  unit_type       unit_type   not null,
  unit_price      numeric(10,2),
  price_per_100g  numeric(10,2),
  is_active       boolean     not null default true
);


-- -----------------------------------------------------------------------------
-- orders
-- -----------------------------------------------------------------------------

create table orders (
  id            uuid primary key default gen_random_uuid(),
  table_number  integer       not null,
  waiter_id     uuid          references auth.users (id) on delete set null,
  status        order_status  not null default 'new',
  created_at    timestamptz   not null default now(),
  updated_at    timestamptz   not null default now()
);

create index orders_status_idx on orders (status);


-- -----------------------------------------------------------------------------
-- order_items — immutable record of what was sold, at the price it was sold for
-- -----------------------------------------------------------------------------

create table order_items (
  id                        uuid primary key default gen_random_uuid(),
  order_id                  uuid          not null references orders (id) on delete cascade,
  menu_item_id              uuid          not null references menu_items (id) on delete restrict,
  station_id                uuid          not null references stations (id) on delete restrict,

  -- snapshots taken when the line was created; never refreshed from menu_items
  item_name_snapshot        text          not null,
  unit_type                 unit_type     not null,
  quantity                  integer,
  weight_grams              numeric(10,2),
  unit_price_snapshot       numeric(10,2),
  price_per_100g_snapshot   numeric(10,2),

  line_total numeric(10,2)
    generated always as (
      case unit_type
        when 'portion' then round(quantity * unit_price_snapshot, 2)
        when 'weight'  then round(weight_grams / 100 * price_per_100g_snapshot, 2)
      end
    ) stored,

  item_status               order_status  not null default 'new',
  created_at                timestamptz   not null default now(),

  constraint order_items_pricing_shape_check check (
    (unit_type = 'weight'
       and weight_grams is not null
       and price_per_100g_snapshot is not null)
    or
    (unit_type = 'portion'
       and quantity is not null
       and unit_price_snapshot is not null)
  )
);

create index order_items_station_id_idx on order_items (station_id);


-- -----------------------------------------------------------------------------
-- modifiers
-- -----------------------------------------------------------------------------

create table modifiers (
  id       uuid primary key default gen_random_uuid(),
  name_uk  text not null unique
);

create table order_item_modifiers (
  order_item_id  uuid not null references order_items (id) on delete cascade,
  modifier_id    uuid not null references modifiers (id)   on delete restrict,
  primary key (order_item_id, modifier_id)
);


-- -----------------------------------------------------------------------------
-- order_status_history
-- -----------------------------------------------------------------------------

create table order_status_history (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid          not null references orders (id) on delete cascade,
  from_status order_status,
  to_status   order_status  not null,
  changed_by  uuid          references auth.users (id) on delete set null,
  changed_at  timestamptz   not null default now()
);


-- =============================================================================
-- SEED DATA
-- =============================================================================

-- Stations ---------------------------------------------------------------------

insert into stations (id, code, name_uk, sort_order) values
  ('a0000000-0000-4000-8000-000000000001', 'grill', 'Гриль',    1),
  ('a0000000-0000-4000-8000-000000000002', 'hot',   'Гаряча',   2),
  ('a0000000-0000-4000-8000-000000000003', 'cold',  'Холодна',  3),
  ('a0000000-0000-4000-8000-000000000004', 'bar',   'Бар',      4);


-- Menu -------------------------------------------------------------------------

insert into menu_items (id, name, station_id, unit_type, unit_price, price_per_100g, is_active) values
  -- grill, sold by weight
  ('b0000000-0000-4000-8000-000000000001', 'Шашлик зі свинячої шиї',        'a0000000-0000-4000-8000-000000000001', 'weight',  null,    89.00, true),
  ('b0000000-0000-4000-8000-000000000002', 'Шашлик з курячого філе',        'a0000000-0000-4000-8000-000000000001', 'weight',  null,    69.00, true),
  ('b0000000-0000-4000-8000-000000000003', 'Ребра свинячі гриль',           'a0000000-0000-4000-8000-000000000001', 'weight',  null,    95.00, true),
  ('b0000000-0000-4000-8000-000000000004', 'Ковбаски домашні гриль',        'a0000000-0000-4000-8000-000000000001', 'weight',  null,    79.00, true),
  ('b0000000-0000-4000-8000-000000000005', 'Стейк з лосося на грилі',       'a0000000-0000-4000-8000-000000000001', 'weight',  null,   165.00, true),
  ('b0000000-0000-4000-8000-000000000006', 'Овочі гриль',                   'a0000000-0000-4000-8000-000000000001', 'weight',  null,    55.00, true),
  -- hot
  ('b0000000-0000-4000-8000-000000000007', 'Картопля по-селянськи',         'a0000000-0000-4000-8000-000000000002', 'weight',  null,    39.00, true),
  ('b0000000-0000-4000-8000-000000000008', 'Борщ український з пампушками', 'a0000000-0000-4000-8000-000000000002', 'portion', 185.00,  null,  true),
  ('b0000000-0000-4000-8000-000000000009', 'Деруни зі сметаною',            'a0000000-0000-4000-8000-000000000002', 'portion', 155.00,  null,  true),
  -- cold
  ('b0000000-0000-4000-8000-00000000000a', 'Сало копчене з часником',       'a0000000-0000-4000-8000-000000000003', 'weight',  null,    45.00, true),
  ('b0000000-0000-4000-8000-00000000000b', 'Салат «Лісова галявина»',       'a0000000-0000-4000-8000-000000000003', 'portion', 175.00,  null,  true),
  -- bar
  ('b0000000-0000-4000-8000-00000000000c', 'Узвар домашній',                'a0000000-0000-4000-8000-000000000004', 'portion',  65.00,  null,  true);


-- Modifiers --------------------------------------------------------------------

insert into modifiers (id, name_uk) values
  ('c0000000-0000-4000-8000-000000000001', 'Без цибулі'),
  ('c0000000-0000-4000-8000-000000000002', 'Гостре'),
  ('c0000000-0000-4000-8000-000000000003', 'Не гостре'),
  ('c0000000-0000-4000-8000-000000000004', 'Добре просмажене'),
  ('c0000000-0000-4000-8000-000000000005', 'Середня просмаженість'),
  ('c0000000-0000-4000-8000-000000000006', 'Соус окремо'),
  ('c0000000-0000-4000-8000-000000000007', 'Без солі'),
  ('c0000000-0000-4000-8000-000000000008', 'Додатковий соус');


-- Orders -----------------------------------------------------------------------
-- waiter_id / changed_by are left null: auth.users is empty in a fresh project.

insert into orders (id, table_number, waiter_id, status, created_at, updated_at) values
  ('d0000000-0000-4000-8000-000000000001',  3, null, 'served', now() - interval '95 minutes', now() - interval '40 minutes'),
  ('d0000000-0000-4000-8000-000000000002',  5, null, 'served', now() - interval '70 minutes', now() - interval '25 minutes'),
  ('d0000000-0000-4000-8000-000000000003',  7, null, 'ready',  now() - interval '28 minutes', now() - interval '3 minutes'),
  ('d0000000-0000-4000-8000-000000000004',  2, null, 'prep',   now() - interval '18 minutes', now() - interval '12 minutes'),
  ('d0000000-0000-4000-8000-000000000005',  9, null, 'prep',   now() - interval '11 minutes', now() - interval '8 minutes'),
  ('d0000000-0000-4000-8000-000000000006', 12, null, 'new',    now() - interval '2 minutes',  now() - interval '2 minutes');


-- Order items ------------------------------------------------------------------
-- Every price and name below is a copy of what the menu said at that moment.

insert into order_items (
  id, order_id, menu_item_id, station_id,
  item_name_snapshot, unit_type, quantity, weight_grams,
  unit_price_snapshot, price_per_100g_snapshot, item_status, created_at
) values
  -- Order 1 (table 3, served)
  ('e0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
   'Шашлик зі свинячої шиї', 'weight', null, 340.00, null, 89.00, 'served', now() - interval '95 minutes'),
  ('e0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000002',
   'Картопля по-селянськи', 'weight', null, 210.00, null, 39.00, 'served', now() - interval '95 minutes'),
  ('e0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000c', 'a0000000-0000-4000-8000-000000000004',
   'Узвар домашній', 'portion', 2, null, 65.00, null, 'served', now() - interval '95 minutes'),

  -- Order 2 (table 5, served)
  ('e0000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000008', 'a0000000-0000-4000-8000-000000000002',
   'Борщ український з пампушками', 'portion', 2, null, 185.00, null, 'served', now() - interval '70 minutes'),
  ('e0000000-0000-4000-8000-000000000005', 'd0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000003',
   'Сало копчене з часником', 'weight', null, 120.00, null, 45.00, 'served', now() - interval '70 minutes'),

  -- Order 3 (table 7, ready)
  ('e0000000-0000-4000-8000-000000000006', 'd0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001',
   'Ребра свинячі гриль', 'weight', null, 520.00, null, 95.00, 'ready', now() - interval '28 minutes'),
  ('e0000000-0000-4000-8000-000000000007', 'd0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000001',
   'Овочі гриль', 'weight', null, 260.00, null, 55.00, 'ready', now() - interval '28 minutes'),
  ('e0000000-0000-4000-8000-000000000008', 'd0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-00000000000b', 'a0000000-0000-4000-8000-000000000003',
   'Салат «Лісова галявина»', 'portion', 1, null, 175.00, null, 'ready', now() - interval '28 minutes'),

  -- Order 4 (table 2, prep)
  ('e0000000-0000-4000-8000-000000000009', 'd0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000001',
   'Стейк з лосося на грилі', 'weight', null, 280.00, null, 165.00, 'prep', now() - interval '18 minutes'),
  ('e0000000-0000-4000-8000-00000000000a', 'd0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000009', 'a0000000-0000-4000-8000-000000000002',
   'Деруни зі сметаною', 'portion', 1, null, 155.00, null, 'ready', now() - interval '18 minutes'),

  -- Order 5 (table 9, prep)
  ('e0000000-0000-4000-8000-00000000000b', 'd0000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001',
   'Ковбаски домашні гриль', 'weight', null, 380.00, null, 79.00, 'prep', now() - interval '11 minutes'),
  ('e0000000-0000-4000-8000-00000000000c', 'd0000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-00000000000c', 'a0000000-0000-4000-8000-000000000004',
   'Узвар домашній', 'portion', 3, null, 65.00, null, 'ready', now() - interval '11 minutes'),

  -- Order 6 (table 12, new)
  ('e0000000-0000-4000-8000-00000000000d', 'd0000000-0000-4000-8000-000000000006', 'b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001',
   'Шашлик з курячого філе', 'weight', null, 430.00, null, 69.00, 'new', now() - interval '2 minutes'),
  ('e0000000-0000-4000-8000-00000000000e', 'd0000000-0000-4000-8000-000000000006', 'b0000000-0000-4000-8000-000000000008', 'a0000000-0000-4000-8000-000000000002',
   'Борщ український з пампушками', 'portion', 1, null, 185.00, null, 'new', now() - interval '2 minutes');


-- Item modifiers ---------------------------------------------------------------

insert into order_item_modifiers (order_item_id, modifier_id) values
  ('e0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000004'),  -- шашлик: добре просмажене
  ('e0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001'),  -- шашлик: без цибулі
  ('e0000000-0000-4000-8000-000000000005', 'c0000000-0000-4000-8000-000000000006'),  -- сало: соус окремо
  ('e0000000-0000-4000-8000-000000000006', 'c0000000-0000-4000-8000-000000000002'),  -- ребра: гостре
  ('e0000000-0000-4000-8000-000000000006', 'c0000000-0000-4000-8000-000000000008'),  -- ребра: додатковий соус
  ('e0000000-0000-4000-8000-000000000009', 'c0000000-0000-4000-8000-000000000005'),  -- лосось: середня просмаженість
  ('e0000000-0000-4000-8000-00000000000b', 'c0000000-0000-4000-8000-000000000003'),  -- ковбаски: не гостре
  ('e0000000-0000-4000-8000-00000000000d', 'c0000000-0000-4000-8000-000000000007');  -- курка: без солі


-- Status history ---------------------------------------------------------------

insert into order_status_history (order_id, from_status, to_status, changed_by, changed_at) values
  ('d0000000-0000-4000-8000-000000000001', null,     'new',    null, now() - interval '95 minutes'),
  ('d0000000-0000-4000-8000-000000000001', 'new',    'prep',   null, now() - interval '92 minutes'),
  ('d0000000-0000-4000-8000-000000000001', 'prep',   'ready',  null, now() - interval '58 minutes'),
  ('d0000000-0000-4000-8000-000000000001', 'ready',  'served', null, now() - interval '40 minutes'),

  ('d0000000-0000-4000-8000-000000000002', null,     'new',    null, now() - interval '70 minutes'),
  ('d0000000-0000-4000-8000-000000000002', 'new',    'prep',   null, now() - interval '66 minutes'),
  ('d0000000-0000-4000-8000-000000000002', 'prep',   'ready',  null, now() - interval '44 minutes'),
  ('d0000000-0000-4000-8000-000000000002', 'ready',  'served', null, now() - interval '25 minutes'),

  ('d0000000-0000-4000-8000-000000000003', null,     'new',    null, now() - interval '28 minutes'),
  ('d0000000-0000-4000-8000-000000000003', 'new',    'prep',   null, now() - interval '26 minutes'),
  ('d0000000-0000-4000-8000-000000000003', 'prep',   'ready',  null, now() - interval '3 minutes'),

  ('d0000000-0000-4000-8000-000000000004', null,     'new',    null, now() - interval '18 minutes'),
  ('d0000000-0000-4000-8000-000000000004', 'new',    'prep',   null, now() - interval '12 minutes'),

  ('d0000000-0000-4000-8000-000000000005', null,     'new',    null, now() - interval '11 minutes'),
  ('d0000000-0000-4000-8000-000000000005', 'new',    'prep',   null, now() - interval '8 minutes'),

  ('d0000000-0000-4000-8000-000000000006', null,     'new',    null, now() - interval '2 minutes');
