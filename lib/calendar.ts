// Date-only calculations use UTC so month boundaries never depend on browser timezone.
export function monthStart(value:string){return value.slice(0,7)+'-01';}
export function shiftMonth(value:string,offset:number){
 const [year,month]=value.split('-').map(Number);
 return new Date(Date.UTC(year,month-1+offset,1)).toISOString().slice(0,10);
}
export function monthCells(value:string):(string|null)[]{
 const first=monthStart(value),next=shiftMonth(first,1);
 const start=new Date(first+'T12:00:00Z');
 const count=new Date(new Date(next+'T12:00:00Z').getTime()-86400000).getUTCDate();
 const offset=(start.getUTCDay()+6)%7;
 const cells:(string|null)[]=Array(offset).fill(null);
 for(let day=1;day<=count;day++)cells.push(first.slice(0,8)+String(day).padStart(2,'0'));
 while(cells.length%7)cells.push(null);
 return cells;
}
export async function collectPages<T>(fetchPage:(from:number,to:number)=>PromiseLike<{data:T[]|null;error:unknown}>,signal:AbortSignal):Promise<T[]>{
 const rows:T[]=[];
 for(let from=0;;from+=500){
  signal.throwIfAborted();
  const result=await fetchPage(from,from+499);
  signal.throwIfAborted();
  if(result.error)throw result.error;
  if(!result.data)throw new Error('Sipariş yanıtı alınamadı.');
  rows.push(...result.data);
  if(result.data.length<500)return rows;
 }
}
