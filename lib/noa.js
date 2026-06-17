const INTEGRATION_ENV_KEYS = {
  openai: [
    'OPENAI_API_KEY',
    'OPENAI_MODEL'
  ],
  supabase: ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'],
  n8n: ['N8N_WEBHOOK_URL', 'N8N_SHARED_SECRET'],
  notion: [
    'NOTION_TOKEN',
    'NOTION_DATABASE_ID',
    'NOTION_TASKS_DATABASE_ID',
    'NOTION_PIPELINE_VIEW_ID',
    'NOTION_TASKS_VIEW_ID',
    'NOTION_JOBS_DATABASE_ID'
  ],
  xero: ['XERO_CLIENT_ID', 'XERO_CLIENT_SECRET', 'XERO_REFRESH_TOKEN', 'XERO_TENANT_ID', 'XERO_REDIRECT_URI'],
  email: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GMAIL_REFRESH_TOKEN', 'GMAIL_SENDER_EMAIL', 'GMAIL_REDIRECT_URI', 'RESEND_API_KEY', 'BUDGET_EMAIL_FROM']
};

const SECRET_ENV_KEYS = new Set([
  'OPENAI_API_KEY',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'N8N_SHARED_SECRET',
  'NOTION_TOKEN',
  'XERO_CLIENT_SECRET',
  'XERO_REFRESH_TOKEN',
  'RESEND_API_KEY',
  'GOOGLE_CLIENT_SECRET',
  'GMAIL_REFRESH_TOKEN'
]);

const BUDGET_OWNER_EMAIL = 'info@fearlessau.com';
const BUDGET_TABLES = {
  income: 'ledger_income',
  expenses: 'ledger_expenses',
  debts: 'ledger_debts',
  mortgages: 'ledger_mortgages',
  mortgageExpenses: 'ledger_mortgage_expenses',
  assets: 'ledger_assets',
  savings: 'ledger_savings'
};

function getEnv() {
  return process.env;
}

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString('utf8');
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function methodNotAllowed(res) {
  sendJson(res, 405, { ok: false, message: 'Method not allowed.' });
}

async function askNoah(payload) {
  const env = getEnv();
  if (!env.OPENAI_API_KEY) {
    return {
      ok: false,
      text: 'I cannot reach OpenAI yet because OPENAI_API_KEY is missing from the Vercel environment.'
    };
  }

  try {
    const notionContext = env.NOTION_TOKEN ? await fetchNotionContext(env.NOTION_TOKEN, payload?.message || '') : [];
    const notionDatabaseIds = getNotionDatabaseIds(env);
    const notionJobs = env.NOTION_TOKEN && (notionDatabaseIds.tasksDatabaseId || notionDatabaseIds.jobsDatabaseId)
      ? await fetchNotionJobs(env.NOTION_TOKEN, notionDatabaseIds)
      : emptyNotionJobs(env.NOTION_TOKEN ? 'Notion database ids are missing.' : 'NOTION_TOKEN is missing.');

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: env.OPENAI_MODEL || 'gpt-4.1-mini',
        instructions: buildNoahInstructions(),
        input: buildNoahInput({ ...payload, notionContext, notionJobs, interactionMode: 'typed' })
      })
    });

    if (!response.ok) {
      const body = await safeReadText(response);
      return {
        ok: false,
        text: `I reached OpenAI, but the request was rejected with status ${response.status}. ${summariseApiError(body)}`
      };
    }

    const data = await response.json();
    const text = extractResponseText(data);
    const logResult = await logSupabaseEvent(env, {
      event_type: 'noah_response',
      source: 'noah',
      payload: {
        user_message: String(payload?.message || ''),
        response_text: text || '',
        task_count: notionJobs.tasks.length,
        upcoming_job_count: notionJobs.upcomingJobs.length,
        model: env.OPENAI_MODEL || 'gpt-4.1-mini',
        runtime: 'vercel'
      }
    });

    return {
      ok: true,
      text: text || 'I reached OpenAI, but no response text was returned.',
      logged: logResult.ok,
      logMessage: logResult.message
    };
  } catch (error) {
    return {
      ok: false,
      text: `I could not reach OpenAI from the Vercel backend. ${error instanceof Error ? error.message : 'Unknown error.'}`
    };
  }
}

function getIntegrationSettings() {
  const env = getEnv();
  return {
    loadedAt: new Date().toISOString(),
    runtime: 'vercel',
    integrations: Object.fromEntries(Object.entries(INTEGRATION_ENV_KEYS).map(([id, keys]) => [
      id,
      {
        id,
        fields: keys.map((key) => ({
          key,
          configured: Boolean(env[key]),
          maskedValue: env[key] ? maskEnvValue(env[key], SECRET_ENV_KEYS.has(key)) : '',
          displayValue: env[key] ? fieldDots(env[key]) : '',
          secret: SECRET_ENV_KEYS.has(key)
        }))
      }
    ]))
  };
}

function saveIntegrationSettings() {
  return {
    ok: false,
    message: 'Cloud NoA stores secrets in Vercel environment variables. Update them in Vercel, then redeploy.',
    settings: getIntegrationSettings()
  };
}

function revealIntegrationSetting() {
  return {
    ok: false,
    value: '',
    message: 'For deployed NoA, saved secrets are intentionally not revealable from the browser. Replace or inspect them in Vercel project settings.'
  };
}

async function testIntegration(payload = {}) {
  const integrationId = String(payload.integrationId || '');
  if (!INTEGRATION_ENV_KEYS[integrationId]) {
    return { checkedAt: new Date().toISOString(), result: missing(integrationId || 'unknown', 'Unknown', 'Unknown integration.') };
  }

  return {
    checkedAt: new Date().toISOString(),
    result: await testIntegrationById(integrationId, getEnv())
  };
}

async function testAllIntegrations() {
  const env = getEnv();
  return {
    checkedAt: new Date().toISOString(),
    results: await Promise.all(Object.keys(INTEGRATION_ENV_KEYS).map((id) => testIntegrationById(id, env)))
  };
}

async function testIntegrationById(id, env) {
  if (id === 'openai') return testOpenAI(env.OPENAI_API_KEY);
  if (id === 'supabase') return testSupabase(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  if (id === 'n8n') return testN8n(env.N8N_WEBHOOK_URL, env.N8N_SHARED_SECRET);
  if (id === 'notion') return testNotion(env.NOTION_TOKEN, getNotionDatabaseIds(env));
  if (id === 'xero') return testXero(env);
  if (id === 'email') return testEmail(env);
  return missing(id, id, 'Unknown integration.');
}

async function testOpenAI(apiKey) {
  if (!apiKey) return missing('openai', 'OpenAI', 'OPENAI_API_KEY is missing from Vercel environment variables.');

  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` }
    });

    return fromResponse('openai', 'OpenAI', response, response.ok ? 'API key accepted.' : 'OpenAI rejected the request.');
  } catch (error) {
    return failed('openai', 'OpenAI', error);
  }
}

async function testSupabase(url, anonKey) {
  if (!url || !anonKey) return missing('supabase', 'Supabase', 'SUPABASE_URL or SUPABASE_ANON_KEY is missing from Vercel environment variables.');

  try {
    const baseUrl = new URL(url).origin;
    const response = await fetch(`${baseUrl}/auth/v1/health`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`
      }
    });

    return fromResponse('supabase', 'Supabase', response, response.ok ? 'Supabase project reached.' : 'Supabase rejected the request.');
  } catch (error) {
    return failed('supabase', 'Supabase', error);
  }
}

async function testN8n(webhookUrl, sharedSecret) {
  if (!webhookUrl || !sharedSecret) return missing('n8n', 'n8n', 'N8N_WEBHOOK_URL or N8N_SHARED_SECRET is missing from Vercel environment variables.');

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-noa-secret': sharedSecret
      },
      body: JSON.stringify({
        source: 'noa',
        type: 'integration_test',
        message: 'NoA integration test',
        sent_at: new Date().toISOString()
      })
    });

    return fromResponse('n8n', 'n8n', response, response.ok ? 'Webhook accepted the test event.' : 'n8n rejected the webhook request.');
  } catch (error) {
    return failed('n8n', 'n8n', error);
  }
}

function getNotionDatabaseIds(env) {
  return {
    tasksDatabaseId: normalizeNotionDatabaseId(env.NOTION_TASKS_DATABASE_ID || env.NOTION_DATABASE_ID || '36ff2ec220f2808ba6a8cfa333adefb5'),
    pipelineViewId: normalizeNotionViewId(env.NOTION_PIPELINE_VIEW_ID || '36ff2ec220f280f18188000c8a4ed4e7'),
    tasksViewId: normalizeNotionViewId(env.NOTION_TASKS_VIEW_ID || '370f2ec220f2816791d9000c3aadc277'),
    jobsDatabaseId: normalizeNotionDatabaseId(env.NOTION_JOBS_DATABASE_ID || '36ff2ec220f280da9c3ac1072b0ef022')
  };
}

async function testNotion(token, databaseIds = {}) {
  if (!token) return missing('notion', 'Notion', 'NOTION_TOKEN is missing from Vercel environment variables.');
  const databaseId = databaseIds.tasksDatabaseId || databaseIds.jobsDatabaseId;

  try {
    const response = await fetch(databaseId
      ? `https://api.notion.com/v1/databases/${databaseId}/query`
      : 'https://api.notion.com/v1/users/me', {
      method: databaseId ? 'POST' : 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      ...(databaseId ? { body: JSON.stringify({ page_size: 1 }) } : {})
    });

    return fromResponse(
      'notion',
      'Notion',
      response,
      response.ok
        ? databaseId ? 'Notion token accepted and tasks database reached.' : 'Notion token accepted.'
        : databaseId ? 'Notion rejected the database request. Share the database with the integration if this persists.' : 'Notion rejected the request.'
    );
  } catch (error) {
    return failed('notion', 'Notion', error);
  }
}

async function testXero(env) {
  if (!env.XERO_CLIENT_ID || !env.XERO_CLIENT_SECRET) {
    return missing('xero', 'Xero', 'XERO_CLIENT_ID or XERO_CLIENT_SECRET is missing from Vercel environment variables.');
  }

  return {
    id: 'xero',
    name: 'Xero',
    ok: Boolean(env.XERO_REFRESH_TOKEN || (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY)),
    status: env.XERO_REFRESH_TOKEN || (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) ? 'configured' : 'missing',
    message: env.XERO_REFRESH_TOKEN || (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY)
      ? 'Xero credentials are configured. Use the Xero tab Sync button for the live accounting check so the rotating refresh token can be preserved.'
      : 'XERO_REFRESH_TOKEN is missing, or configure SUPABASE_SERVICE_ROLE_KEY with the private token store.'
  };
}

