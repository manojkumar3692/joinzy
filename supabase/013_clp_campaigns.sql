-- Apply after 012. All monetary values are paise. Safe to rerun.
begin;
alter table public.deals add column if not exists clp_key text unique;
insert into public.service_categories(id,name) values('deep-clean','Deep cleaning') on conflict(id) do nothing;
-- Owner must be a real, provisioned profile. No fake auth user or credential is seeded.
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
 values(item.key,'osian-chlorophyll',p_owner,provider,'CLP Cleaning Service',item.title||' deep cleaning','Independent campaign; deposit credited, balance after service','Deep cleaning','deep-clean',item.retail,item.price,9900,5,10,case when item.key='bathroom' then 10 else 1 end,'infinity','At your home in Osian Chlorophyll, Chennai') on conflict(clp_key) do nothing;
 end loop;
end;$$;
revoke all on function public.seed_clp_campaigns(uuid) from public,anon,authenticated;
grant execute on function public.seed_clp_campaigns(uuid) to service_role;
create or replace function public.guard_service_deal() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.clp_key is not null then
  if new.community_id<>'osian-chlorophyll' or new.service_category_id<>'deep-clean' or new.minimum<>5 or new.capacity<>10 or new.deposit_minor<>9900 or new.slot_minimums then raise exception 'Invalid CLP campaign contract';end if;
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
-- Ten explicit appointment timestamps supplied by the admin, with IST offsets.
create or replace function public.schedule_clp_campaign(p_deal uuid,p_close timestamptz,p_slots jsonb,p_reason text) returns void language plpgsql security definer set search_path=public as $$
declare d deals; slot jsonb; start_at timestamptz; end_at timestamptz;
begin
 -- Serialize every schedule for CLP before touching deals to prevent cross-campaign races.
 perform pg_advisory_xact_lock(hashtextextended('clp-osian-schedule',0));
 select * into d from deals where id=p_deal for update;
 if not found or d.clp_key is null or not has_role(d.community_id,array['admin']) then raise exception 'CLP campaign and admin required';end if;
 if d.status<>'pending' or exists(select 1 from bookings where deal_id=d.id) then raise exception 'Only unbooked pending campaigns may be scheduled';end if;
 if not exists(select 1 from business_profiles where id=d.provider_id and status='verified') then raise exception 'Approve CLP first';end if;
 if p_close is null or p_close<=now() or jsonb_array_length(p_slots) is distinct from 10 or length(trim(coalesce(p_reason,'')))<5 then raise exception 'Future closing, ten slots and decision required';end if;
 delete from service_slots where deal_id=d.id;
 for slot in select value from jsonb_array_elements(p_slots) loop
  start_at=(slot->>'start')::timestamptz;end_at=(slot->>'end')::timestamptz;
  if start_at is null or end_at is null or start_at<=p_close or end_at-start_at<interval '15 minutes' or end_at-start_at>interval '8 hours' or (start_at at time zone 'Asia/Kolkata')::date<>(end_at at time zone 'Asia/Kolkata')::date then raise exception 'Invalid appointment duration or deadline';end if;
  if exists(select 1 from service_slots s join deals x on x.id=s.deal_id where x.provider_id=d.provider_id and (x.id=d.id or x.status not in ('pending','draft','failed','cancelled','rejected','withdrawn')) and s.starts_at<end_at and s.ends_at>start_at) then raise exception 'CLP appointment overlap';end if;
  insert into service_slots(deal_id,service_date,starts_at,ends_at,capacity) values(d.id,(start_at at time zone 'Asia/Kolkata')::date,start_at,end_at,1);
 end loop;
 update deals set booking_opens=now(),deadline=p_close,approved_dates=(select array_agg(distinct service_date) from service_slots where deal_id=d.id),requested_dates=(select array_agg(distinct service_date) from service_slots where deal_id=d.id),status='open',review_note=p_reason where id=d.id;
 insert into audit_events(community_id,actor_id,action,deal_id) values(d.community_id,auth.uid(),'clp_schedule: '||p_reason,d.id);
end;$$;
revoke all on function public.schedule_clp_campaign(uuid,timestamptz,jsonb,text) from public,anon;
grant execute on function public.schedule_clp_campaign(uuid,timestamptz,jsonb,text) to authenticated;
create or replace function public.guard_clp_booking() returns trigger language plpgsql security definer set search_path=public as $$
declare d deals;
begin
 select * into d from deals where id=new.deal_id for update;
 if d.clp_key is not null then
  if new.quantity<>1 or new.deposit_minor<>9900 or new.total_minor<>d.price_minor then raise exception 'One CLP appointment with a 99 rupee deposit required';end if;
  if not exists(select 1 from business_profiles where id=d.provider_id and status='verified') then raise exception 'Approved CLP provider required';end if;
 end if;return new;
end;$$;
drop trigger if exists guard_clp_booking on public.bookings;
create trigger guard_clp_booking before insert on public.bookings for each row execute function public.guard_clp_booking();
create or replace function public.guard_clp_settlement() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if (new.payment_status='paid' or new.status='completed') and exists(select 1 from deals where id=new.deal_id and clp_key is not null) and not exists(select 1 from service_slots where id=new.slot_id and deal_id=new.deal_id and ends_at<=now()) then raise exception 'Complete CLP service before settling the balance';end if;
 return new;
end;$$;
drop trigger if exists guard_clp_settlement on public.bookings;
create trigger guard_clp_settlement before update of status,payment_status on public.bookings for each row execute function public.guard_clp_settlement();
commit;
-- After provisioning the actual vendor account, trusted operator runs:
-- select public.seed_clp_campaigns('<real CLP profile UUID>');
-- Never expose this call or payment RPCs to a resident client.
