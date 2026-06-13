# NoA Phase 2 Plan

## Goal

Turn the Phase 1 concept into a real Windows desktop app foundation.

The first useful product loop remains:

> Noah understands the day, identifies what matters, explains why, and recommends the next action.

## Phase 2 Build Targets

### 1. Real App Foundation

Use:

- Electron for Windows desktop packaging
- React and TypeScript for UI
- Vite for fast development
- Clean mock data first
- Real integrations only after the interface and data model settle

### 2. Noah Advisor Layer

Replace local response rules with an OpenAI-backed assistant.

Noah should:

- Speak as "I"
- Refer to the platform as NoA
- Recommend priorities, not just list information
- Ask for approval before sensitive actions
- Use Australian English

### 3. Supabase Memory

Supabase should eventually store:

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

### 4. n8n Workflow Bridge

n8n should handle:

- Schedules
- Webhook triggers
- External system plumbing
- Gmail intake
- Calendar intake
- Notion sync
- Low-risk repeatable workflows

NoA should own:

- Reasoning
- Memory
- Permissions
- User experience
- Knowledge graph
- Action approvals

### 5. Approval Model

Always require approval before:

- Sending emails
- Messaging clients
- Deleting files
- Spending money
- Updating financial records
- Posting publicly
- Updating CRM records

## First Real Feature To Build

Build the daily briefing endpoint and UI.

Inputs:

- Tasks
- Projects
- Clients
- Calendar events later
- Recent events
- Memory

Output:

- Main focus
- Why it matters
- Top priorities
- Risks or blockers
- Suggested first action

