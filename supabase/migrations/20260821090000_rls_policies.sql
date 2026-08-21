-- =============================================================================
-- Lisova Pisnya — Kitchen Display System
-- Migration 002: row level security
-- =============================================================================
--
-- This migration has two halves and they are deliberately separated.
--
-- PART ONE is the real model: three staff roles — kitchen, waiter, admin —
-- expressed as policies on the `authenticated` database role. It is complete
-- and it is what the system runs on once anyone can log in. Nothing in it is
-- provisional.
--
-- PART TWO is the temporary layer that keeps today's login-less display alive.
-- It is small, it is read-only apart from a single validated function, and it
-- is fenced off at the bottom of the file with its own teardown block. Deleting
-- PART TWO is the whole of "we now have authentication".
--
--
-- WHY THE DISPLAY DOES NOT SIMPLY GET THE KITCHEN ROLE
--
-- `anon` is not "a user who has not logged in yet". It is the role attached to
-- the publishable key, and that key ships inside the JavaScript bundle. Every
-- privilege granted to `anon` is granted to the public internet.
--
-- Handing `anon` the kitchen policies would therefore publish an UPDATE verb on
-- the orders table. Instead the display gets SELECT on live orders and exactly
-- one function, advance_order_status, which accepts an order and a target
-- status and refuses anything that is not a legal forward step. The public
-- surface is one verb with a closed argument space rather than a table.
--
--
-- WHY PRICES ARE UNREACHABLE FOR EVERYONE, ADMIN INCLUDED
--
-- Migration 001 established that order_items is a historical record: the name
-- and the price were copied at the moment of sale and the menu can never reach
-- back and rewrite them. That is a property of the data, not a permission
-- level, so it is not expressed as a policy — policies describe who may act,
-- and here the answer is nobody.
--
-- It is enforced twice. Column-level privileges mean `authenticated` may write
-- item_status and nothing else. A trigger then rejects any statement that alters
-- a snapshot column, which also covers service_role and the table owner, both of
-- which bypass row level security by design. line_total needs no guard at all:
-- Postgres refuses writes to a generated column outright.
--
-- =============================================================================


-- =============================================================================
-- PART ZERO — role plumbing
-- =============================================================================
--
-- The staff role lives in the JWT under app_metadata. That claim is writable
-- only with the service key, so a user cannot promote themselves; user_metadata
-- would be self-service and is deliberately not used here.
--
-- With no authentication configured, auth.jwt() is null, app_role() returns the
-- empty string, and every policy in PART ONE evaluates to false. The staff model
-- is inert rather than absent.

create or replace function public.app_role()
returns text
language sql
stable
set search_path = ''
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '');
$$;

create or replace function public.is_kitchen()
returns boolean language sql stable set search_path = '' as $$
  select public.app_role() = 'kitchen';
$$;

create or replace function public.is_waiter()
returns boolean language sql stable set search_path = '' as $$
  select public.app_role() = 'waiter';
$$;

create or replace function public.is_admin()
returns boolean language sql stable set search_path = '' as $$
  select public.app_role() = 'admin';
$$;


-- =============================================================================
-- PART ZERO — lock the doors before opening windows
-- =============================================================================
--
-- Supabase grants the client roles broad privileges on the public schema by
-- default. Revoke everything first so that only what is named below survives.

alter table public.stations             enable row level security;
alter table public.menu_items           enable row level security;
alter table public.orders               enable row level security;
alter table public.order_items          enable row level security;
alter table public.modifiers            enable row level security;
alter table public.order_item_modifiers enable row level security;
alter table public.order_status_history enable row level security;

revoke all on all tables in schema public from anon, authenticated;

grant usage on schema public to anon, authenticated;

-- Staff read everything the policies let through.
grant select on
  public.stations, public.menu_items, public.orders, public.order_items,
  public.modifiers, public.order_item_modifiers, public.order_status_history
  to authenticated;

