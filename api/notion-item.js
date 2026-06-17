const { manageNotionItem, methodNotAllowed, readBody, requireNoaAuth, sendJson } = require('../lib/noa');

module.exports = async function handler(req, res) {
  if (!requireNoaAuth(req, res)) return;
  if (req.method !== 'POST') return methodNotAllowed(res);
  return sendJson(res, 200, await manageNotionItem(await readBody(req)));
};
