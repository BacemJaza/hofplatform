create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  label text not null,
  price_eur numeric(10, 2) not null check (price_eur > 0),
  image_url text not null,
  story text not null,
  tags text[] not null default '{}',
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_slug_idx on public.products (slug);
create index products_is_active_idx on public.products (is_active);

create or replace function public.set_products_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_products_updated_at
  before update on public.products
  for each row
  execute function public.set_products_updated_at();

alter table public.products enable row level security;

create policy "Public can read active products"
  on public.products
  for select
  to anon, authenticated
  using (is_active = true);

insert into public.products (slug, name, label, price_eur, image_url, story, tags, is_active)
values
  (
    'no-rules',
    'NO RULES',
    'Limited Piece — 50 made',
    89,
    '/product-no-rules.jpg',
    'A flag for the ones who never asked for permission. Stitched in defiance, hung in silence. NO RULES is the loudest thing you''ll ever own without saying a word.',
    array['Limited', 'Drop 001', 'Fabric Flag'],
    true
  ),
  (
    'lost',
    'LOST',
    'Limited Piece — 40 made',
    89,
    '/product-lost.jpg',
    'Not a confession. A coordinate. For the ones who walked off the map and built a life in the margins.',
    array['Limited', 'Drop 001', 'Fabric Flag'],
    false
  ),
  (
    'void',
    'VOID',
    'Limited Piece — 30 made',
    99,
    '/product-void.jpg',
    'The empty space between intention and act. VOID is the only honest color — everything else is a story we tell ourselves.',
    array['Limited', 'Drop 001', 'Fabric Flag'],
    false
  ),
  (
    'rising',
    'RISING',
    'Limited Piece — 35 made',
    95,
    '/product-rising.jpg',
    'Borrowed from a sun that never apologized for burning. Hung as a reminder: light is a discipline, not a gift.',
    array['Limited', 'Drop 001', 'Fabric Flag'],
    false
  ),
  (
    'silence',
    'SILENCE',
    'Limited Piece — 45 made',
    89,
    '/product-silence.jpg',
    'Loud rooms made you small. SILENCE makes you whole. The flag for everyone tired of being asked to explain themselves.',
    array['Limited', 'Drop 001', 'Fabric Flag'],
    false
  ),
  (
    'ronin',
    'RONIN',
    'Limited Piece — 25 made',
    109,
    '/product-ronin.jpg',
    'No master. No banner. Just a code. RONIN is for the disciplined outsiders — the ones who carry the rules inside.',
    array['Limited', 'Drop 001', 'Fabric Flag'],
    false
  ),
  (
    'echo',
    'ECHO',
    'Limited Piece — 40 made',
    89,
    '/product-echo.jpg',
    'Everything you said still bouncing off concrete. ECHO is the proof you were here, even after the city forgot.',
    array['Limited', 'Drop 001', 'Fabric Flag'],
    false
  )
on conflict (slug) do nothing;
