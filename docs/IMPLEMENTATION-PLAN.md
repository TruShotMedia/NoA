# NoA Core v2 Implementation Plan

## Product Goal

NoA is the visual operating system. Noah is the conversational advisor inside it.

The first version should prove one useful loop:

> Noah understands the day, explains what matters, recommends the next action, and can trigger a controlled workflow with approval.

## Build Principles

- Build from first principles so the system stays understandable.
- Separate conversation from execution.
- Use n8n for triggers, schedules, and external service plumbing.
- Keep NoA responsible for identity, memory, approvals, decisions, and the user experience.
- Log every event, tool call, approval, automation run, and result.
- Treat context as the product.

## Target Architecture

### 1. Desktop Experience

Current foundation:

- Electron desktop shell
- React, TypeScript, and Vite interface
- Today command centre
- Noah chat surface
- Memory, automations, network, integrations, and settings screens
- Local mock data only

Next:

- Add secure local settings storage.
- Add first real data model.
- Replace mock state with Supabase-backed state.

### 2. Noah Intelligence Layer

Noah should:

- Speak as "I".
- Refer to the platform as NoA.
- Recommend priorities instead of only listing data.
- Ask follow-up questions when context is missing.
- Request approval before sensitive actions.

Next:

- Add OpenAI-backed chat.
- Add a tool registry.
- Add memory retrieval.
- Add approval-aware tool execution.

### 3. Supabase Memory Layer

Supabase should store:

- Users
- Tasks
- Projects
- Clients
- Events
- Conversations
- Messages
- Memories
- Tool runs
- Approvals
- Integrations
- Automations

Next:

- Create the initial schema.
- Seed manual tasks, clients, projects, and briefing inputs.
- Add pgvector or another embedding path after structured memory works.

### 4. n8n Automation Layer

n8n should handle:

- Gmail triggers
- Calendar triggers
- Notion syncs
- Daily briefing schedules
- Email summaries
- Client follow-up reminders
- Low-risk workflow execution after approval

NoA should communicate with n8n through signed webhooks.

Event pattern:

1. External event reaches n8n.
2. n8n normalises the payload.
3. n8n sends the event to NoA.
4. NoA stores the event.
5. Noah decides whether to update memory, notify the user, run a skill, or request approval.
6. n8n executes the external action only when approved.

### 5. Context Hub

Create a local and eventually synced context hub:

- `inbox/`
- `areas/`
- `projects/`
- `clients/`
- `knowledge/`
- `skills/`
- `archive/`

Each useful folder should eventually include:

- `abstract.md`: one-line summary.
- `overview.md`: short explanation, workflows, and relationships.
- Supporting files underneath.

## Implementation Order

### Phase 1: Foundation Prototype

Outcome:

- Open NoA and see the intended operating system structure.
- Ask local Noah basic questions.
- Understand the next build path from inside the app.

Status:

- In progress.

### Phase 2: Real Noah and Memory

Outcome:

- OpenAI-backed Noah.
- Supabase data model.
- Stored tasks, projects, clients, memories, conversations, events, and approvals.
- Daily briefing generated from real stored data.

### Phase 3: n8n Bridge

Outcome:

- n8n can trigger NoA webhooks.
- NoA logs events and run history.
- Daily briefing can be scheduled.
- Gmail, Calendar, and Notion can start sending context into NoA.

### Phase 4: Approval-Gated Actions

Outcome:

- Noah can draft actions.
- User approves or rejects actions.
- n8n executes approved external actions.
- Every action has an audit trail.

### Phase 5: Skills and Knowledge Graph

Outcome:

- Skills become modular capability packages.
- The network view becomes a live graph of clients, projects, tasks, automations, integrations, and memory.
- Noah can explain why a recommendation was made.

## First Real Feature

Build the daily briefing.

Inputs:

- Tasks
- Projects
- Clients
- Calendar events
- Recent system events
- Relevant memory

Output:

- Main focus
- Why it matters
- Top priorities
- Risks or blockers
- Suggested first action

This is the best first product win because it proves that NoA can reduce mental load before it performs risky external actions.
