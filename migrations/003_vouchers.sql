-- Le Printemps — bons par prestation
-- Migration 003. Ne touche pas aux données existantes : ajouts uniquement.
-- L'application stocke actuellement ses données en JSON (server/data/*.json) ;
-- ce script décrit le schéma équivalent pour un backend SQL.

create table if not exists voucher_orders (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references clients(id),
  status        text not null default 'pending'
                check (status in ('pending', 'confirmed', 'cancelled', 'expired')),
  created_by    text not null default 'client' check (created_by in ('client', 'admin')),
  created_at    timestamptz not null default now(),
  confirmed_at  timestamptz,
  cancelled_at  timestamptz
);

create table if not exists voucher_order_items (
  id                    uuid primary key default gen_random_uuid(),
  order_id              uuid not null references voucher_orders(id),
  service_id            uuid not null references services(id),
  quantity              integer not null check (quantity between 1 and 10),
  unit_price_fcfa       integer not null,
  final_unit_price_fcfa integer
);

create table if not exists vouchers (
  id                uuid primary key default gen_random_uuid(),
  code              text not null unique,          -- PRT-XXXXX-XXXXX, alphabet sans 0/O/1/I/L
  service_id        uuid not null references services(id),
  order_id          uuid not null references voucher_orders(id),
  owner_client_id   uuid not null references clients(id),
  price_paid_fcfa   integer not null,
  status            text not null default 'active'
                    check (status in ('active', 'reserved', 'used', 'cancelled')),
  expires_at        timestamptz,
  reserved_visit_id uuid references registrations(id),
  used_at           timestamptz,
  xp_credited       integer not null default 0,
  created_at        timestamptz not null default now()
);

create index if not exists vouchers_owner_idx on vouchers (owner_client_id);
create index if not exists vouchers_code_idx on vouchers (code);
create index if not exists voucher_orders_client_idx on voucher_orders (client_id);

-- L'expiration d'un bon n'est pas stockée : un bon 'active' dont expires_at
-- est dépassé est traité comme expiré à l'affichage et à l'utilisation.
-- Une commande 'pending' de plus de 72 h est traitée comme 'expired' à la
-- lecture, sans cron.
-- Les points (1 FCFA = 1 Goutte de Rosée) sont crédités uniquement à la
-- confirmation du paiement, jamais à la création de la commande.

-- Visite : bons appliqués.
alter table registrations add column if not exists voucher_ids uuid[];

-- Réglage de validité (0 = sans expiration).
create table if not exists settings (
  key   text primary key,
  value text not null
);
insert into settings (key, value)
  values ('voucher_validity_months', '6')
  on conflict (key) do nothing;
