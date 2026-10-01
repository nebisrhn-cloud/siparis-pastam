-- Run once in a new Supabase project's SQL Editor. All writes use guarded RPCs.
begin;
create table public.staff (
 id uuid primary key references auth.users(id),
 display_name text not null check (length(trim(display_name)) between 1 and 100),
 active boolean not null default true
);
create function public.is_staff() returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.staff where id=auth.uid() and active);
$$;
create sequence public.order_numbers start 1001;
create table public.orders (
 id uuid primary key default gen_random_uuid(),
 order_number text not null unique default ('NB-' || nextval('public.order_numbers')),
 request_id uuid not null unique,
 customer_name text not null check(length(trim(customer_name)) between 1 and 100),
 phone text not null check(phone ~ '^\+?[0-9]{10,15}$'),
 delivery_date date not null,
 delivery_time time not null,
 cake_type text not null check(length(trim(cake_type)) between 1 and 100),
 size text not null check(length(trim(size)) between 1 and 100),
 cake_message text not null default '' check(length(cake_message)<=300),
 notes text not null default '' check(length(notes)<=2000),
 price numeric(12,2) not null check(price>=0 and price<=9999999.99),
 payment_status text not null check(payment_status in ('Ödenmedi','Kapora Alındı','Ödendi')),
 status text not null default 'Yeni' check(status in ('Yeni','Hazırlanıyor','Hazır','Teslim Edildi','İptal')),
 created_by uuid not null references public.staff(id),
 staff_name text not null,
 tracking_code text not null unique default replace(gen_random_uuid()::text,'-',''),
 version integer not null default 1,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index orders_delivery on public.orders(delivery_date,delivery_time);
create table public.order_status_history (
 id bigint generated always as identity primary key,
 order_id uuid not null references public.orders(id),
 previous_status text,
 status text not null,
 changed_by uuid not null references public.staff(id),
 changed_at timestamptz not null default now()
);
create index history_order on public.order_status_history(order_id,changed_at);
alter table public.staff enable row level security;
alter table public.orders enable row level security;
alter table public.order_status_history enable row level security;
create policy staff_read on public.staff for select to authenticated using(public.is_staff());
create policy orders_read on public.orders for select to authenticated using(public.is_staff());
create policy history_read on public.order_status_history for select to authenticated using(public.is_staff());
revoke all on public.staff,public.orders,public.order_status_history from anon,authenticated;
grant select on public.staff,public.orders,public.order_status_history to authenticated;
revoke all on sequence public.order_numbers from public,anon,authenticated;

create function public.save_order(p_data jsonb,p_request_id uuid,p_id uuid default null,p_version integer default null)
returns public.orders language plpgsql security definer set search_path = '' as $$
declare result public.orders; person public.staff;
begin
 select * into person from public.staff where id=auth.uid() and active;
 if not found then raise exception 'Personel yetkisi gerekli' using errcode='42501'; end if;
 if p_request_id is null then raise exception 'İstek kimliği gerekli'; end if;
 if p_id is null then
  -- Retrying the same request must not create a second order.
  perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,0));
  select * into result from public.orders where request_id=p_request_id;
  if found then return result; end if;
  insert into public.orders(request_id,customer_name,phone,delivery_date,delivery_time,cake_type,size,cake_message,notes,price,payment_status,created_by,staff_name)
  values(p_request_id,trim(p_data->>'customer_name'),regexp_replace(p_data->>'phone','[\s()\-]','','g'),(p_data->>'delivery_date')::date,(p_data->>'delivery_time')::time,trim(p_data->>'cake_type'),trim(p_data->>'size'),coalesce(p_data->>'cake_message',''),coalesce(p_data->>'notes',''),(p_data->>'price')::numeric,p_data->>'payment_status',person.id,person.display_name)
  returning * into result;
  insert into public.order_status_history(order_id,status,changed_by) values(result.id,'Yeni',person.id);
 else
  select * into result from public.orders where id=p_id for update;
  if not found then raise exception 'Sipariş bulunamadı'; end if;
  if result.version is distinct from p_version then raise exception 'Sipariş başka bir ekranda değişti. Yenileyip tekrar deneyin.' using errcode='40001'; end if;
  if result.status in ('Teslim Edildi','İptal') then raise exception 'Tamamlanan sipariş düzenlenemez'; end if;
  update public.orders set customer_name=trim(p_data->>'customer_name'),phone=regexp_replace(p_data->>'phone','[\s()\-]','','g'),delivery_date=(p_data->>'delivery_date')::date,delivery_time=(p_data->>'delivery_time')::time,cake_type=trim(p_data->>'cake_type'),size=trim(p_data->>'size'),cake_message=coalesce(p_data->>'cake_message',''),notes=coalesce(p_data->>'notes',''),price=(p_data->>'price')::numeric,payment_status=p_data->>'payment_status',version=version+1,updated_at=now()
  where id=p_id returning * into result;
 end if;
 return result;
end $$;

create function public.set_order_status(p_id uuid,p_status text,p_version integer)
returns public.orders language plpgsql security definer set search_path = '' as $$
declare result public.orders; prev text;
begin
 if not public.is_staff() then raise exception 'Personel yetkisi gerekli' using errcode='42501'; end if;
 select * into result from public.orders where id=p_id for update;
 if not found then raise exception 'Sipariş bulunamadı'; end if;
 if result.version is distinct from p_version then raise exception 'Sipariş başka bir ekranda değişti. Yenileyin.' using errcode='40001'; end if;
 if not ((result.status='Yeni' and p_status in ('Hazırlanıyor','İptal')) or (result.status='Hazırlanıyor' and p_status in ('Hazır','İptal')) or (result.status='Hazır' and p_status in ('Teslim Edildi','İptal'))) then raise exception 'Geçersiz durum geçişi'; end if;
 prev:=result.status;
 update public.orders set status=p_status,version=version+1,updated_at=now() where id=p_id returning * into result;
 insert into public.order_status_history(order_id,previous_status,status,changed_by) values(p_id,prev,p_status,auth.uid());
 return result;
end $$;

-- High entropy tracking code is a bearer secret: do not publish or log it.
-- Anonymous users receive only delivery and status, never customer/staff details.
create function public.track_order(p_number text,p_code text)
returns table(order_number text,status text,delivery_date date,delivery_time time,updated_at timestamptz)
language sql stable security definer set search_path = '' as $$
 select o.order_number,o.status,o.delivery_date,o.delivery_time,o.updated_at from public.orders o
 where o.order_number=upper(trim(p_number)) and o.tracking_code=lower(trim(p_code)) and length(trim(p_code))=32 limit 1;
$$;
revoke all on function public.is_staff() from public;
grant execute on function public.is_staff() to authenticated;
revoke all on function public.save_order(jsonb,uuid,uuid,integer) from public,anon;
revoke all on function public.set_order_status(uuid,text,integer) from public,anon;
revoke all on function public.track_order(text,text) from public;
grant execute on function public.save_order(jsonb,uuid,uuid,integer) to authenticated;
grant execute on function public.set_order_status(uuid,text,integer) to authenticated;
grant execute on function public.track_order(text,text) to anon,authenticated;
alter publication supabase_realtime add table public.orders;
commit;
