 'use client';
import {useState} from 'react';
import {FileDown} from 'lucide-react';
import type {Report} from '../lib/reports';
export default function ReportButton({report,disabled=false}:{report:Report;disabled?:boolean}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 async function download(){if(busy)return;setBusy(true);setError('');try{const {downloadReport}=await import('../lib/report-pdf');await downloadReport(report);}catch{setError('PDF oluşturulamadı. Tekrar deneyin.');}finally{setBusy(false);}}
 return <div className="report-action"><button className="secondary" disabled={disabled||busy} onClick={()=>void download()}><FileDown size={16}/>{busy?'PDF hazırlanıyor…':'PDF raporu indir'}</button>{error&&<span role="alert" className="error">{error}</span>}</div>;
}
