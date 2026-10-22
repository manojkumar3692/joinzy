begin;
alter table public.deals add column quantity_prices jsonb not null default '[]';
create function public.validate_quantity_prices() returns trigger language plpgsql security definer set search_path=public as $$
declare t jsonb; last_min integer:=1; last_price integer; discount numeric; limit_quantity integer;
begin
 if tg_op='UPDATE' and old.status not in ('draft','pending','rejected') and new.quantity_prices is distinct from old.quantity_prices then raise exception 'Published bulk prices are immutable';end if;
 if jsonb_typeof(new.quantity_prices)<>'array' or jsonb_array_length(new.quantity_prices)>3 then raise exception 'Use up to three bulk prices';end if;
 if jsonb_array_length(new.quantity_prices)>0 and new.service_category_id is distinct from 'food' then raise exception 'Bulk pricing is for food portions';end if;
 last_price=new.price_minor;select coalesce(max((x->>'discount')::numeric),0) into discount from jsonb_array_elements(new.price_tiers) x;
 select least(10,coalesce(min(capacity),new.capacity)) into limit_quantity from service_slots where deal_id=new.id;
 for t in select * from jsonb_array_elements(new.quantity_prices) loop
  if (t->>'minimum')::numeric is null or (t->>'minimum')::numeric<>trunc((t->>'minimum')::numeric) or (t->>'minimum')::integer<=last_min or (t->>'minimum')::integer>limit_quantity then raise exception 'Invalid bulk quantity';end if;
  if (t->>'unit_price_minor')::numeric is null or (t->>'unit_price_minor')::numeric<>trunc((t->>'unit_price_minor')::numeric) or (t->>'unit_price_minor')::integer<=0 or (t->>'unit_price_minor')::integer>=last_price then raise exception 'Bulk prices must decrease';end if;
  last_min=(t->>'minimum')::integer;last_price=(t->>'unit_price_minor')::integer;
  if round(last_price*(100-discount)/100)<new.deposit_minor then raise exception 'Combined bulk and stage price is below deposit';end if;
 end loop;return new;
end;$$;
create trigger validate_quantity_prices before insert or update of quantity_prices,price_tiers,price_minor,deposit_minor,capacity on public.deals for each row execute function public.validate_quantity_prices();
create or replace function public.apply_booking_stage() returns trigger language plpgsql security definer set search_path=public as $$
declare d deals; committed integer; earned numeric; unlocked numeric; bulk_price integer;
begin
 select * into d from deals where id=new.deal_id for update;
 if jsonb_array_length(d.price_tiers)=0 and jsonb_array_length(d.quantity_prices)=0 then return new;end if;
 select coalesce(sum(quantity),0)+new.quantity into committed from bookings where deal_id=d.id and (not d.slot_minimums or slot_id=new.slot_id) and status in ('reserved','completed');
 if d.slot_minimums then select earned_discount into earned from service_slots where id=new.slot_id for update;else earned=d.earned_discount;end if;
 select coalesce(max((t->>'discount')::numeric),0) into unlocked from jsonb_array_elements(d.price_tiers) t where (t->>'threshold')::integer<=committed;
 select (t->>'unit_price_minor')::integer into bulk_price from jsonb_array_elements(d.quantity_prices) t where (t->>'minimum')::integer<=new.quantity order by (t->>'minimum')::integer desc limit 1;
 earned=greatest(coalesce(earned,0),unlocked);new.base_unit_price_minor=coalesce(bulk_price,new.total_minor/new.quantity);new.tier_discount=earned;new.total_minor=round(new.base_unit_price_minor*(100-earned)/100)*new.quantity;
 if new.total_minor<new.deposit_minor then raise exception 'Final price below deposit';end if;
 if d.slot_minimums then update service_slots set earned_discount=earned where id=new.slot_id;else update deals set earned_discount=earned where id=d.id;end if;
 return new;
end;$$;
commit;
