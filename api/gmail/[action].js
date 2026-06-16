const { getGmailAccessToken, saveStoredGmailRefreshToken, sendJson } = require('../../lib/noa');

const GMAIL_SEND_SCOPE = 'https://www.googleapis.com/auth/gmail.send';

module.exports = async function handler(req, res) {
  const action = getAction(req);

  if (action === 'start') return startGmail(req, res);
  if (action === 'callback') return handleGmailCallback(req, res);
  if (action === 'test') return testGmail(req, res);

  return sendJson(res, 404, {
    ok: false,
    message: 'Unknown Gmail route. Use /api/gmail/start, /api/gmail/callback, or /api/gmail/test.'
  });
};

async function startGmail(req, res) {
  if (req.method !== 'GET') return sendJson(res, 405, { ok: false, message: 'Method not allowed.' });
  if (!process.env.GOOGLE_CLIENT_ID) {
    return sendHtml(res, 500, renderMessage('Gmail is not ready', [
      'GOOGLE_CLIENT_ID is missing from Vercel environment variables.',
      'Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Vercel, redeploy, then open this URL again.'
    ]));
  }

  const redirectUri = getRedirectUri(req);
  const state = process.env.GMAIL_OAUTH_STATE || 'noa-gmail-setup';
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', GMAIL_SEND_SCOPE);
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  url.searchParams.set('state', state);

  res.statusCode = 302;
  res.setHeader('location', url.toString());
  res.end();
}

async function handleGmailCallback(req, res) {
  if (req.method !== 'GET') return sendJson(res, 405, { ok: false, message: 'Method not allowed.' });

  const requestUrl = new URL(req.url || '/', `https://${req.headers.host || 'no-a.vercel.app'}`);
  const error = requestUrl.searchParams.get('error');
  const code = requestUrl.searchParams.get('code');
  const state = requestUrl.searchParams.get('state');
  const expectedState = process.env.GMAIL_OAUTH_STATE || 'noa-gmail-setup';

  if (error) {
    return sendHtml(res, 400, renderMessage('Gmail did not approve access', [
      `Google returned: ${error}`,
      'Go back to /api/gmail/start and try again.'
    ]));
  }

  if (state !== expectedState) {
    return sendHtml(res, 403, renderMessage('State check failed', [
      'The Gmail OAuth state did not match. Restart the Gmail connection from /api/gmail/start.'
    ]));
  }

  if (!code) {
    return sendHtml(res, 400, renderMessage('Missing Gmail code', [
      'Google did not return an authorization code. Restart from /api/gmail/start.'
    ]));
  }

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return sendHtml(res, 500, renderMessage('Gmail app credentials are missing', [
      'GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing from Vercel environment variables.'
    ]));
  }

  try {
    const redirectUri = getRedirectUri(req);
    const token = await exchangeCodeForToken(code, redirectUri);
    if (!token.ok) {
      return sendHtml(res, 502, renderMessage('Gmail token exchange failed', [token.message]));
    }

    const tokenSave = token.refreshToken
      ? await saveStoredGmailRefreshToken(token.refreshToken)
      : { ok: false, message: 'Google did not return a refresh token. Reopen /api/gmail/start and approve with prompt=consent.' };

    return sendHtml(res, 200, renderSuccess({ refreshToken: token.refreshToken, redirectUri, tokenSave }));
  } catch (caught) {
    return sendHtml(res, 500, renderMessage('Gmail setup failed', [
      caught instanceof Error ? caught.message : 'Unknown Gmail setup error.'
    ]));
  }
}

async function testGmail(req, res) {
  if (req.method !== 'GET') return sendJson(res, 405, { ok: false, message: 'Method not allowed.' });
  const token = await getGmailAccessToken();
  return sendJson(res, 200, {
    ok: token.ok,
    message: token.ok ? 'Gmail API is connected and can refresh an access token.' : token.message
  });
}

async function exchangeCodeForToken(code, redirectUri) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    })
  });
  const text = await safeReadText(response);
  if (!response.ok) return { ok: false, message: `Google token exchange failed with ${response.status}. ${summariseApiError(text)}` };
  const data = JSON.parse(text);
  return {
    ok: true,
    accessToken: data.access_token || '',
    refreshToken: data.refresh_token || ''
  };
}

