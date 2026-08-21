-- =============================================================================
-- Lisova Pisnya — Kitchen Display System
-- Migration 003: publish orders to realtime
-- =============================================================================
--
-- The kitchen display subscribes to a realtime channel instead of polling. A
-- channel subscribes successfully whether or not the table is published, which
-- makes the missing half easy to overlook: the socket connects, the channel
-- reports SUBSCRIBED, and no event ever arrives, because Postgres is not
-- replicating that table to the realtime server at all.
--
-- Only `orders` is published. The board redraws by re-querying whenever it
-- hears that something changed, so the payload is never read — publishing the
-- line items and their modifiers as well would put every dish and every price
-- on the wire for no gain.
--
-- Row level security still applies on top of this: the display receives events
-- only for rows its SELECT policy would let it read, so a served order leaving
-- the board is not announced to anonymous listeners. That is why
-- updateOrderStatus refreshes its subscribers itself after a successful call.
-- =============================================================================

-- Supabase ships this publication on new projects, but never assume it.
do $$
begin
  if not exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) then
    create publication supabase_realtime;
  end if;
end;
$$;

-- Adding a table that is already published raises, so check first: this keeps
-- the migration safe to re-run.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
end;
$$;

-- Realtime sends the full previous row on UPDATE and DELETE only when the table
-- has a replica identity to build it from. The board does not read payloads
-- today, but a future filter on old.status would silently see nulls without it.
alter table public.orders replica identity full;
