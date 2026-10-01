'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {ImagePlus,RefreshCw,Trash2} from 'lucide-react';
import {supabase} from '../lib/supabase';
import {validateImageFile} from '../lib/image-validation';

type Picture={slot:1|2;url:string};
type Props={orderId?:string;demo:boolean;readOnly:boolean;onBusyChange:(busy:boolean)=>void};
const bucket='order-images';
export default function OrderImages({orderId,demo,readOnly,onBusyChange}:Props){
 const [pictures,setPictures]=useState<Picture[]>([]);
 const [loading,setLoading]=useState(Boolean(orderId&&!demo));
 const [working,setWorking]=useState(false);
 const [error,setError]=useState('');
 const [message,setMessage]=useState('');
 const [loadFailed,setLoadFailed]=useState(false);
 const urls=useRef<string[]>([]);
 const generation=useRef(0);
 const operation=useRef(false);
 const keep=(next:Picture[])=>{urls.current.forEach(URL.revokeObjectURL);urls.current=next.map(p=>p.url);setPictures(next);};
 const load=useCallback(async()=>{
  if(!supabase||!orderId||demo)return;
  const version=++generation.current;setLoading(true);setLoadFailed(false);setError('');
  const next:Picture[]=[];
  try{
   const storage=supabase.storage.from(bucket);
   const {data,error}=await storage.list(orderId,{limit:10});if(error)throw error;
   for(const object of data??[]){
    if(object.name!=='1'&&object.name!=='2')continue;
    const {data:blob,error}=await storage.download(`${orderId}/${object.name}`);if(error)throw error;
    next.push({slot:Number(object.name) as 1|2,url:URL.createObjectURL(blob)});
   }
   if(version!==generation.current){next.forEach(p=>URL.revokeObjectURL(p.url));return;}
   keep(next);
  }catch{
   next.forEach(p=>URL.revokeObjectURL(p.url));
   if(version===generation.current){setLoadFailed(true);setError('Görseller yüklenemedi. Bağlantıyı ve görsel deposunun kurulumunu kontrol edip yenileyin.');}
  }finally{if(version===generation.current)setLoading(false);}
 },[orderId,demo]);
 useEffect(()=>{void load();return()=>{generation.current++;urls.current.forEach(URL.revokeObjectURL);urls.current=[];};},[load]);
 async function upload(slot:1|2,file?:File){
  if(!file||operation.current||readOnly||pictures.some(p=>p.slot===slot))return;
  operation.current=true;setWorking(true);onBusyChange(true);setError('');setMessage('');
  try{
   await validateImageFile(file);
   // Decode before upload so truncated or corrupt images fail without a storage write.
   const local=URL.createObjectURL(file);
   try{await new Promise<void>((resolve,reject)=>{const image=new Image();image.onload=()=>resolve();image.onerror=()=>reject(new Error('Görsel açılamadı. Farklı bir dosya deneyin.'));image.src=local;});}finally{URL.revokeObjectURL(local);}
   if(demo){
    const picture={slot,url:URL.createObjectURL(file)};urls.current.push(picture.url);
    setPictures(previous=>[...previous,picture].sort((a,b)=>a.slot-b.slot));
    setMessage('Önizleme eklendi. Bu örnek ekranda dosya yüklenmez; pencere kapanınca silinir.');return;
   }
   if(!supabase||!orderId)throw new Error('Önce siparişi kaydedin.');
   const {error}=await supabase.storage.from(bucket).upload(`${orderId}/${slot}`,file,{contentType:file.type,upsert:false,cacheControl:'0'});
   if(error)throw new Error('Yüklenemedi. Alan başka bir ekranda doldurulmuş olabilir. Yenileyip tekrar deneyin.');
   setMessage('Görsel siparişe eklendi.');await load();
  }catch(e){setError((e as Error).message||'Görsel yüklenemedi. Tekrar deneyin.');}
  finally{operation.current=false;setWorking(false);onBusyChange(false);}
 }
 async function remove(slot:1|2){
  if(operation.current||readOnly)return;
  operation.current=true;setWorking(true);onBusyChange(true);setError('');setMessage('');
  try{
   if(!demo){
    if(!supabase||!orderId)throw new Error('Sipariş bağlantısı bulunamadı.');
    const {data,error}=await supabase.storage.from(bucket).remove([`${orderId}/${slot}`]);
    if(error||!data?.length)throw new Error('Görsel kaldırılamadı. Sipariş tamamlanmış veya yetkiniz değişmiş olabilir. Yenileyin.');
   }
   const removed=pictures.find(p=>p.slot===slot);if(removed){URL.revokeObjectURL(removed.url);urls.current=urls.current.filter(u=>u!==removed.url);}
   setPictures(previous=>previous.filter(p=>p.slot!==slot));setMessage(demo?'Önizleme kaldırıldı.':'Görsel kaldırıldı.');
  }catch(e){setError((e as Error).message);}
  finally{operation.current=false;setWorking(false);onBusyChange(false);}
 }
 const disabled=readOnly||working||loading||loadFailed||(!demo&&!orderId);
 return <section className="image-section" aria-labelledby="images-heading" aria-busy={working||loading}>
  <div className="cardtop"><h2 id="images-heading">Referans görselleri</h2><span className="small">{pictures.length} / 2</span></div>
  <p className="small">JPG, PNG veya WebP · Her biri en fazla 5 MB</p>
  {!orderId&&!demo&&<p className="notice">Önce siparişi kaydedin. Ardından burada 2 görsel ekleyebilirsiniz.</p>}
  {demo&&<p className="small">Burada görsel seçip önizleyebilirsiniz. Örnek modunda sunucuya yüklenmez.</p>}
  <div className="image-slots">{([1,2] as const).map(slot=>{const picture=pictures.find(p=>p.slot===slot);return <div className="image-slot" key={slot}>
   {picture?<><a href={picture.url} target="_blank" rel="noreferrer" aria-label={`Referans görseli ${slot} büyüt`}><img src={picture.url} alt={`Sipariş için referans görseli ${slot}`}/></a><div className="image-controls"><span>Görsel {slot}</span>{!readOnly&&<button type="button" className="textbtn" disabled={working||loading||loadFailed} onClick={()=>void remove(slot)} aria-label={`Görsel ${slot} kaldır`}><Trash2 size={16}/>Kaldır</button>}</div></>:<label className={'image-picker '+(disabled?'disabled':'')}><ImagePlus size={28}/><span>{loading?'Yükleniyor…':`Görsel ${slot} ekle`}</span><input type="file" accept="image/jpeg,image/png,image/webp" aria-label={`Referans görseli ${slot} seç`} disabled={disabled} onChange={e=>{const file=e.target.files?.[0];e.target.value='';void upload(slot,file);}}/></label>}
  </div>;})}</div>
  {working&&<p className="small" role="status">Görsel işlemi sürüyor…</p>}
  {error&&<p className="error" role="alert">{error}</p>}
  {message&&<p className="success" role="status">{message}</p>}
  {!demo&&orderId&&<button type="button" className="textbtn" onClick={()=>void load()} disabled={working||loading}><RefreshCw size={15}/>Görselleri yenile</button>}
 </section>;
}
