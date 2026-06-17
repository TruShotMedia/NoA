const { requireNoaAuth } = require('../../lib/noa');

const DEFAULT_SCOPES = [
  'offline_access',
  'accounting.settings.read',
  'accounting.contacts.read',
  'accounting.invoices.read',
  'accounting.invoices'
].join(' ');

module.exports = async function handler(req, res) {
  const action = getAction(req);
  if (!requireNoaAuth(req, res)) return;

  if (action === 'start') return startXero(req, res);
  if (action === 'callback') return handleXeroCallback(req, res);
  if (action === 'summary') return getXeroSummary(req, res);
  if (action === 'invoice-detail') return getXeroInvoiceDetail(req, res);
  if (action === 'invoice-pdf') return getXeroInvoicePdf(req, res);
  if (action === 'draft-invoice') return createXeroDraftInvoice(req, res);

  return sendJson(res, 404, {
    ok: false,
    message: 'Unknown Xero route. Use /api/xero/start or /api/xero/callback.'
  });
};

async function getXeroSummary(req, res) {
  if (req.method !== 'GET') {
    return sendJson(res, 405, { ok: false, message: 'Method not allowed.' });
  }

  const storedRefreshToken = await getStoredXeroRefreshToken();
  if (!process.env.XERO_CLIENT_ID || !process.env.XERO_CLIENT_SECRET || !storedRefreshToken) {
    return sendJson(res, 200, {
      ok: false,
      message: 'Xero needs XERO_CLIENT_ID, XERO_CLIENT_SECRET, and a valid refresh token. Reconnect Xero from /api/xero/start if the previous token was consumed.',
      ...emptySummary()
    });
  }

  try {
    const token = await refreshXeroAccessToken(storedRefreshToken);
    if (!token.ok) {
      return sendJson(res, 200, { ok: false, message: token.message, ...emptySummary() });
    }
    const tokenSave = token.refreshToken ? await saveStoredXeroRefreshToken(token.refreshToken) : { ok: true, message: '' };

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
      getXeroInvoices(token.accessToken, tenant.tenantId),
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
    const customerInvoices = invoices.filter((invoice) => invoice.direction === 'income');
    const supplierBills = invoices.filter((invoice) => invoice.direction === 'expense');
    const contacts = (contactsResult.data?.Contacts || []).map(mapContact).filter((contact) => contact.id);
    const organisation = mapOrganisation(organisationResult.data?.Organisations?.[0], tenant);
    const analytics = buildXeroAnalytics(invoices);

    return sendJson(res, 200, {
      ok: true,
      message: 'Xero account summary loaded.',
      fetchedAt: new Date().toISOString(),
      organisation,
      totals: buildInvoiceTotals(invoices),
      analytics,
      invoices: invoices
        .slice()
        .sort((a, b) => (b.updatedAt || b.invoiceDate || '').localeCompare(a.updatedAt || a.invoiceDate || ''))
        .slice(0, 30),
      customerInvoices: customerInvoices
        .slice()
        .sort((a, b) => (b.updatedAt || b.invoiceDate || '').localeCompare(a.updatedAt || a.invoiceDate || ''))
        .slice(0, 30),
      supplierBills: supplierBills
        .slice()
        .sort((a, b) => (b.updatedAt || b.invoiceDate || '').localeCompare(a.updatedAt || a.invoiceDate || ''))
        .slice(0, 30),
      contacts: contacts.slice(0, 12),
      warnings: [
        tokenSave.ok ? '' : tokenSave.message,
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

async function getXeroInvoicePdf(req, res) {
  if (req.method !== 'GET') {
    return sendJson(res, 405, { ok: false, message: 'Method not allowed.' });
  }

  const requestUrl = new URL(req.url || '/', `https://${req.headers.host || 'no-a.vercel.app'}`);
  const invoiceId = requestUrl.searchParams.get('id') || '';
  if (!invoiceId) return sendJson(res, 400, { ok: false, message: 'No invoice id was provided.' });

  const storedRefreshToken = await getStoredXeroRefreshToken();
  if (!process.env.XERO_CLIENT_ID || !process.env.XERO_CLIENT_SECRET || !storedRefreshToken) {
    return sendJson(res, 400, { ok: false, message: 'Xero is not connected.' });
  }

  try {
    const token = await refreshXeroAccessToken(storedRefreshToken);
    if (!token.ok) return sendJson(res, 400, { ok: false, message: token.message });
    if (token.refreshToken) await saveStoredXeroRefreshToken(token.refreshToken);

    const tenant = await resolveXeroTenant(token.accessToken);
    if (!tenant.tenantId) return sendJson(res, 400, { ok: false, message: 'No Xero tenant was returned.' });

    const response = await fetch(`https://api.xero.com/api.xro/2.0/Invoices/${encodeURIComponent(invoiceId)}`, {
      headers: {
        Authorization: `Bearer ${token.accessToken}`,
        'xero-tenant-id': tenant.tenantId,
        Accept: 'application/pdf'
      }
    });

    if (!response.ok) {
      const text = await safeReadText(response);
      return sendJson(res, response.status, {
        ok: false,
        message: `Xero could not return the invoice PDF. ${summariseApiError(text)}`
      });
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    res.statusCode = 200;
    res.setHeader('content-type', 'application/pdf');
    res.setHeader('content-disposition', `inline; filename="xero-invoice-${invoiceId}.pdf"`);
    res.end(bytes);
  } catch (caught) {
    return sendJson(res, 500, {
      ok: false,
      message: caught instanceof Error ? caught.message : 'Unknown Xero PDF error.'
    });
  }
}

async function createXeroDraftInvoice(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { ok: false, message: 'Method not allowed.' });
  }

  const payload = await readJsonBody(req);
  const contactName = String(payload.contactName || '').trim();
  const reference = String(payload.reference || '').trim();
  const dueDate = String(payload.dueDate || '').trim();
  const lineItems = Array.isArray(payload.lineItems) ? payload.lineItems : [];

  if (!contactName) return sendJson(res, 400, { ok: false, message: 'A Xero contact/customer name is required.' });
  if (lineItems.length === 0) return sendJson(res, 400, { ok: false, message: 'At least one invoice line item is required.' });

  const cleanLineItems = lineItems.map((item) => ({
    Description: String(item.description || '').trim() || 'Service',
    Quantity: Math.max(1, numberValue(item.quantity) || 1),
    UnitAmount: Math.max(0, numberValue(item.unitAmount)),
    AccountCode: String(item.accountCode || process.env.XERO_DEFAULT_SALES_ACCOUNT_CODE || '200').trim(),
    TaxType: String(item.taxType || process.env.XERO_DEFAULT_TAX_TYPE || 'OUTPUT').trim()
  })).filter((item) => item.Description && item.UnitAmount >= 0);

  if (cleanLineItems.length === 0) return sendJson(res, 400, { ok: false, message: 'Invoice line items were empty after validation.' });

  try {
    const context = await getXeroRequestContext();
    if (!context.ok) return sendJson(res, 400, context);

    const invoiceDate = localDateString();
    const body = {
      Invoices: [
        {
          Type: 'ACCREC',
          Status: 'DRAFT',
          Contact: { Name: contactName },
          Date: invoiceDate,
          DueDate: dueDate || addPlainDays(invoiceDate, 14),
          Reference: reference || undefined,
          LineAmountTypes: 'Exclusive',
          LineItems: cleanLineItems
        }
      ]
    };

    const response = await fetch('https://api.xero.com/api.xro/2.0/Invoices', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${context.accessToken}`,
        'xero-tenant-id': context.tenantId,
        'content-type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(body)
    });

    const text = await safeReadText(response);
    if (!response.ok) {
      return sendJson(res, response.status, {
        ok: false,
        message: `Xero rejected the draft invoice. ${summariseApiError(text)}`
      });
    }

    const data = text ? JSON.parse(text) : {};
    const invoice = mapInvoice((data.Invoices || [])[0] || {});
    return sendJson(res, 200, {
      ok: true,
      message: `Draft invoice ${invoice.number || invoice.reference || ''} created in Xero.`.trim(),
      invoice
    });
  } catch (caught) {
    return sendJson(res, 500, {
      ok: false,
      message: caught instanceof Error ? caught.message : 'Unknown Xero draft invoice error.'
    });
  }
}

async function getXeroInvoiceDetail(req, res) {
  if (req.method !== 'GET') {
    return sendJson(res, 405, { ok: false, message: 'Method not allowed.' });
  }

  const requestUrl = new URL(req.url || '/', `https://${req.headers.host || 'no-a.vercel.app'}`);
  const invoiceId = requestUrl.searchParams.get('id') || '';
  if (!invoiceId) return sendJson(res, 400, { ok: false, message: 'No invoice id was provided.' });

  try {
    const context = await getXeroRequestContext();
    if (!context.ok) return sendJson(res, 400, context);

    const result = await getXeroJson(context.accessToken, context.tenantId, `/Invoices/${encodeURIComponent(invoiceId)}`);
    if (!result.ok) return sendJson(res, 400, { ok: false, message: result.message });

    const invoice = mapInvoice((result.data?.Invoices || [])[0] || {});
    return sendJson(res, 200, { ok: true, invoice });
  } catch (caught) {
    return sendJson(res, 500, {
      ok: false,
      message: caught instanceof Error ? caught.message : 'Unknown Xero invoice detail error.'
    });
  }
}

async function getXeroRequestContext() {
  const storedRefreshToken = await getStoredXeroRefreshToken();
  if (!process.env.XERO_CLIENT_ID || !process.env.XERO_CLIENT_SECRET || !storedRefreshToken) {
    return { ok: false, message: 'Xero is not connected.' };
  }

  const token = await refreshXeroAccessToken(storedRefreshToken);
  if (!token.ok) return { ok: false, message: token.message };
  if (token.refreshToken) await saveStoredXeroRefreshToken(token.refreshToken);

  const tenant = await resolveXeroTenant(token.accessToken);
  if (!tenant.tenantId) return { ok: false, message: 'No Xero tenant was returned.' };

  return { ok: true, accessToken: token.accessToken, tenantId: tenant.tenantId };
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
    const tokenSave = token.refreshToken ? await saveStoredXeroRefreshToken(token.refreshToken) : { ok: false, message: 'No refresh token was returned by Xero.' };

    return sendHtml(res, 200, renderSuccess({
      refreshToken: token.refreshToken,
      tenantId: preferredTenant.tenantId || '',
      tenantName: preferredTenant.tenantName || preferredTenant.tenantId || 'Xero tenant',
      redirectUri,
      tokenSave
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

async function refreshXeroAccessToken(refreshToken) {
  const credentials = Buffer.from(`${process.env.XERO_CLIENT_ID}:${process.env.XERO_CLIENT_SECRET}`).toString('base64');
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken || ''
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
      message: `Xero token refresh failed with status ${response.status}. ${summariseApiError(text)} If the message says the refresh token was consumed, open /api/xero/start and approve Xero again.`
    };
  }

  const data = JSON.parse(text);
  return {
    ok: true,
    accessToken: data.access_token || '',
    refreshToken: data.refresh_token || ''
  };
}

async function getStoredXeroRefreshToken() {
  const stored = await readPrivateSetting('xero_refresh_token');
  return stored || process.env.XERO_REFRESH_TOKEN || '';
}

async function saveStoredXeroRefreshToken(refreshToken) {
  if (!refreshToken) return { ok: false, message: 'Xero did not return a replacement refresh token.' };
  if (!canUsePrivateSettingsStore()) {
    return {
      ok: false,
      message: 'Xero returned a replacement refresh token, but NoA cannot save it automatically until SUPABASE_SERVICE_ROLE_KEY and the noa_private_settings table are configured.'
    };
  }

  return writePrivateSetting('xero_refresh_token', refreshToken);
}

function canUsePrivateSettingsStore() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

async function readPrivateSetting(key) {
  if (!canUsePrivateSettingsStore()) return '';

  try {
    const baseUrl = new URL(process.env.SUPABASE_URL).origin;
    const response = await fetch(`${baseUrl}/rest/v1/noa_private_settings?key=eq.${encodeURIComponent(key)}&select=value&limit=1`, {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        Accept: 'application/json'
      }
    });

    if (!response.ok) return '';
    const rows = await response.json();
    return rows[0]?.value || '';
  } catch {
    return '';
  }
}

async function writePrivateSetting(key, value) {
  try {
    const baseUrl = new URL(process.env.SUPABASE_URL).origin;
    const response = await fetch(`${baseUrl}/rest/v1/noa_private_settings?on_conflict=key`, {
      method: 'POST',
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'content-type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal'
      },
      body: JSON.stringify({
        key,
        value,
        updated_at: new Date().toISOString()
      })
    });

    if (!response.ok) {
      const body = await safeReadText(response);
      return {
        ok: false,
        message: `NoA refreshed Xero for this request, but could not save the replacement refresh token. ${summariseApiError(body)}`
      };
    }

    return { ok: true, message: 'Saved rotating Xero refresh token.' };
  } catch (caught) {
    return {
      ok: false,
      message: caught instanceof Error ? caught.message : 'Could not save the replacement Xero refresh token.'
    };
  }
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

async function getXeroInvoices(accessToken, tenantId) {
  const invoices = [];
  const errors = [];

  for (let page = 1; page <= 4; page += 1) {
    const result = await getXeroJson(accessToken, tenantId, `/Invoices?page=${page}&order=UpdatedDateUTC%20DESC`);
    if (!result.ok) {
      errors.push(result.message);
      break;
    }

    const pageInvoices = result.data?.Invoices || [];
    invoices.push(...pageInvoices);
    if (pageInvoices.length < 100) break;
  }

  return {
    ok: errors.length === 0 || invoices.length > 0,
    data: { Invoices: invoices },
    message: errors[0] || ''
  };
}

function emptySummary() {
  return {
    fetchedAt: '',
    organisation: null,
    totals: {
      invoiceCount: 0,
      billCount: 0,
      amountDue: 0,
      billsDue: 0,
      overdueAmount: 0,
      overdueBillsAmount: 0,
      overdueCount: 0,
      overdueBillsCount: 0,
      draftCount: 0,
      draftBillsCount: 0,
      awaitingPaymentCount: 0,
      awaitingPaymentBillsCount: 0,
      paidCount: 0
    },
    analytics: emptyAnalytics(),
    invoices: [],
    customerInvoices: [],
    supplierBills: [],
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
  const invoiceDate = normalizeXeroDate(invoice.DateString || invoice.Date);
  const dueDate = normalizeXeroDate(invoice.DueDateString || invoice.DueDate);
  const status = invoice.Status || '';
  const amountDue = numberValue(invoice.AmountDue);
  const contact = invoice.Contact || {};
  const type = String(invoice.Type || '').toUpperCase();
  const isBill = type === 'ACCPAY';
  const isCustomerInvoice = type === 'ACCREC';
  return {
    id: invoice.InvoiceID || '',
    number: invoice.InvoiceNumber || invoice.Reference || (isBill ? 'Draft bill' : 'Draft invoice'),
    reference: invoice.Reference || '',
    contact: contact.Name || '',
    contactId: contact.ContactID || '',
    status,
    type,
    direction: isBill ? 'expense' : 'income',
    recordKind: isBill ? 'bill' : 'invoice',
    counterpartyRole: isBill ? 'supplier' : 'client',
    counterpartyLabel: isBill ? 'Supplier' : 'Client',
    isBill,
    isCustomerInvoice,
    invoiceDate,
    dueDate,
    updatedAt: normalizeXeroDate(invoice.UpdatedDateUTC),
    subTotal: numberValue(invoice.SubTotal),
    totalTax: numberValue(invoice.TotalTax),
    total: numberValue(invoice.Total),
    amountDue,
    amountPaid: numberValue(invoice.AmountPaid),
    amountCredited: numberValue(invoice.AmountCredited),
    currencyCode: invoice.CurrencyCode || '',
    fullyPaidOnDate: normalizeXeroDate(invoice.FullyPaidOnDate),
    isOverdue: Boolean(dueDate && amountDue > 0 && dueDate < localDateString()),
    lineItems: (invoice.LineItems || []).map(mapInvoiceLineItem).filter((item) => item.description || item.itemCode),
    url: invoice.InvoiceID
      ? isBill
        ? `https://go.xero.com/AccountsPayable/View.aspx?InvoiceID=${invoice.InvoiceID}`
        : `https://go.xero.com/AccountsReceivable/View.aspx?InvoiceID=${invoice.InvoiceID}`
      : ''
  };
}

function mapInvoiceLineItem(lineItem) {
  return {
    id: lineItem.LineItemID || '',
    description: lineItem.Description || '',
    itemCode: lineItem.ItemCode || '',
    quantity: numberValue(lineItem.Quantity),
    unitAmount: numberValue(lineItem.UnitAmount),
    taxAmount: numberValue(lineItem.TaxAmount),
    lineAmount: numberValue(lineItem.LineAmount),
    accountCode: lineItem.AccountCode || '',
    taxType: lineItem.TaxType || ''
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
    if (invoice.direction === 'expense') {
      totals.billCount += 1;
      totals.billsDue += invoice.amountDue;
      if (invoice.isOverdue) {
        totals.overdueBillsAmount += invoice.amountDue;
        totals.overdueBillsCount += 1;
      }
      if (invoice.status === 'DRAFT') totals.draftBillsCount += 1;
      if (invoice.status === 'AUTHORISED' && invoice.amountDue > 0) totals.awaitingPaymentBillsCount += 1;
      return totals;
    }

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
    billCount: 0,
    amountDue: 0,
    billsDue: 0,
    overdueAmount: 0,
    overdueBillsAmount: 0,
    overdueCount: 0,
    overdueBillsCount: 0,
    draftCount: 0,
    draftBillsCount: 0,
    awaitingPaymentCount: 0,
    awaitingPaymentBillsCount: 0,
    paidCount: 0
  });
}

function emptyAnalytics() {
  return {
    monthlyRevenue: [],
    monthlyBills: [],
    statusBreakdown: [],
    billStatusBreakdown: [],
    topClients: [],
    topSuppliers: [],
    overdueAging: [
      { label: '1-30 days', count: 0, amount: 0 },
      { label: '31-60 days', count: 0, amount: 0 },
      { label: '61-90 days', count: 0, amount: 0 },
      { label: '90+ days', count: 0, amount: 0 }
    ]
  };
}

function buildXeroAnalytics(invoices) {
  const activeSet = invoices.filter((invoice) => !['VOIDED', 'DELETED'].includes(invoice.status));
  const invoiceSet = activeSet.filter((invoice) => invoice.direction !== 'expense');
  const billSet = activeSet.filter((invoice) => invoice.direction === 'expense');
  return {
    monthlyRevenue: buildMonthlyRevenue(invoiceSet),
    monthlyBills: buildMonthlyRevenue(billSet),
    statusBreakdown: buildStatusBreakdown(invoiceSet),
    billStatusBreakdown: buildStatusBreakdown(billSet),
    topClients: buildTopClients(invoiceSet),
    topSuppliers: buildTopClients(billSet),
    overdueAging: buildOverdueAging(invoiceSet)
  };
}

function buildMonthlyRevenue(invoices) {
  const months = [];
  const now = new Date();
  for (let index = 5; index >= 0; index -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - index, 1));
    const key = date.toISOString().slice(0, 7);
    months.push({
      key,
      label: date.toLocaleString('en-AU', { month: 'short', timeZone: 'UTC' }),
      total: 0,
      paid: 0,
      outstanding: 0
    });
  }

  const byKey = new Map(months.map((month) => [month.key, month]));
  for (const invoice of invoices) {
    const key = (invoice.invoiceDate || '').slice(0, 7);
    const month = byKey.get(key);
    if (!month) continue;
    month.total += invoice.total;
    if (invoice.status === 'PAID') month.paid += invoice.total;
    month.outstanding += invoice.amountDue;
  }

  return months;
}

function buildStatusBreakdown(invoices) {
  const totals = new Map();
  for (const invoice of invoices) {
    const key = invoice.status || 'UNKNOWN';
    const current = totals.get(key) || { status: key, count: 0, amount: 0 };
    current.count += 1;
    current.amount += invoice.total;
    totals.set(key, current);
  }

  return Array.from(totals.values()).sort((a, b) => b.amount - a.amount).slice(0, 8);
}

function buildTopClients(invoices) {
  const totals = new Map();
  for (const invoice of invoices) {
    const key = invoice.contact || 'Unknown customer';
    const current = totals.get(key) || { name: key, revenue: 0, outstanding: 0, overdue: 0, invoiceCount: 0 };
    current.revenue += invoice.total;
    current.outstanding += invoice.amountDue;
    if (invoice.isOverdue) current.overdue += invoice.amountDue;
    current.invoiceCount += 1;
    totals.set(key, current);
  }

  return Array.from(totals.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 8);
}

function buildOverdueAging(invoices) {
  const buckets = emptyAnalytics().overdueAging;
  const today = localDateString();
  for (const invoice of invoices) {
    if (!invoice.isOverdue || !invoice.dueDate) continue;
    const days = daysBetween(invoice.dueDate, today);
    const bucket = days <= 30 ? buckets[0] : days <= 60 ? buckets[1] : days <= 90 ? buckets[2] : buckets[3];
    bucket.count += 1;
    bucket.amount += invoice.amountDue;
  }
  return buckets;
}

function daysBetween(start, end) {
  const [startYear, startMonth, startDay] = start.split('-').map(Number);
  const [endYear, endMonth, endDay] = end.split('-').map(Number);
  const startDate = Date.UTC(startYear, startMonth - 1, startDay);
  const endDate = Date.UTC(endYear, endMonth - 1, endDay);
  return Math.max(0, Math.floor((endDate - startDate) / 86400000));
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

function addPlainDays(dateString, days) {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString('utf8');
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
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

function renderSuccess({ refreshToken, tenantId, tenantName, redirectUri, tokenSave }) {
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
      ${tokenSave?.ok ? '<p class="success">NoA also saved the rotating refresh token to Supabase for future syncs.</p>' : `<p class="warning">${escapeHtml(tokenSave?.message || 'NoA could not save the rotating refresh token automatically yet.')}</p>`}
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
