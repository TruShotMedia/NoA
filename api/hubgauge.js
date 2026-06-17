const { getHubGaugePayload, methodNotAllowed, requireNoaAuth, sendJson } = require('../lib/noa');

function hasHubGaugeToken(req) {
  const expected = process.env.HUBGAUGE_DEVICE_TOKEN || '';
  if (!expected) return false;
  return String(req.headers.authorization || '') === `Bearer ${expected}`;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res);
  if (!hasHubGaugeToken(req) && !requireNoaAuth(req, res)) return;
  return sendJson(res, 200, await getHubGaugePayload());
};
