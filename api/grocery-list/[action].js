const {
  getPublicGroceryListSummary,
  manageGroceryItem,
  methodNotAllowed,
  sendJson
} = require('../../lib/noa');

module.exports = async function handler(req, res) {
  const action = String(req.query?.action || '').replace(/\.json$/, '');

  if (action === 'summary') {
    if (req.method !== 'GET') return methodNotAllowed(res);
    return sendJson(res, 200, await getPublicGroceryListSummary());
  }

  if (action === 'item') {
    if (req.method !== 'POST') return methodNotAllowed(res);
    return sendJson(res, 200, await manageGroceryItem(req));
  }

  return sendJson(res, 404, {
    ok: false,
    message: 'Unknown grocery list route. Use /api/grocery-list/summary or /api/grocery-list/item.'
  });
};
