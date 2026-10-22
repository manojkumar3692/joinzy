-- Explicit package scope and the resident's confirmed fit. No seed campaigns are published.
alter table public.service_packages add column service_scope jsonb;
alter table public.deals add column service_scope jsonb;
alter table public.bookings add column scope_details jsonb, add column scope_summary text, add column household_key text;
create unique index one_home_per_scoped_campaign on public.bookings(deal_id,household_key)
 where household_key is not null and status in ('reserved','completed');
create function public.guard_scoped_booking() returns trigger language plpgsql security definer set search_path=public as $$
declare s jsonb; details jsonb; address text;
begin
 select service_scope into s from deals where id=new.deal_id;
 if s is null then return new;end if;
 details=new.scope_details;address=trim(details->>'serviceAddress');
 if new.quantity<>1 or coalesce((details->>'scopeAccepted')::boolean,false)=false or coalesce(length(address),0)<3 then raise exception 'One scoped package, scope confirmation and address required';end if;
 if s->>'kind'='pest' and ((details->>'homeBhk')::integer is distinct from (s->>'bhk')::integer or coalesce((details->>'homeSqft')::numeric,0)<=0 or (details->>'homeSqft')::numeric>(s->>'sqft')::numeric) then raise exception 'Home does not fit BHK and area limits';end if;
 if s->>'kind'='ac' and (coalesce((details->>'acTonnage')::numeric,0)<0.5 or (details->>'acTonnage')::numeric>(s->>'tonnage')::numeric) then raise exception 'AC exceeds package limits';end if;
 if s->>'kind'='laundry-pickup' and (coalesce((details->>'laundryKg')::numeric,0)<=0 or (details->>'laundryKg')::numeric>(s->>'kg')::numeric) then raise exception 'Laundry exceeds bag limit';end if;
 new.scope_summary=s->>'summary';
 if (s->>'householdLimit')::integer=1 then new.household_key=regexp_replace(lower(address),'[^a-z0-9]','','g');end if;
 return new;
end;$$;
create trigger scoped_booking_guard before insert on public.bookings for each row execute function public.guard_scoped_booking();
create function public.book_scoped_service_deposit(p_deal uuid,p_slot uuid,p_resident uuid,p_quantity integer,p_reference text,p_amount integer,p_currency text,p_details jsonb) returns uuid language plpgsql security definer set search_path=public as $$
declare d deals; existing bookings; result uuid;
begin
 if p_quantity is null or p_quantity not between 1 and 10 or p_reference is null then raise exception 'Invalid booking';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_reference,0));
 select * into existing from bookings where payment_reference=p_reference;
 if found then
  if existing.deal_id<>p_deal or existing.slot_id is distinct from p_slot or existing.resident_id<>p_resident or existing.quantity<>p_quantity or existing.deposit_minor<>p_amount or existing.scope_details is distinct from p_details then raise exception 'Idempotency mismatch';end if;
  return existing.id;
 end if;
 select * into d from deals where id=p_deal for update;
 if not found or d.service_scope is null or d.service_category_id is null or d.joined+p_quantity>d.capacity then raise exception 'Unavailable service capacity';end if;
 if not exists(select 1 from memberships where user_id=p_resident and community_id=d.community_id and role='resident') then raise exception 'Resident membership required';end if;
 if p_amount is distinct from d.deposit_minor*p_quantity or p_currency is distinct from (select currency from communities where id=d.community_id) then raise exception 'Payment mismatch';end if;
 insert into bookings(deal_id,slot_id,resident_id,quantity,total_minor,deposit_minor,payment_reference,scope_details) values(d.id,p_slot,p_resident,p_quantity,d.price_minor*p_quantity,p_amount,p_reference,p_details) returning id into result;
 update deals set joined=joined+p_quantity,status=case when joined+p_quantity=capacity then 'full'::deal_status when joined+p_quantity>=minimum then 'confirmed'::deal_status else 'open'::deal_status end where id=d.id;
 insert into audit_events(community_id,actor_id,action,deal_id) values(d.community_id,p_resident,'service_deposit_booked',d.id);return result;
end;$$;
revoke all on function public.book_scoped_service_deposit(uuid,uuid,uuid,integer,text,integer,text,jsonb) from public,anon,authenticated;
grant execute on function public.book_scoped_service_deposit(uuid,uuid,uuid,integer,text,integer,text,jsonb) to service_role;
-- Trusted publication adapter copies service_packages.service_scope to deals.service_scope.
-- Existing offers retain their stored scope when the package template is edited.
