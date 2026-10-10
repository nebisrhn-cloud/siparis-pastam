-- Reversible removal from the shared staff ledger; order data is unaffected.
alter table public.product_entries add column deleted_at timestamptz;
grant update(deleted_at) on public.product_entries to authenticated;
create policy product_entries_remove on public.product_entries for update to authenticated
 using ((select public.is_staff())) with check ((select public.is_staff()));
create function public.set_product_entry_removed(p_id uuid,p_removed boolean) returns uuid
language plpgsql security invoker set search_path='' as $$
declare result uuid;
begin
 if auth.uid() is null or not public.is_staff() then raise exception 'Personel erişimi gerekli.'; end if;
 if p_removed is null then raise exception 'İşlem gerekli.'; end if;
 update public.product_entries set deleted_at=case when p_removed then coalesce(deleted_at,now()) else null end where id=p_id returning id into result;
 if result is null then raise exception 'Ürün kaydı bulunamadı.'; end if;
 return result;
end;
$$;
revoke all on function public.set_product_entry_removed(uuid,boolean) from public,anon;
grant execute on function public.set_product_entry_removed(uuid,boolean) to authenticated;
