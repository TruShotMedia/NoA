const { getIntegrationSettings, methodNotAllowed, requireNoaAuth, saveIntegrationSettings, sendJson } = require('../lib/noa');

module.exports = async function handler(req, res) {
  if (!requireNoaAuth(req, res)) return;
  if (req.method === 'GET') return sendJson(res, 200, getIntegrationSettings());
  if (req.method === 'POST') return sendJson(res, 200, saveIntegrationSettings());
  return methodNotAllowed(res);
};
