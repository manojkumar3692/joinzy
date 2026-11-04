-- Standalone runtime schema for the current JOINZY app. Do NOT run historical schema.sql first.
-- JSONB records preserve existing IDs, credentials and campaign snapshots without lossy conversion.
-- Server-only tables: no anonymous/authenticated grants. All mutations use revision checks.
begin;
create table if not exists public.joinzy_metadata (
 singleton boolean primary key default true check(singleton),
 revision bigint not null default 0 check(revision>=0),
 attributes jsonb not null default '{}'::jsonb,
 updated_at timestamptz not null default now()
);
insert into public.joinzy_metadata(singleton) values(true) on conflict do nothing;
alter table public.joinzy_metadata enable row level security;
revoke all on public.joinzy_metadata from public, anon, authenticated;
grant select,update on public.joinzy_metadata to service_role;
create table if not exists public.joinzy_communities (
 record_key text primary key, position integer not null, payload jsonb not null check(jsonb_typeof(payload)='object')
);
alter table public.joinzy_communities enable row level security;
revoke all on public.joinzy_communities from public, anon, authenticated;
grant select,insert,update,delete on public.joinzy_communities to service_role;
create table if not exists public.joinzy_categories (
 record_key text primary key, position integer not null, payload jsonb not null check(jsonb_typeof(payload)='object')
);
alter table public.joinzy_categories enable row level security;
revoke all on public.joinzy_categories from public, anon, authenticated;
grant select,insert,update,delete on public.joinzy_categories to service_role;
create table if not exists public.joinzy_businesses (
 record_key text primary key, position integer not null, payload jsonb not null check(jsonb_typeof(payload)='object')
);
alter table public.joinzy_businesses enable row level security;
revoke all on public.joinzy_businesses from public, anon, authenticated;
grant select,insert,update,delete on public.joinzy_businesses to service_role;
create table if not exists public.joinzy_packages (
 record_key text primary key, position integer not null, payload jsonb not null check(jsonb_typeof(payload)='object')
);
alter table public.joinzy_packages enable row level security;
revoke all on public.joinzy_packages from public, anon, authenticated;
grant select,insert,update,delete on public.joinzy_packages to service_role;
create table if not exists public.joinzy_campaigns (
 record_key text primary key, position integer not null, payload jsonb not null check(jsonb_typeof(payload)='object')
);
alter table public.joinzy_campaigns enable row level security;
revoke all on public.joinzy_campaigns from public, anon, authenticated;
grant select,insert,update,delete on public.joinzy_campaigns to service_role;
create table if not exists public.joinzy_weekly_templates (
 record_key text primary key, position integer not null, payload jsonb not null check(jsonb_typeof(payload)='object')
);
alter table public.joinzy_weekly_templates enable row level security;
revoke all on public.joinzy_weekly_templates from public, anon, authenticated;
grant select,insert,update,delete on public.joinzy_weekly_templates to service_role;
create table if not exists public.joinzy_bookings (
 record_key text primary key, position integer not null, payload jsonb not null check(jsonb_typeof(payload)='object')
);
alter table public.joinzy_bookings enable row level security;
revoke all on public.joinzy_bookings from public, anon, authenticated;
grant select,insert,update,delete on public.joinzy_bookings to service_role;
create table if not exists public.joinzy_residents (
 record_key text primary key, position integer not null, payload jsonb not null check(jsonb_typeof(payload)='object')
);
alter table public.joinzy_residents enable row level security;
revoke all on public.joinzy_residents from public, anon, authenticated;
grant select,insert,update,delete on public.joinzy_residents to service_role;
create table if not exists public.joinzy_resident_sessions (
 record_key text primary key, position integer not null, payload jsonb not null check(jsonb_typeof(payload)='object')
);
alter table public.joinzy_resident_sessions enable row level security;
revoke all on public.joinzy_resident_sessions from public, anon, authenticated;
grant select,insert,update,delete on public.joinzy_resident_sessions to service_role;
create table if not exists public.joinzy_business_accounts (
 record_key text primary key, position integer not null, payload jsonb not null check(jsonb_typeof(payload)='object')
);
alter table public.joinzy_business_accounts enable row level security;
revoke all on public.joinzy_business_accounts from public, anon, authenticated;
grant select,insert,update,delete on public.joinzy_business_accounts to service_role;
create table if not exists public.joinzy_business_sessions (
 record_key text primary key, position integer not null, payload jsonb not null check(jsonb_typeof(payload)='object')
);
alter table public.joinzy_business_sessions enable row level security;
revoke all on public.joinzy_business_sessions from public, anon, authenticated;
grant select,insert,update,delete on public.joinzy_business_sessions to service_role;
create table if not exists public.joinzy_allocations (
 record_key text primary key, position integer not null, payload jsonb not null check(jsonb_typeof(payload)='object')
);
alter table public.joinzy_allocations enable row level security;
revoke all on public.joinzy_allocations from public, anon, authenticated;
grant select,insert,update,delete on public.joinzy_allocations to service_role;
create table if not exists public.joinzy_audit_events (
 record_key text primary key, position integer not null, payload jsonb not null check(jsonb_typeof(payload)='object')
);
alter table public.joinzy_audit_events enable row level security;
revoke all on public.joinzy_audit_events from public, anon, authenticated;
grant select,insert,update,delete on public.joinzy_audit_events to service_role;
create table if not exists public.joinzy_waitlists (
 record_key text primary key, position integer not null, payload jsonb not null check(jsonb_typeof(payload)='object')
);
alter table public.joinzy_waitlists enable row level security;
revoke all on public.joinzy_waitlists from public, anon, authenticated;
grant select,insert,update,delete on public.joinzy_waitlists to service_role;
create table if not exists public.joinzy_society_requests (
 record_key text primary key, position integer not null, payload jsonb not null check(jsonb_typeof(payload)='object')
);
alter table public.joinzy_society_requests enable row level security;
revoke all on public.joinzy_society_requests from public, anon, authenticated;
grant select,insert,update,delete on public.joinzy_society_requests to service_role;
create or replace function public.joinzy_read_state() returns jsonb
language plpgsql stable security invoker set search_path=pg_catalog,public as $$
declare result jsonb; v bigint;
begin
 select attributes,revision into result,v from public.joinzy_metadata where singleton;
 if v=0 then return jsonb_build_object('revision',0,'state',null); end if;
 result=result||jsonb_build_object('communities',(select coalesce(jsonb_agg(payload order by position),'[]'::jsonb) from public.joinzy_communities));
 result=result||jsonb_build_object('categories',(select coalesce(jsonb_agg(payload order by position),'[]'::jsonb) from public.joinzy_categories));
 result=result||jsonb_build_object('businesses',(select coalesce(jsonb_agg(payload order by position),'[]'::jsonb) from public.joinzy_businesses));
 result=result||jsonb_build_object('packages',(select coalesce(jsonb_agg(payload order by position),'[]'::jsonb) from public.joinzy_packages));
 result=result||jsonb_build_object('deals',(select coalesce(jsonb_agg(payload order by position),'[]'::jsonb) from public.joinzy_campaigns));
 result=result||jsonb_build_object('weeklyTemplates',(select coalesce(jsonb_agg(payload order by position),'[]'::jsonb) from public.joinzy_weekly_templates));
 result=result||jsonb_build_object('bookings',(select coalesce(jsonb_agg(payload order by position),'[]'::jsonb) from public.joinzy_bookings));
 result=result||jsonb_build_object('residents',(select coalesce(jsonb_agg(payload order by position),'[]'::jsonb) from public.joinzy_residents));
 result=result||jsonb_build_object('sessions',(select coalesce(jsonb_agg(payload order by position),'[]'::jsonb) from public.joinzy_resident_sessions));
 result=result||jsonb_build_object('businessAccounts',(select coalesce(jsonb_agg(payload order by position),'[]'::jsonb) from public.joinzy_business_accounts));
 result=result||jsonb_build_object('businessSessions',(select coalesce(jsonb_agg(payload order by position),'[]'::jsonb) from public.joinzy_business_sessions));
 result=result||jsonb_build_object('allocations',(select coalesce(jsonb_agg(payload order by position),'[]'::jsonb) from public.joinzy_allocations));
 result=result||jsonb_build_object('audit',(select coalesce(jsonb_agg(payload order by position),'[]'::jsonb) from public.joinzy_audit_events));
 result=result||jsonb_build_object('waitlists',(select coalesce(jsonb_agg(payload order by position),'[]'::jsonb) from public.joinzy_waitlists));
 result=result||jsonb_build_object('launchWaitlists',(select coalesce(jsonb_agg(payload order by position),'[]'::jsonb) from public.joinzy_society_requests));
 return jsonb_build_object('revision',v,'state',result);
