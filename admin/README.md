# HOUSE OF FLAGS — Admin Dashboard

Separate admin app for managing products, orders, and contact messages. Connects to the same Supabase project as the storefront.

## Setup

1. Copy the example env file:

```bash
cp .env.example .env
```

2. Fill in `admin/.env`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ADMIN_ACCESS_CODE=your-secret-word
SESSION_SECRET=long-random-string-for-cookie-signing
PORT=3001
```

3. Apply the products migration (if not already applied):

```bash
# from repo root
supabase db push
```

4. Install and run:

```bash
cd admin
npm install
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) and sign in with your `ADMIN_ACCESS_CODE`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server (Express + Vite HMR) on port 3001 |
| `npm run build` | Build frontend to `dist/` |
| `npm run start` | Production server (serves `dist/`) |
| `npm run typecheck` | TypeScript check |

## Features

- **Auth** — single access code from `.env`, HTTP-only signed session cookie
- **Products** — full CRUD, active/inactive toggle, Supabase `products` table
- **Orders** — full CRUD on `orders` table
- **Messages** — read & delete on `contact_messages` table

## Security

- `SUPABASE_SERVICE_ROLE_KEY` and `ADMIN_ACCESS_CODE` live only in `admin/.env` (gitignored)
- All Supabase writes go through server API routes — never exposed to the browser
- Service role bypasses RLS; admin routes require a valid session cookie
