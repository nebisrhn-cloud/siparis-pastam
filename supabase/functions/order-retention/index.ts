// Runs only on Supabase Edge Functions. The job secret and service key stay server-side.
const env = (name: string) => { const value = Deno.env.get(name); if (!value) throw new Error('Missing configuration'); return value; };
Deno.serve(async (request: Request) => {
  if (request.method !== 'POST') return new Response('Method not allowed', {status:405});
  const secret = Deno.env.get('RETENTION_JOB_SECRET');
  if (!secret || request.headers.get('x-retention-secret') !== secret) return new Response('Unauthorized', {status:401});
  let removed = 0, failed = 0;
  try {
    const base = env('SUPABASE_URL'), key = env('SUPABASE_SERVICE_ROLE_KEY');
    async function call(path: string, method: string, body: unknown) {
      const response = await fetch(base + path, {method, headers: {apikey:key, Authorization:`Bearer ${key}`, 'Content-Type':'application/json'}, body:JSON.stringify(body)});
      if (!response.ok) throw new Error('Retention request failed');
      return response.json();
    }
    const candidates: {id:string}[] = await call('/rest/v1/rpc/retention_candidates','POST',{});
    for (const order of candidates) {
      try {
        const objects: {name:string}[] = await call('/storage/v1/object/list/order-images','POST',{prefix:order.id+'/',limit:100});
        if (objects.length) await call('/storage/v1/object/order-images','DELETE',{prefixes:objects.map(o=>order.id+'/'+o.name)});
        if (await call('/rest/v1/rpc/finish_order_retention','POST',{p_id:order.id})) removed++;
      } catch { failed++; }
    }
    // Failures leave the order available for retry; never log customer data or secrets.
    return Response.json({removed,failed}, {status:failed?500:200});
  } catch { return Response.json({error:'Retention failed',removed,failed}, {status:500}); }
});
