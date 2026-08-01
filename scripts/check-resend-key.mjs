import fs from 'node:fs';

const env = fs.readFileSync('.env', 'utf8');
const match = env.match(/^RESEND_API_KEY=(.*)$/m);
if (!match) {
  console.log('RESEND_API_KEY not found in .env');
  process.exit(1);
}

const key = match[1].trim().replace(/^['"]|['"]$/g, '');
console.log(`Key prefix: ${key.slice(0, 7)}…`);
console.log(`Key length: ${key.length}`);

const response = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    from: 'Cradlyn <onboarding@resend.dev>',
    to: ['delivered@resend.dev'],
    subject: 'Cradlyn Resend key check',
    html: '<p>Key validation ping</p>',
  }),
});

const body = await response.text();
console.log(`HTTP ${response.status}`);
console.log(body.slice(0, 300));
