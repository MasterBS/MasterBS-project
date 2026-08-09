-- sso-login feature: user_settings, favorites
-- 이 앱은 Supabase Auth를 쓰지 않는다 (next-auth가 인증 전담). service role key로만
-- 접근하므로 RLS는 활성화하지 않는다 (모든 접근이 서버 Route Handler를 거친다).

create table if not exists user_settings (
  user_key text primary key,
  fuel_type text not null default 'gasoline',
  brands jsonb not null default '["SKE","GSC","HDO","SOL","ETC"]'::jsonb,
  map_provider text,
  updated_at timestamptz not null default now()
);

create table if not exists favorites (
  id uuid primary key default gen_random_uuid(),
  user_key text not null,
  station_uni_id text not null,
  name text not null,
  brand_label text not null,
  lat double precision not null,
  lng double precision not null,
  price integer not null,
  created_at timestamptz not null default now(),
  unique (user_key, station_uni_id)
);

create index if not exists favorites_user_key_idx on favorites (user_key);
