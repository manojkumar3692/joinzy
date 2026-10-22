-- Apply after 002_business_module.sql. Each food slot qualifies independently.
begin;
alter table public.deals add column campaign_id uuid,add column slot_minimums boolean not null default false,add column fulfillment text check(fulfillment in ('pickup','delivery'));
alter table public.service_slots add column minimum_units integer check(minimum_units>0 and minimum_units<=capacity),add column slot_status text not null default 'open' check(slot_status in ('open','confirmed','full','locked','failed','completed','cancelled'));
create or replace function public.expire_deals() returns integer language plpgsql security definer set search_path=public as $$
declare d deals; b bookings; s service_slots; committed integer; qualified integer; released integer; n integer:=0;
begin
 for d in select * from deals where deadline<=now() and status in ('open','confirmed','full') for update skip locked loop
  if d.slot_minimums then
   qualified:=0;released:=0;
   for s in select * from service_slots where deal_id=d.id for update loop
    if s.minimum_units is null then raise exception 'Food slot minimum is required';end if;
    select coalesce(sum(quantity),0) into committed from bookings where slot_id=s.id and status in ('reserved','completed');
    if committed>=s.minimum_units then
     update service_slots set slot_status='locked' where id=s.id;qualified:=qualified+1;
    else
     update service_slots set slot_status='failed' where id=s.id;
     for b in select * from bookings where slot_id=s.id and status='reserved' for update loop
      insert into refund_jobs(booking_id,amount_minor) values(b.id,b.deposit_minor) on conflict(booking_id) do nothing;
      update bookings set status='refund_pending',payment_status='refund_pending' where id=b.id;
      released:=released+b.quantity;
     end loop;
    end if;
   end loop;
   update deals set joined=joined-released,status=case when qualified>0 then 'locked'::deal_status else 'failed'::deal_status end where id=d.id;
  else
   update deals set status=case when joined>=minimum then 'locked'::deal_status else 'failed'::deal_status end where id=d.id;
   if d.joined<d.minimum then
    for b in select * from bookings where deal_id=d.id and status='reserved' for update loop
     insert into refund_jobs(booking_id,amount_minor) values(b.id,b.deposit_minor) on conflict(booking_id) do nothing;
     update bookings set status='refund_pending',payment_status='refund_pending' where id=b.id;
     update deals set joined=joined-b.quantity where id=d.id;
    end loop;
   end if;
  end if;
  insert into audit_events(community_id,action,deal_id) values(d.community_id,'deadline_closed',d.id);n:=n+1;
 end loop;return n;
end;$$;
-- The trusted offer-creation adapter writes one community-specific deal per
-- campaign, with a shared campaign_id, local-time converted timestamps and
-- explicit minimum_units on every slot. Never pool counts across communities.
-- Admin's early close must set deadline=now() and invoke expire_deals() for food
-- instead of the original transition_deal('close'), which uses a deal minimum.
create or replace function public.guard_food_early_close() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if old.slot_minimums and old.status in ('open','confirmed','full') and new.status in ('locked','failed') then
  if exists(select 1 from service_slots where deal_id=old.id and slot_status not in ('locked','failed')) then raise exception 'Close food slots via expire_deals so each minimum is checked';end if;
 end if;return new;
end;$$;
create trigger guard_food_early_close before update on public.deals for each row execute function public.guard_food_early_close();
commit;
