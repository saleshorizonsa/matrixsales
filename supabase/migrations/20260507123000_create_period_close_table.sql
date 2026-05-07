-- Period close controls for HORIZON / MatrixSales.
-- Stores month-end close records used by the application to lock dated transactions.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.period_close (
  id uuid primary key default gen_random_uuid(),
  base44_id text unique,
  organization_id uuid,
  organization_key text,
  record jsonb not null default '{}'::jsonb,
  status text generated always as (record ->> 'status') stored,
  created_by uuid,
  updated_by uuid,
  source text not null default 'matrixsales',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists period_close_record_gin_idx on public.period_close using gin (record);
create index if not exists period_close_organization_id_idx on public.period_close (organization_id);
create index if not exists period_close_organization_key_idx on public.period_close (organization_key);
create index if not exists period_close_status_idx on public.period_close (status);
create index if not exists period_close_created_at_idx on public.period_close (created_at desc);
create index if not exists period_close_period_key_idx on public.period_close ((record ->> 'period_key'));
create index if not exists period_close_module_idx on public.period_close ((record ->> 'module'));

alter table public.period_close enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'period_close'
      and policyname = 'authenticated_read_write'
  ) then
    create policy authenticated_read_write on public.period_close
      for all
      to authenticated
      using (true)
      with check (true);
  end if;
end;
$$;

drop trigger if exists set_period_close_updated_at on public.period_close;
create trigger set_period_close_updated_at
  before update on public.period_close
  for each row execute function public.set_updated_at();

create table if not exists public.matrix_entity_table_map (
  entity_name text primary key,
  table_name text not null unique,
  created_at timestamptz not null default now()
);

insert into public.matrix_entity_table_map (entity_name, table_name)
values ('PeriodClose', 'period_close')
on conflict (entity_name) do update
  set table_name = excluded.table_name;
