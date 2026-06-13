const { methodNotAllowed, sendJson, testAllIntegrations } = require('./_shared/noa');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res);
  return sendJson(res, 200, await testAllIntegrations());
};
