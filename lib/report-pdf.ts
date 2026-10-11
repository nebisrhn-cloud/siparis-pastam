import type {Report} from './reports';
// Each PDF page embeds a high-resolution canvas. No customer data leaves the browser.
export async function downloadReport(report:Report){
 await document.fonts.ready;
 const W=1120,H=1584,M=64,BOTTOM=1480;const pages:Uint8Array[]=[];
 const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;
 const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas unavailable');
 let y=0,page=0;const widths=report.columns.map(()=> (W-2*M)/report.columns.length);
 const stamp=new Date().toLocaleString('tr-TR',{timeZone:'Europe/Istanbul'});
 function lines(text:string,width:number){const result:string[]=[];for(const paragraph of String(text??'').split('\n')){let line='';for(const word of paragraph.split(/(\s+)/)){if(ctx!.measureText(line+word).width>width&&line){result.push(line.trimEnd());line='';}for(const char of word){if(ctx!.measureText(line+char).width>width&&line){result.push(line);line='';}line+=char;}}result.push(line);}return result;}
 function start(){page++;ctx!.fillStyle='#fff';ctx!.fillRect(0,0,W,H);ctx!.fillStyle='#713446';ctx!.font='bold 30px Arial';ctx!.fillText('Tumuli.bakery',M,70);ctx!.fillStyle='#292d35';ctx!.font='bold 25px Arial';ctx!.fillText(report.title,M,115);ctx!.font='18px Arial';y=151;for(const line of lines(report.scope.length>500?report.scope.slice(0,500)+'…':report.scope,W-2*M)){ctx!.fillText(line,M,y);y+=24;}ctx!.fillText(report.summary,M,y+10);y+=40;ctx!.fillStyle='#f4e9ee';ctx!.fillRect(M,y,W-2*M,40);ctx!.fillStyle='#713446';ctx!.font='bold 17px Arial';let x=M;report.columns.forEach((v,i)=>{ctx!.fillText(v,x+10,y+26);x+=widths[i];});y+=48;ctx!.font='18px Arial';}
 function finish(){ctx!.fillStyle='#747884';ctx!.font='15px Arial';ctx!.fillText(`Oluşturma: ${stamp} · Türkiye saati`,M,H-50);ctx!.textAlign='right';ctx!.fillText(`Sayfa ${page}`,W-M,H-50);ctx!.textAlign='left';const bytes=atob(canvas.toDataURL('image/jpeg',0.94).split(',')[1]);pages.push(Uint8Array.from(bytes,c=>c.charCodeAt(0)));}
 start();
 for(const row of report.rows.length?report.rows:[['Bu seçimde kayıt yok.',...report.columns.slice(1).map(()=>'')]]){
  const cells=row.map((v,i)=>lines(v,widths[i]-20));let offset=0;const count=Math.max(...cells.map(v=>v.length));
  while(offset<count){if(y+48>BOTTOM){finish();start();}const take=Math.min(count-offset,Math.floor((BOTTOM-y-18)/24));let x=M;ctx.fillStyle='#292d35';cells.forEach((cell,i)=>{cell.slice(offset,offset+take).forEach((line,j)=>ctx.fillText(line,x+10,y+23+j*24));x+=widths[i];});y+=take*24+18;ctx.strokeStyle='#e4e5e9';ctx.beginPath();ctx.moveTo(M,y);ctx.lineTo(W-M,y);ctx.stroke();offset+=take;if(offset<count){finish();start();}}
 }
 finish();
 const enc=new TextEncoder(),parts:Uint8Array[]=[],offsets:number[]=[0];let length=0;
 const put=(v:string|Uint8Array)=>{const b=typeof v==='string'?enc.encode(v):v;parts.push(b);length+=b.length;};
 const obj=(id:number,body:string)=>{offsets[id]=length;put(`${id} 0 obj\n${body}\nendobj\n`);};
 put('%PDF-1.4\n');obj(1,'<< /Type /Catalog /Pages 2 0 R >>');obj(2,`<< /Type /Pages /Count ${pages.length} /Kids [${pages.map((_,i)=>`${3+i*3} 0 R`).join(' ')}] >>`);
 pages.forEach((jpg,i)=>{const id=3+i*3;obj(id,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im ${id+1} 0 R >> >> /Contents ${id+2} 0 R >>`);offsets[id+1]=length;put(`${id+1} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${W} /Height ${H} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`);put(jpg);put('\nendstream\nendobj\n');const stream='q 595.28 0 0 841.89 0 0 cm /Im Do Q';obj(id+2,`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);});
 const xref=length;put(`xref\n0 ${offsets.length}\n0000000000 65535 f \n`);offsets.slice(1).forEach(n=>put(`${String(n).padStart(10,'0')} 00000 n \n`));put(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
 const blob=new Blob(parts as BlobPart[],{type:'application/pdf'}),url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`Tumuli-${report.title.replace(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ-]/g,'-')}-${new Date().toISOString().slice(0,10)}.pdf`;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
