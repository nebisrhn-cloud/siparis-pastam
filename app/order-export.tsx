'use client';
import {useState} from 'react';
import {supabase} from '../lib/supabase';
import {archiveHtml,type OrderArchive} from '../lib/order-export';
import {samples,type Order} from '../lib/orders';

async function rows(table:string,orderId?:string){
 if(!supabase)throw new Error('Bağlantı kurulmadı.');
 let all:Record<string,unknown>[]=[];
 for(let start=0;;start+=500){
  let query=supabase.from(table).select('*').order('id').range(start,start+499);
  if(orderId)query=query.eq(table==='orders'?'id':'order_id',orderId);
  const {data,error}=await query;if(error)throw error;
  all=all.concat(data);if(data.length<500)return all;
 }
}
function dataUrl(blob:Blob):Promise<string>{return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(new Error('Görsel okunamadı.'));reader.onload=()=>resolve(String(reader.result));reader.readAsDataURL(blob);});}
async function collect(order:Order|undefined,demo:boolean,progress:(message:string)=>void){
 if(demo)return (order?[order]:samples()).map(o=>({order:o,history:[],images:[]}));
 const initial=await rows('orders',order?.id);
 if(order&&!initial.length)throw new Error('Sipariş artık bulunamıyor. Listeyi yenileyin.');
 const history=await rows('order_status_history',order?.id);
 const entries:OrderArchive[]=[];let bytes=0;
 for(const raw of initial){
  const o=raw as unknown as Order;
  progress(`${entries.length+1} / ${initial.length} sipariş hazırlanıyor…`);
  const {data:files,error}=await supabase!.storage.from('order-images').list(o.id,{limit:100,sortBy:{column:'name',order:'asc'}});if(error)throw error;
  const images=[];
  for(const file of files??[]){
   const {data,error}=await supabase!.storage.from('order-images').download(`${o.id}/${file.name}`);if(error)throw error;
   bytes+=data.size;if(bytes>200*1024*1024)throw new Error('Yedek bu tarayıcı için çok büyük (200 MB). Tek tek PDF kaydedin; toplu yedek indirilmedi.');
   images.push({name:file.name,data_url:await dataUrl(data)});
  }
  const check=await supabase!.storage.from('order-images').list(o.id,{limit:100,sortBy:{column:'name',order:'asc'}});
  if(check.error||JSON.stringify(check.data)!==JSON.stringify(files))throw new Error('Yedek hazırlanırken görseller değişti. Tekrar deneyin.');
  entries.push({order:o,history:history.filter(h=>h.order_id===o.id),images});
 }
 const latest=await rows('orders',order?.id);
 if(JSON.stringify(initial)!==JSON.stringify(latest))throw new Error('Yedek hazırlanırken siparişler değişti. Tekrar deneyin.');
 return entries;
}
export default function OrderExport({order,demo,disabled=false}:{order?:Order;demo:boolean;disabled?:boolean}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 async function save(){
  // Open synchronously so browser popup protections do not block the PDF view.
  const popup=order?window.open('','_blank'):null;
  if(order&&!popup){setError('PDF ekranı için bu sitede açılır pencerelere izin verin.');return;}
  if(popup){popup.opener=null;popup.document.title='Sipariş hazırlanıyor';popup.document.body.textContent='Sipariş formu hazırlanıyor…';}
  setBusy(true);setError('');setMessage('Hazırlanıyor…');
  try{
   const entries=await collect(order,demo,setMessage);
   const html=archiveHtml(entries,new Date().toISOString(),demo);
   if(popup){popup.document.open();popup.document.write(html);popup.document.close();setMessage('Form açıldı. “Yazdır / PDF olarak kaydet” düğmesini kullanın.');}
   else {const url=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`siparis-pastam-yedek-${new Date().toISOString().replace(/[:.]/g,'-')}.html`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);setMessage(`${entries.length} siparişin yedeği indirilmeye gönderildi. Dosyayı açıp kontrol edin.`);}
  }catch(e){popup?.close();setError(e instanceof Error?e.message:'Yedek hazırlanamadı. Bağlantıyı kontrol edip tekrar deneyin.');setMessage('');}
  finally{setBusy(false);}
 }
 return <div className="export-control"><button type="button" className="secondary" disabled={busy||disabled} onClick={()=>void save()}>{busy?'Hazırlanıyor…':order?'PDF / Yazdır':'Tüm siparişleri yedekle'}</button>{!order&&<p className="small">Tüm tarihlerdeki mevcut siparişler, durum geçmişi ve görseller tek dosyada kaydedilir. İndirilen dosya çevrimdışı açılır.</p>}{order&&<p className="small">Son kaydedilen bilgiler kullanılır. Düzenlediğiniz alanları önce kaydedin.</p>}{message&&<p className="small" role="status">{message}</p>}{error&&<p className="error" role="alert">{error}</p>}</div>;
}
