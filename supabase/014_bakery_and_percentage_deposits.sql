-- Bakery campaigns and the revised 10% policy for NEW CLP bookings.
-- Existing booking totals, deposits and refund amounts are preserved. Safe to rerun.
begin;
alter table public.deals add column if not exists bakery_key text unique;
alter table public.deals add column if not exists sale_unit text;
alter table public.bookings add column if not exists bakery_units integer check(bakery_units between 1 and 10);
create or replace function public.guard_service_deal() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.bakery_key is not null then
  if new.community_id<>'osian-chlorophyll' or new.service_category_id<>'food' or new.minimum<>3 or new.capacity<>10 or new.deposit_minor<>round(new.price_minor::numeric/10) or new.slot_minimums or jsonb_array_length(new.price_tiers)>0 or jsonb_array_length(new.quantity_prices)>0 then raise exception 'Invalid bakery campaign contract';end if;
  if not exists(select 1 from business_profiles where id=new.provider_id and owner_id=new.business_id and name='Deepthi''s Delicacy - Home made Cakes & Bakery' and new.community_id=any(community_ids) and 'food'=any(category_ids)) then raise exception 'Bakery vendor scope mismatch';end if;
  if new.status in ('open','scheduled','confirmed','full','locked','fulfilled') and ((select count(*) from service_slots where deal_id=new.id)<>1 or new.booking_opens is null or new.booking_opens>=new.deadline or exists(select 1 from service_slots where deal_id=new.id and starts_at<=new.deadline)) then raise exception 'Bakery requires a pickup window after cutoff';end if;
  return new;
 end if;
 if new.clp_key is not null then
  if new.community_id<>'osian-chlorophyll' or new.service_category_id<>'deep-clean' or new.minimum<>5 or new.capacity<>10 or new.deposit_minor<>round(new.price_minor::numeric/10) or new.slot_minimums then raise exception 'Invalid CLP campaign contract';end if;
  if not exists(select 1 from business_profiles where id=new.provider_id and owner_id=new.business_id and name='CLP Cleaning Service' and new.community_id=any(community_ids) and new.service_category_id=any(category_ids)) then raise exception 'CLP vendor scope mismatch';end if;
  if new.status in ('open','scheduled','confirmed','full','locked','fulfilled') and ((select count(*) from service_slots where deal_id=new.id)<>10 or new.booking_opens is null or new.booking_opens>=new.deadline or exists(select 1 from service_slots where deal_id=new.id and starts_at<=new.deadline)) then raise exception 'CLP requires ten appointments after the booking deadline';end if;
  return new;
 end if;
 if new.service_category_id is not null then
  if new.provider_id is null or new.booking_opens is null or new.booking_opens>=new.deadline or cardinality(new.requested_dates)<1 then raise exception 'Incomplete service schedule';end if;
  if not exists(select 1 from business_profiles b where b.id=new.provider_id and b.owner_id=new.business_id and new.service_category_id=any(b.category_ids) and new.community_id=any(b.community_ids)) then raise exception 'Provider scope mismatch';end if;
  if exists(select 1 from unnest(new.requested_dates) dt where date_trunc('week',dt)::date<>date_trunc('week',new.requested_dates[1])::date) then raise exception 'One calendar week per offer';end if;
  if new.status in ('scheduled','open','confirmed','full','locked','fulfilled') and not exists(select 1 from service_allocations a where a.deal_id=new.id and a.active) then raise exception 'Admin allocation required';end if;
 end if;return new;
end;$$;
create or replace function public.guard_clp_booking() returns trigger language plpgsql security definer set search_path=public as $$
declare d deals;
begin
 select * into d from deals where id=new.deal_id for update;
 if d.clp_key is not null then
  if new.quantity<>1 or new.deposit_minor<>round(d.price_minor::numeric/10) or new.total_minor<>d.price_minor then raise exception 'One CLP appointment with a 10 percent deposit required';end if;
  if not exists(select 1 from business_profiles where id=d.provider_id and status='verified') then raise exception 'Approved CLP provider required';end if;
 end if;return new;
