const http = require('http');
const fs = require('fs');
const path = require('path');

loadDotEnv(path.join(__dirname, '.env'));

const relayPort = Number(process.env.HUE_RELAY_PORT || 8787);
const relaySecret = String(process.env.HUE_RELAY_SECRET || '').trim();
const bridgeUrl = String(process.env.HUE_BRIDGE_URL || '').trim().replace(/\/$/, '');
const hueUsername = String(process.env.HUE_USERNAME || '').trim();
const allowSelfSigned = String(process.env.HUE_ALLOW_SELF_SIGNED || '').toLowerCase() === 'true';

if (allowSelfSigned) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const server = http.createServer(async (req, res) => {
  setCors(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'GET' && req.url === '/health') {
    sendJson(res, 200, {
      ok: true,
      message: 'NoA Hue Relay is running.',
      configured: Boolean(bridgeUrl && hueUsername && relaySecret),
      bridgeUrl: bridgeUrl ? maskBridgeUrl(bridgeUrl) : '',
      port: relayPort
    });
    return;
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { ok: false, message: 'Use POST / with the NoA Hue payload.' });
    return;
  }

  if (!relaySecret) {
    sendJson(res, 500, { ok: false, message: 'HUE_RELAY_SECRET is missing from hue-relay/.env.' });
    return;
  }

  if (String(req.headers['x-noa-hue-secret'] || '') !== relaySecret) {
    sendJson(res, 401, { ok: false, message: 'Hue relay secret did not match.' });
    return;
  }

  if (!bridgeUrl || !hueUsername) {
    sendJson(res, 500, { ok: false, message: 'HUE_BRIDGE_URL or HUE_USERNAME is missing from hue-relay/.env.' });
    return;
  }

  try {
    const body = await readJson(req);
    const action = String(body.action || '').trim();
    const payload = body.payload || {};

    if (action === 'status') {
      sendJson(res, 200, await getHueReport({ includeLights: false }));
      return;
    }

    if (action === 'lights') {
      sendJson(res, 200, await getHueReport({ includeLights: true }));
      return;
    }

    if (action === 'control') {
      sendJson(res, 200, await controlHue(payload));
      return;
    }

    sendJson(res, 400, { ok: false, message: `Unknown Hue relay action: ${action || 'none'}.` });
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      message: error instanceof Error ? error.message : 'Hue relay failed.'
    });
  }
});

server.listen(relayPort, '0.0.0.0', () => {
  console.log(`NoA Hue Relay listening on http://127.0.0.1:${relayPort}`);
  console.log(`Health check: http://127.0.0.1:${relayPort}/health`);
  console.log(`Bridge: ${bridgeUrl ? maskBridgeUrl(bridgeUrl) : 'not configured'}`);
});

async function getHueReport({ includeLights }) {
  const [configResponse, lightsResponse, groupsResponse] = await Promise.all([
    hueFetch(`/api/${encodeURIComponent(hueUsername)}/config`),
    hueFetch(`/api/${encodeURIComponent(hueUsername)}/lights`),
    hueFetch(`/api/${encodeURIComponent(hueUsername)}/groups`)
  ]);

  const [bridgeConfig, rawLights, rawGroups] = await Promise.all([
    configResponse.json().catch(() => null),
    lightsResponse.json().catch(() => null),
    groupsResponse.json().catch(() => null)
  ]);

  const error = extractHueApiError(bridgeConfig) || extractHueApiError(rawLights) || extractHueApiError(rawGroups);
  if (!configResponse.ok || !lightsResponse.ok || !groupsResponse.ok || error) {
    return {
      ok: false,
      mode: 'proxy',
      message: error || 'Hue Bridge rejected the relay status request.',
      bridge: null,
      lights: [],
      groups: [],
      fetchedAt: new Date().toISOString()
    };
  }

  const lights = normaliseHueLights(rawLights);
  const groups = normaliseHueGroups(rawGroups, lights);
  return {
    ok: true,
    mode: 'proxy',
    message: `Hue relay reached ${lights.length} light${lights.length === 1 ? '' : 's'}.`,
    bridge: {
      name: bridgeConfig?.name || 'Philips Hue Bridge',
      model: bridgeConfig?.modelid || '',
      softwareVersion: bridgeConfig?.swversion || '',
      ipAddress: bridgeConfig?.ipaddress || ''
    },
    lights: includeLights ? lights : lights.slice(0, 8),
    groups,
    fetchedAt: new Date().toISOString()
  };
}

