-- ============================================================
-- Karyana POS — Phase 2 Schema
-- Run this in Supabase SQL Editor AFTER schema.sql
-- ============================================================

-- ── Stores table (one row per karyana store) ────────────────
create table if not exists stores (
  id          bigserial primary key,
  "userId"    uuid references auth.users(id) on delete cascade,
  "storeId"   text unique not null,
  "storeName" text not null,
  phone       text,
  area        text,
  city        text,
  ntn         text,
  "createdAt" timestamptz default now(),
  "updatedAt" timestamptz default now()
);

-- ── Subscriptions table ─────────────────────────────────────
create table if not exists subscriptions (
  id           bigserial primary key,
  "storeId"    text unique not null references stores("storeId") on delete cascade,
  plan         text default 'trial',       -- 'trial' | 'basic' | 'pro'
  status       text default 'trial',       -- 'trial' | 'active' | 'grace' | 'suspended'
  "paidUntil"  date,
  "trialEnds"  date default (now() + interval '30 days'),
  "lastPayment" numeric(10,2) default 0,
  "paymentMethod" text,                   -- 'easypaisa' | 'jazzcash' | 'bank'
  notes        text,
  "createdAt"  timestamptz default now(),
  "updatedAt"  timestamptz default now()
);

-- ── Payment history (manual log of payments received) ───────
create table if not exists payments (
  id           bigserial primary key,
  "storeId"    text references stores("storeId") on delete cascade,
  amount       numeric(10,2) not null,
  method       text,                       -- 'easypaisa' | 'jazzcash' | 'bank'
  reference    text,                       -- transaction ID from their screenshot
  months       integer default 1,
  plan         text,
  "recordedBy" text,                       -- admin phone who recorded it
  "createdAt"  timestamptz default now()
);

-- ── Add storeId to all existing tables ──────────────────────
alter table products   add column if not exists "storeId" text;
alter table sales      add column if not exists "storeId" text;
alter table customers  add column if not exists "storeId" text;
alter table vendors    add column if not exists "storeId" text;
alter table orders     add column if not exists "storeId" text;
alter table categories add column if not exists "storeId" text;
alter table "gstRates" add column if not exists "storeId" text;

-- ── Indexes ──────────────────────────────────────────────────
create index if not exists idx_stores_userid    on stores("userId");
create index if not exists idx_stores_storeid   on stores("storeId");
create index if not exists idx_products_storeid on products("storeId");
create index if not exists idx_sales_storeid    on sales("storeId");
create index if not exists idx_customers_storeid on customers("storeId");
create index if not exists idx_vendors_storeid  on vendors("storeId");
create index if not exists idx_orders_storeid   on orders("storeId");
create index if not exists idx_subs_storeid     on subscriptions("storeId");

-- ════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- Each store can only see and edit its own data.
-- ════════════════════════════════════════════════════════════

-- Helper function: get storeId for the current logged-in user
create or replace function get_my_store_id()
returns text language sql security definer stable as $$
  select "storeId" from stores where "userId" = auth.uid() limit 1;
$$;

-- ── Enable RLS on all tables ─────────────────────────────────
alter table stores        enable row level security;
alter table subscriptions enable row level security;
alter table products      enable row level security;
alter table sales         enable row level security;
alter table customers     enable row level security;
alter table vendors       enable row level security;
alter table orders        enable row level security;
alter table categories    enable row level security;
alter table "gstRates"    enable row level security;
alter table payments      enable row level security;

-- ── Stores: users can only see their own store ───────────────
create policy "stores_own" on stores
  for all using ("userId" = auth.uid());

-- ── Subscriptions: users can read their own ─────────────────
create policy "subs_read_own" on subscriptions
  for select using ("storeId" = get_my_store_id());

-- Admins can update subscriptions (via service role key)
-- Use service role key only in your admin dashboard, never in the app.

-- ── Products ─────────────────────────────────────────────────
create policy "products_own" on products
  for all using ("storeId" = get_my_store_id());

-- ── Sales ────────────────────────────────────────────────────
create policy "sales_own" on sales
  for all using ("storeId" = get_my_store_id());

-- ── Customers ────────────────────────────────────────────────
create policy "customers_own" on customers
  for all using ("storeId" = get_my_store_id());

-- ── Vendors ──────────────────────────────────────────────────
create policy "vendors_own" on vendors
  for all using ("storeId" = get_my_store_id());

-- ── Orders ───────────────────────────────────────────────────
create policy "orders_own" on orders
  for all using ("storeId" = get_my_store_id());

-- ── Categories: store-specific + global (storeId IS NULL) ───
create policy "categories_own" on categories
  for all using ("storeId" = get_my_store_id() or "storeId" is null);

-- ── GST Rates: store-specific + global ───────────────────────
create policy "gstrates_own" on "gstRates"
  for all using ("storeId" = get_my_store_id() or "storeId" is null);

-- ── Payments: only admins via service role ───────────────────
create policy "payments_own" on payments
  for select using ("storeId" = get_my_store_id());

-- ════════════════════════════════════════════════════════════
-- ADMIN VIEW (you use this to manage all stores)
-- Run queries with the service role key, not anon key.
-- ════════════════════════════════════════════════════════════

create or replace view admin_stores_overview as
select
  s."storeId",
  s."storeName",
  s.phone,
  s.area,
  s."createdAt"::date as joined,
  sub.plan,
  sub.status,
  sub."trialEnds",
  sub."paidUntil",
  (select count(*) from sales sa where sa."storeId" = s."storeId") as total_sales,
  (select count(*) from products p where p."storeId" = s."storeId") as total_products
from stores s
left join subscriptions sub on sub."storeId" = s."storeId"
order by s."createdAt" desc;
