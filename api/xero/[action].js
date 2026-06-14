const DEFAULT_SCOPES = [
  'offline_access',
  'accounting.settings.read',
  'accounting.contacts.read',
  'accounting.invoices.read'
].join(' ');

module.exports = async function handler(req, res) {
  const action = getAction(req);

  if (action === 'start') return startXero(req, res);
  if (action === 'callback') return handleXeroCallback(req, res);

  return sendJson(res, 404, {
    ok: false,
    message: 'Unknown Xero route. Use /api/xero/start or /api/xero/callback.'
  });
};

async function startXero(req, res) {
  if (req.method !== 'GET') {
    return sendJson(res, 405, { ok: false, message: 'Method not allowed.' });
  }

  if (!process.env.XERO_CLIENT_ID) {
    return sendHtml(res, 500, renderMessage('Xero is not ready', [
      'XERO_CLIENT_ID is missing from Vercel environment variables.',
      'Add XERO_CLIENT_ID and XERO_CLIENT_SECRET in Vercel, redeploy, then open this URL again.'
    ]));
  }

  const redirectUri = getRedirectUri(req);
  const state = process.env.XERO_OAUTH_STATE || 'noa-xero-setup';
  const scopes = process.env.XERO_SCOPES || DEFAULT_SCOPES;
  const url = new URL('https://login.xero.com/identity/connect/authorize');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', process.env.XERO_CLIENT_ID);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', scopes);
  url.searchParams.set('state', state);

  res.statusCode = 302;
  res.setHeader('location', url.toString());
  res.end();
}

async function handleXeroCallback(req, res) {
  if (req.method !== 'GET') {
    return sendJson(res, 405, { ok: false, message: 'Method not allowed.' });
  }

  const requestUrl = new URL(req.url || '/', `https://${req.headers.host || 'no-a.vercel.app'}`);
  const code = requestUrl.searchParams.get('code') || '';
  const returnedState = requestUrl.searchParams.get('state') || '';
  const error = requestUrl.searchParams.get('error') || '';

  if (error) {
    return sendHtml(res, 400, renderMessage('Xero did not approve access', [
      `Xero returned: ${error}`,
      requestUrl.searchParams.get('error_description') || 'Try the authorization flow again from /api/xero/start.'
    ]));
  }

  if (process.env.XERO_OAUTH_STATE && returnedState !== process.env.XERO_OAUTH_STATE) {
    return sendHtml(res, 403, renderMessage('State check failed', [
      'The callback state did not match XERO_OAUTH_STATE.',
      'Open /api/xero/start again so NoA can generate the correct authorization request.'
    ]));
  }

  if (!code) {
    return sendHtml(res, 400, renderMessage('Missing Xero code', [
      'No authorization code was provided.',
      'Start the flow from https://no-a.vercel.app/api/xero/start.'
    ]));
  }

  if (!process.env.XERO_CLIENT_ID || !process.env.XERO_CLIENT_SECRET) {
    return sendHtml(res, 500, renderMessage('Xero app credentials are missing', [
      'Add XERO_CLIENT_ID and XERO_CLIENT_SECRET in Vercel environment variables.',
      'Redeploy NoA, then start again from /api/xero/start.'
    ]));
  }

  try {
    const redirectUri = getRedirectUri(req);
    const token = await exchangeCodeForToken(code, redirectUri);
    if (!token.ok) {
      return sendHtml(res, 502, renderMessage('Xero token exchange failed', [
        token.message,
        'Confirm the redirect URI in your Xero app exactly matches https://no-a.vercel.app/api/xero/callback.'
      ]));
    }

    const tenants = await getXeroTenants(token.accessToken);
    const preferredTenant = tenants[0] || {};

    return sendHtml(res, 200, renderSuccess({
      refreshToken: token.refreshToken,
      tenantId: preferredTenant.tenantId || '',
      tenantName: preferredTenant.tenantName || preferredTenant.tenantId || 'Xero tenant',
      redirectUri
    }));
  } catch (caught) {
    return sendHtml(res, 500, renderMessage('Xero setup failed', [
      caught instanceof Error ? caught.message : 'Unknown Xero setup error.'
    ]));
  }
}

function getAction(req) {
  const queryAction = req.query?.action;
  if (Array.isArray(queryAction)) return queryAction[0] || '';
  if (queryAction) return String(queryAction);

  const pathname = new URL(req.url || '/', `https://${req.headers.host || 'no-a.vercel.app'}`).pathname;
  return pathname.split('/').filter(Boolean).pop() || '';
}

async function exchangeCodeForToken(code, redirectUri) {
  const credentials = Buffer.from(`${process.env.XERO_CLIENT_ID}:${process.env.XERO_CLIENT_SECRET}`).toString('base64');
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri
  });

  const response = await fetch('https://identity.xero.com/connect/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'content-type': 'application/x-www-form-urlencoded',
      Accept: 'application/json'
    },
    body
  });

  const text = await safeReadText(response);
  if (!response.ok) {
    return {
      ok: false,
      message: `Xero rejected the authorization code with status ${response.status}. ${summariseApiError(text)}`
    };
  }

  const data = JSON.parse(text);
  return {
    ok: true,
    accessToken: data.access_token || '',
    refreshToken: data.refresh_token || ''
  };
}

async function getXeroTenants(accessToken) {
  if (!accessToken) return [];
  const response = await fetch('https://api.xero.com/connections', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json'
    }
  });

  if (!response.ok) return [];
  return response.json();
}

function getRedirectUri(req) {
  if (process.env.XERO_REDIRECT_URI) return process.env.XERO_REDIRECT_URI;
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'no-a.vercel.app';
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  return `${protocol}://${host}/api/xero/callback`;
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

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function sendHtml(res, status, html) {
  res.statusCode = status;
  res.setHeader('content-type', 'text/html; charset=utf-8');
  res.end(html);
}

function renderMessage(title, lines) {
  return page(title, `<div class="panel"><h1>${escapeHtml(title)}</h1>${lines.map((line) => `<p>${escapeHtml(line)}</p>`).join('')}</div>`);
}

function renderSuccess({ refreshToken, tenantId, tenantName, redirectUri }) {
  const envBlock = [
    `XERO_REFRESH_TOKEN=${refreshToken}`,
    tenantId ? `XERO_TENANT_ID=${tenantId}` : '',
    `XERO_REDIRECT_URI=${redirectUri}`
  ].filter(Boolean).join('\n');

  return page('Xero connected', `
    <div class="panel">
      <p class="eyebrow">NoA Xero setup</p>
      <h1>Xero connected</h1>
      <p>NoA received a refresh token for <strong>${escapeHtml(tenantName)}</strong>. Copy these values into Vercel Environment Variables, then redeploy NoA.</p>
      <label>Vercel env values</label>
      <textarea readonly>${escapeHtml(envBlock)}</textarea>
      <div class="actions">
        <a href="/">Return to NoA</a>
        <a href="/integrations">Open integrations</a>
      </div>
      <p class="warning">Treat the refresh token like a password. This page does not save it into Vercel automatically.</p>
    </div>
  `);
}

function page(title, body) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)} - NoA Xero</title>
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
    textarea { width: 100%; min-height: 180px; border: 0; border-radius: 18px; outline: 0; background: rgba(0,0,0,.36); color: #dbeafe; font: 14px/1.6 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; padding: 16px; resize: vertical; }
    .actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 18px; }
    a { border-radius: 999px; background: #dff3ff; color: #061018; display: inline-flex; font-weight: 800; padding: 12px 16px; text-decoration: none; }
    a + a { background: rgba(255,255,255,.1); color: #eef4ff; }
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
