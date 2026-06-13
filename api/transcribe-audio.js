const { methodNotAllowed, sendJson } = require('./_shared/noa');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res);
  return sendJson(res, 200, {
    ok: false,
    text: '',
    message: 'Voice features are disabled in the GitHub/Vercel build.'
  });
};
