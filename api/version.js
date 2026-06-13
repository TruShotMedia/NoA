const { sendJson } = require('./_shared/noa');

module.exports = async function handler(_req, res) {
  return sendJson(res, 200, {
    version: '0.1.0',
    platform: 'vercel',
    phase: 'Cloud deployment'
  });
};
