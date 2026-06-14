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
  if (action === 'summary') return getXeroSummary(req, res);

  return sendJson(res, 404, {
    ok: false,
    message: 'Unknown Xero route. Use /api/xero/start or /api/xero/callback.'
  });
};

async function getXeroSummary(req, res) {
  if (req.method !== 'GET') {
    return sendJson(res, 405, { ok: false, message: 'Method not allowed.' });
  }

  if (!process.env.XERO_CLIENT_ID || !process.env.XERO_CLIENT_SECRET || !process.env.XERO_REFRESH_TOKEN) {
    return sendJson(res, 200, {
      ok: false,
      message: 'Xero needs XERO_CLIENT_ID, XERO_CLIENT_SECRET, and XERO_REFRESH_TOKEN in Vercel environment variables.',
      ...emptySummary()
    });
  }

  try {
    const token = await refreshXeroAccessToken();
    if (!token.ok) {
      return sendJson(res, 200, { ok: false, message: token.message, ...emptySummary() });
    }

    const tenant = await resolveXeroTenant(token.accessToken);
    if (!tenant.tenantId) {
      return sendJson(res, 200, {
        ok: false,
        message: 'Xero connected, but no tenant was returned for this refresh token.',
        ...emptySummary()
      });
    }

    const [organisationResult, invoicesResult, contactsResult] = await Promise.all([
      getXeroJson(token.accessToken, tenant.tenantId, '/Organisation'),
      getXeroJson(token.accessToken, tenant.tenantId, '/Invoices?page=1&order=UpdatedDateUTC%20DESC'),
      getXeroJson(token.accessToken, tenant.tenantId, '/Contacts?page=1&order=UpdatedDateUTC%20DESC')
    ]);

    if (!organisationResult.ok && !invoicesResult.ok && !contactsResult.ok) {
      return sendJson(res, 200, {
        ok: false,
        message: organisationResult.message || invoicesResult.message || contactsResult.message || 'Xero did not return account data.',
        ...emptySummary()
      });
    }

    const invoices = (invoicesResult.data?.Invoices || []).map(mapInvoice).filter((invoice) => invoice.id);
    const contacts = (contactsResult.data?.Contacts || []).map(mapContact).filter((contact) => contact.id);
    const organisation = mapOrganisation(organisationResult.data?.Organisations?.[0], tenant);

    return sendJson(res, 200, {
      ok: true,
      message: 'Xero account summary loaded.',
      fetchedAt: new Date().toISOString(),
      organisation,
      totals: buildInvoiceTotals(invoices),
      invoices: invoices.slice(0, 18),
      contacts: contacts.slice(0, 12),
      warnings: [
        organisationResult.ok ? '' : organisationResult.message,
        invoicesResult.ok ? '' : invoicesResult.message,
        contactsResult.ok ? '' : contactsResult.message
      ].filter(Boolean)
    });
  } catch (caught) {
    return sendJson(res, 200, {
      ok: false,
      message: caught instanceof Error ? caught.message : 'Unknown Xero summary error.',
      ...emptySummary()
    });
  }
}

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

async function refreshXeroAccessToken() {
  const credentials = Buffer.from(`${process.env.XERO_CLIENT_ID}:${process.env.XERO_CLIENT_SECRET}`).toString('base64');
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: process.env.XERO_REFRESH_TOKEN || ''
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
      message: `Xero token refresh failed with status ${response.status}. ${summariseApiError(text)}`
    };
  }

  const data = JSON.parse(text);
  return {
    ok: true,
    accessToken: data.access_token || ''
  };
}

async function resolveXeroTenant(accessToken) {
  if (process.env.XERO_TENANT_ID) {
    return { tenantId: process.env.XERO_TENANT_ID, tenantName: '' };
  }

  const tenants = await getXeroTenants(accessToken);
  return tenants[0] || {};
}

