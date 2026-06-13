const { getNotionJobs, methodNotAllowed, sendJson } = require('./_shared/noa');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res);
  return sendJson(res, 200, await getNotionJobs());
};