async function testEmail(env) {
  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && (env.GMAIL_REFRESH_TOKEN || (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY))) {
    const token = await getGmailAccessToken(env);
    return {
      id: 'email',
      name: 'Email',
      ok: token.ok,
      status: token.ok ? 'connected' : 'error',
      message: token.ok ? 'Gmail API is connected and can send mail.' : token.message
    };
  }

  if (!env.RESEND_API_KEY) return missing('email', 'Email', 'RESEND_API_KEY is missing from Vercel environment variables.');

  try {
    const response = await fetch('https://api.resend.com/domains', {
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`
      }
    });

    return fromResponse('email', 'Email', response, response.ok ? 'Resend API key accepted.' : 'Resend rejected the API key.');
  } catch (error) {
    return failed('email', 'Email', error);
  }
}

function fromResponse(id, name, response, message) {
  return {
    id,
    name,
    ok: response.ok,
    status: response.status,
    message
  };
}

function missing(id, name, message) {
  return { id, name, ok: false, status: 'missing', message };
}

function failed(id, name, error) {
  return {
    id,
    name,
    ok: false,
    status: 'error',
    message: error instanceof Error ? error.message : 'Unknown connection error.'
  };
}

async function getNotionJobs() {
  const env = getEnv();
  const notionDatabaseIds = getNotionDatabaseIds(env);
  if (!env.NOTION_TOKEN || (!notionDatabaseIds.tasksDatabaseId && !notionDatabaseIds.jobsDatabaseId)) {
    return emptyNotionJobs(env.NOTION_TOKEN ? 'Notion database ids are missing.' : 'NOTION_TOKEN is missing.');
  }

  return fetchNotionJobs(env.NOTION_TOKEN, notionDatabaseIds);
}

async function updateNotionTaskStatus(payload = {}) {
  const env = getEnv();
  if (!env.NOTION_TOKEN) {
    return { ok: false, message: 'NOTION_TOKEN is missing from Vercel environment variables.' };
  }

  const pageId = String(payload.pageId || '').trim();
  const status = columnToStatus(String(payload.column || payload.status || '').trim());

  if (!pageId) return { ok: false, message: 'No Notion page id was provided.' };
  if (!status) return { ok: false, message: 'That pipeline column does not map to a known Notion status.' };

  try {
    const response = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${env.NOTION_TOKEN}`,
        'content-type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({
        properties: {
          Status: {
            status: {
              name: status
            }
          }
        }
      })
    });

    if (!response.ok) {
      const body = await safeReadText(response);
      return {
        ok: false,
        message: `Notion rejected the status update with ${response.status}. ${summariseApiError(body)}`
      };
    }

    const page = await response.json();
    return {
      ok: true,
      message: `Updated status to ${status}.`,
      task: mapNotionTask(page)
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Unknown Notion update error.'
    };
  }
}

async function manageNotionItem(payload = {}) {
  const env = getEnv();
  if (!env.NOTION_TOKEN) {
    return { ok: false, message: 'NOTION_TOKEN is missing from Vercel environment variables.' };
  }

  const kind = String(payload.kind || 'task');
  const action = String(payload.action || '');
  const id = String(payload.id || '').trim();
  const values = payload.values && typeof payload.values === 'object' ? payload.values : {};
  const notionDatabaseIds = getNotionDatabaseIds(env);
  const databaseId = kind === 'job' ? notionDatabaseIds.jobsDatabaseId : notionDatabaseIds.tasksDatabaseId;

  if (!['task', 'job'].includes(kind)) return { ok: false, message: 'Unknown Notion item type.' };
  if (!['create', 'update', 'archive'].includes(action)) return { ok: false, message: 'Unknown Notion action.' };
  if (action === 'create' && !databaseId) return { ok: false, message: `No Notion ${kind} database id is configured.` };
  if (action !== 'create' && !id) return { ok: false, message: 'No Notion page id was provided.' };

  try {
    if (action === 'archive') {
      const response = await patchNotionPage(env.NOTION_TOKEN, id, { archived: true });
      if (!response.ok) return response;
      return { ok: true, message: `${kind === 'job' ? 'Job' : 'Task'} archived.`, archived: true, id };
    }

    const properties = action === 'create'
      ? await buildCreateProperties(env.NOTION_TOKEN, databaseId, kind, values)
      : await buildUpdateProperties(env.NOTION_TOKEN, id, kind, values);

    if (!properties.ok) return properties;

    const body = action === 'create'
      ? { parent: { database_id: databaseId }, properties: properties.properties }
      : { properties: properties.properties };
    const response = action === 'create'
      ? await createNotionPage(env.NOTION_TOKEN, body)
      : await patchNotionPage(env.NOTION_TOKEN, id, body);

    if (!response.ok) return response;

    return {
      ok: true,
      message: `${kind === 'job' ? 'Job' : 'Task'} ${action === 'create' ? 'created' : 'updated'}.`,
      item: kind === 'job' ? mapNotionUpcomingJob(response.page) : mapNotionTask(response.page)
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Unknown Notion write error.'
    };
  }
}

async function createNotionPage(token, body) {
  const response = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: notionHeaders(token),
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const text = await safeReadText(response);
    return { ok: false, message: `Notion rejected the create request with ${response.status}. ${summariseApiError(text)}` };
  }

  return { ok: true, page: await response.json() };
}

async function patchNotionPage(token, pageId, body) {
  const response = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    method: 'PATCH',
    headers: notionHeaders(token),
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const text = await safeReadText(response);
    return { ok: false, message: `Notion rejected the update request with ${response.status}. ${summariseApiError(text)}` };
  }

  return { ok: true, page: await response.json() };
}

async function buildCreateProperties(token, databaseId, kind, values) {
  const schema = await getNotionDatabaseSchema(token, databaseId);
  if (!schema.ok) return schema;
  return {
    ok: true,
    properties: kind === 'job'
      ? buildJobProperties(schema.properties, values)
      : buildTaskProperties(schema.properties, values)
  };
}

async function buildUpdateProperties(token, pageId, kind, values) {
  const page = await fetchNotionPage(token, pageId);
  if (!page) return { ok: false, message: 'Could not load the Notion page before updating it.' };
  if (kind === 'task' && Object.prototype.hasOwnProperty.call(values, 'complete') && !findTaskCompleteCheckboxName(page.properties || {})) {
    return {
      ok: false,
      message: 'NoA could not find a Complete checkbox property on this Notion task. Add or rename the checkbox to Complete, Completed, Done, or Task complete.'
    };
  }
  return {
    ok: true,
    properties: kind === 'job'
      ? buildJobProperties(page.properties || {}, values, { partial: true })
      : buildTaskProperties(page.properties || {}, values, { partial: true })
  };
}

async function getNotionDatabaseSchema(token, databaseId) {
  const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Notion-Version': '2022-06-28'
    }
  });

  if (!response.ok) {
    const text = await safeReadText(response);
    return { ok: false, message: `Could not inspect the Notion database schema. ${summariseApiError(text)}` };
  }

  const database = await response.json();
  return { ok: true, properties: database.properties || {} };
}

function buildTaskProperties(schema, values, options = {}) {
  const properties = {};
  assignWhenPresent(properties, schema, values, options, 'title', assignTitle, ['Task name', 'Name']);
  assignWhenPresent(properties, schema, values, options, 'status', assignStatus, ['Status']);
  assignWhenPresent(properties, schema, values, options, 'priority', assignSelect, ['Priority']);
  assignWhenPresent(properties, schema, values, options, 'dueDate', assignDate, ['Due date']);
  assignWhenPresent(properties, schema, values, options, 'shootDate', assignDate, ['Shoot Date', 'Shoot date', 'Job date', 'Job Date']);
  assignWhenPresent(properties, schema, values, options, 'complete', assignCheckbox, ['Complete', 'Completed', 'Done', 'Task complete']);
  assignWhenPresent(properties, schema, values, options, 'effortLevel', assignSelect, ['Effort level']);
  assignWhenPresent(properties, schema, values, options, 'taskTypes', assignMultiSelect, ['Task type']);
  assignWhenPresent(properties, schema, values, options, 'description', assignRichText, ['Description']);
  assignWhenPresent(properties, schema, values, options, 'attachments', assignAttachments, ['Attachments', 'Attachment', 'Files', 'Links']);
  return properties;
}

function buildJobProperties(schema, values, options = {}) {
  const properties = {};
  assignWhenPresent(properties, schema, values, options, 'title', assignTitle, ['Job name', 'Job Name', 'Name', 'Task name']);
  assignWhenPresent(properties, schema, values, options, 'client', assignText, ['Client', 'Client name', 'Customer']);
  assignWhenPresent(properties, schema, values, options, 'status', assignStatus, ['Status']);
  assignWhenPresent(properties, schema, values, options, 'jobDate', assignDate, ['Job date', 'Job Date', 'Due date', 'Date', 'Shoot date', 'Scheduled date']);
  assignWhenPresent(properties, schema, values, options, 'priority', assignSelect, ['Priority']);
  assignWhenPresent(properties, schema, values, options, 'deliverableTypes', assignMultiSelect, ['Deliverable types', 'Deliverable Types', 'Task type', 'Type']);
  assignWhenPresent(properties, schema, values, options, 'location', assignText, ['Location', 'Venue']);
  assignWhenPresent(properties, schema, values, options, 'notes', assignRichText, ['Notes', 'Description', 'Details']);
  assignWhenPresent(properties, schema, values, options, 'attachments', assignAttachments, ['Attachments', 'Attachment', 'Files', 'Links']);
  return properties;
}

function assignWhenPresent(properties, schema, values, options, key, assigner, candidates) {
  if (options.partial && !Object.prototype.hasOwnProperty.call(values, key)) return;
  assigner(properties, schema, candidates, values[key]);
}

function findPropertyName(schema, candidates, acceptedTypes = []) {
  for (const name of candidates) {
    if (schema[name] && (!acceptedTypes.length || acceptedTypes.includes(schema[name].type))) return name;
  }
  for (const [name, property] of Object.entries(schema)) {
    if (acceptedTypes.includes(property?.type)) return name;
  }
  return '';
}

function assignTitle(properties, schema, candidates, value) {
  const name = findPropertyName(schema, candidates, ['title']);
  if (name && String(value || '').trim()) properties[name] = { title: [{ text: { content: String(value).trim() } }] };
}

function assignRichText(properties, schema, candidates, value) {
  const name = findPropertyName(schema, candidates, ['rich_text']);
  if (name) properties[name] = { rich_text: String(value || '').trim() ? [{ text: { content: String(value).trim() } }] : [] };
}

function assignText(properties, schema, candidates, value) {
  const name = findPropertyName(schema, candidates, ['rich_text', 'title', 'select']);
  if (!name || !String(value || '').trim()) return;
  if (schema[name]?.type === 'title') properties[name] = { title: [{ text: { content: String(value).trim() } }] };
  else if (schema[name]?.type === 'select') properties[name] = { select: { name: String(value).trim() } };
  else properties[name] = { rich_text: [{ text: { content: String(value).trim() } }] };
}

function assignAttachments(properties, schema, candidates, value) {
  const name = findNamedPropertyName(schema, candidates, ['files', 'url', 'rich_text']);
  if (!name) return;

  const links = parseAttachmentLinks(value);
  const propertyType = schema[name]?.type;
  if (propertyType === 'files') {
    properties[name] = {
      files: links.map((link, index) => ({
        name: link.name || `Attachment ${index + 1}`,
        type: 'external',
        external: { url: link.url }
      }))
    };
    return;
  }

  if (propertyType === 'url') {
    properties[name] = { url: links[0]?.url || null };
    return;
  }

  properties[name] = {
    rich_text: links.length
      ? [{ text: { content: links.map((link) => link.name ? `${link.name}: ${link.url}` : link.url).join('\n') } }]
      : []
  };
}

