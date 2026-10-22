-- Can also be applied independently for a landing-page-only launch.
create table if not exists public.launch_waitlist (
 id uuid primary key default gen_random_uuid(),
 name text not null check(length(name) between 2 and 100),
 email text not null check(length(email)<=254),
 audience text not null check(audience in ('resident','business')),
 country text not null check(country in ('India','UAE')),
 city text not null check(length(city) between 2 and 100),
 organisation text not null check(length(organisation) between 2 and 160),
 service text not null default '',
 consent boolean not null check(consent),
 status text not null default 'waiting',
 created_at timestamptz not null default now(),
 unique(email,audience,country)
);
alter table public.launch_waitlist enable row level security;
revoke all on public.launch_waitlist from anon,authenticated;
grant all on public.launch_waitlist to service_role;
