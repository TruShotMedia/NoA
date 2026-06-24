const {
  getBudgetSummary,
  manageBudgetItem,
  manageGroceryItem,
  saveBudgetSettings,
  saveBudgetProfile,
  saveBudgetEmailSettings,
  sendBudgetTenantEmail,
  runBudgetTenantEmailSchedule,
  methodNotAllowed,
  requireNoaAuth,
  sendJson
} = require('../../lib/noa');

module.exports = async function handler(req, res) {
  const action = String(req.query?.action || '').replace(/\.json$/, '');
  if (!requireNoaAuth(req, res, { allowCron: action === 'tenant-email-schedule' })) return;

  if (action === 'summary') {
    if (req.method !== 'GET') return methodNotAllowed(res);
    return sendJson(res, 200, await getBudgetSummary());
  }

  if (action === 'item') {
    if (req.method !== 'POST') return methodNotAllowed(res);
    return sendJson(res, 200, await manageBudgetItem(req));
  }

  if (action === 'grocery') {
    if (req.method !== 'POST') return methodNotAllowed(res);
    return sendJson(res, 200, await manageGroceryItem(req));
  }

  if (action === 'profile') {
    if (req.method !== 'POST') return methodNotAllowed(res);
    return sendJson(res, 200, await saveBudgetProfile(req));
  }

  if (action === 'email-settings') {
    if (req.method !== 'POST') return methodNotAllowed(res);
    return sendJson(res, 200, await saveBudgetEmailSettings(req));
  }

  if (action === 'settings') {
    if (req.method !== 'POST') return methodNotAllowed(res);
    return sendJson(res, 200, await saveBudgetSettings(req));
  }

  if (action === 'tenant-email') {
    if (req.method !== 'POST') return methodNotAllowed(res);
    return sendJson(res, 200, await sendBudgetTenantEmail(req));
  }

  if (action === 'tenant-email-schedule') {
    if (!['GET', 'POST'].includes(req.method)) return methodNotAllowed(res);
    return sendJson(res, 200, await runBudgetTenantEmailSchedule(req));
  }

  return sendJson(res, 404, {
    ok: false,
    message: 'Unknown budget route. Use /api/budget/summary, /api/budget/item, /api/budget/grocery, /api/budget/profile, /api/budget/settings, /api/budget/email-settings, /api/budget/tenant-email, or /api/budget/tenant-email-schedule.'
  });
};
