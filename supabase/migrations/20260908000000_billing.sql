-- Le plan et le compteur d'ajustements. Ecrits uniquement par le serveur
-- (cle service, qui passe outre RLS) : le navigateur lit sa propre ligne et
-- ne peut rien s'accorder. Le plan n'existe que parce que Stripe l'a dit
-- sur app/api/billing/webhook.

create table if not exists public.subscriptions (
  user_id                uuid        primary key references auth.users(id) on delete cascade,
  stripe_customer_id     text,
  stripe_subscription_id text,
  status                 text        not null default 'none',
  plan                   text,
  current_period_end     timestamptz,
  updated_at             timestamptz not null default now()
);
alter table public.subscriptions enable row level security;
create policy "lecture de son propre plan"
  on public.subscriptions for select
  using (auth.uid() = user_id);

create table if not exists public.usage_monthly (
  user_id    uuid        not null references auth.users(id) on delete cascade,
  month      text        not null,
  fits       integer     not null default 0,
  calls      integer     not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, month)
);
alter table public.usage_monthly enable row level security;
create policy "lecture de son propre compteur"
  on public.usage_monthly for select
  using (auth.uid() = user_id);
