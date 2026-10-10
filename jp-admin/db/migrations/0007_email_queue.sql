-- ============================================================
-- FILA DE EMAILS TRANSACIONAIS (separada do sync_outbox porque
-- tem consumidor e propósito diferentes: entrega via Brevo, não
-- sincronização entre projetos).
-- ============================================================

create type email_queue_status as enum ('pendente', 'enviado', 'falhado');

create table email_queue (
  id uuid primary key default gen_random_uuid(),
  template_key varchar(80) not null, -- corresponde a email_templates.key
  to_email text not null,
  to_name text not null,
  params jsonb not null default '{}'::jsonb,
  status email_queue_status not null default 'pendente',
  attempts integer not null default 0,
  eligible_at timestamptz not null default now(),
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index email_queue_status_idx on email_queue (status, eligible_at);

alter table email_queue enable row level security;
-- só o service role acede (processador via cron); sem policies para
-- utilizadores autenticados.

-- ------------------------------------------------------------
-- Trigger: pedido recusado -> enfileira email
-- ------------------------------------------------------------

create or replace function enqueue_membership_rejected_email()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status and new.status = 'recusado' then
    insert into email_queue (template_key, to_email, to_name, params)
    values (
      'membership_rejected',
      new.email,
      new.full_name,
      jsonb_build_object('fullName', new.full_name, 'reason', new.rejection_reason)
    );
  end if;
  return new;
end;
$$;

create trigger trg_enqueue_membership_rejected_email
  after update of status on membership_requests
  for each row
  execute function enqueue_membership_rejected_email();
