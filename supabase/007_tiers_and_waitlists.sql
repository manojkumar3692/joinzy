-- Optional price stages. Discounts are percentages off the base group price.
alter table public.deals add column price_tiers jsonb not null default '[]',add column earned_discount numeric not null default 0;
alter table public.service_slots add column earned_discount numeric not null default 0;
alter table public.bookings add column base_unit_price_minor integer,add column tier_discount numeric not null default 0;
create function public.validate_price_stages() returns trigger language plpgsql security definer set search_path=public as $$
declare t jsonb; previous_target integer; previous_discount numeric:=0; ceiling_count integer; v jsonb;
begin
 if tg_op='UPDATE' and old.status not in ('draft','pending','rejected') and new.price_tiers is distinct from old.price_tiers then raise exception 'Published price stages are immutable';end if;
 if jsonb_typeof(new.price_tiers)<>'array' or jsonb_array_length(new.price_tiers)>3 then raise exception 'Use up to three price stages';end if;
 previous_target=new.minimum;ceiling_count=new.capacity;
 if new.slot_minimums then select coalesce(max(minimum_units),0),coalesce(min(capacity),new.capacity) into previous_target,ceiling_count from service_slots where deal_id=new.id;end if;
 for t in select * from jsonb_array_elements(new.price_tiers) loop
  if (t->>'threshold')::numeric is null or (t->>'threshold')::numeric<>trunc((t->>'threshold')::numeric) or (t->>'threshold')::integer<=previous_target or (t->>'threshold')::integer>ceiling_count or (t->>'discount')::numeric is null or (t->>'discount')::numeric<=previous_discount or (t->>'discount')::numeric>60 then raise exception 'Invalid stage thresholds or discounts';end if;
  previous_target=(t->>'threshold')::integer;previous_discount=(t->>'discount')::numeric;
 end loop;
 if round(new.price_minor*(100-previous_discount)/100)<new.deposit_minor then raise exception 'Stage price is below deposit';end if;
 for v in select * from jsonb_array_elements(coalesce(new.vehicle_variants,'[]')) loop
  if round((v->>'price_minor')::numeric*(100-previous_discount)/100)<(v->>'deposit_minor')::integer then raise exception 'Vehicle stage price is below deposit';end if;
 end loop;
 return new;
end;$$;
create trigger validate_price_stages before insert or update of price_tiers,capacity,minimum on public.deals for each row execute function public.validate_price_stages();
create function public.apply_booking_stage() returns trigger language plpgsql security definer set search_path=public as $$
declare d deals; committed integer; earned numeric; unlocked numeric;
begin
 select * into d from deals where id=new.deal_id for update;
 if jsonb_array_length(d.price_tiers)=0 then return new;end if;
 select coalesce(sum(quantity),0)+new.quantity into committed from bookings where deal_id=d.id and (not d.slot_minimums or slot_id=new.slot_id) and status in ('reserved','completed');
 if d.slot_minimums then select earned_discount into earned from service_slots where id=new.slot_id for update;else earned=d.earned_discount;end if;
 select coalesce(max((t->>'discount')::numeric),0) into unlocked from jsonb_array_elements(d.price_tiers) t where (t->>'threshold')::integer<=committed;
 earned=greatest(coalesce(earned,0),unlocked);new.base_unit_price_minor=new.total_minor/new.quantity;new.tier_discount=earned;new.total_minor=round(new.base_unit_price_minor*(100-earned)/100)*new.quantity;
 if d.slot_minimums then update service_slots set earned_discount=earned where id=new.slot_id;else update deals set earned_discount=earned where id=d.id;end if;
 return new;
end;$$;
-- Runs after vehicle and scope validation: each RPC still verifies the base quote/deposit.
create trigger zz_apply_booking_stage before insert on public.bookings for each row execute function public.apply_booking_stage();
create function public.share_booking_stage() returns trigger language plpgsql security definer set search_path=public as $$
declare per_window boolean;
begin
 if new.base_unit_price_minor is null then return new;end if;
 select slot_minimums into per_window from deals where id=new.deal_id;
 update bookings set tier_discount=new.tier_discount,total_minor=round(base_unit_price_minor*(100-new.tier_discount)/100)*quantity
 where deal_id=new.deal_id and status='reserved' and base_unit_price_minor is not null and (not per_window or slot_id=new.slot_id);
 return new;
end;$$;
create trigger share_booking_stage after insert on public.bookings for each row execute function public.share_booking_stage();

create table public.waitlist_requests(
 id uuid primary key default gen_random_uuid(),kind text not null check(kind in ('resident','business')),
 resident_id uuid references public.profiles(id),provider_id uuid references public.business_profiles(id),
 community_id text not null references public.communities(id),category_id text not null references public.service_categories(id),deal_id uuid references public.deals(id),
 name text not null,email text not null,preferred_date date,note text not null default '',consent boolean not null check(consent),
 status text not null default 'waiting' check(status in ('waiting','available','reviewing','invited','closed','withdrawn','converted')),
 review_note text not null default '',created_at timestamptz not null default now()
);
create unique index one_active_waitlist_request on public.waitlist_requests(kind,lower(email),community_id,category_id,coalesce(deal_id,'00000000-0000-0000-0000-000000000000'::uuid)) where status not in ('closed','withdrawn','converted');
alter table public.waitlist_requests enable row level security;
create policy waitlist_read on public.waitlist_requests for select to authenticated using(resident_id=auth.uid() or public.has_role(community_id,array['admin']) or exists(select 1 from business_profiles b where b.id=provider_id and b.owner_id=auth.uid()));
create policy waitlist_admin_update on public.waitlist_requests for update to authenticated using(public.has_role(community_id,array['admin'])) with check(public.has_role(community_id,array['admin']));
grant select on public.waitlist_requests to authenticated;
grant update(status,review_note) on public.waitlist_requests to authenticated;
-- Intake goes through a trusted service: validate consent/contact, profile community,
-- service coverage and duplicate requests. Never grant anonymous table access.
grant select,insert,update on public.waitlist_requests to service_role;
-- A trusted availability worker may mark matching requests available/converted.
-- A waitlist invitation never inserts bookings, payments, memberships or allocations.