function findNamedPropertyName(schema, candidates, acceptedTypes = []) {
  for (const name of candidates) {
    if (schema[name] && (!acceptedTypes.length || acceptedTypes.includes(schema[name].type))) return name;
  }
  return '';
}

function assignStatus(properties, schema, candidates, value) {
  const name = findPropertyName(schema, candidates, ['status', 'select']);
  const status = normalizeNotionStatusName(value);
  if (!name || !status) return;
  if (schema[name]?.type === 'select') properties[name] = { select: { name: status } };
  else properties[name] = { status: { name: status } };
}

function assignSelect(properties, schema, candidates, value) {
  const name = findPropertyName(schema, candidates, ['select', 'status']);
  if (!name || !String(value || '').trim()) return;
  if (schema[name]?.type === 'status') properties[name] = { status: { name: String(value).trim() } };
  else properties[name] = { select: { name: String(value).trim() } };
}

function assignDate(properties, schema, candidates, value) {
  const name = findPropertyName(schema, candidates, ['date']);
  if (name) properties[name] = { date: String(value || '').trim() ? { start: String(value).trim() } : null };
}

function assignCheckbox(properties, schema, candidates, value) {
  const name = findTaskCompleteCheckboxName(schema, candidates);
  if (!name) return;
  properties[name] = { checkbox: value === true || String(value || '').toLowerCase() === 'true' };
}

function findTaskCompleteCheckboxName(schema, candidates = ['Complete', 'Completed', 'Done', 'Task complete']) {
  const named = findNamedPropertyName(schema, candidates, ['checkbox']);
  if (named) return named;
  for (const [name, property] of Object.entries(schema)) {
    if (property?.type === 'checkbox' && /complete|completed|done/i.test(name)) return name;
  }
  return '';
}

function assignMultiSelect(properties, schema, candidates, value) {
  const name = findPropertyName(schema, candidates, ['multi_select']);
  if (!name) return;
  const items = Array.isArray(value) ? value : String(value || '').split(',');
  properties[name] = {
    multi_select: items.map((item) => String(item).trim()).filter(Boolean).map((name) => ({ name }))
  };
}

function notionHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'content-type': 'application/json',
    'Notion-Version': '2022-06-28'
  };
}

async function getBudgetSummary() {
  const env = getEnv();
  const context = await getBudgetContext(env);
  if (!context.ok) return context;

  try {
    const [income, expenses, debts, mortgages, mortgageExpenses, assets, savings, settings] = await Promise.all([
      fetchBudgetTable(context, 'ledger_income'),
      fetchBudgetTable(context, 'ledger_expenses'),
      fetchBudgetTable(context, 'ledger_debts'),
      fetchBudgetTable(context, 'ledger_mortgages'),
      fetchBudgetTable(context, 'ledger_mortgage_expenses'),
      fetchBudgetTable(context, 'ledger_assets'),
      fetchBudgetTable(context, 'ledger_savings'),
      fetchBudgetSettings(context)
    ]);

    return {
      ok: true,
      message: `Budget loaded for ${context.owner.email}.`,
      fetchedAt: new Date().toISOString(),
      ...buildBudgetReport({ owner: context.owner, income, expenses, debts, mortgages, mortgageExpenses, assets, savings, settings }),
      tenantEmailActivity: normalizeBudgetEmailActivity(settings?.raw_data?.tenantEmailActivity || [])
    };
  } catch (error) {
    return emptyBudgetReport(error instanceof Error ? error.message : 'Could not load budget data.', context.owner);
  }
}

async function manageBudgetItem(req) {
  const env = getEnv();
  const context = await getBudgetContext(env);
  if (!context.ok) return context;

  const payload = await readBody(req);
  const action = String(payload.action || '');
  const kind = String(payload.kind || '');
  const table = BUDGET_TABLES[kind];
  const id = String(payload.id || '').trim();
  const values = payload.values && typeof payload.values === 'object' ? payload.values : {};

  if (!table) return { ok: false, message: 'Unknown budget item type.' };
  if (!['create', 'update', 'delete'].includes(action)) return { ok: false, message: 'Unknown budget action.' };
  if (action !== 'create' && !id) return { ok: false, message: 'No budget item id was provided.' };

  try {
    if (action === 'delete') {
      await supabaseRequest(context, `${table}?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(context.owner.userId)}`, { method: 'DELETE' });
      return { ok: true, message: 'Budget item deleted.' };
    }

    const row = normalizeBudgetWriteRow(kind, values, context.owner.userId);
    const result = action === 'create'
      ? await supabaseRequest(context, table, { method: 'POST', body: JSON.stringify(row), prefer: 'return=representation' })
      : await supabaseRequest(context, `${table}?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(context.owner.userId)}`, { method: 'PATCH', body: JSON.stringify(row), prefer: 'return=representation' });

    return {
      ok: true,
      message: action === 'create' ? 'Budget item created.' : 'Budget item updated.',
      item: Array.isArray(result) ? result[0] : result
    };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Could not update budget data.' };
  }
}

async function saveBudgetEmailSettings(req) {
  const env = getEnv();
  const context = await getBudgetContext(env);
  if (!context.ok) return context;

  const payload = await readBody(req);
  const settings = normalizeBudgetEmailSettings(payload.settings || payload);

  try {
    const current = await fetchBudgetSettings(context);
    const rawData = {
      ...(current?.raw_data && typeof current.raw_data === 'object' ? current.raw_data : {}),
      tenantEmail: settings
    };

    const result = await supabaseRequest(context, 'ledger_settings?on_conflict=user_id', {
      method: 'POST',
      body: JSON.stringify({
        user_id: context.owner.userId,
        default_mode: current?.default_mode || 'personal',
        raw_data: rawData,
        updated_at: new Date().toISOString()
      }),
      prefer: 'resolution=merge-duplicates,return=representation'
    });

    return {
      ok: true,
      message: 'Tenant email settings saved.',
      settings,
      row: Array.isArray(result) ? result[0] : result
    };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Could not save tenant email settings.' };
  }
}

async function sendBudgetTenantEmail(req) {
  const env = getEnv();
  const context = await getBudgetContext(env);
  if (!context.ok) return context;

  const payload = await readBody(req);
  const dryRun = payload.dryRun !== false;
  const tenantId = String(payload.tenantId || '').trim();
  const allowDuplicate = payload.allowDuplicate === true;
  const source = String(payload.source || (payload.scheduled ? 'schedule' : dryRun ? 'preview' : 'manual'));

  try {
    const [mortgages, mortgageExpenses, settingsRow] = await Promise.all([
      fetchBudgetTable(context, 'ledger_mortgages'),
      fetchBudgetTable(context, 'ledger_mortgage_expenses'),
      fetchBudgetSettings(context)
    ]);
    const settings = normalizeBudgetEmailSettings(settingsRow?.raw_data?.tenantEmail || {});
    const activity = normalizeBudgetEmailActivity(settingsRow?.raw_data?.tenantEmailActivity || []);
    const cycleKey = getBudgetCycleKey(settings.cycleDay);
    const mortgageSummary = buildMortgageSummary(mortgages.filter(isBudgetRowActive), mortgageExpenses.filter(isBudgetRowActive));
    const tenants = settings.tenants.filter((tenant) => tenant.active !== false && (!tenantId || tenant.id === tenantId));

    if (tenants.length === 0) {
      return { ok: false, message: tenantId ? 'No active tenant matched that id.' : 'No active tenant email recipients are configured.', previews: [], sent: [] };
    }

    const previews = tenants.map((tenant) => buildTenantEmailPreview({ tenant, settings, mortgageSummary, from: getBudgetEmailFrom(env) }));
    const blockedDuplicates = dryRun || allowDuplicate ? [] : previews.filter((preview) => hasSuccessfulTenantEmail(activity, preview.tenantId, cycleKey));
    const sendablePreviews = previews.filter((preview) => !blockedDuplicates.some((blocked) => blocked.tenantId === preview.tenantId));

    if (dryRun) {
      await appendBudgetEmailActivity(context, settingsRow, previews.map((preview) => buildBudgetEmailActivityEntry({
        preview,
        status: 'previewed',
        provider: 'none',
        source,
        cycleKey,
        message: 'Preview prepared.'
      })));
      return {
        ok: true,
        message: `Prepared ${previews.length} tenant email preview(s).`,
        previews,
        sent: []
      };
    }

    if (blockedDuplicates.length > 0 && sendablePreviews.length === 0) {
      const skipped = blockedDuplicates.map((preview) => buildBudgetEmailActivityEntry({
        preview,
        status: 'skipped',
        provider: 'duplicate-protection',
        source,
        cycleKey,
        message: 'Skipped because this tenant already has a successful bill for this cycle.'
      }));
      await appendBudgetEmailActivity(context, settingsRow, skipped);
      return {
        ok: false,
        message: 'No emails sent. Duplicate protection found an existing successful bill for this cycle.',
        previews,
        sent: skipped
      };
    }

    const emailProvider = getBudgetEmailProvider(env);
    if (emailProvider === 'none') {
      await appendBudgetEmailActivity(context, settingsRow, previews.map((preview) => buildBudgetEmailActivityEntry({
        preview,
        status: 'failed',
        provider: 'none',
        source,
        cycleKey,
        message: 'Email provider is not connected.'
      })));
      return {
        ok: false,
        message: 'Email is not connected. Configure Gmail API or Resend in Vercel.',
        previews,
        sent: []
      };
    }

    const sent = [];
    for (const preview of sendablePreviews) {
      const response = emailProvider === 'gmail'
        ? await sendGmailEmail(env, preview)
        : await sendResendEmail(env.RESEND_API_KEY, preview);
      sent.push(response);
    }
    const skipped = blockedDuplicates.map((preview) => buildBudgetEmailActivityEntry({
      preview,
      status: 'skipped',
      provider: 'duplicate-protection',
      source,
      cycleKey,
      message: 'Skipped because this tenant already has a successful bill for this cycle.'
    }));
    const sentActivity = sent.map((result) => {
      const preview = sendablePreviews.find((item) => item.to === result.to) || sendablePreviews[0];
      return buildBudgetEmailActivityEntry({
        preview,
        status: result.ok ? 'sent' : 'failed',
        provider: emailProvider,
        source,
        cycleKey,
        message: result.message,
        messageId: result.id || result.threadId || '',
        rawStatus: result.status
      });
    });
    await appendBudgetEmailActivity(context, settingsRow, [...sentActivity, ...skipped]);

    await logSupabaseEvent(env, {
      event_type: 'tenant_email_sent',
      source: 'budgeting',
      payload: {
        tenant_count: sent.length,
        skipped_count: skipped.length,
        provider: emailProvider,
        recipients: sent.map((item) => item.to),
        cycle_day: settings.cycleDay,
        cycle_key: cycleKey,
        sent_at: new Date().toISOString()
      }
    });

    return {
      ok: sent.length > 0 && sent.every((item) => item.ok),
      message: sent.every((item) => item.ok) ? `Sent ${sent.length} tenant email(s).${skipped.length ? ` Skipped ${skipped.length} duplicate(s).` : ''}` : 'One or more tenant emails could not be sent.',
      previews,
      sent: [...sent, ...skipped]
    };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Could not prepare tenant email.', previews: [], sent: [] };
  }
}

