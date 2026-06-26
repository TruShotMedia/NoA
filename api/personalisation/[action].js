const {
  getNoaPersonalisationSettings,
  methodNotAllowed,
  requireNoaAuth,
  saveNoaPersonalisationSettings,
  sendJson
} = require('../../lib/noa');

module.exports = async function handler(req, res) {
  const action = String(req.query?.action || '').replace(/\.json$/, '');
  if (!requireNoaAuth(req, res)) return;

  if (action === 'settings') {
    if (req.method === 'GET') return sendJson(res, 200, await getNoaPersonalisationSettings());
    if (req.method === 'POST') return sendJson(res, 200, await saveNoaPersonalisationSettings(req));
    return methodNotAllowed(res);
  }

  return sendJson(res, 404, {
    ok: false,
    message: 'Unknown personalisation route. Use /api/personalisation/settings.'
  });
};