end;$$;
create or replace function public.joinzy_commit_state(expected_revision bigint, next_state jsonb) returns boolean
language plpgsql volatile security invoker set search_path=pg_catalog,public as $$
declare v bigint;
begin
 if next_state is null or jsonb_typeof(next_state)<>'object' then raise exception 'Invalid JOINZY state';end if;
 select revision into v from public.joinzy_metadata where singleton for update;
 if expected_revision is null or v<>expected_revision then return false;end if;
 if jsonb_typeof(coalesce(next_state->'communities','[]'::jsonb))<>'array' then raise exception 'Invalid communities collection';end if;
 insert into public.joinzy_communities(record_key,position,payload)
 select coalesce(item->>'id',item->>'tokenHash',item->>'businessId',n::text),n::integer,item
 from jsonb_array_elements(coalesce(next_state->'communities','[]'::jsonb)) with ordinality as x(item,n)
 on conflict(record_key) do update set position=excluded.position,payload=excluded.payload
 where joinzy_communities.payload is distinct from excluded.payload or joinzy_communities.position<>excluded.position;
 delete from public.joinzy_communities where record_key not in (
 select coalesce(item->>'id',item->>'tokenHash',item->>'businessId',n::text)
 from jsonb_array_elements(coalesce(next_state->'communities','[]'::jsonb)) with ordinality as x(item,n));
 if jsonb_typeof(coalesce(next_state->'categories','[]'::jsonb))<>'array' then raise exception 'Invalid categories collection';end if;
 insert into public.joinzy_categories(record_key,position,payload)
 select coalesce(item->>'id',item->>'tokenHash',item->>'businessId',n::text),n::integer,item
 from jsonb_array_elements(coalesce(next_state->'categories','[]'::jsonb)) with ordinality as x(item,n)
 on conflict(record_key) do update set position=excluded.position,payload=excluded.payload
 where joinzy_categories.payload is distinct from excluded.payload or joinzy_categories.position<>excluded.position;
 delete from public.joinzy_categories where record_key not in (
 select coalesce(item->>'id',item->>'tokenHash',item->>'businessId',n::text)
 from jsonb_array_elements(coalesce(next_state->'categories','[]'::jsonb)) with ordinality as x(item,n));
 if jsonb_typeof(coalesce(next_state->'businesses','[]'::jsonb))<>'array' then raise exception 'Invalid businesses collection';end if;
 insert into public.joinzy_businesses(record_key,position,payload)
 select coalesce(item->>'id',item->>'tokenHash',item->>'businessId',n::text),n::integer,item
 from jsonb_array_elements(coalesce(next_state->'businesses','[]'::jsonb)) with ordinality as x(item,n)
 on conflict(record_key) do update set position=excluded.position,payload=excluded.payload
 where joinzy_businesses.payload is distinct from excluded.payload or joinzy_businesses.position<>excluded.position;
 delete from public.joinzy_businesses where record_key not in (
 select coalesce(item->>'id',item->>'tokenHash',item->>'businessId',n::text)
 from jsonb_array_elements(coalesce(next_state->'businesses','[]'::jsonb)) with ordinality as x(item,n));
 if jsonb_typeof(coalesce(next_state->'packages','[]'::jsonb))<>'array' then raise exception 'Invalid packages collection';end if;
 insert into public.joinzy_packages(record_key,position,payload)
 select coalesce(item->>'id',item->>'tokenHash',item->>'businessId',n::text),n::integer,item
 from jsonb_array_elements(coalesce(next_state->'packages','[]'::jsonb)) with ordinality as x(item,n)
 on conflict(record_key) do update set position=excluded.position,payload=excluded.payload
 where joinzy_packages.payload is distinct from excluded.payload or joinzy_packages.position<>excluded.position;
 delete from public.joinzy_packages where record_key not in (
 select coalesce(item->>'id',item->>'tokenHash',item->>'businessId',n::text)
 from jsonb_array_elements(coalesce(next_state->'packages','[]'::jsonb)) with ordinality as x(item,n));
 if jsonb_typeof(coalesce(next_state->'deals','[]'::jsonb))<>'array' then raise exception 'Invalid deals collection';end if;
 insert into public.joinzy_campaigns(record_key,position,payload)
 select coalesce(item->>'id',item->>'tokenHash',item->>'businessId',n::text),n::integer,item
 from jsonb_array_elements(coalesce(next_state->'deals','[]'::jsonb)) with ordinality as x(item,n)
 on conflict(record_key) do update set position=excluded.position,payload=excluded.payload
 where joinzy_campaigns.payload is distinct from excluded.payload or joinzy_campaigns.position<>excluded.position;
 delete from public.joinzy_campaigns where record_key not in (
 select coalesce(item->>'id',item->>'tokenHash',item->>'businessId',n::text)
 from jsonb_array_elements(coalesce(next_state->'deals','[]'::jsonb)) with ordinality as x(item,n));
 if jsonb_typeof(coalesce(next_state->'weeklyTemplates','[]'::jsonb))<>'array' then raise exception 'Invalid weeklyTemplates collection';end if;
 insert into public.joinzy_weekly_templates(record_key,position,payload)
 select coalesce(item->>'id',item->>'tokenHash',item->>'businessId',n::text),n::integer,item
 from jsonb_array_elements(coalesce(next_state->'weeklyTemplates','[]'::jsonb)) with ordinality as x(item,n)
 on conflict(record_key) do update set position=excluded.position,payload=excluded.payload
 where joinzy_weekly_templates.payload is distinct from excluded.payload or joinzy_weekly_templates.position<>excluded.position;
 delete from public.joinzy_weekly_templates where record_key not in (
 select coalesce(item->>'id',item->>'tokenHash',item->>'businessId',n::text)
 from jsonb_array_elements(coalesce(next_state->'weeklyTemplates','[]'::jsonb)) with ordinality as x(item,n));
 if jsonb_typeof(coalesce(next_state->'bookings','[]'::jsonb))<>'array' then raise exception 'Invalid bookings collection';end if;
 insert into public.joinzy_bookings(record_key,position,payload)
 select coalesce(item->>'id',item->>'tokenHash',item->>'businessId',n::text),n::integer,item
 from jsonb_array_elements(coalesce(next_state->'bookings','[]'::jsonb)) with ordinality as x(item,n)
 on conflict(record_key) do update set position=excluded.position,payload=excluded.payload
 where joinzy_bookings.payload is distinct from excluded.payload or joinzy_bookings.position<>excluded.position;
 delete from public.joinzy_bookings where record_key not in (
 select coalesce(item->>'id',item->>'tokenHash',item->>'businessId',n::text)
 from jsonb_array_elements(coalesce(next_state->'bookings','[]'::jsonb)) with ordinality as x(item,n));
 if jsonb_typeof(coalesce(next_state->'residents','[]'::jsonb))<>'array' then raise exception 'Invalid residents collection';end if;
 insert into public.joinzy_residents(record_key,position,payload)
 select coalesce(item->>'id',item->>'tokenHash',item->>'businessId',n::text),n::integer,item
 from jsonb_array_elements(coalesce(next_state->'residents','[]'::jsonb)) with ordinality as x(item,n)
 on conflict(record_key) do update set position=excluded.position,payload=excluded.payload
 where joinzy_residents.payload is distinct from excluded.payload or joinzy_residents.position<>excluded.position;
 delete from public.joinzy_residents where record_key not in (
 select coalesce(item->>'id',item->>'tokenHash',item->>'businessId',n::text)
 from jsonb_array_elements(coalesce(next_state->'residents','[]'::jsonb)) with ordinality as x(item,n));
 if jsonb_typeof(coalesce(next_state->'sessions','[]'::jsonb))<>'array' then raise exception 'Invalid sessions collection';end if;
 insert into public.joinzy_resident_sessions(record_key,position,payload)
 select coalesce(item->>'id',item->>'tokenHash',item->>'businessId',n::text),n::integer,item
 from jsonb_array_elements(coalesce(next_state->'sessions','[]'::jsonb)) with ordinality as x(item,n)
 on conflict(record_key) do update set position=excluded.position,payload=excluded.payload
 where joinzy_resident_sessions.payload is distinct from excluded.payload or joinzy_resident_sessions.position<>excluded.position;
 delete from public.joinzy_resident_sessions where record_key not in (
 select coalesce(item->>'id',item->>'tokenHash',item->>'businessId',n::text)
 from jsonb_array_elements(coalesce(next_state->'sessions','[]'::jsonb)) with ordinality as x(item,n));
 if jsonb_typeof(coalesce(next_state->'businessAccounts','[]'::jsonb))<>'array' then raise exception 'Invalid businessAccounts collection';end if;
 insert into public.joinzy_business_accounts(record_key,position,payload)
 select coalesce(item->>'id',item->>'tokenHash',item->>'businessId',n::text),n::integer,item
 from jsonb_array_elements(coalesce(next_state->'businessAccounts','[]'::jsonb)) with ordinality as x(item,n)
 on conflict(record_key) do update set position=excluded.position,payload=excluded.payload
 where joinzy_business_accounts.payload is distinct from excluded.payload or joinzy_business_accounts.position<>excluded.position;
 delete from public.joinzy_business_accounts where record_key not in (
 select coalesce(item->>'id',item->>'tokenHash',item->>'businessId',n::text)
 from jsonb_array_elements(coalesce(next_state->'businessAccounts','[]'::jsonb)) with ordinality as x(item,n));
 if jsonb_typeof(coalesce(next_state->'businessSessions','[]'::jsonb))<>'array' then raise exception 'Invalid businessSessions collection';end if;
 insert into public.joinzy_business_sessions(record_key,position,payload)
 select coalesce(item->>'id',item->>'tokenHash',item->>'businessId',n::text),n::integer,item
 from jsonb_array_elements(coalesce(next_state->'businessSessions','[]'::jsonb)) with ordinality as x(item,n)
 on conflict(record_key) do update set position=excluded.position,payload=excluded.payload
 where joinzy_business_sessions.payload is distinct from excluded.payload or joinzy_business_sessions.position<>excluded.position;
 delete from public.joinzy_business_sessions where record_key not in (
 select coalesce(item->>'id',item->>'tokenHash',item->>'businessId',n::text)
 from jsonb_array_elements(coalesce(next_state->'businessSessions','[]'::jsonb)) with ordinality as x(item,n));
 if jsonb_typeof(coalesce(next_state->'allocations','[]'::jsonb))<>'array' then raise exception 'Invalid allocations collection';end if;
 insert into public.joinzy_allocations(record_key,position,payload)
 select coalesce(item->>'id',item->>'tokenHash',item->>'businessId',n::text),n::integer,item
 from jsonb_array_elements(coalesce(next_state->'allocations','[]'::jsonb)) with ordinality as x(item,n)
 on conflict(record_key) do update set position=excluded.position,payload=excluded.payload
 where joinzy_allocations.payload is distinct from excluded.payload or joinzy_allocations.position<>excluded.position;
 delete from public.joinzy_allocations where record_key not in (
 select coalesce(item->>'id',item->>'tokenHash',item->>'businessId',n::text)
 from jsonb_array_elements(coalesce(next_state->'allocations','[]'::jsonb)) with ordinality as x(item,n));
 if jsonb_typeof(coalesce(next_state->'audit','[]'::jsonb))<>'array' then raise exception 'Invalid audit collection';end if;
 insert into public.joinzy_audit_events(record_key,position,payload)
 select coalesce(item->>'id',item->>'tokenHash',item->>'businessId',n::text),n::integer,item
 from jsonb_array_elements(coalesce(next_state->'audit','[]'::jsonb)) with ordinality as x(item,n)
 on conflict(record_key) do update set position=excluded.position,payload=excluded.payload
 where joinzy_audit_events.payload is distinct from excluded.payload or joinzy_audit_events.position<>excluded.position;
 delete from public.joinzy_audit_events where record_key not in (
 select coalesce(item->>'id',item->>'tokenHash',item->>'businessId',n::text)
 from jsonb_array_elements(coalesce(next_state->'audit','[]'::jsonb)) with ordinality as x(item,n));
 if jsonb_typeof(coalesce(next_state->'waitlists','[]'::jsonb))<>'array' then raise exception 'Invalid waitlists collection';end if;
 insert into public.joinzy_waitlists(record_key,position,payload)
 select coalesce(item->>'id',item->>'tokenHash',item->>'businessId',n::text),n::integer,item
 from jsonb_array_elements(coalesce(next_state->'waitlists','[]'::jsonb)) with ordinality as x(item,n)
 on conflict(record_key) do update set position=excluded.position,payload=excluded.payload
 where joinzy_waitlists.payload is distinct from excluded.payload or joinzy_waitlists.position<>excluded.position;
 delete from public.joinzy_waitlists where record_key not in (
 select coalesce(item->>'id',item->>'tokenHash',item->>'businessId',n::text)
 from jsonb_array_elements(coalesce(next_state->'waitlists','[]'::jsonb)) with ordinality as x(item,n));
 if jsonb_typeof(coalesce(next_state->'launchWaitlists','[]'::jsonb))<>'array' then raise exception 'Invalid launchWaitlists collection';end if;
 insert into public.joinzy_society_requests(record_key,position,payload)
 select coalesce(item->>'id',item->>'tokenHash',item->>'businessId',n::text),n::integer,item
 from jsonb_array_elements(coalesce(next_state->'launchWaitlists','[]'::jsonb)) with ordinality as x(item,n)
 on conflict(record_key) do update set position=excluded.position,payload=excluded.payload
 where joinzy_society_requests.payload is distinct from excluded.payload or joinzy_society_requests.position<>excluded.position;
 delete from public.joinzy_society_requests where record_key not in (
 select coalesce(item->>'id',item->>'tokenHash',item->>'businessId',n::text)
 from jsonb_array_elements(coalesce(next_state->'launchWaitlists','[]'::jsonb)) with ordinality as x(item,n));
 update public.joinzy_metadata set revision=v+1,attributes=next_state-array['communities','categories','businesses','packages','deals','weeklyTemplates','bookings','residents','sessions','businessAccounts','businessSessions','allocations','audit','waitlists','launchWaitlists']::text[],updated_at=now() where singleton;
 return true;
end;$$;
revoke all on function public.joinzy_read_state() from public,anon,authenticated;
revoke all on function public.joinzy_commit_state(bigint,jsonb) from public,anon,authenticated;
grant execute on function public.joinzy_read_state() to service_role;
grant execute on function public.joinzy_commit_state(bigint,jsonb) to service_role;
notify pgrst,'reload schema';
commit;