async function runBudgetTenantEmailSchedule(req) {
  const env = getEnv();
  const context = await getBudgetContext(env);
  if (!context.ok) return context;

  const payload = req.method === 'POST' ? await readBody(req) : {};
  const force = payload.force === true || env.BUDGET_EMAIL_FORCE_SCHEDULE === 'true';
  const sendEnabled = env.BUDGET_AUTO_SEND_ENABLED === 'true' || payload.send === true;

  try {
    const settingsRow = await fetchBudgetSettings(context);
    const settings = normalizeBudgetEmailSettings(settingsRow?.raw_data?.tenantEmail || {});
    const todayMatchesCycle = getBudgetLocalDay() === settings.cycleDay;

    if (!settings.enabled) {
      const entry = buildScheduleActivityEntry({ status: 'skipped', settings, message: 'Tenant email automation is disabled.' });
      await appendBudgetEmailActivity(context, settingsRow, [entry]);
      return { ok: true, message: entry.message, sent: [], previews: [], schedule: entry };
    }

    if (!force && !todayMatchesCycle) {
      const entry = buildScheduleActivityEntry({ status: 'skipped', settings, message: `Today is not the configured cycle day (${settings.cycleDay}).` });
      await appendBudgetEmailActivity(context, settingsRow, [entry]);
      return { ok: true, message: entry.message, sent: [], previews: [], schedule: entry };
    }

    if (!sendEnabled) {
      const entry = buildScheduleActivityEntry({ status: 'previewed', settings, message: 'Schedule checked. Auto-send is not enabled, so no email was sent.' });
      await appendBudgetEmailActivity(context, settingsRow, [entry]);
      return { ok: true, message: entry.message, sent: [], previews: [], schedule: entry };
    }

    const [mortgages, mortgageExpenses] = await Promise.all([
      fetchBudgetTable(context, 'ledger_mortgages'),
      fetchBudgetTable(context, 'ledger_mortgage_expenses')
    ]);
    const mortgageSummary = buildMortgageSummary(mortgages.filter(isBudgetRowActive), mortgageExpenses.filter(isBudgetRowActive));
    const blockingWarnings = getBudgetScheduleBlockingWarnings(settings, mortgageSummary);
    if (blockingWarnings.length > 0) {
      const entry = buildScheduleActivityEntry({
        status: 'skipped',
        settings,
        message: `Schedule blocked by ${blockingWarnings.length} setup warning(s): ${blockingWarnings.slice(0, 3).join('; ')}`
      });
      await appendBudgetEmailActivity(context, settingsRow, [entry]);
      return { ok: false, message: entry.message, sent: [], previews: [], schedule: entry, warnings: blockingWarnings };
    }

    return sendBudgetTenantEmail({
      ...req,
      body: {
        dryRun: false,
        scheduled: true,
        source: 'schedule'
      }
    });
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Could not run tenant email schedule.', sent: [], previews: [] };
  }
}

async function getBudgetContext(env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return emptyBudgetReport('Budgeting needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY configured in Vercel.', { email: BUDGET_OWNER_EMAIL, userId: '' });
  }

  const context = {
    baseUrl: String(env.SUPABASE_URL).replace(/\/$/, ''),
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
    owner: { email: BUDGET_OWNER_EMAIL, userId: '' }
  };
  const profiles = await supabaseRequest(context, `user_profiles?email=eq.${encodeURIComponent(BUDGET_OWNER_EMAIL)}&select=user_id,email,display_name&limit=1`);
  const profile = Array.isArray(profiles) ? profiles[0] : null;
  if (!profile?.user_id) return emptyBudgetReport(`Could not find ${BUDGET_OWNER_EMAIL} in Optra Studio user_profiles.`, context.owner);

  return {
    ok: true,
    ...context,
    owner: {
      email: profile.email || BUDGET_OWNER_EMAIL,
      displayName: profile.display_name || '',
      userId: profile.user_id
    }
  };
}

async function fetchBudgetTable(context, table) {
  const rows = await supabaseRequest(context, `${table}?user_id=eq.${encodeURIComponent(context.owner.userId)}&select=*&order=updated_at.desc.nullslast`);
  return Array.isArray(rows) ? rows.map((row) => mapBudgetRow(table, row)) : [];
}

async function fetchBudgetSettings(context) {
  const rows = await supabaseRequest(context, `ledger_settings?user_id=eq.${encodeURIComponent(context.owner.userId)}&select=*&limit=1`);
  return Array.isArray(rows) ? rows[0] || null : null;
}