async function getXeroJson(accessToken, tenantId, path) {
  const response = await fetch(`https://api.xero.com/api.xro/2.0${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'xero-tenant-id': tenantId,
      Accept: 'application/json'
    }
  });

  const text = await safeReadText(response);
  if (!response.ok) {
    return {
      ok: false,
      data: null,
      message: `Xero request failed with status ${response.status}. ${summariseApiError(text)}`
    };
  }

  return { ok: true, data: text ? JSON.parse(text) : {}, message: '' };
}

function emptySummary() {
  return {
    fetchedAt: '',
    organisation: null,
    totals: {
      invoiceCount: 0,
      amountDue: 0,
      overdueAmount: 0,
      overdueCount: 0,
      draftCount: 0,
      awaitingPaymentCount: 0,
      paidCount: 0
    },
    invoices: [],
    contacts: [],
    warnings: []
  };
}

function mapOrganisation(organisation, tenant) {
  if (!organisation && !tenant) return null;
  return {
    name: organisation?.Name || tenant?.tenantName || 'Xero organisation',
    legalName: organisation?.LegalName || '',
    countryCode: organisation?.CountryCode || '',
    baseCurrency: organisation?.BaseCurrency || '',
    organisationType: organisation?.OrganisationType || '',
    shortCode: organisation?.ShortCode || '',
    tenantId: tenant?.tenantId || ''
  };
}

function mapInvoice(invoice) {
  const dueDate = normalizeXeroDate(invoice.DueDateString || invoice.DueDate);
  const status = invoice.Status || '';
  const amountDue = numberValue(invoice.AmountDue);
  return {
    id: invoice.InvoiceID || '',
    number: invoice.InvoiceNumber || invoice.Reference || 'Draft invoice',
    contact: invoice.Contact?.Name || '',
    status,
    type: invoice.Type || '',
    dueDate,
    updatedAt: normalizeXeroDate(invoice.UpdatedDateUTC),
    total: numberValue(invoice.Total),
    amountDue,
    currencyCode: invoice.CurrencyCode || '',
    isOverdue: Boolean(dueDate && amountDue > 0 && dueDate < localDateString()),
    url: invoice.InvoiceID ? `https://go.xero.com/AccountsReceivable/View.aspx?InvoiceID=${invoice.InvoiceID}` : ''
  };
}

function mapContact(contact) {
  const balances = contact.Balances || {};
  const accountsReceivable = balances.AccountsReceivable || {};
  return {
    id: contact.ContactID || '',
    name: contact.Name || '',
    email: contact.EmailAddress || '',
    phone: readContactPhone(contact.Phones),
    isCustomer: Boolean(contact.IsCustomer),
    isSupplier: Boolean(contact.IsSupplier),
    outstanding: numberValue(accountsReceivable.Outstanding),
    overdue: numberValue(accountsReceivable.Overdue),
    updatedAt: normalizeXeroDate(contact.UpdatedDateUTC)
  };
}

function buildInvoiceTotals(invoices) {
  return invoices.reduce((totals, invoice) => {
    totals.invoiceCount += 1;
    totals.amountDue += invoice.amountDue;
    if (invoice.isOverdue) {
      totals.overdueAmount += invoice.amountDue;
      totals.overdueCount += 1;
    }
    if (invoice.status === 'DRAFT') totals.draftCount += 1;
    if (invoice.status === 'AUTHORISED' && invoice.amountDue > 0) totals.awaitingPaymentCount += 1;
    if (invoice.status === 'PAID') totals.paidCount += 1;
    return totals;
  }, {
    invoiceCount: 0,
    amountDue: 0,
    overdueAmount: 0,
    overdueCount: 0,
    draftCount: 0,
    awaitingPaymentCount: 0,
    paidCount: 0
  });
}

function readContactPhone(phones = []) {
  const preferred = phones.find((phone) => phone.PhoneNumber) || {};
  return [preferred.PhoneAreaCode, preferred.PhoneNumber].filter(Boolean).join(' ');
}

function numberValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function normalizeXeroDate(value) {
  if (!value) return '';
  const text = String(value);
  const jsonDateMatch = /\/Date\((\d+)/.exec(text);
  if (jsonDateMatch) return new Date(Number(jsonDateMatch[1])).toISOString().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
}

function localDateString() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Brisbane',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
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
