-- Applied by hand (Neon SQL editor or MCP). Owners are Clerk user ids.

create table if not exists zines (
  id uuid primary key,
  user_id text not null,
  title text not null default 'Untitled zine',
  doc jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists zines_user_updated on zines (user_id, updated_at desc);

-- One row per uploaded image/font. The bytes live in R2 under r2_key.
create table if not exists assets (
  id uuid primary key,
  user_id text not null,
  kind text not null check (kind in ('image', 'font')),
  mime text not null,
  size_bytes integer not null,
  r2_key text not null,
  created_at timestamptz not null default now()
);

create index if not exists assets_user on assets (user_id);
