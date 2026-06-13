const { getIntegrationSettings, methodNotAllowed, saveIntegrationSettings, sendJson } = require('./_shared/noa');

module.exports = async function handler(req, res) {
  if (req.method === 'GET') return sendJson(res, 200, getIntegrationSettings());
  if (req.method === 'POST') return sendJson(res, 200, saveIntegrationSettings());
  return methodNotAllowed(res);
};
