-- Existing orders remain intact; previously issued long codes keep working.
begin;
alter table public.orders add column if not exists legacy_tracking_code text;
create or replace function public.new_tracking_code() returns text
language plpgsql security definer set search_path='' as $$
declare candidate text;
begin
 -- Serialize allocation with the surrounding insert transaction.
 perform pg_advisory_xact_lock(748392016);
 loop
  candidate:=upper(substr(gen_random_uuid()::text,1,8));
  exit when not exists(select 1 from public.orders where tracking_code=candidate);
 end loop;
 return candidate;
end $$;
revoke all on function public.new_tracking_code() from public,anon,authenticated;
alter table public.orders alter column tracking_code set default public.new_tracking_code();
do $$
declare item record;
begin
 for item in select id from public.orders where length(tracking_code)=32 for update loop
  update public.orders set legacy_tracking_code=coalesce(legacy_tracking_code,tracking_code),
   tracking_code=public.new_tracking_code() where id=item.id;
 end loop;
end $$;
create table if not exists public.tracking_attempts (
 order_id uuid primary key references public.orders(id) on delete cascade,
 started_at timestamptz not null default now(),
 failures integer not null default 0
);
alter table public.tracking_attempts enable row level security;
revoke all on public.tracking_attempts from public,anon,authenticated;
create or replace function public.track_order(p_number text,p_code text)
returns table(order_number text,status text,delivery_date date,delivery_time time,updated_at timestamptz)
language plpgsql security definer set search_path='' as $$
declare item public.orders; attempts public.tracking_attempts; code text:=upper(trim(p_code));
begin
 if p_number is null or length(p_number)>30 or p_code is null or length(p_code)>64 then return; end if;
 select * into item from public.orders o where o.order_number=upper(trim(p_number)) for update;
 if not found then return; end if;
 insert into public.tracking_attempts(order_id) values(item.id) on conflict do nothing;
 select * into attempts from public.tracking_attempts where order_id=item.id;
 if attempts.started_at<=now()-interval '15 minutes' then
  update public.tracking_attempts set started_at=now(),failures=0 where order_id=item.id;
  attempts.failures:=0;
 end if;
 -- Per-order server-side limit also covers direct calls bypassing the form.
 if attempts.failures>=10 then return; end if;
 if code=upper(item.tracking_code) or (item.legacy_tracking_code is not null and code=upper(item.legacy_tracking_code)) then
  return query select item.order_number,item.status,item.delivery_date,item.delivery_time,item.updated_at;
 else
  update public.tracking_attempts set failures=failures+1 where order_id=item.id;
 end if;
end $$;
revoke all on function public.track_order(text,text) from public;
grant execute on function public.track_order(text,text) to anon,authenticated;
commit;
