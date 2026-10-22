-- Plan selections are not paid subscriptions. Only a trusted billing adapter may activate them.
begin;
create table public.business_subscriptions (
 provider_id uuid primary key references public.business_profiles(id) on delete cascade,
 country text not null check(country in ('UAE','India')),
 currency text not null check(currency in ('AED','INR')),
 amount_minor integer not null,
 billing_interval text not null default 'month' check(billing_interval='month'),
 status text not null default 'pending_payment' check(status in ('pending_payment','active','past_due','cancelled')),
 accepted_at timestamptz not null default now(),
 payment_provider_reference text,
 check((country='UAE' and currency='AED' and amount_minor=9900) or (country='India' and currency='INR' and amount_minor=49900))
);
alter table public.business_subscriptions enable row level security;
create policy subscription_owner_read on public.business_subscriptions for select to authenticated using(exists(select 1 from public.business_profiles b where b.id=provider_id and (b.owner_id=auth.uid() or exists(select 1 from unnest(b.community_ids) cid where public.has_role(cid,array['admin'])))));
-- No client mutation policies: authenticated signup adapter validates coverage and writes pending_payment.
-- Verified payment webhooks update status; they must never grant business verification or service allocations.
grant select on public.business_subscriptions to authenticated;
grant all on public.business_subscriptions to service_role;
commit;
