export type ProductKind = 'produced' | 'disposed';
export type ProductEntry = {id:string;kind:ProductKind;entry_date:string;product_name:string;quantity:number;unit:'kg'|'adet';notes:string;created_at?:string};
export function addDays(date:string, days:number){const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);}
export function entryTotals(entries:ProductEntry[]){return entries.reduce((t,e)=>({...t,[e.unit]:t[e.unit]+Number(e.quantity)}),{kg:0,adet:0});}