async function supabaseRequest(context, path, options = {}) {
  const response = await fetch(`${context.baseUrl}/rest/v1/${path}`, {
    method: options.method || 'GET',
    headers: {
      apikey: context.serviceRoleKey,
      Authorization: `Bearer ${context.serviceRoleKey}`,
      'content-type': 'application/json',
      ...(options.prefer ? { Prefer: options.prefer } : {})
    },
    body: options.body
  });
  const text = await safeReadText(response);
  if (!response.ok) throw new Error(`Supabase ${options.method || 'GET'} ${path} failed with ${response.status}. ${summariseApiError(text)}`);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function mapBudgetRow(table, row) {
  return {
    ...row,
    amount: numberValue(row.amount),
    balance: numberValue(row.balance),
    repayment: numberValue(row.repayment),
    property_value: numberValue(row.property_value),
    interest_rate: numberValue(row.interest_rate),
    weekly_amount: numberValue(row.weekly_amount),
    monthly_amount: numberValue(row.monthly_amount),
    weekly_repayment: numberValue(row.weekly_repayment),
    monthly_repayment: numberValue(row.monthly_repayment),
    tenant_bill_weekly: numberValue(row.tenant_bill_weekly),
    tenant_bill_monthly: numberValue(row.tenant_bill_monthly),
    tenant_bill_per_tenant_weekly: numberValue(row.tenant_bill_per_tenant_weekly),
    tenant_bill_per_tenant_monthly: numberValue(row.tenant_bill_per_tenant_monthly),
    tenant_count: row.tenant_count == null ? null : Number(row.tenant_count),
    sourceTable: table
  };
}

function buildBudgetReport({ owner, income, expenses, debts, mortgages, mortgageExpenses, assets, savings, settings }) {
  const activeIncome = income.filter(isBudgetRowActive);
  const activeExpenses = expenses.filter(isBudgetRowActive);
  const activeDebts = debts.filter(isBudgetRowActive);
  const activeMortgages = mortgages.filter(isBudgetRowActive);
  const activeMortgageExpenses = mortgageExpenses.filter(isBudgetRowActive);
  const activeAssets = assets.filter(isBudgetRowActive);
  const activeSavings = savings.filter(isBudgetRowActive);
  const weeklyIncome = sum(activeIncome, (item) => weeklyValue(item, 'amount'));
  const weeklyExpenses = sum(activeExpenses, (item) => weeklyValue(item, 'amount'));
  const weeklyDebts = sum(activeDebts, (item) => weeklyValue(item, 'repayment'));
  const weeklyMortgages = sum(activeMortgages, (item) => weeklyValue(item, 'repayment'));
  const weeklySavings = sum(activeSavings, (item) => weeklyValue(item, 'amount'));
  const weeklyMortgageExpenses = sum(activeMortgageExpenses, (item) => weeklyValue(item, 'amount'));
  const weeklyTenantOffsets = sum(activeMortgageExpenses.filter((item) => item.offset_to_tenants), (item) => weeklyValue(item, 'amount'));
  const assetValue = sum(activeAssets, (item) => numberValue(item.value));
  const debtBalance = sum(activeDebts, (item) => numberValue(item.balance));
  const mortgageBalance = sum(activeMortgages, (item) => numberValue(item.balance));
  const netWeekly = weeklyIncome - weeklyExpenses - weeklyDebts - weeklyMortgages - weeklySavings - weeklyMortgageExpenses;
  return {
    owner,
    tables: { income, expenses, debts, mortgages, mortgageExpenses, assets, savings },
    totals: {
      weeklyIncome,
      weeklyExpenses,
      weeklyDebtRepayments: weeklyDebts,
      weeklyMortgageRepayments: weeklyMortgages,
      weeklyMortgageExpenses,
      weeklySavings,
      weeklyTenantOffsets,
      netWeekly,
      monthlyIncome: weeklyIncome * 52 / 12,
      monthlyExpenses: weeklyExpenses * 52 / 12,
      assetValue,
      debtBalance,
      mortgageBalance,
      netWorth: assetValue - debtBalance - mortgageBalance
    },
    mortgageSummary: buildMortgageSummary(activeMortgages, activeMortgageExpenses),
    emailSettings: normalizeBudgetEmailSettings(settings?.raw_data?.tenantEmail || {}),
    settings: settings || null
  };
}

function buildMortgageSummary(mortgages, expenses) {
  const mortgagesWithBills = mortgages.map((mortgage) => {
    const tenantCount = Number(mortgage.tenant_count || mortgage.raw_data?.tenantCount || 0);
    const linkedExpenses = expenses.filter((expense) => expense.mortgage_local_id && mortgage.local_id && expense.mortgage_local_id === mortgage.local_id);
    const offsetExpenses = linkedExpenses.filter((expense) => expense.offset_to_tenants);
    const weeklyOffset = sum(offsetExpenses, (expense) => weeklyValue(expense, 'amount'));
    const weeklyRepayment = weeklyValue(mortgage, 'repayment');
    return {
      id: mortgage.id,
      localId: mortgage.local_id,
      name: mortgage.name || mortgage.property_address || 'Mortgage',
      propertyAddress: mortgage.property_address || '',
      tenantCount,
      weeklyRepayment,
      weeklyOffsetExpenses: weeklyOffset,
      weeklyUtilitiesSplit: tenantCount > 0 ? weeklyOffset / tenantCount : 0,
      weeklyTenantBill: tenantCount > 0 ? weeklyOffset / tenantCount : 0,
      expenses: linkedExpenses
    };
  });
  return {
    mortgages: mortgagesWithBills,
    totalWeeklyTenantBill: sum(mortgagesWithBills, (item) => item.weeklyTenantBill),
    totalWeeklyOffsetExpenses: sum(mortgagesWithBills, (item) => item.weeklyOffsetExpenses)
  };
}

function normalizeBudgetWriteRow(kind, values, userId) {
  const row = { user_id: userId, updated_at: new Date().toISOString() };
  for (const field of budgetAllowedFields(kind)) {
    if (Object.prototype.hasOwnProperty.call(values, field)) row[field] = normalizeBudgetField(field, values[field]);
  }
  if (!row.mode && kind !== 'assets') row.mode = 'personal';
  if (!row.local_id && kind !== 'savings') row.local_id = `${kind}-${Date.now()}`;
  return row;
}

function budgetAllowedFields(kind) {
  const common = ['mode', 'local_id', 'name', 'amount', 'frequency', 'active', 'schedule_type', 'schedule_day', 'schedule_date', 'schedule_exact_date', 'notes', 'weekly_amount', 'monthly_amount', 'raw_data'];
  if (kind === 'income') return [...common, 'tax_rate'];
  if (kind === 'expenses') return [...common, 'category'];
  if (kind === 'debts') return ['mode', 'local_id', 'name', 'debt_type', 'balance', 'repayment', 'frequency', 'interest_rate', 'active', 'schedule_type', 'schedule_day', 'schedule_date', 'schedule_exact_date', 'notes', 'weekly_repayment', 'monthly_repayment', 'raw_data'];
  if (kind === 'mortgages') return ['mode', 'local_id', 'name', 'property_address', 'balance', 'property_value', 'repayment', 'frequency', 'interest_rate', 'active', 'schedule_type', 'schedule_day', 'schedule_date', 'schedule_exact_date', 'notes', 'weekly_repayment', 'monthly_repayment', 'tenant_count', 'raw_data'];
  if (kind === 'mortgageExpenses') return [...common, 'category', 'mortgage_local_id', 'offset_to_tenants', 'tenant_bill_weekly', 'tenant_bill_monthly', 'tenant_bill_per_tenant_weekly', 'tenant_bill_per_tenant_monthly'];
  if (kind === 'assets') return ['mode', 'local_id', 'name', 'asset_type', 'value', 'active', 'notes', 'raw_data'];
  if (kind === 'savings') return ['mode', 'amount', 'frequency', 'goal_name', 'goal_amount', 'active', 'weekly_amount', 'monthly_amount', 'raw_data'];
  return common;
}

function normalizeBudgetField(field, value) {
  if (['amount', 'tax_rate', 'balance', 'repayment', 'interest_rate', 'weekly_amount', 'monthly_amount', 'weekly_repayment', 'monthly_repayment', 'property_value', 'value', 'goal_amount', 'tenant_bill_weekly', 'tenant_bill_monthly', 'tenant_bill_per_tenant_weekly', 'tenant_bill_per_tenant_monthly'].includes(field)) return value === '' || value == null ? null : Number(value);
  if (['active', 'offset_to_tenants'].includes(field)) return value === true || String(value).toLowerCase() === 'true';
  if (['schedule_day', 'schedule_date', 'tenant_count'].includes(field)) return value === '' || value == null ? null : Number(value);
  if (field === 'raw_data') return typeof value === 'object' && value !== null ? value : {};
  return value === undefined ? null : value;
}

function isBudgetRowActive(row) {
  return row.active !== false;
}

function weeklyValue(row, amountKey) {
  const explicit = numberValue(row.weekly_amount ?? row.weekly_repayment);
  if (explicit > 0) return explicit;
  const amount = numberValue(row[amountKey]);
  const frequency = String(row.frequency || '').toLowerCase();
  if (!amount) return 0;
  if (frequency.includes('week')) return amount;
  if (frequency.includes('fortnight')) return amount / 2;
  if (frequency.includes('month')) return amount * 12 / 52;
  if (frequency.includes('year') || frequency.includes('annual')) return amount / 52;
  return amount;
}

function sum(items, getter) {
  return items.reduce((total, item) => total + numberValue(getter(item)), 0);
}

function numberValue(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

function normalizeBudgetEmailSettings(value = {}) {
  const settings = value && typeof value === 'object' ? value : {};
  const tenants = Array.isArray(settings.tenants) ? settings.tenants : [];
  return {
    enabled: settings.enabled === true || String(settings.enabled || '').toLowerCase() === 'true',
    cycleDay: clampDay(settings.cycleDay ?? settings.cycle_day ?? 1),
    subjectPrefix: String(settings.subjectPrefix || settings.subject_prefix || 'Weekly property bill').trim() || 'Weekly property bill',
    replyTo: String(settings.replyTo || settings.reply_to || BUDGET_OWNER_EMAIL).trim() || BUDGET_OWNER_EMAIL,
    notes: String(settings.notes || '').trim(),
    tenants: tenants.map((tenant, index) => ({
      id: String(tenant.id || `tenant-${index + 1}`).trim(),
      name: String(tenant.name || `Tenant ${index + 1}`).trim(),
      email: String(tenant.email || '').trim(),
      mortgageLocalId: String(tenant.mortgageLocalId || tenant.mortgage_local_id || '').trim(),
      rent: numberValue(tenant.rent ?? tenant.weeklyRent ?? tenant.weekly_rent),
      rentFrequency: String(tenant.rentFrequency || tenant.rent_frequency || 'weekly').trim() || 'weekly',
      active: tenant.active !== false
    })).filter((tenant) => tenant.name || tenant.email)
  };
}

function normalizeBudgetEmailActivity(value = []) {
  const items = Array.isArray(value) ? value : [];
  return items.map((item) => ({
    id: String(item.id || `activity-${Date.now()}-${Math.random().toString(16).slice(2)}`),
    createdAt: String(item.createdAt || item.created_at || new Date().toISOString()),
    cycleKey: String(item.cycleKey || item.cycle_key || ''),
    source: String(item.source || 'manual'),
    status: String(item.status || 'unknown'),
    provider: String(item.provider || ''),
    tenantId: String(item.tenantId || item.tenant_id || ''),
    tenantName: String(item.tenantName || item.tenant_name || ''),
    to: String(item.to || ''),
    subject: String(item.subject || ''),
    rent: numberValue(item.rent),
    utilities: numberValue(item.utilities),
    total: numberValue(item.total ?? item.weeklyBill ?? item.weekly_bill),
    mortgageName: String(item.mortgageName || item.mortgage_name || ''),
    messageId: String(item.messageId || item.message_id || ''),
    rawStatus: item.rawStatus ?? item.raw_status ?? '',
    message: String(item.message || '')
  })).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 80);
}

async function appendBudgetEmailActivity(context, knownSettingsRow, entries) {
  const safeEntries = normalizeBudgetEmailActivity(entries);
  if (safeEntries.length === 0) return { ok: true, activity: normalizeBudgetEmailActivity(knownSettingsRow?.raw_data?.tenantEmailActivity || []) };

  const current = await fetchBudgetSettings(context);
  const rawData = current?.raw_data && typeof current.raw_data === 'object' ? current.raw_data : {};
  const activity = normalizeBudgetEmailActivity([...safeEntries, ...(rawData.tenantEmailActivity || [])]);
  const result = await supabaseRequest(context, 'ledger_settings?on_conflict=user_id', {
    method: 'POST',
    body: JSON.stringify({
      user_id: context.owner.userId,
      default_mode: current?.default_mode || knownSettingsRow?.default_mode || 'personal',
      raw_data: {
        ...rawData,
        tenantEmailActivity: activity
      },
      updated_at: new Date().toISOString()
    }),
    prefer: 'resolution=merge-duplicates,return=representation'
  });

  return { ok: true, activity, row: Array.isArray(result) ? result[0] : result };
}

function buildBudgetEmailActivityEntry({ preview, status, provider, source, cycleKey, message, messageId = '', rawStatus = '' }) {
  return {
    id: `tenant-email-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    createdAt: new Date().toISOString(),
    cycleKey,
    source,
    status,
    provider,
    tenantId: preview?.tenantId || '',
    tenantName: preview?.tenantName || '',
    to: preview?.to || '',
    subject: preview?.subject || '',
    rent: numberValue(preview?.rent),
    utilities: numberValue(preview?.utilities),
    total: numberValue(preview?.total ?? preview?.weeklyBill),
    mortgageName: preview?.mortgageName || '',
    messageId,
    rawStatus,
    message
  };
}

function buildScheduleActivityEntry({ status, settings, message }) {
  return {
    id: `tenant-schedule-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    createdAt: new Date().toISOString(),
    cycleKey: getBudgetCycleKey(settings.cycleDay),
    source: 'schedule',
    status,
    provider: 'schedule',
    tenantId: '',
    tenantName: 'Scheduled billing',
    to: '',
    subject: settings.subjectPrefix,
    rent: 0,
    utilities: 0,
    total: 0,
    mortgageName: '',
    messageId: '',
    rawStatus: '',
    message
  };
}

function getBudgetScheduleBlockingWarnings(settings, mortgageSummary) {
  const warnings = [];
  const activeTenants = settings.tenants.filter((tenant) => tenant.active !== false);
  if (activeTenants.length === 0) warnings.push('no active tenants configured');
  for (const tenant of activeTenants) {
    const mortgage = tenant.mortgageLocalId
      ? mortgageSummary.mortgages.find((item) => item.localId === tenant.mortgageLocalId)
      : mortgageSummary.mortgages[0];
    const rent = toWeeklyAmount(tenant.rent, tenant.rentFrequency);
    if (!tenant.email) warnings.push(`${tenant.name || 'tenant'} is missing an email`);
    if (!tenant.name) warnings.push(`${tenant.email || 'tenant'} is missing a name`);
    if (!mortgage) warnings.push(`${tenant.name || tenant.email || 'tenant'} has no linked property`);
    if (rent <= 0) warnings.push(`${tenant.name || tenant.email || 'tenant'} has zero rent`);
  }
  return warnings;
}

function hasSuccessfulTenantEmail(activity, tenantId, cycleKey) {
  return activity.some((item) => item.tenantId === tenantId && item.cycleKey === cycleKey && item.status === 'sent');
}

function getBudgetCycleKey(cycleDay) {
  const now = new Date();
  const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const dayNumber = Math.floor((now.getTime() - yearStart.getTime()) / 86400000) + 1;
  const week = Math.ceil((dayNumber + yearStart.getUTCDay()) / 7);
  return `${now.getUTCFullYear()}-w${String(week).padStart(2, '0')}-d${clampDay(cycleDay)}`;
}

function getBudgetLocalDay() {
  const parts = new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Brisbane',
    weekday: 'short'
  }).formatToParts(new Date());
  const weekday = parts.find((part) => part.type === 'weekday')?.value || '';
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return Math.max(0, days.findIndex((day) => weekday.startsWith(day)));
}

function clampDay(value) {
  const day = Number(value || 1);
  if (!Number.isFinite(day)) return 1;
  return Math.max(0, Math.min(6, Math.round(day)));
}

function getBudgetEmailFrom(env) {
  if (env.GMAIL_SENDER_EMAIL) return env.GMAIL_SENDER_EMAIL;
  return env.BUDGET_EMAIL_FROM || env.NOA_EMAIL_FROM || `NoA <${BUDGET_OWNER_EMAIL}>`;
}

function getBudgetEmailProvider(env) {
  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && (env.GMAIL_REFRESH_TOKEN || (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY))) return 'gmail';
  if (env.RESEND_API_KEY) return 'resend';
  return 'none';
}

