-- Independent production/waste ledger; does not alter orders or their retention.
create table public.product_entries (
 id uuid primary key,
 kind text not null check (kind in ('produced','disposed')),
 entry_date date not null check (isfinite(entry_date)),
 product_name text not null check (length(btrim(product_name)) between 1 and 150),
 quantity numeric not null check (quantity > 0 and quantity <= 999999999 and quantity = round(quantity,3)),
 unit text not null check (unit in ('kg','adet')),
 notes text not null default '' check (length(notes)<=1000),
 created_by uuid not null default auth.uid() references public.staff(id),
 created_at timestamptz not null default now(),
 check (unit <> 'adet' or quantity=trunc(quantity))
);
create index product_entries_kind_date on public.product_entries(kind,entry_date,created_at desc,id);
create index product_entries_created_by on public.product_entries(created_by);
alter table public.product_entries enable row level security;
revoke all on public.product_entries from public,anon,authenticated;
grant select on public.product_entries to authenticated;
grant insert(id,kind,entry_date,product_name,quantity,unit,notes) on public.product_entries to authenticated;
create policy product_entries_read on public.product_entries for select to authenticated using ((select public.is_staff()));
create policy product_entries_add on public.product_entries for insert to authenticated with check ((select public.is_staff()) and created_by=(select auth.uid()));

create function public.save_product_entries(p_entries jsonb) returns integer
language plpgsql security invoker set search_path='' as $$
declare item jsonb; saved public.product_entries; incoming public.product_entries; total integer:=0;
begin
 if auth.uid() is null or not public.is_staff() then raise exception 'Personel erişimi gerekli.'; end if;
 if p_entries is null or jsonb_typeof(p_entries)<>'array' then raise exception 'Satır listesi gerekli.'; end if;
 if jsonb_array_length(p_entries) not between 1 and 100 then raise exception 'Bir istekte 1–100 satır gönderin.'; end if;
 for item in select value from jsonb_array_elements(p_entries) loop
  incoming.id := (item->>'id')::uuid;
  incoming.kind := item->>'kind';
  incoming.entry_date := (item->>'entry_date')::date;
  incoming.product_name := btrim(item->>'product_name');
  incoming.quantity := (item->>'quantity')::numeric;
  incoming.unit := item->>'unit';
  incoming.notes := coalesce(item->>'notes','');
  insert into public.product_entries(id,kind,entry_date,product_name,quantity,unit,notes)
   values(incoming.id,incoming.kind,incoming.entry_date,incoming.product_name,incoming.quantity,incoming.unit,incoming.notes)
   on conflict (id) do nothing;
  select * into saved from public.product_entries where id=incoming.id;
  if not found or saved.created_by is distinct from auth.uid()
   or (saved.kind,saved.entry_date,saved.product_name,saved.quantity,saved.unit,saved.notes)
      is distinct from (incoming.kind,incoming.entry_date,incoming.product_name,incoming.quantity,incoming.unit,incoming.notes)
  then raise exception 'Kayıt kimliği daha önce farklı bilgilerle kullanılmış.'; end if;
  total:=total+1;
 end loop;
 return total;
end;
$$;
revoke all on function public.save_product_entries(jsonb) from public,anon;
grant execute on function public.save_product_entries(jsonb) to authenticated;