-- Reference data is editable, but only the admin policies below let it through.
grant insert, update, delete on
  public.stations, public.menu_items, public.modifiers
  to authenticated;

grant insert, update, delete on public.orders to authenticated;

-- order_items: rows may be added and removed, but of the existing columns only
-- item_status may ever be written. This is the price rule as a privilege.
grant insert, delete on public.order_items to authenticated;
grant update (item_status) on public.order_items to authenticated;

grant insert, delete on public.order_item_modifiers to authenticated;

-- order_status_history gets no write privilege at all. It is filled by trigger
-- and is append-only by construction.


-- =============================================================================
-- PART ZERO — invariants enforced by trigger, not by permission
-- =============================================================================

-- An order line is a record of something that happened. Only its progress
-- through the kitchen may change.
create or replace function public.reject_order_item_rewrite()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.order_id                is distinct from old.order_id
  or new.menu_item_id            is distinct from old.menu_item_id
  or new.station_id              is distinct from old.station_id
  or new.item_name_snapshot      is distinct from old.item_name_snapshot
  or new.unit_type               is distinct from old.unit_type
  or new.quantity                is distinct from old.quantity
  or new.weight_grams            is distinct from old.weight_grams
  or new.unit_price_snapshot     is distinct from old.unit_price_snapshot
  or new.price_per_100g_snapshot is distinct from old.price_per_100g_snapshot
  or new.created_at              is distinct from old.created_at
  then
    raise exception
      'order_items is an immutable sales record; only item_status may change'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger order_items_reject_rewrite
  before update on public.order_items
  for each row execute function public.reject_order_item_rewrite();


-- The kitchen moves tickets along. It does not reseat guests or reassign
-- waiters. Row level security cannot express a column restriction, and column
-- privileges cannot tell one authenticated app role from another, so the rule
-- lives here.
create or replace function public.restrict_kitchen_order_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.app_role() = 'kitchen' then
    if new.table_number is distinct from old.table_number
    or new.waiter_id    is distinct from old.waiter_id
    or new.created_at   is distinct from old.created_at
    then
      raise exception 'kitchen may change order status only'
        using errcode = 'insufficient_privilege';
    end if;
  end if;

  return new;
end;
$$;

create trigger orders_restrict_kitchen_update
  before update on public.orders
  for each row execute function public.restrict_kitchen_order_update();


-- Status history is written by the database, never by a client. That is what
-- makes it worth reading: it cannot be skipped, backdated or forged, and it
-- needs no INSERT policy because no client role can insert at all.
create or replace function public.log_order_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.order_status_history (order_id, from_status, to_status, changed_by)
    values (new.id, null, new.status, auth.uid());
    return new;
  end if;

  if new.status is distinct from old.status then
    insert into public.order_status_history (order_id, from_status, to_status, changed_by)
    values (new.id, old.status, new.status, auth.uid());
    new.updated_at := now();
  end if;

  return new;
end;
$$;

create trigger orders_log_status_insert
  after insert on public.orders
  for each row execute function public.log_order_status_change();

create trigger orders_log_status_update
  before update on public.orders
  for each row execute function public.log_order_status_change();


-- =============================================================================
-- PART ONE — the staff model
-- =============================================================================
--
-- kitchen  reads every live order, advances statuses, touches nothing else
-- waiter   creates orders and lines, sees only their own
-- admin    everything, except rewriting a sold line
--
-- Multiple permissive policies on the same command are OR-ed together, so each
-- role is written as its own policy rather than one tangled expression.

-- Reference data ---------------------------------------------------------------
-- Any signed-in member of staff reads the menu; only an admin edits it.

create policy stations_select_staff on public.stations
  for select to authenticated using (true);

create policy stations_write_admin on public.stations
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy menu_items_select_staff on public.menu_items
  for select to authenticated using (true);

create policy menu_items_write_admin on public.menu_items
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy modifiers_select_staff on public.modifiers
  for select to authenticated using (true);