function getAction(req) {
  const queryAction = req.query?.action;
  if (Array.isArray(queryAction)) return queryAction[0] || '';
  if (queryAction) return String(queryAction);
  const pathname = new URL(req.url || '/', `https://${req.headers.host || 'no-a.vercel.app'}`).pathname;
  return pathname.split('/').filter(Boolean).pop() || '';
}

function getRedirectUri(req) {
  if (process.env.GMAIL_REDIRECT_URI) return process.env.GMAIL_REDIRECT_URI;
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'no-a.vercel.app';
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  return `${protocol}://${host}/api/gmail/callback`;
}

async function safeReadText(response) {
  try {
    return await response.text();
  } catch {
    return '';
  }
}

function summariseApiError(body) {
  if (!body) return 'No error details were returned.';
  try {
    const parsed = JSON.parse(body);
    return parsed.error_description || parsed.error?.message || parsed.message || 'No readable error message was returned.';
  } catch {
    return body.slice(0, 240);
  }
}

function sendHtml(res, status, html) {
  res.statusCode = status;
  res.setHeader('content-type', 'text/html; charset=utf-8');
  res.end(html);
}

function renderMessage(title, lines) {
  return page(title, `<div class="panel"><h1>${escapeHtml(title)}</h1>${lines.map((line) => `<p>${escapeHtml(line)}</p>`).join('')}</div>`);
}

function renderSuccess({ refreshToken, redirectUri, tokenSave }) {
  const envBlock = [
    refreshToken ? `GMAIL_REFRESH_TOKEN=${refreshToken}` : '',
    `GMAIL_REDIRECT_URI=${redirectUri}`,
    process.env.GMAIL_SENDER_EMAIL ? `GMAIL_SENDER_EMAIL=${process.env.GMAIL_SENDER_EMAIL}` : 'GMAIL_SENDER_EMAIL=info@fearlessau.com'
  ].filter(Boolean).join('\n');

  return page('Gmail connected', `
    <div class="panel">
      <p class="eyebrow">NoA Gmail setup</p>
      <h1>Gmail connected</h1>
      <p>NoA received Gmail send permission. Tenant billing emails can now be sent through Gmail.</p>
      ${tokenSave?.ok ? '<p class="success">NoA saved the Gmail refresh token to Supabase for future sends.</p>' : `<p class="warning">${escapeHtml(tokenSave?.message || 'NoA could not save the Gmail refresh token automatically yet.')}</p>`}
      <label>Vercel env fallback values</label>
      <textarea readonly>${escapeHtml(envBlock)}</textarea>
      <div class="actions">
        <a href="/">Return to NoA</a>
        <a href="/integrations">Open integrations</a>
      </div>
      <p class="warning">Treat the refresh token like a password. Use the Supabase private token store when possible.</p>
    </div>
  `);
}

function page(title, body) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)} - NoA Gmail</title>
  <style>
    :root { color-scheme: dark; }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; background: radial-gradient(circle at 30% 0%, rgba(96,165,250,.22), transparent 34%), #070b12; color: #eef4ff; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    main { max-width: 860px; margin: 0 auto; padding: 56px 22px; }
    .panel { border: 1px solid rgba(255,255,255,.1); border-radius: 24px; background: rgba(255,255,255,.06); box-shadow: 0 22px 80px rgba(0,0,0,.34); padding: 28px; }
    .eyebrow { color: #93c5fd; font-size: 12px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
    h1 { margin: 0 0 14px; font-size: clamp(32px, 5vw, 52px); }
    p { color: rgba(238,244,255,.78); line-height: 1.6; }
    label { display: block; margin: 22px 0 9px; color: rgba(238,244,255,.88); font-weight: 800; }
    textarea { width: 100%; min-height: 160px; border: 0; border-radius: 18px; outline: 0; background: rgba(0,0,0,.36); color: #dbeafe; font: 14px/1.6 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; padding: 16px; resize: vertical; }
    .actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 18px; }
    a { border-radius: 999px; background: #dff3ff; color: #061018; display: inline-flex; font-weight: 800; padding: 12px 16px; text-decoration: none; }
    a + a { background: rgba(255,255,255,.1); color: #eef4ff; }
    .success { border-radius: 16px; background: rgba(52,211,153,.12); color: #bbf7d0; padding: 12px 14px; }
    .warning { border-radius: 16px; background: rgba(251,191,36,.12); color: #fde68a; padding: 12px 14px; }
    strong { color: #fff; }
  </style>
</head>
<body><main>${body}</main></body>
</html>`;
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}
