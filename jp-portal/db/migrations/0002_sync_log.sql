-- Regista cada evento de sincronização já processado, para que reentregas
-- do outbox (retries, ou reprocessamento manual) nunca dupliquem efeitos.

create table sync_log (
  event_id uuid primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);

alter table sync_log enable row level security;
-- só o service role acede (chamado exclusivamente pela Edge Function sync-member);
-- sem policies para utilizadores autenticados, RLS bloqueia tudo por defeito.
