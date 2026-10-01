'use client';
import {useEffect,useRef,useState} from 'react';
import {ImagePlus,Trash2} from 'lucide-react';
import {validateImageFile} from '../lib/image-validation';
import type {DraftImage} from '../lib/draft-image-upload';
export default function DraftImages({images,onChange,disabled,onBusyChange,saved=false}:{images:DraftImage[];onChange:(images:DraftImage[])=>void;disabled:boolean;onBusyChange:(busy:boolean)=>void;saved?:boolean}){
 const [previews,setPreviews]=useState<{slot:number;url:string}[]>([]),[error,setError]=useState(''),[working,setWorking]=useState(false);
 const operation=useRef(false);
 useEffect(()=>{const next=images.map(i=>({slot:i.slot,url:URL.createObjectURL(i.file)}));setPreviews(next);return()=>next.forEach(p=>URL.revokeObjectURL(p.url));},[images]);
 async function select(slot:1|2,file?:File){
  if(!file||disabled||operation.current)return;
  operation.current=true;setWorking(true);onBusyChange(true);setError('');
  try{
   await validateImageFile(file);
   const url=URL.createObjectURL(file);
   try{await new Promise<void>((resolve,reject)=>{const img=new Image();img.onload=()=>resolve();img.onerror=()=>reject(new Error('Görsel açılamadı. Başka bir dosya seçin.'));img.src=url;});}finally{URL.revokeObjectURL(url);}
   onChange([...images.filter(i=>i.slot!==slot),{slot,file}].sort((a,b)=>a.slot-b.slot));
  }catch(e){setError(e instanceof Error?e.message:'Görsel seçilemedi.');}
  finally{operation.current=false;setWorking(false);onBusyChange(false);}
 }
 return <section className="image-section" aria-label="Siparişe eklenecek görseller"><div className="cardtop"><h2>{saved?'Yüklenmeyi bekleyen görseller':'Referans görselleri'}</h2><span className="small">{images.length} / 2</span></div><p className="small">İsteğe bağlı · JPG, PNG veya WebP · Her biri en fazla 5 MB. {saved?'Sipariş kaydedildi; aşağıdaki görseller henüz yüklenmedi.':'Şimdi seçin; siparişi oluşturduğunuzda görseller de yüklenecek.'}</p><div className="image-slots">{([1,2] as const).filter(slot=>!saved||images.some(i=>i.slot===slot)).map(slot=>{const preview=previews.find(p=>p.slot===slot);return <div className="image-slot" key={slot}>{preview?<><img src={preview.url} alt={`Seçilen referans görseli ${slot}`}/><div className="image-controls"><span>Görsel {slot}</span><button type="button" className="textbtn" disabled={disabled||working} onClick={()=>onChange(images.filter(i=>i.slot!==slot))}><Trash2 size={16}/>Kaldır</button></div></>:<label className={'image-picker '+(disabled||working?'disabled':'')}><ImagePlus size={28}/><span>Görsel {slot} seç</span><input type="file" accept="image/jpeg,image/png,image/webp" aria-label={`Referans görseli ${slot} seç`} disabled={disabled||working} onChange={e=>{const file=e.target.files?.[0];e.target.value='';void select(slot,file);}}/></label>}</div>;})}</div>{working&&<p role="status">Görsel kontrol ediliyor…</p>}{error&&<p className="error" role="alert">{error}</p>}</section>;
}
