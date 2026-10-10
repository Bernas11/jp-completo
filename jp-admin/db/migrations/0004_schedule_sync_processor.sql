-- Agenda o processador do outbox a cada minuto via pg_cron + pg_net
-- (ambas as extensões vêm pré-instaladas no Supabase).
--
-- IMPORTANTE: substituir <PROJECT_REF> e <CRON_SECRET> pelos valores reais
-- ao aplicar esta migration em cada ambiente (nunca commitar o secret literal).

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'process-sync-outbox',
  '* * * * *', -- todos os minutos
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.functions.supabase.co/sync-outbox-processor',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Cron-Secret', '<CRON_SECRET>'
    ),
    body := '{}'::jsonb
  );
  $$
);