end;$$;
create or replace function public.seed_clp_campaigns(p_owner uuid) returns void language plpgsql security definer set search_path=public as $$
declare provider uuid; item record;
begin
 perform pg_advisory_xact_lock(hashtextextended('clp-osian-seed',0));
 if not exists(select 1 from profiles where id=p_owner) then raise exception 'Provision the real CLP owner profile first';end if;
 select id into provider from business_profiles where owner_id=p_owner;
 if found and (select name from business_profiles where id=provider)<>'CLP Cleaning Service' then raise exception 'Owner belongs to another vendor';end if;
 if not found then
 insert into business_profiles(owner_id,name,description,email,phone,address,category_ids,community_ids)
 values(p_owner,'CLP Cleaning Service','Community cleaning provider; admin review required','','','Chennai',array['deep-clean'],array['osian-chlorophyll']) returning id into provider;
 end if;
 if exists(select 1 from deals where clp_key is not null and provider_id<>provider) then raise exception 'CLP campaigns already belong to another owner';end if;
 for item in select * from (values
 ('1bhk-occupied','1 BHK occupied house',450000,400000),('1bhk-empty','1 BHK empty house',350000,300000),
 ('2bhk-occupied','2 BHK occupied house',550000,500000),('2bhk-empty','2 BHK empty house',450000,400000),
 ('3bhk-occupied','3 BHK occupied house',650000,600000),('3bhk-empty','3 BHK empty house',550000,500000),
 ('bathroom','Per bathroom',70000,50000)) as c(key,title,retail,price) loop
 insert into deals(clp_key,community_id,business_id,provider_id,business_name,title,description,category,service_category_id,retail_minor,price_minor,deposit_minor,minimum,capacity,max_per_household,deadline,pickup)
 values(item.key,'osian-chlorophyll',p_owner,provider,'CLP Cleaning Service',item.title||' deep cleaning','Independent campaign; deposit credited, balance after service','Deep cleaning','deep-clean',item.retail,item.price,round(item.price::numeric/10),5,10,case when item.key='bathroom' then 10 else 1 end,'infinity','At your home in Osian Chlorophyll, Chennai') on conflict(clp_key) do nothing;
 end loop;
end;$$;
update deals set deposit_minor=round(price_minor::numeric/10) where clp_key is not null;
create or replace function public.guard_clp_settlement() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if (new.payment_status='paid' or new.status='completed') and exists(select 1 from deals where id=new.deal_id and (clp_key is not null or bakery_key is not null)) and not exists(select 1 from service_slots where id=new.slot_id and deal_id=new.deal_id and ends_at<=now()) then raise exception 'Complete service or pickup before settling the balance';end if;
 return new;
