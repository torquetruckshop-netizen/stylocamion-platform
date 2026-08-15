-- Stylo Cargas MVP · ingreso digital resiliente e idempotente
-- Convierte intake_messages en la bandeja universal de entrada para WhatsApp,
-- formularios, operadores y futuras integraciones/API.

alter table intake_messages alter column raw_text drop not null;

alter table intake_messages add column if not exists external_message_id text;
alter table intake_messages add column if not exists content_type text not null default 'TEXT';
alter table intake_messages add column if not exists media_reference text;
alter table intake_messages add column if not exists operation_channel_id text;
alter table intake_messages add column if not exists processing_status text not null default 'RECEIVED';
alter table intake_messages add column if not exists processing_error text;
alter table intake_messages add column if not exists updated_at timestamptz not null default now();

-- Meta/WhatsApp puede reintentar un webhook. Una fuente + ID externo sólo debe
-- transformarse una vez en carga.
create unique index if not exists uq_intake_source_external_message
  on intake_messages(source, external_message_id)
  where external_message_id is not null;

create index if not exists idx_intake_processing_status
  on intake_messages(processing_status, received_at);

create index if not exists idx_intake_operation_channel
  on intake_messages(operation_channel_id, received_at desc);
