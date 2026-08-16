-- Stylo Cargas · perfil aprendido de consumo por vehículo
-- Resume viajes reales de telemetría para mejorar estimaciones futuras sin
-- recalcular todo el histórico en cada matching.

create table if not exists vehicle_efficiency_profiles (
  vehicle_id uuid primary key references vehicles(id) on delete cascade,
  profile_version text not null,
  status text not null default 'INSUFFICIENT_DATA' check (status in ('INSUFFICIENT_DATA','READY')),
  ready_for_estimation boolean not null default false,
  consumption_l_per_100km numeric(10,3),
  sample_count integer not null default 0,
  rejected_sample_count integer not null default 0,
  total_distance_km numeric(14,2) not null default 0,
  standard_deviation numeric(10,3),
  coefficient_of_variation numeric(10,4),
  confidence text not null default 'LOW' check (confidence in ('HIGH','MEDIUM','LOW')),
  window_started_at timestamptz,
  window_ended_at timestamptz,
  calculated_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_vehicle_efficiency_profiles_ready
  on vehicle_efficiency_profiles(ready_for_estimation, confidence);

create index if not exists idx_telematics_actuals_vehicle_profile
  on telematics_trip_actuals(vehicle_id, status, confidence, ended_at desc);
