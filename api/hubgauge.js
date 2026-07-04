const { getHubGaugePayload, getHubGaugeScreensaverImage, methodNotAllowed, requireNoaAuth, sendJson } = require('../lib/noa');

function hasHubGaugeToken(req) {
  const expected = process.env.HUBGAUGE_DEVICE_TOKEN || '';
  if (!expected) return false;
  return String(req.headers.authorization || '') === `Bearer ${expected}`;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res);
  if (!hasHubGaugeToken(req) && !requireNoaAuth(req, res)) return;
  const screensaverId = String(req.query?.screensaver || '').trim();
  if (screensaverId) {
    const image = await getHubGaugeScreensaverImage(screensaverId);
    if (!image) return sendJson(res, 404, { ok: false, message: 'Screensaver image not found.' });
    if (image.redirectUrl) {
      res.statusCode = 302;
      res.setHeader('location', image.redirectUrl);
      res.setHeader('cache-control', 'private, max-age=300');
      res.end();
      return;
    }
    res.statusCode = 200;
    res.setHeader('content-type', image.contentType || 'image/jpeg');
    res.setHeader('cache-control', 'private, max-age=300');
    res.end(image.buffer);
    return;
  }
  return sendJson(res, 200, await getHubGaugePayload());
};
