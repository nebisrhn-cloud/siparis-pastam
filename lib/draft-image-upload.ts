export type DraftImage = {slot:1|2;file:File};
type Storage = {
 upload:(path:string,file:File,options:{contentType:string;upsert:false;cacheControl:string})=>PromiseLike<{error:unknown}>;
 download:(path:string)=>PromiseLike<{data:Blob|null;error:unknown}>;
};
export async function uploadDraftImage(storage:Storage,orderId:string,image:DraftImage):Promise<void>{
 const path=`${orderId}/${image.slot}`;
 try {
  const result=await storage.upload(path,image.file,{contentType:image.file.type,upsert:false,cacheControl:'0'});
  if(!result.error)return;
 }catch{/* The server may have accepted the upload before the connection failed. */}
 const existing=await storage.download(path);
 if(!existing.error&&existing.data&&existing.data.size===image.file.size){
  const [remote,local]=await Promise.all([existing.data.arrayBuffer(),image.file.arrayBuffer()]);
  const a=new Uint8Array(remote),b=new Uint8Array(local);
  if(a.every((v,i)=>v===b[i]))return;
 }
 throw new Error(`Görsel ${image.slot} yüklenemedi. Sipariş kaydedildi; tekrar deneyebilirsiniz. Mevcut farklı bir görselin üzerine yazılmaz.`);
}
