const { methodNotAllowed, readBody, sendJson, testIntegration } = require('../lib/noa');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res);
  return sendJson(res, 200, await testIntegration(await readBody(req)));
};
