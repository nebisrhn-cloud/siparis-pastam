-- No deletion occurs until the scheduled Edge Function is explicitly configured.
begin;
alter table public.orders add column delivered_at timestamptz;
update public.orders o set delivered_at=coalesce((select max(h.changed_at) from public.order_status_history h where h.order_id=o.id and h.status='Teslim Edildi'),now()) where status='Teslim Edildi';
create function public.stamp_delivery() returns trigger language plpgsql set search_path='' as $$
begin
 if new.status='Teslim Edildi' and old.status is distinct from 'Teslim Edildi' then new.delivered_at:=now();
 else new.delivered_at:=old.delivered_at; end if;
 return new;
end $$;
create trigger order_delivery_stamp before update on public.orders for each row execute function public.stamp_delivery();
create index orders_retention on public.orders(delivered_at) where status='Teslim Edildi';
create function public.retention_candidates() returns table(id uuid) language sql security definer set search_path='' as $$
 select o.id from public.orders o where o.status='Teslim Edildi' and o.delivered_at<=now()-interval '168 hours' order by o.delivered_at,o.id limit 100;
$$;
create function public.finish_order_retention(p_id uuid) returns boolean language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.orders where id=p_id and status='Teslim Edildi' and delivered_at<=now()-interval '168 hours' for update;
 if not found then return false; end if;
 -- Storage API must remove the actual files before database deletion.
 if exists(select 1 from storage.objects where bucket_id='order-images' and name like p_id::text||'/%') then raise exception 'Sipariş görselleri henüz silinmedi'; end if;
 delete from public.order_status_history where order_id=p_id;
 delete from public.orders where id=p_id;
 return true;
end $$;
revoke all on function public.stamp_delivery() from public,anon,authenticated;
revoke all on function public.retention_candidates() from public,anon,authenticated;
revoke all on function public.finish_order_retention(uuid) from public,anon,authenticated;
grant execute on function public.retention_candidates(),public.finish_order_retention(uuid) to service_role;
commit;
