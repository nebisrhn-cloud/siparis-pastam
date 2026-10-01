begin;
create or replace function public.admin_membership(p_id uuid,p_action text) returns void
language plpgsql security definer set search_path='' as $$
declare member public.staff;
begin
 -- Serialize administration and re-check permissions after taking the lock.
 perform pg_advisory_xact_lock(748392017);
 if not public.is_admin() then raise exception 'Yönetici yetkisi gerekli' using errcode='42501'; end if;
 if p_action not in ('approve','disable','delete') or p_action is null then raise exception 'Geçersiz işlem'; end if;
 select * into member from public.staff where id=p_id and deleted_at is null for update;
 if not found then raise exception 'Üyelik bulunamadı'; end if;
 if member.id=auth.uid() or member.is_admin then raise exception 'Yönetici hesabı bu ekrandan kapatılamaz'; end if;
 update public.staff set active=(p_action='approve'),deleted_at=case when p_action='delete' then now() else null end where id=p_id;
end $$;

create or replace function public.request_membership() returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Giriş yapmanız gerekli' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(748392017);
 -- Only the caller's removed membership can return to pending. Never enable access.
 update public.staff set deleted_at=null,active=false,is_admin=false
 where id=auth.uid() and deleted_at is not null and not is_admin;
 if not exists(select 1 from public.staff where id=auth.uid()) then
  raise exception 'Üyelik bulunamadı. Yöneticiyle görüşün.';
 end if;
end $$;
revoke all on function public.request_membership() from public,anon,authenticated;
grant execute on function public.request_membership() to authenticated;
revoke all on function public.admin_membership(uuid,text) from public,anon;
grant execute on function public.admin_membership(uuid,text) to authenticated;
commit;
