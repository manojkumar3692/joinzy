-- Run after schema.sql and seed.sql in a fresh Supabase project.
-- Enum additions are committed before use. The local demo does not execute SQL.
begin;
alter type public.deal_status add value if not exists 'draft';
alter type public.deal_status add value if not exists 'scheduled';
alter type public.deal_status add value if not exists 'rejected';
alter type public.deal_status add value if not exists 'withdrawn';
commit;
begin;
create table public.service_categories(id text primary key,name text not null,requires_credential boolean not null default false);
insert into public.service_categories values
('sofa','Sofa cleaning',false),('ac','Standard AC cleaning',false),('appliance','Appliance servicing',false),('salon','Scheduled salon appointments',false),('laundry-pickup','Laundry pickup',false),('handyman','Standard handyman tasks',false),('pest','Pest control',true),('tuition','Tuition batches',false),('car','Car detailing',false),('food','Licensed food orders',true);
create table public.business_profiles(
 id uuid primary key default gen_random_uuid(),owner_id uuid not null unique references public.profiles(id),name text not null,
 tagline text not null default '',description text not null,email text not null,phone text not null,address text not null,
 category_ids text[] not null,community_ids text[] not null,credential_reference text,credential_expires date,
 status text not null default 'pending' check(status in ('pending','verified','rejected')),review_note text,
 created_at timestamptz not null default now()
);
create table public.service_packages(
 id uuid primary key default gen_random_uuid(),provider_id uuid not null references public.business_profiles(id),category_id text not null references public.service_categories(id),
 title text not null,description text not null,inclusions text not null,exclusions text not null,instructions text not null,cancellation_terms text not null,
 unit text not null,duration_minutes integer not null check(duration_minutes between 15 and 480),currency text not null check(currency in ('AED','INR')),
 retail_minor integer not null,price_minor integer not null,deposit_minor integer not null,image_url text,active boolean not null default true,
 check(deposit_minor>0 and deposit_minor<=price_minor and price_minor<=retail_minor)
);
alter table public.deals add column provider_id uuid references public.business_profiles(id),add column service_category_id text references public.service_categories(id),add column package_id uuid references public.service_packages(id),add column booking_opens timestamptz,add column requested_dates date[],add column approved_dates date[],add column package_snapshot jsonb,add column max_per_household integer not null default 2 check(max_per_household between 1 and 10),add column review_note text;
create table public.service_slots(id uuid primary key default gen_random_uuid(),deal_id uuid not null references public.deals(id),service_date date not null,starts_at timestamptz not null,ends_at timestamptz not null,capacity integer not null check(capacity between 1 and 30),check(ends_at>starts_at),unique(deal_id,starts_at));
create table public.service_allocations(id uuid primary key default gen_random_uuid(),deal_id uuid not null references public.deals(id),provider_id uuid not null references public.business_profiles(id),community_id text not null references public.communities(id),category_id text not null references public.service_categories(id),service_date date not null,active boolean not null default true,awarded_at timestamptz not null default now(),awarded_by uuid references public.profiles(id),reason text not null,override_reason text);
-- The final arbiter: even concurrent approvals cannot allocate two providers.
create unique index exclusive_service_day on public.service_allocations(community_id,category_id,service_date) where active;
create index on public.service_allocations(provider_id,category_id,community_id,awarded_at);
alter table public.bookings add column slot_id uuid references public.service_slots(id);
create index on public.bookings(slot_id);
alter table public.business_profiles enable row level security;
alter table public.service_packages enable row level security;
alter table public.service_slots enable row level security;
alter table public.service_allocations enable row level security;
alter table public.service_categories enable row level security;
create policy categories_read on public.service_categories for select to authenticated using(true);
create policy business_read on public.business_profiles for select to authenticated using(owner_id=auth.uid() or exists(select 1 from unnest(community_ids) cid where public.has_role(cid,array['admin'])));
create policy business_insert on public.business_profiles for insert to authenticated with check(owner_id=auth.uid() and status='pending');
create policy business_update on public.business_profiles for update to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());
-- Explicit column grants prevent client verification/status escalation.
revoke all on public.business_profiles from authenticated;
grant select,insert on public.business_profiles to authenticated;
grant update(name,tagline,description,email,phone,address,category_ids,community_ids,credential_reference,credential_expires) on public.business_profiles to authenticated;
create function public.reverify_business() returns trigger language plpgsql set search_path=public as $$
begin
 if row(new.category_ids,new.community_ids,new.credential_reference,new.credential_expires) is distinct from row(old.category_ids,old.community_ids,old.credential_reference,old.credential_expires) then new.status:='pending';end if;return new;
