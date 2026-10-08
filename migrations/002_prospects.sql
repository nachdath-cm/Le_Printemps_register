-- Le Printemps — prospects (links + colonnes clients)
-- Migration 002. Ne touche pas aux données existantes : ajouts uniquement.
-- L'application stocke actuellement ses données en JSON (server/data/*.json) ;
-- ce script décrit le schéma équivalent pour un backend SQL.

-- 1. Clients : statut et champs de provenance --------------------------------

alter table clients add column if not exists status text not null default 'client'
  check (status in ('prospect', 'client'));
alter table clients add column if not exists source text;
alter table clients add column if not exists interest_service_id uuid references services(id);
alter table clients add column if not exists consent_contact_at timestamptz;
alter table clients add column if not exists converted_at timestamptz;

-- Toutes les lignes existantes restent 'client' (défaut ci-dessus).

-- 2. Liens de prospection ----------------------------------------------------

create table if not exists prospect_links (
  id         uuid primary key default gen_random_uuid(),
  token      text not null unique,        -- url-safe, aléatoire
  label      text not null,               -- « Affiche vitrine », « Instagram »…
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- Un prospect est un client dont status = 'prospect' ; source = label du lien.
