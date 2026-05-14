-- Users
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique not null,
  password text not null,
  is_admin boolean default false,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Clients
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text default 'active',
  ca_access_token text,
  ca_refresh_token text,
  ca_token_expires_at timestamptz,
  ca_connected boolean default false,
  created_at timestamptz default now()
);

-- Recipients
create table if not exists recipients (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  name text not null,
  phone text not null,
  role text,
  active boolean default true,
  created_at timestamptz default now()
);

-- Report History
create table if not exists report_history (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete set null,
  period_start date not null,
  period_end date not null,
  entradas numeric default 0,
  saidas numeric default 0,
  saldo numeric default 0,
  message text,
  send_status text default 'pending',
  sent_at timestamptz,
  created_at timestamptz default now()
);

-- Config
create table if not exists config (
  key text primary key,
  value text
);

-- Disable RLS (internal system, JWT auth handled by backend)
alter table users disable row level security;
alter table clients disable row level security;
alter table recipients disable row level security;
alter table report_history disable row level security;
alter table config disable row level security;
