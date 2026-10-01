begin;
alter table public.staff add column if not exists is_admin boolean not null default false;
alter table public.staff add column if not exists deleted_at timestamptz;
alter table public.staff alter column active set default false;
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.staff where id=auth.uid() and active and is_admin and deleted_at is null);
$$;
create or replace function public.is_staff() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.staff where id=auth.uid() and active and deleted_at is null);
$$;
drop policy if exists staff_read on public.staff;
create policy staff_read on public.staff for select to authenticated using(id=auth.uid() or public.is_admin());
create or replace function public.register_staff() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.staff(id,display_name,active,is_admin)
 values(new.id,left(coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'),''),'Yeni personel'),100),false,false)
 on conflict(id) do nothing;
 return new;
end $$;
drop trigger if exists register_staff_after_signup on auth.users;
create trigger register_staff_after_signup after insert on auth.users for each row execute function public.register_staff();
-- Include previously created Auth accounts without granting access.
insert into public.staff(id,display_name,active,is_admin)
select id,left(coalesce(nullif(trim(raw_user_meta_data->>'display_name'),''),'Yeni personel'),100),false,false from auth.users
on conflict(id) do nothing;
create or replace function public.admin_members() returns table(id uuid,display_name text,email text,active boolean,is_admin boolean,email_confirmed boolean)
language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'Yönetici yetkisi gerekli' using errcode='42501'; end if;
 return query select s.id,s.display_name,u.email::text,s.active,s.is_admin,u.email_confirmed_at is not null
 from public.staff s join auth.users u on u.id=s.id where s.deleted_at is null order by s.active,s.display_name,s.id;
end $$;
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
 if p_action='approve' and not exists(select 1 from auth.users where id=p_id and email_confirmed_at is not null) then raise exception 'Önce e-posta doğrulanmalı'; end if;
 update public.staff set active=(p_action='approve'),deleted_at=case when p_action='delete' then now() else null end where id=p_id;
end $$;
revoke all on function public.is_admin(),public.register_staff(),public.admin_members(),public.admin_membership(uuid,text) from public,anon,authenticated;
grant execute on function public.is_admin(),public.admin_members(),public.admin_membership(uuid,text) to authenticated;
commit;