function buildTenantEmailPreview({ tenant, settings, mortgageSummary, from }) {
  const mortgage = tenant.mortgageLocalId
    ? mortgageSummary.mortgages.find((item) => item.localId === tenant.mortgageLocalId)
    : mortgageSummary.mortgages[0];
  const rent = toWeeklyAmount(tenant.rent, tenant.rentFrequency);
  const utilities = mortgage ? mortgage.weeklyUtilitiesSplit ?? mortgage.weeklyTenantBill : 0;
  const total = rent + utilities;
  const subject = `${settings.subjectPrefix}: ${formatCurrencyText(total)} due this week`;
  const lines = [
    `Hi ${tenant.name || 'there'},`,
    '',
    `Your weekly property bill is ${formatCurrencyText(total)}.`,
    mortgage?.name ? `Property: ${mortgage.name}` : '',
    mortgage?.propertyAddress ? `Address: ${mortgage.propertyAddress}` : '',
    `Rent: ${formatCurrencyText(rent)}.`,
    `Utilities: ${formatCurrencyText(utilities)}.`,
    mortgage ? `Utilities are your even split of ${formatCurrencyText(mortgage.weeklyOffsetExpenses)} in expenses marked "offset expense to tenants".` : '',
    settings.notes ? `Note: ${settings.notes}` : '',
    '',
    'Thanks,',
    'NoA'
  ].filter((line) => line !== '');
  const text = lines.join('\n');
  const html = tenantEmailHtml({ tenant, mortgage, rent, utilities, total, settings });

  return {
    tenantId: tenant.id,
    tenantName: tenant.name,
    to: tenant.email,
    from,
    replyTo: settings.replyTo,
    subject,
    text,
    html,
    weeklyBill: total,
    rent,
    utilities,
    total,
    mortgageName: mortgage?.name || '',
    mortgageLocalId: mortgage?.localId || tenant.mortgageLocalId || ''
  };
}

function tenantEmailHtml({ tenant, mortgage, rent, utilities, total, settings }) {
  const rows = [
    ['Rent', formatCurrencyText(rent)],
    ['Utilities', formatCurrencyText(utilities)],
    ['Total', formatCurrencyText(total)],
    ['Split across tenants', String(mortgage?.tenantCount || 0)]
  ];
  return `<!doctype html>
<html>
  <body style="margin:0;background:#f6f8fb;font-family:Arial,sans-serif;color:#111827;">
    <div style="max-width:620px;margin:0 auto;padding:28px 18px;">
      <div style="background:#ffffff;border-radius:18px;padding:28px;border:1px solid #e5e7eb;">
        <p style="margin:0 0 8px;color:#2563eb;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">NoA tenant billing</p>
        <h1 style="margin:0 0 12px;font-size:28px;line-height:1.15;">${escapeHtml(settings.subjectPrefix)}</h1>
        <p style="margin:0 0 22px;font-size:16px;line-height:1.55;">Hi ${escapeHtml(tenant.name || 'there')}, your weekly property bill is <strong>${formatCurrencyText(total)}</strong>.</p>
        ${mortgage?.propertyAddress ? `<p style="margin:0 0 18px;color:#4b5563;">${escapeHtml(mortgage.propertyAddress)}</p>` : ''}
        <table style="width:100%;border-collapse:collapse;margin:0 0 20px;">
          ${rows.map(([label, value]) => `<tr><td style="padding:10px 0;border-bottom:1px solid #eef2f7;color:#6b7280;">${escapeHtml(label)}</td><td style="padding:10px 0;border-bottom:1px solid #eef2f7;text-align:right;font-weight:700;">${escapeHtml(value)}</td></tr>`).join('')}
        </table>
        ${mortgage ? `<p style="margin:0 0 20px;color:#4b5563;">Utilities are calculated from expenses marked <strong>offset expense to tenants</strong> and split evenly between tenants.</p>` : ''}
        ${settings.notes ? `<p style="margin:0 0 20px;padding:14px;border-radius:12px;background:#eff6ff;color:#1e3a8a;">${escapeHtml(settings.notes)}</p>` : ''}
        <p style="margin:0;color:#6b7280;font-size:13px;">Sent by NoA on behalf of ${escapeHtml(BUDGET_OWNER_EMAIL)}.</p>
      </div>
    </div>
  </body>
</html>`;
}

function toWeeklyAmount(amount, frequency) {
  const value = numberValue(amount);
  const text = String(frequency || 'weekly').toLowerCase();
  if (!value) return 0;
  if (text.includes('week')) return value;
  if (text.includes('fortnight')) return value / 2;
  if (text.includes('month')) return value * 12 / 52;
  if (text.includes('year') || text.includes('annual')) return value / 52;
  return value;
}

async function sendResendEmail(apiKey, preview) {
  if (!preview.to) {
    return { ok: false, to: preview.to, status: 'missing', message: 'Tenant email address is missing.' };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
      'Idempotency-Key': `tenant-bill-${preview.tenantId}-${new Date().toISOString().slice(0, 10)}`
    },
    body: JSON.stringify({
      from: preview.from,
      to: preview.to,
      reply_to: preview.replyTo,
      subject: preview.subject,
      html: preview.html,
      text: preview.text
    })
  });
  const text = await safeReadText(response);
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }
  return {
    ok: response.ok,
    to: preview.to,
    status: response.status,
    id: parsed?.id || '',
    message: response.ok ? 'Email accepted by Resend.' : summariseApiError(text)
  };
}

async function sendGmailEmail(env, preview) {
  if (!preview.to) return { ok: false, to: preview.to, status: 'missing', message: 'Tenant email address is missing.' };

  const token = await getGmailAccessToken(env);
  if (!token.ok) return { ok: false, to: preview.to, status: 'auth', message: token.message };

  const sender = env.GMAIL_SENDER_EMAIL || BUDGET_OWNER_EMAIL;
  const raw = buildRawEmail({
    from: sender,
    to: preview.to,
    replyTo: preview.replyTo,
    subject: preview.subject,
    text: preview.text,
    html: preview.html
  });

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token.accessToken}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({ raw })
  });
  const text = await safeReadText(response);
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }
  return {
    ok: response.ok,
    to: preview.to,
    status: response.status,
    id: parsed?.id || '',
    threadId: parsed?.threadId || '',
    message: response.ok ? 'Email accepted by Gmail.' : summariseApiError(text)
  };
}

async function getGmailAccessToken(env = getEnv()) {
  const refreshToken = await getStoredGmailRefreshToken(env);
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !refreshToken) {
    return {
      ok: false,
      message: 'Gmail needs GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and a saved Gmail refresh token. Open /api/gmail/start after deploying the credentials.'
    };
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  });
  const text = await safeReadText(response);
  if (!response.ok) {
    return { ok: false, message: `Gmail token refresh failed with status ${response.status}. ${summariseApiError(text)}` };
  }
  const data = JSON.parse(text);
  return { ok: true, accessToken: data.access_token || '' };
}

async function getStoredGmailRefreshToken(env = getEnv()) {
  const stored = await readPrivateSetting('gmail_refresh_token', env);
  return stored || env.GMAIL_REFRESH_TOKEN || '';
}

async function saveStoredGmailRefreshToken(refreshToken, env = getEnv()) {
  if (!refreshToken) return { ok: false, message: 'Google did not return a refresh token.' };
  if (!canUsePrivateSettingsStore(env)) {
    return {
      ok: false,
      message: 'Google returned a refresh token, but NoA cannot save it automatically until SUPABASE_SERVICE_ROLE_KEY and the noa_private_settings table are configured.'
    };
  }
  return writePrivateSetting('gmail_refresh_token', refreshToken, env);
}

function buildRawEmail({ from, to, replyTo, subject, text, html }) {
  const boundary = `noa_${Date.now().toString(36)}`;
  const headers = [
    `From: ${formatEmailHeader(from)}`,
    `To: ${formatEmailHeader(to)}`,
    replyTo ? `Reply-To: ${formatEmailHeader(replyTo)}` : '',
    `Subject: ${mimeHeader(subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`
  ].filter(Boolean);
  const body = [
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 7bit',
    '',
    text || '',
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: 7bit',
    '',
    html || '',
    `--${boundary}--`
  ].join('\r\n');
  return Buffer.from(`${headers.join('\r\n')}\r\n\r\n${body}`, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function mimeHeader(value) {
  const text = String(value || '');
  return /^[\x00-\x7F]*$/.test(text) ? text : `=?UTF-8?B?${Buffer.from(text, 'utf8').toString('base64')}?=`;
}

function formatEmailHeader(value) {
  return String(value || '').replace(/[\r\n]/g, '').trim();
}

function canUsePrivateSettingsStore(env = getEnv()) {
  return Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
}

async function readPrivateSetting(key, env = getEnv()) {
  if (!canUsePrivateSettingsStore(env)) return '';
  try {
    const baseUrl = new URL(env.SUPABASE_URL).origin;
    const response = await fetch(`${baseUrl}/rest/v1/noa_private_settings?key=eq.${encodeURIComponent(key)}&select=value&limit=1`, {
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        Accept: 'application/json'
      }
    });
    if (!response.ok) return '';
    const rows = await response.json();
    return rows[0]?.value || '';
  } catch {
    return '';
  }
}

async function writePrivateSetting(key, value, env = getEnv()) {
  try {
    const baseUrl = new URL(env.SUPABASE_URL).origin;
    const response = await fetch(`${baseUrl}/rest/v1/noa_private_settings?on_conflict=key`, {
      method: 'POST',
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'content-type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal'
      },
      body: JSON.stringify({
        key,
        value,
        updated_at: new Date().toISOString()
      })
    });
    if (!response.ok) {
      const text = await safeReadText(response);
      return { ok: false, message: `Could not save private setting. ${summariseApiError(text)}` };
    }
    return { ok: true, message: 'Saved private setting.' };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Could not save private setting.' };
  }
}

function formatCurrencyText(value) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(numberValue(value));
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function emptyBudgetTables() {
  return { income: [], expenses: [], debts: [], mortgages: [], mortgageExpenses: [], assets: [], savings: [] };
}

function emptyBudgetTotals() {
  return { weeklyIncome: 0, weeklyExpenses: 0, weeklyDebtRepayments: 0, weeklyMortgageRepayments: 0, weeklyMortgageExpenses: 0, weeklySavings: 0, weeklyTenantOffsets: 0, netWeekly: 0, monthlyIncome: 0, monthlyExpenses: 0, assetValue: 0, debtBalance: 0, mortgageBalance: 0, netWorth: 0 };
}

function emptyMortgageSummary() {
  return { mortgages: [], totalWeeklyTenantBill: 0, totalWeeklyOffsetExpenses: 0 };
}

function emptyBudgetReport(message, owner) {
  return { ok: false, message, fetchedAt: new Date().toISOString(), owner, tables: emptyBudgetTables(), totals: emptyBudgetTotals(), mortgageSummary: emptyMortgageSummary(), emailSettings: normalizeBudgetEmailSettings({}), tenantEmailActivity: [], settings: null };
}

