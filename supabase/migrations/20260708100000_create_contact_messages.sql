create table public.contact_messages (
    id uuid primary key default gen_random_uuid(),

    full_name text not null,
    email text not null,
    notes text not null,

    created_at timestamptz not null default now()
);

alter table public.contact_messages
enable row level security;

create policy "Anyone can submit contact form"
on public.contact_messages
for insert
to anon
with check (true);

create policy "Authenticated users can read messages"
on public.contact_messages
for select
to authenticated
using (true);
