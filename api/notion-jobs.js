const { getNotionJobs, methodNotAllowed, requireNoaAuth, sendJson } = require('../lib/noa');

module.exports = async function handler(req, res) {
  if (!requireNoaAuth(req, res)) return;
  if (req.method !== 'GET') return methodNotAllowed(res);
  return sendJson(res, 200, await getNotionJobs());
};
