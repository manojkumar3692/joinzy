-- Apply in a new Supabase project's SQL editor. All money is stored in minor units.
begin;
create type public.deal_status as enum ('pending','open','confirmed','full','locked','fulfilled','failed','cancelled');
create table public.communities(id text primary key,name text not null,city text not null,currency text not null check(currency in ('AED','INR')));
create table public.profiles(id uuid primary key references auth.users(id) on delete cascade,display_name text not null);
create table public.memberships(user_id uuid references public.profiles(id),community_id text references public.communities(id),role text not null check(role in ('resident','business','admin')),primary key(user_id,community_id,role));
create table public.deals(
 id uuid primary key default gen_random_uuid(),community_id text not null references public.communities(id),
 business_id uuid references public.profiles(id),business_name text not null,title text not null,description text not null default '',category text not null,
 retail_minor integer not null,price_minor integer not null,deposit_minor integer not null,
 minimum integer not null check(minimum>0),capacity integer not null,joined integer not null default 0,
 status public.deal_status not null default 'pending',deadline timestamptz not null,pickup text not null,
 created_at timestamptz not null default now(),check(deposit_minor>0 and deposit_minor<=price_minor and price_minor<=retail_minor),check(capacity>=minimum and joined>=0 and joined<=capacity)
);
create table public.bookings(
 id uuid primary key default gen_random_uuid(),deal_id uuid not null references public.deals(id),resident_id uuid not null references public.profiles(id),
 quantity integer not null check(quantity between 1 and 10),total_minor integer not null,deposit_minor integer not null,
 status text not null default 'reserved' check(status in ('reserved','refund_pending','refunded','completed')),
 payment_status text not null default 'deposit_paid' check(payment_status in ('deposit_paid','refund_pending','refunded','paid')),
 payment_reference text not null unique,created_at timestamptz not null default now(),check(total_minor>=deposit_minor and deposit_minor>0)
);
create table public.refund_jobs(id uuid primary key default gen_random_uuid(),booking_id uuid not null unique references public.bookings(id),amount_minor integer not null,status text not null default 'pending' check(status in ('pending','completed','failed')),created_at timestamptz not null default now());
create table public.audit_events(id bigint generated always as identity primary key,community_id text references public.communities(id),actor_id uuid,action text not null,deal_id uuid references public.deals(id),created_at timestamptz not null default now());
create index on public.deals(community_id,status,deadline);
create index on public.bookings(deal_id);
create index on public.bookings(resident_id);
create function public.has_role(cid text,roles text[]) returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from memberships where user_id=auth.uid() and community_id=cid and role=any(roles));$$;
alter table public.communities enable row level security;
alter table public.profiles enable row level security;
alter table public.memberships enable row level security;
alter table public.deals enable row level security;
alter table public.bookings enable row level security;
alter table public.refund_jobs enable row level security;
alter table public.audit_events enable row level security;
create policy communities_read on public.communities for select to authenticated using(public.has_role(id,array['resident','business','admin']));
create policy profile_read on public.profiles for select to authenticated using(id=auth.uid());
create policy memberships_read on public.memberships for select to authenticated using(user_id=auth.uid());
create policy deals_read on public.deals for select to authenticated using(public.has_role(community_id,array['admin']) or business_id=auth.uid() or (status<>'pending' and public.has_role(community_id,array['resident','business'])));
create policy deals_submit on public.deals for insert to authenticated with check(public.has_role(community_id,array['business']) and business_id=auth.uid() and status='pending' and joined=0 and deadline>now());
create policy bookings_read on public.bookings for select to authenticated using(resident_id=auth.uid() or exists(select 1 from public.deals d where d.id=deal_id and (d.business_id=auth.uid() or public.has_role(d.community_id,array['admin']))));
create policy audit_read on public.audit_events for select to authenticated using(public.has_role(community_id,array['admin']));
-- No client UPDATE/DELETE policies. Memberships are provisioned by a trusted service.
-- Call only after verifying a provider webhook and its currency/amount/signature.
-- A provider charge rejected for capacity/deadline must be refunded by the payment adapter.
create function public.book_paid_deposit(p_deal uuid,p_resident uuid,p_quantity integer,p_payment_reference text,p_amount integer,p_currency text) returns uuid language plpgsql security definer set search_path=public as $$
declare d deals; b bookings; result uuid;
begin
 if p_quantity not between 1 and 10 or p_quantity is null then raise exception 'Invalid quantity';end if;
 -- Serializes retries even when they target different deals.
 perform pg_advisory_xact_lock(hashtextextended(p_payment_reference,0));
 select * into b from bookings where payment_reference=p_payment_reference;
 if found then
  if b.deal_id<>p_deal or b.resident_id<>p_resident or b.quantity<>p_quantity or b.deposit_minor<>p_amount then raise exception 'Idempotency mismatch';end if;
  return b.id;
 end if;
 select * into d from deals where id=p_deal for update;
 if not found then raise exception 'Deal not found';end if;
 if not exists(select 1 from memberships where user_id=p_resident and community_id=d.community_id and role='resident') then raise exception 'Resident membership required';end if;
 if d.status not in ('open','confirmed','full') or d.deadline<=now() then raise exception 'Booking closed';end if;
 if d.joined+p_quantity>d.capacity then raise exception 'Capacity exceeded';end if;
 if p_amount is distinct from d.deposit_minor*p_quantity or p_currency is distinct from (select currency from communities where id=d.community_id) then raise exception 'Payment mismatch';end if;
 insert into bookings(deal_id,resident_id,quantity,total_minor,deposit_minor,payment_reference) values(d.id,p_resident,p_quantity,d.price_minor*p_quantity,p_amount,p_payment_reference) returning id into result;
 update deals set joined=joined+p_quantity,status=case when joined+p_quantity=capacity then 'full'::deal_status when joined+p_quantity>=minimum then 'confirmed'::deal_status else 'open'::deal_status end where id=d.id;
 insert into audit_events(community_id,actor_id,action,deal_id) values(d.community_id,p_resident,'deposit_booked',d.id);
 return result;