end;$$;
create trigger business_capability_change before update on public.business_profiles for each row execute function public.reverify_business();
create policy packages_owner on public.service_packages for all to authenticated using(exists(select 1 from business_profiles b where b.id=provider_id and b.owner_id=auth.uid())) with check(exists(select 1 from business_profiles b where b.id=provider_id and b.owner_id=auth.uid() and category_id=any(b.category_ids)));
grant select,insert,update on public.service_packages to authenticated;
create policy slots_read on public.service_slots for select to authenticated using(exists(select 1 from deals d where d.id=deal_id));
create policy allocation_read on public.service_allocations for select to authenticated using(public.has_role(community_id,array['resident','business','admin']));
grant select on public.service_slots,public.service_allocations,public.service_categories to authenticated;
drop policy deals_read on public.deals;
create policy deals_read on public.deals for select to authenticated using(public.has_role(community_id,array['admin']) or business_id=auth.uid() or (status in ('scheduled','open','confirmed','full','locked','fulfilled','failed','cancelled') and public.has_role(community_id,array['resident','business'])));
-- Trusted service inserts offer snapshots and slots after validating input/ownership.
-- Block legacy approve RPC and direct client writes from bypassing allocations.
create function public.guard_service_deal() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.service_category_id is not null then
  if new.provider_id is null or new.booking_opens is null or new.booking_opens>=new.deadline or cardinality(new.requested_dates)<1 then raise exception 'Incomplete service schedule';end if;
  if not exists(select 1 from business_profiles b where b.id=new.provider_id and b.owner_id=new.business_id and new.service_category_id=any(b.category_ids) and new.community_id=any(b.community_ids)) then raise exception 'Provider scope mismatch';end if;
  if exists(select 1 from unnest(new.requested_dates) dt where date_trunc('week',dt)::date<>date_trunc('week',new.requested_dates[1])::date) then raise exception 'One calendar week per offer';end if;
  if new.status in ('scheduled','open','confirmed','full','locked','fulfilled') and not exists(select 1 from service_allocations a where a.deal_id=new.id and a.active) then raise exception 'Admin allocation required';end if;
 end if;return new;
end;$$;
create trigger guard_service_deal before insert or update on public.deals for each row execute function public.guard_service_deal();
create function public.release_service_dates() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.status in ('failed','cancelled') then update service_allocations set active=false where deal_id=new.id;end if;return new;
end;$$;
create trigger release_service_dates after update of status on public.deals for each row execute function public.release_service_dates();
create function public.service_rotation(p_community text,p_category text,p_date date) returns table(provider_id uuid,name text,weekly_count bigint,last_award timestamptz) language sql stable security definer set search_path=public as $$
 select b.id,b.name,count(a.id) filter(where date_trunc('week',a.service_date)::date=date_trunc('week',p_date)::date),max(a.awarded_at)
 from business_profiles b left join service_allocations a on a.provider_id=b.id and a.active and a.category_id=p_category and a.community_id=p_community
 where b.status='verified' and p_category=any(b.category_ids) and p_community=any(b.community_ids)
 and (not (select requires_credential from service_categories where id=p_category) or (b.credential_reference is not null and b.credential_expires>=p_date))
 and public.has_role(p_community,array['admin','business'])
 group by b.id order by count(a.id) filter(where date_trunc('week',a.service_date)::date=date_trunc('week',p_date)::date),max(a.awarded_at) nulls first,b.created_at;
$$;
create function public.review_service_offer(p_deal uuid,p_dates date[],p_decision text,p_reason text,p_override text default '') returns void language plpgsql security definer set search_path=public as $$
declare d deals; b business_profiles; dt date; preferred uuid; available integer;
begin
 select * into d from deals where id=p_deal for update;
 if not found or d.status<>'pending' or d.service_category_id is null or not public.has_role(d.community_id,array['admin']) then raise exception 'Pending service offer and admin role required';end if;
 if length(trim(coalesce(p_reason,'')))<5 then raise exception 'Decision reason required';end if;
 if p_decision='reject' then update deals set status='rejected',review_note=p_reason where id=d.id;
 elsif p_decision='approve' then
  select * into b from business_profiles where id=d.provider_id;
  if b.status<>'verified' or not d.community_id=any(b.community_ids) or not d.service_category_id=any(b.category_ids) then raise exception 'Verified eligible provider required';end if;
  if d.deadline<=now() or coalesce(cardinality(p_dates),0)=0 or not p_dates<@d.requested_dates or cardinality(p_dates)<>(select count(distinct x) from unnest(p_dates)x) then raise exception 'Invalid approval dates or expired offer';end if;
  -- Sort lock acquisition for overlapping multi-day approvals; unique index is the backstop.
  for dt in select x from unnest(p_dates)x order by x loop
   perform pg_advisory_xact_lock(hashtextextended(d.community_id||':'||d.service_category_id||':'||dt::text,0));
   if exists(select 1 from service_allocations where community_id=d.community_id and category_id=d.service_category_id and service_date=dt and active) then raise exception 'Service day already allocated';end if;
   if (select requires_credential from service_categories where id=d.service_category_id) and (b.credential_reference is null or b.credential_expires is null or b.credential_expires<dt) then raise exception 'Current service credential required';end if;
   select r.provider_id into preferred from service_rotation(d.community_id,d.service_category_id,dt)r limit 1;
   if preferred is distinct from d.provider_id and length(trim(coalesce(p_override,'')))<10 then raise exception 'Rotation override reason required';end if;
  end loop;
  select coalesce(sum(capacity),0) into available from service_slots where deal_id=d.id and service_date=any(p_dates);
  if available<d.minimum or exists(select 1 from service_slots where deal_id=d.id and service_date=any(p_dates) and starts_at<d.deadline) then raise exception 'Insufficient capacity or invalid booking deadline';end if;
  insert into service_allocations(deal_id,provider_id,community_id,category_id,service_date,awarded_by,reason,override_reason) select d.id,d.provider_id,d.community_id,d.service_category_id,x,auth.uid(),p_reason,p_override from unnest(p_dates)x;
  delete from service_slots where deal_id=d.id and not service_date=any(p_dates);
  update deals set approved_dates=p_dates,capacity=least(capacity,available),review_note=p_reason,status=case when booking_opens>now() then 'scheduled'::deal_status else 'open'::deal_status end where id=d.id;
 else raise exception 'Invalid decision';end if;
 insert into audit_events(community_id,actor_id,action,deal_id) values(d.community_id,auth.uid(),'service_'||p_decision||': '||p_reason,d.id);
