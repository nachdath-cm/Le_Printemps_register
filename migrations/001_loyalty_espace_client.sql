-- Le Printemps — espace client & fidélité « Fleurs de Printemps »
-- Migration 001. Ne touche pas aux données existantes : ajouts uniquement.
-- L'application stocke actuellement ses données en JSON (server/data/*.json) ;
-- ce script décrit le schéma équivalent pour un backend SQL.

-- 1. Clients persistants -----------------------------------------------------

create table if not exists clients (
  id           uuid primary key default gen_random_uuid(),
  phone        text not null unique,           -- indentifiant de connexion
  first_name   text not null,
  last_name    text not null,
  total_xp     integer not null default 0,
  created_at   timestamptz not null default now()
);

-- Rapprochement interne : chiffre du téléphone saisi au registre pour retrouver
-- un espace existant à la visite suivante (non exposé côté public).
alter table clients add column if not exists claimed_phone text;
create index if not exists clients_claimed_phone_idx on clients (claimed_phone);

-- Refonte session : l'accès client repose sur une session signée (cookie),
-- plus sur un token secret dans l'URL.
alter table clients drop column if exists space_token;

-- 2. Visites (table registrations) ------------------------------------------

alter table registrations add column if not exists client_id uuid references clients(id);
alter table registrations add column if not exists amount_fcfa integer;  -- montant final facturé
alter table registrations add column if not exists xp_earned   integer;  -- rempli uniquement à Terminé

-- 3. Prix des prestations ----------------------------------------------------

alter table services add column if not exists price_fcfa integer not null default 0;

update services set price_fcfa = 2000  where label = 'Coiffure Homme';
update services set price_fcfa = 3000  where label = 'Coiffure Homme avec teinte';
update services set price_fcfa = 1000  where label = 'Coiffure Enfant';
update services set price_fcfa = 2000  where label = 'Coiffure Enfant avec teinte';
update services set price_fcfa = 6500  where label = 'Beauté des mains et pieds';
update services set price_fcfa = 2000  where label = 'Soin paraffine';
update services set price_fcfa = 15000 where label = 'Massage corporel';
update services set price_fcfa = 15000 where label = 'Soin du visage';
update services set price_fcfa = 5000  where label = 'Soin éclat';
update services set price_fcfa = 15000 where label = 'Gommage corporel';
update services set price_fcfa = 1000  where label = 'Arrangement ongle simple';
update services set price_fcfa = 3000  where label = 'Arrangement ongle avec massage';
update services set price_fcfa = 1000  where label = 'Pose vernis mains et pieds';
update services set price_fcfa = 2000  where label = 'Pose capsule + vernis simple';
update services set price_fcfa = 5000  where label = 'Pose capsule + semi-permanent';

-- 4. Catalogue de récompenses ------------------------------------------------

create table if not exists rewards (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text not null default '',
  cost_flowers integer not null check (cost_flowers > 0),
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

-- 5. Échanges ----------------------------------------------------------------

create table if not exists redemptions (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references clients(id),
  reward_id  uuid not null references rewards(id),
  status     text not null default 'pending' check (status in ('pending', 'used', 'cancelled')),
  created_at timestamptz not null default now(),
  used_at    timestamptz
);

create index if not exists redemptions_client_idx on redemptions (client_id);
create index if not exists registrations_client_idx on registrations (client_id);

-- Fleurs disponibles d'un client = floor(total_xp / 10000) - coûts des
-- échanges pending/used. Toujours calculé, jamais stocké en colonne.
