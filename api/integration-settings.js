const { getIntegrationSettings, handleNoaAuth, methodNotAllowed, readBody, requireNoaAuth, saveIntegrationSettings, sendJson } = require('../lib/noa');

module.exports = async function handler(req, res) {
  if (req.method === 'POST') {
    const body = await readBody(req);
    req.body = body;
    if (['unlock', 'lock'].includes(String(body.action || ''))) {
      return sendJson(res, 200, await handleNoaAuth(req, res));
    }
  }

  if (!requireNoaAuth(req, res)) return;
  if (req.method === 'GET') return sendJson(res, 200, getIntegrationSettings());
  if (req.method === 'POST') return sendJson(res, 200, saveIntegrationSettings());
  return methodNotAllowed(res);
};
