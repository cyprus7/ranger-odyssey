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
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>tg link generate</title>
  <style>
    /* Mobile-first responsive styles */
    :root {
      --bg: #f7f9fb;
      --card: #ffffff;
      --accent: #0066d6;
      --text: #0b2540;
      --muted: #556680;
      --radius: 12px;
    }
    html,body {
      height: 100%;
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial;
      background: var(--bg);
      color: var(--text);
      -webkit-font-smoothing:antialiased;
      -moz-osx-font-smoothing:grayscale;
    }
    .wrap {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      box-sizing: border-box;
    }
    .card {
      width: 100%;
      max-width: 520px;
      background: transparent;
      text-align: center;
    }
    h3 {
      margin: 0 0 12px 0;
      font-size: 16px;
      color: var(--muted);
    }
    .visually-hidden {
      position: absolute !important;
      height: 1px; width: 1px;
      overflow: hidden; clip: rect(1px, 1px, 1px, 1px);
      white-space: nowrap;
    }
    .btn {
      display: inline-block;
      width: 100%;
      max-width: 360px;
      padding: 14px 18px;
      font-size: 18px;
      font-weight: 600;
      color: #fff;
      background: linear-gradient(180deg,var(--accent), #0056b3);
      border: none;
      border-radius: 12px;
      box-shadow: 0 6px 18px rgba(0,102,214,0.14);
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }
    .btn:active { transform: translateY(1px); }
    .out {
      display: none; /* hidden initially — только кнопка на начальном экране */
      margin: 18px auto 0;
      text-align: left;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, "Roboto Mono", monospace;
      font-size: 13px;
      background: var(--card);
      padding: 12px;
      border-radius: var(--radius);
      box-shadow: 0 6px 18px rgba(12,24,48,0.06);
      word-break: break-word;
      white-space: pre-wrap;
    }
    .out.visible { display: block; }
    .out .row { margin-bottom: 10px; }
    .link a {
      display: inline-block;
      padding: 10px 14px;
      background: var(--accent);
      color: #fff;
      border-radius: 10px;
      font-weight: 700;
      font-size: 1.15rem;
      text-decoration: none;
      box-shadow: 0 6px 18px rgba(0,102,214,0.18);
      word-break: break-all;
      margin-top: 8px;
      letter-spacing: 0.01em;
      transition: background 0.2s;
    }
    .link a:hover, .link a:focus {
      background: #0056b3;
    }
    @media (min-width: 640px) {
      .card { text-align: left; }
      h3 { font-size: 18px; color: var(--muted); }
      .btn { width: auto; min-width: 260px; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <h3 class="visually-hidden">stub_tg_link</h3>
      <button id="gen" class="btn">link example</button>
      <div id="out" class="out" aria-hidden="true"></div>
    </div>
  </div>

  <script>
    document.getElementById('gen').addEventListener('click', async () => {
      const btn = document.getElementById('gen');
      btn.disabled = true;
      btn.textContent = 'generating...';
      try {
        const resp = await fetch('/tg-link-generate/generate', { method: 'POST' });
        const body = await resp.json();
        const out = document.getElementById('out');
        out.innerHTML = '';
        if (resp.ok) {
          // показать область вывода
          out.classList.add('visible');
          out.setAttribute('aria-hidden', 'false');

          const rawDiv = document.createElement('div');
          rawDiv.className = 'row';
          rawDiv.textContent = 'payload (raw): ' + body.rawPayload;

          const base64Div = document.createElement('div');
          base64Div.className = 'row';
          base64Div.textContent = 'payload (base64): ' + body.payload;

          const linkDiv = document.createElement('div');
          linkDiv.className = 'row link';
          linkDiv.innerHTML = '<a href="' + body.link + '" target="_blank" rel="noopener" aria-label="Open Telegram Bot link"><strong>Open tgBot link</strong></a>';

          out.appendChild(rawDiv);
          out.appendChild(base64Div);
          out.appendChild(linkDiv);
        } else {
          out.classList.add('visible');
          out.setAttribute('aria-hidden', 'false');
          out.textContent = 'error: ' + (body.error || 'unknown');
        }
      } catch (e) {
        const out = document.getElementById('out');
        out.classList.add('visible');
        out.setAttribute('aria-hidden', 'false');
        out.textContent = 'network error';
      } finally {
        btn.disabled = false;
        btn.textContent = 'link example';
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
