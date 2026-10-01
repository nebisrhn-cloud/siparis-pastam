-- Run ONLY after deploying order-retention and storing these two Vault secrets:
-- project_url = https://YOUR_PROJECT.supabase.co
-- retention_job_secret = same random secret as Edge Function RETENTION_JOB_SECRET
-- Enable pg_cron and pg_net in Supabase Integrations first.
select cron.schedule('siparis-pastam-retention','*/15 * * * *',$job$
 select net.http_post(
  url := (select decrypted_secret from vault.decrypted_secrets where name='project_url') || '/functions/v1/order-retention',
  headers := jsonb_build_object('Content-Type','application/json','x-retention-secret',(select decrypted_secret from vault.decrypted_secrets where name='retention_job_secret')),
  body := '{}'::jsonb,
  timeout_milliseconds := 120000
 );
$job$);
-- Pause: select cron.unschedule('siparis-pastam-retention');
