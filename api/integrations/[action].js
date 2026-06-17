const {
  getIntegrationSettings,
  handleNoaAuth,
  methodNotAllowed,
  readBody,
  requireNoaAuth,
  revealIntegrationSetting,
  saveIntegrationSettings,
  sendJson,
  testAllIntegrations,
  testIntegration
} = require('../../lib/noa');

module.exports = async function handler(req, res) {
  const action = getAction(req);

  if (req.method === 'POST') {
    const body = await readBody(req);
    req.body = body;
    if (['unlock', 'lock'].includes(String(body.action || ''))) {
      return sendJson(res, 200, await handleNoaAuth(req, res));
    }
  }

  if (!requireNoaAuth(req, res)) return;

  if (action === 'settings') {
    if (req.method === 'GET') return sendJson(res, 200, getIntegrationSettings());
    if (req.method === 'POST') return sendJson(res, 200, saveIntegrationSettings());
    return methodNotAllowed(res);
  }

  if (action === 'reveal') {
    if (req.method !== 'POST') return methodNotAllowed(res);
    return sendJson(res, 200, revealIntegrationSetting());
  }

  if (action === 'test') {
    if (req.method !== 'POST') return methodNotAllowed(res);
    return sendJson(res, 200, await testIntegration(req.body || {}));
  }

  if (action === 'test-all') {
    if (req.method !== 'POST') return methodNotAllowed(res);
    return sendJson(res, 200, await testAllIntegrations());
  }

  return sendJson(res, 404, {
    ok: false,
    message: 'Unknown integrations route. Use /api/integrations/settings, /api/integrations/reveal, /api/integrations/test, or /api/integrations/test-all.'
  });
};

function getAction(req) {
  const queryAction = req.query?.action;
  if (Array.isArray(queryAction)) return queryAction[0] || '';
  if (queryAction) return String(queryAction);
  const pathname = new URL(req.url || '/', `https://${req.headers.host || 'no-a.vercel.app'}`).pathname;
  return pathname.split('/').filter(Boolean).pop() || '';
}
