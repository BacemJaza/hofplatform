create table public.clients_feedback (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  notes text not null,
  created_at timestamptz not null default now()
);

alter table public.clients_feedback enable row level security;

create policy "Deny all access to anon"
  on public.clients_feedback as restrictive for all to anon
  using (false) with check (false);

create policy "Deny all access to authenticated"
  on public.clients_feedback as restrictive for all to authenticated
  using (false) with check (false);

create or replace function public.validate_clients_feedback()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if length(new.full_name) < 1 or length(new.full_name) > 120 then
    raise exception 'full_name length out of range';
  end if;
  if length(new.email) < 3 or length(new.email) > 255 then
    raise exception 'email length out of range';
  end if;
  if length(new.notes) < 1 or length(new.notes) > 2000 then
    raise exception 'notes length out of range';
  end if;
  return new;
end$$;

create trigger trg_validate_clients_feedback
  before insert or update on public.clients_feedback
  for each row execute function public.validate_clients_feedback();