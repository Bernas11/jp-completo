create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'event-reminders',
  '0 * * * *', -- todas as horas (a janela de lembrete é 24h, não precisa de ser ao minuto)
  $$
  select net.http_post(
    url := 'https://<PORTAL_PROJECT_REF>.functions.supabase.co/event-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Cron-Secret', '<CRON_SECRET>'
    ),
    body := '{}'::jsonb
  );
  $$
);
