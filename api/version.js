const { handleNoaAuth, methodNotAllowed, sendJson } = require('../lib/noa');

module.exports = async function handler(req, res) {
  if (req.method === 'POST') return sendJson(res, 200, await handleNoaAuth(req, res));
  if (req.method !== 'GET') return methodNotAllowed(res);

  return sendJson(res, 200, {
    version: '0.1.0',
    platform: 'vercel',
    phase: 'Cloud deployment',
    auth: 'pin-cookie'
  });
};
