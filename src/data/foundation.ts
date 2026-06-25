import {
  Activity,
  Bot,
  BrainCircuit,
  CalendarDays,
  ClipboardList,
  CreditCard,
  Database,
  Gauge,
  GitBranch,
  Lightbulb,
  Map,
  MessagesSquare,
  PlugZap,
  Settings,
  ShieldCheck,
  Sparkles,
  UsersRound,
  WalletCards,
} from 'lucide-react';
import type {
  ApprovalItem,
  ArchitectureLayer,
  Automation,
  BriefingItem,
  FocusItem,
  MemoryItem,
  NavItem,
  Priority,
  RoadmapStep
} from '../types/noa';

export const navItems: NavItem[] = [
  { id: 'today', label: 'Today', icon: Gauge },
  { id: 'noah', label: 'Noah', icon: MessagesSquare },
  { id: 'pipeline', label: 'Pipeline', icon: ClipboardList },
  { id: 'upcoming-jobs', label: 'Upcoming Jobs', icon: CalendarDays },
  { id: 'clients', label: 'Clients', icon: UsersRound },
  { id: 'xero', label: 'Xero', icon: CreditCard },
  { id: 'budgeting', label: 'Budgeting', icon: WalletCards },
  { id: 'hue', label: 'Hue', icon: Lightbulb },
  { id: 'map', label: 'Map', icon: Map },
  { id: 'memory', label: 'Memory', icon: BrainCircuit },
  { id: 'integrations', label: 'Integrations', icon: PlugZap },
  { id: 'settings', label: 'Settings', icon: Settings }
];

export const priorities: Priority[] = [
  {
    title: 'Protect the morning focus block',
    detail: 'Keep the first work block reserved for the most consequential client or business task before checking low-priority inbox items.',
    signal: 'Do first',
    status: 'now'
  },
  {
    title: 'Review client follow-ups',
    detail: 'Two relationships need attention soon. Noah should surface the context, draft the touchpoints, and wait for approval.',
    signal: 'People',
    status: 'next'
  },
  {
    title: 'Capture decisions as memory',
    detail: 'Anything decided today should become durable context so Noah gets more useful without needing repeated explanations.',
    signal: 'Memory',
    status: 'watch'
  }
];

export const memoryItems: MemoryItem[] = [
  { label: 'Identity', value: 'Noah', detail: 'Warm, direct, advisor-first voice' },
  { label: 'Platform', value: 'NoA', detail: 'Visual operating system and command center' },
  { label: 'Work style', value: 'Focus-first', detail: 'Recommendations favour clarity, priority, and reduced mental load' },
  { label: 'Safety posture', value: 'Approval-gated', detail: 'Sensitive actions require confirmation before they leave NoA' }
];

export const automations: Automation[] = [
  {
    name: 'Daily briefing',
    trigger: 'Weekday morning schedule',
    result: 'Main focus, risks, blockers, and first action',
    state: 'ready'
  },
  {
    name: 'Client attention scan',
    trigger: 'Daily client/project review',
    result: 'Highlights clients needing follow-up',
    state: 'draft'
  },
  {
    name: 'Email summary',
    trigger: 'Gmail event intake through n8n',
    result: 'Important emails and proposed replies',
    state: 'approval'
  }
];

