-- GEO · Esquema de base de datos (Supabase)
-- Pegar completo en: Supabase → SQL Editor → New query → Run.
-- Se puede correr más de una vez sin romper nada.

-- Ahorros guardados por cada usuario
create table if not exists public.savings (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  trip_at    timestamptz not null,
  from_place text not null check (char_length(from_place) <= 80),
  to_place   text not null check (char_length(to_place) <= 80),
  mode       text not null check (mode in ('walk', 'bus')),
  amount     numeric(8, 2) not null check (amount >= 0 and amount <= 500),
  kcal       integer not null default 0 check (kcal >= 0 and kcal <= 5000)
);

create index if not exists savings_user_trip_idx on public.savings (user_id, trip_at desc);

-- Seguridad: cada persona solo ve, crea y borra SUS ahorros
alter table public.savings enable row level security;

drop policy if exists "ver mis ahorros" on public.savings;
create policy "ver mis ahorros" on public.savings
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "guardar mis ahorros" on public.savings;
create policy "guardar mis ahorros" on public.savings
  for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists "borrar mis ahorros" on public.savings;
create policy "borrar mis ahorros" on public.savings
  for delete to authenticated using (user_id = (select auth.uid()));

-- Sin política de update a propósito: un ahorro guardado no se edita.
