const express = require('express');
const crypto = require('crypto');

const app = express();
app.use(express.json());

const BOT_USERNAME = process.env.BOT_USERNAME || 'default_bot_username';
if (!process.env.BOT_USERNAME) {
  console.warn('Warning: BOT_USERNAME is not set in the environment. Using default_bot_username.');
}
const PORT = process.env.PORT || 3000;

const SECRET_TG_PAYLOAD_KEY = process.env.SECRET_TG_PAYLOAD_KEY || 'default_secret_key';
if (!process.env.SECRET_TG_PAYLOAD_KEY) {
  console.warn('Warning: SECRET_TG_PAYLOAD_KEY is not set in the environment. Using default_secret_key.');
}

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
      const resp = await fetch('/tg-link-generate/generate', { method: 'POST' });
      const body = await resp.json();
      const out = document.getElementById('out');
      if (resp.ok) {
        out.innerHTML = '';
        const rawDiv = document.createElement('div');
        rawDiv.textContent = 'payload (raw): ' + body.rawPayload;
        const base64Div = document.createElement('div');
        base64Div.textContent = 'payload (base64): ' + body.payload;
        const linkDiv = document.createElement('div');
        linkDiv.innerHTML = '<a href="' + body.link + '" target="_blank" rel="noopener">Open tg link</a>';
        out.appendChild(rawDiv);
        out.appendChild(base64Div);
        out.appendChild(linkDiv);
      } else {
        out.textContent = 'error: ' + (body.error || 'unknown');
      }
    });
  </script>
</body>
</html>`);
});

app.post('/tg-link-generate/generate', (req, res) => {
  if (!BOT_USERNAME) {
    return res.status(500).json({ error: 'BOT_USERNAME not set in environment' });
  }

  const user_id = randUserId();
  const ts = Math.floor(Date.now() / 1000);
  const guid = crypto.randomUUID();
  const nonce = sha256Hex(guid + ts + user_id);

  const payloadObj = {
    site_id: 'example.bet',
    user_id: String(user_id),
    ts: ts,
    nonce: nonce,
  };

  // make sign - sort payload keys
  const sortedKeys = Object.keys(payloadObj).sort();
  const signString = sortedKeys.map(key => `${key}=${payloadObj[key]}`).join('&');
  const sign = sha256Hex(signString + SECRET_TG_PAYLOAD_KEY);

  const rawPayload = JSON.stringify({ ...payloadObj, sign });
  const payload = Buffer.from(rawPayload).toString('base64');
  const link = `https://t.me/${encodeURIComponent(BOT_USERNAME)}?startapp=${encodeURIComponent(payload)}`;

  res.json({ rawPayload, payload, link, data: payloadObj });
});

app.listen(PORT, () => {
  console.log('stub_tg_link running on port ' + PORT + ', route: /tg-link-generate');
});