end;$$;
revoke all on function public.book_paid_deposit(uuid,uuid,integer,text,integer,text) from public,anon,authenticated;
grant execute on function public.book_paid_deposit(uuid,uuid,integer,text,integer,text) to service_role;
create function public.cancel_booking(p_booking uuid) returns void language plpgsql security definer set search_path=public as $$
declare b bookings; d deals;
begin
 select * into b from bookings where id=p_booking;
 if not found or b.resident_id is distinct from auth.uid() then raise exception 'Booking not found';end if;
 select * into d from deals where id=b.deal_id for update;
 select * into b from bookings where id=p_booking for update;
 if b.status<>'reserved' then raise exception 'Not cancellable';end if;
 if d.deadline<=now() or d.status not in ('open','confirmed','full') then raise exception 'Cancellation window closed';end if;
 update bookings set status='refund_pending',payment_status='refund_pending' where id=b.id;
 insert into refund_jobs(booking_id,amount_minor) values(b.id,b.deposit_minor);
 update deals set joined=joined-b.quantity,status=case when joined-b.quantity>=minimum then 'confirmed'::deal_status else 'open'::deal_status end where id=d.id;
 insert into audit_events(community_id,actor_id,action,deal_id) values(d.community_id,auth.uid(),'booking_cancelled',d.id);
end;$$;
create function public.transition_deal(p_deal uuid,p_action text) returns void language plpgsql security definer set search_path=public as $$
declare d deals; b bookings;
begin
 select * into d from deals where id=p_deal for update;
 if not found then raise exception 'Deal not found';end if;
 if not public.has_role(d.community_id,array['admin']) then raise exception 'Admin required';end if;
 if p_action='approve' and d.status='pending' and d.deadline>now() then
  update deals set status='open' where id=d.id;
 elsif p_action='close' and d.status in ('open','confirmed','full') then
  update deals set deadline=now(),status=case when joined>=minimum then 'locked'::deal_status else 'failed'::deal_status end where id=d.id returning * into d;
 elsif p_action='cancel' and d.status in ('pending','open','confirmed','full','locked') then
  update deals set status='cancelled' where id=d.id returning * into d;
 else raise exception 'Invalid transition';end if;
 if d.status in ('failed','cancelled') then
  for b in select * from bookings where deal_id=d.id and status='reserved' for update loop
   insert into refund_jobs(booking_id,amount_minor) values(b.id,b.deposit_minor) on conflict(booking_id) do nothing;
   update bookings set status='refund_pending',payment_status='refund_pending' where id=b.id;
   update deals set joined=joined-b.quantity where id=d.id;
  end loop;
 end if;
 insert into audit_events(community_id,actor_id,action,deal_id) values(d.community_id,auth.uid(),p_action,d.id);
end;$$;
-- Scheduled worker uses service_role; run every minute via Supabase Cron.
create function public.expire_deals() returns integer language plpgsql security definer set search_path=public as $$
declare d deals; b bookings; n integer:=0;
begin
 for d in select * from deals where deadline<=now() and status in ('open','confirmed','full') for update skip locked loop
  update deals set status=case when joined>=minimum then 'locked'::deal_status else 'failed'::deal_status end where id=d.id;
  if d.joined<d.minimum then
   for b in select * from bookings where deal_id=d.id and status='reserved' for update loop
    insert into refund_jobs(booking_id,amount_minor) values(b.id,b.deposit_minor) on conflict(booking_id) do nothing;
    update bookings set status='refund_pending',payment_status='refund_pending' where id=b.id;
    update deals set joined=joined-b.quantity where id=d.id;
   end loop;
  end if;
  insert into audit_events(community_id,action,deal_id) values(d.community_id,'deadline_closed',d.id);n:=n+1;
 end loop;return n;
end;$$;
revoke all on function public.expire_deals() from public,anon,authenticated;
grant execute on function public.expire_deals() to service_role;
-- Payment/refund reconciliation and fulfillment are service-only after provider verification.
create function public.finish_refund(p_booking uuid) returns void language plpgsql security definer set search_path=public as $$
begin
 update bookings set status='refunded',payment_status='refunded' where id=p_booking and status='refund_pending';
 update refund_jobs set status='completed' where booking_id=p_booking;
end;$$;
create function public.fulfill_deal(p_deal uuid) returns void language plpgsql security definer set search_path=public as $$
begin
 perform 1 from deals where id=p_deal and status='locked' for update;
 if not found then raise exception 'Deal must be locked';end if;
 if exists(select 1 from bookings where deal_id=p_deal and status='reserved' and payment_status<>'paid') then raise exception 'Outstanding balances';end if;
 update deals set status='fulfilled' where id=p_deal;
 update bookings set status='completed' where deal_id=p_deal and status='reserved';
end;$$;
revoke all on function public.finish_refund(uuid),public.fulfill_deal(uuid) from public,anon,authenticated;
grant execute on function public.finish_refund(uuid),public.fulfill_deal(uuid) to service_role;
revoke all on function public.cancel_booking(uuid),public.transition_deal(uuid,text) from public,anon;
grant execute on function public.cancel_booking(uuid),public.transition_deal(uuid,text) to authenticated;
grant select on public.communities,public.profiles,public.memberships,public.deals,public.bookings,public.audit_events to authenticated;
grant insert on public.deals to authenticated;
commit;