create policy modifiers_write_admin on public.modifiers
  for all to authenticated using (public.is_admin()) with check (public.is_admin());


-- orders -----------------------------------------------------------------------

create policy orders_select_kitchen on public.orders
  for select to authenticated using (public.is_kitchen());

create policy orders_select_admin on public.orders
  for select to authenticated using (public.is_admin());

create policy orders_select_own_waiter on public.orders
  for select to authenticated
  using (public.is_waiter() and waiter_id = auth.uid());

-- A waiter may only open an order in their own name.
create policy orders_insert_waiter on public.orders
  for insert to authenticated
  with check (public.is_waiter() and waiter_id = auth.uid());

create policy orders_insert_admin on public.orders
  for insert to authenticated with check (public.is_admin());

-- Column scope for the kitchen is enforced by orders_restrict_kitchen_update.
create policy orders_update_kitchen on public.orders
  for update to authenticated
  using (public.is_kitchen()) with check (public.is_kitchen());

create policy orders_update_own_waiter on public.orders
  for update to authenticated
  using (public.is_waiter() and waiter_id = auth.uid())
  with check (public.is_waiter() and waiter_id = auth.uid());

create policy orders_update_admin on public.orders
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy orders_delete_admin on public.orders
  for delete to authenticated using (public.is_admin());


-- order_items ------------------------------------------------------------------
-- Visibility follows the parent order, so a waiter never sees another waiter's
-- lines even though the line itself carries no waiter column.

create policy order_items_select_staff on public.order_items
  for select to authenticated
  using (
    public.is_kitchen()
    or public.is_admin()
    or (
      public.is_waiter()
      and exists (
        select 1 from public.orders o
        where o.id = order_items.order_id and o.waiter_id = auth.uid()
      )
    )
  );

create policy order_items_insert_waiter on public.order_items
  for insert to authenticated
  with check (
    public.is_waiter()
    and exists (
      select 1 from public.orders o
      where o.id = order_id and o.waiter_id = auth.uid()
    )
  );

create policy order_items_insert_admin on public.order_items
  for insert to authenticated with check (public.is_admin());

-- Reaches item_status only: every other column is refused by privilege and by
-- trigger regardless of which role passes this policy.
create policy order_items_update_status on public.order_items
  for update to authenticated
  using (public.is_kitchen() or public.is_admin())
  with check (public.is_kitchen() or public.is_admin());

-- Deleting a sold line destroys history, so it stays with the admin.
create policy order_items_delete_admin on public.order_items
  for delete to authenticated using (public.is_admin());


-- order_item_modifiers ---------------------------------------------------------

create policy order_item_modifiers_select_staff on public.order_item_modifiers
  for select to authenticated
  using (
    public.is_kitchen()
    or public.is_admin()
    or (
      public.is_waiter()
      and exists (
        select 1
        from public.order_items oi
        join public.orders o on o.id = oi.order_id
        where oi.id = order_item_modifiers.order_item_id
          and o.waiter_id = auth.uid()
      )
    )
  );

create policy order_item_modifiers_insert_waiter on public.order_item_modifiers
  for insert to authenticated
  with check (
    public.is_waiter()
    and exists (
      select 1
      from public.order_items oi
      join public.orders o on o.id = oi.order_id
      where oi.id = order_item_id and o.waiter_id = auth.uid()
    )
  );

create policy order_item_modifiers_insert_admin on public.order_item_modifiers
  for insert to authenticated with check (public.is_admin());

create policy order_item_modifiers_delete_admin on public.order_item_modifiers
  for delete to authenticated using (public.is_admin());


-- order_status_history ---------------------------------------------------------
-- Read-only for everyone, including the admin. There is no write policy because
-- there is no write privilege: the log is filled by trigger.

create policy order_status_history_select_kitchen on public.order_status_history
  for select to authenticated using (public.is_kitchen());

