-- After 003. These are database foundations; the running demo uses local state.
begin;
create table public.category_rule_versions(category_id text not null references public.service_categories(id),version integer not null check(version>0),rules jsonb not null,primary key(category_id,version));
insert into public.category_rule_versions values
('food',1,'{"countUnit":"portions","minimumScope":"community_window","priceMode":"per_portion","refundPolicy":"failed_window"}'),
('car',1,'{"countUnit":"cars","minimumScope":"community_window","priceMode":"vehicle_variant","quantity":1,"refundPolicy":"failed_window"}');
alter table public.category_rule_versions enable row level security;
create policy rule_versions_read on public.category_rule_versions for select to authenticated using(true);
grant select on public.category_rule_versions to authenticated;
alter table public.business_profiles add column service_settings jsonb not null default '{}';
alter table public.deals add column rule_snapshot jsonb,add column vehicle_variants jsonb,add column crews integer check(crews between 1 and 20);
alter table public.bookings add column vehicle_type text,add column vehicle_plate text,add column vehicle_key text,add column vehicle_date date,add column parking_location text,add column service_minutes integer;
create unique index one_cleaning_per_vehicle_day on public.bookings(vehicle_key,vehicle_date) where vehicle_key is not null and status in ('reserved','completed');
create function public.guard_car_booking() returns trigger language plpgsql security definer set search_path=public as $$
declare d deals;s service_slots;v jsonb;used integer;
begin
 select * into d from deals where id=new.deal_id for update;
 if d.rule_snapshot->>'key' is distinct from 'car' then return new;end if;
 select value into v from jsonb_array_elements(d.vehicle_variants) where value->>'id'=new.vehicle_type;
 if v is null or new.quantity<>1 then raise exception 'One supported vehicle per booking required';end if;
 if new.vehicle_plate is null or new.vehicle_plate !~ '^[A-Za-z0-9 -]{2,20}$' or length(trim(coalesce(new.parking_location,'')))<3 then raise exception 'Vehicle plate and parking location required';end if;
 if new.total_minor is distinct from (v->>'price_minor')::integer or new.deposit_minor is distinct from (v->>'deposit_minor')::integer then raise exception 'Vehicle payment mismatch';end if;
 select * into s from service_slots where id=new.slot_id and deal_id=d.id;
 if not found or d.crews is null then raise exception 'Car window and crew required';end if;
 new.vehicle_key:=regexp_replace(upper(new.vehicle_plate),'[^A-Z0-9]','','g');new.vehicle_date:=s.service_date;new.service_minutes:=(v->>'minutes')::integer;
 if length(new.vehicle_key)<2 or new.service_minutes is null or new.service_minutes not between 5 and 180 then raise exception 'Invalid vehicle identity or duration';end if;
 select coalesce(sum(service_minutes),0) into used from bookings where slot_id=s.id and status in ('reserved','completed');
 if used+new.service_minutes>extract(epoch from s.ends_at-s.starts_at)/60*d.crews then raise exception 'Crew time exhausted';end if;
 return new;
end;$$;
create trigger guard_car_booking before insert on public.bookings for each row execute function public.guard_car_booking();
-- New payment RPC: existing generic booking RPCs lack vehicle details and are
-- rejected by the trigger for car-rule offers. Call only after verified payment.
create function public.book_car_deposit(p_deal uuid,p_slot uuid,p_resident uuid,p_vehicle_type text,p_plate text,p_parking text,p_reference text,p_amount integer,p_currency text) returns uuid language plpgsql security definer set search_path=public as $$
declare d deals;v jsonb;existing bookings;result uuid;
begin
 if p_reference is null then raise exception 'Payment reference required';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_reference,0));
 select * into existing from bookings where payment_reference=p_reference;
 if found then
  if existing.deal_id<>p_deal or existing.slot_id is distinct from p_slot or existing.resident_id<>p_resident or existing.vehicle_type is distinct from p_vehicle_type or existing.vehicle_key is distinct from regexp_replace(upper(p_plate),'[^A-Z0-9]','','g') or existing.deposit_minor is distinct from p_amount then raise exception 'Idempotency mismatch';end if;return existing.id;
 end if;
 select * into d from deals where id=p_deal for update;
 if not found or d.rule_snapshot->>'key' is distinct from 'car' or d.joined>=d.capacity then raise exception 'Car service unavailable';end if;
 if not exists(select 1 from memberships where user_id=p_resident and community_id=d.community_id and role='resident') then raise exception 'Resident membership required';end if;
 select value into v from jsonb_array_elements(d.vehicle_variants) where value->>'id'=p_vehicle_type;
 if v is null or p_amount is distinct from (v->>'deposit_minor')::integer or p_currency is distinct from (select currency from communities where id=d.community_id) then raise exception 'Payment mismatch';end if;
 insert into bookings(deal_id,slot_id,resident_id,quantity,total_minor,deposit_minor,payment_reference,vehicle_type,vehicle_plate,parking_location) values(d.id,p_slot,p_resident,1,(v->>'price_minor')::integer,p_amount,p_reference,p_vehicle_type,p_plate,p_parking) returning id into result;
 update deals set joined=joined+1,status=case when joined+1=capacity then 'full'::deal_status when joined+1>=minimum then 'confirmed'::deal_status else 'open'::deal_status end where id=d.id;
 insert into audit_events(community_id,actor_id,action,deal_id) values(d.community_id,p_resident,'car_deposit_booked',d.id);return result;
end;$$;
revoke all on function public.book_car_deposit(uuid,uuid,uuid,text,text,text,text,integer,text) from public,anon,authenticated;
grant execute on function public.book_car_deposit(uuid,uuid,uuid,text,text,text,text,integer,text) to service_role;
commit;
