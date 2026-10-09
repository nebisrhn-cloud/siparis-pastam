'use client';
import {useEffect,useState} from 'react';
import {supabase} from '../lib/supabase';
import {today,samples} from '../lib/orders';
import {addDays} from '../lib/product-entries';
export default function UpcomingOrders({demo}:{demo:boolean}){
 const [count,setCount]=useState<number|null>(null),[error,setError]=useState(false);
 useEffect(()=>{let active=true;let controller:AbortController|undefined;
 const load=async()=>{controller?.abort();controller=new AbortController();const signal=controller.signal;const start=today(),end=addDays(start,2);
 try{const result=demo?{count:samples().filter(o=>o.delivery_date>=start&&o.delivery_date<end&&!['Teslim Edildi','İptal'].includes(o.status)).length,error:null}:await supabase!.from('orders').select('id',{count:'exact',head:true}).gte('delivery_date',start).lt('delivery_date',end).in('status',['Yeni','Hazırlanıyor','Hazır']).abortSignal(signal);
 if(active&&!signal.aborted){setError(Boolean(result.error));setCount(result.error?null:result.count);}}catch{if(active&&!signal.aborted){setError(true);setCount(null);}}};
 void load();const timer=setInterval(()=>void load(),30000);return()=>{active=false;controller?.abort();clearInterval(timer);};},[demo]);
 return <section className="upcoming-panel" aria-live="polite"><div><h2>Yaklaşan siparişler</h2><p className="small">Bugün ve yarın teslim edilecek pastalar · Teslim edilenler ve iptaller hariç</p></div><strong>{error?'Yüklenemedi':count===null?'…':`${count} pasta`}</strong></section>;
}
