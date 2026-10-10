'use client';
import {useCallback,useEffect,useRef,useState,type FormEvent} from 'react';
import {Plus,Trash2,RefreshCw} from 'lucide-react';
import {supabase} from '../lib/supabase';
import {today} from '../lib/orders';
import {collectPages} from '../lib/calendar';
import {entryTotals,type ProductEntry,type ProductKind} from '../lib/product-entries';
type Draft={id:string;product_name:string;quantity:string;unit:'kg'|'adet';notes:string;entry_date:string};
const blank=():Draft=>({id:crypto.randomUUID(),product_name:'',quantity:'',unit:'adet',notes:'',entry_date:today()});
const number=(n:number)=>n.toLocaleString('tr-TR',{maximumFractionDigits:3});
export default function ProductEntries({kind,demo,visible}:{kind:ProductKind;demo:boolean;visible:boolean}){
 const [drafts,setDrafts]=useState<Draft[]>([]),[entries,setEntries]=useState<ProductEntry[]>([]),[date,setDate]=useState(today()),[busy,setBusy]=useState(false),[loading,setLoading]=useState(false),[error,setError]=useState(''),[info,setInfo]=useState('');
 const [removed,setRemoved]=useState<ProductEntry|null>(null);
 const submitted=useRef(new Set<string>());const saving=useRef(false),generation=useRef(0);const controller=useRef<AbortController|null>(null);
 const title=kind==='produced'?'Üretilen Ürün':'İmha Edilen Ürün';
 const load=useCallback(async()=>{if(demo||!supabase)return;controller.current?.abort();const ctrl=new AbortController();controller.current=ctrl;const version=++generation.current;setLoading(true);
 try{const client=supabase;const rows=await collectPages<ProductEntry>(async(from,to)=>{const r=await client.from('product_entries').select('*').eq('kind',kind).eq('entry_date',date).is('deleted_at',null).order('created_at',{ascending:false}).order('id').range(from,to).abortSignal(ctrl.signal);return {data:r.data,error:r.error};},ctrl.signal);if(version===generation.current&&!ctrl.signal.aborted)setEntries(rows);}
 catch{if(!ctrl.signal.aborted)setError('Kayıtlar yüklenemedi. Yenile düğmesiyle tekrar deneyin.');}finally{if(version===generation.current)setLoading(false);}},[demo,kind,date]);
 useEffect(()=>{if(!visible)return;void load();const timer=setInterval(()=>void load(),30000);return()=>{clearInterval(timer);controller.current?.abort();};},[visible,load]);
 useEffect(()=>{if(!drafts.length)return;const warn=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[drafts.length]);
 const edit=(id:string,patch:Partial<Draft>)=>setDrafts(rows=>rows.map(row=>row.id===id?{...row,...patch}:row));
 async function save(event:FormEvent){event.preventDefault();if(saving.current||demo||!supabase)return;if(drafts.some(d=>!d.product_name.trim())){setError('Her satır için ürün adı yazın.');return;}saving.current=true;setBusy(true);setError('');setInfo('');let saved=0;
 try{for(let i=0;i<drafts.length;i+=100){const batch=drafts.slice(i,i+100);batch.forEach(d=>submitted.current.add(d.id));const {error}=await supabase.rpc('save_product_entries',{p_entries:batch.map(d=>({...d,kind,quantity:Number(d.quantity)}))});if(error){if(error.code)batch.forEach(d=>submitted.current.delete(d.id));throw error;}const ids=new Set(batch.map(d=>d.id));setDrafts(rows=>rows.filter(d=>!ids.has(d.id)));saved+=batch.length;}
 setInfo(`${saved} satır kaydedildi. Farklı tarihli kayıtları tarih filtresinden görebilirsiniz.`);await load();}
 catch{setError(`${saved?saved+' satır kaydedildi. ':''}Kalan satırlar kaydedilemedi. Bilgiler korunuyor; tekrar kaydedebilirsiniz.`);}finally{saving.current=false;setBusy(false);}}
 async function removeEntry(entry:ProductEntry,restore=false){
  if(demo||!supabase||saving.current)return;
  if(!restore&&!window.confirm(`${entry.product_name} · ${number(Number(entry.quantity))} ${entry.unit} kaydı silinsin mi? Günlük toplamdan çıkarılacak.`))return;
  saving.current=true;setBusy(true);setError('');setInfo('');
  try{const {error}=await supabase.rpc('set_product_entry_removed',{p_id:entry.id,p_removed:!restore});if(error)throw error;
   controller.current?.abort();++generation.current;
   if(!restore)setEntries(rows=>rows.filter(row=>row.id!==entry.id));
   setRemoved(restore?null:entry);setInfo(restore?'Kayıt geri alındı.':`${entry.product_name} kaydı silindi.`);await load();
  }catch{setError('İşlem tamamlanamadı. Yenileyip tekrar deneyin.');}finally{saving.current=false;setBusy(false);}
 }
 const shown=entries.filter(e=>e.entry_date===date),totals=entryTotals(shown);
 return <section hidden={!visible} className="products-module"><div className="pagehead"><div><p className="eyebrow">GÜNLÜK ÜRÜN TAKİBİ</p><h1>{title}</h1><p className="muted">{kind==='produced'?'Üretiminizi ürün ürün kaydedin.':'İmha edilen ürünleri miktarlarıyla kaydedin.'}</p></div><button className="primary" disabled={busy} onClick={()=>setDrafts(rows=>[...rows,blank()])}><Plus size={18}/> Satır ekle</button></div>
 {demo&&<p className="notice">Örnek görünüm. Gerçek kayıt için personel girişi gerekir.</p>}
 {error&&<p className="error" role="alert">{error}</p>}{info&&<p className="success" role="status">{info}</p>}{removed&&<p><button className="secondary" disabled={busy} onClick={()=>void removeEntry(removed,true)}>Son silmeyi geri al</button></p>}
 {drafts.length>0&&<form className="panel product-drafts" onSubmit={save}><h2>Yeni kayıtlar <span className="small">{drafts.length} satır</span></h2><fieldset disabled={busy}>{drafts.map((row,i)=><div className="product-row" key={row.id}><span className="row-number">{i+1}</span><label>Ürün adı<input disabled={submitted.current.has(row.id)} required maxLength={150} value={row.product_name} onChange={e=>edit(row.id,{product_name:e.target.value})}/></label><label>Tarih<input disabled={submitted.current.has(row.id)} type="date" required value={row.entry_date} onChange={e=>edit(row.id,{entry_date:e.target.value})}/></label><label>Miktar<input disabled={submitted.current.has(row.id)} type="number" required min={row.unit==='adet'?1:0.001} max={999999999} step={row.unit==='adet'?1:0.001} value={row.quantity} onChange={e=>edit(row.id,{quantity:e.target.value})}/></label><label>Birim<select disabled={submitted.current.has(row.id)} value={row.unit} onChange={e=>edit(row.id,{unit:e.target.value as Draft['unit']})}><option value="adet">adet</option><option value="kg">kg</option></select></label><label>Not (isteğe bağlı)<input disabled={submitted.current.has(row.id)} maxLength={1000} value={row.notes} onChange={e=>edit(row.id,{notes:e.target.value})}/></label><button type="button" className="textbtn" disabled={submitted.current.has(row.id)} aria-label={`${i+1}. satırı kaldır`} onClick={()=>setDrafts(rows=>rows.filter(d=>d.id!==row.id))}><Trash2 size={18}/></button></div>)}</fieldset><div className="actions"><button type="button" className="secondary" disabled={busy} onClick={()=>setDrafts(rows=>[...rows,blank()])}><Plus size={16}/> Satır ekle</button><button className="primary" disabled={busy||demo}>{busy?'Kaydediliyor…':'Satırları kaydet'}</button></div></form>}
 <div className="toolbar"><label>Kayıt tarihi<input aria-label="Ürün kayıt tarihi filtresi" type="date" required value={date} onChange={e=>{if(e.target.value){setDate(e.target.value);setEntries([]);}}}/></label><button className="secondary" disabled={loading||demo} onClick={()=>{setError('');void load();}}><RefreshCw size={16}/> Yenile</button></div>
 <div className="product-totals"><span>Toplam <strong>{number(totals.kg)} kg</strong></span><span>Toplam <strong>{number(totals.adet)} adet</strong></span><span>{shown.length} kayıt</span></div>
 <section className="panel"><h2>Kaydedilen ürünler</h2>{loading?<p className="empty">Yükleniyor…</p>:shown.length?<div className="product-table-wrap"><table className="product-table"><thead><tr><th>Ürün</th><th>Miktar</th><th>Tarih</th><th>Not</th><th>İşlem</th></tr></thead><tbody>{shown.map(e=><tr key={e.id}><td>{e.product_name}</td><td>{number(Number(e.quantity))} {e.unit}</td><td>{e.entry_date.split('-').reverse().join('.')}</td><td>{e.notes||'—'}</td><td><button className="textbtn" disabled={busy||demo} aria-label={`${e.product_name} kaydını sil`} onClick={()=>void removeEntry(e)}><Trash2 size={16}/> Sil</button></td></tr>)}</tbody></table></div>:<p className="empty">Bu tarihte kayıt yok. “Satır ekle” ile başlayabilirsiniz.</p>}</section></section>;
}
