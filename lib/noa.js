const INTEGRATION_ENV_KEYS = {
  openai: [
    'OPENAI_API_KEY',
    'OPENAI_MODEL'
  ],
  supabase: ['SUPABASE_URL', 'SUPABASE_ANON_KEY'],
  n8n: ['N8N_WEBHOOK_URL', 'N8N_SHARED_SECRET'],
  notion: [
    'NOTION_TOKEN',
    'NOTION_DATABASE_ID',
    'NOTION_TASKS_DATABASE_ID',
    'NOTION_PIPELINE_VIEW_ID',
    'NOTION_TASKS_VIEW_ID',
    'NOTION_JOBS_DATABASE_ID'
  ],
  xero: ['XERO_CLIENT_ID', 'XERO_CLIENT_SECRET', 'XERO_REFRESH_TOKEN', 'XERO_TENANT_ID', 'XERO_REDIRECT_URI']
};

const SECRET_ENV_KEYS = new Set([
  'OPENAI_API_KEY',
  'SUPABASE_ANON_KEY',
  'N8N_SHARED_SECRET',
  'NOTION_TOKEN',
  'XERO_CLIENT_SECRET',
  'XERO_REFRESH_TOKEN'
]);

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
    tasksDatabaseId: env.NOTION_TASKS_DATABASE_ID || env.NOTION_DATABASE_ID || '36ff2ec220f2808ba6a8cfa333adefb5',
    pipelineViewId: env.NOTION_PIPELINE_VIEW_ID || '36ff2ec220f280f18188000c8a4ed4e7',
    tasksViewId: env.NOTION_TASKS_VIEW_ID || '370f2ec220f2816791d9000c3aadc277',
    jobsDatabaseId: env.NOTION_JOBS_DATABASE_ID || '36ff2ec220f280da9c3ac1072b0ef022'
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
  if (!env.XERO_CLIENT_ID || !env.XERO_CLIENT_SECRET || !env.XERO_REFRESH_TOKEN) {
    return missing('xero', 'Xero', 'XERO_CLIENT_ID, XERO_CLIENT_SECRET, or XERO_REFRESH_TOKEN is missing from Vercel environment variables.');
  }

  try {
    const tokenResult = await refreshXeroToken(env);
    if (!tokenResult.ok) {
      return {
        id: 'xero',
        name: 'Xero',
        ok: false,
        status: tokenResult.status || 'error',
        message: tokenResult.message
      };
    }

    const connectionsResponse = await fetch('https://api.xero.com/connections', {
      headers: {
        Authorization: `Bearer ${tokenResult.accessToken}`,
        Accept: 'application/json'
      }
    });

    if (!connectionsResponse.ok) {
      const body = await safeReadText(connectionsResponse);
      return fromResponse('xero', 'Xero', connectionsResponse, `Token refreshed, but tenant lookup failed. ${summariseApiError(body)}`);
    }

    const connections = await connectionsResponse.json();
    const preferredTenantId = env.XERO_TENANT_ID || connections[0]?.tenantId || '';
    if (!preferredTenantId) {
      return {
        id: 'xero',
        name: 'Xero',
        ok: false,
        status: 200,
        message: 'Xero token is valid, but no connected tenant was returned.'
      };
    }

    const organisationResponse = await fetch('https://api.xero.com/api.xro/2.0/Organisation', {
      headers: {
        Authorization: `Bearer ${tokenResult.accessToken}`,
        'xero-tenant-id': preferredTenantId,
        Accept: 'application/json'
      }
    });

    if (!organisationResponse.ok) {
      const body = await safeReadText(organisationResponse);
      return fromResponse('xero', 'Xero', organisationResponse, `Tenant found, but organisation lookup failed. ${summariseApiError(body)}`);
    }

    const organisationData = await organisationResponse.json();
    const organisationName = organisationData?.Organisations?.[0]?.Name || 'Xero organisation';
    return {
      id: 'xero',
      name: 'Xero',
      ok: true,
      status: organisationResponse.status,
      message: `Connected to ${organisationName}.`
    };
  } catch (error) {
    return failed('xero', 'Xero', error);
  }
}

async function refreshXeroToken(env) {
  const credentials = Buffer.from(`${env.XERO_CLIENT_ID}:${env.XERO_CLIENT_SECRET}`).toString('base64');
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: env.XERO_REFRESH_TOKEN
  });

  const response = await fetch('https://identity.xero.com/connect/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'content-type': 'application/x-www-form-urlencoded',
      Accept: 'application/json'
    },
    body
  });

  const text = await safeReadText(response);
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      message: `Xero token refresh failed. ${summariseApiError(text)}`
    };
  }

  const data = JSON.parse(text);
  return {
    ok: true,
    accessToken: data.access_token,
    refreshToken: data.refresh_token || ''
  };
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

  const pipelineTasks = pipelineResult.results
    .map(mapNotionTask)
    .filter(isActiveTask)
    .sort(sortTasksByDueDateAndPriority);
  const tasks = tasksResult.results
    .map(mapNotionTask)
    .filter(isActiveTask)
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
  return {
    id: page.id,
    title: readTitle(properties['Task name']),
    status,
    priority: readSelect(properties.Priority),
    dueDate,
    dueState: describeDueDate(dueDate),
    effortLevel: readSelect(properties['Effort level']),
    effortSize: effortSize(readSelect(properties['Effort level'])),
    taskTypes: readMultiSelect(properties['Task type']),
    assignees: readPeople(properties.Assignee),
    description: readRichText(properties.Description),
    url: page.url,
    archived: Boolean(page.archived),
    complete: Boolean(page.archived) || ['Done', 'Archived'].includes(status),
    column: statusToColumn(status)
  };
}

function mapNotionUpcomingJob(page) {
  const properties = page.properties || {};
  const title = readFirstTitle(properties, ['Job name', 'Job Name', 'Name', 'Task name']);
  const jobDate = readFirstDate(properties, ['Job date', 'Job Date', 'Due date', 'Date', 'Shoot date', 'Scheduled date']);

  return {
    id: page.id,
    title,
    client: readFirstText(properties, ['Client', 'Client name', 'Customer']),
    jobDate,
    dueState: describeDueDate(jobDate),
    priority: readFirstSelect(properties, ['Priority']),
    deliverableTypes: readFirstMultiSelect(properties, ['Deliverable types', 'Deliverable Types', 'Task type', 'Type']),
    location: readFirstText(properties, ['Location', 'Venue']),
    url: page.url,
    archived: Boolean(page.archived)
  };
}

function isActiveTask(task) {
  return Boolean(task.title) && !task.archived && !['Done', 'Archived'].includes(task.status);
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
    'Final Draft/Notes': 'Final Draft/Notes'
  }[column] || '';
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
  return String(id || '').replace(/-/g, '').trim();
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
  readBody,
  sendJson,
  methodNotAllowed
};
