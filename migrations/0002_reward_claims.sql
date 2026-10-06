create table if not exists reward_claims (
  image_id text primary key,
  claimed_at timestamptz not null default now()
);
