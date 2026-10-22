-- Apply after 004. Supabase Auth owns credentials; proof_path references a PRIVATE
-- storage object. The trusted upload adapter must validate file type/size and
-- verify object ownership before submitting the application. No public URLs.
create unique index one_resident_community on public.memberships(user_id) where role='resident';
create table public.resident_applications(
 user_id uuid primary key references public.profiles(id),
 community_id text not null references public.communities(id),
 proof_path text not null,
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 review_note text not null default '',reviewed_by uuid references public.profiles(id),
 created_at timestamptz not null default now(),reviewed_at timestamptz
);
alter table public.resident_applications enable row level security;
create policy application_read on public.resident_applications for select to authenticated
 using(user_id=auth.uid() or public.has_role(community_id,array['admin']));
grant select on public.resident_applications to authenticated;
-- Only a trusted service may submit a validated, privately stored proof.
create function public.submit_resident_application(p_user uuid,p_community text,p_proof_path text)
returns void language plpgsql security definer set search_path=public as $$
declare a resident_applications;
begin
 if length(p_proof_path)<5 then raise exception 'Private proof path required';end if;
 perform 1 from profiles where id=p_user for update;
 if not found then raise exception 'Profile required';end if;
 if exists(select 1 from memberships where user_id=p_user and role='resident') then raise exception 'Resident already belongs to a community';end if;
 select * into a from resident_applications where user_id=p_user for update;
 if found then
  if a.status<>'rejected' or a.community_id<>p_community then raise exception 'Only rejected proof may be resubmitted for the same community';end if;
  update resident_applications set proof_path=p_proof_path,status='pending',review_note='',reviewed_at=null,reviewed_by=null where user_id=p_user;
 else insert into resident_applications(user_id,community_id,proof_path) values(p_user,p_community,p_proof_path);
 end if;
end;$$;
revoke all on function public.submit_resident_application(uuid,text,text) from public,anon,authenticated;
grant execute on function public.submit_resident_application(uuid,text,text) to service_role;
create function public.review_resident_application(p_user uuid,p_approve boolean,p_reason text)
returns void language plpgsql security definer set search_path=public as $$
declare a resident_applications;
begin
 select * into a from resident_applications where user_id=p_user for update;
 if not found or a.status<>'pending' then raise exception 'Pending application required';end if;
 if not public.has_role(a.community_id,array['admin']) then raise exception 'Community administrator required';end if;
 if length(trim(p_reason))<3 then raise exception 'Review reason required';end if;
 if p_approve then insert into memberships(user_id,community_id,role) values(p_user,a.community_id,'resident');end if;
 update resident_applications set status=case when p_approve then 'approved' else 'rejected' end,review_note=p_reason,reviewed_by=auth.uid(),reviewed_at=now() where user_id=p_user;
 insert into audit_events(community_id,actor_id,action) values(a.community_id,auth.uid(),case when p_approve then 'resident_approved' else 'resident_rejected' end);
end;$$;
revoke all on function public.review_resident_application(uuid,boolean,text) from public,anon;
grant execute on function public.review_resident_application(uuid,boolean,text) to authenticated;
-- A reserved booking can be cancelled before completion, including after cutoff.
-- Refunds stay pending until the payment adapter confirms them.
create or replace function public.cancel_booking(p_booking uuid) returns void language plpgsql security definer set search_path=public as $$
declare b bookings; d deals;
begin
 select * into b from bookings where id=p_booking;
 if not found or b.resident_id is distinct from auth.uid() then raise exception 'Booking not found';end if;
 select * into d from deals where id=b.deal_id for update;
 select * into b from bookings where id=p_booking for update;
 if b.status<>'reserved' or d.status not in ('open','confirmed','full','locked') then raise exception 'Not cancellable';end if;
 update bookings set status='refund_pending',payment_status='refund_pending' where id=b.id;
 insert into refund_jobs(booking_id,amount_minor) values(b.id,b.deposit_minor) on conflict(booking_id) do nothing;
 update deals set joined=joined-b.quantity,status=case when d.status='locked' then 'locked'::deal_status when joined-b.quantity>=minimum then 'confirmed'::deal_status else 'open'::deal_status end where id=d.id;
 insert into audit_events(community_id,actor_id,action,deal_id) values(d.community_id,auth.uid(),'booking_cancelled',d.id);
end;$$;