async function controlHue(payload) {
  const targetType = payload.targetType === 'group' ? 'group' : 'light';
  const targetId = String(payload.targetId || payload.id || '').trim();
  const state = normaliseHueState(payload.state || {});

  if (!targetId) return { ok: false, message: 'Choose a Hue target first.' };
  if (!Object.keys(state).length) return { ok: false, message: 'No Hue state change was provided.' };

  const route = targetType === 'group'
    ? `/api/${encodeURIComponent(hueUsername)}/groups/${encodeURIComponent(targetId)}/action`
    : `/api/${encodeURIComponent(hueUsername)}/lights/${encodeURIComponent(targetId)}/state`;

  const response = await hueFetch(route, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(state)
  });
  const data = await response.json().catch(() => null);
  const error = extractHueApiError(data);

  if (!response.ok || error) {
    return {
      ok: false,
      message: error || `Hue Bridge rejected the update with status ${response.status}.`,
      raw: data
    };
  }

  return {
    ok: true,
    message: targetType === 'group' ? 'Hue room updated.' : 'Hue light updated.',
    raw: data
  };
}

function hueFetch(route, options = {}) {
  return fetch(`${bridgeUrl}${route}`, options);
}

function normaliseHueLights(rawLights) {
  if (!rawLights || typeof rawLights !== 'object' || Array.isArray(rawLights)) return [];
  return Object.entries(rawLights).map(([id, light]) => ({
    id,
    name: light?.name || `Light ${id}`,
    type: light?.type || '',
    modelId: light?.modelid || '',
    manufacturer: light?.manufacturername || '',
    on: Boolean(light?.state?.on),
    reachable: light?.state?.reachable !== false,
    brightness: typeof light?.state?.bri === 'number' ? Math.round((light.state.bri / 254) * 100) : 0,
    colorTemperature: light?.state?.ct || null,
    hue: light?.state?.hue || null,
    saturation: light?.state?.sat || null,
    lastUpdated: light?.state?.lastupdated || ''
  }));
}

function normaliseHueGroups(rawGroups, lights = []) {
  if (!rawGroups || typeof rawGroups !== 'object' || Array.isArray(rawGroups)) return [];
  const lightById = Object.fromEntries(lights.map((light) => [light.id, light]));
  return Object.entries(rawGroups)
    .filter(([, group]) => Array.isArray(group?.lights) && group.lights.length)
    .map(([id, group]) => {
      const groupLights = group.lights.map((lightId) => lightById[lightId]).filter(Boolean);
      return {
        id,
        name: group?.name || `Room ${id}`,
        type: group?.type || '',
        className: group?.class || '',
        on: Boolean(group?.state?.any_on || groupLights.some((light) => light.on)),
        allOn: Boolean(group?.state?.all_on || (groupLights.length && groupLights.every((light) => light.on))),
        lights: group.lights,
        activeLights: groupLights.filter((light) => light.on).length,
        lightCount: group.lights.length,
        brightness: groupLights.length
          ? Math.round(groupLights.reduce((sum, light) => sum + (light.brightness || 0), 0) / groupLights.length)
          : 0
      };
    });
}

function normaliseHueState(input) {
  const state = {};
  if (typeof input.on === 'boolean') state.on = input.on;
  if (typeof input.brightness === 'number') state.bri = Math.max(1, Math.min(254, Math.round((input.brightness / 100) * 254)));
  if (typeof input.bri === 'number') state.bri = Math.max(1, Math.min(254, Math.round(input.bri)));
  if (typeof input.colorTemperature === 'number') state.ct = Math.max(153, Math.min(500, Math.round(input.colorTemperature)));
  if (typeof input.ct === 'number') state.ct = Math.max(153, Math.min(500, Math.round(input.ct)));
  if (typeof input.hue === 'number') state.hue = Math.max(0, Math.min(65535, Math.round(input.hue)));
  if (typeof input.saturation === 'number') state.sat = Math.max(0, Math.min(254, Math.round(input.saturation)));
  if (typeof input.sat === 'number') state.sat = Math.max(0, Math.min(254, Math.round(input.sat)));
  return state;
}

function extractHueApiError(data) {
  if (Array.isArray(data)) {
    const item = data.find((entry) => entry?.error);
    if (item?.error) return item.error.description || item.error.type || 'Hue returned an error.';
  }
  if (data?.error) return data.error.description || data.error.message || 'Hue returned an error.';
  return '';
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const text = Buffer.concat(chunks).toString('utf8');
      if (!text) return resolve({});
      try {
        resolve(JSON.parse(text));
      } catch (error) {
        reject(new Error('Hue relay received invalid JSON.'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function setCors(res) {
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-methods', 'GET,POST,OPTIONS');
  res.setHeader('access-control-allow-headers', 'content-type,x-noa-hue-secret');
}

function maskBridgeUrl(value) {
  try {
    const url = new URL(value);
    return `${url.protocol}//${url.hostname}`;
  } catch {
    return value;
  }
}

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index <= 0) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}
