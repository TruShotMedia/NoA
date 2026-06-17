const { sendJson } = require('../../lib/noa');

const SPOTIFY_SCOPES = [
  'user-read-currently-playing',
  'user-read-playback-state'
].join(' ');

module.exports = async function handler(req, res) {
  const action = getAction(req);

  if (action === 'start') return startSpotify(req, res);
  if (action === 'callback') return handleSpotifyCallback(req, res);
  if (action === 'test') return testSpotify(req, res);

  return sendJson(res, 404, {
    ok: false,
    message: 'Unknown Spotify route. Use /api/spotify/start, /api/spotify/callback, or /api/spotify/test.'
  });
};

function startSpotify(req, res) {
  if (req.method !== 'GET') return sendJson(res, 405, { ok: false, message: 'Method not allowed.' });
  if (!process.env.SPOTIFY_CLIENT_ID) {
    return sendHtml(res, 500, renderMessage('Spotify is not ready', [
      'SPOTIFY_CLIENT_ID is missing from Vercel environment variables.',
      'Add SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in Vercel, redeploy, then open this URL again.'
    ]));
  }

  const redirectUri = getRedirectUri(req);
  const state = process.env.SPOTIFY_OAUTH_STATE || 'noa-hubgauge-spotify';
  const url = new URL('https://accounts.spotify.com/authorize');
  url.searchParams.set('client_id', process.env.SPOTIFY_CLIENT_ID);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', SPOTIFY_SCOPES);
  url.searchParams.set('state', state);
  url.searchParams.set('show_dialog', 'true');

  res.statusCode = 302;
  res.setHeader('location', url.toString());
  res.end();
}

async function handleSpotifyCallback(req, res) {
  if (req.method !== 'GET') return sendJson(res, 405, { ok: false, message: 'Method not allowed.' });

  const requestUrl = new URL(req.url || '/', `https://${req.headers.host || 'no-a.vercel.app'}`);
  const error = requestUrl.searchParams.get('error');
  const code = requestUrl.searchParams.get('code');
  const state = requestUrl.searchParams.get('state');
  const expectedState = process.env.SPOTIFY_OAUTH_STATE || 'noa-hubgauge-spotify';

  if (error) {
    return sendHtml(res, 400, renderMessage('Spotify did not approve access', [
      `Spotify returned: ${error}`,
      'Go back to /api/spotify/start and try again.'
    ]));
  }

  if (state !== expectedState) {
    return sendHtml(res, 403, renderMessage('State check failed', [
      'The Spotify OAuth state did not match. Restart the Spotify connection from /api/spotify/start.'
    ]));
  }

  if (!code) {
    return sendHtml(res, 400, renderMessage('Missing Spotify code', [
      'Spotify did not return an authorization code. Restart from /api/spotify/start.'
    ]));
  }

  if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
    return sendHtml(res, 500, renderMessage('Spotify app credentials are missing', [
      'SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET is missing from Vercel environment variables.'
    ]));
  }

  const redirectUri = getRedirectUri(req);
  const token = await exchangeCodeForToken(code, redirectUri);
  if (!token.ok) {
    return sendHtml(res, 502, renderMessage('Spotify token exchange failed', [token.message]));
  }

  return sendHtml(res, 200, renderSuccess({ refreshToken: token.refreshToken, redirectUri }));
}

async function testSpotify(req, res) {
  if (req.method !== 'GET') return sendJson(res, 405, { ok: false, message: 'Method not allowed.' });
  if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET || !process.env.SPOTIFY_REFRESH_TOKEN) {
    return sendJson(res, 200, {
      ok: false,
      message: 'Add SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, and SPOTIFY_REFRESH_TOKEN to Vercel, then redeploy.'
    });
  }

  const token = await refreshAccessToken();
  return sendJson(res, 200, {
    ok: token.ok,
    message: token.ok ? 'Spotify can refresh an access token.' : token.message
  });
}

