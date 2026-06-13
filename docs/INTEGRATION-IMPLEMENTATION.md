# Integration Implementation Guide

This document is the practical path for adding live integrations to NoA.

The important rule:

> NoA should own identity, memory, permissions, approvals, and the user experience. External services should provide data or execute approved actions.

## Access Boundaries

Codex can help build and wire the app, create schemas, write endpoint code, prepare webhook payloads, and walk through setup screens.

Codex cannot safely invent or privately access:

- Your OpenAI API key
- Your Notion integration token
- Your n8n account credentials
- Your Gmail or Google Calendar OAuth consent
- Your Supabase project secrets

When those are needed, the implementation pattern is:

1. Codex builds the app-side integration point.
2. You create or copy the required key/token/webhook URL.
3. NoA stores it in a deliberate settings layer.
4. We test the connection together.
5. NoA logs every event and protected action.

## Implementation Order

### Phase 1: Local Memory and Local Noah

Status: in progress.

Purpose:

- Prove the product loop without account complexity.
- Capture tasks, clients, projects, decisions, approvals, and general memory.
- Make Noah answer from local memory.

### Phase 2: OpenAI Noah

Goal:

- Replace local reply rules with a real Noah advisor layer.

App work:

- Add a backend-safe OpenAI request path.
- Add Noah system instructions from `docs/NOAH-IDENTITY.md`.
- Send memory context to Noah.
- Add tool-call style actions later.
- Log each request, response, cost estimate, and failure.

User setup:

- Create an OpenAI API key.
- Add it to NoA settings or a local environment file.
- Confirm which model should power Noah.

Safety:

- Noah may draft, summarise, classify, and recommend freely.
- Noah must request approval before any external action.

### Phase 3: Supabase Memory

Goal:

- Move local memory into durable structured storage.

App work:

- Add Supabase client configuration.
- Create tables for users, memories, tasks, projects, clients, conversations, messages, events, approvals, integrations, automations, and tool runs.
- Migrate local captured memory into Supabase.
- Add row-level security before multi-user use.

User setup:

- Create or provide a Supabase project.
- Add project URL and anon key.
- Later, add service-role key only to backend/server code, never the frontend.

Safety:

- Secrets must not be committed.
- Sensitive actions must have audit rows.

### Phase 4: n8n Bridge

Goal:

- Let n8n handle triggers, schedules, and external-service plumbing.

NoA endpoint pattern:

- `POST /api/events/n8n`
- Validate a shared secret or signature.
- Normalise the event.
- Store the raw event and the interpreted event.
- Decide whether it becomes memory, a notification, an approval request, or a workflow run.

n8n workflow pattern:

1. Trigger fires in Gmail, Calendar, Notion, or a schedule.
2. n8n normalises the payload.
3. n8n sends it to NoA webhook.
4. NoA stores the event.
5. Noah recommends what to do.
6. If action is external, NoA creates an approval.
7. n8n executes only after approval.

User setup:

- Create an n8n cloud or self-hosted account.
- Create a workflow with a webhook or schedule trigger.
- Add the NoA webhook URL and shared secret.
- Test one event at a time.

First workflows:

- Daily briefing trigger.
- Gmail important email intake.
- Calendar meeting preparation.
- Notion page sync.

### Phase 5: Notion

Goal:

- Pull structured notes, project pages, task lists, and knowledge into NoA.

Implementation choices:

- Direct Notion API from NoA for controlled sync.
- n8n Notion trigger for quick workflow setup.
- Hybrid: n8n handles page-change events, NoA owns storage and interpretation.

Recommended MVP:

- Use n8n first for Notion page-change events.
- Send page title, URL, database name, updated time, and key properties to NoA.
- NoA stores the event and creates memory candidates.

User setup:

- Create a Notion integration.
- Share target Notion pages/databases with the integration.
- Provide token or connect through n8n.

Safety:

- Start read-only.
- Do not allow writes back to Notion until approvals are implemented.

## First Live Integration To Build

The safest first live integration is OpenAI Noah because it improves the core product without touching external business systems.

The safest first automation integration is n8n daily briefing because it is schedule-based and low-risk.

The safest first knowledge integration is Notion read-only sync because it gives Noah richer context without sending messages, spending money, or modifying records.

## What We Build Next

1. Finish local Noah memory responses.
2. Add a settings screen for integration connection states.
3. Add OpenAI configuration.
4. Add Supabase schema.
5. Add n8n webhook endpoint.
6. Add Notion read-only sync through n8n or direct API.