function buildNoahInstructions() {
  return [
    'You are Noah, the conversational advisor inside NoA.',
    'NoA is a personal operating system for work, clients, tasks, memory, approvals, and useful automation.',
    'Use the provided memory, Notion tasks, upcoming jobs, and Notion search context. If Notion tasks exist, treat them as the authoritative active work pipeline.',
    'Your priority rules are: 1) overdue High priority tasks, 2) due-today High or Medium tasks, 3) In progress tasks that unblock delivery, 4) Ready For Revision tasks that need checking, 5) upcoming jobs in the next 7 days, 6) Final Draft/Notes work near completion, 7) unscheduled low-priority work.',
    'When asked what to focus on, choose one primary focus and up to two secondary items. Explain why using due date, status, priority, effort, and job timing. Avoid generic advice.',
    'When asked about clients or jobs, inspect notionJobs.upcomingJobs and mention job date, client, deliverables, and location when available.',
    'Never say there is no context when notionJobs.tasks or notionJobs.upcomingJobs contains items. Reference concrete task titles, statuses, due dates, and priorities where useful.',
    'If a request would send, publish, spend money, update external records, delete data, or contact a person, draft and ask for approval first.',
    'Be concise, warm, practical, and specific. Prefer priority, reason, risk, and next action.',
    'Use markdown sparingly for readability. Do not mention API internals unless the user is asking about implementation.'
  ].join('\n\n');
}

async function logSupabaseEvent(env, event) {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    return { ok: false, message: 'Supabase credentials are missing.' };
  }

  try {
    const baseUrl = new URL(env.SUPABASE_URL).origin;
    const response = await fetch(`${baseUrl}/rest/v1/noa_events`, {
      method: 'POST',
      headers: {
        apikey: env.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
        'content-type': 'application/json',
        Prefer: 'return=minimal'
      },
      body: JSON.stringify(event)
    });

    if (!response.ok) {
      const body = await safeReadText(response);
      return { ok: false, message: summariseApiError(body) || `Supabase log rejected with status ${response.status}.` };
    }

    return { ok: true, message: 'Logged to Supabase.' };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Unknown Supabase logging error.' };
  }
}

function buildNoahInput(payload = {}) {
  return [
    {
      role: 'developer',
      content: [
        {
          type: 'input_text',
          text: JSON.stringify({
            memory: payload.notes || [],
            notionJobs: payload.notionJobs || emptyNotionJobs(),
            notionContext: payload.notionContext || [],
            briefing: payload.smartBriefing || null,
            integrationStatus: payload.integrationStatus || {},
            recentConversation: payload.recentMessages || [],
            interactionMode: 'typed'
          }, null, 2)
        }
      ]
    },
    {
      role: 'user',
      content: [
        {
          type: 'input_text',
          text: String(payload.message || '')
        }
      ]
    }
  ];
}

async function fetchNotionJobs(token, databaseIds) {
  const pipelineResult = databaseIds.pipelineViewId
    ? await queryNotionView(token, databaseIds.pipelineViewId)
    : databaseIds.tasksDatabaseId
      ? await queryNotionDatabase(token, databaseIds.tasksDatabaseId)
      : { ok: true, results: [], error: 'Tasks database id is missing.' };
  const tasksResult = databaseIds.tasksViewId
    ? await queryNotionView(token, databaseIds.tasksViewId)
    : databaseIds.tasksDatabaseId
      ? await queryNotionDatabase(token, databaseIds.tasksDatabaseId)
      : { ok: true, results: [], error: 'Tasks database id is missing.' };
  const jobsResult = databaseIds.jobsDatabaseId
    ? await queryNotionDatabase(token, databaseIds.jobsDatabaseId)
    : { ok: true, results: [], error: '' };
  const calendarTasksResult = databaseIds.tasksDatabaseId
    ? await queryNotionDatabase(token, databaseIds.tasksDatabaseId)
    : { ok: true, results: [], error: '' };

  const pipelineTasks = pipelineResult.results
    .map(mapNotionTask)
    .filter(isActiveTask)
    .sort(sortTasksByDueDateAndPriority);
  const tasks = tasksResult.results
    .map(mapNotionTask)
    .filter(isActiveTask)
    .sort(sortTasksByDueDateAndPriority);
  const calendarTasks = calendarTasksResult.results
    .map(mapNotionTask)
    .filter((task) => Boolean(task.title) && !task.archived && !task.complete && task.shootDate)
    .sort(sortTasksByDueDateAndPriority);
  const upcomingJobs = jobsResult.results
    .map(mapNotionUpcomingJob)
    .filter((job) => job.title && !job.archived)
    .sort(sortUpcomingJobs)
    .slice(0, 24);

  return {
    tasks: pipelineTasks,
    pipelineTasks,
    taskList: tasks,
    calendarTasks,
    upcomingJobs,
    fetchedAt: new Date().toISOString(),
    mainJobsError: pipelineResult.error || '',
    tasksError: tasksResult.error || '',
    upcomingJobsError: jobsResult.error || ''
  };
}

