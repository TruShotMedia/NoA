const { methodNotAllowed, readBody, sendJson, updateNotionTaskStatus } = require('../lib/noa');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res);
  return sendJson(res, 200, await updateNotionTaskStatus(await readBody(req)));
};
