-- ============================================================
-- Karyana POS — Supabase / Postgres Schema
-- Run this in Supabase SQL Editor once to set up cloud sync.
-- ============================================================

-- Products
create table if not exists products (
  id          bigserial primary key,
  name        text not null,
  "nameUr"    text,
  price       numeric(10,2) not null default 0,
  cost        numeric(10,2) not null default 0,
  stock       integer not null default 0,
  cat         text,
  barcode     text,
  "vendorId"  bigint,
  "gstId"     text default 'inherit',
  "updatedAt" timestamptz default now()
);

-- Categories
create table if not exists categories (
  id          bigserial primary key,
  key         text unique not null,
  en          text not null,
  ur          text,
  icon        text default '📦',
  color       text default '#607d8b',
  "gstId"     text default 'r17',
  "updatedAt" timestamptz default now()
);

-- GST rates
create table if not exists "gstRates" (
  id          bigserial primary key,
  "rateId"    text unique not null,
  name        text not null,
  pct         numeric(5,2) not null default 0,
  description text,
  color       text default '#888',
  "updatedAt" timestamptz default now()
);

-- Vendors
create table if not exists vendors (
  id          bigserial primary key,
  name        text not null,
  contact     text,
  phone       text,
  area        text,
  notes       text,
  credit      numeric(10,2) default 0,
  "lastOrder" date,
  "updatedAt" timestamptz default now()
);

-- Customers
create table if not exists customers (
  id          bigserial primary key,
  name        text not null,
  phone       text,
  balance     numeric(10,2) default 0,
  last        date,
  "smsSent"   boolean default false,
  "updatedAt" timestamptz default now()
);

-- Sales
create table if not exists sales (
  id          bigserial primary key,
  time        text,
  "createdAt" timestamptz default now(),
  payment     text,
  subtotal    numeric(10,2) default 0,
  "taxLines"  jsonb default '[]',
  total       numeric(10,2) default 0,
  "lineItems" jsonb default '[]',
  synced      integer default 0,
  "updatedAt" timestamptz default now()
);

-- Sale items (for detailed reporting)
create table if not exists "saleItems" (
  id          bigserial primary key,
  "saleId"    bigint references sales(id) on delete cascade,
  "productId" bigint,
  qty         integer,
  price       numeric(10,2)
);

-- Orders
create table if not exists orders (
  id             bigserial primary key,
  "vendorId"     bigint references vendors(id),
  "vendorName"   text,
  date           date,
  "deliveryDate" date,
  status         text default 'pending',
  terms          text default 'cash',
  total          numeric(10,2) default 0,
  notes          text,
  "updatedAt"    timestamptz default now()
);

-- Order items
create table if not exists "orderItems" (
  id          bigserial primary key,
  "orderId"   bigint references orders(id) on delete cascade,
  "productId" bigint,
  name        text,
  qty         integer,
  cost        numeric(10,2),
  received    integer default 0
);

-- ── Row-level security (each store sees only its own data) ──
-- Enable RLS on all tables after setting up Supabase Auth.
-- alter table products  enable row level security;
-- alter table sales     enable row level security;
-- (uncomment when you add multi-store / multi-user support)

-- ── Indexes for common queries ──────────────────────────────
create index if not exists idx_products_cat      on products(cat);
create index if not exists idx_products_barcode  on products(barcode);
create index if not exists idx_sales_created     on sales("createdAt" desc);
create index if not exists idx_orders_status     on orders(status);
create index if not exists idx_saleitems_saleid  on "saleItems"("saleId");
create index if not exists idx_orderitems_orderid on "orderItems"("orderId");