end;$$;
-- All booking writers, including legacy RPCs, must supply a valid service slot.
create function public.guard_service_booking() returns trigger language plpgsql security definer set search_path=public as $$
declare d deals; s service_slots; used integer;
begin
 select * into d from deals where id=new.deal_id for update;
 if d.service_category_id is null then return new;end if;
 if d.booking_opens>now() or d.deadline<=now() or d.status not in ('open','confirmed','full') then raise exception 'Booking window closed';end if;
 select * into s from service_slots where id=new.slot_id and deal_id=d.id;
 if not found or s.starts_at<=now() or not s.service_date=any(d.approved_dates) then raise exception 'Approved future slot required';end if;
 select coalesce(sum(quantity),0) into used from bookings where slot_id=s.id and status in ('reserved','completed');
 if used+new.quantity>s.capacity then raise exception 'Slot full';end if;
 select coalesce(sum(quantity),0) into used from bookings where deal_id=d.id and resident_id=new.resident_id and status in ('reserved','completed');
 if used+new.quantity>d.max_per_household then raise exception 'Household limit exceeded';end if;
 return new;
end;$$;
create trigger guard_service_booking before insert on public.bookings for each row execute function public.guard_service_booking();
create function public.book_service_deposit(p_deal uuid,p_slot uuid,p_resident uuid,p_quantity integer,p_reference text,p_amount integer,p_currency text) returns uuid language plpgsql security definer set search_path=public as $$
declare d deals; existing bookings; result uuid;
begin
 if p_quantity is null or p_quantity not between 1 and 10 or p_reference is null then raise exception 'Invalid booking';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_reference,0));
 select * into existing from bookings where payment_reference=p_reference;
 if found then
  if existing.deal_id<>p_deal or existing.slot_id is distinct from p_slot or existing.resident_id<>p_resident or existing.quantity<>p_quantity or existing.deposit_minor<>p_amount then raise exception 'Idempotency mismatch';end if;
  return existing.id;
 end if;
 select * into d from deals where id=p_deal for update;
 if not found or d.service_category_id is null or d.joined+p_quantity>d.capacity then raise exception 'Unavailable service capacity';end if;
 if not exists(select 1 from memberships where user_id=p_resident and community_id=d.community_id and role='resident') then raise exception 'Resident membership required';end if;
 if p_amount is distinct from d.deposit_minor*p_quantity or p_currency is distinct from (select currency from communities where id=d.community_id) then raise exception 'Payment mismatch';end if;
 insert into bookings(deal_id,slot_id,resident_id,quantity,total_minor,deposit_minor,payment_reference) values(d.id,p_slot,p_resident,p_quantity,d.price_minor*p_quantity,p_amount,p_reference) returning id into result;
 update deals set joined=joined+p_quantity,status=case when joined+p_quantity=capacity then 'full'::deal_status when joined+p_quantity>=minimum then 'confirmed'::deal_status else 'open'::deal_status end where id=d.id;
 insert into audit_events(community_id,actor_id,action,deal_id) values(d.community_id,p_resident,'service_deposit_booked',d.id);return result;
end;$$;
create function public.open_scheduled_services() returns integer language plpgsql security definer set search_path=public as $$
declare n integer;
begin update deals set status='open' where status='scheduled' and booking_opens<=now();get diagnostics n=row_count;return n;end;$$;
revoke all on function public.review_service_offer(uuid,date[],text,text,text),public.service_rotation(text,text,date) from public,anon;
grant execute on function public.review_service_offer(uuid,date[],text,text,text),public.service_rotation(text,text,date) to authenticated;
revoke all on function public.book_service_deposit(uuid,uuid,uuid,integer,text,integer,text),public.open_scheduled_services() from public,anon,authenticated;
grant execute on function public.book_service_deposit(uuid,uuid,uuid,integer,text,integer,text),public.open_scheduled_services() to service_role;
commit;