create policy order_status_history_select_admin on public.order_status_history
  for select to authenticated using (public.is_admin());

create policy order_status_history_select_own_waiter on public.order_status_history
  for select to authenticated
  using (
    public.is_waiter()
    and exists (
      select 1 from public.orders o
      where o.id = order_status_history.order_id and o.waiter_id = auth.uid()
    )
  );


-- =============================================================================
-- PART TWO — temporary display access, to be removed when login exists
-- =============================================================================
--
-- Everything below this line is scaffolding for the current build, in which the
-- board opens on a kitchen screen with no account behind it. Two deliberate
-- concessions, and nothing else:
--
--   1. anon reads orders that are still live. Served orders, and therefore the
--      restaurant's takings history, stay invisible. So does the status log.
--
--   2. anon may call advance_order_status and nothing more. The function moves
--      an order one legal step forward and refuses everything else — no jumping
--      backwards, no skipping, no reaching any other column, no reaching any
--      other table. anon holds no INSERT, UPDATE or DELETE privilege anywhere.
--
-- The residual risk is honest and worth stating: anyone holding the publishable
-- key can advance a ticket on this restaurant's board, and can read what is
-- cooking right now including line prices. Nobody can read closed bills, alter a
-- price, delete a record, or forge history.

grant select on
  public.stations, public.menu_items, public.modifiers,
  public.orders, public.order_items, public.order_item_modifiers
  to anon;

create policy stations_select_display on public.stations
  for select to anon using (true);

create policy menu_items_select_display on public.menu_items
  for select to anon using (true);

create policy modifiers_select_display on public.modifiers
  for select to anon using (true);

create policy orders_select_display on public.orders
  for select to anon using (status <> 'served');

create policy order_items_select_display on public.order_items
  for select to anon
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id and o.status <> 'served'
    )
  );

create policy order_item_modifiers_select_display on public.order_item_modifiers
  for select to anon
  using (
    exists (
      select 1
      from public.order_items oi
      join public.orders o on o.id = oi.order_id
      where oi.id = order_item_modifiers.order_item_id and o.status <> 'served'
    )
  );


-- The only write the public key can perform, and it is not a table write.
create or replace function public.advance_order_status(
  p_order_id uuid,
  p_new_status public.order_status
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
begin
  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'order % not found', p_order_id
      using errcode = 'no_data_found';
  end if;

  -- new -> prep -> ready -> served, one step at a time, forward only.
  if not (
       (v_order.status = 'new'   and p_new_status = 'prep')
    or (v_order.status = 'prep'  and p_new_status = 'ready')
    or (v_order.status = 'ready' and p_new_status = 'served')
  ) then
    raise exception 'illegal status transition % -> %', v_order.status, p_new_status
      using errcode = 'check_violation';
  end if;

  update public.orders
  set status = p_new_status
  where id = p_order_id
  returning * into v_order;

  return v_order;
end;
$$;

revoke all on function public.advance_order_status(uuid, public.order_status) from public;
grant execute on function public.advance_order_status(uuid, public.order_status)
  to anon, authenticated;


-- -----------------------------------------------------------------------------
-- Teardown for PART TWO. Run this, and nothing else, on the day login lands.
-- -----------------------------------------------------------------------------
--
--   drop policy stations_select_display             on public.stations;
--   drop policy menu_items_select_display           on public.menu_items;
--   drop policy modifiers_select_display            on public.modifiers;
--   drop policy orders_select_display               on public.orders;
--   drop policy order_items_select_display          on public.order_items;
--   drop policy order_item_modifiers_select_display on public.order_item_modifiers;
--
--   revoke select on
--     public.stations, public.menu_items, public.modifiers,
--     public.orders, public.order_items, public.order_item_modifiers
--     from anon;
--
--   revoke execute on function public.advance_order_status(uuid, public.order_status)
--     from anon;
--
-- PART ONE then stands on its own, unchanged.
