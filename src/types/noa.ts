import type { LucideIcon } from 'lucide-react';

export type Screen = 'today' | 'noah' | 'hubgauge' | 'pipeline' | 'tasks' | 'upcoming-jobs' | 'clients' | 'xero' | 'budgeting' | 'plan' | 'memory' | 'automations' | 'network' | 'integrations' | 'settings';

export type NavItem = {
  id: Screen;
  label: string;
  icon: LucideIcon;
};

export type Priority = {
  title: string;
  detail: string;
  signal: string;
  status: 'now' | 'next' | 'watch';
};

export type SystemNode = {
  name: string;
  status: 'online' | 'planned' | 'pending';
  detail: string;
  health: number;
};

export type MemoryItem = {
  label: string;
  value: string;
  detail: string;
};

export type Automation = {
  name: string;
  trigger: string;
  result: string;
  state: 'draft' | 'ready' | 'approval';
};

export type ChatMessage = {
  role: 'user' | 'noah';
  text: string;
};

export type BriefingItem = {
  label: string;
  value: string;
  detail: string;
};

export type FocusItem = {
  time: string;
  title: string;
  detail: string;
  tone: 'primary' | 'calm' | 'warn';
};

export type ApprovalItem = {
  title: string;
  detail: string;
  source: string;
};

export type ArchitectureLayer = {
  name: string;
  purpose: string;
  owner: string;
  nextBuild: string;
};

export type RoadmapStep = {
  phase: string;
  title: string;
  outcome: string;
  status: 'active' | 'next' | 'later';
};
