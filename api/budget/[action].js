const {
  getBudgetSummary,
  manageBudgetItem,
  saveBudgetEmailSettings,
  sendBudgetTenantEmail,
  methodNotAllowed,
  sendJson
} = require('../../lib/noa');

module.exports = async function handler(req, res) {
  const action = String(req.query?.action || '').replace(/\.json$/, '');

  if (action === 'summary') {
    if (req.method !== 'GET') return methodNotAllowed(res);
    return sendJson(res, 200, await getBudgetSummary());
  }

  if (action === 'item') {
    if (req.method !== 'POST') return methodNotAllowed(res);
    return sendJson(res, 200, await manageBudgetItem(req));
  }

  if (action === 'email-settings') {
    if (req.method !== 'POST') return methodNotAllowed(res);
    return sendJson(res, 200, await saveBudgetEmailSettings(req));
  }

  if (action === 'tenant-email') {
    if (req.method !== 'POST') return methodNotAllowed(res);
    return sendJson(res, 200, await sendBudgetTenantEmail(req));
  }

  return sendJson(res, 404, {
    ok: false,
    message: 'Unknown budget route. Use /api/budget/summary, /api/budget/item, /api/budget/email-settings, or /api/budget/tenant-email.'
  });
};
