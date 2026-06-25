const {
  controlHue,
  getHueLights,
  getHueStatus,
  methodNotAllowed,
  readBody,
  requireNoaAuth,
  sendJson
} = require('../../lib/noa');

module.exports = async function handler(req, res) {
  if (!requireNoaAuth(req, res)) return;

  const action = getAction(req);

  if (action === 'status') {
    if (req.method !== 'GET') return methodNotAllowed(res);
    return sendJson(res, 200, await getHueStatus());
  }

  if (action === 'lights') {
    if (req.method !== 'GET') return methodNotAllowed(res);
    return sendJson(res, 200, await getHueLights());
  }

  if (action === 'control') {
    if (req.method !== 'POST') return methodNotAllowed(res);
    const body = await readBody(req);
    return sendJson(res, 200, await controlHue(body));
  }

  return sendJson(res, 404, {
    ok: false,
    message: 'Unknown Hue route. Use /api/hue/status, /api/hue/lights, or /api/hue/control.'
  });
};

function getAction(req) {
  const queryAction = req.query?.action;
  if (Array.isArray(queryAction)) return queryAction[0] || '';
  if (queryAction) return String(queryAction);
  const pathname = new URL(req.url || '/', `https://${req.headers.host || 'no-a.vercel.app'}`).pathname;
  return pathname.split('/').filter(Boolean).pop() || '';
}
