-- Apply after 001_orders.sql. Private storage; two deterministic slots per order.
begin;
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('order-images','order-images',false,5242880,array['image/jpeg','image/png','image/webp']);

-- Unique (bucket_id,name), enforced by Supabase Storage, makes even concurrent
-- uploads respect the two-slot limit. No UPDATE policy: no silent overwrites.
create policy nebi_order_images_read on storage.objects for select to authenticated
using (
 bucket_id='order-images' and public.is_staff()
 and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[12]$'
 and exists(select 1 from public.orders o where o.id::text=split_part(name,'/',1))
);
create policy nebi_order_images_insert on storage.objects for insert to authenticated
with check (
 bucket_id='order-images' and public.is_staff()
 and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[12]$'
 and exists(select 1 from public.orders o where o.id::text=split_part(name,'/',1) and o.status not in ('Teslim Edildi','İptal'))
);
create policy nebi_order_images_delete on storage.objects for delete to authenticated
using (
 bucket_id='order-images' and public.is_staff()
 and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[12]$'
 and exists(select 1 from public.orders o where o.id::text=split_part(name,'/',1) and o.status not in ('Teslim Edildi','İptal'))
);
commit;
