import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  fs.readFileSync('.env', 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const i = line.indexOf('=');
      return [line.slice(0, i), line.slice(i + 1).replace(/^['\"]|['\"]$/g, '')];
    }),
);

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const payload = {
  order_ref: 'SCAN-TEST',
  customer_name: 'Scan',
  email: 'scan@example.com',
  phone: '000',
  city: 'Test',
  address: 'Test',
  notes: null,
  items: [{ slug: 'no-rules', qty: 1, unit_price_tnd: 300, line_total_tnd: 300 }],
  total: 300,
  currency: 'TND',
  status: 'pending',
};

const { data, error } = await supabase.from('orders').insert(payload);
console.log(JSON.stringify({ data, error: error ? { message: error.message, details: error.details, hint: error.hint, code: error.code } : null }, null, 2));
