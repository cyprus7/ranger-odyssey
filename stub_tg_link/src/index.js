const express = require('express');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const app = express();
app.use(express.json());

const BOT_USERNAME = process.env.BOT_USERNAME || '';
const PORT = process.env.PORT || 3000;

function randUserId() {
  return Math.floor(1000000 + Math.random() * 1000000);
}

function sha256Hex(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

app.get('/tg-link-generate', (req, res) => {
  // simple page with a button and area to show generated payload + link
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!doctype html>
<html>
<head><meta charset="utf-8"><title>tg link generate</title></head>
<body>
  <h3>stub_tg_link</h3>
  <button id="gen">link example</button>
  <div id="out" style="margin-top:1em; font-family:monospace;"></div>
  <script>
    document.getElementById('gen').addEventListener('click', async () => {
      const resp = await fetch('/api/generate', { method: 'POST' });
      const body = await resp.json();
      const out = document.getElementById('out');
      if (resp.ok) {
        out.innerHTML = '';
        const p = document.createElement('div');
        p.textContent = 'payload (base64): ' + body.payload;
        const a = document.createElement('div');
        a.innerHTML = '<a href="' + body.link + '" target="_blank" rel="noopener">Open tg link</a>';
        out.appendChild(p);
        out.appendChild(a);
      } else {
        out.textContent = 'error: ' + (body.error || 'unknown');
      }
    });
  </script>
</body>
</html>`);
});

app.post('/api/generate', (req, res) => {
  if (!BOT_USERNAME) {
    return res.status(500).json({ error: 'BOT_USERNAME not set in environment' });
  }

  const user_id = randUserId();
  const ts = Math.floor(Date.now() / 1000);
  const guid = uuidv4();
  const nonce = sha256Hex(guid + ts + user_id);

  const payloadObj = {
    site_id: 'example.bet',
    user_id: String(user_id),
    ts: ts,
    nonce: nonce
  };

  const payload = Buffer.from(JSON.stringify(payloadObj)).toString('base64');
  const link = `https://t.me/${encodeURIComponent(BOT_USERNAME)}?startapp=${encodeURIComponent(payload)}`;

  res.json({ payload, link, data: payloadObj });
});

app.listen(PORT, () => {
  console.log(\`stub_tg_link running on port \${PORT}, route: /tg-link-generate\`);
});
