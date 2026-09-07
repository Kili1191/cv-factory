-- The table the app syncs to and the four row-level security policies
-- that make the browser's public key safe: without them any visitor could
-- read anyone's CV. This file is the same SQL docs/comptes.md asks to paste
-- in the dashboard, kept here so it is applied by "supabase db push" and
-- reviewed like code instead of retyped. Idempotent on a fresh project.

create table public.user_state (
  user_id    uuid        not null references auth.users(id) on delete cascade,
  key        text        not null,
  value      jsonb       not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table public.user_state enable row level security;

-- Chacun ne voit et ne modifie que ses propres lignes. Sans ces regles,
-- n'importe quel visiteur pourrait lire le CV de n'importe qui : la cle
-- publique du navigateur ne protege rien par elle-meme.
create policy "lecture de ses propres donnees"
  on public.user_state for select
  using (auth.uid() = user_id);

create policy "ecriture de ses propres donnees"
  on public.user_state for insert
  with check (auth.uid() = user_id);

create policy "mise a jour de ses propres donnees"
  on public.user_state for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "suppression de ses propres donnees"
  on public.user_state for delete
  using (auth.uid() = user_id);
