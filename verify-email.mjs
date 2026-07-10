import fs from 'fs';

const text = fs.readFileSync('.env', 'utf8');
const match = text.match(/^\s*HOF_API_KEY\s*=\s*(.+)$/m);
if (!match || !match[1].trim()) {
  console.error('No HOF_API_KEY found in .env');
  process.exit(1);
}

const key = match[1].trim().replace(/^['"]|['"]$/g, '');
const owner = 'houseofflagstn@gmail.com';
const from = process.env.RESEND_FROM_EMAIL || 'HOUSE OF FLAGS <orders@updates.houseofflags.com>';

const res = await fetch('https://connector-gateway.lovable.dev/resend/emails', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Connection-Api-Key': key,
  },
  body: JSON.stringify({
    from,
    to: [owner],
    subject: 'House of Flags domain check',
    html: '<p>Domain check</p>',
  }),
});

const body = await res.text();
console.log('status:', res.status);
console.log('body:', body);