export const architectureLayers: ArchitectureLayer[] = [
  {
    name: 'Experience layer',
    purpose: 'Desktop command centre, Noah chat, daily briefing, orchestration map, approvals, and settings.',
    owner: 'NoA app',
    nextBuild: 'Turn the current mock UI into live views backed by local settings and Supabase data.'
  },
  {
    name: 'Intelligence layer',
    purpose: 'Noah identity, prompt rules, memory retrieval, tool selection, recommendations, and follow-up questions.',
    owner: 'Noah core',
    nextBuild: 'Replace the local reply rules with OpenAI tool calling and a strict approval policy.'
  },
  {
    name: 'Automation layer',
    purpose: 'Trigger-based actions, scheduled workflows, webhook intake, external app execution, and run history.',
    owner: 'n8n plus NoA backend',
    nextBuild: 'Create a signed n8n webhook bridge and store every event, approval, and result.'
  },
  {
    name: 'Memory layer',
    purpose: 'Tasks, projects, clients, events, conversations, decisions, documents, skills, and semantic recall.',
    owner: 'Supabase',
    nextBuild: 'Create the first schema and seed it with manual tasks, projects, clients, and briefing data.'
  },
  {
    name: 'Safety layer',
    purpose: 'Permission scopes, human approvals, secret storage, logs, rate limits, and action audit trails.',
    owner: 'NoA policy engine',
    nextBuild: 'Add approvals before email, financial, CRM, file deletion, or public posting actions.'
  }
];

export const roadmapSteps: RoadmapStep[] = [
  {
    phase: 'Now',
    title: 'Foundation prototype',
    outcome: 'A local desktop command centre that explains the architecture and proves the daily briefing loop.',
    status: 'active'
  },
  {
    phase: 'Next',
    title: 'Real Noah and memory',
    outcome: 'OpenAI-backed Noah, Supabase schema, stored conversations, tasks, projects, clients, and decisions.',
    status: 'next'
  },
  {
    phase: 'Then',
    title: 'n8n integration MVP',
    outcome: 'Gmail, Calendar, and Notion events arrive through n8n, are logged, and can request approval.',
    status: 'next'
  },
  {
    phase: 'Later',
    title: 'Skills and knowledge graph',
    outcome: 'Installable skills, richer graph relationships, client attention signals, and reusable workflow packages.',
    status: 'later'
  }
];

export const metricCards = [
  { label: 'Today', value: '3', detail: 'priority signals', icon: Sparkles },
  { label: 'Briefing', value: 'Ready', detail: 'morning summary', icon: CalendarDays },
  { label: 'Approvals', value: '2', detail: 'waiting for you', icon: ShieldCheck },
  { label: 'Workflows', value: '3', detail: 'prepared routines', icon: GitBranch },
  { label: 'Memory', value: '4', detail: 'core context areas', icon: Database },
  { label: 'Inbox', value: 'Calm', detail: 'nothing urgent shown', icon: ClipboardList },
  { label: 'Noah', value: 'Ready', detail: 'advisor available', icon: Bot },
  { label: 'System', value: 'Private', detail: 'local workspace', icon: Activity }
];

export const briefingItems: BriefingItem[] = [
  {
    label: 'Main focus',
    value: 'Daily command loop',
    detail: 'The highest leverage work is getting one useful daily recommendation from real context.'
  },
  {
    label: 'Risk',
    value: 'Context spread',
    detail: 'Tasks, projects, clients, and notes need one place to land before automations become reliable.'
  },
  {
    label: 'First action',
    value: 'Capture the work',
    detail: 'Add today\'s top client, project, and task inputs, then ask Noah to prioritise them.'
  }
];

export const focusItems: FocusItem[] = [
  {
    time: 'Now',
    title: 'Choose the one outcome that makes today easier',
    detail: 'Noah should keep the first recommendation narrow enough to act on.',
    tone: 'primary'
  },
  {
    time: 'Next',
    title: 'Turn loose work into tasks and projects',
    detail: 'Capture the current work map before connecting more integrations.',
    tone: 'calm'
  },
  {
    time: 'Later',
    title: 'Approve external actions deliberately',
    detail: 'Drafts can be fast, but sends, updates, and financial actions should stay gated.',
    tone: 'warn'
  }
];

export const approvalItems: ApprovalItem[] = [
  {
    title: 'Client follow-up draft',
    detail: 'Prepare a warm check-in message, but do not send it until reviewed.',
    source: 'Gmail workflow'
  },
  {
    title: 'Daily briefing schedule',
    detail: 'Allow the morning summary to run automatically on weekdays.',
    source: 'n8n routine'
  }
];