async function exchangeCodeForToken(code, redirectUri) {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      authorization: `Basic ${Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
      'content-type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri
    })
  });

  const text = await safeReadText(response);
  if (!response.ok) return { ok: false, message: `Spotify token exchange failed with ${response.status}. ${summariseApiError(text)}` };
  const data = JSON.parse(text);
  return {
    ok: true,
    accessToken: data.access_token || '',
    refreshToken: data.refresh_token || ''
  };
}

async function refreshAccessToken() {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      authorization: `Basic ${Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
      'content-type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: process.env.SPOTIFY_REFRESH_TOKEN
    })
  });

  const text = await safeReadText(response);
  if (!response.ok) return { ok: false, message: `Spotify refresh failed with ${response.status}. ${summariseApiError(text)}` };
  return { ok: true, accessToken: JSON.parse(text).access_token || '' };
}

function getAction(req) {
  const queryAction = req.query?.action;
  if (Array.isArray(queryAction)) return queryAction[0] || '';
  if (queryAction) return String(queryAction);
  const pathname = new URL(req.url || '/', `https://${req.headers.host || 'no-a.vercel.app'}`).pathname;
  return pathname.split('/').filter(Boolean).pop() || '';
}

function getRedirectUri(req) {
  if (process.env.SPOTIFY_REDIRECT_URI) return process.env.SPOTIFY_REDIRECT_URI;
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'no-a.vercel.app';
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  return `${protocol}://${host}/api/spotify/callback`;
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

function renderSuccess({ refreshToken, redirectUri }) {
  const envBlock = [
    `SPOTIFY_REFRESH_TOKEN=${refreshToken || 'Spotify did not return a refresh token. Restart from /api/spotify/start.'}`,
    `SPOTIFY_REDIRECT_URI=${redirectUri}`
  ].join('\n');

  return page('Spotify connected', `
    <div class="panel">
      <p class="eyebrow">NoA HubGauge setup</p>
      <h1>Spotify connected</h1>
      <p>NoA received permission to read your current Spotify playback state for HubGauge.</p>
      <label>Copy these into Vercel environment variables</label>
      <textarea readonly>${escapeHtml(envBlock)}</textarea>
      <div class="actions">
        <a href="/">Return to NoA</a>
        <a href="/api/spotify/test">Test Spotify refresh</a>
      </div>
      <p class="warning">Treat the refresh token like a password. After adding it to Vercel, redeploy NoA so HubGauge can read it.</p>
    </div>
  `);
}

function page(title, body) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)} - NoA Spotify</title>
  <style>
    :root { color-scheme: dark; }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; background: radial-gradient(circle at 30% 0%, rgba(52,211,153,.2), transparent 34%), #070b12; color: #eef4ff; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    main { max-width: 860px; margin: 0 auto; padding: 56px 22px; }
    .panel { border: 1px solid rgba(255,255,255,.1); border-radius: 24px; background: rgba(255,255,255,.06); box-shadow: 0 22px 80px rgba(0,0,0,.34); padding: 28px; }
    .eyebrow { color: #86efac; font-size: 12px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
    h1 { margin: 0 0 14px; font-size: clamp(32px, 5vw, 52px); }
    p { color: rgba(238,244,255,.78); line-height: 1.6; }
    label { display: block; margin: 22px 0 9px; color: rgba(238,244,255,.88); font-weight: 800; }
    textarea { width: 100%; min-height: 150px; border: 0; border-radius: 18px; outline: 0; background: rgba(0,0,0,.36); color: #dbeafe; font: 14px/1.6 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; padding: 16px; resize: vertical; }
    .actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 18px; }
    a { border-radius: 999px; background: #dff3ff; color: #061018; display: inline-flex; font-weight: 800; padding: 12px 16px; text-decoration: none; }
    a + a { background: rgba(255,255,255,.1); color: #eef4ff; }
    .warning { border-radius: 16px; background: rgba(251,191,36,.12); color: #fde68a; padding: 12px 14px; }
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
  })[char]);
}
