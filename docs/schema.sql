-- ============================================================
-- CreatorZ — Esquema Supabase com RLS
-- Rode no SQL Editor do Supabase Dashboard
-- ============================================================

-- Extensão para UUIDs
create extension if not exists "uuid-ossp";

-- ──────────────────────────────────────────────────────────
-- PROFILES (extende auth.users)
-- ──────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid references auth.users on delete cascade primary key,
  name        text not null,
  avatar_url  text,
  plan        text not null default 'free' check (plan in ('free', 'pro')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Usuário vê e edita o próprio perfil"
  on public.profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Cria perfil automaticamente após signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ──────────────────────────────────────────────────────────
-- TASKS
-- ──────────────────────────────────────────────────────────
create table if not exists public.tasks (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references auth.users on delete cascade not null,
  title       text not null,
  description text,
  status      text not null default 'todo' check (status in ('todo', 'doing', 'done')),
  priority    text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  due_date    date,
  tags        text[] not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.tasks enable row level security;

create policy "Usuário gerencia as próprias tarefas"
  on public.tasks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────
-- HABITS
-- ──────────────────────────────────────────────────────────
create table if not exists public.habits (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references auth.users on delete cascade not null,
  title       text not null,
  description text,
  frequency   text not null default 'daily' check (frequency in ('daily', 'weekly')),
  color       text not null default '#7c3aed',
  icon        text,
  target_days int not null default 7,
  created_at  timestamptz not null default now()
);

alter table public.habits enable row level security;

create policy "Usuário gerencia os próprios hábitos"
  on public.habits for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────
-- HABIT LOGS
-- ──────────────────────────────────────────────────────────
create table if not exists public.habit_logs (
  id          uuid default uuid_generate_v4() primary key,
  habit_id    uuid references public.habits on delete cascade not null,
  user_id     uuid references auth.users on delete cascade not null,
  date        date not null,
  completed   boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (habit_id, date)
);

alter table public.habit_logs enable row level security;

create policy "Usuário gerencia os próprios logs de hábito"
  on public.habit_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────
-- CHECK-INS EMOCIONAIS (dados sensíveis — RLS rígido)
-- ──────────────────────────────────────────────────────────
create table if not exists public.check_ins (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references auth.users on delete cascade not null,
  date        date not null,
  mood        smallint not null check (mood between 1 and 5),
  energy      smallint not null check (energy between 1 and 5),
  note        text,
  created_at  timestamptz not null default now(),
  unique (user_id, date)
);

alter table public.check_ins enable row level security;

create policy "Usuário vê apenas os próprios check-ins"
  on public.check_ins for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────
-- DIARY ENTRIES (dados sensíveis — RLS rígido)
-- ──────────────────────────────────────────────────────────
create table if not exists public.diary_entries (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references auth.users on delete cascade not null,
  date        date not null,
  content     text not null,
  mood        smallint check (mood between 1 and 5),
  tags        text[] not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.diary_entries enable row level security;

create policy "Usuário vê apenas as próprias entradas do diário"
  on public.diary_entries for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────
-- GOALS
-- ──────────────────────────────────────────────────────────
create table if not exists public.goals (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references auth.users on delete cascade not null,
  title       text not null,
  description text,
  category    text not null check (category in ('pessoal', 'profissional', 'saude', 'financeiro', 'estudo')),
  status      text not null default 'active' check (status in ('active', 'completed', 'paused')),
  progress    numeric not null default 0,
  target      numeric not null,
  unit        text,
  deadline    date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.goals enable row level security;

create policy "Usuário gerencia as próprias metas"
  on public.goals for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────
-- TRANSACTIONS (dados sensíveis — RLS rígido)
-- ──────────────────────────────────────────────────────────
create table if not exists public.transactions (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references auth.users on delete cascade not null,
  title       text not null,
  amount      numeric(12, 2) not null check (amount > 0),
  type        text not null check (type in ('income', 'expense')),
  category    text not null,
  date        date not null default current_date,
  notes       text,
  created_at  timestamptz not null default now()
);

alter table public.transactions enable row level security;

create policy "Usuário vê apenas as próprias transações"
  on public.transactions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────
-- CALENDAR EVENTS
-- ──────────────────────────────────────────────────────────
create table if not exists public.calendar_events (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references auth.users on delete cascade not null,
  title       text not null,
  description text,
  start_date  timestamptz not null,
  end_date    timestamptz,
  all_day     boolean not null default false,
  color       text default '#7c3aed',
  created_at  timestamptz not null default now()
);

alter table public.calendar_events enable row level security;

create policy "Usuário gerencia os próprios eventos"
  on public.calendar_events for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────
-- DAILY ENTRIES
-- ──────────────────────────────────────────────────────────
create table if not exists public.daily_entries (
  id                uuid default uuid_generate_v4() primary key,
  user_id           uuid references auth.users on delete cascade not null,
  date              date not null,
  morning_completed boolean[] not null default '{}',
  evening_completed boolean[] not null default '{}',
  intention         text,
  gratitude         text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (user_id, date)
);

alter table public.daily_entries enable row level security;

create policy "Usuário gerencia as próprias dailies"
  on public.daily_entries for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────
-- Índices para performance
-- ──────────────────────────────────────────────────────────
create index if not exists tasks_user_id_idx on public.tasks (user_id);
create index if not exists tasks_status_idx on public.tasks (user_id, status);
create index if not exists habit_logs_user_date_idx on public.habit_logs (user_id, date);
create index if not exists check_ins_user_date_idx on public.check_ins (user_id, date);
create index if not exists diary_entries_user_date_idx on public.diary_entries (user_id, date desc);
create index if not exists transactions_user_date_idx on public.transactions (user_id, date desc);
create index if not exists calendar_events_user_start_idx on public.calendar_events (user_id, start_date);
