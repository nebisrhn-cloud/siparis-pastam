'use client';
import {useRef,useState} from 'react';
import {supabase} from '../lib/supabase';
export default function Reapply({onSent}:{onSent:()=>void}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');const sending=useRef(false);
 async function submit(){if(!supabase||sending.current)return;sending.current=true;setBusy(true);setError('');try{const {error}=await supabase.rpc('request_membership');if(error)throw error;onSent();}catch{setError('Başvuru gönderilemedi. Tekrar deneyin.');}finally{sending.current=false;setBusy(false);}}
 return <div><p>Eski hesabınızla yeniden personel üyeliği başvurusu yapabilirsiniz.</p><button className="primary" disabled={busy} onClick={()=>void submit()}>{busy?'Gönderiliyor…':'Yeniden üyelik başvurusu yap'}</button>{error&&<p className="error" role="alert">{error}</p>}</div>;
}