end;$$;
create or replace function public.seed_deepthi_campaigns(p_owner uuid) returns void language plpgsql security definer set search_path=public as $$
declare provider uuid; item record;
begin
 perform pg_advisory_xact_lock(hashtextextended('deepthi-osian-seed',0));
 if not exists(select 1 from profiles where id=p_owner) then raise exception 'Provision the actual bakery owner profile first';end if;
 select id into provider from business_profiles where owner_id=p_owner;
 if found and (select name from business_profiles where id=provider)<>'Deepthi''s Delicacy - Home made Cakes & Bakery' then raise exception 'Owner belongs to another vendor';end if;
 if not found then
 insert into business_profiles(owner_id,name,description,email,phone,address,category_ids,community_ids)
 values(p_owner,'Deepthi''s Delicacy - Home made Cakes & Bakery','Home made brownies, buns, bomboloni and cookies','','','Chennai',array['food'],array['osian-chlorophyll']) returning id into provider;
 end if;
 if exists(select 1 from deals where bakery_key is not null and provider_id<>provider) then raise exception 'Bakery campaigns belong to another owner';end if;
 for item in select * from (values
 ('brownie','Brownie',9500,'piece','One standard brownie piece.'),
 ('wheat-brownie','Wheat brownie',12000,'piece','One wheat brownie piece.'),
 ('nutella-brownie','Nutella brownie',10500,'piece','One Nutella brownie piece.'),
 ('triple-chocolate-brownie','Triple chocolate brownie',11000,'piece','One triple chocolate brownie piece.'),
 ('biscoff-brownie','Biscoff brownie',10500,'piece','One Biscoff brownie piece.'),
 ('korean-bun','Korean bun',12000,'piece','One Korean bun.'),
 ('bomboloni-chocolate','Bomboloni · chocolate filling',11000,'piece','One chocolate-filled bomboloni.'),
 ('bomboloni-vanilla','Bomboloni · vanilla filling',12000,'piece','One vanilla-filled bomboloni.'),
 ('bomboloni-nutella','Bomboloni · Nutella filling',13000,'piece','One Nutella-filled bomboloni.'),
 ('cookies-250g','Cookies · 250 g',35000,'250 g pack','One 250 g pack of cookies.'),
 ('brownie-250g','Brownie box · 250 g · 4 larger pieces',44000,'250 g box','Four larger brownie pieces in a quarter-kilo box. Larger than the 95 rupee individual brownie; a separate product.')
 ) as c(key,title,price,unit,description) loop
 insert into deals(bakery_key,community_id,business_id,provider_id,business_name,title,description,category,service_category_id,retail_minor,price_minor,deposit_minor,minimum,capacity,max_per_household,deadline,pickup,sale_unit)
 values(item.key,'osian-chlorophyll',p_owner,provider,'Deepthi''s Delicacy - Home made Cakes & Bakery',item.title,item.description,'Bakery','food',item.price,item.price,round(item.price::numeric/10),3,10,10,'infinity','Awaiting pickup confirmation',item.unit) on conflict(bakery_key) do nothing;
 end loop;
end;$$;
revoke all on function public.seed_deepthi_campaigns(uuid) from public,anon,authenticated;
grant execute on function public.seed_deepthi_campaigns(uuid) to service_role;

create or replace function public.schedule_bakery_campaign(p_deal uuid,p_close timestamptz,p_start timestamptz,p_end timestamptz,p_pickup text,p_allergens text,p_reason text) returns void language plpgsql security definer set search_path=public as $$
declare d deals;
begin
 select * into d from deals where id=p_deal for update;
 if not found or d.bakery_key is null or not has_role(d.community_id,array['admin']) then raise exception 'Bakery campaign and admin required';end if;
 if d.status<>'pending' or exists(select 1 from bookings where deal_id=d.id) then raise exception 'Only unbooked pending campaigns can be scheduled';end if;
 if not exists(select 1 from business_profiles where id=d.provider_id and status='verified' and (document_exception or (nullif(credential_reference,'') is not null and credential_expires>=(p_start at time zone 'Asia/Kolkata')::date))) then raise exception 'Approved bakery and credential review required';end if;
 if p_close is null or p_start is null or p_end is null or p_close<=now() or p_close>=p_start or p_start>=p_end or (p_start at time zone 'Asia/Kolkata')::date<>(p_end at time zone 'Asia/Kolkata')::date then raise exception 'Invalid pickup window or booking cutoff';end if;
 if length(trim(coalesce(p_pickup,'')))<5 or length(trim(coalesce(p_allergens,'')))<5 or length(trim(coalesce(p_reason,'')))<5 then raise exception 'Pickup, ingredient/allergen details and decision required';end if;
 delete from service_slots where deal_id=d.id;
 insert into service_slots(deal_id,service_date,starts_at,ends_at,capacity) values(d.id,(p_start at time zone 'Asia/Kolkata')::date,p_start,p_end,10);
 update deals set booking_opens=now(),deadline=p_close,approved_dates=array[(p_start at time zone 'Asia/Kolkata')::date],requested_dates=array[(p_start at time zone 'Asia/Kolkata')::date],status='open',pickup=p_pickup,package_snapshot=jsonb_build_object('allergens',p_allergens,'unit',sale_unit),review_note=p_reason where id=d.id;
 insert into audit_events(community_id,actor_id,action,deal_id) values(d.community_id,auth.uid(),'bakery_schedule: '||p_reason,d.id);
