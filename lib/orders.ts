export const statuses = ['Yeni','Hazırlanıyor','Hazır','Teslim Edildi','İptal'] as const;
export type Status = typeof statuses[number];
export type Order = {id:string;order_number:string;customer_name:string;phone:string;delivery_date:string;delivery_time:string;cake_type:string;size:string;cake_message:string;notes:string;price:number;payment_status:string;status:Status;created_by:string;staff_name:string;tracking_code:string;version:number;delivered_at?:string|null;created_at?:string;updated_at?:string};
export const money=(v:number)=>new Intl.NumberFormat('tr-TR',{style:'currency',currency:'TRY',maximumFractionDigits:2}).format(v);
export const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export function samples():Order[]{return [
['1042','Örnek Müşteri A','Çikolatalı pasta','8–10 kişilik','14:30','Hazırlanıyor','İyi ki doğdun!','Fındık kullanılmayacak.',1450,'Kapora Alındı'],
['1043','Örnek Müşteri B','Çilekli pasta','6–8 kişilik','16:00','Yeni','Nice mutlu yıllara','Pembe süsleme.',1200,'Ödenmedi'],
['1044','Örnek Müşteri C','San Sebastian','10–12 kişilik','17:30','Hazır','','Sos ayrı paketlenecek.',1800,'Ödendi']
].map((a,i)=>({id:String(i),order_number:'NB-'+a[0],customer_name:String(a[1]),phone:'0500 000 00 00',cake_type:String(a[2]),size:String(a[3]),delivery_time:String(a[4]),status:a[5] as Status,cake_message:String(a[6]),notes:String(a[7]),price:Number(a[8]),payment_status:String(a[9]),delivery_date:today(),created_by:'sample',staff_name:'Örnek Personel',tracking_code:'ÖRNEK',version:1}));}
