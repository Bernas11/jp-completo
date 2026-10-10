-- Projeto Supabase A — Militância
-- Executar no SQL Editor do projeto isolado de militância.

create table if not exists distritos (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique
);

create table if not exists concelhias (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  distrito_id uuid references distritos(id),
  tem_site_proprio boolean default false,
  url_site text,
  email text,
  instagram text,
  direcao text,
  visivel_no_mapa boolean default true,
  created_at timestamptz default now()
);

create table if not exists militantes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  data_nascimento date not null,
  email text not null,
  telemovel text not null,
  estabelecimento_ensino text,
  local_trabalho text,
  morada text not null,
  numero text,
  localidade text not null,
  codigo_postal text,
  distrito text not null,
  concelho text not null,
  concelhia_id uuid references concelhias(id),
  numero_cc text not null,
  documento_cc_path text,          -- eliminado até 30 dias após decisão
  enc_educacao_nome text,          -- só preenchido se idade 14-15
  enc_educacao_contacto text,
  estado text not null default 'pendente' check (estado in ('pendente','aprovado','recusado')),
  aprovado_por uuid,
  aprovado_em timestamptz,
  created_at timestamptz default now()
);

create table if not exists auditoria (
  id uuid primary key default gen_random_uuid(),
  militante_id uuid references militantes(id) on delete cascade,
  utilizador_id uuid,
  acao text not null,
  detalhes jsonb,
  created_at timestamptz default now()
);

-- Row Level Security: só a CPN (via service role, usado apenas em API routes
-- de servidor) acede a estas tabelas. Nenhuma policy pública de leitura.
alter table militantes enable row level security;
alter table auditoria enable row level security;
alter table concelhias enable row level security;

-- Exemplo de policy pública apenas para o diretório de concelhias
-- (nome, distrito, email, instagram — nunca dados de militantes):
create policy "Concelhias visiveis publicamente"
  on concelhias for select
  using (visivel_no_mapa = true);

-- Storage: bucket privado para documentos de identificação
-- (criar manualmente no painel Supabase como "documentos-identificacao", privado)
-- Rotina recomendada (cron/Edge Function) para eliminar documentos
-- 30 dias após "aprovado_em" ou "recusado":
--
-- delete from storage.objects
-- where bucket_id = 'documentos-identificacao'
--   and created_at < now() - interval '30 days';