end;$$;
revoke all on function public.schedule_bakery_campaign(uuid,timestamptz,timestamptz,timestamptz,text,text,text) from public,anon;
grant execute on function public.schedule_bakery_campaign(uuid,timestamptz,timestamptz,timestamptz,text,text,text) to authenticated;

-- quantity=1 is one ORDER for lifecycle/capacity accounting; bakery_units stores sale units.
create or replace function public.guard_bakery_booking() returns trigger language plpgsql security definer set search_path=public as $$
declare d deals;
begin
 select * into d from deals where id=new.deal_id for update;
 if d.bakery_key is not null then
  if new.quantity<>1 or new.bakery_units is null or new.bakery_units not between 1 and 10 or new.total_minor is distinct from d.price_minor*new.bakery_units or new.deposit_minor is distinct from round(new.total_minor::numeric/10) then raise exception 'Invalid bakery units, total or 10 percent deposit';end if;
  if not exists(select 1 from business_profiles where id=d.provider_id and status='verified') then raise exception 'Approved bakery required';end if;
 end if;return new;
end;$$;
drop trigger if exists guard_bakery_booking on public.bookings;
create trigger guard_bakery_booking before insert on public.bookings for each row execute function public.guard_bakery_booking();

create or replace function public.book_bakery_deposit(p_deal uuid,p_slot uuid,p_resident uuid,p_units integer,p_reference text,p_amount integer,p_currency text) returns uuid language plpgsql security definer set search_path=public as $$
declare d deals; existing bookings; result uuid; total integer;
begin
 if p_units is null or p_units not between 1 and 10 or nullif(trim(p_reference),'') is null or p_currency is distinct from 'INR' then raise exception 'Invalid bakery order';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_reference,0));
 select * into existing from bookings where payment_reference=p_reference;
 if found then
  if existing.deal_id<>p_deal or existing.slot_id is distinct from p_slot or existing.resident_id<>p_resident or existing.bakery_units is distinct from p_units or existing.deposit_minor is distinct from p_amount then raise exception 'Idempotency mismatch';end if;
  return existing.id;
 end if;
 select * into d from deals where id=p_deal for update;
 if not found or d.bakery_key is null or d.joined>=d.capacity then raise exception 'Unavailable bakery capacity';end if;
 if not exists(select 1 from memberships where user_id=p_resident and community_id=d.community_id and role='resident') then raise exception 'Resident membership required';end if;
 total=d.price_minor*p_units;
 if p_amount is distinct from round(total::numeric/10) then raise exception 'Payment mismatch';end if;
 insert into bookings(deal_id,slot_id,resident_id,quantity,bakery_units,total_minor,deposit_minor,payment_reference) values(d.id,p_slot,p_resident,1,p_units,total,p_amount,p_reference) returning id into result;
 update deals set joined=joined+1,status=case when joined+1=capacity then 'full'::deal_status when joined+1>=minimum then 'confirmed'::deal_status else 'open'::deal_status end where id=d.id;
 insert into audit_events(community_id,actor_id,action,deal_id) values(d.community_id,p_resident,'bakery_deposit_booked',d.id);return result;
end;$$;
revoke all on function public.book_bakery_deposit(uuid,uuid,uuid,integer,text,integer,text) from public,anon,authenticated;
grant execute on function public.book_bakery_deposit(uuid,uuid,uuid,integer,text,integer,text) to service_role;
commit;
-- Provision a real bakery owner profile, then invoke seed_deepthi_campaigns(owner_uuid)
-- using a trusted service role. No owner, credentials, schedule or allergens are invented.
