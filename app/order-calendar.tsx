'use client';
import ReportButton from './report-button';
import {orderReport} from '../lib/reports';
import {useEffect,useMemo,useRef,useState} from 'react';
import {ChevronLeft,ChevronRight,Maximize2,Minimize2,RefreshCw} from 'lucide-react';
import {supabase} from '../lib/supabase';
import {samples,statuses,today,type Order} from '../lib/orders';
import {collectPages,monthCells,monthStart,shiftMonth} from '../lib/calendar';

type Props={demo:boolean;userId:string;wide:boolean;onWide:()=>void;onOpen:(order:Order)=>void};
const weekdays=['Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi','Pazar'];
const formatDate=(date:string,options:Intl.DateTimeFormatOptions)=>new Date(date+'T12:00:00Z').toLocaleDateString('tr-TR',{...options,timeZone:'UTC'});
export default function OrderCalendar({demo,userId,wide,onWide,onOpen}:Props){
 const [month,setMonth]=useState(()=>monthStart(today())),[selected,setSelected]=useState(today);
 const [result,setResult]=useState<{month:string;orders:Order[]}|null>(null);
 const [query,setQuery]=useState(''),[status,setStatus]=useState('Tümü');
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[revision,setRevision]=useState(0);
 const details=useRef<HTMLElement>(null);
 useEffect(()=>{
  let disposed=false;let request:AbortController|undefined;
  const client=supabase;
  const load=async()=>{
   request?.abort();const controller=new AbortController();request=controller;
   setLoading(true);setError('');
   try{
    let orders:Order[];
    if(demo)orders=samples().filter(o=>o.delivery_date>=month&&o.delivery_date<shiftMonth(month,1));
    else{
     if(!client||!userId)throw new Error('Oturum gerekli.');
     orders=await collectPages<Order>((from,to)=>client.from('orders').select('*')
      .gte('delivery_date',month).lt('delivery_date',shiftMonth(month,1))
      .order('delivery_date').order('delivery_time').order('id').range(from,to).abortSignal(controller.signal),controller.signal);
    }
    if(!disposed&&!controller.signal.aborted)setResult({month,orders});
   }catch{if(!disposed&&!controller.signal.aborted)setError('Takvim yüklenemedi. Önceki bilgiler güncel olmayabilir; Yenile düğmesiyle tekrar deneyin.');}
   finally{if(!disposed&&!controller.signal.aborted)setLoading(false);}
  };
  void load();
  const refresh=()=>{if(document.visibilityState==='visible')void load();};
  const timer=demo?undefined:setInterval(refresh,30000);
  const channel=!demo&&client?client.channel('monthly-orders').on('postgres_changes',{event:'*',schema:'public',table:'orders'},refresh).subscribe():null;
  document.addEventListener('visibilitychange',refresh);
  return()=>{disposed=true;request?.abort();clearInterval(timer);document.removeEventListener('visibilitychange',refresh);if(channel&&client)void client.removeChannel(channel);};
 },[month,demo,userId,revision]);
 const current=result?.month===month?result.orders:[];
 const filtered=useMemo(()=>current.filter(o=>(status==='Tümü'||o.status===status)&&`${o.customer_name} ${o.order_number} ${o.phone}`.toLocaleLowerCase('tr').includes(query.trim().toLocaleLowerCase('tr'))),[current,status,query]);
 const grouped=useMemo(()=>{const days=new Map<string,Order[]>();for(const o of filtered){const rows=days.get(o.delivery_date)||[];rows.push(o);days.set(o.delivery_date,rows);}return days;},[filtered]);
 const dayOrders=grouped.get(selected)||[];
 const ready=result?.month===month;
 const changeMonth=(value:string)=>{if(!/^\d{4}-\d{2}$/.test(value)||value<'1900-01'||value>'9998-12')return;const start=monthStart(value);setMonth(start);setSelected(today().startsWith(value)?today():start);};
 const selectDay=(day:string)=>{setSelected(day);requestAnimationFrame(()=>details.current?.scrollIntoView({behavior:'smooth',block:'nearest'}));};
 return <section className="monthly-calendar" aria-label="Aylık sipariş takvimi">
  <div className="pagehead"><div><p className="eyebrow">TESLİM PLANLAMASI</p><h1>Aylık Takvim</h1><p className="muted">Bir ayın siparişleri, tek bakışta.</p></div><button className="secondary" onClick={onWide}>{wide?<Minimize2 size={18}/>:<Maximize2 size={18}/>} {wide?'Normal görünüm':'Geniş görünüm'}</button></div>
  {demo&&<p className="notice">Örnek görünüm · Gerçek sipariş içermez.</p>}
  <div className="calendar-controls"><div className="calendar-month-switch"><button className="secondary" aria-label="Önceki ay" disabled={month<='1900-01-01'} onClick={()=>changeMonth(shiftMonth(month,-1).slice(0,7))}><ChevronLeft size={19}/></button><h2 aria-live="polite">{formatDate(month,{month:'long',year:'numeric'})}</h2><button className="secondary" aria-label="Sonraki ay" disabled={month>='9998-12-01'} onClick={()=>changeMonth(shiftMonth(month,1).slice(0,7))}><ChevronRight size={19}/></button></div><button className="secondary" onClick={()=>{changeMonth(today().slice(0,7));setSelected(today());}}>Bu ay</button><label className="calendar-month-input">Ay seç<input type="month" min="1900-01" max="9998-12" value={month.slice(0,7)} onChange={e=>changeMonth(e.target.value)}/></label><button className="secondary" disabled={loading} onClick={()=>setRevision(v=>v+1)}><RefreshCw size={16}/>{loading?'Yükleniyor…':'Yenile'}</button></div>
  <ReportButton disabled={loading||!ready||!!error} report={orderReport('Aylık Takvim',`${demo?'ÖRNEK VERİ · ':''}${formatDate(month,{month:'long',year:'numeric'})} · ${status}${query?' · Arama: '+query:''}`,filtered)}/><div className="calendar-filters"><input type="search" aria-label="Takvimde sipariş ara" placeholder="Müşteri, telefon veya sipariş no" value={query} onChange={e=>setQuery(e.target.value)}/><select aria-label="Takvim sipariş durumu" value={status} onChange={e=>setStatus(e.target.value)}>{['Tümü',...statuses].map(s=><option key={s}>{s}</option>)}</select><span role="status">{!ready?(loading?'Siparişler yükleniyor…':'Veriler alınamadı'):loading?'Güncelleniyor…':`${filtered.length} sipariş · ${grouped.size} teslim günü`}</span></div>
  {error&&<p className="error" role="alert">{error}</p>}
  <div className="calendar-scroll" tabIndex={0} role="region" aria-label="Aylık takvim; dar ekranda yatay kaydırılabilir" aria-busy={loading}>
   <div className="calendar-grid">{weekdays.map(d=><div className="calendar-weekday" key={d}>{d}</div>)}{monthCells(month).map((day,index)=>{
    if(!day)return <div className="calendar-padding" key={'empty'+index} aria-hidden="true"/>;
    const orders=grouped.get(day)||[];
    return <div key={day} className={'calendar-cell'+(day===today()?' is-today':'')+(day===selected?' is-selected':'')}>
     <button className="calendar-day" aria-pressed={day===selected} aria-label={`${formatDate(day,{day:'numeric',month:'long'})}, ${ready?orders.length+' sipariş':'yükleniyor'}`} onClick={()=>selectDay(day)}><strong>{Number(day.slice(-2))}</strong><span>{day===today()?'Bugün · ':''}{ready?orders.length:'…'}</span></button>
     {orders.slice(0,3).map(o=><button key={o.id} className={'calendar-order s'+statuses.indexOf(o.status)} onClick={()=>onOpen(o)} title={`${o.order_number} · ${o.customer_name} · ${o.status}`}><span><b>{o.delivery_time.slice(0,5)}</b> {o.customer_name}</span><small>{o.order_number} · {o.status}</small></button>)}
     {orders.length>3&&<button className="calendar-more" onClick={()=>selectDay(day)}>+{orders.length-3} sipariş daha</button>}
    </div>;
   })}</div>
  </div>
  {ready&&!loading&&!error&&!filtered.length&&<p className="calendar-empty" role="status">{query||status!=='Tümü'?'Bu filtrelerle eşleşen sipariş yok.':'Bu ay için kayıtlı sipariş yok.'}</p>}
  <div className="calendar-legend">{statuses.map((s,i)=><span className={'badge s'+i} key={s}>{s}</span>)}</div>
  <section className="calendar-details panel" ref={details} aria-label="Seçilen günün siparişleri"><div className="cardtop"><h2>{formatDate(selected,{day:'numeric',month:'long',weekday:'long'})}</h2><span className="small">{ready?dayOrders.length+' sipariş':'Yükleniyor'}</span></div>{dayOrders.length?<div className="calendar-day-list">{dayOrders.map(o=><button className="calendar-detail-row" key={o.id} onClick={()=>onOpen(o)}><strong>{o.delivery_time.slice(0,5)}</strong><span><b>{o.customer_name}</b><small>{o.order_number} · {o.cake_type} · {o.size}</small></span><span className={'badge s'+statuses.indexOf(o.status)}>{o.status}</span><span className="calendar-detail-link">Detayı aç →</span></button>)}</div>:<p className="small">{!ready?'Ayın bilgileri henüz yüklenmedi.':'Seçilen gün ve filtrelerde sipariş yok.'}</p>}</section>
 </section>;
}
