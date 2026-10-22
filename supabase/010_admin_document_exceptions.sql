begin;
alter table public.business_profiles drop constraint business_profiles_status_check;
alter table public.business_profiles add constraint business_profiles_status_check check(status in ('pending','verified','rejected','blocked'));
alter table public.business_profiles add column document_exception boolean not null default false,add column document_exception_reason text not null default '',add column block_reason text not null default '';
create or replace function public.reverify_business() returns trigger language plpgsql set search_path=public as $$
begin
 if row(new.category_ids,new.community_ids,new.credential_reference,new.credential_expires) is distinct from row(old.category_ids,old.community_ids,old.credential_reference,old.credential_expires) then if old.status<>'blocked' then new.status:='pending';end if;new.document_exception=false;new.document_exception_reason='';end if;return new;
end;$$;
create or replace function public.service_rotation(p_community text,p_category text,p_date date) returns table(provider_id uuid,name text,weekly_count bigint,last_award timestamptz) language sql stable security definer set search_path=public as $$
 select b.id,b.name,count(a.id) filter(where date_trunc('week',a.service_date)::date=date_trunc('week',p_date)::date),max(a.awarded_at)
 from business_profiles b left join service_allocations a on a.provider_id=b.id and a.active and a.category_id=p_category and a.community_id=p_community
 where b.status='verified' and p_category=any(b.category_ids) and p_community=any(b.community_ids)
 and (not (select requires_credential from service_categories where id=p_category) or b.document_exception or (b.credential_reference is not null and b.credential_expires>=p_date))
 and public.has_role(p_community,array['admin','business'])
 group by b.id order by count(a.id) filter(where date_trunc('week',a.service_date)::date=date_trunc('week',p_date)::date),max(a.awarded_at) nulls first,b.created_at;
$$;
create or replace function public.review_service_offer(p_deal uuid,p_dates date[],p_decision text,p_reason text,p_override text default '') returns void language plpgsql security definer set search_path=public as $$
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
   if not b.document_exception and (select requires_credential from service_categories where id=d.service_category_id) and (b.credential_reference is null or b.credential_expires is null or b.credential_expires<dt) then raise exception 'Current service credential required';end if;
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
create function public.review_business_profile(p_business uuid,p_status text,p_reason text,p_exception boolean default false) returns void language plpgsql security definer set search_path=public as $$
declare b business_profiles;
begin
 select * into b from business_profiles where id=p_business for update;
 if not found or not exists(select 1 from unnest(b.community_ids) cid where public.has_role(cid,array['admin'])) then raise exception 'Business and admin role required';end if;
 if p_status not in ('pending','verified','rejected','blocked') or length(trim(coalesce(p_reason,'')))<5 then raise exception 'Decision and reason required';end if;
 if p_status='verified' and not p_exception and (nullif(trim(b.credential_reference),'') is null or b.credential_expires is null or b.credential_expires<current_date) then raise exception 'Current credential or explicit document exception required';end if;
 update business_profiles set status=p_status,review_note=trim(p_reason),document_exception=(p_status='verified' and p_exception),document_exception_reason=case when p_status='verified' and p_exception then trim(p_reason) else '' end,block_reason=case when p_status='blocked' then trim(p_reason) else '' end where id=b.id;
 insert into audit_events(community_id,actor_id,action) values(b.community_ids[1],auth.uid(),'business_'||p_status||case when p_exception then '_document_exception' else '' end||': '||p_reason);
end;$$;
revoke all on function public.review_business_profile(uuid,text,text,boolean) from public,anon;
grant execute on function public.review_business_profile(uuid,text,text,boolean) to authenticated;
create function public.block_new_provider_bookings() returns trigger language plpgsql security definer set search_path=public as $$
declare blocked boolean;
begin
 select b.status='blocked' into blocked from business_profiles b join deals d on d.provider_id=b.id where d.id=new.deal_id for share of b;
 if blocked then raise exception 'Business blocked: new bookings paused';end if;return new;
end;$$;
create trigger block_new_provider_bookings before insert on public.bookings for each row execute function public.block_new_provider_bookings();
create function public.block_new_provider_offers() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if exists(select 1 from business_profiles where id=new.provider_id and status='blocked') then raise exception 'Business blocked: new offers paused';end if;return new;
end;$$;
create trigger block_new_provider_offers before insert on public.deals for each row execute function public.block_new_provider_offers();
commit;
