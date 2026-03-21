-- Dev seed to create real auth users for leaderboard testing.
-- Safe to re-run: inserts only users that do not already exist by email.

with seed_users as (
  select
    gs as seq,
    format('leaderboard_seed_%s@kino.wtf', lpad(gs::text, 3, '0')) as email,
    format('seed_user_%s', lpad(gs::text, 3, '0')) as username
  from generate_series(1, 30) as gs
)
insert into auth.users (
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  is_sso_user,
  is_anonymous
)
select
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  su.email,
  crypt(gen_random_uuid()::text, gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('username', su.username),
  now() - make_interval(mins => (120 + su.seq)::int),
  now(),
  false,
  false
from seed_users su
where not exists (
  select 1
  from auth.users au
  where au.email = su.email
);