async function queryNotionView(token, viewId) {
  const normalizedViewId = normalizeNotionId(viewId);
  let queryId = '';

  try {
    const firstResponse = await fetch(`https://api.notion.com/v1/views/${normalizedViewId}/queries`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        'Notion-Version': '2026-03-11'
      },
      body: JSON.stringify({ page_size: 100 })
    });

    if (!firstResponse.ok) {
      const body = await safeReadText(firstResponse);
      return {
        ok: false,
        results: [],
        error: `Notion view request failed with status ${firstResponse.status}. ${summariseApiError(body)}`
      };
    }

    const firstData = await firstResponse.json();
    queryId = firstData.id || '';
    const results = [...(firstData.results || [])];
    let cursor = firstData.next_cursor;
    let hasMore = Boolean(firstData.has_more);

    while (hasMore && cursor) {
      const pageResponse = await fetch(`https://api.notion.com/v1/views/${normalizedViewId}/queries/${queryId}?start_cursor=${encodeURIComponent(cursor)}&page_size=100`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Notion-Version': '2026-03-11'
        }
      });

      if (!pageResponse.ok) break;
      const pageData = await pageResponse.json();
      results.push(...(pageData.results || []));
      cursor = pageData.next_cursor;
      hasMore = Boolean(pageData.has_more);
    }

    if (queryId) {
      void fetch(`https://api.notion.com/v1/views/${normalizedViewId}/queries/${queryId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Notion-Version': '2026-03-11'
        }
      }).catch(() => undefined);
    }

    const hydratedResults = await hydrateNotionPages(token, results);
    return { ok: true, results: hydratedResults, error: '' };
  } catch (error) {
    return {
      ok: false,
      results: [],
      error: error instanceof Error ? error.message : 'Unknown Notion view error.'
    };
  }
}

async function hydrateNotionPages(token, results) {
  const pages = [];
  const pageRefs = results.filter((item) => item?.object === 'page' && item.id && !item.properties);

  if (pageRefs.length === 0) return results;

  for (const batch of chunk(pageRefs, 8)) {
    const settled = await Promise.allSettled(batch.map((item) => fetchNotionPage(token, item.id)));
    for (const result of settled) {
      if (result.status === 'fulfilled' && result.value) pages.push(result.value);
    }
  }

  return pages;
}

async function fetchNotionPage(token, pageId) {
  const response = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Notion-Version': '2022-06-28'
    }
  });

  if (!response.ok) return null;
  return response.json();
}

async function queryNotionDatabase(token, databaseId) {
  try {
    const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({ page_size: 100 })
    });

    if (!response.ok) {
      const body = await safeReadText(response);
      return {
        ok: false,
        results: [],
        error: `Notion database request failed with status ${response.status}. ${summariseApiError(body)}`
      };
    }

    const data = await response.json();
    return { ok: true, results: data.results || [], error: '' };
  } catch (error) {
    return {
      ok: false,
      results: [],
      error: error instanceof Error ? error.message : 'Unknown Notion database error.'
    };
  }
}

function emptyNotionJobs(message = '') {
  return {
    tasks: [],
    pipelineTasks: [],
    taskList: [],
    calendarTasks: [],
    upcomingJobs: [],
    fetchedAt: new Date().toISOString(),
    mainJobsError: message,
    tasksError: '',
    upcomingJobsError: ''
  };
}

function mapNotionTask(page) {
  const properties = page.properties || {};
  const status = readStatus(properties.Status);
  const dueDate = readDate(properties['Due date']);
  const shootDate = readFirstDate(properties, ['Shoot Date', 'Shoot date', 'Job date', 'Job Date']);
  const complete = readFirstCheckbox(properties, ['Complete', 'Completed', 'Done', 'Task complete']);
  return {
    id: page.id,
    title: readTitle(properties['Task name']),
    status,
    priority: readSelect(properties.Priority),
    dueDate,
    dueState: describeDueDate(dueDate),
    shootDate,
    shootState: describeDueDate(shootDate),
    effortLevel: readSelect(properties['Effort level']),
    effortSize: effortSize(readSelect(properties['Effort level'])),
    taskTypes: readMultiSelect(properties['Task type']),
    assignees: readPeople(properties.Assignee),
    description: readRichText(properties.Description),
    attachments: readFirstAttachments(properties, ['Attachments', 'Attachment', 'Files', 'Links']),
    url: page.url,
    archived: Boolean(page.archived),
    complete: Boolean(page.archived) || complete || isCompletedNotionStatus(status),
    column: statusToColumn(status)
  };
}

function mapNotionUpcomingJob(page) {
  const properties = page.properties || {};
  const title = readFirstTitle(properties, ['Job name', 'Job Name', 'Name', 'Task name']);
  const jobDate = readFirstDate(properties, ['Job date', 'Job Date', 'Due date', 'Date', 'Shoot date', 'Scheduled date']);
  const status = readStatus(properties.Status);

  return {
    id: page.id,
    title,
    client: readFirstText(properties, ['Client', 'Client name', 'Customer']),
    status,
    jobDate,
    dueState: describeDueDate(jobDate),
    priority: readFirstSelect(properties, ['Priority']),
    deliverableTypes: readFirstMultiSelect(properties, ['Deliverable types', 'Deliverable Types', 'Task type', 'Type']),
    location: readFirstText(properties, ['Location', 'Venue']),
    notes: readFirstText(properties, ['Notes', 'Description', 'Details']),
    attachments: readFirstAttachments(properties, ['Attachments', 'Attachment', 'Files', 'Links']),
    url: page.url,
    archived: Boolean(page.archived)
  };
}

function isActiveTask(task) {
  return Boolean(task.title) && !task.archived && !task.complete;
}

function sortTasksByDueDateAndPriority(a, b) {
  if (a.dueDate && !b.dueDate) return -1;
  if (!a.dueDate && b.dueDate) return 1;
  if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
  return priorityRank(a.priority) - priorityRank(b.priority);
}

function sortUpcomingJobs(a, b) {
  if (a.jobDate && !b.jobDate) return -1;
  if (!a.jobDate && b.jobDate) return 1;
  if (a.jobDate && b.jobDate && a.jobDate !== b.jobDate) return a.jobDate.localeCompare(b.jobDate);
  return priorityRank(a.priority) - priorityRank(b.priority);
}

function priorityRank(priority) {
  return { High: 0, Medium: 1, Low: 2 }[priority] ?? 3;
}

function statusToColumn(status) {
  return {
    'Not started': 'Not Started',
    'In progress': 'In Progress',
    'Ready For Revision': 'Ready for Revision',
    'Final Draft/Notes': 'Final Draft/Notes'
  }[status] || status || 'Not Started';
}

function columnToStatus(column) {
  return {
    'Not Started': 'Not started',
    'In Progress': 'In progress',
    'Ready for Revision': 'Ready For Revision',
    'Final Draft/Notes': 'Final Draft/Notes',
    'Done': 'Posted / Done',
    'Posted / Done': 'Posted / Done'
  }[column] || normalizeNotionStatusName(column);
}

function normalizeNotionStatusName(value) {
  const status = String(value || '').trim();
  if (!status) return '';
  return /^done$/i.test(status) ? 'Posted / Done' : status;
}

function isCompletedNotionStatus(value) {
  const status = normalizeNotionStatusName(value);
  return status === 'Posted / Done' || status === 'Archived';
}

function describeDueDate(dueDate) {
  if (!dueDate) return 'No date';
  const today = brisbaneDateString();
  const tomorrow = addPlainDays(today, 1);
  const soon = addPlainDays(today, 7);
  if (dueDate < today) return 'Overdue';
  if (dueDate === today) return 'Due today';
  if (dueDate === tomorrow) return 'Tomorrow';
  if (dueDate <= soon) return 'Due soon';
  return 'Scheduled';
}

function brisbaneDateString() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Brisbane',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

function addPlainDays(dateString, days) {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function effortSize(effort) {
  return { Small: 'S', Medium: 'M', Large: 'L' }[effort] || '';
}

function normalizeNotionId(id) {
  return normalizeNotionResourceId(id);
}

function normalizeNotionDatabaseId(id) {
  return normalizeNotionResourceId(id);
}

function normalizeNotionViewId(id) {
  const cleaned = cleanNotionIdInput(id);
  try {
    const url = new URL(cleaned);
    const viewId = url.searchParams.get('v');
    if (viewId) return normalizeNotionResourceId(viewId);
  } catch {
    // Plain IDs are expected here.
  }
  return normalizeNotionResourceId(cleaned);
}

function normalizeNotionResourceId(id) {
  const cleaned = cleanNotionIdInput(id);
  const hex = cleaned.replace(/-/g, '').match(/[0-9a-f]{32}/i);
  return hex ? hex[0] : cleaned.replace(/-/g, '');
}

function cleanNotionIdInput(id) {
  return String(id || '')
    .trim()
    .replace(/^["'`]+/, '')
    .replace(/["'`\\/\s]+$/g, '');
}

function chunk(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function readTitle(property) {
  return (property?.title || []).map((part) => part.plain_text).filter(Boolean).join('');
}

function readRichText(property) {
  return (property?.rich_text || []).map((part) => part.plain_text).filter(Boolean).join('');
}

function readStatus(property) {
  return property?.status?.name || '';
}

function readSelect(property) {
  return property?.select?.name || '';
}

function readDate(property) {
  return property?.date?.start || '';
}

function readMultiSelect(property) {
  return (property?.multi_select || []).map((item) => item.name).filter(Boolean);
}

function readPeople(property) {
  return (property?.people || []).map((person) => ({
    id: person.id,
    name: person.name || person.person?.email || 'Unknown',
    avatarUrl: person.avatar_url || null
  }));
}

function readAttachments(property) {
  if (!property) return [];
  if (property.type === 'files') {
    return (property.files || [])
      .map((file) => ({
        name: file.name || 'Attachment',
        url: file.type === 'external' ? file.external?.url || '' : file.file?.url || ''
      }))
      .filter((file) => file.url);
  }
  if (property.type === 'url' && property.url) return [{ name: 'Attachment', url: property.url }];
  if (property.type === 'rich_text') return parseAttachmentLinks(readRichText(property));
  return [];
}

function readFirstTitle(properties, names) {
  for (const name of names) {
    const value = readTitle(properties[name]);
    if (value) return value;
  }
  for (const property of Object.values(properties)) {
    if (property?.type === 'title') {
      const value = readTitle(property);
      if (value) return value;
    }
  }
  return '';
}

function readFirstText(properties, names) {
  for (const name of names) {
    const property = properties[name];
    if (!property) continue;
    const value = property.type === 'rich_text' || property.type === 'title'
      ? readRichText(property) || readTitle(property)
      : property.type === 'select'
        ? readSelect(property)
        : property.type === 'people'
          ? readPeople(property).map((person) => person.name).join(', ')
          : '';
    if (value) return value;
  }
  return '';
}

function readFirstSelect(properties, names) {
  for (const name of names) {
    const value = readSelect(properties[name]);
    if (value) return value;
  }
  return '';
}

function readFirstMultiSelect(properties, names) {
  for (const name of names) {
    const value = readMultiSelect(properties[name]);
    if (value.length) return value;
  }
  return [];
}

function readFirstDate(properties, names) {
  for (const name of names) {
    const value = readDate(properties[name]);
    if (value) return value;
  }
  return '';
}

function readFirstCheckbox(properties, names) {
  const matchedName = findTaskCompleteCheckboxName(properties, names);
  if (matchedName) return Boolean(properties[matchedName]?.checkbox);
  for (const name of names) {
    const property = properties[name];
    if (property?.type === 'checkbox') return Boolean(property.checkbox);
  }
  for (const [name, property] of Object.entries(properties)) {
    if (property?.type === 'checkbox' && /complete|completed|done/i.test(name)) {
      return Boolean(property.checkbox);
    }
  }
  return false;
}

function readFirstAttachments(properties, names) {
  for (const name of names) {
    const value = readAttachments(properties[name]);
    if (value.length) return value;
  }
  return [];
}

function parseAttachmentLinks(value) {
  if (Array.isArray(value)) {
    return value
      .map((item, index) => {
        if (typeof item === 'string') return normaliseAttachmentLine(item, index);
        return normaliseAttachmentLine(`${item?.name ? `${item.name}: ` : ''}${item?.url || ''}`, index);
      })
      .filter(Boolean);
  }

  return String(value || '')
    .split(/\r?\n|,\s*(?=https?:\/\/)/)
    .map((line, index) => normaliseAttachmentLine(line, index))
    .filter(Boolean);
}

function normaliseAttachmentLine(line, index) {
  const trimmed = String(line || '').trim();
  if (!trimmed) return null;
  const urlMatch = trimmed.match(/https?:\/\/\S+/i);
  if (!urlMatch) return null;
  const url = urlMatch[0].replace(/[),.;]+$/, '');
  const name = trimmed
    .replace(urlMatch[0], '')
    .replace(/[:\-–—|]+$/g, '')
    .trim();
  return { name: name || `Attachment ${index + 1}`, url };
}

async function fetchNotionContext(token, userMessage) {
  const queries = buildNotionQueries(userMessage);
  const found = new Map();

  for (const query of queries) {
    try {
      const response = await fetch('https://api.notion.com/v1/search', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'content-type': 'application/json',
          'Notion-Version': '2022-06-28'
        },
        body: JSON.stringify({
          ...(query === '__recent__' ? {} : { query }),
          page_size: 6,
          sort: { direction: 'descending', timestamp: 'last_edited_time' }
        })
      });

      if (!response.ok) continue;
      const data = await response.json();
      for (const item of data.results || []) {
        if (!found.has(item.id)) found.set(item.id, summariseNotionItem(item));
      }
    } catch {
      // Keep Noah responsive if one Notion search fails.
    }
  }

  return Array.from(found.values()).slice(0, 12);
}

function buildNotionQueries(userMessage) {
  const words = String(userMessage || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 3 && !['what', 'should', 'focus', 'today', 'with', 'about', 'know'].includes(word))
    .slice(0, 3);

  return Array.from(new Set([
    words.join(' '),
    '__recent__',
    'task',
    'tasks',
    'job',
    'jobs',
    'project',
    'client',
    'today'
  ].filter(Boolean)));
}

function summariseNotionItem(item) {
  return {
    id: item.id,
    type: item.object,
    title: getNotionTitle(item),
    url: item.url,
    lastEditedTime: item.last_edited_time,
    properties: summariseNotionProperties(item.properties || {})
  };
}

function getNotionTitle(item) {
  const properties = item.properties || {};
  for (const property of Object.values(properties)) {
    const text = property.title || property.rich_text;
    if (Array.isArray(text) && text.length) {
      const value = text.map((part) => part.plain_text).filter(Boolean).join('');
      if (value) return value;
    }
  }
  return item.title?.map?.((part) => part.plain_text).join('') || item.object || 'Untitled';
}

function summariseNotionProperties(properties) {
  const summary = {};
  for (const [key, property] of Object.entries(properties).slice(0, 10)) {
    const value = notionPropertyValue(property);
    if (value) summary[key] = value;
  }
  return summary;
}

function notionPropertyValue(property) {
  if (!property || !property.type) return '';
  const value = property[property.type];
  if (property.type === 'title' || property.type === 'rich_text') {
    return (value || []).map((part) => part.plain_text).filter(Boolean).join('');
  }
  if (property.type === 'select') return value?.name || '';
  if (property.type === 'multi_select') return (value || []).map((item) => item.name).join(', ');
  if (property.type === 'status') return value?.name || '';
  if (property.type === 'date') return value?.start ? `${value.start}${value.end ? ` to ${value.end}` : ''}` : '';
  if (property.type === 'checkbox') return value ? 'true' : 'false';
  if (property.type === 'number') return String(value ?? '');
  if (property.type === 'url' || property.type === 'email' || property.type === 'phone_number') return value || '';
  if (property.type === 'people') return (value || []).map((person) => person.name || person.id).join(', ');
  if (property.type === 'relation') return `${(value || []).length} related item(s)`;
  return '';
}

function extractResponseText(data) {
  if (typeof data.output_text === 'string') return data.output_text;

  const parts = [];
  for (const item of data.output || []) {
    for (const content of item.content || []) {
      if (typeof content.text === 'string') parts.push(content.text);
    }
  }
  return parts.join('\n').trim();
}

async function safeReadText(response) {
  try {
    return await response.text();
  } catch {
    return '';
  }
}

function summariseApiError(body) {
  if (!body) return 'No error details were returned.';
  try {
    const parsed = JSON.parse(body);
    return parsed.error?.message || parsed.message || 'No readable error message was returned.';
  } catch {
    return body.slice(0, 240);
  }
}

function maskEnvValue(value, secret) {
  const text = String(value || '');
  if (!text) return '';
  if (!secret) return text.length > 42 ? `${text.slice(0, 18)}...${text.slice(-8)}` : text;
  if (text.length <= 8) return '****';
  return `****${text.slice(-4)}`;
}

function fieldDots(value) {
  const text = String(value || '');
  if (!text) return '';
  return '*'.repeat(Math.min(Math.max(text.length, 8), 18));
}

module.exports = {
  askNoah,
  getIntegrationSettings,
  saveIntegrationSettings,
  revealIntegrationSetting,
  testIntegration,
  testAllIntegrations,
  getNotionJobs,
  updateNotionTaskStatus,
  manageNotionItem,
  getBudgetSummary,
  manageBudgetItem,
  saveBudgetEmailSettings,
  sendBudgetTenantEmail,
  runBudgetTenantEmailSchedule,
  getGmailAccessToken,
  saveStoredGmailRefreshToken,
  readBody,
  sendJson,
  methodNotAllowed
};
