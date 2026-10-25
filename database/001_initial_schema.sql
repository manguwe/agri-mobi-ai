-- AgriMobi AI initial Supabase/PostgreSQL schema.
-- Run in Supabase SQL Editor after reviewing the project and enabling Auth.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  phone text,
  preferred_language text not null default 'en' check (preferred_language in ('en', 'bem', 'nya', 'toi', 'sn')),
  country_code text check (country_code in ('ZM', 'ZW')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.farms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  country_code text not null check (country_code in ('ZM', 'ZW')),
  province_or_region text,
  district text,
  village_or_area text,
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.knowledge_items (
  id text primary key,
  crop text not null default 'Maize',
  problem_name text not null,
  scientific_name text,
  category text not null,
  description text not null,
  symptoms jsonb not null default '[]'::jsonb,
  verification_signs jsonb not null default '[]'::jsonb,
  recommended_action text not null default '',
  prevention jsonb not null default '[]'::jsonb,
  warning_signs jsonb not null default '[]'::jsonb,
  extension_escalation text not null default '',
  source text,
  source_url text,
  country_relevance text[] not null default array['Zambia','Zimbabwe'],
  mvp_status text not null default 'core' check (mvp_status in ('core', 'extra', 'retired')),
  content_version text not null default '1.1',
  last_verified date,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.diagnoses (
  id uuid primary key default gen_random_uuid(),
  client_record_id text,
  user_id uuid references auth.users(id) on delete set null,
  farm_id uuid references public.farms(id) on delete set null,
  crop text not null default 'maize',
  symptom_description text not null,
  answers jsonb not null default '{}'::jsonb,
  result_status text not null check (result_status in ('possible_problem', 'needs_more_info', 'review_required')),
  predicted_problem_id text references public.knowledge_items(id) on delete set null,
  confidence text not null check (confidence in ('high', 'medium', 'low')),
  candidate_scores jsonb not null default '[]'::jsonb,
  engine_version text not null default 'rules-v1',
  source_mode text not null default 'online' check (source_mode in ('online', 'offline', 'synced')),
  requires_extension_support boolean not null default false,
  extension_feedback text,
  created_at timestamptz not null default now(),
  synced_at timestamptz
);

create table if not exists public.diagnosis_feedback (
  id uuid primary key default gen_random_uuid(),
  diagnosis_id uuid not null references public.diagnoses(id) on delete cascade,
  submitted_by uuid references auth.users(id) on delete set null,
  corrected_problem_id text references public.knowledge_items(id) on delete set null,
  outcome text check (outcome in ('confirmed', 'incorrect', 'uncertain', 'resolved', 'unresolved')),
  notes text,
  reviewer_role text check (reviewer_role in ('farmer', 'extension_worker', 'admin')),
  created_at timestamptz not null default now()
);

create index if not exists farms_owner_idx on public.farms(owner_id);
alter table public.diagnoses add column if not exists client_record_id text;
create unique index if not exists diagnoses_client_record_id_uidx on public.diagnoses(client_record_id);

create index if not exists diagnoses_user_created_idx on public.diagnoses(user_id, created_at desc);
create index if not exists diagnoses_farm_created_idx on public.diagnoses(farm_id, created_at desc);
create index if not exists diagnoses_problem_idx on public.diagnoses(predicted_problem_id);
create index if not exists knowledge_published_crop_idx on public.knowledge_items(published, crop, mvp_status);

alter table public.profiles enable row level security;
alter table public.farms enable row level security;
alter table public.knowledge_items enable row level security;
alter table public.diagnoses enable row level security;
alter table public.diagnosis_feedback enable row level security;

-- A signed-in user can only read/write their own profile and farm records.
drop policy if exists "profile owner select" on public.profiles;
create policy "profile owner select" on public.profiles for select using (auth.uid() = id);
drop policy if exists "profile owner insert" on public.profiles;
create policy "profile owner insert" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "profile owner update" on public.profiles;
create policy "profile owner update" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "farm owner access" on public.farms;
create policy "farm owner access" on public.farms for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- Published knowledge is readable by app users; edits remain service/admin controlled.
drop policy if exists "published knowledge read" on public.knowledge_items;
create policy "published knowledge read" on public.knowledge_items for select using (published = true);

drop policy if exists "diagnosis owner read" on public.diagnoses;
create policy "diagnosis owner read" on public.diagnoses for select using (auth.uid() = user_id);
drop policy if exists "diagnosis owner insert" on public.diagnoses;
create policy "diagnosis owner insert" on public.diagnoses for insert with check (auth.uid() = user_id);
drop policy if exists "diagnosis owner update" on public.diagnoses;
create policy "diagnosis owner update" on public.diagnoses for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "feedback own read" on public.diagnosis_feedback;
create policy "feedback own read" on public.diagnosis_feedback for select using (auth.uid() = submitted_by);
drop policy if exists "feedback own insert" on public.diagnosis_feedback;
create policy "feedback own insert" on public.diagnosis_feedback for insert with check (auth.uid() = submitted_by or submitted_by is null);

-- NOTE: do not expose the Supabase service-role key in the frontend/mobile bundle.
