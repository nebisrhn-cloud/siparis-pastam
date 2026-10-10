import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {addDays,entryTotals} from '../lib/product-entries.ts';
const db=new PGlite();
await db.exec(`create role anon;create role authenticated;create schema auth;create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to authenticated,anon;create table public.staff(id uuid primary key,active boolean,deleted_at timestamptz);create function public.is_staff() returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.staff where id=auth.uid() and active and deleted_at is null)$$;create table public.orders(id integer primary key,customer_name text);insert into public.orders values(1,'Preserved');`);
await db.exec(await readFile(new URL('../supabase/migrations/20261009212120_product_entries.sql',import.meta.url),'utf8'));
const member=crypto.randomUUID(),other=crypto.randomUUID(),pending=crypto.randomUUID();
await db.query('insert into public.staff values($1,true,null),($2,true,null),($3,false,null)',[member,other,pending]);
async function asUser(id:string){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated');}
await db.exec(await readFile(new URL('../supabase/migrations/20261010165253_product_entry_removal.sql',import.meta.url),'utf8'));
const id=crypto.randomUUID(),second=crypto.randomUUID();
await asUser(member);
await db.query('select public.save_product_entries($1)',[JSON.stringify([{id,kind:'produced',entry_date:'2026-10-10',product_name:'Test',quantity:2.5,unit:'kg'},{id:second,kind:'disposed',entry_date:'2026-10-10',product_name:'Test2',quantity:3,unit:'adet'}])]);
await asUser(other);
for(const target of [id,second]){
 await db.query('select public.set_product_entry_removed($1,true)',[target]);
 await db.query('select public.set_product_entry_removed($1,true)',[target]);
 assert.equal((await db.query('select * from product_entries where id=$1 and deleted_at is null',[target])).rows.length,0);
 await db.query('select public.set_product_entry_removed($1,false)',[target]);
 assert.equal((await db.query('select * from product_entries where id=$1 and deleted_at is null',[target])).rows.length,1);
}
await assert.rejects(()=>db.query('update product_entries set quantity=999'));
await assert.rejects(()=>db.query('delete from product_entries'));
await assert.rejects(()=>db.query('select public.set_product_entry_removed($1,true)',[crypto.randomUUID()]));
await asUser(pending);await assert.rejects(()=>db.query('select public.set_product_entry_removed($1,true)',[id]));
await db.exec('reset role;set role anon');await assert.rejects(()=>db.query('select public.set_product_entry_removed($1,true)',[id]));
await db.exec('reset role');assert.equal((await db.query<{customer_name:string}>('select customer_name from orders')).rows[0].customer_name,'Preserved');
await db.close();console.log('PASS: both product kinds remove/restore, retry, staff-only access, immutable quantities, no hard delete, orders preserved.');
