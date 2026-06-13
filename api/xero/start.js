const DEFAULT_SCOPES = [
  'offline_access',
  'accounting.settings.read',
  'accounting.contacts.read',
  'accounting.invoices.read'
].join(' ');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ ok: false, message: 'Method not allowed.' }));
    return;
  }

  if (!process.env.XERO_CLIENT_ID) {
    sendHtml(res, 500, renderMessage('Xero is not ready', [
      'XERO_CLIENT_ID is missing from Vercel environment variables.',
      'Add XERO_CLIENT_ID and XERO_CLIENT_SECRET in Vercel, redeploy, then open this URL again.'
    ]));
    return;
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
};

function getRedirectUri(req) {
  if (process.env.XERO_REDIRECT_URI) return process.env.XERO_REDIRECT_URI;
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'no-a.vercel.app';
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  return `${protocol}://${host}/api/xero/callback`;
}

function sendHtml(res, status, html) {
  res.statusCode = status;
  res.setHeader('content-type', 'text/html; charset=utf-8');
  res.end(html);
}

function renderMessage(title, lines) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)} - NoA Xero</title>
  <style>
    body { margin: 0; background: #070b12; color: #eef4ff; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    main { max-width: 760px; margin: 0 auto; padding: 56px 22px; }
    section { border: 1px solid rgba(255,255,255,.1); border-radius: 22px; background: rgba(255,255,255,.055); padding: 28px; }
    p { color: rgba(238,244,255,.76); line-height: 1.6; }
  </style>
</head>
<body><main><section><h1>${escapeHtml(title)}</h1>${lines.map((line) => `<p>${escapeHtml(line)}</p>`).join('')}</section></main></body>
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
