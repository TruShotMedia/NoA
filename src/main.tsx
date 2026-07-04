import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { createPortal } from 'react-dom';
import {
  Activity,
  ArrowUpRight,
  Bell,
  Bot,
  BrainCircuit,
  BarChart3,
  Building2,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  CalendarDays,
  Clock3,
  Cloud,
  CloudSun,
  Copy,
  CreditCard,
  Database,
  Eye,
  EyeOff,
  Edit3,
  BriefcaseBusiness,
  Kanban,
  LockKeyhole,
  Mail,
  ImageIcon,
  ListTodo,
  MessageSquareText,
  Menu,
  MonitorSmartphone,
  Music,
  Plus,
  PieChart,
  Pause,
  Paperclip,
  Play,
  ReceiptText,
  RefreshCw,
  Save,
  Send,
  ServerCog,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  UsersRound,
  WalletCards,
  X,
  Zap
} from 'lucide-react';
import {
  architectureLayers,
  automations,
  approvalItems,
  focusItems,
  memoryItems,
  metricCards,
  navItems,
  priorities,
  roadmapSteps,
} from './data/foundation';
import type { ChatMessage, Screen } from './types/noa';
import './styles/app.css';

const tabletQuickScreens: Screen[] = ['today', 'crm', 'budgeting', 'xero', 'map'];
type BudgetSection = 'overview' | 'ledger' | 'calendar' | 'property' | 'groceries' | 'fuel' | 'settings' | 'automation';
type LedgerSection = 'income' | 'expenses' | 'debts' | 'savings' | 'assets' | 'all';
const budgetSections: Array<{ id: BudgetSection; label: string; detail: string; icon: React.ElementType }> = [
  { id: 'overview', label: 'Overview', detail: 'Cashflow, analytics, and attention cards', icon: PieChart },
  { id: 'ledger', label: 'Ledger', detail: 'Income, expenses, debts, savings, and assets', icon: Database },
  { id: 'calendar', label: 'Calendar', detail: 'Scheduled payments and transfer planning', icon: CalendarDays },
  { id: 'property', label: 'Property', detail: 'Mortgage costs, tenant offsets, and tenant billing', icon: Building2 },
  { id: 'groceries', label: 'Groceries List', detail: 'Shared house shopping list', icon: ListTodo },
  { id: 'fuel', label: 'Fuel', detail: 'Fuel budget calculator and expense setup', icon: Activity },
  { id: 'settings', label: 'Settings', detail: 'Categories, defaults, cloud status, and checklist', icon: ServerCog },
  { id: 'automation', label: 'Automation', detail: 'Email activity and schedule checks', icon: Zap }
];
const ledgerSections: Array<{ id: LedgerSection; label: string; icon: React.ElementType }> = [
  { id: 'income', label: 'Income', icon: WalletCards },
  { id: 'expenses', label: 'Expenses', icon: ReceiptText },
  { id: 'debts', label: 'Debts', icon: CreditCard },
  { id: 'savings', label: 'Savings', icon: ShieldCheck },
  { id: 'assets', label: 'Assets', icon: Building2 },
  { id: 'all', label: 'All Rows', icon: Database }
];
const budgetDefaultCategories = ['Housing', 'Utilities', 'Subscriptions', 'Transport', 'Food', 'Insurance', 'Business', 'Equipment', 'Other'];
const budgetDefaultCategoryColors = ['#7dd3fc', '#a78bfa', '#34d399', '#fbbf24', '#fb7185', '#60a5fa', '#f472b6', '#c084fc', '#94a3b8'];
type XeroSection = 'overview' | 'invoices' | 'bills' | 'contacts' | 'intelligence' | 'drafts';
const xeroSections: Array<{ id: XeroSection; label: string; detail: string; icon: React.ElementType }> = [
  { id: 'overview', label: 'Overview', detail: 'Cashflow, trends, and health checks', icon: PieChart },
  { id: 'invoices', label: 'Invoices', detail: 'Client invoices, due balances, and collections', icon: CreditCard },
  { id: 'bills', label: 'Bills', detail: 'Supplier bills and payable pressure', icon: ReceiptText },
  { id: 'contacts', label: 'Contacts', detail: 'Customer balances and top clients', icon: UsersRound },
  { id: 'intelligence', label: 'Intelligence', detail: 'NoA cross-checks between Xero and Notion', icon: Sparkles },
  { id: 'drafts', label: 'Drafts', detail: 'Approval-gated draft invoice creation', icon: Save }
];
const workspaceScreenIds: Screen[] = ['today', 'crm', 'budgeting', 'xero', 'map'];
const NOA_LOCK_TIMEOUT_MS = 5 * 60 * 1000;

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/service-worker.js').catch(() => undefined);
  });
}

type CaptureNote = {
  id: string;
  text: string;
  createdAt: string;
  category: CaptureCategory;
};

type CaptureCategory = 'task' | 'client' | 'project' | 'decision' | 'approval' | 'memory';

type SmartBriefing = {
  mainFocus: string;
  risk: string;
  firstAction: string;
};

type IntegrationId = 'openai' | 'supabase' | 'n8n' | 'notion' | 'xero' | 'email';

type IntegrationStatus = Record<IntegrationId, boolean>;

type StartupSyncState = {
  status: 'idle' | 'syncing' | 'synced' | 'partial';
  message: string;
  checkedAt: string;
};

type HubGaugePayload = {
  status: 'online' | 'partial' | 'offline';
  deviceName: string;
  source: string;
  mode: 'simulator' | 'device';
  lastUpdated: string;
  serverFetchedAt: number;
  jobs: {
    active: number;
    today: number;
    tomorrow: number;
    dueSoon: number;
    next: string;
    nextClient: string;
    nextWhen: string;
  };
  spotify: {
    configured: boolean;
    isPlaying: boolean;
    status: 'playing' | 'paused' | 'idle' | 'unconfigured' | 'error';
    trackId: string;
    title: string;
    artist: string;
    album: string;
    image: string;
    progressMs: number;
    durationMs: number;
    serverFetchedAt: number;
    device: {
      name: string;
      type: string;
      volumePercent: number;
    } | null;
  };
  noah: {
    tone: string;
    signal: string;
    stale: boolean;
  };
  errors: string[];
};

type IntegrationField = {
  key: string;
  label: string;
  type?: 'text' | 'password' | 'url';
  placeholder?: string;
  required?: boolean;
  help?: string;
};

type IntegrationSetup = {
  id: IntegrationId;
  name: string;
  role: string;
  statusLabel: string;
  credential: string;
  steps: string[];
  fields: IntegrationField[];
};

type IntegrationTestResult = {
  id: string;
  name: string;
  ok: boolean;
  status: number | string;
  message: string;
};

type IntegrationFieldState = {
  key: string;
  configured: boolean;
  maskedValue: string;
  displayValue: string;
  secret: boolean;
};

type IntegrationSettingsReport = {
  loadedAt: string;
  integrations: Record<string, {
    id: string;
    fields: IntegrationFieldState[];
  }>;
};

type VoiceState = 'off' | 'wake' | 'active' | 'thinking' | 'speaking' | 'error';

type OfflineWakeEvent = {
  type: string;
  text?: string;
  command?: string;
  message?: string;
  code?: number;
};

type VoiceMode = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';
type InteractionMode = 'typed' | 'voice';

type NotionTask = {
  id: string;
  title: string;
  jobId?: string;
  jobTitle?: string;
  client?: string;
  status: string;
  priority: string;
  dueDate: string;
  dueState: string;
  shootDate: string;
  shootState: string;
  effortLevel: string;
  effortSize: string;
  taskTypes: string[];
  assignedTo?: string;
  assignees: Array<{ id: string; name: string; avatarUrl: string | null }>;
  capturedBy?: string;
  payAud?: number | null;
  description: string;
  notes?: string;
  attachments: Array<{ name: string; url: string }>;
  url: string;
  archived: boolean;
  complete: boolean;
  column: string;
};

type NotionItemKind = 'task' | 'job';
type NotionEditorMode = 'create' | 'view' | 'edit';
type AttachmentDraft = {
  id: string;
  name: string;
  url: string;
};
type NotionUpcomingJob = NotionJobsReport['upcomingJobs'][number];
type CalendarJob = NotionUpcomingJob & {
  sourceKind: NotionItemKind;
  sourceLabel: string;
  task?: NotionTask;
};
const EMPTY_UPCOMING_JOBS: NotionUpcomingJob[] = [];

type NotionJobsReport = {
  clients: Array<{
    id: string;
    title: string;
    status?: string;
    priority?: string;
    retainer?: string;
    budget?: number | null;
    industry?: string[];
    contentTypes?: string[];
    coverImages?: Array<{ name: string; url: string }>;
    jobIds?: string[];
    jobCount?: number;
    url: string;
    archived: boolean;
  }>;
  tasks: NotionTask[];
  pipelineTasks: NotionTask[];
  taskList: NotionTask[];
  calendarTasks: NotionTask[];
  upcomingJobs: Array<{
    id: string;
    title: string;
    clientId?: string;
    client: string;
    status: string;
    jobDate: string;
    dueDate?: string;
    dueState: string;
    priority: string;
    deliverableTypes: string[];
    location: string;
    johnsCut?: number | null;
    payAud?: number | null;
    description?: string;
    notes: string;
    attachments: Array<{ name: string; url: string }>;
    taskCount?: number;
    openTasks?: number;
    completedTasks?: number;
    complete?: boolean;
    column?: string;
    clientStatus?: string;
    clientPriority?: string;
    clientRetainer?: string;
    clientIndustry?: string[];
    clientContentTypes?: string[];
    clientCoverImages?: Array<{ name: string; url: string }>;
    shootDate?: string;
    shootState?: string;
    url: string;
    archived: boolean;
  }>;
  fetchedAt: string;
  mainJobsError: string;
  tasksError: string;
  upcomingJobsError: string;
};

type XeroInvoice = {
  id: string;
  number: string;
  reference: string;
  contact: string;
  contactId: string;
  status: string;
  type: string;
  direction: 'income' | 'expense';
  recordKind: 'invoice' | 'bill';
  counterpartyRole: 'client' | 'supplier';
  counterpartyLabel: string;
  isBill: boolean;
  isCustomerInvoice: boolean;
  invoiceDate: string;
  dueDate: string;
  updatedAt: string;
  subTotal: number;
  totalTax: number;
  total: number;
  amountDue: number;
  amountPaid: number;
  amountCredited: number;
  currencyCode: string;
  fullyPaidOnDate: string;
  isOverdue: boolean;
  lineItems: Array<{
    id: string;
    description: string;
    itemCode: string;
    quantity: number;
    unitAmount: number;
    taxAmount: number;
    lineAmount: number;
    accountCode: string;
    taxType: string;
  }>;
  url: string;
};

type XeroContact = {
  id: string;
  name: string;
  email: string;
  phone: string;
  isCustomer: boolean;
  isSupplier: boolean;
  outstanding: number;
  overdue: number;
  updatedAt: string;
};

type XeroReport = {
  ok: boolean;
  message: string;
  fetchedAt: string;
  organisation: {
    name: string;
    legalName: string;
    countryCode: string;
    baseCurrency: string;
    organisationType: string;
    shortCode: string;
    tenantId: string;
  } | null;
  totals: {
    invoiceCount: number;
    billCount: number;
    amountDue: number;
    billsDue: number;
    overdueAmount: number;
    overdueBillsAmount: number;
    overdueCount: number;
    overdueBillsCount: number;
    draftCount: number;
    draftBillsCount: number;
    awaitingPaymentCount: number;
    awaitingPaymentBillsCount: number;
    paidCount: number;
  };
  analytics: {
    monthlyRevenue: Array<{ key: string; label: string; total: number; paid: number; outstanding: number }>;
    monthlyBills: Array<{ key: string; label: string; total: number; paid: number; outstanding: number }>;
    statusBreakdown: Array<{ status: string; count: number; amount: number }>;
    billStatusBreakdown: Array<{ status: string; count: number; amount: number }>;
    topClients: Array<{ name: string; revenue: number; outstanding: number; overdue: number; invoiceCount: number }>;
    topSuppliers: Array<{ name: string; revenue: number; outstanding: number; overdue: number; invoiceCount: number }>;
    overdueAging: Array<{ label: string; count: number; amount: number }>;
  };
  invoices: XeroInvoice[];
  customerInvoices: XeroInvoice[];
  supplierBills: XeroInvoice[];
  contacts: XeroContact[];
  warnings: string[];
};

type XeroIntelligenceSignal = {
  id: string;
  tone: 'danger' | 'warn' | 'calm';
  label: string;
  title: string;
  detail: string;
  action: string;
};

type DraftInvoiceForm = {
  contactName: string;
  reference: string;
  dueDate: string;
  description: string;
  quantity: string;
  unitAmount: string;
  accountCode: string;
  taxType: string;
};

type BudgetItemKind = 'income' | 'expenses' | 'debts' | 'mortgages' | 'mortgageExpenses' | 'assets' | 'savings';
type BudgetModeFilter = 'all' | 'personal' | 'business';

type BudgetOwner = {
  email: string;
  displayName?: string;
  userId: string;
};

type BudgetRow = {
  id?: string;
  local_id?: string;
  mode?: string;
  name?: string;
  goal_name?: string;
  property_address?: string;
  category?: string;
  asset_type?: string;
  debt_type?: string;
  mortgage_local_id?: string;
  amount?: number;
  repayment?: number;
  balance?: number;
  value?: number;
  property_value?: number;
  goal_amount?: number;
  frequency?: string;
  active?: boolean;
  offset_to_tenants?: boolean;
  tenant_count?: number | null;
  weekly_amount?: number;
  monthly_amount?: number;
  weekly_repayment?: number;
  monthly_repayment?: number;
  tenant_bill_weekly?: number;
  tenant_bill_monthly?: number;
  tenant_bill_per_tenant_weekly?: number;
  tenant_bill_per_tenant_monthly?: number;
  schedule_type?: string;
  schedule_day?: number | null;
  schedule_date?: number | null;
  schedule_exact_date?: string;
  notes?: string;
  raw_data?: Record<string, unknown>;
  sourceTable?: string;
  updated_at?: string;
};

type BudgetTables = Record<BudgetItemKind, BudgetRow[]>;

type BudgetTotals = {
  weeklyIncome: number;
  weeklyExpenses: number;
  weeklyDebtRepayments: number;
  weeklyMortgageRepayments: number;
  weeklyMortgageExpenses: number;
  weeklySavings: number;
  weeklyTenantOffsets: number;
  netWeekly: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  assetValue: number;
  debtBalance: number;
  mortgageBalance: number;
  netWorth: number;
};

type BudgetMortgageBill = {
  id?: string;
  localId?: string;
  name: string;
  propertyAddress: string;
  tenantCount: number;
  weeklyRepayment: number;
  weeklyOffsetExpenses: number;
  weeklyUtilitiesSplit?: number;
  weeklyTenantBill: number;
  expenses: BudgetRow[];
};

type BudgetTenant = {
  id: string;
  name: string;
  email: string;
  mortgageLocalId: string;
  rent: number;
  rentFrequency: string;
  active: boolean;
};

type BudgetEmailSettings = {
  enabled: boolean;
  cycleDay: number;
  subjectPrefix: string;
  replyTo: string;
  notes: string;
  tenants: BudgetTenant[];
};

type BudgetEmailPreview = {
  tenantId: string;
  tenantName: string;
  to: string;
  from: string;
  replyTo: string;
  subject: string;
  text: string;
  weeklyBill: number;
  rent: number;
  utilities: number;
  total: number;
  mortgageName: string;
  mortgageLocalId: string;
};

type BudgetEmailSendResult = {
  ok: boolean;
  to: string;
  status: number | string;
  id?: string;
  threadId?: string;
  message: string;
  cycleKey?: string;
  source?: string;
  provider?: string;
};

type BudgetEmailActivity = {
  id: string;
  createdAt: string;
  cycleKey: string;
  source: string;
  status: string;
  provider: string;
  tenantId: string;
  tenantName: string;
  to: string;
  subject: string;
  rent: number;
  utilities: number;
  total: number;
  mortgageName: string;
  messageId: string;
  rawStatus: number | string;
  message: string;
};

type GroceryItem = {
  id: string;
  item: string;
  quantity: string;
  category: string;
  addedBy: string;
  addedByUserId?: string;
  completed: boolean;
  completedAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

type GroceryScreensaver = {
  id: string;
  name: string;
  image: string;
  imagePath?: string;
  storageBucket?: string;
  enabled: boolean;
};

type GroceryListPersonalisation = {
  sleepMinutes: number;
  cycleSeconds: number;
  screensavers: GroceryScreensaver[];
};

type PublicGroceryListReport = {
  ok: boolean;
  message: string;
  fetchedAt: string;
  owner: BudgetOwner;
  groceryItems: GroceryItem[];
  personalisation: GroceryListPersonalisation;
};

type BudgetTenantBillingRow = {
  tenant: BudgetTenant;
  mortgage: BudgetMortgageBill | null;
  rentWeekly: number;
  utilitiesWeekly: number;
  totalWeekly: number;
  warnings: string[];
};

type BudgetReport = {
  ok: boolean;
  message: string;
  fetchedAt: string;
  owner: BudgetOwner;
  tables: BudgetTables;
  totals: BudgetTotals;
  mortgageSummary: {
    mortgages: BudgetMortgageBill[];
    totalWeeklyTenantBill: number;
    totalWeeklyOffsetExpenses: number;
  };
  emailSettings: BudgetEmailSettings;
  tenantEmailActivity: BudgetEmailActivity[];
  groceryItems: GroceryItem[];
  settings: Record<string, unknown> | null;
};

const defaultGroceryListPersonalisation: GroceryListPersonalisation = {
  sleepMinutes: 5,
  cycleSeconds: 12,
  screensavers: []
};

type BudgetEditorField = {
  key: keyof BudgetRow | string;
  label: string;
  type?: 'text' | 'number' | 'checkbox' | 'textarea' | 'select' | 'date' | 'mortgage';
  options?: string[];
  placeholder?: string;
  help?: string;
  wide?: boolean;
};

type BudgetScheduleOccurrence = {
  id: string;
  date: string;
  title: string;
  amount: number;
  kind: BudgetItemKind;
  kindLabel: string;
  frequency: string;
  source: BudgetRow;
};

type BudgetCalendarDay = {
  date: string;
  dayNumber: number;
  isToday: boolean;
  isMuted: boolean;
  income: number;
  outgoing: number;
  incomePercent: number;
  outgoingPercent: number;
  events: BudgetScheduleOccurrence[];
};

const emptyJobsReport: NotionJobsReport = {
  clients: [],
  tasks: [],
  pipelineTasks: [],
  taskList: [],
  calendarTasks: [],
  upcomingJobs: [],
  fetchedAt: '',
  mainJobsError: '',
  tasksError: '',
  upcomingJobsError: ''
};

const emptyHubGaugePayload: HubGaugePayload = {
  status: 'partial',
  deviceName: 'HubGauge',
  source: 'noah-local',
  mode: 'simulator',
  lastUpdated: 'Not synced',
  serverFetchedAt: Date.now(),
  jobs: {
    active: 0,
    today: 0,
    tomorrow: 0,
    dueSoon: 0,
    next: 'No job synced',
    nextClient: '',
    nextWhen: ''
  },
  spotify: {
    configured: false,
    isPlaying: false,
    status: 'unconfigured',
    trackId: '',
    title: 'Connect Spotify',
    artist: 'Noah will keep this server-side',
    album: '',
    image: '',
    progressMs: 0,
    durationMs: 180000,
    serverFetchedAt: Date.now(),
    device: null
  },
  noah: {
    tone: 'calm',
    signal: 'Noah companion surface',
    stale: false
  },
  errors: []
};

const emptyXeroReport: XeroReport = {
  ok: false,
  message: '',
  fetchedAt: '',
  organisation: null,
  totals: {
    invoiceCount: 0,
    billCount: 0,
    amountDue: 0,
    billsDue: 0,
    overdueAmount: 0,
    overdueBillsAmount: 0,
    overdueCount: 0,
    overdueBillsCount: 0,
    draftCount: 0,
    draftBillsCount: 0,
    awaitingPaymentCount: 0,
    awaitingPaymentBillsCount: 0,
    paidCount: 0
  },
  analytics: {
    monthlyRevenue: [],
    monthlyBills: [],
    statusBreakdown: [],
    billStatusBreakdown: [],
    topClients: [],
    topSuppliers: [],
    overdueAging: [
      { label: '1-30 days', count: 0, amount: 0 },
      { label: '31-60 days', count: 0, amount: 0 },
      { label: '61-90 days', count: 0, amount: 0 },
      { label: '90+ days', count: 0, amount: 0 }
    ]
  },
  invoices: [],
  customerInvoices: [],
  supplierBills: [],
  contacts: [],
  warnings: []
};

const emptyBudgetReport: BudgetReport = {
  ok: false,
  message: '',
  fetchedAt: '',
  owner: { email: 'info@fearlessau.com', userId: '' },
  tables: {
    income: [],
    expenses: [],
    debts: [],
    mortgages: [],
    mortgageExpenses: [],
    assets: [],
    savings: []
  },
  totals: {
    weeklyIncome: 0,
    weeklyExpenses: 0,
    weeklyDebtRepayments: 0,
    weeklyMortgageRepayments: 0,
    weeklyMortgageExpenses: 0,
    weeklySavings: 0,
    weeklyTenantOffsets: 0,
    netWeekly: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    assetValue: 0,
    debtBalance: 0,
    mortgageBalance: 0,
    netWorth: 0
  },
  mortgageSummary: {
    mortgages: [],
    totalWeeklyTenantBill: 0,
    totalWeeklyOffsetExpenses: 0
  },
  emailSettings: {
    enabled: false,
    cycleDay: 1,
    subjectPrefix: 'Weekly property bill',
    replyTo: 'info@fearlessau.com',
    notes: '',
    tenants: []
  },
  tenantEmailActivity: [],
  groceryItems: [],
  settings: null
};

function normalizeGroceryListPersonalisation(value: unknown): GroceryListPersonalisation {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const screensavers = Array.isArray(source.screensavers) ? source.screensavers : [];

  return {
    sleepMinutes: clampNumberValue(source.sleepMinutes ?? source.sleep_minutes, 1, 60, 5),
    cycleSeconds: clampNumberValue(source.cycleSeconds ?? source.cycle_seconds, 5, 120, 12),
    screensavers: screensavers
      .map((item, index) => {
        const row = item && typeof item === 'object' ? item as Record<string, unknown> : {};
        const image = String(row.image || row.src || '').trim();
        if (!image) return null;
        return {
          id: String(row.id || `screensaver-${index + 1}`),
          name: String(row.name || `Screensaver ${index + 1}`).trim() || `Screensaver ${index + 1}`,
          image,
          imagePath: String(row.imagePath || row.image_path || '').trim() || undefined,
          storageBucket: String(row.storageBucket || row.storage_bucket || '').trim() || undefined,
          enabled: row.enabled !== false
        };
      })
      .filter(Boolean) as GroceryScreensaver[]
  };
}

function readBudgetGroceryPersonalisation(settings: BudgetReport['settings']): GroceryListPersonalisation {
  const raw = settings && typeof settings === 'object' ? settings as Record<string, unknown> : {};
  const rawData = raw.raw_data && typeof raw.raw_data === 'object' ? raw.raw_data as Record<string, unknown> : {};
  const personalisation = rawData.personalisation && typeof rawData.personalisation === 'object'
    ? rawData.personalisation as Record<string, unknown>
    : {};
  return normalizeGroceryListPersonalisation(personalisation.groceryList || {});
}

function loadCachedGroceryScreensavers(): GroceryListPersonalisation {
  try {
    const saved = window.localStorage.getItem(GROCERY_SCREENSAVER_CACHE_KEY);
    return normalizeGroceryListPersonalisation(saved ? JSON.parse(saved) : {});
  } catch {
    return defaultGroceryListPersonalisation;
  }
}

function saveCachedGroceryScreensavers(personalisation: GroceryListPersonalisation) {
  window.localStorage.setItem(GROCERY_SCREENSAVER_CACHE_KEY, JSON.stringify(personalisation));
  window.localStorage.setItem(GROCERY_SCREENSAVER_SYNCED_AT_KEY, new Date().toISOString());
}

async function warmGroceryScreensaverCache(personalisation: GroceryListPersonalisation) {
  const urls = personalisation.screensavers
    .filter((item) => item.enabled && /^https?:\/\//i.test(item.image))
    .map((item) => item.image);

  if (urls.length === 0) return;

  if ('caches' in window) {
    const cache = await caches.open('noa-grocery-screensavers-v1');
    await Promise.allSettled(urls.map(async (url) => {
      const cached = await cache.match(url);
      if (cached) return;
      let response = await fetch(url, { mode: 'cors', cache: 'reload' }).catch(() => null);
      if (!response) response = await fetch(url, { mode: 'no-cors', cache: 'reload' });
      if (response.ok || response.type === 'opaque') await cache.put(url, response.clone());
    }));
    return;
  }

  await Promise.allSettled(urls.map((url) => new Promise<void>((resolve) => {
    const image = new Image();
    image.onload = () => resolve();
    image.onerror = () => resolve();
    image.src = url;
  })));
}

function clampNumberValue(value: unknown, min: number, max: number, fallback: number) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

async function compressImageFileToDataUrl(file: File, maxDimension = 1600, quality = 0.82) {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const next = new Image();
      next.onload = () => resolve(next);
      next.onerror = () => reject(new Error(`Could not load ${file.name}.`));
      next.src = objectUrl;
    });

    const scale = Math.min(1, maxDimension / Math.max(image.width || 1, image.height || 1));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not prepare image compression.');
    context.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', quality);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

const jobColumns = ['Not Started', 'In Progress', 'Ready for Revision', 'Final Draft/Notes'];
const GROCERY_SCREENSAVER_CACHE_KEY = 'noa.groceryList.screensavers.v2';
const GROCERY_SCREENSAVER_SYNCED_AT_KEY = 'noa.groceryList.screensavers.syncedAt';

if (!window.noa) {
  window.noa = createBrowserNoaClient();
}

function createBrowserNoaClient(): NonNullable<Window['noa']> {
  const postJson = async <T,>(url: string, payload: unknown = {}) => {
    const response = await fetch(url, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return response.json() as Promise<T>;
  };

  return {
    isBrowserLanMode: true,
    getVersion: async () => ({
      version: '0.1.0',
      platform: 'vercel',
      phase: 'Cloud deployment',
      auth: 'pin-cookie'
    }),
    getAuthStatus: () => postJson('/api/integrations/settings', { action: 'status' }),
    testIntegrations: () => postJson('/api/integrations/test-all'),
    getIntegrationSettings: () => fetch('/api/integrations/settings', { credentials: 'same-origin' }).then((response) => response.json()),
    saveIntegrationSettings: (payload) => postJson('/api/integrations/settings', payload),
    testIntegration: (payload) => postJson('/api/integrations/test', payload),
    revealIntegrationSetting: (payload) => postJson('/api/integrations/reveal', payload),
    getHubGauge: () => fetch('/api/hubgauge', { credentials: 'same-origin' }).then((response) => response.json()),
    getNotionJobs: () => fetch('/api/notion-jobs', { credentials: 'same-origin' }).then((response) => response.json()),
    updateNotionTaskStatus: (payload) => postJson('/api/notion-task-status', payload),
    manageNotionItem: (payload) => postJson('/api/notion-item', payload),
    getXeroSummary: () => fetch('/api/xero/summary', { credentials: 'same-origin' }).then((response) => response.json()),
    getBudgetSummary: () => fetch('/api/budget/summary', { credentials: 'same-origin' }).then((response) => response.json()),
    manageBudgetItem: (payload) => postJson('/api/budget/item', payload),
    manageGroceryItem: (payload) => postJson('/api/budget/grocery', payload),
    getPublicGroceryListSummary: (options) => {
      const params = options?.includePersonalisation ? '?includePersonalisation=1' : '';
      return fetch(`/api/grocery-list/summary${params}`, { cache: options?.includePersonalisation ? 'no-store' : 'default' }).then((response) => response.json());
    },
    managePublicGroceryListItem: (payload) => postJson('/api/grocery-list/item', payload),
    getNoaPersonalisationSettings: () => fetch('/api/grocery-list/settings', { cache: 'no-store' }).then((response) => response.json()),
    saveNoaPersonalisationSettings: (payload) => postJson('/api/grocery-list/settings', payload),
    saveBudgetSettings: (payload) => postJson('/api/budget/settings', payload),
    saveBudgetProfile: (payload) => postJson('/api/budget/profile', payload),
    saveBudgetEmailSettings: (payload) => postJson('/api/budget/email-settings', payload),
    sendBudgetTenantEmail: (payload) => postJson('/api/budget/tenant-email', payload),
    runBudgetTenantEmailSchedule: (payload) => postJson('/api/budget/tenant-email-schedule', payload),
    startOfflineWake: async () => ({
      ok: false,
      message: 'Offline Hey Noah activation runs on the Windows home base. Tablet mode supports tap-to-talk and spoken replies.'
    }),
    stopOfflineWake: async () => ({ ok: true, message: 'Offline activation is not running in browser mode.' }),
    setOfflineWakePaused: async () => ({ ok: true, message: 'Offline activation is managed by the Windows home base.' }),
    onOfflineWakeEvent: () => () => undefined,
    transcribeAudio: async (payload) => postJson('/api/transcribe-audio', {
      ...payload,
      audio: await arrayBufferToBase64(payload.audio),
      audioEncoding: 'base64'
    }),
    synthesizeSpeech: (payload) => postJson('/api/synthesize-speech', payload),
    askNoah: (payload) => postJson('/api/ask-noah', payload)
  };
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  return new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || '').split(',')[1] || '');
    reader.readAsDataURL(new Blob([buffer]));
  });
}

const integrationSetups: IntegrationSetup[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    role: 'Powers the real Noah advisor layer.',
    statusLabel: 'Ready for your API key',
    credential: 'Vercel env -> OPENAI_API_KEY',
    steps: [
      'Create or reuse your OpenAI API key.',
      'Add it as OPENAI_API_KEY in Vercel project environment variables.',
      'NoA will call OpenAI through Vercel API routes, not directly from the browser.'
    ],
    fields: [
      { key: 'OPENAI_API_KEY', label: 'API key', type: 'password', required: true, placeholder: 'sk-...', help: 'Used by the Windows bridge only.' },
      { key: 'OPENAI_MODEL', label: 'Noah model', placeholder: 'gpt-4.1-mini', help: 'Leave blank to use the default.' },
      { key: 'OPENAI_TTS_VOICE', label: 'Voice', placeholder: 'marin', help: 'Current preferred voice for spoken replies.' },
      { key: 'OPENAI_TTS_MODEL', label: 'Speech model', placeholder: 'gpt-4o-mini-tts' },
      { key: 'OPENAI_TRANSCRIBE_MODEL', label: 'Speech-to-text model', placeholder: 'gpt-4o-transcribe' }
    ]
  },
  {
    id: 'supabase',
    name: 'Supabase',
    role: 'Stores durable memory, approvals, events, tasks, projects, clients, and conversations.',
    statusLabel: 'Schema next',
    credential: 'Vercel env -> Supabase URL, anon key, and private service role key',
    steps: [
      'Create a Supabase project.',
      'Add the project URL and anon key locally.',
      'Run the NoA memory schema before syncing local captures.',
      'Add the service role key in Vercel if you want NoA to store private rotating tokens such as Xero.'
    ],
    fields: [
      { key: 'SUPABASE_URL', label: 'Project URL', type: 'url', required: true, placeholder: 'https://your-project.supabase.co' },
      { key: 'SUPABASE_ANON_KEY', label: 'Anon key', type: 'password', required: true, placeholder: 'eyJ...' },
      { key: 'SUPABASE_SERVICE_ROLE_KEY', label: 'Service role key', type: 'password', placeholder: 'Keeps private rotating tokens server-side' }
    ]
  },
  {
    id: 'n8n',
    name: 'n8n',
    role: 'Runs schedules, triggers, and external-service workflows after NoA approval.',
    statusLabel: 'Webhook bridge next',
    credential: 'n8n webhook URL plus shared secret',
    steps: [
      'Create an n8n workflow with a webhook or schedule trigger.',
      'Send normalised events to NoA.',
      'Only execute external actions after NoA creates an approval.'
    ],
    fields: [
      { key: 'N8N_WEBHOOK_URL', label: 'Webhook URL', type: 'url', required: true, placeholder: 'https://.../webhook/noa/command' },
      { key: 'N8N_SHARED_SECRET', label: 'Shared secret', type: 'password', required: true, placeholder: 'Long random secret' }
    ]
  },
  {
    id: 'notion',
    name: 'Notion',
    role: 'Provides read-only project, note, task, and knowledge context.',
    statusLabel: 'Read-only first',
    credential: 'Vercel env -> Notion token and database/view IDs',
    steps: [
      'Create a Notion integration.',
      'Share selected pages or databases with the integration.',
      'Start with read-only sync into NoA memory.'
    ],
    fields: [
      { key: 'NOTION_TOKEN', label: 'Internal integration secret', type: 'password', required: true, placeholder: 'secret_...' },
      { key: 'NOTION_CLIENTS_DATABASE_ID', label: 'Clients database ID', required: true, placeholder: '5a836c85-e6ca-4fc5-b89e-b3b97b4bf38b' },
      { key: 'NOTION_CLIENTS_DATA_SOURCE_ID', label: 'Clients data source ID', required: true, placeholder: '9b4ead34-fcaf-4a27-a999-72248287878b' },
      { key: 'NOTION_JOBS_DATABASE_ID', label: 'Jobs database ID', required: true, placeholder: '47b8cec5-c99a-4975-a2d6-ff1e990eb2b1' },
      { key: 'NOTION_JOBS_DATA_SOURCE_ID', label: 'Jobs data source ID', required: true, placeholder: 'e9c28fc3-a5ab-44ff-b589-898a31b05e55' },
      { key: 'NOTION_TASKS_DATABASE_ID', label: 'Tasks database ID', required: true, placeholder: 'b5cdeb9c-0bcb-4c87-833b-ddeeee4ca956' },
      { key: 'NOTION_TASKS_DATA_SOURCE_ID', label: 'Tasks data source ID', required: true, placeholder: '476fc915-819c-45e2-b990-8917290f675c' }
    ]
  },
  {
    id: 'xero',
    name: 'Xero',
    role: 'Provides accounting context such as organisation, contacts, invoices, bills, and financial signals.',
    statusLabel: 'OAuth setup',
    credential: 'Vercel env -> Xero client, refresh token, and tenant id',
    steps: [
      'Create a Xero OAuth2 app in the Xero developer portal.',
      'Add https://no-a.vercel.app/api/xero/callback as the exact redirect URI.',
      'Run the Supabase private settings SQL and add SUPABASE_SERVICE_ROLE_KEY so NoA can preserve rotating refresh tokens.',
      'Save XERO_CLIENT_ID and XERO_CLIENT_SECRET in Vercel, redeploy, then open https://no-a.vercel.app/api/xero/start.',
      'Reconnect Xero after Phase 4 so the OAuth token includes draft-invoice permissions.',
      'NoA will save the returned refresh token automatically when the private token store is configured.'
    ],
    fields: [
      { key: 'XERO_CLIENT_ID', label: 'Client ID', required: true, placeholder: 'Xero app client id' },
      { key: 'XERO_CLIENT_SECRET', label: 'Client secret', type: 'password', required: true, placeholder: 'Xero app client secret' },
      { key: 'XERO_REFRESH_TOKEN', label: 'Refresh token fallback', type: 'password', placeholder: 'Used once before Supabase stores the rotating token' },
      { key: 'XERO_TENANT_ID', label: 'Tenant ID', placeholder: 'Returned by /api/xero/callback' },
      { key: 'XERO_REDIRECT_URI', label: 'Redirect URI', placeholder: 'https://no-a.vercel.app/api/xero/callback' }
    ]
  },
  {
    id: 'email',
    name: 'Email',
    role: 'Sends approval-gated tenant billing emails and future NoA notifications through Gmail API.',
    statusLabel: 'Gmail OAuth setup',
    credential: 'Vercel env -> Google OAuth client plus Gmail refresh token',
    steps: [
      'Create a Google Cloud OAuth web client and enable the Gmail API.',
      'Add https://no-a.vercel.app/api/gmail/callback as an authorised redirect URI.',
      'Save GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GMAIL_REDIRECT_URI, and GMAIL_SENDER_EMAIL in Vercel, then redeploy.',
      'Open https://no-a.vercel.app/api/gmail/start and approve Gmail send access.',
      'NoA will save the Gmail refresh token automatically when Supabase private settings are configured.'
    ],
    fields: [
      { key: 'GOOGLE_CLIENT_ID', label: 'Google client ID', required: true, placeholder: 'Google OAuth web client id' },
      { key: 'GOOGLE_CLIENT_SECRET', label: 'Google client secret', type: 'password', required: true, placeholder: 'Google OAuth web client secret' },
      { key: 'GMAIL_REFRESH_TOKEN', label: 'Gmail refresh token fallback', type: 'password', placeholder: 'Stored automatically in Supabase after /api/gmail/start' },
      { key: 'GMAIL_SENDER_EMAIL', label: 'Sender email', required: true, placeholder: 'info@fearlessau.com' },
      { key: 'GMAIL_REDIRECT_URI', label: 'Redirect URI', required: true, placeholder: 'https://no-a.vercel.app/api/gmail/callback' },
      { key: 'RESEND_API_KEY', label: 'Resend fallback API key', type: 'password', placeholder: 'Optional fallback: re_...' },
      { key: 'BUDGET_EMAIL_FROM', label: 'Resend fallback sender', placeholder: 'Optional fallback: NoA <info@fearlessau.com>' }
    ]
  },
];

function App() {
  const isPublicGroceryListRoute = typeof window !== 'undefined' && /^\/grocery-list\/?$/.test(window.location.pathname);
  if (isPublicGroceryListRoute) {
    return <GroceryListStandalonePage />;
  }
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [screen, setScreen] = useState<Screen>('today');
  const [budgetSection, setBudgetSection] = useState<BudgetSection>('overview');
  const [xeroSection, setXeroSection] = useState<XeroSection>('overview');
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [mobileDrawerDragX, setMobileDrawerDragX] = useState(0);
  const [isMobileDrawerDragging, setIsMobileDrawerDragging] = useState(false);
  const [isMobileDrawerClosing, setIsMobileDrawerClosing] = useState(false);
  const [command, setCommand] = useState('');
  const [capture, setCapture] = useState('');
  const [notes, setNotes] = useState<CaptureNote[]>(() => {
    const saved = window.localStorage.getItem('noa.quickCapture');
    if (!saved) return [];
    return (JSON.parse(saved) as Partial<CaptureNote>[]).map((note) => ({
      id: note.id ?? crypto.randomUUID(),
      text: note.text ?? '',
      createdAt: note.createdAt ?? new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }),
      category: note.category ?? classifyCapture(note.text ?? '')
    }));
  });
  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus>(() => {
    const saved = window.localStorage.getItem('noa.integrationStatus');
    return saved
      ? { openai: false, supabase: false, n8n: false, notion: false, xero: false, email: false, ...(JSON.parse(saved) as Partial<IntegrationStatus>) }
      : { openai: false, supabase: false, n8n: false, notion: false, xero: false, email: false };
  });
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'noah',
      text: 'I am here. I can help you find the most important thing, protect your focus, and prepare any actions for review before anything leaves NoA.'
    }
  ]);
  const [testResults, setTestResults] = useState<IntegrationTestResult[]>([]);
  const [testCheckedAt, setTestCheckedAt] = useState('');
  const [isTestingIntegrations, setIsTestingIntegrations] = useState(false);
  const [isNoahThinking, setIsNoahThinking] = useState(false);
  const [jobsReport, setJobsReport] = useState<NotionJobsReport>(emptyJobsReport);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [hubGaugePayload, setHubGaugePayload] = useState<HubGaugePayload>(emptyHubGaugePayload);
  const [isLoadingHubGauge, setIsLoadingHubGauge] = useState(false);
  const [xeroReport, setXeroReport] = useState<XeroReport>(emptyXeroReport);
  const [isLoadingXero, setIsLoadingXero] = useState(false);
  const [budgetReport, setBudgetReport] = useState<BudgetReport>(emptyBudgetReport);
  const [isLoadingBudget, setIsLoadingBudget] = useState(false);
  const [startupSync, setStartupSync] = useState<StartupSyncState>({
    status: 'idle',
    message: 'Data will sync automatically.',
    checkedAt: ''
  });
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>('off');
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceError, setVoiceError] = useState('');
  const [voiceFallbackMode, setVoiceFallbackMode] = useState(false);
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [voiceActivationEnabled, setVoiceActivationEnabled] = useState(false);
  const [offlineWakeReady, setOfflineWakeReady] = useState(false);
  const [voiceVolume, setVoiceVolume] = useState(() => {
    const saved = window.localStorage.getItem('noa.voiceVolume');
    return saved ? Number(saved) : 0.86;
  });
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const wakeRecorderRef = useRef<MediaRecorder | null>(null);
  const wakeStreamRef = useRef<MediaStream | null>(null);
  const voiceChunksRef = useRef<Blob[]>([]);
  const wakeChunksRef = useRef<Blob[]>([]);
  const voiceAudioRef = useRef<HTMLAudioElement | null>(null);
  const voiceAudioUrlRef = useRef('');
  const thinkingAudioContextRef = useRef<AudioContext | null>(null);
  const thinkingSoundTimerRef = useRef<number | null>(null);
  const followUpListenTimerRef = useRef<number | null>(null);
  const voiceEnabledRef = useRef(false);
  const voiceActivationEnabledRef = useRef(false);
  const wakeLoopActiveRef = useRef(false);
  const voiceVolumeRef = useRef(voiceVolume);
  const voiceStateRef = useRef<VoiceState>('off');
  const startupSyncStartedRef = useRef(false);
  const hubGaugeRequestRef = useRef<Promise<HubGaugePayload> | null>(null);
  const jobsRequestRef = useRef<Promise<NotionJobsReport> | null>(null);
  const xeroRequestRef = useRef<Promise<XeroReport> | null>(null);
  const budgetRequestRef = useRef<Promise<BudgetReport> | null>(null);
  const lockTimerRef = useRef<number | null>(null);
  const mobileDrawerCloseTimerRef = useRef<number | null>(null);
  const mobileMenuSwipeRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    startOpen: false,
    sheetWidth: 0,
    startedAt: 0
  });
  const voiceSupported = false;
  const recordingSupported = typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia) && typeof MediaRecorder !== 'undefined';

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const lockNoa = () => {
    if (lockTimerRef.current) {
      window.clearTimeout(lockTimerRef.current);
      lockTimerRef.current = null;
    }
    setIsMoreMenuOpen(false);
    setIsMobileDrawerDragging(false);
    setIsMobileDrawerClosing(false);
    setMobileDrawerDragX(0);
    setPinInput('');
    setPinError('');
    setIsUnlocked(false);
    interruptNoahVoice();
    void fetch('/api/integrations/settings', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'lock' })
    }).catch(() => undefined);
  };

  const resetLockTimer = () => {
    if (!isUnlocked) return;
    if (lockTimerRef.current) window.clearTimeout(lockTimerRef.current);
    lockTimerRef.current = window.setTimeout(lockNoa, NOA_LOCK_TIMEOUT_MS);
  };

  const submitPin = async (candidatePin = pinInput) => {
    if (isUnlocking) return;
    setIsUnlocking(true);
    try {
      const response = await fetch('/api/integrations/settings', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'unlock', pin: candidatePin })
      });
      const result = await response.json();
      if (response.ok && result.ok) {
        setPinError('');
        setPinInput('');
        setIsUnlocked(true);
        return;
      }
      setPinError(result.message || 'Incorrect PIN. Try again.');
      setPinInput('');
    } catch {
      setPinError('NoA could not reach the secure authorization service. Refresh and try again.');
    } finally {
      setIsUnlocking(false);
    }
  };

  const resetMobileMenuSwipe = () => {
    mobileMenuSwipeRef.current = {
      active: false,
      startX: 0,
      startY: 0,
      lastX: 0,
      lastY: 0,
      startOpen: false,
      sheetWidth: 0,
      startedAt: 0
    };
    setIsMobileDrawerDragging(false);
    setIsMobileDrawerClosing(false);
    setMobileDrawerDragX(0);
  };

  const shouldIgnoreMobileMenuSwipe = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false;
    return Boolean(target.closest('input, textarea, select, button, a, [role="button"], [data-swipe-ignore="true"]'));
  };

  const handleMobileMenuTouchStart = (event: React.TouchEvent<HTMLElement>) => {
    if (event.touches.length !== 1 || window.innerWidth > 920 || shouldIgnoreMobileMenuSwipe(event.target)) {
      resetMobileMenuSwipe();
      return;
    }

    const touch = event.touches[0];
    const sheetWidth = Math.min(window.innerWidth * 0.86, 360);
    const canOpenFromEdge = !isMoreMenuOpen && touch.clientX <= 34;

    if (!canOpenFromEdge) {
      resetMobileMenuSwipe();
      return;
    }

    mobileMenuSwipeRef.current = {
      active: true,
      startX: touch.clientX,
      startY: touch.clientY,
      lastX: touch.clientX,
      lastY: touch.clientY,
      startOpen: isMoreMenuOpen,
      sheetWidth,
      startedAt: performance.now()
    };
    setIsMobileDrawerDragging(false);
    setMobileDrawerDragX(isMoreMenuOpen ? 0 : -sheetWidth);
  };

  const handleMobileMenuTouchMove = (event: React.TouchEvent<HTMLElement>) => {
    const gesture = mobileMenuSwipeRef.current;
    if (!gesture.active || event.touches.length !== 1) return;

    const touch = event.touches[0];
    gesture.lastX = touch.clientX;
    gesture.lastY = touch.clientY;
    const deltaX = touch.clientX - gesture.startX;
    const deltaY = touch.clientY - gesture.startY;
    const horizontalIntent = Math.abs(deltaX) > 8 && Math.abs(deltaX) > Math.abs(deltaY) * 1.15;

    if (Math.abs(deltaY) > 46 && Math.abs(deltaY) > Math.abs(deltaX)) {
      resetMobileMenuSwipe();
      return;
    }

    if (!horizontalIntent) return;
    event.preventDefault();
    if (!isMobileDrawerDragging) setIsMobileDrawerDragging(true);
    if (!isMoreMenuOpen) {
      setIsMoreMenuOpen(true);
    }
    const baseX = gesture.startOpen ? 0 : -gesture.sheetWidth;
    const nextX = Math.min(0, Math.max(-gesture.sheetWidth, baseX + deltaX));
    setMobileDrawerDragX(nextX);
  };

  const handleMobileMenuTouchEnd = () => {
    const gesture = mobileMenuSwipeRef.current;
    if (!gesture.active) {
      resetMobileMenuSwipe();
      return;
    }

    const deltaX = gesture.lastX - gesture.startX;
    const deltaY = gesture.lastY - gesture.startY;
    const elapsed = Math.max(1, performance.now() - gesture.startedAt);
    const velocity = deltaX / elapsed;
    const baseX = gesture.startOpen ? 0 : -gesture.sheetWidth;
    const finalX = Math.min(0, Math.max(-gesture.sheetWidth, baseX + deltaX));
    const openProgress = 1 + finalX / gesture.sheetWidth;
    const horizontalIntent = Math.abs(deltaX) > Math.abs(deltaY) * 1.1;
    if (horizontalIntent) {
      const shouldOpen = velocity > 0.45 || (velocity > -0.35 && openProgress > 0.44);
      setIsMoreMenuOpen(shouldOpen);
    }
    resetMobileMenuSwipe();
  };

  const openMobileMenu = () => {
    if (mobileDrawerCloseTimerRef.current) {
      window.clearTimeout(mobileDrawerCloseTimerRef.current);
      mobileDrawerCloseTimerRef.current = null;
    }
    setIsMobileDrawerClosing(false);
    setIsMobileDrawerDragging(false);
    setMobileDrawerDragX(0);
    setIsMoreMenuOpen(true);
  };

  const closeMobileMenu = () => {
    if (mobileDrawerCloseTimerRef.current) window.clearTimeout(mobileDrawerCloseTimerRef.current);
    if (typeof window !== 'undefined' && window.innerWidth <= 920 && isMoreMenuOpen) {
      const sheetWidth = Math.min(window.innerWidth * 0.86, 360);
      setIsMobileDrawerDragging(false);
      setIsMobileDrawerClosing(true);
      setMobileDrawerDragX(-sheetWidth);
      mobileDrawerCloseTimerRef.current = window.setTimeout(() => {
        setIsMoreMenuOpen(false);
        setIsMobileDrawerClosing(false);
        setMobileDrawerDragX(0);
        mobileDrawerCloseTimerRef.current = null;
      }, 240);
      return;
    }
    setIsMobileDrawerDragging(false);
    setIsMobileDrawerClosing(false);
    setMobileDrawerDragX(0);
    setIsMoreMenuOpen(false);
  };

  useEffect(() => {
    window.localStorage.setItem('noa.quickCapture', JSON.stringify(notes));
  }, [notes]);

  useEffect(() => () => {
    if (mobileDrawerCloseTimerRef.current) {
      window.clearTimeout(mobileDrawerCloseTimerRef.current);
      mobileDrawerCloseTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem('noa.integrationStatus', JSON.stringify(integrationStatus));
  }, [integrationStatus]);

  useEffect(() => {
    voiceEnabledRef.current = voiceEnabled;
    window.localStorage.setItem('noa.voiceEnabled', String(voiceEnabled));
  }, [voiceEnabled]);

  useEffect(() => {
    voiceStateRef.current = voiceState;
  }, [voiceState]);

  useEffect(() => {
    voiceActivationEnabledRef.current = voiceActivationEnabled;
  }, [voiceActivationEnabled]);

  useEffect(() => {
    voiceVolumeRef.current = voiceVolume;
    window.localStorage.setItem('noa.voiceVolume', String(voiceVolume));
    if (voiceAudioRef.current) voiceAudioRef.current.volume = voiceVolume;
  }, [voiceVolume]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      mediaRecorderRef.current?.stop();
      stopWakeLoop();
      void window.noa?.stopOfflineWake?.();
      stopThinkingSound();
      if (followUpListenTimerRef.current) window.clearTimeout(followUpListenTimerRef.current);
      voiceAudioRef.current?.pause();
      if (voiceAudioUrlRef.current) URL.revokeObjectURL(voiceAudioUrlRef.current);
      window.speechSynthesis?.cancel();
    };
  }, []);

  const addCapture = () => {
    const value = capture.trim();
    if (!value) return;

    setNotes((current) => [
      {
        id: crypto.randomUUID(),
        text: value,
        createdAt: new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }),
        category: classifyCapture(value)
      },
      ...current
    ]);
    setCapture('');
  };

  const smartBriefing = useMemo(() => buildSmartBriefing(notes), [notes]);
  const inboxSummary = useMemo(() => buildInboxSummary(notes), [notes]);
  const applyIntegrationResults = (results: IntegrationTestResult[]) => {
    setIntegrationStatus((current) => {
      const next = { ...current };
      for (const result of results) {
        if (result.id in next) next[result.id as IntegrationId] = result.ok;
      }
      return next;
    });
  };

  const recordIntegrationTestResult = (result: IntegrationTestResult, checkedAt: string) => {
    setTestResults((current) => {
      const withoutCurrent = current.filter((item) => item.id !== result.id);
      return [...withoutCurrent, result].sort((a, b) => {
        const orderA = integrationSetups.findIndex((integration) => integration.id === a.id);
        const orderB = integrationSetups.findIndex((integration) => integration.id === b.id);
        return orderA - orderB;
      });
    });
    setTestCheckedAt(checkedAt);
    applyIntegrationResults([result]);
  };

  const runIntegrationTests = async () => {
    setIsTestingIntegrations(true);
    try {
      if (!window.noa?.testIntegrations) {
        const browserOnlyResults: IntegrationTestResult[] = integrationSetups.map((integration) => ({
          id: integration.id,
          name: integration.name,
          ok: false,
          status: 'desktop required',
          message: 'Run NoA with npm run dev to test this connection from Electron.'
        }));
        setTestResults(browserOnlyResults);
        setTestCheckedAt(new Date().toISOString());
        applyIntegrationResults(browserOnlyResults);
        return browserOnlyResults;
      }

      const report = await window.noa.testIntegrations();
      setTestResults(report.results);
      setTestCheckedAt(report.checkedAt);
      applyIntegrationResults(report.results);
      return report.results;
    } finally {
      setIsTestingIntegrations(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const checkSession = async () => {
      try {
        const status = await window.noa?.getAuthStatus?.();
        if (!cancelled && status?.ok && status.unlocked) {
          setIsUnlocked(true);
          setPinError('');
        }
      } catch {
        if (!cancelled) setIsUnlocked(false);
      }
    };
    void checkSession();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isUnlocked) {
      if (lockTimerRef.current) {
        window.clearTimeout(lockTimerRef.current);
        lockTimerRef.current = null;
      }
      return undefined;
    }

    const activityEvents = ['pointerdown', 'keydown', 'touchstart', 'scroll'];
    const handleActivity = () => resetLockTimer();
    resetLockTimer();
    activityEvents.forEach((eventName) => window.addEventListener(eventName, handleActivity, { passive: true }));

    return () => {
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, handleActivity));
      if (lockTimerRef.current) {
        window.clearTimeout(lockTimerRef.current);
        lockTimerRef.current = null;
      }
    };
  }, [isUnlocked]);

  const loadNotionJobs = async () => {
    const getNotionJobs = window.noa?.getNotionJobs;
    if (!getNotionJobs) return emptyJobsReport;
    if (jobsRequestRef.current) return jobsRequestRef.current;
    setIsLoadingJobs(true);
    const request = (async () => {
      const report = await getNotionJobs();
      setJobsReport(report);
      return report;
    })();
    jobsRequestRef.current = request;
    try {
      return await request;
    } finally {
      jobsRequestRef.current = null;
      setIsLoadingJobs(false);
    }
  };

  const loadHubGauge = async () => {
    const getHubGauge = window.noa?.getHubGauge;
    if (!getHubGauge) return emptyHubGaugePayload;
    if (hubGaugeRequestRef.current) return hubGaugeRequestRef.current;
    setIsLoadingHubGauge(true);
    const request = (async () => {
      const payload = await getHubGauge().catch(() => ({
        ...emptyHubGaugePayload,
        status: 'partial' as const,
        lastUpdated: 'Preview mode',
        noah: {
          ...emptyHubGaugePayload.noah,
          signal: 'Static preview is running without the Noah API.'
        },
        errors: ['The local preview server is static, so /api/hubgauge is not available here.']
      }));
      setHubGaugePayload({ ...emptyHubGaugePayload, ...payload });
      return { ...emptyHubGaugePayload, ...payload };
    })();
    hubGaugeRequestRef.current = request;
    try {
      return await request;
    } finally {
      hubGaugeRequestRef.current = null;
      setIsLoadingHubGauge(false);
    }
  };

  const loadXeroSummary = async () => {
    const getXeroSummary = window.noa?.getXeroSummary;
    if (!getXeroSummary) return emptyXeroReport;
    if (xeroRequestRef.current) return xeroRequestRef.current;
    setIsLoadingXero(true);
    const request = (async () => {
      const report = await getXeroSummary();
      const mergedReport = mergeXeroReport(report as Partial<XeroReport>);
      setXeroReport(mergedReport);
      setIntegrationStatus((current) => ({ ...current, xero: Boolean(report.ok) }));
      return mergedReport;
    })();
    xeroRequestRef.current = request;
    try {
      return await request;
    } finally {
      xeroRequestRef.current = null;
      setIsLoadingXero(false);
    }
  };

  const loadBudgetSummary = async () => {
    const getBudgetSummary = window.noa?.getBudgetSummary;
    if (!getBudgetSummary) return emptyBudgetReport;
    if (budgetRequestRef.current) return budgetRequestRef.current;
    setIsLoadingBudget(true);
    const request = (async () => {
      const report = mergeBudgetReport(await getBudgetSummary() as Partial<BudgetReport>);
      setBudgetReport(report);
      return report;
    })();
    budgetRequestRef.current = request;
    try {
      return await request;
    } finally {
      budgetRequestRef.current = null;
      setIsLoadingBudget(false);
    }
  };

  useEffect(() => {
    if (!isUnlocked) return;
    if (startupSyncStartedRef.current) return;
    startupSyncStartedRef.current = true;
    let isMounted = true;

    const syncAtStartup = async () => {
      setStartupSync({
        status: 'syncing',
        message: 'Syncing Notion, Xero, and Budgeting...',
        checkedAt: ''
      });

      const [notionResult, xeroResult, budgetResult, integrationsResult] = await Promise.allSettled([
        loadNotionJobs(),
        loadXeroSummary(),
        loadBudgetSummary(),
        runIntegrationTests()
      ]);

      if (!isMounted) return;

      const issues: string[] = [];
      if (notionResult.status === 'rejected') {
        issues.push('Notion failed');
      } else if (notionHasErrors(notionResult.value)) {
        issues.push('Notion partial');
      }

      if (xeroResult.status === 'rejected') {
        issues.push('Xero failed');
      } else if (!xeroResult.value.ok) {
        issues.push('Xero needs attention');
      }

      if (budgetResult.status === 'rejected') {
        issues.push('Budget failed');
      } else if (!budgetResult.value.ok) {
        issues.push('Budget needs attention');
      }

      if (integrationsResult.status === 'rejected') {
        issues.push('Integration tests failed');
      } else if (integrationsResult.value.some((result) => !result.ok)) {
        issues.push('Some integrations need attention');
      }

      setStartupSync({
        status: issues.length ? 'partial' : 'synced',
        message: issues.length ? issues.join(' - ') : 'All integrations and data sources are synced.',
        checkedAt: new Date().toISOString()
      });
    };

    void syncAtStartup();

    return () => {
      isMounted = false;
    };
  }, [isUnlocked]);

  useEffect(() => {
    if (!isUnlocked) return;
    if (screen === 'tasks') {
      setScreen('crm');
      return;
    }
    if (['hubgauge', 'plan', 'automations'].includes(screen as string)) {
      setScreen('today');
      return;
    }
    if ((screen === 'crm' || screen === 'pipeline' || screen === 'upcoming-jobs' || screen === 'clients' || screen === 'map') && !jobsReport.fetchedAt && !isLoadingJobs) {
      void loadNotionJobs();
    }
    if ((screen === 'xero' || screen === 'map') && !xeroReport.fetchedAt && !isLoadingXero) {
      void loadXeroSummary();
    }
    if (screen === 'xero' && !jobsReport.fetchedAt && !isLoadingJobs) {
      void loadNotionJobs();
    }
    if ((screen === 'budgeting' || screen === 'map') && !budgetReport.fetchedAt && !isLoadingBudget) {
      void loadBudgetSummary();
    }
  }, [screen, isUnlocked]);

  const askNoah = async (value: string, interactionMode: InteractionMode) => {
    if (!window.noa?.askNoah) {
      return getLocalNoahReply(value, notes, smartBriefing);
    }

    const response = await window.noa.askNoah({
      message: value,
      notes,
      smartBriefing,
      integrationStatus,
      recentMessages: messages.slice(-8),
      notionJobs: jobsReport,
      interactionMode
    });

    return response.text || getLocalNoahReply(value, notes, smartBriefing);
  };

  const sendCommand = () => {
    void submitCommand(command, { speakReply: false, interactionMode: 'typed' });
  };

  const syncStatusPill = useMemo(() => {
    return buildSyncStatusPill(startupSync, isLoadingJobs || isLoadingXero);
  }, [startupSync, isLoadingJobs, isLoadingXero]);

  const submitCommand = async (rawValue: string, options: { speakReply: boolean; interactionMode: InteractionMode }) => {
    const value = rawValue.trim();
    if (!value) return;

    if (isIntegrationTestRequest(value)) {
      setMessages((current) => [
        ...current,
        { role: 'user', text: value },
        { role: 'noah', text: 'I will test OpenAI, Supabase, n8n, Notion, and Xero now. I will only return connection status, never secret values.' }
      ]);
      setCommand('');
      setScreen('noah');
      void runIntegrationTests().then((results) => {
        setMessages((current) => [
          ...current,
          { role: 'noah', text: formatIntegrationTestReply(results) }
        ]);
      });
      return;
    }

    setMessages((current) => [
      ...current,
      { role: 'user', text: value }
    ]);
    setCommand('');
    setScreen('noah');
    setIsNoahThinking(true);
    if (options.speakReply) {
      setVoiceState('thinking');
      startThinkingSound();
    }

    await askNoah(value, options.interactionMode)
      .then((reply) => {
        setMessages((current) => [...current, { role: 'noah', text: reply }]);
        if (options.speakReply) void speakNoahReply(reply, { listenAfter: true }).catch((error) => {
          setVoiceState('active');
          setVoiceError(error instanceof Error ? error.message : 'Natural voice playback failed.');
        });
      })
      .catch((error) => {
        const errorText = `I could not complete that request through the OpenAI bridge. ${error instanceof Error ? error.message : 'Unknown error.'}`;
        setMessages((current) => [
          ...current,
          {
            role: 'noah',
            text: errorText
          }
        ]);
        if (options.speakReply) void speakNoahReply(errorText, { listenAfter: true }).catch((error) => {
          setVoiceState('active');
          setVoiceError(error instanceof Error ? error.message : 'Natural voice playback failed.');
        });
      })
      .finally(() => {
        setIsNoahThinking(false);
        if (!options.speakReply) stopThinkingSound();
      });
  };

  const toggleVoice = () => {
    if (!recordingSupported) {
      setVoiceState('error');
      setVoiceError('Microphone recording is not available in this desktop runtime.');
      return;
    }

    if (voiceEnabledRef.current) {
      setVoiceEnabled(false);
      setVoiceActivationEnabled(false);
      setVoiceState('off');
      setVoiceTranscript('');
      setVoiceFallbackMode(false);
      recognitionRef.current?.stop();
      mediaRecorderRef.current?.stop();
      stopWakeLoop();
      void window.noa?.stopOfflineWake?.();
      interruptNoahVoice();
      return;
    }

    setVoiceEnabled(true);
    setVoiceError('');
    setVoiceFallbackMode(true);
    setVoiceState('active');
    setVoiceError('');
  };

  const enableOfflineActivation = async () => {
    if (window.noa?.isBrowserLanMode) {
      if (!recordingSupported || !window.noa?.transcribeAudio) {
        setVoiceState('active');
        setVoiceError('Tablet wake listening needs microphone permission in the browser.');
        return;
      }

      setVoiceEnabled(true);
      setVoiceFallbackMode(true);
      setVoiceActivationEnabled(true);
      setOfflineWakeReady(false);
      setVoiceError('');
      setVoiceState('wake');
      setVoiceTranscript('Starting tablet Hey Noah listening...');
      await startWakeLoop();
      return;
    }

    if (!window.noa?.startOfflineWake) {
      setVoiceState('active');
      setVoiceError('');
      return;
    }

    setVoiceEnabled(true);
    setVoiceFallbackMode(true);
    setVoiceActivationEnabled(true);
    setVoiceError('');
    setVoiceState('wake');
    setVoiceTranscript('Preparing offline activation...');
    const result = await window.noa.startOfflineWake();
    if (!result.ok) {
      setVoiceActivationEnabled(false);
      setOfflineWakeReady(false);
      setVoiceState('active');
      setVoiceTranscript('');
      setVoiceError(result.message);
    }
  };

  const interruptNoahVoice = () => {
    voiceAudioRef.current?.pause();
    voiceAudioRef.current = null;
    if (voiceAudioUrlRef.current) {
      URL.revokeObjectURL(voiceAudioUrlRef.current);
      voiceAudioUrlRef.current = '';
    }
    window.speechSynthesis?.cancel();
    stopThinkingSound();
    if (followUpListenTimerRef.current) {
      window.clearTimeout(followUpListenTimerRef.current);
      followUpListenTimerRef.current = null;
    }
    if (voiceEnabledRef.current) {
      setVoiceState(voiceActivationEnabledRef.current ? 'wake' : 'active');
      setVoiceTranscript('');
    }
  };

  const toggleVoiceActivation = async () => {
    if (!window.noa?.isBrowserLanMode && (!window.noa?.startOfflineWake || !window.noa?.stopOfflineWake)) {
      setVoiceState('error');
      setVoiceError('Offline activation is only available in the NoA desktop app.');
      return;
    }

    if (voiceActivationEnabledRef.current) {
      setVoiceActivationEnabled(false);
      setOfflineWakeReady(false);
      await window.noa?.stopOfflineWake?.();
      stopWakeLoop();
      setVoiceState(voiceEnabledRef.current ? 'active' : 'off');
      setVoiceTranscript('');
      return;
    }

    await enableOfflineActivation();
  };

  const startVoiceRecognition = () => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) return;

    recognitionRef.current?.stop();
    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-AU';

    recognition.onresult = (event) => {
      let finalText = '';
      let interimText = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result[0]?.transcript?.trim() || '';
        if (result.isFinal) finalText += ` ${transcript}`;
        else interimText += ` ${transcript}`;
      }

      const heard = (finalText || interimText).trim();
      if (heard) setVoiceTranscript(heard);
      if (!finalText.trim()) return;

      handleVoiceTranscript(finalText.trim());
    };

    recognition.onerror = (event) => {
      if (event.error === 'network' && recordingSupported) {
        setVoiceFallbackMode(true);
        setVoiceState('active');
        setVoiceError('Wake listening hit a network error. Tap to talk is ready.');
        recognition.stop();
        return;
      }
      setVoiceState('error');
      setVoiceError(event.error === 'not-allowed' ? 'Microphone permission is blocked.' : `Voice recognition error: ${event.error}`);
    };

    recognition.onend = () => {
      if (voiceEnabledRef.current && !['speaking', 'thinking', 'off'].includes(voiceStateRef.current)) {
        window.setTimeout(() => startVoiceRecognition(), 250);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const startWakeLoop = async () => {
    if (wakeLoopActiveRef.current || !recordingSupported || !window.noa?.transcribeAudio) return;
    wakeLoopActiveRef.current = true;

    try {
      wakeStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      setOfflineWakeReady(true);
      setVoiceState('wake');
      setVoiceTranscript('Tablet is listening for "Hey Noah".');
      runWakeChunk();
    } catch (error) {
      wakeLoopActiveRef.current = false;
      setOfflineWakeReady(false);
      setVoiceState('error');
      setVoiceError(error instanceof Error ? error.message : 'Could not start voice activation.');
    }
  };

  const runWakeChunk = () => {
    if (!wakeLoopActiveRef.current || !voiceActivationEnabledRef.current || !voiceEnabledRef.current) return;

    if (['thinking', 'speaking'].includes(voiceStateRef.current) || mediaRecorderRef.current?.state === 'recording') {
      window.setTimeout(runWakeChunk, 900);
      return;
    }

    const stream = wakeStreamRef.current;
    if (!stream) return;

    wakeChunksRef.current = [];
    const recorder = new MediaRecorder(stream, { mimeType: preferredAudioMimeType() });
    wakeRecorderRef.current = recorder;
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) wakeChunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      void inspectWakeChunk();
    };

    setVoiceState('wake');
    recorder.start();
    window.setTimeout(() => {
      if (recorder.state === 'recording') recorder.stop();
    }, window.noa?.isBrowserLanMode ? 2200 : 2800);
  };

  const inspectWakeChunk = async () => {
    if (!wakeLoopActiveRef.current || !voiceActivationEnabledRef.current || !window.noa?.transcribeAudio) return;
    const blob = new Blob(wakeChunksRef.current, { type: wakeChunksRef.current[0]?.type || 'audio/webm' });
    if (!blob.size) {
      window.setTimeout(runWakeChunk, window.noa?.isBrowserLanMode ? 550 : 250);
      return;
    }

    const audio = await blob.arrayBuffer();
    const result = await window.noa.transcribeAudio({
      audio,
      mimeType: blob.type || 'audio/webm',
      filename: 'noah-wake.webm',
      contextHints: buildTranscriptionHints(jobsReport, messages)
    });

    const text = result.text.trim();
    const lowered = text.toLowerCase();
    const wakeMatch = findWakePhrase(lowered);
    const wakeIndex = wakeMatch?.index ?? -1;
    if (result.ok && wakeIndex !== -1) {
      wakeLoopActiveRef.current = false;
      const commandAfterWake = text.slice(wakeIndex + (wakeMatch?.phrase.length || 'hey noah'.length)).trim().replace(/^,?\s*/, '');
      setVoiceTranscript(commandAfterWake || 'I heard Hey Noah.');
      setVoiceState('active');
      if (commandAfterWake) {
        void submitCommand(commandAfterWake, { speakReply: true, interactionMode: 'voice' });
      } else {
        await speakNoahReply('I am here. What would you like me to do?');
      }
      return;
    }

    window.setTimeout(runWakeChunk, window.noa?.isBrowserLanMode ? 650 : 250);
  };

  const stopWakeLoop = () => {
    wakeLoopActiveRef.current = false;
    setOfflineWakeReady(false);
    if (wakeRecorderRef.current?.state === 'recording') wakeRecorderRef.current.stop();
    wakeRecorderRef.current = null;
    wakeStreamRef.current?.getTracks().forEach((track) => track.stop());
    wakeStreamRef.current = null;
  };

  const handleVoiceTranscript = (text: string) => {
    const lowered = text.toLowerCase();
    const wakeIndex = lowered.indexOf('hey noah');

    if (voiceStateRef.current === 'wake') {
      if (wakeIndex === -1) return;
      const commandAfterWake = text.slice(wakeIndex + 'hey noah'.length).trim().replace(/^,?\s*/, '');
      setVoiceState('active');
      if (commandAfterWake) {
        void submitCommand(commandAfterWake, { speakReply: true, interactionMode: 'voice' });
      } else {
        void speakNoahReply('I am here.');
      }
      return;
    }

    if (voiceStateRef.current === 'active') {
      if (/\b(stop listening|go to sleep|nevermind|never mind)\b/i.test(text)) {
        setVoiceState('wake');
        setVoiceTranscript('');
        return;
      }
      void submitCommand(text, { speakReply: true, interactionMode: 'voice' });
    }
  };

  const speakNoahReply = async (text: string, options: { listenAfter?: boolean } = {}) => {
    if (!window.noa?.synthesizeSpeech) {
      setVoiceState('active');
      setVoiceError('Natural voice is unavailable because the desktop speech bridge is not ready.');
      return;
    }

    recognitionRef.current?.stop();
    voiceAudioRef.current?.pause();
    stopThinkingSound();
    if (voiceActivationEnabledRef.current) {
      await window.noa?.setOfflineWakePaused?.(true);
    }
    setVoiceState('speaking');
    setVoiceError('');

    const result = await window.noa.synthesizeSpeech({ text: prepareSpeechText(text) });
    stopThinkingSound();
    if (!result.ok || !result.audio) {
      setVoiceState('active');
      setVoiceError(result.message || 'Natural voice generation failed.');
      if (voiceActivationEnabledRef.current) void window.noa?.setOfflineWakePaused?.(false);
      return;
    }

    const audioBlob = new Blob([new Uint8Array(result.audio)], { type: result.mimeType || 'audio/mpeg' });
    const audioUrl = URL.createObjectURL(audioBlob);
    if (voiceAudioUrlRef.current) URL.revokeObjectURL(voiceAudioUrlRef.current);
    voiceAudioUrlRef.current = audioUrl;
    const audio = new Audio(audioUrl);
    audio.volume = voiceVolumeRef.current;
    voiceAudioRef.current = audio;
    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      voiceAudioUrlRef.current = '';
      if (!voiceEnabledRef.current) return;
      setVoiceState(voiceActivationEnabledRef.current ? 'wake' : 'active');
      setVoiceTranscript('');
      if (voiceActivationEnabledRef.current) void window.noa?.setOfflineWakePaused?.(false);
      if (options.listenAfter && voiceEnabledRef.current) {
        startFollowUpListening();
      }
    };
    audio.onerror = () => {
      URL.revokeObjectURL(audioUrl);
      voiceAudioUrlRef.current = '';
      setVoiceState('active');
      setVoiceError('Noah generated speech, but the audio player could not play it.');
      if (voiceActivationEnabledRef.current) void window.noa?.setOfflineWakePaused?.(false);
      stopThinkingSound();
    };
    await audio.play();
  };

  const startThinkingSound = () => {
    if (thinkingSoundTimerRef.current) return;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const context = thinkingAudioContextRef.current ?? new AudioContextClass();
    thinkingAudioContextRef.current = context;

    const playNote = () => {
      const now = context.currentTime;
      const notes = [587.33, 739.99, 880].sort(() => Math.random() - 0.5);
      notes.forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const start = now + index * 0.075;
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(frequency, start);
        oscillator.detune.setValueAtTime(Math.random() * 6 - 3, start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.018 * voiceVolumeRef.current, start + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(start);
        oscillator.stop(start + 0.24);
      });
    };

    void context.resume().then(playNote);
    thinkingSoundTimerRef.current = window.setInterval(playNote, 1700);
  };

  const stopThinkingSound = () => {
    if (thinkingSoundTimerRef.current) {
      window.clearInterval(thinkingSoundTimerRef.current);
      thinkingSoundTimerRef.current = null;
    }
  };

  const startFollowUpListening = () => {
    if (!recordingSupported || !window.noa?.transcribeAudio || isVoiceRecording) return;
    setVoiceTranscript('I am listening for your reply...');
    void toggleVoiceRecording({ autoStopMs: 8500, followUp: true });
  };

  const returnToWakeListening = () => {
    setVoiceState(voiceActivationEnabledRef.current ? 'wake' : 'active');
    setVoiceTranscript(voiceActivationEnabledRef.current ? 'Back to Hey Noah.' : '');
    if (voiceActivationEnabledRef.current) void window.noa?.setOfflineWakePaused?.(false);
  };

  const toggleVoiceRecording = async (options: { autoStopMs?: number; followUp?: boolean } = {}) => {
    if (isVoiceRecording) {
      mediaRecorderRef.current?.stop();
      return;
    }

    if (!recordingSupported || !window.noa?.transcribeAudio) {
      setVoiceState('error');
      setVoiceError('Tap-to-talk recording is not available in this runtime.');
      return;
    }

    try {
      if (voiceActivationEnabledRef.current) await window.noa?.setOfflineWakePaused?.(true);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      voiceChunksRef.current = [];
      const recorder = new MediaRecorder(stream, { mimeType: preferredAudioMimeType() });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) voiceChunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        setIsVoiceRecording(false);
        if (followUpListenTimerRef.current) {
          window.clearTimeout(followUpListenTimerRef.current);
          followUpListenTimerRef.current = null;
        }
        stream.getTracks().forEach((track) => track.stop());
        if (voiceActivationEnabledRef.current) void window.noa?.setOfflineWakePaused?.(false);
        void transcribeRecordedVoice({ ignoreEmpty: Boolean(options.followUp) });
      };

      setVoiceError('');
      setVoiceTranscript('Listening...');
      setVoiceState('active');
      setIsVoiceRecording(true);
      recorder.start();
      if (options.autoStopMs) {
        followUpListenTimerRef.current = window.setTimeout(() => {
          if (recorder.state === 'recording') recorder.stop();
        }, options.autoStopMs);
      }
    } catch (error) {
      setVoiceState('error');
      setVoiceError(error instanceof Error ? error.message : 'Could not start microphone recording.');
      if (voiceActivationEnabledRef.current) void window.noa?.setOfflineWakePaused?.(false);
    }
  };

  const transcribeRecordedVoice = async (options: { ignoreEmpty?: boolean } = {}) => {
    const blob = new Blob(voiceChunksRef.current, { type: voiceChunksRef.current[0]?.type || 'audio/webm' });
    if (!blob.size || !window.noa?.transcribeAudio) return;

    setVoiceState('thinking');
    startThinkingSound();
    setVoiceTranscript('Transcribing...');
    const audio = await blob.arrayBuffer();
    const result = await window.noa.transcribeAudio({
      audio,
      mimeType: blob.type || 'audio/webm',
      filename: blob.type.includes('mp4') ? 'noah-voice.m4a' : 'noah-voice.webm',
      contextHints: buildTranscriptionHints(jobsReport, messages)
    });

    if (!result.ok || !result.text) {
      stopThinkingSound();
      if (options.ignoreEmpty) {
        returnToWakeListening();
        setVoiceError('');
      } else {
        setVoiceState('active');
        setVoiceError(result.message || 'I could not understand that audio.');
      }
      return;
    }

    const cleaned = result.text.replace(/^hey noah[,]?\s*/i, '').trim();
    if (options.ignoreEmpty && isEmptyFollowUp(cleaned)) {
      returnToWakeListening();
      stopThinkingSound();
      return;
    }
    setVoiceTranscript(cleaned);
    await submitCommand(cleaned || result.text, { speakReply: true, interactionMode: 'voice' });
  };

  useEffect(() => {
    if (!window.noa?.onOfflineWakeEvent) return undefined;

    return window.noa.onOfflineWakeEvent((event: OfflineWakeEvent) => {
      if (event.type === 'ready') {
        setOfflineWakeReady(true);
        setVoiceError('');
        setVoiceState('wake');
        setVoiceTranscript(event.message || 'Offline activation is listening for "Hey Noah".');
        return;
      }

      if (event.type === 'partial' && event.text && voiceActivationEnabledRef.current && voiceStateRef.current === 'wake') {
        setVoiceTranscript(event.text);
        return;
      }

      if (event.type === 'heard' && event.text && voiceActivationEnabledRef.current && voiceStateRef.current === 'wake') {
        setVoiceTranscript(event.text);
        return;
      }

      if (event.type === 'wake' && voiceActivationEnabledRef.current) {
        const commandAfterWake = (event.command || '').trim();
        setVoiceTranscript(commandAfterWake || 'I heard Hey Noah.');
        setVoiceState('active');
        if (commandAfterWake) {
          void submitCommand(commandAfterWake, { speakReply: true, interactionMode: 'voice' });
        } else {
          void speakNoahReply('I am here. What would you like me to do?');
        }
        return;
      }

      if (event.type === 'error') {
        setOfflineWakeReady(false);
        setVoiceActivationEnabled(false);
        setVoiceState('error');
        setVoiceError(event.message || 'Offline activation stopped unexpectedly.');
        return;
      }

      if (event.type === 'stopped') {
        setOfflineWakeReady(false);
        if (voiceActivationEnabledRef.current) {
          setVoiceActivationEnabled(false);
          setVoiceState(voiceEnabledRef.current ? 'active' : 'off');
          setVoiceTranscript('');
        }
      }
    });
  }, []);

  if (!isUnlocked) {
    return (
      <NoaLockScreen
        pin={pinInput}
        error={pinError}
        isUnlocking={isUnlocking}
        setPin={(value) => {
          setPinError('');
          setPinInput(value.replace(/\D/g, '').slice(0, 4));
        }}
        onSubmit={submitPin}
      />
    );
  }

  return (
    <main
      className="shell"
      onTouchStart={handleMobileMenuTouchStart}
      onTouchMove={handleMobileMenuTouchMove}
      onTouchEnd={handleMobileMenuTouchEnd}
      onTouchCancel={resetMobileMenuSwipe}
    >
      <section className="workspace">
        <header className="topbar">
          <button className="mobile-more-trigger" onClick={isMoreMenuOpen ? closeMobileMenu : openMobileMenu} aria-label="Open navigation">
            <Menu size={18} />
            Menu
          </button>
          <div className="desktop-brand">
            <div className="brand-mark">NoA</div>
            <div>
              <strong>Noetic Advisor</strong>
              <span>Command Centre</span>
            </div>
          </div>
          <DesktopTopNav
            screen={screen}
            setScreen={setScreen}
            setBudgetSection={setBudgetSection}
            setXeroSection={setXeroSection}
          />
          <div className="desktop-utility-actions" aria-label="Desktop utilities">
            <button type="button" aria-label="Search"><Search size={17} /></button>
            <button type="button" aria-label="Notifications"><Bell size={17} /></button>
            <button type="button" aria-label="Settings" onClick={() => setScreen('settings')}><Settings size={17} /></button>
          </div>
          <div className="topbar-title">
            <p className="eyebrow">Noetic Advisor</p>
            <h1>{screenTitle(screen)}</h1>
          </div>
          <div className="top-actions">
            <StatusPill tone="success" icon={ShieldCheck} label="Protected actions" />
            <StatusPill tone={syncStatusPill.tone} icon={syncStatusPill.icon} label={syncStatusPill.label} />
            <StatusPill tone="info" icon={Bot} label="Noah ready" />
            <StatusPill tone="muted" icon={LockKeyhole} label="Private mode" />
          </div>
        </header>

        <ResponsivePageNav
          screen={screen}
          setScreen={setScreen}
          budgetSection={budgetSection}
          setBudgetSection={setBudgetSection}
          xeroSection={xeroSection}
          setXeroSection={setXeroSection}
        />
        <DesktopSubPageNav
          screen={screen}
          budgetSection={budgetSection}
          setBudgetSection={setBudgetSection}
          xeroSection={xeroSection}
          setXeroSection={setXeroSection}
        />

        {screen === 'today' && (
          <Today
            greeting={greeting}
            command={command}
            setCommand={setCommand}
            sendCommand={sendCommand}
            capture={capture}
            setCapture={setCapture}
            addCapture={addCapture}
            notes={notes}
            smartBriefing={smartBriefing}
            inboxSummary={inboxSummary}
            jobsReport={jobsReport}
            xeroReport={xeroReport}
            setScreen={setScreen}
          />
        )}
        {screen === 'noah' && (
          <Noah
            messages={messages}
            command={command}
            setCommand={setCommand}
            sendCommand={sendCommand}
            notes={notes}
            smartBriefing={smartBriefing}
            isNoahThinking={isNoahThinking}
          />
        )}
        {screen === 'crm' && (
          <CrmView
            report={jobsReport}
            isLoading={isLoadingJobs}
            refreshJobs={loadNotionJobs}
          />
        )}
        {screen === 'pipeline' && (
          <PipelineBoard
            report={jobsReport}
            isLoading={isLoadingJobs}
            refreshJobs={loadNotionJobs}
          />
        )}
        {screen === 'upcoming-jobs' && (
          <UpcomingJobsView
            report={jobsReport}
            isLoading={isLoadingJobs}
            refreshJobs={loadNotionJobs}
          />
        )}
        {screen === 'clients' && (
          <ClientsView
            report={jobsReport}
            isLoading={isLoadingJobs}
            refreshJobs={loadNotionJobs}
          />
        )}
        {screen === 'xero' && (
          <XeroView
            report={xeroReport}
            notionReport={jobsReport}
            isLoading={isLoadingXero}
            isLoadingNotion={isLoadingJobs}
            refreshXero={loadXeroSummary}
            refreshNotion={loadNotionJobs}
            section={xeroSection}
            setSection={setXeroSection}
          />
        )}
        {screen === 'budgeting' && (
          <BudgetingView
            report={budgetReport}
            isLoading={isLoadingBudget}
            refreshBudget={loadBudgetSummary}
            onMutated={() => void loadBudgetSummary()}
            section={budgetSection}
            setSection={setBudgetSection}
          />
        )}
        {screen === 'map' && (
          <MapView
            integrationStatus={integrationStatus}
            testResults={testResults}
            jobsReport={jobsReport}
            xeroReport={xeroReport}
            budgetReport={budgetReport}
            isLoadingJobs={isLoadingJobs}
            isLoadingXero={isLoadingXero}
            isLoadingBudget={isLoadingBudget}
            setScreen={setScreen}
            runIntegrationTests={runIntegrationTests}
          />
        )}
        {screen === 'memory' && <Memory notes={notes} />}
        {screen === 'integrations' && (
          <Integrations
            integrationStatus={integrationStatus}
            testResults={testResults}
            testCheckedAt={testCheckedAt}
            isTestingIntegrations={isTestingIntegrations}
            runIntegrationTests={runIntegrationTests}
            recordIntegrationTestResult={recordIntegrationTestResult}
          />
        )}
        {screen === 'settings' && (
          <SettingsView
            integrationStatus={integrationStatus}
            budgetReport={budgetReport}
            refreshBudget={loadBudgetSummary}
          />
        )}
      </section>

      <MobileNav
        screen={screen}
        setScreen={(nextScreen) => {
          setScreen(nextScreen);
          closeMobileMenu();
        }}
        budgetSection={budgetSection}
        setBudgetSection={(nextSection) => {
          setBudgetSection(nextSection);
          setScreen('budgeting');
          closeMobileMenu();
        }}
        xeroSection={xeroSection}
        setXeroSection={(nextSection) => {
          setXeroSection(nextSection);
          setScreen('xero');
          closeMobileMenu();
        }}
        isMoreMenuOpen={isMoreMenuOpen}
        dragX={mobileDrawerDragX}
        isDragging={isMobileDrawerDragging}
        isClosing={isMobileDrawerClosing}
        closeMoreMenu={closeMobileMenu}
      />
    </main>
  );
}

function NoaLockScreen({
  pin,
  error,
  isUnlocking,
  setPin,
  onSubmit
}: {
  pin: string;
  error: string;
  isUnlocking: boolean;
  setPin: (value: string) => void;
  onSubmit: (candidatePin?: string) => Promise<void>;
}) {
  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
  const addDigit = (digit: string) => {
    const nextPin = `${pin}${digit}`.slice(0, 4);
    setPin(nextPin);
    if (nextPin.length === 4) {
      window.setTimeout(() => void onSubmit(nextPin), 80);
    }
  };

  return (
    <main
      className="lockscreen-shell"
      tabIndex={-1}
      onKeyDown={(event) => {
        if (/^\d$/.test(event.key)) {
          event.preventDefault();
          addDigit(event.key);
        }
        if (event.key === 'Backspace') {
          event.preventDefault();
          setPin(pin.slice(0, -1));
        }
        if (event.key === 'Enter' && pin.length === 4) {
          event.preventDefault();
          void onSubmit();
        }
      }}
    >
      <section className="lockscreen-card" aria-label="NoA lockscreen">
        <div className="lockscreen-orb">
          <LockKeyhole size={34} />
        </div>
        <p className="eyebrow">Noetic Advisor</p>
        <h1>NoA is locked</h1>
        <p className="lockscreen-copy">
          Enter your four digit PIN to access private Notion, Xero, Budgeting, and Noah data.
        </p>
        <form
          className="pin-panel"
          onSubmit={(event) => {
            event.preventDefault();
            void onSubmit();
          }}
        >
          <input
            value={pin}
            onChange={(event) => setPin(event.currentTarget.value)}
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            autoFocus
            aria-label="NoA PIN"
          />
          <div className="pin-dots" aria-hidden="true">
            {[0, 1, 2, 3].map((index) => <span className={pin.length > index ? 'filled' : ''} key={index} />)}
          </div>
          {error && <p className="pin-error">{error}</p>}
          <div className="pin-keypad">
            {digits.map((digit) => (
            <button type="button" onClick={() => addDigit(digit)} disabled={isUnlocking} key={digit}>{digit}</button>
          ))}
            <button type="button" onClick={() => setPin(pin.slice(0, -1))} disabled={isUnlocking}>Clear</button>
          </div>
          <button type="submit" className="primary-action lockscreen-submit" disabled={pin.length !== 4 || isUnlocking}>
            <ShieldCheck size={16} />
            {isUnlocking ? 'Checking...' : 'Unlock NoA'}
          </button>
        </form>
        <small>Auto-locks after 5 minutes idle.</small>
      </section>
    </main>
  );
}

function NavGroupLabel({ label }: { label: string }) {
  return <span className="nav-group-label">{label}</span>;
}

function DesktopTopNav({
  screen,
  setScreen,
  setBudgetSection,
  setXeroSection
}: {
  screen: Screen;
  setScreen: (screen: Screen) => void;
  setBudgetSection: (section: BudgetSection) => void;
  setXeroSection: (section: XeroSection) => void;
}) {
  const primaryItems = navItems.filter((item) => workspaceScreenIds.includes(item.id));
  const secondaryItems = navItems.filter((item) => !workspaceScreenIds.includes(item.id));
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDetailsElement | null>(null);
  const activate = (id: Screen) => {
    if (id === 'budgeting') setBudgetSection('overview');
    if (id === 'xero') setXeroSection('overview');
    setScreen(id);
    setIsMoreOpen(false);
  };

  useEffect(() => {
    if (!isMoreOpen) return undefined;
    const handlePointerDown = (event: PointerEvent) => {
      if (!moreMenuRef.current?.contains(event.target as Node)) {
        setIsMoreOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMoreOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMoreOpen]);

  return (
    <nav className="desktop-top-nav" aria-label="Desktop primary navigation">
      {primaryItems.map((item) => (
        <button key={item.id} className={screen === item.id ? 'active' : ''} onClick={() => activate(item.id)}>
          {item.label}
        </button>
      ))}
      <details className="desktop-more-menu" open={isMoreOpen} ref={moreMenuRef}>
        <summary onClick={(event) => {
          event.preventDefault();
          setIsMoreOpen((current) => !current);
        }}>
          More
          <ChevronRight size={14} />
        </summary>
        <div>
          {secondaryItems.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} className={screen === item.id ? 'active' : ''} onClick={() => activate(item.id)}>
                <Icon size={15} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </details>
    </nav>
  );
}

function DesktopSubPageNav({
  screen,
  budgetSection,
  setBudgetSection,
  xeroSection,
  setXeroSection
}: {
  screen: Screen;
  budgetSection: BudgetSection;
  setBudgetSection: (section: BudgetSection) => void;
  xeroSection: XeroSection;
  setXeroSection: (section: XeroSection) => void;
}) {
  if (screen !== 'budgeting' && screen !== 'xero') return null;
  const sections = screen === 'budgeting' ? budgetSections : xeroSections;
  const activeSection = screen === 'budgeting' ? budgetSection : xeroSection;
  const setSection = screen === 'budgeting'
    ? (section: BudgetSection | XeroSection) => setBudgetSection(section as BudgetSection)
    : (section: BudgetSection | XeroSection) => setXeroSection(section as XeroSection);

  return (
    <nav className="desktop-sub-nav" aria-label={`${screenTitle(screen)} sections`}>
      {sections.map((section) => {
        const Icon = section.icon;
        return (
          <button key={section.id} className={activeSection === section.id ? 'active' : ''} onClick={() => setSection(section.id)}>
            <Icon size={15} />
            <span>{section.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function RailNavItem({
  item,
  screen,
  setScreen,
  budgetSection,
  setBudgetSection,
  xeroSection,
  setXeroSection
}: {
  item: typeof navItems[number];
  screen: Screen;
  setScreen: (screen: Screen) => void;
  budgetSection: BudgetSection;
  setBudgetSection: (section: BudgetSection) => void;
  xeroSection: XeroSection;
  setXeroSection: (section: XeroSection) => void;
}) {
  const Icon = item.icon;
  const isBudgeting = item.id === 'budgeting';
  const isXero = item.id === 'xero';

  return (
    <div className="nav-item-group">
      <button
        className={screen === item.id ? 'active' : ''}
        onClick={() => {
          if (isBudgeting) setBudgetSection('overview');
          if (isXero) setXeroSection('overview');
          setScreen(item.id);
        }}
      >
        <Icon size={18} />
        <span>{item.label}</span>
        {(isBudgeting || isXero) && <ChevronRight className="nav-chevron" size={15} />}
      </button>
      {isBudgeting && screen === 'budgeting' && (
        <div className="nav-sub-list">
          {budgetSections.map((section) => {
            const SectionIcon = section.icon;
            return (
              <button key={section.id} className={budgetSection === section.id ? 'active' : ''} onClick={() => setBudgetSection(section.id)}>
                <SectionIcon size={15} />
                <span>{section.label}</span>
              </button>
            );
          })}
        </div>
      )}
      {isXero && screen === 'xero' && (
        <div className="nav-sub-list">
          {xeroSections.map((section) => {
            const SectionIcon = section.icon;
            return (
              <button key={section.id} className={xeroSection === section.id ? 'active' : ''} onClick={() => setXeroSection(section.id)}>
                <SectionIcon size={15} />
                <span>{section.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ResponsivePageNav({
  screen,
  setScreen,
  budgetSection,
  setBudgetSection,
  xeroSection,
  setXeroSection
}: {
  screen: Screen;
  setScreen: (screen: Screen) => void;
  budgetSection: BudgetSection;
  setBudgetSection: (section: BudgetSection) => void;
  xeroSection: XeroSection;
  setXeroSection: (section: XeroSection) => void;
}) {
  const quickItems = tabletQuickScreens
    .map((id) => navItems.find((item) => item.id === id))
    .filter(Boolean) as typeof navItems;

  return (
    <nav className="page-switcher" aria-label="Frequently used pages">
      {quickItems.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            className={screen === item.id ? 'active' : ''}
            onClick={() => {
              if (item.id === 'budgeting') {
                setBudgetSection('overview');
              }
              if (item.id === 'xero') {
                setXeroSection('overview');
              }
              setScreen(item.id);
            }}
          >
            <Icon size={16} />
            <span>{item.label}</span>
          </button>
        );
      })}
      {screen === 'budgeting' && budgetSections.map((section) => {
        const Icon = section.icon;
        return (
          <button key={section.id} className={`sub-page ${budgetSection === section.id ? 'active' : ''}`} onClick={() => setBudgetSection(section.id)}>
            <Icon size={16} />
            <span>{section.label}</span>
          </button>
        );
      })}
      {screen === 'xero' && xeroSections.map((section) => {
        const Icon = section.icon;
        return (
          <button key={section.id} className={`sub-page ${xeroSection === section.id ? 'active' : ''}`} onClick={() => setXeroSection(section.id)}>
            <Icon size={16} />
            <span>{section.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function MobileNav({
  screen,
  setScreen,
  budgetSection,
  setBudgetSection,
  xeroSection,
  setXeroSection,
  isMoreMenuOpen,
  dragX,
  isDragging,
  isClosing,
  closeMoreMenu,
}: {
  screen: Screen;
  setScreen: (screen: Screen) => void;
  budgetSection: BudgetSection;
  setBudgetSection: (section: BudgetSection) => void;
  xeroSection: XeroSection;
  setXeroSection: (section: XeroSection) => void;
  isMoreMenuOpen: boolean;
  dragX: number;
  isDragging: boolean;
  isClosing: boolean;
  closeMoreMenu: () => void;
}) {
  const primaryItems = navItems.filter((item) => workspaceScreenIds.includes(item.id));
  const secondaryItems = navItems.filter((item) => !primaryItems.some((primary) => primary.id === item.id));
  const shouldRender = isMoreMenuOpen || isDragging || isClosing;
  const drawerProgress = Math.max(0, Math.min(1, 1 + dragX / Math.min(window.innerWidth * 0.86, 360)));
  const drawerStyle = {
    '--drawer-x': `${isDragging || isClosing ? dragX : 0}px`,
    '--drawer-backdrop-opacity': String(isDragging ? drawerProgress : isClosing ? 0 : 1)
  } as React.CSSProperties;

  return (
    <>
      {shouldRender && (
        <div
          className={`mobile-sidebar-menu ${isMoreMenuOpen ? 'open' : ''} ${isDragging ? 'dragging' : ''} ${isClosing ? 'closing' : ''}`}
          style={drawerStyle}
        >
          <button className="mobile-menu-backdrop" onClick={closeMoreMenu} aria-label="Close navigation" />
          <aside className="mobile-sidebar-sheet" aria-label="Mobile navigation" aria-hidden={!isMoreMenuOpen && !isDragging}>
            <div className="mobile-sidebar-grabber" aria-hidden="true" />
            <div className="mobile-sidebar-head">
              <div className="brand mobile-brand">
                <div className="brand-mark">NoA</div>
                <div>
                  <strong>Noetic Advisor</strong>
                  <span>Command Centre</span>
                </div>
              </div>
              <button onClick={closeMoreMenu} aria-label="Close navigation"><X size={18} /></button>
            </div>

            <div className="mobile-sidebar-section">
              <span>Workspace</span>
              {primaryItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div className="mobile-sidebar-group" key={item.id}>
                    <button
                      className={screen === item.id ? 'active' : ''}
                      onClick={() => {
                        if (item.id === 'budgeting') {
                          setBudgetSection('overview');
                        }
                        if (item.id === 'xero') {
                          setXeroSection('overview');
                        }
                        setScreen(item.id);
                      }}
                    >
                      <Icon size={18} />
                      <span>{item.label}</span>
                    </button>
                    {item.id === 'budgeting' && (
                      <div className="mobile-sidebar-subpages">
                        {budgetSections.map((section) => {
                          const SectionIcon = section.icon;
                          return (
                            <button
                              key={section.id}
                              className={screen === 'budgeting' && budgetSection === section.id ? 'active' : ''}
                              onClick={() => setBudgetSection(section.id)}
                            >
                              <SectionIcon size={16} />
                              <span>{section.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {item.id === 'xero' && (
                      <div className="mobile-sidebar-subpages">
                        {xeroSections.map((section) => {
                          const SectionIcon = section.icon;
                          return (
                            <button
                              key={section.id}
                              className={screen === 'xero' && xeroSection === section.id ? 'active' : ''}
                              onClick={() => setXeroSection(section.id)}
                            >
                              <SectionIcon size={16} />
                              <span>{section.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mobile-sidebar-section">
              <span>More</span>
              {secondaryItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button key={item.id} className={screen === item.id ? 'active' : ''} onClick={() => setScreen(item.id)}>
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

const hubGaugeFaces = ['spotify', 'jobs', 'clock'] as const;
const clockNumerals = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'] as const;
type HubGaugeFace = typeof hubGaugeFaces[number];

function HubGaugeView({
  payload,
  isLoading,
  refresh
}: {
  payload: HubGaugePayload;
  isLoading: boolean;
  refresh: () => Promise<HubGaugePayload>;
}) {
  const [face, setFace] = useState<HubGaugeFace>('spotify');
  const [now, setNow] = useState(Date.now());
  const refreshRef = useRef(refresh);
  const isLoadingRef = useRef(isLoading);
  const endRefreshRef = useRef('');
  const gestureStartRef = useRef<{ x: number; y: number; pointerId: number } | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  const spotify = payload.spotify || emptyHubGaugePayload.spotify;
  const elapsedMs = spotify.isPlaying
    ? Math.min(spotify.durationMs || 0, spotify.progressMs + Math.max(0, now - spotify.serverFetchedAt))
    : spotify.progressMs;
  const progress = spotify.durationMs ? Math.max(0, Math.min(1, elapsedMs / spotify.durationMs)) : 0;
  const progressDegrees = Math.round(progress * 360);
  const clock = new Date(now);
  const goToFace = (nextFace: HubGaugeFace) => setFace(nextFace);
  const shiftFace = (direction: 1 | -1) => setFace((currentFace) => getAdjacentHubGaugeFace(currentFace, direction));

  const handleGaugePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    gestureStartRef.current = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleGaugePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = gestureStartRef.current;
    gestureStartRef.current = null;
    if (!start || start.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    if (Math.abs(deltaX) < 44 || Math.abs(deltaX) < Math.abs(deltaY) * 1.2) return;

    shiftFace(deltaX < 0 ? 1 : -1);
  };

  const handleGaugeKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      shiftFace(1);
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      shiftFace(-1);
    }
  };

  useEffect(() => {
    let cancelled = false;
    let timer = 0;

    const scheduleNextRefresh = () => {
      const delay = getHubGaugePollDelay(face, spotify);
      timer = window.setTimeout(async () => {
        if (cancelled) return;
        if (!document.hidden && !isLoadingRef.current) {
          await refreshRef.current().catch(() => undefined);
        }
        if (!cancelled) scheduleNextRefresh();
      }, delay);
    };

    scheduleNextRefresh();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [face, spotify.configured, spotify.isPlaying, spotify.status, spotify.trackId]);

  useEffect(() => {
    const refreshVisibleHubGauge = () => {
      if (!document.hidden && !isLoadingRef.current) void refreshRef.current().catch(() => undefined);
    };

    window.addEventListener('focus', refreshVisibleHubGauge);
    document.addEventListener('visibilitychange', refreshVisibleHubGauge);
    return () => {
      window.removeEventListener('focus', refreshVisibleHubGauge);
      document.removeEventListener('visibilitychange', refreshVisibleHubGauge);
    };
  }, []);

  useEffect(() => {
    if (face !== 'spotify' || !spotify.isPlaying || !spotify.durationMs) return;
    const remainingMs = spotify.durationMs - elapsedMs;
    const refreshKey = `${spotify.trackId}:${spotify.durationMs}`;
    if (remainingMs > 0 && remainingMs <= 1800 && endRefreshRef.current !== refreshKey && !isLoadingRef.current) {
      endRefreshRef.current = refreshKey;
      void refreshRef.current().catch(() => undefined);
    }
  }, [elapsedMs, face, spotify.durationMs, spotify.isPlaying, spotify.trackId]);

  return (
    <section className="page-fade hubgauge-page">
      <article className="glass-card wide hubgauge-hero">
        <div>
          <PanelTitle eyebrow="Noah hardware companion" title="HubGauge" />
          <p className="section-copy">
            A tiny in-car Noah surface for music, live work context, and a calm clock face. The simulator uses the same
            compact payload the ESP32 will request when it arrives.
          </p>
        </div>
        <div className="hubgauge-actions">
          <div className={`hubgauge-live ${payload.status}`}>
            <span />
            {payload.status === 'online' ? 'Live payload' : payload.status === 'partial' ? 'Partial payload' : 'Offline'}
          </div>
          <button className="secondary-action" onClick={() => void refresh()} disabled={isLoading}>
            <RefreshCw size={16} />
            {isLoading ? 'Syncing...' : 'Sync HubGauge'}
          </button>
        </div>
      </article>

      <section className="hubgauge-layout">
        <article className="hubgauge-stage">
          <div className="hubgauge-device" aria-label={`HubGauge ${face} face simulator`}>
            <div
              className={`hubgauge-screen face-${face}`}
              onKeyDown={handleGaugeKeyDown}
              onPointerCancel={() => {
                gestureStartRef.current = null;
              }}
              onPointerDown={handleGaugePointerDown}
              onPointerUp={handleGaugePointerUp}
              role="group"
              style={{ '--progress': `${progressDegrees}deg` } as React.CSSProperties}
              tabIndex={0}
            >
              {face === 'spotify' && (
                <div className="hubgauge-spotify">
                  {spotify.image ? <img src={spotify.image} alt="" /> : <div className="hubgauge-art-fallback" />}
                  <div className="hubgauge-shade" />
                  <div className="hubgauge-progress-ring" />
                  <div className="hubgauge-face-content">
                    <div className="hubgauge-chip">Noah Media</div>
                    <div className="hubgauge-play-state">{spotify.isPlaying ? <Pause size={26} /> : <Play size={26} />}</div>
                    <div className="hubgauge-track">
                      <strong>{spotify.title || 'Nothing playing'}</strong>
                      <span>{spotify.artist || 'Spotify waits server-side'}</span>
                      <small>{formatDuration(elapsedMs)} / {formatDuration(spotify.durationMs)}</small>
                    </div>
                  </div>
                </div>
              )}

              {face === 'jobs' && (
                <div className="hubgauge-jobs">
                  <div className="hubgauge-chip">Noah Pipeline</div>
                  <strong className="hubgauge-job-count">{payload.jobs.active}</strong>
                  <span className="hubgauge-job-label">active jobs</span>
                  <div className="hubgauge-job-metrics">
                    <div><b>{payload.jobs.today}</b><span>Today</span></div>
                    <div><b>{payload.jobs.tomorrow}</b><span>Tomorrow</span></div>
                    <div><b>{payload.jobs.dueSoon}</b><span>Due soon</span></div>
                  </div>
                  <div className="hubgauge-next-job">
                    <span>Next</span>
                    <strong>{payload.jobs.next}</strong>
                    <small>{[payload.jobs.nextClient, payload.jobs.nextWhen].filter(Boolean).join(' - ') || 'Waiting for Notion sync'}</small>
                  </div>
                </div>
              )}

              {face === 'clock' && (
                <div className="hubgauge-clock">
                  <div className="clock-numerals" aria-hidden="true">
                    {clockNumerals.map((numeral, index) => (
                      <span
                        key={numeral}
                        style={{
                          '--clock-angle': `${index * 30}deg`,
                          '--clock-counter-angle': `${index * -30}deg`
                        } as React.CSSProperties}
                      >
                        {numeral}
                      </span>
                    ))}
                  </div>
                  <div className="clock-hand hour" style={{ transform: `rotate(${clock.getHours() * 30 + clock.getMinutes() / 2}deg)` }} />
                  <div className="clock-hand minute" style={{ transform: `rotate(${clock.getMinutes() * 6}deg)` }} />
                  <div className="clock-hand second" style={{ transform: `rotate(${clock.getSeconds() * 6}deg)` }} />
                  <div className="clock-centre" />
                  <div className="hubgauge-clock-copy">
                    <span>Noah</span>
                    <strong>{clock.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</strong>
                    <small>{clock.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</small>
                  </div>
                </div>
              )}
              <div className="hubgauge-dots">
                {hubGaugeFaces.map((item) => (
                  <span key={item} className={face === item ? 'active' : ''} />
                ))}
              </div>
            </div>
          </div>
        </article>

        <aside className="hubgauge-controls">
          <article className="glass-card">
            <PanelTitle eyebrow="Faces" title="Simulator controls" />
            <div className="hubgauge-face-buttons">
              <button className={face === 'spotify' ? 'active' : ''} onClick={() => goToFace('spotify')}>Spotify</button>
              <button className={face === 'jobs' ? 'active' : ''} onClick={() => goToFace('jobs')}>Jobs</button>
              <button className={face === 'clock' ? 'active' : ''} onClick={() => goToFace('clock')}>Clock</button>
            </div>
          </article>
          <article className="glass-card">
            <PanelTitle eyebrow="Device contract" title="/api/hubgauge" />
            <div className="settings-row"><span>Mode</span><strong>{payload.mode}</strong></div>
            <div className="settings-row"><span>Source</span><strong>{payload.source}</strong></div>
            <div className="settings-row"><span>Last sync</span><strong>{payload.lastUpdated}</strong></div>
            <div className="settings-row"><span>Spotify</span><strong>{spotify.configured ? spotify.status : 'Not configured'}</strong></div>
          </article>
          <article className="glass-card">
            <PanelTitle eyebrow="Bring-up plan" title="When the board arrives" />
            <div className="decision-list compact">
              <Decision icon={CheckCircle2} title="Flash vendor demo" detail="Confirm display, touch, serial upload, and Wi-Fi before custom firmware." />
              <Decision icon={Database} title="Call payload" detail="Point firmware at /api/hubgauge using HUBGAUGE_DEVICE_TOKEN." />
              <Decision icon={Sparkles} title="Port faces" detail="Recreate these three faces in LVGL once the hardware loop is proven." />
            </div>
          </article>
        </aside>
      </section>
    </section>
  );
}

function Plan() {
  return (
    <section className="page-fade">
      <article className="glass-card wide">
        <PanelTitle eyebrow="Build path" title="How we accomplish NoA" />
        <p className="section-copy">
          The safest path is a personal-first desktop app with cloud memory, n8n automation plumbing, and a strict
          approval layer. NoA owns identity, context, permissions, and the experience. n8n handles triggers, schedules,
          and external system actions.
        </p>
      </article>

      <div className="roadmap-grid">
        {roadmapSteps.map((step) => (
          <article className={`roadmap-card ${step.status}`} key={step.title}>
            <span>{step.phase}</span>
            <h3>{step.title}</h3>
            <p>{step.outcome}</p>
          </article>
        ))}
      </div>

      <article className="glass-card wide">
        <PanelTitle eyebrow="Operating system layers" title="What each part is responsible for" />
        <div className="layer-list">
          {architectureLayers.map((layer) => (
            <div className="layer-row" key={layer.name}>
              <ServerCog size={20} />
              <div>
                <strong>{layer.name}</strong>
                <p>{layer.purpose}</p>
                <small>{layer.owner}: {layer.nextBuild}</small>
              </div>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}

type CrmViewKey = 'dashboard' | 'pipeline' | 'calendar' | 'clients-overview' | `client:${string}`;

function CrmView({
  report,
  isLoading,
  refreshJobs
}: {
  report: NotionJobsReport;
  isLoading: boolean;
  refreshJobs: () => Promise<NotionJobsReport>;
}) {
  const monthKey = brisbaneToday().slice(0, 7);
  const clientSummaries = useMemo(() => buildClientBudgetSummaries(report, monthKey), [report, monthKey]);
  const calendarItems = useMemo(() => buildCalendarJobs(report), [report]);
  const activeTasks = useMemo(() => getAllReportTasks(report).filter((task) => !isCompleteNotionTask(task)), [report]);
  const activePipelineTasks = useMemo(() => (report.pipelineTasks || []).filter((task) => !isCompleteNotionTask(task)), [report]);
  const [view, setView] = useState<CrmViewKey>('dashboard');
  const selectedClientId = view.startsWith('client:') ? view.replace('client:', '') : '';
  const selectedClient = clientSummaries.find((client) => client.id === selectedClientId) || null;

  return (
    <section className="page-fade crm-page">
      <aside className="crm-sidebar" aria-label="CRM navigation">
        <div className="crm-sidebar-head">
          <span>CRM</span>
          <strong>Client command</strong>
        </div>

        <div className="crm-nav-group">
          <p>Workspace</p>
          <button className={view === 'dashboard' ? 'active' : ''} onClick={() => setView('dashboard')}>
            <PieChart size={16} />
            Dashboard
          </button>
          <button className={view === 'pipeline' ? 'active' : ''} onClick={() => setView('pipeline')}>
            <Kanban size={16} />
            Pipeline
          </button>
          <button className={view === 'calendar' ? 'active' : ''} onClick={() => setView('calendar')}>
            <CalendarDays size={16} />
            Calendar
          </button>
        </div>

        <div className="crm-nav-group">
          <p>Clients</p>
          <button className={view === 'clients-overview' ? 'active' : ''} onClick={() => setView('clients-overview')}>
            <UsersRound size={16} />
            Overview
          </button>
          <div className="crm-client-list">
            {clientSummaries.length === 0 ? (
              <span className="crm-empty-link">No clients synced</span>
            ) : clientSummaries.map((client) => (
              <button
                className={selectedClientId === client.id ? 'active client' : 'client'}
                key={client.id}
                onClick={() => setView(`client:${client.id}`)}
              >
                <span>{client.title}</span>
                <small>{getClientJobsForClient(report, client).length} jobs</small>
              </button>
            ))}
          </div>
        </div>
      </aside>

      <main className="crm-content">
        {view === 'dashboard' && (
          <CrmDashboard
            report={report}
            isLoading={isLoading}
            refreshJobs={refreshJobs}
            clients={clientSummaries}
            calendarItems={calendarItems}
            activeTasks={activeTasks}
            activePipelineTasks={activePipelineTasks}
            openPipeline={() => setView('pipeline')}
            openCalendar={() => setView('calendar')}
            openClients={() => setView('clients-overview')}
          />
        )}
        {view === 'pipeline' && (
          <CrmPipelineBoard report={report} isLoading={isLoading} refreshJobs={refreshJobs} />
        )}
        {view === 'calendar' && (
          <UpcomingJobsView report={report} isLoading={isLoading} refreshJobs={refreshJobs} displayTitle="Calendar" />
        )}
        {view === 'clients-overview' && (
          <ClientsView report={report} isLoading={isLoading} refreshJobs={refreshJobs} />
        )}
        {selectedClient && (
          <CrmClientDetail client={selectedClient} report={report} isLoading={isLoading} refreshJobs={refreshJobs} />
        )}
      </main>
    </section>
  );
}

function CrmDashboard({
  report,
  isLoading,
  refreshJobs,
  clients,
  calendarItems,
  activeTasks,
  activePipelineTasks,
  openPipeline,
  openCalendar,
  openClients
}: {
  report: NotionJobsReport;
  isLoading: boolean;
  refreshJobs: () => Promise<NotionJobsReport>;
  clients: ReturnType<typeof buildClientBudgetSummaries>;
  calendarItems: CalendarJob[];
  activeTasks: NotionTask[];
  activePipelineTasks: NotionTask[];
  openPipeline: () => void;
  openCalendar: () => void;
  openClients: () => void;
}) {
  const todayKey = brisbaneToday();
  const thisWeekItems = calendarItems.filter((job) => isDateWithinDays(job.jobDate, todayKey, 7));
  const urgentTasks = activeTasks.filter((task) => task.dueState === 'Overdue' || task.dueState === 'Due today' || task.priority === 'High');
  const monthlyBudget = clients.reduce((sum, client) => sum + client.budget, 0);
  const johnsCut = clients.reduce((sum, client) => sum + client.johnsCutThisMonth, 0);
  const pipelineJourney = jobColumns.map((column) => ({
    column,
    count: activePipelineTasks.filter((task) => task.column === column).length
  }));
  const journeyMax = Math.max(1, ...pipelineJourney.map((item) => item.count));
  const strongestClients = [...clients]
    .sort((a, b) => b.johnsCutThisMonth - a.johnsCutThisMonth)
    .slice(0, 4);

  return (
    <section className="crm-dashboard">
      <article className="crm-hero-panel">
        <div>
          <PanelTitle eyebrow="CRM dashboard" title="Client work, pipeline, and schedule" />
          <p className="section-copy">
            A single workspace for client context, linked jobs, and the tasks that move each job forward.
          </p>
        </div>
        <div className="jobs-actions">
          <div className="jobs-sync">
            <span>{report.fetchedAt ? `Synced ${new Date(report.fetchedAt).toLocaleString()}` : 'Not synced yet'}</span>
            <strong>{clients.length} clients</strong>
          </div>
          <button className="secondary-action" onClick={() => void refreshJobs()} disabled={isLoading}>
            {isLoading ? 'Syncing...' : 'Sync CRM'}
          </button>
        </div>
      </article>

      {(report.tasksError || report.upcomingJobsError) && (
        <article className="glass-card wide jobs-error">
          <CircleAlert size={20} />
          <p>{[report.tasksError, report.upcomingJobsError].filter(Boolean).join(' ')}</p>
        </article>
      )}

      <section className="crm-overview-grid">
        <button className="crm-stat-card blue" onClick={openPipeline}>
          <div className="crm-stat-top"><Kanban size={17} /><span>Pipeline</span></div>
          <strong>{activePipelineTasks.length}</strong>
          <small>active tasks across four production statuses</small>
          <div className="crm-stat-spark" aria-hidden="true">{pipelineJourney.map((item) => <i key={item.column} style={{ height: `${Math.max(18, (item.count / journeyMax) * 100)}%` }} />)}</div>
        </button>
        <button className="crm-stat-card violet" onClick={openCalendar}>
          <div className="crm-stat-top"><CalendarDays size={17} /><span>Calendar</span></div>
          <strong>{thisWeekItems.length}</strong>
          <small>scheduled items in the next 7 days</small>
        </button>
        <button className="crm-stat-card green" onClick={openClients}>
          <div className="crm-stat-top"><UsersRound size={17} /><span>Clients</span></div>
          <strong>{clients.length}</strong>
          <small>{formatMoney(Math.max(0, monthlyBudget - johnsCut), 'AUD')} monthly budget remaining</small>
        </button>
        <article className="crm-stat-card amber">
          <div className="crm-stat-top"><CircleAlert size={17} /><span>Attention</span></div>
          <strong>{urgentTasks.length}</strong>
          <small>high priority, overdue, or due today</small>
        </article>
      </section>

      <section className="crm-showcase-grid">
        <article className="glass-card wide crm-journey-card">
          <div className="panel-row-head">
            <PanelTitle eyebrow="Production journey" title="Where work is moving" />
            <button className="ghost-button" onClick={openPipeline}>Open pipeline</button>
          </div>
          <div className="crm-journey-track">
            {pipelineJourney.map((item, index) => (
              <div className="crm-journey-step" key={item.column}>
                <span>{index + 1}</span>
                <div>
                  <strong>{item.column}</strong>
                  <small>{item.count} active</small>
                  <i style={{ width: `${Math.max(8, (item.count / journeyMax) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="glass-card wide crm-client-pulse-card">
          <div className="panel-row-head">
            <PanelTitle eyebrow="Client pulse" title="Monthly budget watch" />
            <button className="ghost-button" onClick={openClients}>Clients</button>
          </div>
          <div className="crm-client-pulse-list">
            {strongestClients.map((client) => (
              <div key={client.id}>
                <span>{client.title}</span>
                <strong>{formatMoney(client.johnsCutThisMonth, 'AUD')}</strong>
                <small>{client.budget ? `${Math.round(client.utilization)}% used` : 'No budget set'}</small>
              </div>
            ))}
            {strongestClients.length === 0 && <p className="empty-state">Client budget analytics will appear once Notion returns clients.</p>}
          </div>
        </article>
      </section>

      <section className="crm-dashboard-layout">
        <article className="glass-card wide crm-focus-card">
          <PanelTitle eyebrow="Next work" title="Priority lane" />
          <div className="crm-priority-list">
            {(urgentTasks.length ? urgentTasks.slice(0, 6) : activePipelineTasks.slice(0, 6)).map((task) => (
              <div className="crm-priority-row" key={task.id}>
                <span className={`priority-dot priority-${(task.priority || 'none').toLowerCase()}`} />
                <div>
                  <strong>{task.title}</strong>
                  <small>{[task.client || task.jobTitle, task.status, task.dueDate || task.shootDate].filter(Boolean).join(' - ') || 'No linked detail'}</small>
                </div>
                <em>{task.priority || task.dueState || 'Task'}</em>
              </div>
            ))}
            {!urgentTasks.length && !activePipelineTasks.length && <p className="empty-state">No active CRM work returned from Notion.</p>}
          </div>
        </article>

        <article className="glass-card wide crm-focus-card">
          <PanelTitle eyebrow="Client budgets" title="This month" />
          <div className="crm-budget-rings">
            {clients.slice(0, 5).map((client) => (
              <button key={client.id} onClick={openClients}>
                <span>{client.title}</span>
                <strong>{client.budget ? `${Math.round(client.utilization)}%` : '-'}</strong>
                <div className="budget-meter"><div style={{ width: `${Math.min(100, Math.max(0, client.utilization))}%` }} /></div>
                <small>{client.budget ? `${formatMoney(client.remaining, 'AUD')} left` : 'No budget set'}</small>
              </button>
            ))}
            {clients.length === 0 && <p className="empty-state">No client budget data returned yet.</p>}
          </div>
        </article>
      </section>
    </section>
  );
}

function CrmPipelineBoard({
  report,
  isLoading,
  refreshJobs
}: {
  report: NotionJobsReport;
  isLoading: boolean;
  refreshJobs: () => Promise<NotionJobsReport>;
}) {
  const pipelineTasks = report.pipelineTasks?.length ? report.pipelineTasks : report.taskList;
  const visiblePipelineTasks = pipelineTasks.filter((task) => !isCompleteNotionTask(task) && jobColumns.includes(task.column));
  const [boardTasks, setBoardTasks] = useState<NotionTask[]>(visiblePipelineTasks);
  const [draggingTaskId, setDraggingTaskId] = useState('');
  const [savingTaskId, setSavingTaskId] = useState('');
  const [pipelineMessage, setPipelineMessage] = useState('');
  const [editor, setEditor] = useState<{ mode: NotionEditorMode; kind: NotionItemKind; item?: NotionTask | null; initialValues?: Record<string, string> } | null>(null);

  useEffect(() => {
    setBoardTasks(visiblePipelineTasks);
  }, [report.fetchedAt, visiblePipelineTasks.length]);

  const tasksByColumn = useMemo(() => {
    return jobColumns.reduce<Record<string, NotionTask[]>>((groups, column) => {
      groups[column] = boardTasks.filter((task) => task.column === column);
      return groups;
    }, {});
  }, [boardTasks]);

  const moveTaskToColumn = async (taskId: string, column: string) => {
    const task = boardTasks.find((item) => item.id === taskId);
    if (!task || task.column === column || savingTaskId) return;

    const previousTasks = boardTasks;
    const nextStatus = statusForColumn(column);
    setPipelineMessage(`Updating ${task.title}...`);
    setSavingTaskId(taskId);
    setBoardTasks((current) => current.map((item) => item.id === taskId ? { ...item, column, status: nextStatus } : item));

    const result = await window.noa?.updateNotionTaskStatus?.({ pageId: taskId, column });
    if (!result?.ok) {
      setBoardTasks(previousTasks);
      setPipelineMessage(result?.message || 'Notion did not accept the status update.');
      setSavingTaskId('');
      return;
    }

    if (result.task) {
      setBoardTasks((current) => current.map((item) => item.id === taskId ? { ...item, ...result.task } : item));
    }
    setPipelineMessage(result.message || `Moved ${task.title} to ${column}.`);
    setSavingTaskId('');
  };

  const handleTaskSave = async (values: Record<string, string>) => {
    if (!editor || !window.noa?.manageNotionItem) return;
    const result = await window.noa.manageNotionItem({
      kind: 'task',
      action: editor.mode === 'create' ? 'create' : 'update',
      id: editor.item?.id,
      values
    });
    setPipelineMessage(result.message);
    if (!result.ok) throw new Error(result.message || 'Notion did not save this task.');
    setEditor(null);
    await refreshJobs();
  };

  const handleTaskArchive = async () => {
    if (!editor?.item?.id || !window.noa?.manageNotionItem) return;
    const result = await window.noa.manageNotionItem({ kind: 'task', action: 'archive', id: editor.item.id });
    setPipelineMessage(result.message);
    if (result.ok) {
      setEditor(null);
      await refreshJobs();
    }
  };

  return (
    <section className="crm-panel-page">
      <article className="crm-section-head">
        <div>
          <PanelTitle eyebrow="CRM pipeline" title="Production columns" />
          <p className="section-copy">Drag compact task cards between statuses. Completed and ready-to-post work stays out of this board.</p>
          {pipelineMessage && <p className="pipeline-message">{pipelineMessage}</p>}
        </div>
        <div className="jobs-actions">
          <button className="secondary-action" onClick={() => void refreshJobs()} disabled={isLoading}>
            {isLoading ? 'Syncing...' : 'Sync'}
          </button>
          <button className="primary-action" onClick={() => setEditor({ mode: 'create', kind: 'task', item: null, initialValues: { status: 'Not Started' } })}>
            <Plus size={16} />
            New task
          </button>
        </div>
      </article>

      <section className="crm-pipeline-board">
        {jobColumns.map((column) => (
          <article
            className="crm-pipeline-column"
            key={column}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const taskId = event.dataTransfer.getData('text/plain') || draggingTaskId;
              setDraggingTaskId('');
              void moveTaskToColumn(taskId, column);
            }}
          >
            <div className="crm-column-head">
              <h3>{column}</h3>
              <span>{tasksByColumn[column]?.length ?? 0}</span>
            </div>
            <div className="crm-column-stack">
              {(tasksByColumn[column] || []).length === 0 ? (
                <p className="empty-state">No tasks here.</p>
              ) : tasksByColumn[column].map((task) => (
                <CrmPipelineCard
                  task={task}
                  key={task.id}
                  isDragging={draggingTaskId === task.id}
                  isSaving={savingTaskId === task.id}
                  onOpen={() => setEditor({ mode: 'view', kind: 'task', item: task })}
                  onEdit={() => setEditor({ mode: 'edit', kind: 'task', item: task })}
                  onDragStart={(taskId) => setDraggingTaskId(taskId)}
                  onDragEnd={() => setDraggingTaskId('')}
                />
              ))}
            </div>
          </article>
        ))}
      </section>

      {editor && (
        <NotionItemModal
          mode={editor.mode}
          kind="task"
          item={editor.item}
          initialValues={editor.initialValues}
          availableJobs={report.upcomingJobs}
          onClose={() => setEditor(null)}
          onEdit={() => setEditor((current) => current ? { ...current, mode: 'edit' } : current)}
          onSave={handleTaskSave}
          onArchive={editor.item ? handleTaskArchive : undefined}
        />
      )}
    </section>
  );
}

function CrmPipelineCard({
  task,
  isDragging,
  isSaving,
  onOpen,
  onEdit,
  onDragStart,
  onDragEnd
}: {
  task: NotionTask;
  isDragging: boolean;
  isSaving: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onDragStart: (taskId: string) => void;
  onDragEnd: () => void;
}) {
  return (
    <article
      className={`crm-pipeline-card priority-${(task.priority || 'none').toLowerCase()} ${isDragging ? 'dragging' : ''} ${isSaving ? 'saving' : ''}`}
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', task.id);
        onDragStart(task.id);
      }}
      onDragEnd={onDragEnd}
    >
      <button className="crm-pipeline-title" onClick={onOpen} disabled={isSaving}>
        <span className="priority-dot" />
        <strong>{task.title}</strong>
      </button>
      <div className="crm-card-pills">
        {task.priority && <span>{task.priority}</span>}
        {task.status && <span>{normalizeNotionStatusName(task.status)}</span>}
        {(task.shootDate || task.dueDate) && <span>{task.shootDate || task.dueDate}</span>}
        {(task.attachments || []).length > 0 && <span aria-label="Has file link"><Paperclip size={12} /></span>}
      </div>
      <div className="crm-card-actions">
        <button onClick={onOpen}>View</button>
        <button onClick={onEdit} aria-label={`Edit ${task.title}`}><Edit3 size={13} /></button>
      </div>
    </article>
  );
}

function CrmClientDetail({
  client,
  report,
  isLoading,
  refreshJobs
}: {
  client: ReturnType<typeof buildClientBudgetSummaries>[number];
  report: NotionJobsReport;
  isLoading: boolean;
  refreshJobs: () => Promise<NotionJobsReport>;
}) {
  const clientJobs = useMemo(() => getClientJobsForClient(report, client), [report, client.id]);
  const clientTasks = useMemo(() => getTasksForClient(report, client, clientJobs), [report, client.id, clientJobs.length]);
  const [selectedJobId, setSelectedJobId] = useState(clientJobs[0]?.id || '');
  const [editor, setEditor] = useState<{
    mode: NotionEditorMode;
    kind: NotionItemKind;
    item?: NotionTask | NotionUpcomingJob | null;
    initialValues?: Record<string, string>;
  } | null>(null);

  useEffect(() => {
    if (!clientJobs.some((job) => job.id === selectedJobId)) {
      setSelectedJobId(clientJobs[0]?.id || '');
    }
  }, [client.id, clientJobs.length, selectedJobId]);

  const selectedJob = clientJobs.find((job) => job.id === selectedJobId) || clientJobs[0] || null;
  const selectedJobTasks = selectedJob ? getTasksForJob(clientTasks, selectedJob) : clientTasks;
  const openJobs = clientJobs.filter((job) => !isCompleteNotionStatus(job.status));
  const activeTasks = clientTasks.filter((task) => !isCompleteNotionTask(task));
  const completedRecentTasks = clientTasks.length - activeTasks.length;
  const jobsByStatus = getClientJobStatusGroups(clientJobs);
  const selectedJobActiveTasks = selectedJobTasks.filter((task) => !isCompleteNotionTask(task));
  const selectedJobCompletedTasks = selectedJobTasks.length - selectedJobActiveTasks.length;
  const selectedJobLinks = selectedJob ? getItemAttachmentLinks(selectedJob) : [];

  const handleSave = async (values: Record<string, string>) => {
    if (!editor || !window.noa?.manageNotionItem) return;
    const result = await window.noa.manageNotionItem({
      kind: editor.kind,
      action: editor.mode === 'create' ? 'create' : 'update',
      id: editor.item?.id,
      values
    });
    if (!result.ok) throw new Error(result.message || 'Notion did not save this item.');
    setEditor(null);
    await refreshJobs();
  };

  const handleArchive = async () => {
    if (!editor?.item?.id || !window.noa?.manageNotionItem) return;
    const result = await window.noa.manageNotionItem({ kind: editor.kind, action: 'archive', id: editor.item.id });
    if (!result.ok) {
      window.alert(result.message);
      return;
    }
    setEditor(null);
    await refreshJobs();
  };

  return (
    <section className="crm-client-detail">
      <article className="crm-section-head">
        <div>
          <PanelTitle eyebrow="Client portal" title={client.title} />
          <p className="section-copy">{getClientDisplayMeta(client)}</p>
        </div>
        <div className="jobs-actions">
          <button className="secondary-action" onClick={() => void refreshJobs()} disabled={isLoading}>
            {isLoading ? 'Syncing...' : 'Sync'}
          </button>
          <button
            className="primary-action"
            onClick={() => setEditor({
              mode: 'create',
              kind: 'job',
              item: null,
              initialValues: { clientId: client.id, client: client.title }
            })}
          >
            <Plus size={16} />
            New job
          </button>
        </div>
      </article>

      <section className="crm-client-summary-grid">
        <article>
          <span>Monthly budget</span>
          <strong>{client.budget ? formatMoney(client.budget, 'AUD') : 'Not set'}</strong>
        </article>
        <article>
          <span>John's cut</span>
          <strong>{formatMoney(client.johnsCutThisMonth, 'AUD')}</strong>
        </article>
        <article>
          <span>Remaining</span>
          <strong>{client.budget ? formatMoney(client.remaining, 'AUD') : '-'}</strong>
        </article>
        <article>
          <span>Open jobs</span>
          <strong>{openJobs.length}</strong>
        </article>
      </section>

      <section className="crm-client-health-strip">
        <article>
          <span>Budget use</span>
          <strong>{client.budget ? `${Math.round(client.utilization)}%` : 'Not tracking'}</strong>
          <div className="budget-meter"><div style={{ width: `${Math.min(100, Math.max(0, client.utilization))}%` }} /></div>
        </article>
        <article>
          <span>Active tasks</span>
          <strong>{activeTasks.length}</strong>
          <p>{completedRecentTasks} recently completed task{completedRecentTasks === 1 ? '' : 's'} still visible for context.</p>
        </article>
        <article>
          <span>Next job</span>
          <strong>{openJobs[0]?.title || 'No open jobs'}</strong>
          <p>{openJobs[0] ? [openJobs[0].status, openJobs[0].jobDate || openJobs[0].dueDate].filter(Boolean).join(' - ') : 'Nothing is currently waiting in the client pipeline.'}</p>
        </article>
      </section>

      <section className="crm-client-workspace">
        <aside className="crm-client-jobs">
          <div className="crm-pane-head">
            <div>
              <span>Jobs</span>
              <strong>{clientJobs.length}</strong>
            </div>
          </div>
          <div className="crm-job-list">
            {clientJobs.length === 0 ? (
              <p className="empty-state">No jobs linked to this client yet.</p>
            ) : jobsByStatus.map((group) => (
              <div className="crm-job-status-group" key={group.status}>
                <p>{group.status} <span>{group.jobs.length}</span></p>
                {group.jobs.map((job) => (
                  <button className={selectedJob?.id === job.id ? 'active' : ''} key={job.id} onClick={() => setSelectedJobId(job.id)}>
                    <strong>{job.title}</strong>
                    <span>{[job.jobDate || job.dueDate, job.location].filter(Boolean).join(' - ') || 'No date'}</span>
                    <em>{formatMoney(getJobJohnsCut(job), 'AUD')}</em>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </aside>

        <section className="crm-client-inspector">
          {selectedJob ? (
            <>
              <div className="crm-inspector-head">
                <div>
                  <p className="eyebrow">Selected job</p>
                  <h3>{selectedJob.title}</h3>
                  <span>{[selectedJob.status, selectedJob.jobDate || selectedJob.dueDate, selectedJob.location].filter(Boolean).join(' - ')}</span>
                </div>
                <div className="card-tools">
                  <button onClick={() => setEditor({ mode: 'view', kind: 'job', item: selectedJob })}>View</button>
                  <button onClick={() => setEditor({ mode: 'edit', kind: 'job', item: selectedJob })}><Edit3 size={14} /></button>
                </div>
              </div>

              <div className="crm-selected-job-grid">
                <article>
                  <span>Status</span>
                  <strong>{normalizeNotionStatusName(selectedJob.status) || 'No status'}</strong>
                </article>
                <article>
                  <span>John's cut</span>
                  <strong>{formatMoney(getJobJohnsCut(selectedJob), 'AUD')}</strong>
                </article>
                <article>
                  <span>Tasks</span>
                  <strong>{selectedJobActiveTasks.length} active</strong>
                  <p>{selectedJobCompletedTasks} complete/recent</p>
                </article>
                <article>
                  <span>Attachments</span>
                  <strong>{selectedJobLinks.length}</strong>
                  <p>{selectedJobLinks.length ? 'Google Drive links attached' : 'No links attached'}</p>
                </article>
              </div>

              {selectedJob.description && (
                <article className="crm-job-notes">
                  <span>Job notes</span>
                  <p>{selectedJob.description}</p>
                </article>
              )}

              {selectedJobLinks.length > 0 && (
                <div className="crm-job-link-strip">
                  {selectedJobLinks.slice(0, 4).map((link, index) => (
                    <a href={link.url} target="_blank" rel="noreferrer" key={`${link.url}-${index}`}>
                      <Paperclip size={13} />
                      <span>{link.name || `Drive link ${index + 1}`}</span>
                    </a>
                  ))}
                </div>
              )}

              <div className="crm-linked-task-head">
                <div>
                  <span>Attached tasks</span>
                  <strong>{selectedJobTasks.length}</strong>
                </div>
                <button
                  className="secondary-action compact"
                  onClick={() => setEditor({
                    mode: 'create',
                    kind: 'task',
                    item: null,
                    initialValues: {
                      jobId: selectedJob.id,
                      jobTitle: selectedJob.title,
                      status: 'Not Started'
                    }
                  })}
                >
                  <Plus size={14} />
                  New task
                </button>
              </div>

              <div className="crm-task-list">
                {selectedJobTasks.length === 0 ? (
                  <p className="empty-state">No tasks attached to this job yet.</p>
                ) : selectedJobTasks.map((task) => (
                  <article className="crm-task-row" key={task.id}>
                    <span className={`priority-dot priority-${(task.priority || 'none').toLowerCase()}`} />
                    <button onClick={() => setEditor({ mode: 'view', kind: 'task', item: task })}>
                      <strong>{task.title}</strong>
                      <small>{[task.status, task.dueDate || task.shootDate, task.assignedTo].filter(Boolean).join(' - ')}</small>
                    </button>
                    {(task.attachments || []).length > 0 && <Paperclip size={14} />}
                    <button aria-label={`Edit ${task.title}`} onClick={() => setEditor({ mode: 'edit', kind: 'task', item: task })}>
                      <Edit3 size={14} />
                    </button>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <article className="glass-card wide">
              <PanelTitle eyebrow="No job selected" title="Create the first job" />
              <p className="section-copy">Add a job for this client, then attach tasks to manage the work inside NoA.</p>
            </article>
          )}
        </section>
      </section>

      {editor && (
        <NotionItemModal
          mode={editor.mode}
          kind={editor.kind}
          item={editor.item}
          initialValues={editor.initialValues}
          availableJobs={report.upcomingJobs}
          onClose={() => setEditor(null)}
          onEdit={() => setEditor((current) => current ? { ...current, mode: 'edit' } : current)}
          onSave={handleSave}
          onArchive={editor.item ? handleArchive : undefined}
        />
      )}
    </section>
  );
}

function PipelineBoard({
  report,
  isLoading,
  refreshJobs
}: {
  report: NotionJobsReport;
  isLoading: boolean;
  refreshJobs: () => Promise<NotionJobsReport>;
}) {
  const pipelineTasks = report.pipelineTasks?.length ? report.pipelineTasks : report.taskList;
  const [boardTasks, setBoardTasks] = useState<NotionTask[]>(pipelineTasks);
  const [draggingTaskId, setDraggingTaskId] = useState('');
  const [savingTaskId, setSavingTaskId] = useState('');
  const [pipelineMessage, setPipelineMessage] = useState('');
  const [editor, setEditor] = useState<{ mode: NotionEditorMode; kind: NotionItemKind; item?: NotionTask | null } | null>(null);

  useEffect(() => {
    setBoardTasks(pipelineTasks);
  }, [pipelineTasks]);

  const tasksByColumn = useMemo(() => {
    return jobColumns.reduce<Record<string, NotionTask[]>>((groups, column) => {
      groups[column] = boardTasks.filter((task) => task.column === column);
      return groups;
    }, {});
  }, [boardTasks]);

  const openBoardTasks = boardTasks.filter((task) => !isCompleteNotionTask(task));
  const overdueCount = openBoardTasks.filter((task) => task.dueState === 'Overdue').length;
  const dueTodayCount = openBoardTasks.filter((task) => task.dueState === 'Due today').length;
  const highPriorityCount = openBoardTasks.filter((task) => task.priority === 'High').length;

  const moveTaskToColumn = async (taskId: string, column: string) => {
    const task = boardTasks.find((item) => item.id === taskId);
    if (!task || task.column === column || savingTaskId) return;

    const previousTasks = boardTasks;
    const nextStatus = statusForColumn(column);
    setPipelineMessage(`Updating ${task.title}...`);
    setSavingTaskId(taskId);
    setBoardTasks((current) => current.map((item) => item.id === taskId ? { ...item, column, status: nextStatus } : item));

    const result = await window.noa?.updateNotionTaskStatus?.({ pageId: taskId, column });
    if (!result?.ok) {
      setBoardTasks(previousTasks);
      setPipelineMessage(result?.message || 'Notion did not accept the status update.');
      setSavingTaskId('');
      return;
    }

    const updatedItem = result.task;
    if (updatedItem) {
      setBoardTasks((current) => current.map((item) => item.id === taskId ? { ...item, ...updatedItem } : item));
    }
    setPipelineMessage(result.message || `Moved ${task.title} to ${column}.`);
    setSavingTaskId('');
  };

  const handleTaskSave = async (values: Record<string, string>) => {
    if (!editor || !window.noa?.manageNotionItem) return;
    const result = await window.noa.manageNotionItem({
      kind: 'task',
      action: editor.mode === 'create' ? 'create' : 'update',
      id: editor.item?.id,
      values
    });
    setPipelineMessage(result.message);
    if (!result.ok) throw new Error(result.message || 'Notion did not save this task.');
    if (result.ok) {
      setEditor(null);
      await refreshJobs();
    }
  };

  const handleTaskArchive = async () => {
    if (!editor?.item?.id || !window.noa?.manageNotionItem) return;
    const result = await window.noa.manageNotionItem({ kind: 'task', action: 'archive', id: editor.item.id });
    setPipelineMessage(result.message);
    if (result.ok) {
      setEditor(null);
      await refreshJobs();
    }
  };

  return (
    <section className="page-fade jobs-page">
      <article className="glass-card wide jobs-hero">
        <div>
          <PanelTitle eyebrow="Notion task pipeline" title="Pipeline" />
          <p className="section-copy">
            Drag task cards between columns to update their Notion Status.
          </p>
          {pipelineMessage && <p className="pipeline-message">{pipelineMessage}</p>}
        </div>
        <div className="jobs-actions">
          <div className="jobs-sync">
            <span>{report.fetchedAt ? `Synced ${new Date(report.fetchedAt).toLocaleString()}` : 'Not synced yet'}</span>
            <strong>{boardTasks.length} tasks</strong>
          </div>
          <button className="secondary-action" onClick={() => void refreshJobs()} disabled={isLoading}>
            {isLoading ? 'Syncing...' : 'Sync pipeline'}
          </button>
          <button className="primary-action" onClick={() => setEditor({ mode: 'create', kind: 'task', item: null })}>
            <Plus size={16} />
            New task
          </button>
        </div>
      </article>

      {report.tasksError && (
        <article className="glass-card wide jobs-error">
          <CircleAlert size={20} />
          <p>{report.tasksError}</p>
        </article>
      )}
      <section className="jobs-metrics">
        <article>
          <span>Overdue</span>
          <strong>{overdueCount}</strong>
        </article>
        <article>
          <span>Due today</span>
          <strong>{dueTodayCount}</strong>
        </article>
        <article>
          <span>High priority</span>
          <strong>{highPriorityCount}</strong>
        </article>
        <article>
          <span>View rows</span>
          <strong>{boardTasks.length}</strong>
        </article>
      </section>

      <section className="jobs-board">
        {jobColumns.map((column) => (
          <article
            className="jobs-column"
            key={column}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const taskId = event.dataTransfer.getData('text/plain') || draggingTaskId;
              setDraggingTaskId('');
              void moveTaskToColumn(taskId, column);
            }}
          >
            <div className="jobs-column-head">
              <h3>{column}</h3>
              <span>{tasksByColumn[column]?.length ?? 0}</span>
            </div>
            <div className="jobs-stack">
              {(tasksByColumn[column] || []).length === 0 ? (
                <p className="empty-state">No active work here.</p>
              ) : (
                tasksByColumn[column].map((task) => (
                  <JobCard
                    task={task}
                    key={task.id}
                    isDragging={draggingTaskId === task.id}
                    isSaving={savingTaskId === task.id}
                    onOpen={() => setEditor({ mode: 'view', kind: 'task', item: task })}
                    onEdit={() => setEditor({ mode: 'edit', kind: 'task', item: task })}
                    onMove={(columnName) => void moveTaskToColumn(task.id, columnName)}
                    onDragStart={(taskId) => setDraggingTaskId(taskId)}
                    onDragEnd={() => setDraggingTaskId('')}
                  />
                ))
              )}
            </div>
          </article>
        ))}
      </section>
      {editor && (
        <NotionItemModal
          mode={editor.mode}
          kind="task"
          item={editor.item}
          availableJobs={report.upcomingJobs}
          onClose={() => setEditor(null)}
          onEdit={() => setEditor((current) => current ? { ...current, mode: 'edit' } : current)}
          onSave={handleTaskSave}
          onArchive={editor.item ? handleTaskArchive : undefined}
        />
      )}
    </section>
  );
}

function JobCard({
  task,
  isDragging = false,
  isSaving = false,
  onOpen,
  onEdit,
  onMove,
  onDragStart,
  onDragEnd
}: {
  task: NotionTask | NotionUpcomingJob;
  isDragging?: boolean;
  isSaving?: boolean;
  onOpen?: () => void;
  onEdit?: () => void;
  onMove?: (column: string) => void;
  onDragStart?: (taskId: string) => void;
  onDragEnd?: () => void;
}) {
  return (
    <article
      className={`job-card priority-${(task.priority || 'none').toLowerCase()} ${isDragging ? 'dragging' : ''} ${isSaving ? 'saving' : ''}`}
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', task.id);
        onDragStart?.(task.id);
      }}
      onDragEnd={onDragEnd}
    >
      <button className="job-card-main" onClick={onOpen} disabled={isSaving}>
        <div className="job-card-title">
          <span className="priority-dot" />
          <strong>{task.title}</strong>
        </div>
      </button>
      <div className="card-tools">
        <button onClick={onOpen} aria-label={`View ${task.title}`}>View</button>
        <button onClick={onEdit} aria-label={`Edit ${task.title}`}><Edit3 size={14} /></button>
      </div>
      <div className="job-card-title mobile-title">
        <span className="priority-dot" />
        <strong>{task.title}</strong>
      </div>
      {isSaving && <span className="saving-pill">Saving to Notion</span>}
      <div className="job-card-meta">
        <span className={`due-pill ${task.dueState === 'Overdue' ? 'danger' : task.dueState === 'Due today' ? 'today' : ''}`}>
          {task.dueDate ? `${task.dueState} · ${task.dueDate}` : 'No date'}
        </span>
        {'effortSize' in task && task.effortSize && <span>{task.effortSize}</span>}
        {'client' in task && task.client && <span>{task.client}</span>}
        {'johnsCut' in task && getJobJohnsCut(task) > 0 && <span>{formatMoney(getJobJohnsCut(task), 'AUD')}</span>}
        {'clientRetainer' in task && task.clientRetainer === 'Yes' && <span>Retainer</span>}
        {'openTasks' in task && typeof task.openTasks === 'number' && <span>{task.openTasks} open tasks</span>}
      </div>
      {'clientContentTypes' in task && task.clientContentTypes && task.clientContentTypes.length > 0 && (
        <div className="job-chip-row">
          {task.clientContentTypes.slice(0, 3).map((type) => <span key={type}>{type}</span>)}
        </div>
      )}
      {onMove && (
        <div
          className="move-select"
          onClick={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <span>Move to</span>
          <select
            value={task.column}
            disabled={isSaving}
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => {
              event.stopPropagation();
              onMove(event.target.value);
            }}
          >
            {jobColumns.map((column) => (
              <option value={column} key={column}>{column}</option>
            ))}
          </select>
        </div>
      )}
      {'taskTypes' in task && task.taskTypes.length > 0 && (
        <div className="job-chip-row">
          {task.taskTypes.slice(0, 3).map((type) => <span key={type}>{type}</span>)}
        </div>
      )}
      {(task.attachments || []).length > 0 && (
        <div className="attachment-chip-row">
          {(task.attachments || []).slice(0, 2).map((attachment) => (
            <a href={attachment.url} target="_blank" rel="noreferrer" key={attachment.url}>
              <ArrowUpRight size={12} />
              {attachment.name}
            </a>
          ))}
        </div>
      )}
      {'assignees' in task && task.assignees.length > 0 && (
        <p className="job-assignee">{task.assignees.map((person) => person.name).join(', ')}</p>
      )}
    </article>
  );
}

function TasksView({
  report,
  isLoading,
  refreshJobs
}: {
  report: NotionJobsReport;
  isLoading: boolean;
  refreshJobs: () => Promise<NotionJobsReport>;
}) {
  const allTasks = report.taskList?.length ? report.taskList : [];
  const [assigneeFilter, setAssigneeFilter] = useState<'all' | 'John' | 'Jack'>('all');
  const visibleTasks = allTasks.filter((task) => !isCompleteNotionTask(task) && (assigneeFilter === 'all' || task.assignedTo === assigneeFilter));
  const completedCount = allTasks.filter((task) => isCompleteNotionTask(task) && (assigneeFilter === 'all' || task.assignedTo === assigneeFilter)).length;
  const highPriorityCount = visibleTasks.filter((task) => task.priority === 'High').length;
  const overdueCount = visibleTasks.filter((task) => task.dueState === 'Overdue').length;
  const [editor, setEditor] = useState<{ mode: NotionEditorMode; kind: NotionItemKind; item?: NotionTask | null } | null>(null);

  const handleTaskSave = async (values: Record<string, string>) => {
    if (!editor || !window.noa?.manageNotionItem) return;
    const result = await window.noa.manageNotionItem({
      kind: 'task',
      action: editor.mode === 'create' ? 'create' : 'update',
      id: editor.item?.id,
      values
    });
    if (!result.ok) {
      throw new Error(result.message || 'Notion did not save this task.');
    }
    setEditor(null);
    await refreshJobs();
  };

  const markTaskComplete = async (task: NotionTask) => {
    if (!window.noa?.manageNotionItem) return;
    const result = await window.noa.manageNotionItem({
      kind: 'task',
      action: 'update',
      id: task.id,
      values: {
        title: task.title,
        status: 'Posted / Done'
      }
    });
    if (!result.ok) {
      window.alert(result.message || 'Notion did not mark this task complete.');
      return;
    }
    await refreshJobs();
  };

  const handleTaskArchive = async () => {
    if (!editor?.item?.id || !window.noa?.manageNotionItem) return;
    const result = await window.noa.manageNotionItem({ kind: 'task', action: 'archive', id: editor.item.id });
    if (!result.ok) {
      window.alert(result.message);
      return;
    }
    setEditor(null);
    await refreshJobs();
  };

  return (
    <section className="page-fade jobs-page">
      <article className="glass-card wide jobs-hero">
        <div>
          <PanelTitle eyebrow="Notion tasks view" title="Tasks" />
          <p className="section-copy">
            Showing incomplete Notion tasks by assignee. Ready To Post and Posted / Done are treated as complete.
          </p>
        </div>
        <div className="jobs-actions">
          <div className="jobs-sync">
            <span>{report.fetchedAt ? `Synced ${new Date(report.fetchedAt).toLocaleString()}` : 'Not synced yet'}</span>
            <strong>{visibleTasks.length} open</strong>
          </div>
          <button className="secondary-action" onClick={() => void refreshJobs()} disabled={isLoading}>
            {isLoading ? 'Syncing...' : 'Sync tasks'}
          </button>
          <button className="primary-action" onClick={() => setEditor({ mode: 'create', kind: 'task', item: null })}>
            <Plus size={16} />
            New task
          </button>
        </div>
      </article>

      {report.tasksError && (
        <article className="glass-card wide jobs-error">
          <CircleAlert size={20} />
          <p>{report.tasksError}</p>
        </article>
      )}

      <section className="jobs-metrics">
        <article>
          <span>Open shown</span>
          <strong>{visibleTasks.length}</strong>
        </article>
        <article>
          <span>High priority</span>
          <strong>{highPriorityCount}</strong>
        </article>
        <article>
          <span>Overdue</span>
          <strong>{overdueCount}</strong>
        </article>
        <article>
          <span>Completed</span>
          <strong>{completedCount}</strong>
        </article>
      </section>

      <div className="page-switcher inline-tabs" role="tablist" aria-label="Task assignee filter">
        {(['all', 'John', 'Jack'] as const).map((filter) => (
          <button key={filter} className={assigneeFilter === filter ? 'active' : ''} onClick={() => setAssigneeFilter(filter)}>
            {filter === 'all' ? 'All Tasks' : `${filter}'s Tasks`}
          </button>
        ))}
      </div>

      <section className="task-list">
        {visibleTasks.length === 0 ? (
          <article className="glass-card wide">
            <p className="empty-state">No incomplete tasks found for this view.</p>
          </article>
        ) : (
          visibleTasks.map((task) => (
            <TaskRow
              task={task}
              key={task.id}
              onOpen={() => setEditor({ mode: 'view', kind: 'task', item: task })}
              onEdit={() => setEditor({ mode: 'edit', kind: 'task', item: task })}
              onComplete={() => void markTaskComplete(task)}
            />
          ))
        )}
      </section>
      {editor && (
        <NotionItemModal
          mode={editor.mode}
          kind="task"
          item={editor.item}
          availableJobs={report.upcomingJobs}
          onClose={() => setEditor(null)}
          onEdit={() => setEditor((current) => current ? { ...current, mode: 'edit' } : current)}
          onSave={handleTaskSave}
          onArchive={editor.item ? handleTaskArchive : undefined}
        />
      )}
    </section>
  );
}

function TaskRow({ task, onOpen, onEdit, onComplete }: { task: NotionTask; onOpen: () => void; onEdit: () => void; onComplete: () => void }) {
  return (
    <article className={`task-row priority-${(task.priority || 'none').toLowerCase()}`}>
      <span className="priority-dot" />
      <button className="task-row-main" onClick={onOpen}>
        <strong>{task.title}</strong>
        <p>{[task.jobTitle, task.client, task.description || task.notes || task.attachments?.[0]?.name].filter(Boolean).join(' · ') || task.status || 'No description'}</p>
      </button>
      <span>{task.assignedTo || 'Unassigned'}</span>
      <span className={`due-pill ${task.dueState === 'Overdue' ? 'danger' : task.dueState === 'Due today' ? 'today' : ''}`}>
        {task.dueDate ? `${task.dueState} · ${task.dueDate}` : 'No date'}
      </span>
      <div className="row-actions">
        <button onClick={onOpen}>View</button>
        <button onClick={onEdit} aria-label={`Edit ${task.title}`}><Edit3 size={14} /></button>
        <button onClick={onComplete} aria-label={`Mark ${task.title} complete`}><CheckCircle2 size={14} /></button>
      </div>
    </article>
  );
}

function ClientsView({
  report,
  isLoading,
  refreshJobs
}: {
  report: NotionJobsReport;
  isLoading: boolean;
  refreshJobs: () => Promise<NotionJobsReport>;
}) {
  const monthKey = brisbaneToday().slice(0, 7);
  const monthLabel = formatCalendarMonth(monthKey);
  const summaries = useMemo(() => buildClientBudgetSummaries(report, monthKey), [report, monthKey]);
  const activeClients = summaries.filter((client) => client.status === 'Active' || client.retainer === 'Yes');
  const totalBudget = summaries.reduce((sum, client) => sum + client.budget, 0);
  const totalJohnsCut = summaries.reduce((sum, client) => sum + client.johnsCutThisMonth, 0);
  const remainingBudget = totalBudget - totalJohnsCut;
  const johnJobs = summaries
    .flatMap((client) => client.monthJobs.map((job) => ({ ...job, clientTitle: client.title })))
    .filter((job) => getJobJohnsCut(job) > 0)
    .sort((a, b) => (b.jobDate || b.dueDate || '').localeCompare(a.jobDate || a.dueDate || ''));

  return (
    <section className="page-fade clients-page">
      <article className="glass-card wide clients-hero">
        <div>
          <PanelTitle eyebrow="Notion clients" title="Client budget command" />
          <p className="section-copy">
            Track client monthly budgets against John's contractor cut from linked Notion jobs.
          </p>
        </div>
        <div className="jobs-actions">
          <div className="jobs-sync">
            <span>{report.fetchedAt ? `Synced ${new Date(report.fetchedAt).toLocaleString()}` : 'Not synced yet'}</span>
            <strong>{summaries.length} clients</strong>
          </div>
          <button className="secondary-action" onClick={() => void refreshJobs()} disabled={isLoading}>
            {isLoading ? 'Syncing...' : 'Sync clients'}
          </button>
        </div>
      </article>

      {report.upcomingJobsError && (
        <article className="glass-card wide jobs-error">
          <CircleAlert size={20} />
          <p>{report.upcomingJobsError}</p>
        </article>
      )}

      <section className="client-budget-overview">
        <article className="client-balance-card">
          <span>{monthLabel} budget</span>
          <strong>{formatMoney(totalBudget, 'AUD')}</strong>
          <small>{activeClients.length} active/retainer clients tracked</small>
        </article>
        <article className="client-balance-card dark">
          <span>John's cut</span>
          <strong>{formatMoney(totalJohnsCut, 'AUD')}</strong>
          <small>{johnJobs.length} paid job(s) this month</small>
        </article>
        <article className={`client-balance-card ${remainingBudget < 0 ? 'danger' : 'calm'}`}>
          <span>Remaining</span>
          <strong>{formatMoney(remainingBudget, 'AUD')}</strong>
          <small>{remainingBudget < 0 ? 'Over allocated across client budgets' : 'Budget still available'}</small>
        </article>
      </section>

      <section className="clients-layout">
        <div className="client-card-grid">
          {summaries.length === 0 ? (
            <article className="glass-card wide">
              <p className="empty-state">No clients were returned from Notion yet.</p>
            </article>
          ) : summaries.map((client) => (
            <article className="client-budget-card" key={client.id}>
              <div className="client-card-head">
                <div>
                  <span className="eyebrow">{[client.status, client.retainer === 'Yes' ? 'Retainer' : 'Project'].filter(Boolean).join(' - ')}</span>
                  <h3>{client.title}</h3>
                </div>
                <span className={`priority-badge priority-${(client.priority || 'none').toLowerCase()}`}>{client.priority || 'No priority'}</span>
              </div>
              <div className="budget-meter">
                <div style={{ width: `${Math.min(100, Math.max(0, client.utilization))}%` }} />
              </div>
              <div className="client-budget-numbers">
                <div>
                  <span>Budget</span>
                  <strong>{client.budget ? formatMoney(client.budget, 'AUD') : 'Not set'}</strong>
                </div>
                <div>
                  <span>John</span>
                  <strong>{formatMoney(client.johnsCutThisMonth, 'AUD')}</strong>
                </div>
                <div>
                  <span>Left</span>
                  <strong>{client.budget ? formatMoney(client.remaining, 'AUD') : '-'}</strong>
                </div>
              </div>
              <p className="client-budget-copy">
                {client.budget
                  ? `${Math.round(client.utilization)}% of this month's budget is allocated to John's cut.`
                  : 'Add a monthly Budget in Notion to activate budget tracking for this client.'}
              </p>
              <div className="client-chip-row">
                {[...(client.industry || []), ...(client.contentTypes || [])].slice(0, 5).map((chip) => <span key={chip}>{chip}</span>)}
              </div>
              <div className="client-job-list">
                {client.monthJobs.length === 0 ? (
                  <p className="empty-state">No jobs in {monthLabel}.</p>
                ) : client.monthJobs.slice(0, 3).map((job) => (
                  <a href={job.url} target="_blank" rel="noreferrer" key={job.id}>
                    <span>{job.title}</span>
                    <strong>{formatMoney(getJobJohnsCut(job), 'AUD')}</strong>
                  </a>
                ))}
              </div>
            </article>
          ))}
        </div>

        <aside className="john-pay-panel">
          <PanelTitle eyebrow="Contractor view" title="John's cut" />
          <p className="section-copy">Jobs Jack can expect John to invoice through John's ABN this month.</p>
          <div className="john-pay-total">
            <span>{monthLabel}</span>
            <strong>{formatMoney(totalJohnsCut, 'AUD')}</strong>
          </div>
          <div className="john-pay-list">
            {johnJobs.length === 0 ? (
              <p className="empty-state">No John's Cut values found for this month.</p>
            ) : johnJobs.slice(0, 8).map((job) => (
              <a href={job.url} target="_blank" rel="noreferrer" key={job.id}>
                <div>
                  <strong>{job.title}</strong>
                  <span>{[job.clientTitle, job.jobDate || job.dueDate, job.status].filter(Boolean).join(' - ')}</span>
                </div>
                <em>{formatMoney(getJobJohnsCut(job), 'AUD')}</em>
              </a>
            ))}
          </div>
        </aside>
      </section>
    </section>
  );
}

function UpcomingJobsView({
  report,
  isLoading,
  refreshJobs,
  displayTitle = 'Upcoming Jobs'
}: {
  report: NotionJobsReport;
  isLoading: boolean;
  refreshJobs: () => Promise<NotionJobsReport>;
  displayTitle?: string;
}) {
  const jobs = useMemo(() => buildCalendarJobs(report), [report]);
  const dueSoonCount = jobs.filter((job) => ['Overdue', 'Due today', 'Tomorrow', 'Due soon'].includes(job.dueState)).length;
  const taskSourcedCount = jobs.filter((job) => job.sourceKind === 'task').length;
  const [editor, setEditor] = useState<{ mode: NotionEditorMode; kind: NotionItemKind; item?: NotionUpcomingJob | NotionTask | null } | null>(null);
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<{ date: string; jobs: CalendarJob[] } | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => brisbaneToday().slice(0, 7));
  const calendarDays = useMemo(() => buildJobsCalendarDays(jobs, calendarMonth), [jobs, calendarMonth]);
  const jobsThisMonth = jobs.filter((job) => job.jobDate?.startsWith(calendarMonth));
  const featuredJobs = jobsThisMonth.length ? jobsThisMonth.slice(0, 5) : jobs.slice(0, 5);

  const handleJobSave = async (values: Record<string, string>) => {
    if (!editor || !window.noa?.manageNotionItem) return;
    const result = await window.noa.manageNotionItem({
      kind: editor.kind,
      action: editor.mode === 'create' ? 'create' : 'update',
      id: editor.item?.id,
      values
    });
    if (!result.ok) {
      throw new Error(result.message || 'Notion did not save this item.');
    }
    setEditor(null);
    await refreshJobs();
  };

  const handleJobArchive = async () => {
    if (!editor?.item?.id || !window.noa?.manageNotionItem) return;
    const result = await window.noa.manageNotionItem({ kind: editor.kind, action: 'archive', id: editor.item.id });
    if (!result.ok) {
      window.alert(result.message);
      return;
    }
    setEditor(null);
    await refreshJobs();
  };

  return (
    <section className="page-fade jobs-page">
      <article className="glass-card wide jobs-hero">
        <div>
          <PanelTitle eyebrow="Notion jobs database" title={displayTitle} />
          <p className="section-copy">
            Job dates pulled from the new NoA Jobs database plus dated linked tasks.
          </p>
        </div>
        <div className="jobs-actions">
          <div className="jobs-sync">
            <span>{report.fetchedAt ? `Synced ${new Date(report.fetchedAt).toLocaleString()}` : 'Not synced yet'}</span>
            <strong>{jobs.length} calendar items</strong>
          </div>
          <button className="secondary-action" onClick={() => void refreshJobs()} disabled={isLoading}>
            {isLoading ? 'Syncing...' : 'Sync jobs'}
          </button>
          <button className="primary-action" onClick={() => setEditor({ mode: 'create', kind: 'job', item: null })}>
            <Plus size={16} />
            New job
          </button>
        </div>
      </article>

      {report.upcomingJobsError && (
        <article className="glass-card wide jobs-error">
          <CircleAlert size={20} />
          <p>{report.upcomingJobsError}</p>
        </article>
      )}

      <section className="jobs-metrics">
        <article>
          <span>Calendar items</span>
          <strong>{jobs.length}</strong>
        </article>
        <article>
          <span>Linked tasks</span>
          <strong>{taskSourcedCount}</strong>
        </article>
        <article>
          <span>Due soon</span>
          <strong>{dueSoonCount}</strong>
        </article>
        <article>
          <span>High priority</span>
          <strong>{jobs.filter((job) => job.priority === 'High').length}</strong>
        </article>
      </section>

      <article className="glass-card wide jobs-calendar-shell">
        <div className="calendar-toolbar">
          <div>
            <p className="eyebrow">Job calendar</p>
            <h3>{formatCalendarMonth(calendarMonth)}</h3>
          </div>
          <div className="calendar-actions">
            <button className="secondary-action" onClick={() => setCalendarMonth(shiftMonth(calendarMonth, -1))}>Previous</button>
            <button className="secondary-action" onClick={() => setCalendarMonth(brisbaneToday().slice(0, 7))}>Today</button>
            <button className="secondary-action" onClick={() => setCalendarMonth(shiftMonth(calendarMonth, 1))}>Next</button>
          </div>
        </div>

        <div className="jobs-calendar">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
            <span className="calendar-weekday" key={day}>{day}</span>
          ))}
          {calendarDays.map((day) => (
            <div className={`calendar-day ${day.inMonth ? '' : 'muted'} ${day.date === brisbaneToday() ? 'today' : ''}`} key={day.date}>
              <div className="calendar-day-head">
                <span>{Number(day.date.slice(-2))}</span>
                {day.jobs.length > 0 && <strong>{day.jobs.length}</strong>}
              </div>
              <div className="calendar-day-jobs">
                {day.jobs.slice(0, 2).map((job) => (
                  <button className={`calendar-job priority-${(job.priority || 'none').toLowerCase()}`} onClick={() => setEditor({ mode: 'view', kind: job.sourceKind, item: job.task || job })} key={`${job.sourceKind}-${job.id}`}>
                    <span>{job.title}</span>
                    {job.client && <small>{job.client}</small>}
                    <small>{job.sourceLabel}</small>
                  </button>
                ))}
                {day.jobs.length > 2 && (
                  <button className="calendar-more" onClick={() => setSelectedCalendarDay({ date: day.date, jobs: day.jobs })}>
                    {day.jobs.length} tasks
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </article>

      <section className="mobile-agenda">
        <div className="panel-row-head">
          <PanelTitle eyebrow="Agenda" title={jobsThisMonth.length ? 'This month' : 'Next jobs'} />
          <span>{featuredJobs.length} shown</span>
        </div>
        {jobs.length === 0 ? (
          <article className="glass-card wide">
            <p className="empty-state">No upcoming jobs found.</p>
          </article>
        ) : (
          featuredJobs.map((job) => (
            <UpcomingJobCard
              job={job}
              key={`${job.sourceKind}-${job.id}`}
              onOpen={() => setEditor({ mode: 'view', kind: job.sourceKind, item: job.task || job })}
              onEdit={() => setEditor({ mode: 'edit', kind: job.sourceKind, item: job.task || job })}
            />
          ))
        )}
      </section>
      {selectedCalendarDay && (
        <CalendarDayModal
          date={selectedCalendarDay.date}
          jobs={selectedCalendarDay.jobs}
          onClose={() => setSelectedCalendarDay(null)}
          onOpen={(job) => {
            setSelectedCalendarDay(null);
            setEditor({ mode: 'view', kind: job.sourceKind, item: job.task || job });
          }}
          onEdit={(job) => {
            setSelectedCalendarDay(null);
            setEditor({ mode: 'edit', kind: job.sourceKind, item: job.task || job });
          }}
        />
      )}
      {editor && (
        <NotionItemModal
          mode={editor.mode}
          kind={editor.kind}
          item={editor.item}
          availableJobs={report.upcomingJobs}
          onClose={() => setEditor(null)}
          onEdit={() => setEditor((current) => current ? { ...current, mode: 'edit' } : current)}
          onSave={handleJobSave}
          onArchive={editor.item ? handleJobArchive : undefined}
        />
      )}
    </section>
  );
}

function UpcomingJobCard({
  job,
  onOpen,
  onEdit
}: {
  job: CalendarJob;
  onOpen: () => void;
  onEdit: () => void;
}) {
  return (
    <article className={`job-card upcoming priority-${(job.priority || 'none').toLowerCase()}`}>
      <button className="job-card-main" onClick={onOpen}>
        <div className="job-card-title">
          <span className="priority-dot" />
          <strong>{job.title}</strong>
        </div>
      </button>
      <div className="card-tools">
        <button onClick={onOpen}>View</button>
        <button onClick={onEdit} aria-label={`Edit ${job.title}`}><Edit3 size={14} /></button>
      </div>
      <div className="job-card-title mobile-title">
        <span className="priority-dot" />
        <strong>{job.title}</strong>
      </div>
      <div className="job-card-meta">
        <span className={`due-pill ${job.dueState === 'Overdue' ? 'danger' : job.dueState === 'Due today' ? 'today' : ''}`}>
          {job.jobDate ? `${job.dueState} · ${job.jobDate}` : 'No date'}
        </span>
        {job.client && <span>{job.client}</span>}
        <span>{job.sourceLabel}</span>
      </div>
      {job.location && <p className="job-assignee">{job.location}</p>}
      {job.deliverableTypes.length > 0 && (
        <div className="job-chip-row">
          {job.deliverableTypes.slice(0, 4).map((type) => <span key={type}>{type}</span>)}
        </div>
      )}
      {(job.attachments || []).length > 0 && (
        <div className="attachment-chip-row">
          {(job.attachments || []).slice(0, 2).map((attachment) => (
            <a href={attachment.url} target="_blank" rel="noreferrer" key={attachment.url}>
              <ArrowUpRight size={12} />
              {attachment.name}
            </a>
          ))}
        </div>
      )}
    </article>
  );
}

function CalendarDayModal({
  date,
  jobs,
  onClose,
  onOpen,
  onEdit
}: {
  date: string;
  jobs: CalendarJob[];
  onClose: () => void;
  onOpen: (job: CalendarJob) => void;
  onEdit: (job: CalendarJob) => void;
}) {
  useModalEscape(onClose);
  const firstKey = jobs[0] ? `${jobs[0].sourceKind}-${jobs[0].id}` : '';
  const [selectedId, setSelectedId] = useState(firstKey);
  const selectedJob = jobs.find((job) => `${job.sourceKind}-${job.id}` === selectedId) || jobs[0];

  useEffect(() => {
    setSelectedId(jobs[0] ? `${jobs[0].sourceKind}-${jobs[0].id}` : '');
  }, [date, jobs]);

  const selectedKey = selectedJob ? `${selectedJob.sourceKind}-${selectedJob.id}` : '';
  const sourceCounts = jobs.reduce<Record<string, number>>((counts, job) => {
    const key = job.sourceKind === 'task' ? "JOHN'S HUB" : 'Jobs database';
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});

  return (
    <ModalPortal>
    <div className="modal-shell" role="dialog" aria-modal="true" aria-label={`Calendar items for ${date}`}>
      <button className="modal-backdrop" onClick={onClose} aria-label="Close calendar day" />
      <section className="notion-modal calendar-day-modal">
        <div className="modal-head calendar-day-headline">
          <div>
            <p className="eyebrow">Calendar day</p>
            <h3>{formatCalendarDay(date)}</h3>
            <div className="calendar-day-summary">
              <span>{jobs.length} {jobs.length === 1 ? 'item' : 'items'}</span>
              {Object.entries(sourceCounts).map(([source, count]) => (
                <span key={source}>{count} {source}</span>
              ))}
            </div>
          </div>
          <button type="button" className="icon-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="calendar-day-layout">
          <div className="calendar-agenda-list" role="tablist" aria-label="Tasks on this day">
            {jobs.map((job, index) => {
              const key = `${job.sourceKind}-${job.id}`;
              return (
                <button
                  className={key === selectedId ? 'active' : ''}
                  onClick={() => setSelectedId(key)}
                  role="tab"
                  type="button"
                  aria-selected={key === selectedId}
                  key={key}
                >
                  <span className={`priority-dot priority-${(job.priority || 'none').toLowerCase()}`} />
                  <div>
                    <strong>{job.title}</strong>
                    <small>{[job.client, job.sourceLabel].filter(Boolean).join(' - ') || `Item ${index + 1}`}</small>
                  </div>
                  <em>{job.dueState || 'Scheduled'}</em>
                </button>
              );
            })}
          </div>

          {selectedJob && (
            <article className={`calendar-day-preview priority-${(selectedJob.priority || 'none').toLowerCase()}`} role="tabpanel" aria-label={selectedJob.title} key={selectedKey}>
              <div className="calendar-preview-title">
                <span className={`priority-dot priority-${(selectedJob.priority || 'none').toLowerCase()}`} />
                <div>
                  <strong>{selectedJob.title}</strong>
                  <p>{[selectedJob.client, selectedJob.location].filter(Boolean).join(' - ') || selectedJob.sourceLabel}</p>
                </div>
              </div>

              <div className="calendar-preview-grid">
                <div>
                  <span>Date</span>
                  <strong>{selectedJob.jobDate || 'No date'}</strong>
                  <small>{selectedJob.dueState || 'Scheduled'}</small>
                </div>
                <div>
                  <span>Source</span>
                  <strong>{selectedJob.sourceKind === 'task' ? "JOHN'S HUB" : 'Jobs'}</strong>
                  <small>{selectedJob.sourceLabel}</small>
                </div>
                <div>
                  <span>Priority</span>
                  <strong>{selectedJob.priority || 'None'}</strong>
                  <small>{selectedJob.sourceKind === 'task' ? selectedJob.task?.status || '' : selectedJob.location || ''}</small>
                </div>
              </div>

              {selectedJob.notes && <p className="calendar-preview-notes">{selectedJob.notes}</p>}
              {selectedJob.deliverableTypes.length > 0 && (
                <div className="job-chip-row">
                  {selectedJob.deliverableTypes.slice(0, 6).map((type) => <span key={type}>{type}</span>)}
                </div>
              )}
              {(selectedJob.attachments || []).length > 0 && (
                <div className="attachment-chip-row">
                  {(selectedJob.attachments || []).slice(0, 4).map((attachment) => (
                    <a href={attachment.url} target="_blank" rel="noreferrer" key={attachment.url}>
                      <ArrowUpRight size={12} />
                      {attachment.name}
                    </a>
                  ))}
                </div>
              )}

              <div className="calendar-preview-actions">
                {selectedJob.url && (
                  <a className="secondary-action" href={selectedJob.url} target="_blank" rel="noreferrer">
                    <ArrowUpRight size={16} />
                    Open Notion
                  </a>
                )}
                <button type="button" className="secondary-action" onClick={() => onEdit(selectedJob)}>
                  <Edit3 size={16} />
                  Edit
                </button>
                <button type="button" className="primary-action" onClick={() => onOpen(selectedJob)}>
                  View details
                </button>
              </div>
            </article>
          )}
        </div>
      </section>
    </div>
    </ModalPortal>
  );
}

function BudgetingView({
  report,
  isLoading,
  refreshBudget,
  onMutated,
  section,
  setSection
}: {
  report: BudgetReport;
  isLoading: boolean;
  refreshBudget: () => Promise<BudgetReport>;
  onMutated: () => void;
  section: BudgetSection;
  setSection: (section: BudgetSection) => void;
}) {
  const [editor, setEditor] = useState<{ kind: BudgetItemKind; row: BudgetRow | null } | null>(null);
  const [emailDraft, setEmailDraft] = useState<BudgetEmailSettings>(() => normalizeBudgetEmailSettings(report.emailSettings));
  const [emailMessage, setEmailMessage] = useState('');
  const [emailPreviews, setEmailPreviews] = useState<BudgetEmailPreview[]>([]);
  const [emailSendHistory, setEmailSendHistory] = useState<BudgetEmailSendResult[]>([]);
  const [mortgageExpenseMessage, setMortgageExpenseMessage] = useState('');
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [updatingExpenseId, setUpdatingExpenseId] = useState('');
  const [modeFilter, setModeFilter] = useState<BudgetModeFilter>('all');
  const [showInactiveRows, setShowInactiveRows] = useState(false);
  const [ledgerSection, setLedgerSection] = useState<LedgerSection>('expenses');
  const totals = report.totals;
  const netTone = totals.netWeekly >= 0 ? 'green' : 'amber';
  const dataCount = Object.values(report.tables).reduce((count, rows) => count + rows.length, 0);
  const activeTenantCount = emailDraft.tenants.filter((tenant) => tenant.active !== false && tenant.email).length;
  const filteredTables = useMemo(() => filterBudgetTables(report.tables, modeFilter, showInactiveRows), [report.tables, modeFilter, showInactiveRows]);
  const analytics = useMemo(() => buildBudgetPageAnalytics(report, filteredTables), [report, filteredTables]);
  const tenantBillingRows = useMemo<BudgetTenantBillingRow[]>(() => emailDraft.tenants.map((tenant) => {
    const mortgage = findBudgetMortgageForTenant(tenant, report.mortgageSummary.mortgages);
    const rentWeekly = toWeeklyBudgetAmount(tenant.rent, tenant.rentFrequency);
    const utilitiesWeekly = mortgage ? mortgage.weeklyUtilitiesSplit ?? mortgage.weeklyTenantBill : 0;
    return {
      tenant,
      mortgage,
      rentWeekly,
      utilitiesWeekly,
      totalWeekly: rentWeekly + utilitiesWeekly,
      warnings: budgetTenantWarnings(tenant, mortgage, rentWeekly, utilitiesWeekly)
    };
  }), [emailDraft.tenants, report.mortgageSummary.mortgages]);
  const setupWarnings = tenantBillingRows.flatMap((row) => row.warnings.map((warning) => `${row.tenant.name || 'Unnamed tenant'}: ${warning}`));
  const mortgageExpenseGroups = useMemo(() => buildMortgageExpenseGroups(report.mortgageSummary.mortgages, filteredTables.mortgageExpenses), [report.mortgageSummary.mortgages, filteredTables.mortgageExpenses]);
  const propertyAnalytics = useMemo(() => buildBudgetPropertyAnalytics(report.mortgageSummary.mortgages, tenantBillingRows, mortgageExpenseGroups), [report.mortgageSummary.mortgages, tenantBillingRows, mortgageExpenseGroups]);
  const attentionItems = useMemo(() => buildBudgetAttentionItems(analytics, tenantBillingRows, mortgageExpenseGroups, filteredTables), [analytics, tenantBillingRows, mortgageExpenseGroups, filteredTables]);
  const tenantWeeklyTotal = sumNumbers(tenantBillingRows.filter((row) => row.tenant.active !== false), (row) => row.totalWeekly);
  const ownerPropertyWeekly = analytics.weeklyMortgage + sumNumbers(mortgageExpenseGroups, (group) => group.weeklyOwner);
  const nextSendDate = getNextCycleDate(emailDraft.cycleDay);
  const recurringWeeklyPressure = analytics.weeklyExpenses + analytics.weeklyDebt + analytics.weeklyMortgage + analytics.weeklySavings;

  useEffect(() => {
    setEmailDraft(normalizeBudgetEmailSettings(report.emailSettings));
  }, [report.emailSettings]);

  const saveEmailSettings = async (): Promise<boolean> => {
    if (!window.noa?.saveBudgetEmailSettings) {
      setEmailMessage('Tenant email settings need the Vercel/desktop API.');
      return false;
    }
    setIsSavingEmail(true);
    setEmailMessage('');
    const response = await window.noa.saveBudgetEmailSettings({ settings: emailDraft });
    setIsSavingEmail(false);
    setEmailMessage(response.message || (response.ok ? 'Settings saved.' : 'Could not save settings.'));
    if (response.ok) onMutated();
    return response.ok;
  };

  const previewTenantEmails = async (sendNow = false, tenantId = '') => {
    if (!window.noa?.sendBudgetTenantEmail) {
      setEmailMessage('Tenant email sending needs the Vercel/desktop API.');
      return;
    }
    setIsSendingEmail(true);
    setEmailMessage('');
    const saved = await saveEmailSettings();
    if (!saved) {
      setIsSendingEmail(false);
      return;
    }
    const response = await window.noa.sendBudgetTenantEmail({ dryRun: !sendNow, tenantId: tenantId || undefined });
    setIsSendingEmail(false);
    setEmailPreviews((response.previews || []) as BudgetEmailPreview[]);
    if (sendNow) setEmailSendHistory((response.sent || []) as BudgetEmailSendResult[]);
    setEmailMessage(response.message || (response.ok ? 'Tenant email action completed.' : 'Tenant email action failed.'));
    onMutated();
  };

  const updateTenant = (tenantId: string, patch: Partial<BudgetTenant>) => {
    setEmailDraft((current) => ({
      ...current,
      tenants: current.tenants.map((tenant) => tenant.id === tenantId ? { ...tenant, ...patch } : tenant)
    }));
  };

  const addTenant = () => {
    setEmailDraft((current) => ({
      ...current,
      tenants: [
        ...current.tenants,
        { id: crypto.randomUUID(), name: '', email: '', mortgageLocalId: report.mortgageSummary.mortgages[0]?.localId || '', rent: 0, rentFrequency: 'weekly', active: true }
      ]
    }));
  };

  const removeTenant = (tenantId: string) => {
    setEmailDraft((current) => ({
      ...current,
      tenants: current.tenants.filter((tenant) => tenant.id !== tenantId)
    }));
  };

  const updateMortgageExpenseOffset = async (row: BudgetRow, offsetToTenants: boolean) => {
    if (!row.id || !window.noa?.manageBudgetItem) {
      setMortgageExpenseMessage('Mortgage expense updates need the Vercel/desktop API.');
      return;
    }
    setUpdatingExpenseId(row.id);
    setMortgageExpenseMessage('');
    const response = await window.noa.manageBudgetItem({
      kind: 'mortgageExpenses',
      action: 'update',
      id: row.id,
      values: { offset_to_tenants: offsetToTenants }
    });
    setUpdatingExpenseId('');
    setMortgageExpenseMessage(response.message || (response.ok ? 'Mortgage expense updated.' : 'Could not update mortgage expense.'));
    if (response.ok) onMutated();
  };

  const createMortgageExpenseFor = (mortgage: BudgetMortgageBill | null) => {
    setEditor({
      kind: 'mortgageExpenses',
      row: {
        mortgage_local_id: mortgage?.localId || '',
        frequency: 'weekly',
        active: true,
        offset_to_tenants: false
      }
    });
  };

  return (
    <section className="page-fade budget-page">
      <article className="glass-card wide budget-hero">
        <div>
          <PanelTitle eyebrow="Optra Studio ledger" title="Budgeting" />
          <p className="section-copy">
            A normalized budget workspace for {report.owner.email}. It reads income, expenses, debts, mortgages, assets, savings, and tenant offsets from Supabase.
          </p>
        </div>
        <div className="xero-actions">
          <div className={`xero-health ${report.ok ? 'online' : 'offline'}`}>
            <span />
            {report.ok ? 'Connected' : 'Needs setup'}
          </div>
          <button className="secondary-action" onClick={() => void refreshBudget()} disabled={isLoading}>
            <RefreshCw size={16} />
            {isLoading ? 'Syncing...' : 'Sync budget'}
          </button>
        </div>
      </article>

      {!report.ok && (
        <article className="glass-card wide xero-alert">
          <CircleAlert size={20} />
          <div>
            <strong>{report.message || 'Budgeting is not connected yet.'}</strong>
            <p>Confirm SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are configured for the Optra Studio project.</p>
          </div>
        </article>
      )}

      {report.ok && dataCount === 0 && (
        <article className="glass-card wide xero-alert">
          <Database size={20} />
          <div>
            <strong>Connected, but the normalized ledger tables are empty.</strong>
            <p>Add income, expenses, mortgage, or tenant offset rows here and NoA will write them back into Supabase.</p>
          </div>
        </article>
      )}

      <nav className="budget-section-tabs" aria-label="Budgeting sections">
        {budgetSections.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.id} className={section === item.id ? 'active' : ''} onClick={() => setSection(item.id)}>
              <Icon size={17} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {section === 'overview' && (
        <>
      <section className="overview-hero budget-overview-hero">
        <article className="overview-balance-card budget-balance-card">
          <div>
            <span>Net weekly position</span>
            <strong>{formatMoney(totals.netWeekly)}</strong>
            <p>Income after active expenses, debts, mortgages, savings, and property offsets.</p>
          </div>
          <div className="overview-card-meta">
            <div>
              <span>Income</span>
              <strong>{formatMoney(totals.weeklyIncome)}</strong>
            </div>
            <div>
              <span>Outgoing</span>
              <strong>{formatMoney(totals.weeklyExpenses + totals.weeklyDebtRepayments + totals.weeklyMortgageRepayments + totals.weeklyMortgageExpenses + totals.weeklySavings)}</strong>
            </div>
          </div>
        </article>

        <article className="overview-chart-card">
          <div className="panel-row-head">
            <PanelTitle eyebrow="Budget shape" title="Monthly projection" />
            <BarChart3 size={20} />
          </div>
          <BudgetProjectionChart analytics={analytics} />
        </article>

        <div className="overview-action-tiles" aria-label="Budget quick actions">
          <button type="button" onClick={() => setSection('ledger')}>
            <ReceiptText size={18} />
            <span>Ledger</span>
          </button>
          <button type="button" onClick={() => setSection('calendar')}>
            <CalendarDays size={18} />
            <span>Calendar</span>
          </button>
          <button type="button" onClick={() => setSection('property')}>
            <Building2 size={18} />
            <span>Property</span>
          </button>
          <button type="button" onClick={() => setSection('fuel')}>
            <Activity size={18} />
            <span>Fuel</span>
          </button>
        </div>
      </section>

      <section className="budget-overview">
        <BudgetMetric icon={WalletCards} label="Weekly income" value={formatMoney(totals.weeklyIncome)} detail={formatMoney(totals.monthlyIncome) + ' monthly equivalent'} />
        <BudgetMetric icon={ReceiptText} label="Weekly outgoings" value={formatMoney(totals.weeklyExpenses + totals.weeklyDebtRepayments + totals.weeklyMortgageRepayments + totals.weeklyMortgageExpenses + totals.weeklySavings)} detail="expenses, debts, mortgage, savings" />
        <BudgetMetric icon={PieChart} label="Net weekly" value={formatMoney(totals.netWeekly)} detail="after active budget rows" tone={netTone} />
        <BudgetMetric icon={Building2} label="Net worth" value={formatMoney(totals.netWorth)} detail={`${formatMoney(totals.assetValue)} assets minus debts`} />
      </section>

      <section className="budget-signal-strip">
        <article>
          <span>Recurring pressure</span>
          <strong>{formatMoney(recurringWeeklyPressure)}</strong>
          <p>Weekly active expenses, debts, mortgage, and savings.</p>
        </article>
        <article>
          <span>Tenant billing</span>
          <strong>{formatMoney(tenantWeeklyTotal)}</strong>
          <p>{activeTenantCount} active tenant{activeTenantCount === 1 ? '' : 's'} ready for rent and utility splits.</p>
        </article>
        <article>
          <span>Next automation</span>
          <strong>{nextSendDate}</strong>
          <p>Tenant email cycle based on the configured billing day.</p>
        </article>
      </section>

      <section className="budget-command-grid">
        <BudgetCashflowPanel analytics={analytics} tenantWeeklyTotal={tenantWeeklyTotal} ownerPropertyWeekly={ownerPropertyWeekly} />
        <BudgetPropertyPanel rows={propertyAnalytics} />
        <BudgetAttentionPanel items={attentionItems} />
      </section>

      <section className="budget-decision-grid">
        <article className="glass-card budget-today-card">
          <div className="panel-row-head">
            <PanelTitle eyebrow="Budget today" title={analytics.today.title} />
            <Sparkles size={20} />
          </div>
          <p>{analytics.today.detail}</p>
          <div className="budget-action-stack">
            {analytics.today.actions.map((action) => (
              <div className={`budget-action ${action.tone}`} key={action.label}>
                <span />
                <div>
                  <strong>{action.label}</strong>
                  <p>{action.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="glass-card budget-panel">
          <div className="panel-row-head">
            <PanelTitle eyebrow="Forecast" title="Cashflow pressure" />
            <WalletCards size={20} />
          </div>
          <BudgetPressureList analytics={analytics} />
        </article>
      </section>

      <section className="budget-analytics-grid">
        <article className="glass-card budget-panel">
          <div className="panel-row-head">
            <PanelTitle eyebrow="Spend pressure" title="Top expense categories" />
            <PieChart size={20} />
          </div>
          <BudgetCategoryBars rows={analytics.expenseCategories} />
        </article>
        <article className="glass-card budget-panel">
          <div className="panel-row-head">
            <PanelTitle eyebrow="Debt and mortgage" title="Weekly pressure" />
            <CreditCard size={20} />
          </div>
          <BudgetPressureList analytics={analytics} />
        </article>
      </section>
        </>
      )}

      {section === 'ledger' && (
      <article className="glass-card wide budget-toolbar ledger-workspace-toolbar">
        <div>
          <PanelTitle eyebrow="Ledger workspace" title="Budget rows" />
          <p>Income, expenses, debts, savings, and assets now live inside one focused Ledger workspace.</p>
        </div>
        <div className="ledger-workspace-controls">
          <div className="ledger-section-tabs" aria-label="Ledger sections">
            {ledgerSections.map((item) => {
              const Icon = item.icon;
              return (
                <button key={item.id} className={ledgerSection === item.id ? 'active' : ''} onClick={() => setLedgerSection(item.id)}>
                  <Icon size={16} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
          <div className="budget-filter-controls">
            <div className="segmented-control">
              {(['all', 'personal', 'business'] as BudgetModeFilter[]).map((mode) => (
                <button key={mode} className={modeFilter === mode ? 'active' : ''} onClick={() => setModeFilter(mode)}>
                  {mode === 'all' ? 'All' : mode[0].toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
            <label className="toggle-row">
              <input type="checkbox" checked={showInactiveRows} onChange={(event) => setShowInactiveRows(event.currentTarget.checked)} />
              Show inactive
            </label>
          </div>
        </div>
      </article>
      )}

      {(section === 'property' || section === 'automation') && (
      <section className="budget-grid">
        {section === 'property' && (
        <article className="glass-card budget-panel budget-tenant-workflow">
          <div className="panel-row-head">
            <PanelTitle eyebrow="Tenant billing workflow" title="Rent, utilities, total" />
            <span>{activeTenantCount} active tenant(s)</span>
          </div>
          <p className="budget-panel-copy">
            Tenant totals combine their configured rent with an even split of expenses marked offset to tenants.
          </p>
          <div className="budget-tenant-summary-grid">
            {tenantBillingRows.length === 0 ? (
              <div className="empty-state">No tenants configured yet. Add tenants below, then save settings.</div>
            ) : tenantBillingRows.map(({ tenant, mortgage, rentWeekly, utilitiesWeekly, totalWeekly }) => (
              <article className={`tenant-bill-card ${tenant.active === false ? 'inactive' : ''}`} key={tenant.id}>
                <div className="tenant-bill-head">
                  <div>
                    <span>{tenant.active === false ? 'Paused' : tenant.email ? 'Ready to email' : 'Needs email'}</span>
                    <strong>{tenant.name || 'Unnamed tenant'}</strong>
                    <p>{tenant.email || 'No email configured'}</p>
                  </div>
                  <b>{formatMoney(totalWeekly)}</b>
                </div>
                <div className="tenant-bill-breakdown">
                  <span>Rent <strong>{formatMoney(rentWeekly)}</strong><small>{formatFrequencyLabel(tenant.rentFrequency)}</small></span>
                  <span>Utilities <strong>{formatMoney(utilitiesWeekly)}</strong><small>{mortgage?.name || 'No property'}</small></span>
                  <span>Total <strong>{formatMoney(totalWeekly)}</strong><small>weekly bill</small></span>
                </div>
                <div className="tenant-bill-meta">
                  <span>Next cycle {nextSendDate}</span>
                  <span>{mortgage?.tenantCount || 0} tenant split</span>
                </div>
                <div className="tenant-bill-actions">
                  <button className="secondary-action compact" onClick={() => void previewTenantEmails(false, tenant.id)} disabled={isSendingEmail || tenant.active === false}>
                    <Eye size={16} />
                    Preview
                  </button>
                  <button className="primary-action compact" onClick={() => void previewTenantEmails(true, tenant.id)} disabled={isSendingEmail || tenant.active === false || !tenant.email}>
                    <Send size={16} />
                    Send now
                  </button>
                </div>
              </article>
            ))}
          </div>
        </article>
        )}

        {section === 'property' && (
        <article className="glass-card budget-panel">
          <div className="panel-row-head">
            <PanelTitle eyebrow="Mortgage automation" title="Tenant bills" />
            <span>{report.fetchedAt ? `Synced ${formatTimeOnly(report.fetchedAt)}` : 'Not synced'}</span>
          </div>
          {report.mortgageSummary.mortgages.length === 0 ? (
            <p className="empty-state">No active mortgage rows found yet. Add a mortgage to calculate tenant bill splits.</p>
          ) : (
            <div className="budget-mortgage-list">
              {report.mortgageSummary.mortgages.map((mortgage) => (
                <article className="budget-mortgage-card" key={mortgage.id || mortgage.localId || mortgage.name}>
                  <div>
                    <strong>{mortgage.name}</strong>
                    <p>{mortgage.propertyAddress || 'No property address'} · {mortgage.tenantCount || 0} tenant(s)</p>
                  </div>
                  <div className="budget-bill-grid">
                    <span>Mortgage context <strong>{formatMoney(mortgage.weeklyRepayment)}</strong></span>
                    <span>Offset utilities <strong>{formatMoney(mortgage.weeklyOffsetExpenses)}</strong></span>
                    <span>Utilities per tenant <strong>{formatMoney(mortgage.weeklyTenantBill)}</strong></span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </article>
        )}

        {section === 'property' && (
        <article className="glass-card budget-panel budget-mortgage-expense-centre">
          <div className="panel-row-head">
            <PanelTitle eyebrow="Mortgage expense logic" title="Owner costs vs tenant offsets" />
            <button className="secondary-action compact" onClick={() => createMortgageExpenseFor(report.mortgageSummary.mortgages[0] || null)}>
              <Plus size={16} />
              Add expense
            </button>
          </div>
          <p className="budget-panel-copy">
            Expenses marked offset to tenants are split evenly into tenant utilities. Everything else stays as an owner-only cost.
          </p>
          {mortgageExpenseMessage && <p className="form-message">{mortgageExpenseMessage}</p>}
          <div className="mortgage-expense-group-list">
            {mortgageExpenseGroups.length === 0 ? (
              <p className="empty-state">No mortgage expenses found yet. Add one here to start separating owner costs from tenant-billed utilities.</p>
            ) : mortgageExpenseGroups.map((group) => (
              <article className="mortgage-expense-group" key={group.key}>
                <div className="mortgage-expense-group-head">
                  <div>
                    <span>{group.mortgage ? 'Linked property' : 'Unlinked expenses'}</span>
                    <strong>{group.title}</strong>
                    <p>{group.address || 'No property address'} - {group.tenantCount} tenant(s)</p>
                  </div>
                  <button className="secondary-action compact" onClick={() => createMortgageExpenseFor(group.mortgage)}>
                    <Plus size={16} />
                    New
                  </button>
                </div>
                <div className="mortgage-expense-split-grid">
                  <span>Total expenses <strong>{formatMoney(group.weeklyTotal)}</strong></span>
                  <span>Tenant offsets <strong>{formatMoney(group.weeklyOffset)}</strong></span>
                  <span>Owner-only <strong>{formatMoney(group.weeklyOwner)}</strong></span>
                  <span>Per tenant <strong>{formatMoney(group.perTenant)}</strong></span>
                </div>
                {group.warnings.length > 0 && (
                  <div className="budget-tenant-warning-row">
                    {group.warnings.map((warning) => <span key={warning}><CircleAlert size={13} />{warning}</span>)}
                  </div>
                )}
                <div className="mortgage-expense-list">
                  {group.expenses.length === 0 ? (
                    <p className="empty-state">No expense rows linked to this property yet.</p>
                  ) : group.expenses.map((expense) => {
                    const weekly = budgetWeeklyValue(expense, 'amount');
                    const perTenant = expense.offset_to_tenants && group.tenantCount > 0 ? weekly / group.tenantCount : 0;
                    return (
                      <article className={`mortgage-expense-row ${expense.offset_to_tenants ? 'tenant-offset' : 'owner-only'} ${expense.active === false ? 'inactive' : ''}`} key={expense.id || expense.local_id || expense.name}>
                        <div>
                          <span>{expense.offset_to_tenants ? 'Tenant offset' : 'Owner-only'}</span>
                          <strong>{expense.name || expense.category || 'Mortgage expense'}</strong>
                          <p>{[expense.category, expense.frequency, expense.active === false ? 'inactive' : 'active'].filter(Boolean).join(' - ')}</p>
                        </div>
                        <div className="mortgage-expense-values">
                          <span>Weekly <strong>{formatMoney(weekly)}</strong></span>
                          <span>Per tenant <strong>{formatMoney(perTenant)}</strong></span>
                        </div>
                        <label className="offset-toggle">
                          <input
                            type="checkbox"
                            checked={Boolean(expense.offset_to_tenants)}
                            disabled={updatingExpenseId === expense.id}
                            onChange={(event) => void updateMortgageExpenseOffset(expense, event.currentTarget.checked)}
                          />
                          <span>{expense.offset_to_tenants ? 'Offset on' : 'Offset off'}</span>
                        </label>
                        <button className="secondary-action compact" onClick={() => setEditor({ kind: 'mortgageExpenses', row: expense })}>
                          <Edit3 size={15} />
                          Edit
                        </button>
                      </article>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>
        </article>
        )}

        {(section === 'property' || section === 'automation') && (
        <article className="glass-card budget-panel">
          <div className="panel-row-head">
            <PanelTitle eyebrow={section === 'automation' ? 'Automation' : 'Email automation'} title={section === 'automation' ? 'Billing activity and schedule' : 'Tenant billing emails'} />
            <Send size={20} />
          </div>
          <div className="budget-email-card budget-setup-card">
            <div className="budget-setup-grid">
              <article className="budget-setup-section">
                <div className="budget-email-topline">
                  <div>
                    <strong>{emailDraft.enabled ? 'Automatic cycle prepared' : 'Manual send mode'}</strong>
                    <p>{activeTenantCount} active recipient(s). Next cycle: {nextSendDate}.</p>
                  </div>
                  <label className="toggle-row">
                    <input
                      type="checkbox"
                      checked={emailDraft.enabled}
                      onChange={(event) => setEmailDraft((current) => ({ ...current, enabled: event.currentTarget.checked }))}
                    />
                    Auto cycle
                  </label>
                </div>
                <div className="budget-email-fields compact">
                  <label>
                    <span>Cycle day</span>
                    <select
                      value={emailDraft.cycleDay}
                      onChange={(event) => setEmailDraft((current) => ({ ...current, cycleDay: Number(event.currentTarget.value) }))}
                    >
                      {[0, 1, 2, 3, 4, 5, 6].map((day) => <option value={day} key={day}>{dayName(day)}</option>)}
                    </select>
                  </label>
                  <label>
                    <span>Reply-to</span>
                    <input
                      value={emailDraft.replyTo}
                      onChange={(event) => setEmailDraft((current) => ({ ...current, replyTo: event.currentTarget.value }))}
                    />
                  </label>
                </div>
              </article>

              <article className="budget-setup-section">
                <div>
                  <strong>Message template</strong>
                  <p>NoA inserts each tenant's rent, utilities, total, and property details automatically.</p>
                </div>
                <div className="budget-email-fields single">
                  <label>
                    <span>Subject prefix</span>
                    <input
                      value={emailDraft.subjectPrefix}
                      onChange={(event) => setEmailDraft((current) => ({ ...current, subjectPrefix: event.currentTarget.value }))}
                    />
                  </label>
                  <label>
                    <span>Tenant note</span>
                    <textarea
                      value={emailDraft.notes}
                      onChange={(event) => setEmailDraft((current) => ({ ...current, notes: event.currentTarget.value }))}
                      rows={3}
                    />
                  </label>
                </div>
              </article>
            </div>

            {setupWarnings.length > 0 && (
              <div className="budget-setup-warnings">
                {setupWarnings.slice(0, 5).map((warning) => (
                  <span key={warning}><CircleAlert size={14} />{warning}</span>
                ))}
              </div>
            )}

            <div className="budget-tenant-editor-head">
              <div>
                <strong>Tenants</strong>
                <p>Configure rent, email, linked property, and billing status in one place.</p>
              </div>
              <button className="secondary-action compact" onClick={addTenant}>
                <Plus size={16} />
                Add tenant
              </button>
            </div>

            <div className="budget-tenant-list">
              {tenantBillingRows.map(({ tenant, mortgage, rentWeekly, utilitiesWeekly, totalWeekly, warnings }) => (
                <article className="budget-tenant-config-card" key={tenant.id}>
                  <div className="budget-tenant-config-top">
                    <div>
                      <span>{tenant.active === false ? 'Paused' : warnings.length ? 'Needs attention' : 'Ready'}</span>
                      <strong>{tenant.name || 'Unnamed tenant'}</strong>
                      <p>{mortgage?.name || 'No property linked'} - {formatMoney(totalWeekly)} weekly total</p>
                    </div>
                    <label className="toggle-row">
                      <input type="checkbox" checked={tenant.active} onChange={(event) => updateTenant(tenant.id, { active: event.currentTarget.checked })} />
                      Active
                    </label>
                  </div>
                  <div className="budget-tenant-form-grid">
                    <label>
                      <span>Name</span>
                      <input placeholder="Tenant name" value={tenant.name} onChange={(event) => updateTenant(tenant.id, { name: event.currentTarget.value })} />
                    </label>
                    <label>
                      <span>Email</span>
                      <input placeholder="tenant@email.com" value={tenant.email} onChange={(event) => updateTenant(tenant.id, { email: event.currentTarget.value })} />
                    </label>
                    <label>
                      <span>Property</span>
                      <select value={tenant.mortgageLocalId} onChange={(event) => updateTenant(tenant.id, { mortgageLocalId: event.currentTarget.value })}>
                        <option value="">First mortgage</option>
                        {report.mortgageSummary.mortgages.map((mortgageOption) => (
                          <option value={mortgageOption.localId || ''} key={mortgageOption.id || mortgageOption.localId || mortgageOption.name}>{mortgageOption.name}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Rent</span>
                      <input type="number" placeholder="Rent" value={tenant.rent || ''} onChange={(event) => updateTenant(tenant.id, { rent: Number(event.currentTarget.value || 0) })} />
                    </label>
                    <label>
                      <span>Rent frequency</span>
                      <select value={tenant.rentFrequency || 'weekly'} onChange={(event) => updateTenant(tenant.id, { rentFrequency: event.currentTarget.value })}>
                        <option value="weekly">Weekly</option>
                        <option value="fortnightly">Fortnightly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </label>
                  </div>
                  <div className="budget-tenant-config-summary">
                    <span>Rent <strong>{formatMoney(rentWeekly)}</strong></span>
                    <span>Utilities <strong>{formatMoney(utilitiesWeekly)}</strong></span>
                    <span>Total <strong>{formatMoney(totalWeekly)}</strong></span>
                  </div>
                  {warnings.length > 0 && (
                    <div className="budget-tenant-warning-row">
                      {warnings.map((warning) => <span key={warning}><CircleAlert size={13} />{warning}</span>)}
                    </div>
                  )}
                  <div className="budget-tenant-config-actions">
                    <button className="secondary-action compact" onClick={() => void previewTenantEmails(false, tenant.id)} disabled={isSendingEmail || tenant.active === false}>
                      <Eye size={15} />
                      Preview
                    </button>
                    <button className="secondary-action compact danger-action" onClick={() => removeTenant(tenant.id)} aria-label="Remove tenant">
                      <Trash2 size={15} />
                      Remove
                    </button>
                  </div>
                </article>
              ))}
            </div>
            {emailMessage && <p className="form-message">{emailMessage}</p>}
            <div className="budget-email-actions">
              <button className="secondary-action" onClick={() => void saveEmailSettings()} disabled={isSavingEmail}>
                <Save size={16} />
                {isSavingEmail ? 'Saving...' : 'Save settings'}
              </button>
              <button className="secondary-action" onClick={() => void previewTenantEmails(false)} disabled={isSendingEmail}>
                <Eye size={16} />
                Preview
              </button>
              <button className="primary-action" onClick={() => void previewTenantEmails(true)} disabled={isSendingEmail || activeTenantCount === 0}>
                <Send size={16} />
                {isSendingEmail ? 'Sending...' : 'Send now'}
              </button>
            </div>
            {emailPreviews.length > 0 && (
              <div className="budget-email-previews">
                {emailPreviews.map((preview) => (
                  <article key={preview.tenantId}>
                    <span>{preview.to || 'No email address'}</span>
                    <strong>{preview.subject}</strong>
                    <div className="budget-preview-total-row">
                      <small>Rent {formatMoney(preview.rent || 0)}</small>
                      <small>Utilities {formatMoney(preview.utilities || 0)}</small>
                      <small>Total {formatMoney(preview.total || preview.weeklyBill || 0)}</small>
                    </div>
                    <p>{preview.text}</p>
                  </article>
                ))}
              </div>
            )}
            {emailSendHistory.length > 0 && (
              <div className="budget-email-history">
                {emailSendHistory.map((result) => (
                  <article className={result.ok ? 'success' : 'failed'} key={`${result.to}-${result.id || result.status}`}>
                    <span>{result.ok ? 'Sent' : 'Failed'}</span>
                    <strong>{result.to || 'Unknown recipient'}</strong>
                    <p>{result.message}</p>
                  </article>
                ))}
              </div>
            )}
            <BudgetEmailActivityPanel activity={report.tenantEmailActivity} />
          </div>
        </article>
        )}
      </section>
      )}

      {section === 'ledger' && ledgerSection === 'all' && (
      <section className="budget-table-grid">
        <BudgetTable title="Income" kind="income" rows={filteredTables.income} onEdit={(row) => setEditor({ kind: 'income', row })} onCreate={() => setEditor({ kind: 'income', row: null })} />
        <BudgetTable title="Expenses" kind="expenses" rows={filteredTables.expenses} onEdit={(row) => setEditor({ kind: 'expenses', row })} onCreate={() => setEditor({ kind: 'expenses', row: null })} />
        <BudgetTable title="Mortgages" kind="mortgages" rows={filteredTables.mortgages} onEdit={(row) => setEditor({ kind: 'mortgages', row })} onCreate={() => setEditor({ kind: 'mortgages', row: null })} />
        <BudgetTable title="Mortgage expenses" kind="mortgageExpenses" rows={filteredTables.mortgageExpenses} onEdit={(row) => setEditor({ kind: 'mortgageExpenses', row })} onCreate={() => setEditor({ kind: 'mortgageExpenses', row: null })} />
        <BudgetTable title="Debts" kind="debts" rows={filteredTables.debts} onEdit={(row) => setEditor({ kind: 'debts', row })} onCreate={() => setEditor({ kind: 'debts', row: null })} />
        <BudgetTable title="Assets and savings" kind="assets" rows={[...filteredTables.assets, ...filteredTables.savings]} onEdit={(row) => setEditor({ kind: row.goal_name ? 'savings' : 'assets', row })} onCreate={() => setEditor({ kind: 'assets', row: null })} />
      </section>
      )}

      {section === 'ledger' && ledgerSection === 'income' && (
        <BudgetLedgerPage
          eyebrow="Ledger income"
          title="Income"
          copy="Manage the income streams Ledger used for personal and business cashflow, tax reserve context, and scheduled calendar events."
          kind="income"
          rows={filteredTables.income}
          metrics={[
            { label: 'Weekly income', value: formatMoney(analytics.weeklyIncome), detail: `${formatMoney(analytics.monthlyIncome)} monthly equivalent` },
            { label: 'Rows', value: String(filteredTables.income.length), detail: 'income entries in the current filter' },
            { label: 'Scheduled', value: String(countScheduledRows(filteredTables.income)), detail: 'income rows on the calendar' }
          ]}
          onEdit={(row) => setEditor({ kind: 'income', row })}
          onCreate={() => setEditor({ kind: 'income', row: null })}
        />
      )}

      {section === 'ledger' && ledgerSection === 'expenses' && (
        <BudgetExpensePage
          rows={[...filteredTables.expenses, ...filteredTables.mortgageExpenses]}
          baseRows={filteredTables.expenses}
          mortgageRows={filteredTables.mortgageExpenses}
          analytics={analytics}
          onEdit={(kind, row) => setEditor({ kind, row })}
          onCreate={(kind) => setEditor({ kind, row: null })}
        />
      )}

      {section === 'calendar' && (
        <BudgetSchedulePage tables={filteredTables} />
      )}

      {section === 'groceries' && (
        <BudgetGroceriesPage
          items={report.groceryItems}
          owner={report.owner}
          onMutated={onMutated}
        />
      )}

      {section === 'ledger' && ledgerSection === 'debts' && (
        <BudgetLedgerPage
          eyebrow="Ledger debt strategy"
          title="Debts"
          copy="Track balances, repayment frequency, schedule timing, and weekly pressure exactly where Ledger expected debt rows to live."
          kind="debts"
          rows={filteredTables.debts}
          metrics={[
            { label: 'Debt balance', value: formatMoney(analytics.debtBalance), detail: 'active debt principal' },
            { label: 'Weekly repayment', value: formatMoney(analytics.weeklyDebt), detail: 'current repayment pressure' },
            { label: 'Scheduled', value: String(countScheduledRows(filteredTables.debts)), detail: 'debt rows on the calendar' }
          ]}
          onEdit={(row) => setEditor({ kind: 'debts', row })}
          onCreate={() => setEditor({ kind: 'debts', row: null })}
        />
      )}

      {section === 'ledger' && ledgerSection === 'savings' && (
        <BudgetLedgerPage
          eyebrow="Ledger savings"
          title="Savings goals"
          copy="Savings goals keep the same Ledger shape: recurring amount, optional target, and active/inactive tracking."
          kind="savings"
          rows={filteredTables.savings}
          metrics={[
            { label: 'Weekly saving', value: formatMoney(analytics.weeklySavings), detail: 'active savings commitments' },
            { label: 'Goal value', value: formatMoney(sumNumbers(filteredTables.savings, (row) => row.goal_amount || 0)), detail: 'combined target amount' },
            { label: 'Goals', value: String(filteredTables.savings.length), detail: 'savings rows in this filter' }
          ]}
          onEdit={(row) => setEditor({ kind: 'savings', row })}
          onCreate={() => setEditor({ kind: 'savings', row: null })}
        />
      )}

      {section === 'ledger' && ledgerSection === 'assets' && (
        <BudgetLedgerPage
          eyebrow="Ledger net worth"
          title="Assets"
          copy="Maintain the asset side of your Ledger model so NoA can reason about net worth alongside debts and mortgages."
          kind="assets"
          rows={filteredTables.assets}
          metrics={[
            { label: 'Asset value', value: formatMoney(totals.assetValue), detail: 'active asset rows' },
            { label: 'Net worth', value: formatMoney(totals.netWorth), detail: 'assets minus debts and mortgages' },
            { label: 'Assets', value: String(filteredTables.assets.length), detail: 'asset rows in this filter' }
          ]}
          onEdit={(row) => setEditor({ kind: 'assets', row })}
          onCreate={() => setEditor({ kind: 'assets', row: null })}
        />
      )}

      {section === 'fuel' && (
        <BudgetFuelPage
          settings={report.settings}
          expenses={filteredTables.expenses}
          onCreateExpense={() => setEditor({ kind: 'expenses', row: null })}
          onSettingsSaved={onMutated}
        />
      )}

      {section === 'settings' && (
        <BudgetSettingsPage
          report={report}
          modeFilter={modeFilter}
          setModeFilter={setModeFilter}
          showInactiveRows={showInactiveRows}
          setShowInactiveRows={setShowInactiveRows}
          refreshBudget={refreshBudget}
          isLoading={isLoading}
          onMutated={onMutated}
        />
      )}

      {editor && (
        <BudgetEditorModal
          kind={editor.kind}
          row={editor.row}
          mortgages={report.mortgageSummary.mortgages}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEditor(null);
            onMutated();
          }}
        />
      )}
    </section>
  );
}

function BudgetMetric({
  icon: Icon,
  label,
  value,
  detail,
  tone = 'blue'
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  detail: string;
  tone?: 'blue' | 'green' | 'amber';
}) {
  return (
    <article className={`budget-metric ${tone}`}>
      <div className="xero-card-icon"><Icon size={22} /></div>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

function BudgetCashflowPanel({
  analytics,
  tenantWeeklyTotal,
  ownerPropertyWeekly
}: {
  analytics: ReturnType<typeof buildBudgetPageAnalytics>;
  tenantWeeklyTotal: number;
  ownerPropertyWeekly: number;
}) {
  const rows = [
    { label: 'Income', weekly: analytics.weeklyIncome, detail: 'active income rows', tone: 'income' },
    { label: 'Core outgoings', weekly: analytics.weeklyExpenses + analytics.weeklyDebt + analytics.weeklySavings, detail: 'expenses, debts, savings', tone: 'expense' },
    { label: 'Owner property cost', weekly: ownerPropertyWeekly, detail: 'mortgage plus owner-only costs', tone: 'property' },
    { label: 'Tenant billing configured', weekly: tenantWeeklyTotal, detail: 'rent plus tenant-offset utilities', tone: 'tenant' }
  ];
  const max = Math.max(...rows.map((row) => row.weekly), 1);

  return (
    <article className="glass-card budget-panel budget-command-card">
      <div className="panel-row-head">
        <PanelTitle eyebrow="Cashflow" title="Weekly to monthly view" />
        <WalletCards size={20} />
      </div>
      <div className="budget-cashflow-list">
        {rows.map((row) => (
          <div className={`budget-cashflow-row ${row.tone}`} key={row.label}>
            <div>
              <strong>{row.label}</strong>
              <span>{formatMoney(row.weekly)} weekly - {formatMoney(row.weekly * 52 / 12)} monthly</span>
            </div>
            <i><b style={{ width: `${Math.max(5, Math.round((row.weekly / max) * 100))}%` }} /></i>
            <p>{row.detail}</p>
          </div>
        ))}
      </div>
    </article>
  );
}

function BudgetPropertyPanel({ rows }: { rows: ReturnType<typeof buildBudgetPropertyAnalytics> }) {
  return (
    <article className="glass-card budget-panel budget-command-card">
      <div className="panel-row-head">
        <PanelTitle eyebrow="Property analytics" title="Mortgage and tenant view" />
        <Building2 size={20} />
      </div>
      <div className="budget-property-list">
        {rows.length === 0 ? (
          <p className="empty-state">No property rows found yet.</p>
        ) : rows.map((row) => (
          <div className="budget-property-card" key={row.key}>
            <div className="budget-property-head">
              <div>
                <strong>{row.title}</strong>
                <p>{row.address || 'No property address'}</p>
              </div>
              <span>{formatMoney(row.tenantWeeklyTotal)} tenant billing</span>
            </div>
            <div className="budget-property-grid">
              <span>Repayment <strong>{formatMoney(row.weeklyRepayment)}</strong></span>
              <span>Owner-only <strong>{formatMoney(row.ownerWeekly)}</strong></span>
              <span>Tenant utilities <strong>{formatMoney(row.tenantOffsetWeekly)}</strong></span>
              <span>Rent configured <strong>{formatMoney(row.rentWeekly)}</strong></span>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

function BudgetAttentionPanel({ items }: { items: ReturnType<typeof buildBudgetAttentionItems> }) {
  return (
    <article className="glass-card budget-panel budget-command-card">
      <div className="panel-row-head">
        <PanelTitle eyebrow="Attention" title="What needs a look" />
        <CircleAlert size={20} />
      </div>
      <div className="budget-attention-list">
        {items.map((item) => (
          <div className={`budget-attention-item ${item.tone}`} key={item.title}>
            <span />
            <div>
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

function BudgetEmailActivityPanel({ activity }: { activity: BudgetEmailActivity[] }) {
  const recent = activity.slice(0, 8);
  return (
    <div className="budget-activity-panel">
      <div className="budget-tenant-editor-head">
        <div>
          <strong>Billing activity</strong>
          <p>Recent previews, sends, duplicate skips, and scheduled checks.</p>
        </div>
      </div>
      {recent.length === 0 ? (
        <p className="empty-state">No tenant billing activity logged yet.</p>
      ) : (
        <div className="budget-activity-list">
          {recent.map((item) => (
            <article className={`budget-activity-row ${activityTone(item.status)}`} key={item.id}>
              <span>{item.status}</span>
              <div>
                <strong>{item.tenantName || item.to || 'Scheduled billing'}</strong>
                <p>{activitySummary(item)}</p>
              </div>
              <small>{formatActivityTime(item.createdAt)}</small>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function BudgetProjectionChart({ analytics }: { analytics: ReturnType<typeof buildBudgetPageAnalytics> }) {
  const rows = [
    { label: 'Income', value: analytics.monthlyIncome, tone: 'income' },
    { label: 'Expenses', value: analytics.monthlyOutgoings, tone: 'expense' },
    { label: 'Net', value: Math.abs(analytics.monthlyNet), tone: analytics.monthlyNet >= 0 ? 'income' : 'warn' }
  ];
  const max = Math.max(...rows.map((row) => row.value), 1);

  return (
    <div className="budget-projection-chart">
      {rows.map((row) => (
        <div className={`budget-projection-row ${row.tone}`} key={row.label}>
          <div>
            <strong>{row.label}</strong>
            <span>{formatMoney(row.label === 'Net' ? analytics.monthlyNet : row.value)}</span>
          </div>
          <i><b style={{ width: `${Math.max(4, Math.round((row.value / max) * 100))}%` }} /></i>
        </div>
      ))}
    </div>
  );
}

function BudgetCategoryBars({ rows }: { rows: Array<{ label: string; amount: number; count: number }> }) {
  const max = Math.max(...rows.map((row) => row.amount), 1);
  if (rows.length === 0) return <p className="empty-state">No active expenses in this filter.</p>;

  return (
    <div className="budget-category-bars">
      {rows.slice(0, 7).map((row, index) => (
        <div className="budget-category-row" key={row.label}>
          <div className="xero-client-rank">{index + 1}</div>
          <div>
            <div className="xero-client-head">
              <strong>{row.label}</strong>
              <span>{formatMoney(row.amount)} weekly</span>
            </div>
            <div className="xero-progress-track">
              <i style={{ width: `${Math.max(5, Math.round((row.amount / max) * 100))}%` }} />
            </div>
            <p>{row.count} row(s)</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function BudgetPressureList({ analytics }: { analytics: ReturnType<typeof buildBudgetPageAnalytics> }) {
  const rows = [
    { label: 'Debt repayments', value: analytics.weeklyDebt, detail: `${formatMoney(analytics.debtBalance)} balance`, tone: analytics.weeklyDebt > 0 ? 'warn' : 'calm' },
    { label: 'Mortgage repayments', value: analytics.weeklyMortgage, detail: `${formatMoney(analytics.mortgageBalance)} mortgage balance`, tone: analytics.weeklyMortgage > 0 ? 'warn' : 'calm' },
    { label: 'Tenant offsets', value: analytics.weeklyTenantOffsets, detail: 'expenses currently offset to tenants', tone: analytics.weeklyTenantOffsets > 0 ? 'calm' : 'warn' },
    { label: 'Savings', value: analytics.weeklySavings, detail: 'weekly savings commitments', tone: analytics.weeklySavings > 0 ? 'calm' : 'warn' }
  ];

  return (
    <div className="budget-pressure-list">
      {rows.map((row) => (
        <div className={`budget-action ${row.tone}`} key={row.label}>
          <span />
          <div>
            <strong>{row.label}: {formatMoney(row.value)}</strong>
            <p>{row.detail}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function BudgetTable({
  title,
  kind,
  rows,
  onEdit,
  onCreate
}: {
  title: string;
  kind: BudgetItemKind;
  rows: BudgetRow[];
  onEdit: (row: BudgetRow) => void;
  onCreate: () => void;
}) {
  return (
    <article className="glass-card budget-panel">
      <div className="panel-row-head">
        <PanelTitle eyebrow={kindLabel(kind)} title={title} />
        <button className="secondary-action compact" onClick={onCreate}>
          <Plus size={16} />
          New
        </button>
      </div>
      <div className="budget-row-list">
        {rows.length === 0 ? (
          <p className="empty-state">No rows yet.</p>
        ) : (
          rows.map((row, index) => (
            <BudgetLedgerCard
              kind={kind}
              row={row}
              key={row.id || row.local_id || `${title}-${index}`}
              onEdit={() => onEdit(row)}
            />
          ))
        )}
      </div>
    </article>
  );
}

function BudgetLedgerCard({
  kind,
  row,
  onEdit
}: {
  kind: BudgetItemKind;
  row: BudgetRow;
  onEdit: () => void;
}) {
  const primary = budgetPrimaryAmount(kind, row);
  const weekly = budgetWeeklyImpact(kind, row);
  const monthly = weekly * 52 / 12;
  const schedule = budgetRowScheduleLabel(row);
  const chips = budgetRowChips(kind, row);
  const isInactive = row.active === false;

  return (
    <article className={`ledger-item-card ${kind} ${isInactive ? 'inactive' : ''}`}>
      <button className="ledger-card-main" onClick={onEdit}>
        <div className="ledger-card-title">
          <span>{kindLabel(kind)}</span>
          <strong>{budgetRowTitle(row)}</strong>
          <p>{budgetRowSubtitle(kind, row) || 'No extra details yet'}</p>
        </div>
        <div className="ledger-card-amount">
          <strong>{formatMoney(primary)}</strong>
          <span>{formatMoney(weekly)} / week</span>
        </div>
      </button>

      <div className="ledger-card-meta">
        <span className={`ledger-status-pill ${isInactive ? 'inactive' : 'active'}`}>{isInactive ? 'Inactive' : 'Active'}</span>
        <span className={`ledger-schedule-pill ${schedule.tone}`}>
          <Clock3 size={13} />
          {schedule.label}
        </span>
        {chips.map((chip) => (
          <span className="ledger-soft-chip" key={chip}>{chip}</span>
        ))}
      </div>

      <div className="ledger-card-footer">
        <span>Monthly equivalent <strong>{formatMoney(monthly)}</strong></span>
        {kind === 'mortgageExpenses' && row.offset_to_tenants && (
          <span>Tenant offset <strong>{formatMoney(weekly)}</strong></span>
        )}
        <button className="secondary-action compact" onClick={onEdit}>
          <Edit3 size={15} />
          Edit
        </button>
      </div>
    </article>
  );
}

function BudgetLedgerPage({
  eyebrow,
  title,
  copy,
  kind,
  rows,
  metrics,
  onEdit,
  onCreate
}: {
  eyebrow: string;
  title: string;
  copy: string;
  kind: BudgetItemKind;
  rows: BudgetRow[];
  metrics: Array<{ label: string; value: string; detail: string }>;
  onEdit: (row: BudgetRow) => void;
  onCreate: () => void;
}) {
  return (
    <section className="ledger-subpage">
      <article className="glass-card wide ledger-subpage-hero">
        <div>
          <PanelTitle eyebrow={eyebrow} title={title} />
          <p>{copy}</p>
        </div>
        <button className="primary-action" onClick={onCreate}>
          <Plus size={16} />
          New {kindLabel(kind)}
        </button>
      </article>
      <div className="ledger-metric-grid">
        {metrics.map((metric) => (
          <article className="ledger-mini-metric" key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <p>{metric.detail}</p>
          </article>
        ))}
      </div>
      <BudgetTable title={`${title} rows`} kind={kind} rows={rows} onEdit={onEdit} onCreate={onCreate} />
    </section>
  );
}

function BudgetExpensePage({
  rows,
  baseRows,
  mortgageRows,
  analytics,
  onEdit,
  onCreate
}: {
  rows: BudgetRow[];
  baseRows: BudgetRow[];
  mortgageRows: BudgetRow[];
  analytics: ReturnType<typeof buildBudgetPageAnalytics>;
  onEdit: (kind: BudgetItemKind, row: BudgetRow) => void;
  onCreate: (kind: BudgetItemKind) => void;
}) {
  return (
    <section className="ledger-subpage">
      <article className="glass-card wide ledger-subpage-hero">
        <div>
          <PanelTitle eyebrow="Ledger expenses" title="Expenses" />
          <p>Manage everyday expenses plus mortgage-linked costs while preserving Ledger categories, schedules, and tenant-offset semantics.</p>
        </div>
        <div className="ledger-hero-actions">
          <button className="primary-action" onClick={() => onCreate('expenses')}><Plus size={16} />New expense</button>
          <button className="secondary-action" onClick={() => onCreate('mortgageExpenses')}><Plus size={16} />Mortgage cost</button>
        </div>
      </article>
      <div className="ledger-metric-grid">
        <article className="ledger-mini-metric"><span>Weekly expenses</span><strong>{formatMoney(analytics.weeklyExpenses)}</strong><p>standard expense rows</p></article>
        <article className="ledger-mini-metric"><span>Mortgage expenses</span><strong>{formatMoney(analytics.weeklyMortgageExpenses)}</strong><p>linked property costs</p></article>
        <article className="ledger-mini-metric"><span>Tenant offsets</span><strong>{formatMoney(analytics.weeklyTenantOffsets)}</strong><p>split into tenant utilities</p></article>
      </div>
      <section className="budget-analytics-grid">
        <article className="glass-card budget-panel">
          <div className="panel-row-head">
            <PanelTitle eyebrow="Categories" title="Expense pressure" />
            <PieChart size={20} />
          </div>
          <BudgetCategoryBars rows={analytics.expenseCategories} />
        </article>
        <article className="glass-card budget-panel">
          <div className="panel-row-head">
            <PanelTitle eyebrow="Schedule" title="Upcoming outgoings" />
            <CalendarDays size={20} />
          </div>
          <BudgetUpcomingSchedule rows={budgetScheduledItems({ ...emptyBudgetTables(), expenses: baseRows, mortgageExpenses: mortgageRows }).filter((item) => item.kind !== 'income').slice(0, 6)} />
        </article>
      </section>
      <section className="budget-table-grid">
        <BudgetTable title="Expense rows" kind="expenses" rows={baseRows} onEdit={(row) => onEdit('expenses', row)} onCreate={() => onCreate('expenses')} />
        <BudgetTable title="Mortgage expense rows" kind="mortgageExpenses" rows={mortgageRows} onEdit={(row) => onEdit('mortgageExpenses', row)} onCreate={() => onCreate('mortgageExpenses')} />
      </section>
    </section>
  );
}

function BudgetSchedulePage({ tables }: { tables: BudgetTables }) {
  const scheduled = budgetScheduledItems(tables);
  const upcoming = buildBudgetUpcomingSchedule(scheduled, 60);
  const transfer = buildBudgetTransferSuggestion(scheduled);
  const monthDays = buildBudgetScheduleMonth(scheduled);

  return (
    <section className="ledger-subpage">
      <article className="glass-card wide ledger-subpage-hero ledger-calendar-hero">
        <div>
          <PanelTitle eyebrow="Ledger calendar" title="Scheduled payments" />
          <p>Ledger's calendar logic is now inside NoA: scheduled income, expenses, debts, mortgages, and mortgage costs all roll into one planning view.</p>
        </div>
        <div className="ledger-transfer-card">
          <span>Smart bills transfer</span>
          <strong>{formatMoney(transfer.weeklyAmount)}</strong>
          <p>{transfer.message}</p>
        </div>
      </article>

      <section className="ledger-calendar-layout">
        <article className="glass-card budget-panel ledger-calendar-panel">
          <div className="panel-row-head">
            <PanelTitle eyebrow="This month" title={new Date().toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })} />
            <CalendarDays size={20} />
          </div>
          <BudgetScheduleCalendar days={monthDays} />
        </article>

        <article className="glass-card budget-panel">
          <div className="panel-row-head">
            <PanelTitle eyebrow="Next 60 days" title="Upcoming schedule" />
            <Clock3 size={20} />
          </div>
          <BudgetUpcomingSchedule rows={upcoming} />
        </article>
      </section>

      <section className="budget-analytics-grid">
        <article className="glass-card budget-panel">
          <div className="panel-row-head">
            <PanelTitle eyebrow="Coverage" title="Scheduled rows" />
            <Database size={20} />
          </div>
          <div className="ledger-schedule-groups">
            {budgetScheduleCoverage(tables).map((item) => (
              <div className="budget-action" key={item.label}>
                <span />
                <div>
                  <strong>{item.label}: {item.scheduled}/{item.total}</strong>
                  <p>{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </article>
        <article className="glass-card budget-panel">
          <div className="panel-row-head">
            <PanelTitle eyebrow="Calendar intelligence" title="Money movement" />
            <Sparkles size={20} />
          </div>
          <div className="ledger-calendar-insights">
            <div><span>Scheduled rows</span><strong>{scheduled.length}</strong><p>active Ledger rows with calendar timing</p></div>
            <div><span>Upcoming events</span><strong>{upcoming.length}</strong><p>payments found in the next 60 days</p></div>
            <div><span>Weekly transfer</span><strong>{formatMoney(transfer.weeklyAmount)}</strong><p>outgoing schedule pressure</p></div>
          </div>
        </article>
      </section>
    </section>
  );
}

function BudgetScheduleCalendar({ days }: { days: BudgetCalendarDay[] }) {
  return (
    <div className="ledger-calendar-month">
      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <span className="ledger-calendar-weekday" key={day}>{day}</span>)}
      {days.map((day) => (
        <article className={`ledger-calendar-day ${day.isToday ? 'today' : ''} ${day.isMuted ? 'muted' : ''}`} key={day.date}>
          <div>
            <strong>{day.dayNumber}</strong>
            {day.events.length > 0 && <span>{day.events.length}</span>}
          </div>
          {(day.income > 0 || day.outgoing > 0) && (
            <div className="ledger-calendar-money">
              {day.income > 0 && <i className="income" style={{ width: `${Math.max(18, Math.min(100, day.incomePercent))}%` }} />}
              {day.outgoing > 0 && <i className="outgoing" style={{ width: `${Math.max(18, Math.min(100, day.outgoingPercent))}%` }} />}
            </div>
          )}
          {day.events.slice(0, 2).map((event) => (
            <small className={event.kind} key={`${event.id}-${event.title}`}>{event.title}</small>
          ))}
        </article>
      ))}
    </div>
  );
}

function BudgetUpcomingSchedule({ rows }: { rows: BudgetScheduleOccurrence[] }) {
  if (rows.length === 0) return <p className="empty-state">No scheduled rows found. Add schedules to income, expenses, debts, or mortgage rows.</p>;
  return (
    <div className="ledger-schedule-list">
      {rows.map((item) => (
        <article className={`ledger-schedule-row ${item.kind}`} key={`${item.id}-${item.date}`}>
          <span>{formatShortDate(item.date)}</span>
          <div>
            <strong>{item.title}</strong>
            <p>{item.kindLabel} · {item.frequency || 'no frequency'}</p>
          </div>
          <strong>{item.kind === 'income' ? '+' : '-'}{formatMoney(item.amount)}</strong>
        </article>
      ))}
    </div>
  );
}

function BudgetFuelPage({
  settings,
  expenses,
  onCreateExpense,
  onSettingsSaved
}: {
  settings: Record<string, unknown> | null;
  expenses: BudgetRow[];
  onCreateExpense: () => void;
  onSettingsSaved: () => void;
}) {
  const rawFuel = (settings?.raw_data as Record<string, unknown> | undefined)?.fuelCalculator as Record<string, unknown> | undefined;
  const [efficiency, setEfficiency] = useState(String(rawFuel?.efficiency || '6.3'));
  const [dailyKm, setDailyKm] = useState(String(rawFuel?.dailyKm || '40'));
  const [tankSize, setTankSize] = useState(String(rawFuel?.tankSize || '60'));
  const [fuelPrice, setFuelPrice] = useState(String(rawFuel?.fuelPrice || ''));
  const [includeInBudget, setIncludeInBudget] = useState(rawFuel?.includeInBudget !== false);
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const litresPer100 = Number(efficiency) || 0;
  const kmPerDay = Number(dailyKm) || 0;
  const price = Number(fuelPrice) || 0;
  const weeklyLitres = litresPer100 > 0 ? (kmPerDay * 7 * litresPer100) / 100 : 0;
  const weeklyCost = weeklyLitres * price;
  const monthlyCost = weeklyCost * 52 / 12;
  const tank = Number(tankSize) || 0;
  const tankRange = litresPer100 > 0 && tank > 0 ? tank / litresPer100 * 100 : 0;
  const tankDays = kmPerDay > 0 && tankRange > 0 ? tankRange / kmPerDay : 0;
  const weeklyTankPercent = tank > 0 ? Math.min(100, weeklyLitres / tank * 100) : 0;
  const matchingFuelExpense = expenses.find((row) => /fuel|petrol|diesel/i.test(`${row.name || ''} ${row.category || ''}`));

  const saveFuelSettings = async () => {
    if (!window.noa?.saveBudgetSettings) {
      setMessage('Budget settings are only available through the Vercel/desktop API.');
      return;
    }
    setIsSaving(true);
    setMessage('');
    const response = await window.noa.saveBudgetSettings({
      fuelCalculator: { efficiency, dailyKm, tankSize, fuelPrice, includeInBudget }
    });
    setIsSaving(false);
    setMessage(response.message || (response.ok ? 'Fuel settings saved.' : 'Could not save fuel settings.'));
    if (response.ok) onSettingsSaved();
  };

  return (
    <section className="ledger-subpage">
      <article className="glass-card wide ledger-subpage-hero">
        <div>
          <PanelTitle eyebrow="Ledger fuel calculator" title="Fuel" />
          <p>Estimate fuel from efficiency, daily kilometres, and price. Create or edit a Fuel expense row to make it part of the live budget.</p>
        </div>
        <button className="primary-action" onClick={onCreateExpense}>
          <Plus size={16} />
          Add fuel expense
        </button>
      </article>
      <section className="ledger-fuel-grid">
        <article className="glass-card budget-panel ledger-fuel-visual-card">
          <div className="panel-row-head">
            <PanelTitle eyebrow="Fuel tank" title="Weekly burn" />
            <Activity size={20} />
          </div>
          <div className="ledger-fuel-gauge" aria-label="Fuel usage gauge">
            <div className="ledger-fuel-tank">
              <i style={{ height: `${Math.max(6, weeklyTankPercent)}%` }} />
            </div>
            <div>
              <span>Uses about</span>
              <strong>{weeklyLitres.toFixed(1)}L</strong>
              <p>{tank > 0 ? `${Math.round(weeklyTankPercent)}% of a ${tank.toFixed(0)}L tank per week` : 'Add tank size to estimate weekly tank usage.'}</p>
            </div>
          </div>
          <div className="ledger-fuel-stats">
            <span>Tank range <strong>{tankRange ? `${Math.round(tankRange)}km` : 'Add efficiency'}</strong></span>
            <span>Days per tank <strong>{tankDays ? tankDays.toFixed(1) : 'Add daily km'}</strong></span>
            <span>Monthly litres <strong>{(weeklyLitres * 52 / 12).toFixed(1)}L</strong></span>
          </div>
        </article>

        <article className="glass-card budget-panel">
          <div className="panel-row-head">
            <PanelTitle eyebrow="Calculator" title="Fuel assumptions" />
            <Activity size={20} />
          </div>
          <div className="notion-form-grid">
            <label><span>L/100km</span><input type="number" value={efficiency} onChange={(event) => setEfficiency(event.currentTarget.value)} /></label>
            <label><span>Daily km</span><input type="number" value={dailyKm} onChange={(event) => setDailyKm(event.currentTarget.value)} /></label>
            <label><span>Tank size</span><input type="number" value={tankSize} onChange={(event) => setTankSize(event.currentTarget.value)} /></label>
            <label><span>Fuel price</span><input type="number" value={fuelPrice} onChange={(event) => setFuelPrice(event.currentTarget.value)} /></label>
          </div>
          <label className="toggle-row">
            <input type="checkbox" checked={includeInBudget} onChange={(event) => setIncludeInBudget(event.currentTarget.checked)} />
            Keep this calculator available for budget planning
          </label>
          <div className="budget-settings-actions">
            <button className="secondary-action" onClick={() => void saveFuelSettings()} disabled={isSaving}>
              <Save size={16} />
              {isSaving ? 'Saving...' : 'Save assumptions'}
            </button>
          </div>
          {message && <p className="form-message">{message}</p>}
        </article>
        <article className="glass-card budget-panel">
          <div className="panel-row-head">
            <PanelTitle eyebrow="Budget result" title="Fuel estimate" />
            <WalletCards size={20} />
          </div>
          <div className="ledger-metric-grid compact">
            <article className="ledger-mini-metric"><span>Weekly</span><strong>{weeklyCost ? formatMoney(weeklyCost) : 'Add price'}</strong><p>{weeklyLitres.toFixed(1)}L estimated</p></article>
            <article className="ledger-mini-metric"><span>Monthly</span><strong>{weeklyCost ? formatMoney(monthlyCost) : 'Not budgeting'}</strong><p>{tankSize ? `${Math.max(0, Number(tankSize)).toFixed(0)}L tank reference` : 'No tank size'}</p></article>
          </div>
          <div className="budget-action info">
            <span />
            <div>
              <strong>{matchingFuelExpense ? `Linked-looking expense: ${budgetRowTitle(matchingFuelExpense)}` : 'No obvious Fuel expense row found'}</strong>
              <p>{matchingFuelExpense ? `${formatMoney(budgetWeeklyValue(matchingFuelExpense, 'amount'))} weekly from Ledger data.` : 'Use Add fuel expense to create a row, then enter the calculated weekly or monthly amount.'}</p>
            </div>
          </div>
        </article>
      </section>
    </section>
  );
}

function BudgetGroceriesPage({
  items,
  owner,
  onMutated
}: {
  items: GroceryItem[];
  owner: BudgetOwner;
  onMutated: () => void;
}) {
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [category, setCategory] = useState('General');
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState('');
  const activeItems = items.filter((item) => !item.completed);
  const completedItems = items.filter((item) => item.completed);
  const categories = ['General', 'Fresh food', 'Pantry', 'Household', 'Personal', 'Other'];

  const addItem = async () => {
    const cleanedName = itemName.trim();
    if (!cleanedName) {
      setMessage('Add an item name first.');
      return;
    }
    if (!window.noa?.manageGroceryItem) {
      setMessage('Grocery list needs the Vercel/desktop API.');
      return;
    }
    setIsSaving(true);
    setMessage('');
    const response = await window.noa.manageGroceryItem({
      action: 'create',
      values: {
        item: cleanedName,
        quantity: quantity.trim(),
        category,
        addedBy: owner.displayName || owner.email
      }
    });
    setIsSaving(false);
    setMessage(response.message || (response.ok ? 'Grocery item added.' : 'Could not add grocery item.'));
    if (response.ok) {
      setItemName('');
      setQuantity('');
      setCategory('General');
      onMutated();
    }
  };

  const updateItem = async (id: string, values: Record<string, unknown>) => {
    if (!window.noa?.manageGroceryItem) {
      setMessage('Grocery list needs the Vercel/desktop API.');
      return;
    }
    setUpdatingId(id);
    setMessage('');
    const response = await window.noa.manageGroceryItem({ action: 'update', id, values });
    setUpdatingId('');
    setMessage(response.message || (response.ok ? 'Grocery list updated.' : 'Could not update grocery item.'));
    if (response.ok) onMutated();
  };

  const deleteItem = async (id: string) => {
    if (!window.noa?.manageGroceryItem) {
      setMessage('Grocery list needs the Vercel/desktop API.');
      return;
    }
    setUpdatingId(id);
    setMessage('');
    const response = await window.noa.manageGroceryItem({ action: 'delete', id });
    setUpdatingId('');
    setMessage(response.message || (response.ok ? 'Grocery item removed.' : 'Could not remove grocery item.'));
    if (response.ok) onMutated();
  };

  return (
    <section className="ledger-subpage grocery-subpage">
      <article className="glass-card wide ledger-subpage-hero grocery-hero">
        <div>
          <PanelTitle eyebrow="Shared household list" title="Groceries List" />
          <p>Add, complete, and remove house grocery items. This is stored separately from the ledger so it can later power a simple home-screen grocery page.</p>
        </div>
        <div className="grocery-summary-pill">
          <ListTodo size={18} />
          <span>{activeItems.length} active</span>
        </div>
      </article>

      <article className="glass-card wide grocery-entry-card">
        <div className="grocery-entry-grid">
          <label>
            <span>Item</span>
            <input
              value={itemName}
              onChange={(event) => setItemName(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void addItem();
              }}
              placeholder="Milk, bread, washing powder..."
            />
          </label>
          <label>
            <span>Quantity</span>
            <input
              value={quantity}
              onChange={(event) => setQuantity(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void addItem();
              }}
              placeholder="1x, 2L, large..."
            />
          </label>
          <label>
            <span>Category</span>
            <select value={category} onChange={(event) => setCategory(event.currentTarget.value)}>
              {categories.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <button className="primary-action" onClick={() => void addItem()} disabled={isSaving}>
            <Plus size={16} />
            {isSaving ? 'Adding...' : 'Add item'}
          </button>
        </div>
        {message && <p className="form-message">{message}</p>}
      </article>

      <section className="grocery-layout">
        <article className="glass-card budget-panel">
          <div className="panel-row-head">
            <PanelTitle eyebrow="To buy" title="Active items" />
            <span>{activeItems.length} item(s)</span>
          </div>
          <div className="grocery-list">
            {activeItems.length === 0 ? (
              <div className="empty-state">The house grocery list is clear.</div>
            ) : activeItems.map((item) => (
              <GroceryItemRow
                key={item.id}
                item={item}
                isUpdating={updatingId === item.id}
                onToggle={(completed) => void updateItem(item.id, { completed })}
                onDelete={() => void deleteItem(item.id)}
              />
            ))}
          </div>
        </article>

        <article className="glass-card budget-panel">
          <div className="panel-row-head">
            <PanelTitle eyebrow="Recently done" title="Completed" />
            <span>{completedItems.length} item(s)</span>
          </div>
          <div className="grocery-list compact">
            {completedItems.length === 0 ? (
              <div className="empty-state">Completed items will appear here.</div>
            ) : completedItems.slice(0, 12).map((item) => (
              <GroceryItemRow
                key={item.id}
                item={item}
                isUpdating={updatingId === item.id}
                onToggle={(completed) => void updateItem(item.id, { completed })}
                onDelete={() => void deleteItem(item.id)}
              />
            ))}
          </div>
        </article>
      </section>
    </section>
  );
}

function GroceryItemRow({
  item,
  isUpdating,
  onToggle,
  onDelete
}: {
  item: GroceryItem;
  isUpdating: boolean;
  onToggle: (completed: boolean) => void;
  onDelete: () => void;
}) {
  return (
    <article className={`grocery-item ${item.completed ? 'completed' : ''}`}>
      <button
        className="grocery-check"
        onClick={() => onToggle(!item.completed)}
        disabled={isUpdating}
        aria-label={item.completed ? `Restore ${item.item}` : `Mark ${item.item} complete`}
      >
        {item.completed ? <CheckCircle2 size={18} /> : <span />}
      </button>
      <div>
        <strong>{item.item}</strong>
        <p>{[item.quantity, item.category, item.addedBy ? `Added by ${item.addedBy}` : ''].filter(Boolean).join(' - ')}</p>
      </div>
      <button className="icon-action danger" onClick={onDelete} disabled={isUpdating} aria-label={`Remove ${item.item}`}>
        <Trash2 size={16} />
      </button>
    </article>
  );
}

function BudgetSettingsPage({
  report,
  modeFilter,
  setModeFilter,
  showInactiveRows,
  setShowInactiveRows,
  refreshBudget,
  isLoading,
  onMutated
}: {
  report: BudgetReport;
  modeFilter: BudgetModeFilter;
  setModeFilter: (mode: BudgetModeFilter) => void;
  showInactiveRows: boolean;
  setShowInactiveRows: (show: boolean) => void;
  refreshBudget: () => Promise<BudgetReport>;
  isLoading: boolean;
  onMutated: () => void;
}) {
  const settings = report.settings || {};
  const rawData = (settings.raw_data as Record<string, unknown> | undefined) || {};
  const storedCategories = Array.isArray(rawData.categories) ? rawData.categories.map(String) : Array.isArray(settings.categories) ? settings.categories.map(String) : budgetDefaultCategories;
  const storedColors = Array.isArray(rawData.catColors) ? rawData.catColors.map(String) : budgetDefaultCategoryColors;
  const [defaultMode, setDefaultMode] = useState(String(settings.default_mode || rawData.defaultMode || 'personal'));
  const [categories, setCategories] = useState<string[]>(storedCategories.length ? storedCategories : budgetDefaultCategories);
  const [catColors, setCatColors] = useState<string[]>(storedColors.length ? storedColors : budgetDefaultCategoryColors);
  const [message, setMessage] = useState('');
  const [profileMessage, setProfileMessage] = useState('');
  const [displayNameDraft, setDisplayNameDraft] = useState(report.owner.displayName || '');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    const nextRaw = (report.settings?.raw_data as Record<string, unknown> | undefined) || {};
    const nextCategories = Array.isArray(nextRaw.categories) ? nextRaw.categories.map(String) : budgetDefaultCategories;
    const nextColors = Array.isArray(nextRaw.catColors) ? nextRaw.catColors.map(String) : budgetDefaultCategoryColors;
    setDefaultMode(String(report.settings?.default_mode || nextRaw.defaultMode || 'personal'));
    setCategories(nextCategories.length ? nextCategories : budgetDefaultCategories);
    setCatColors(nextColors.length ? nextColors : budgetDefaultCategoryColors);
  }, [report.settings]);

  useEffect(() => {
    setDisplayNameDraft(report.owner.displayName || '');
  }, [report.owner.displayName]);

  const updateCategory = (index: number, value: string) => {
    setCategories((current) => current.map((category, categoryIndex) => categoryIndex === index ? value : category));
  };

  const updateCategoryColor = (index: number, value: string) => {
    setCatColors((current) => {
      const next = [...current];
      next[index] = value;
      return next;
    });
  };

  const addCategory = () => {
    setCategories((current) => [...current, 'New category']);
    setCatColors((current) => [...current, budgetDefaultCategoryColors[current.length % budgetDefaultCategoryColors.length]]);
  };

  const removeCategory = (index: number) => {
    setCategories((current) => current.filter((_, categoryIndex) => categoryIndex !== index));
    setCatColors((current) => current.filter((_, categoryIndex) => categoryIndex !== index));
  };

  const resetCategories = () => {
    setCategories(budgetDefaultCategories);
    setCatColors(budgetDefaultCategoryColors);
  };

  const saveSettings = async () => {
    if (!window.noa?.saveBudgetSettings) {
      setMessage('Budget settings are only available through the Vercel/desktop API.');
      return;
    }
    setIsSavingSettings(true);
    setMessage('');
    const cleanedCategories = categories.map((category) => category.trim()).filter(Boolean);
    const response = await window.noa.saveBudgetSettings({
      defaultMode,
      categories: cleanedCategories,
      catColors: cleanedCategories.map((_, index) => catColors[index] || budgetDefaultCategoryColors[index % budgetDefaultCategoryColors.length])
    });
    setIsSavingSettings(false);
    setMessage(response.message || (response.ok ? 'Budget settings saved.' : 'Could not save budget settings.'));
    if (response.ok) {
      setModeFilter(defaultMode === 'business' ? 'business' : 'personal');
      await refreshBudget();
    }
  };

  const saveProfile = async () => {
    if (!window.noa?.saveBudgetProfile) {
      setProfileMessage('Profile settings are only available through the Vercel/desktop API.');
      return;
    }
    setIsSavingProfile(true);
    setProfileMessage('');
    const response = await window.noa.saveBudgetProfile({ displayName: displayNameDraft.trim() });
    setIsSavingProfile(false);
    setProfileMessage(response.message || (response.ok ? 'Profile saved.' : 'Could not save profile.'));
    if (response.ok) onMutated();
  };

  return (
    <section className="ledger-subpage">
      <article className="glass-card wide ledger-subpage-hero">
        <div>
          <PanelTitle eyebrow="Ledger settings" title="Budget settings" />
          <p>Configure the Ledger defaults NoA reads from Optra Studio, including default mode, category labels, and category colours.</p>
        </div>
        <button className="secondary-action" onClick={() => void refreshBudget()} disabled={isLoading}>
          <RefreshCw size={16} />
          {isLoading ? 'Syncing...' : 'Sync budget'}
        </button>
      </article>
      <section className="budget-analytics-grid">
        <article className="glass-card budget-panel">
          <div className="panel-row-head">
            <PanelTitle eyebrow="View controls" title="Current filter" />
            <ServerCog size={20} />
          </div>
          <div className="budget-filter-controls vertical">
            <div className="segmented-control">
              {(['all', 'personal', 'business'] as BudgetModeFilter[]).map((mode) => (
                <button key={mode} className={modeFilter === mode ? 'active' : ''} onClick={() => setModeFilter(mode)}>
                  {mode === 'all' ? 'All' : mode[0].toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
            <label className="toggle-row">
              <input type="checkbox" checked={showInactiveRows} onChange={(event) => setShowInactiveRows(event.currentTarget.checked)} />
              Show inactive rows
            </label>
          </div>
        </article>
        <article className="glass-card budget-panel">
          <div className="panel-row-head">
            <PanelTitle eyebrow="Ledger setup" title="Default behaviour" />
            <Database size={20} />
          </div>
          <div className="ledger-settings-list">
            <div><span>Owner</span><strong>{report.owner.email}</strong></div>
            <div>
              <span>Default mode</span>
              <div className="segmented-control compact">
                {(['personal', 'business'] as const).map((mode) => (
                  <button key={mode} className={defaultMode === mode ? 'active' : ''} onClick={() => setDefaultMode(mode)}>
                    {mode[0].toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div><span>Categories</span><strong>{categories.filter(Boolean).length}</strong></div>
            <div><span>Last synced</span><strong>{report.fetchedAt ? new Date(report.fetchedAt).toLocaleString() : 'Not synced'}</strong></div>
          </div>
        </article>
        <article className="glass-card budget-panel">
          <div className="panel-row-head">
            <PanelTitle eyebrow="Account" title="Your profile" />
            <UsersRound size={20} />
          </div>
          <div className="profile-settings-form">
            <label>
              <span>Display name</span>
              <input
                value={displayNameDraft}
                onChange={(event) => setDisplayNameDraft(event.currentTarget.value)}
                placeholder="Your name"
              />
            </label>
            <p>NoA uses this name when adding groceries and presenting account-owned Budget data.</p>
            <button className="secondary-action" onClick={() => void saveProfile()} disabled={isSavingProfile}>
              <Save size={16} />
              {isSavingProfile ? 'Saving...' : 'Save profile'}
            </button>
            {profileMessage && <p className="form-message">{profileMessage}</p>}
          </div>
        </article>
        <article className="glass-card budget-panel wide">
          <div className="panel-row-head">
            <PanelTitle eyebrow="Category system" title="Budget categories" />
            <Database size={20} />
          </div>
          <div className="budget-category-editor">
            {categories.map((category, index) => (
              <div className="budget-category-edit-row" key={`${category}-${index}`}>
                <input
                  aria-label={`Colour for ${category || `category ${index + 1}`}`}
                  className="budget-color-input"
                  type="color"
                  value={catColors[index] || budgetDefaultCategoryColors[index % budgetDefaultCategoryColors.length]}
                  onChange={(event) => updateCategoryColor(index, event.currentTarget.value)}
                />
                <input
                  aria-label={`Category ${index + 1}`}
                  value={category}
                  onChange={(event) => updateCategory(index, event.currentTarget.value)}
                />
                <button className="icon-action danger" aria-label={`Remove ${category || `category ${index + 1}`}`} onClick={() => removeCategory(index)} disabled={categories.length <= 1}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
          <div className="budget-settings-actions">
            <button className="secondary-action" onClick={addCategory}>
              <Plus size={16} />
              Add category
            </button>
            <button className="secondary-action" onClick={resetCategories}>
              <RefreshCw size={16} />
              Reset defaults
            </button>
            <button className="primary-action" onClick={() => void saveSettings()} disabled={isSavingSettings}>
              <Save size={16} />
              {isSavingSettings ? 'Saving...' : 'Save settings'}
            </button>
          </div>
          {message && <p className="form-message">{message}</p>}
        </article>
      </section>
    </section>
  );
}

function BudgetEditorModal({
  kind,
  row,
  mortgages,
  onClose,
  onSaved
}: {
  kind: BudgetItemKind;
  row: BudgetRow | null;
  mortgages: BudgetMortgageBill[];
  onClose: () => void;
  onSaved: () => void;
}) {
  useModalEscape(onClose);
  const [draft, setDraft] = useState<Record<string, string | boolean>>(() => budgetDraftFromRow(kind, row));
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const isEditing = Boolean(row?.id);
  const form = budgetFormForKind(kind);
  const scheduleSummary = budgetScheduleSummary(draft);
  const primaryValue = budgetDraftPrimaryValue(kind, draft);
  const monthlyEquivalent = budgetWeeklyDraftValue(kind, draft) * 52 / 12;
  const modalTitle = `${isEditing ? 'Edit' : 'Create'} ${kindLabel(kind).toLowerCase()}`;

  const updateDraft = (key: string, value: string | boolean) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const updateScheduleType = (value: string) => {
    setDraft((current) => {
      const next: Record<string, string | boolean> = { ...current, schedule_type: value };
      if (!value) {
        next.schedule_day = '';
        next.schedule_date = '';
        next.schedule_exact_date = '';
      } else if ((value === 'weekly' || value === 'fortnightly') && !next.schedule_day) {
        next.schedule_day = String(new Date().getDay());
      } else if (value === 'monthly' && !next.schedule_date) {
        next.schedule_date = '1';
      } else if (value === 'exact_date' && !next.schedule_exact_date) {
        next.schedule_exact_date = toLocalDateKey(new Date());
      }
      return next;
    });
  };

  const save = async () => {
    if (!window.noa?.manageBudgetItem) {
      setMessage('Budget editing is only available through the Vercel/desktop API.');
      return;
    }
    setIsSaving(true);
    setMessage('');
    const response = await window.noa.manageBudgetItem({
      kind,
      action: isEditing ? 'update' : 'create',
      id: row?.id,
      values: draft
    });
    setIsSaving(false);
    if (!response.ok) {
      setMessage(response.message || 'Could not save budget item.');
      return;
    }
    onSaved();
  };

  const deleteItem = async () => {
    if (!row?.id || !window.noa?.manageBudgetItem) return;
    setIsSaving(true);
    const response = await window.noa.manageBudgetItem({ kind, action: 'delete', id: row.id });
    setIsSaving(false);
    if (!response.ok) {
      setMessage(response.message || 'Could not delete budget item.');
      return;
    }
    onSaved();
  };

  return (
    <ModalPortal>
    <div className="modal-shell" role="dialog" aria-modal="true" aria-label={modalTitle}>
      <button className="modal-backdrop" aria-label="Close budget editor" onClick={onClose} />
      <article className="notion-modal budget-modal">
        <div className="modal-head">
          <div>
            <p className="eyebrow">{kindLabel(kind)}</p>
            <h3>{modalTitle}</h3>
          </div>
          <button type="button" className="icon-close" onClick={onClose} aria-label="Close budget editor"><X size={18} /></button>
        </div>

        <section className="budget-editor-summary">
          <div>
            <span>{form.summaryLabel}</span>
            <strong>{primaryValue ? formatMoney(primaryValue) : 'No amount yet'}</strong>
            <p>{primaryValue ? `${formatMoney(monthlyEquivalent)} monthly equivalent` : form.summaryHint}</p>
          </div>
          <label className="budget-editor-active">
            <input
              type="checkbox"
              checked={draft.active !== false}
              onChange={(event) => updateDraft('active', event.currentTarget.checked)}
            />
            <span>{draft.active !== false ? 'Active' : 'Inactive'}</span>
          </label>
        </section>

        <section className="budget-editor-section">
          <div className="budget-editor-section-head">
            <strong>Details</strong>
            <p>{form.detailHint}</p>
          </div>
          <div className="notion-form-grid">
            {form.detailFields.map((field) => (
              <BudgetEditorFieldControl key={field.key} field={field} draft={draft} mortgages={mortgages} updateDraft={updateDraft} />
            ))}
          </div>
        </section>

        {form.moneyFields.length > 0 && (
          <section className="budget-editor-section">
            <div className="budget-editor-section-head">
              <strong>Money</strong>
              <p>{form.moneyHint}</p>
            </div>
            <div className="notion-form-grid">
              {form.moneyFields.map((field) => (
                <BudgetEditorFieldControl key={field.key} field={field} draft={draft} mortgages={mortgages} updateDraft={updateDraft} />
              ))}
            </div>
          </section>
        )}

        {form.showSchedule && (
          <section className="budget-editor-section">
            <div className="budget-editor-section-head">
              <strong>Payment schedule</strong>
              <p>{scheduleSummary}</p>
            </div>
            <BudgetScheduleControl draft={draft} updateDraft={updateDraft} updateScheduleType={updateScheduleType} />
          </section>
        )}

        {form.noteFields.length > 0 && (
          <section className="budget-editor-section">
            <div className="budget-editor-section-head">
              <strong>Notes</strong>
              <p>Keep any context Noah should preserve with this Ledger item.</p>
            </div>
            <div className="notion-form-grid">
              {form.noteFields.map((field) => (
                <BudgetEditorFieldControl key={field.key} field={field} draft={draft} mortgages={mortgages} updateDraft={updateDraft} />
              ))}
            </div>
          </section>
        )}

        {message && <p className="form-message error">{message}</p>}
        <div className="modal-actions">
          {isEditing && (
            <button className="secondary-action danger-action" onClick={() => void deleteItem()} disabled={isSaving}>
              <Trash2 size={16} />
              Delete
            </button>
          )}
          <button className="secondary-action" onClick={onClose} disabled={isSaving}>Cancel</button>
          <button className="primary-action" onClick={() => void save()} disabled={isSaving}>
            <Save size={16} />
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </article>
    </div>
    </ModalPortal>
  );
}

function BudgetEditorFieldControl({
  field,
  draft,
  mortgages,
  updateDraft
}: {
  field: BudgetEditorField;
  draft: Record<string, string | boolean>;
  mortgages: BudgetMortgageBill[];
  updateDraft: (key: string, value: string | boolean) => void;
}) {
  const value = draft[field.key];
  const labelClass = `${field.type === 'textarea' || field.wide ? 'span-2 ' : ''}${field.type === 'checkbox' ? 'budget-check-field' : ''}`.trim();

  if (field.type === 'checkbox') {
    return (
      <label className={labelClass}>
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => updateDraft(field.key, event.currentTarget.checked)}
        />
        <span>{field.label}</span>
        {field.help && <small>{field.help}</small>}
      </label>
    );
  }

  if (field.type === 'mortgage') {
    return (
      <label className={labelClass}>
        <span>{field.label}</span>
        <select value={String(value || '')} onChange={(event) => updateDraft(field.key, event.currentTarget.value)}>
          <option value="">No property linked</option>
          {mortgages.map((mortgage) => (
            <option value={mortgage.localId || mortgage.id || mortgage.name} key={mortgage.id || mortgage.localId || mortgage.name}>
              {mortgage.name}
            </option>
          ))}
        </select>
        {field.help && <small>{field.help}</small>}
      </label>
    );
  }

  return (
    <label className={labelClass}>
      <span>{field.label}</span>
      {field.type === 'select' ? (
        <select value={String(value || '')} onChange={(event) => updateDraft(field.key, event.currentTarget.value)}>
          <option value="">Select...</option>
          {(field.options || []).map((option) => (
            <option value={option} key={option}>{formatBudgetOption(option)}</option>
          ))}
        </select>
      ) : field.type === 'textarea' ? (
        <textarea
          value={String(value || '')}
          onChange={(event) => updateDraft(field.key, event.currentTarget.value)}
          placeholder={field.placeholder}
          rows={4}
        />
      ) : (
        <input
          type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
          value={String(value || '')}
          onChange={(event) => updateDraft(field.key, event.currentTarget.value)}
          placeholder={field.placeholder}
        />
      )}
      {field.help && <small>{field.help}</small>}
    </label>
  );
}

function BudgetScheduleControl({
  draft,
  updateDraft,
  updateScheduleType
}: {
  draft: Record<string, string | boolean>;
  updateDraft: (key: string, value: string | boolean) => void;
  updateScheduleType: (value: string) => void;
}) {
  const type = String(draft.schedule_type || '');
  return (
    <div className="budget-schedule-control">
      <div className="budget-schedule-options" aria-label="Payment schedule options">
        {[
          { value: '', label: 'No schedule' },
          { value: 'weekly', label: 'Weekly' },
          { value: 'fortnightly', label: 'Fortnightly' },
          { value: 'monthly', label: 'Monthly' },
          { value: 'exact_date', label: 'One-off date' }
        ].map((option) => (
          <button type="button" key={option.value || 'none'} className={type === option.value ? 'active' : ''} onClick={() => updateScheduleType(option.value)}>
            {option.label}
          </button>
        ))}
      </div>

      {(type === 'weekly' || type === 'fortnightly') && (
        <div className="budget-schedule-detail">
          <span>Payment day</span>
          <div className="budget-weekday-grid">
            {[0, 1, 2, 3, 4, 5, 6].map((day) => (
              <button type="button" key={day} className={String(draft.schedule_day || '') === String(day) ? 'active' : ''} onClick={() => updateDraft('schedule_day', String(day))}>
                {dayName(day).slice(0, 3)}
              </button>
            ))}
          </div>
        </div>
      )}

      {type === 'monthly' && (
        <label className="budget-schedule-detail">
          <span>Day of month</span>
          <input type="number" min="1" max="31" value={String(draft.schedule_date || '')} onChange={(event) => updateDraft('schedule_date', event.currentTarget.value)} />
        </label>
      )}

      {type === 'exact_date' && (
        <label className="budget-schedule-detail">
          <span>Payment date</span>
          <input type="date" value={String(draft.schedule_exact_date || '')} onChange={(event) => updateDraft('schedule_exact_date', event.currentTarget.value)} />
        </label>
      )}
    </div>
  );
}

function XeroView({
  report,
  notionReport,
  isLoading,
  isLoadingNotion,
  refreshXero,
  refreshNotion,
  section,
  setSection
}: {
  report: XeroReport;
  notionReport: NotionJobsReport;
  isLoading: boolean;
  isLoadingNotion: boolean;
  refreshXero: () => Promise<XeroReport>;
  refreshNotion: () => Promise<NotionJobsReport>;
  section: XeroSection;
  setSection: (section: XeroSection) => void;
}) {
  const customerInvoices = report.customerInvoices.length > 0
    ? report.customerInvoices
    : report.invoices.filter((invoice) => invoice.direction !== 'expense' && invoice.type !== 'ACCPAY');
  const supplierBills = report.supplierBills.length > 0
    ? report.supplierBills
    : report.invoices.filter((invoice) => invoice.direction === 'expense' || invoice.type === 'ACCPAY');
  const currency = report.organisation?.baseCurrency || report.invoices.find((invoice) => invoice.currencyCode)?.currencyCode || 'AUD';
  const overdueInvoices = customerInvoices.filter((invoice) => invoice.isOverdue);
  const overdueBills = supplierBills.filter((bill) => bill.isOverdue);
  const awaitingInvoices = customerInvoices.filter((invoice) => invoice.status === 'AUTHORISED' && invoice.amountDue > 0);
  const activeContacts = report.contacts.filter((contact) => contact.isCustomer && !contact.isSupplier && (contact.outstanding > 0 || contact.overdue > 0));
  const topRisk = overdueInvoices[0] || awaitingInvoices[0] || null;
  const monthlyTotal = report.analytics.monthlyRevenue.reduce((sum, month) => sum + month.total, 0);
  const monthlyBillsTotal = report.analytics.monthlyBills.reduce((sum, month) => sum + month.total, 0);
  const totalDue = report.totals.amountDue + report.totals.billsDue;
  const topClient = report.analytics.topClients[0];
  const topSupplier = report.analytics.topSuppliers[0];
  const [selectedInvoice, setSelectedInvoice] = useState<XeroInvoice | null>(null);
  const [loadingInvoiceId, setLoadingInvoiceId] = useState('');
  const [draftSourceJob, setDraftSourceJob] = useState<NotionJobsReport['upcomingJobs'][number] | null>(null);
  const intelligenceSignals = useMemo(
    () => buildXeroIntelligenceSignals(report, notionReport),
    [report, notionReport]
  );
  const invoiceCandidateJobs = useMemo(
    () => getInvoiceCandidateJobs(report, notionReport).slice(0, 5),
    [report, notionReport]
  );

  const openInvoiceDetails = async (invoice: XeroInvoice) => {
    setSelectedInvoice(invoice);
    setLoadingInvoiceId(invoice.id);
    try {
      const response = await fetch(`/api/xero/invoice-detail?id=${encodeURIComponent(invoice.id)}`);
      const detail = await response.json();
      if (detail.ok && detail.invoice) setSelectedInvoice(detail.invoice);
    } catch {
      // Keep the list invoice visible if the detail request cannot load.
    } finally {
      setLoadingInvoiceId('');
    }
  };

  return (
    <section className="page-fade xero-page">
      <article className="glass-card wide xero-hero">
        <div>
          <PanelTitle eyebrow="Xero finance workspace" title="Xero" />
          <p className="section-copy">
            A finance command surface that separates client invoices from supplier bills so Noah can reason about income, expenses, and approval-gated actions clearly.
          </p>
        </div>
        <div className="xero-actions">
          <div className={`xero-health ${report.ok ? 'online' : 'offline'}`}>
            <span />
            {report.ok ? 'Connected' : 'Needs setup'}
          </div>
          <button className="secondary-action" onClick={() => void refreshXero()} disabled={isLoading}>
            <RefreshCw size={16} />
            {isLoading ? 'Syncing...' : 'Sync Xero'}
          </button>
          <button className="secondary-action" onClick={() => void refreshNotion()} disabled={isLoadingNotion}>
            <RefreshCw size={16} />
            {isLoadingNotion ? 'Syncing...' : 'Sync Notion'}
          </button>
        </div>
      </article>

      {!report.ok && (
        <article className="glass-card wide xero-alert">
          <CircleAlert size={20} />
          <div>
            <strong>{report.message || 'Xero is not connected yet.'}</strong>
            <p>Open Integrations, confirm the Xero credentials are configured, then sync this page again.</p>
          </div>
        </article>
      )}

      {report.warnings.length > 0 && (
        <article className="glass-card wide xero-alert">
          <CircleAlert size={20} />
          <div>
            <strong>Xero returned partial data</strong>
            {report.warnings.map((warning) => <p key={warning}>{warning}</p>)}
          </div>
        </article>
      )}

      <nav className="budget-section-tabs xero-section-tabs" aria-label="Xero sections">
        {xeroSections.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.id} className={section === item.id ? 'active' : ''} onClick={() => setSection(item.id)}>
              <Icon size={17} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {section === 'overview' && (
        <>
      <section className="overview-hero xero-overview-hero">
        <article className="overview-balance-card xero-balance-card">
          <div>
            <span>Total due snapshot</span>
            <strong>{formatMoney(totalDue, currency)}</strong>
            <p>Client invoices and supplier bills stay separated so receivables never get confused with expenses.</p>
          </div>
          <div className="overview-card-meta">
            <div>
              <span>Invoices</span>
              <strong>{formatMoney(report.totals.amountDue, currency)}</strong>
            </div>
            <div>
              <span>Bills</span>
              <strong>{formatMoney(report.totals.billsDue, currency)}</strong>
            </div>
          </div>
        </article>

        <article className="overview-chart-card">
          <div className="panel-row-head">
            <PanelTitle eyebrow="Performance" title="Revenue trend" />
            <BarChart3 size={20} />
          </div>
          <XeroRevenueChart data={report.analytics.monthlyRevenue} currency={currency} />
        </article>

        <div className="overview-action-tiles" aria-label="Xero quick actions">
          <button type="button" onClick={() => setSection('invoices')}>
            <CreditCard size={18} />
            <span>Invoices</span>
          </button>
          <button type="button" onClick={() => setSection('bills')}>
            <ReceiptText size={18} />
            <span>Bills</span>
          </button>
          <button type="button" onClick={() => setSection('contacts')}>
            <UsersRound size={18} />
            <span>Contacts</span>
          </button>
          <button type="button" onClick={() => void refreshXero()} disabled={isLoading}>
            <RefreshCw size={18} />
            <span>{isLoading ? 'Syncing' : 'Sync'}</span>
          </button>
        </div>
      </section>

      <section className="xero-overview">
        <article className="xero-org-card">
          <div className="xero-card-icon"><Building2 size={22} /></div>
          <span>Organisation</span>
          <strong>{report.organisation?.name || 'Not loaded'}</strong>
          <p>{[report.organisation?.countryCode, report.organisation?.baseCurrency].filter(Boolean).join(' · ') || 'Connect Xero to see company details.'}</p>
        </article>
        <XeroMetric icon={WalletCards} label="Client invoices due" value={formatMoney(report.totals.amountDue, currency)} detail={`${report.totals.awaitingPaymentCount} awaiting payment`} />
        <XeroMetric icon={CircleAlert} label="Overdue" value={formatMoney(report.totals.overdueAmount, currency)} detail={`${report.totals.overdueCount} overdue invoice(s)`} danger={report.totals.overdueCount > 0} />
        <XeroMetric icon={ReceiptText} label="Supplier bills due" value={formatMoney(report.totals.billsDue, currency)} detail={`${report.totals.awaitingPaymentBillsCount} bill(s) awaiting payment`} danger={report.totals.overdueBillsCount > 0} />
      </section>

      <section className="xero-analytics-grid">
        <article className="glass-card xero-panel xero-chart-panel">
          <div className="panel-row-head">
            <PanelTitle eyebrow="Revenue quality" title="Top clients" />
            <UsersRound size={20} />
          </div>
          <XeroClientChart data={report.analytics.topClients} currency={currency} emptyLabel="No customer invoice revenue data returned yet." />
        </article>

        <article className="glass-card xero-panel xero-chart-panel">
          <div className="panel-row-head">
            <PanelTitle eyebrow="Expenses" title="Monthly bills" />
            <BarChart3 size={20} />
          </div>
          <XeroRevenueChart data={report.analytics.monthlyBills} currency={currency} emptyLabel="No supplier bill trend returned yet." />
        </article>

        <article className="glass-card xero-panel xero-chart-panel">
          <div className="panel-row-head">
            <PanelTitle eyebrow="Receivables" title="Monthly invoiced" />
            <BarChart3 size={20} />
          </div>
          <XeroRevenueChart data={report.analytics.monthlyRevenue} currency={currency} />
        </article>

        <article className="glass-card xero-panel xero-chart-panel">
          <div className="panel-row-head">
            <PanelTitle eyebrow="Suppliers" title="Top billers" />
            <Building2 size={20} />
          </div>
          <XeroClientChart data={report.analytics.topSuppliers} currency={currency} valueLabel="billed" emptyLabel="No supplier bill data returned yet." />
        </article>
      </section>

      <section className="xero-grid">
        <article className="glass-card xero-panel">
          <div className="panel-row-head">
            <PanelTitle eyebrow="Cash attention" title="What needs attention" />
            <span>{report.fetchedAt ? `Synced ${new Date(report.fetchedAt).toLocaleString()}` : 'Not synced'}</span>
          </div>
          <div className="xero-focus-list">
            <XeroFocusItem
              tone={report.totals.overdueCount > 0 ? 'danger' : 'calm'}
              title={report.totals.overdueCount > 0 ? 'Follow up overdue invoices' : 'No overdue invoices in this snapshot'}
              detail={report.totals.overdueCount > 0 ? `${report.totals.overdueCount} invoice(s) are overdue, totalling ${formatMoney(report.totals.overdueAmount, currency)}.` : 'The recent invoice set does not show overdue receivables.'}
            />
            <XeroFocusItem
              tone={report.totals.awaitingPaymentCount > 0 ? 'warn' : 'calm'}
              title="Awaiting payment"
              detail={`${report.totals.awaitingPaymentCount} authorised invoice(s) still have a balance due.`}
            />
            <XeroFocusItem
              tone={report.totals.overdueBillsCount > 0 ? 'danger' : report.totals.awaitingPaymentBillsCount > 0 ? 'warn' : 'calm'}
              title={report.totals.overdueBillsCount > 0 ? 'Bills need payment attention' : 'Supplier bills separated'}
              detail={supplierBills.length > 0 ? `${report.totals.awaitingPaymentBillsCount} bill(s) have a balance due, totalling ${formatMoney(report.totals.billsDue, currency)}.` : 'No supplier bills were returned in this Xero snapshot.'}
            />
            <XeroFocusItem
              tone={topRisk ? 'warn' : 'calm'}
              title={topRisk ? `Review ${topRisk.number}` : 'Ready for deeper finance automation'}
              detail={topRisk ? `${topRisk.contact || 'A customer'} has ${formatMoney(topRisk.amountDue, currency)} due${topRisk.dueDate ? ` since ${topRisk.dueDate}` : ''}.` : 'Next useful step: connect invoice follow-up drafts through Noah with approval.'}
            />
          </div>
        </article>
      </section>
        </>
      )}

      {section === 'contacts' && (
      <section className="xero-grid">
        <article className="glass-card xero-panel">
          <div className="panel-row-head">
            <PanelTitle eyebrow="Customers" title="Customer balances" />
            <UsersRound size={20} />
          </div>
          <div className="xero-contact-list">
            {activeContacts.length === 0 ? (
              <p className="empty-state">No customer balances found in the latest Xero contact snapshot.</p>
            ) : (
              activeContacts.slice(0, 7).map((contact) => (
                <div className="xero-contact-row" key={contact.id}>
                  <div>
                    <strong>{contact.name}</strong>
                    <p>{contact.email || contact.phone || 'No contact details in this snapshot'}</p>
                  </div>
                  <span className={contact.overdue > 0 ? 'danger' : ''}>{formatMoney(contact.overdue || contact.outstanding, currency)}</span>
                </div>
              ))
            )}
          </div>
        </article>
        <article className="glass-card xero-panel xero-chart-panel">
          <div className="panel-row-head">
            <PanelTitle eyebrow="Client value" title="Top clients" />
            <UsersRound size={20} />
          </div>
          <XeroClientChart data={report.analytics.topClients} currency={currency} emptyLabel="No customer invoice revenue data returned yet." />
        </article>
        <article className="glass-card xero-panel xero-chart-panel">
          <div className="panel-row-head">
            <PanelTitle eyebrow="Suppliers" title="Top billers" />
            <Building2 size={20} />
          </div>
          <XeroClientChart data={report.analytics.topSuppliers} currency={currency} valueLabel="billed" emptyLabel="No supplier bill data returned yet." />
        </article>
      </section>
      )}

      {section === 'bills' && (
      <section className="xero-grid">
        <article className="glass-card xero-panel">
          <div className="panel-row-head">
            <PanelTitle eyebrow="Collections" title="Overdue invoice aging" />
            <Clock3 size={20} />
          </div>
          <XeroAgingChart data={report.analytics.overdueAging} currency={currency} />
        </article>

        <article className="glass-card xero-panel">
          <div className="panel-row-head">
            <PanelTitle eyebrow="Payables" title="Bill pressure" />
            <ReceiptText size={20} />
          </div>
          <div className="xero-focus-list">
            <XeroFocusItem
              tone={overdueBills.length > 0 ? 'danger' : 'calm'}
              title={overdueBills.length > 0 ? `${overdueBills.length} overdue bill(s)` : 'No overdue supplier bills'}
              detail={overdueBills.length > 0 ? `Overdue supplier balances total ${formatMoney(report.totals.overdueBillsAmount, currency)}.` : 'Supplier bills are separated from client invoice follow-up.'}
            />
            <XeroFocusItem
              tone={monthlyBillsTotal > monthlyTotal && monthlyTotal > 0 ? 'warn' : 'calm'}
              title="Income vs bills snapshot"
              detail={`Six-month invoiced: ${formatMoney(monthlyTotal, currency)}. Six-month bills: ${formatMoney(monthlyBillsTotal, currency)}.`}
            />
            <XeroFocusItem
              tone={topSupplier ? 'warn' : 'calm'}
              title={topSupplier ? `Top supplier: ${topSupplier.name}` : 'No top supplier yet'}
              detail={topSupplier ? `${formatMoney(topSupplier.revenue, currency)} in recent bills${topSupplier.outstanding > 0 ? `, with ${formatMoney(topSupplier.outstanding, currency)} due` : ''}.` : 'Sync Xero to identify recurring supplier/subscription pressure.'}
            />
          </div>
        </article>
      </section>
      )}

      {section === 'intelligence' && (
      <article className="glass-card wide xero-panel xero-intelligence-panel">
        <div className="panel-row-head">
          <PanelTitle eyebrow="NoA cross-check" title="Finance intelligence" />
          <Sparkles size={20} />
        </div>
        <div className="xero-intelligence-grid">
          {intelligenceSignals.length === 0 ? (
            <p className="empty-state">Sync Xero and Notion to surface cross-system finance signals.</p>
          ) : (
            intelligenceSignals.map((signal) => (
              <article className={`xero-signal ${signal.tone}`} key={signal.id}>
                <span>{signal.label}</span>
                <strong>{signal.title}</strong>
                <p>{signal.detail}</p>
                <small>{signal.action}</small>
              </article>
            ))
          )}
        </div>
      </article>
      )}

      {section === 'drafts' && (
      <article className="glass-card wide xero-panel xero-draft-panel">
        <div className="panel-row-head">
          <PanelTitle eyebrow="Approval gated" title="Draft invoice from Notion" />
          <ReceiptText size={20} />
        </div>
        {invoiceCandidateJobs.length === 0 ? (
          <p className="empty-state">No obvious Notion job candidates found for draft invoicing.</p>
        ) : (
          <div className="xero-draft-list">
            {invoiceCandidateJobs.map((job) => (
              <article className="xero-draft-job" key={job.id}>
                <div>
                  <strong>{job.title}</strong>
                  <p>{[job.client, job.jobDate, job.location].filter(Boolean).join(' · ') || 'No client/date metadata'}</p>
                </div>
                <button className="primary-action" onClick={() => setDraftSourceJob(job)}>
                  <ReceiptText size={16} />
                  Review draft
                </button>
              </article>
            ))}
          </div>
        )}
      </article>
      )}

      {section === 'invoices' && (
      <article className="glass-card wide xero-panel">
        <div className="panel-row-head">
          <PanelTitle eyebrow="Invoices" title="Recent invoice activity" />
          <CreditCard size={20} />
        </div>
        <div className="xero-table">
          <div className="xero-table-head">
            <span>Invoice</span>
            <span>Customer</span>
            <span>Status</span>
            <span>Due</span>
            <span>Balance</span>
          </div>
          {customerInvoices.length === 0 ? (
            <p className="empty-state">No invoices returned yet.</p>
          ) : (
            customerInvoices.map((invoice) => (
              <button className={`xero-invoice-row ${invoice.isOverdue ? 'overdue' : ''}`} onClick={() => void openInvoiceDetails(invoice)} key={invoice.id}>
                <span>
                  <strong>{invoice.number}</strong>
                  <small>{invoice.invoiceDate || invoice.type || 'Invoice'}</small>
                </span>
                <span>{invoice.contact || 'Unknown customer'}</span>
                <span><i>{invoice.status || 'Unknown'}</i></span>
                <span>{invoice.dueDate || 'No date'}</span>
                <span>{loadingInvoiceId === invoice.id ? 'Loading...' : formatMoney(invoice.amountDue, invoice.currencyCode || currency)}</span>
              </button>
            ))
          )}
        </div>
      </article>
      )}

      {section === 'bills' && (
      <article className="glass-card wide xero-panel">
        <div className="panel-row-head">
          <PanelTitle eyebrow="Bills" title="Supplier bill activity" />
          <ReceiptText size={20} />
        </div>
        <div className="xero-table">
          <div className="xero-table-head">
            <span>Bill</span>
            <span>Supplier</span>
            <span>Status</span>
            <span>Due</span>
            <span>Balance</span>
          </div>
          {supplierBills.length === 0 ? (
            <p className="empty-state">No supplier bills returned yet.</p>
          ) : (
            supplierBills.map((bill) => (
              <button className={`xero-invoice-row bill ${bill.isOverdue ? 'overdue' : ''}`} onClick={() => void openInvoiceDetails(bill)} key={bill.id}>
                <span>
                  <strong>{bill.number}</strong>
                  <small>{bill.invoiceDate || bill.type || 'Bill'}</small>
                </span>
                <span>{bill.contact || 'Unknown supplier'}</span>
                <span><i>{bill.status || 'Unknown'}</i></span>
                <span>{bill.dueDate || 'No date'}</span>
                <span>{loadingInvoiceId === bill.id ? 'Loading...' : formatMoney(bill.amountDue, bill.currencyCode || currency)}</span>
              </button>
            ))
          )}
        </div>
      </article>
      )}
      {selectedInvoice && (
        <XeroInvoiceDrawer
          invoice={selectedInvoice}
          currency={selectedInvoice.currencyCode || currency}
          isLoadingDetails={loadingInvoiceId === selectedInvoice.id}
          onClose={() => setSelectedInvoice(null)}
        />
      )}
      {draftSourceJob && (
        <XeroDraftInvoiceModal
          job={draftSourceJob}
          currency={currency}
          onClose={() => setDraftSourceJob(null)}
          onCreated={(invoice) => {
            setDraftSourceJob(null);
            setSelectedInvoice(invoice);
            void refreshXero();
          }}
        />
      )}
    </section>
  );
}

function XeroMetric({
  icon: Icon,
  label,
  value,
  detail,
  danger = false
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  detail: string;
  danger?: boolean;
}) {
  return (
    <article className={`xero-metric ${danger ? 'danger' : ''}`}>
      <div className="xero-card-icon"><Icon size={22} /></div>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

function mergeBudgetReport(report: Partial<BudgetReport>): BudgetReport {
  return {
    ...emptyBudgetReport,
    ...report,
    owner: {
      ...emptyBudgetReport.owner,
      ...(report.owner || {})
    },
    tables: {
      ...emptyBudgetReport.tables,
      ...(report.tables || {})
    },
    totals: {
      ...emptyBudgetReport.totals,
      ...(report.totals || {})
    },
    mortgageSummary: {
      ...emptyBudgetReport.mortgageSummary,
      ...(report.mortgageSummary || {}),
      mortgages: report.mortgageSummary?.mortgages || []
    },
    emailSettings: normalizeBudgetEmailSettings(report.emailSettings),
    tenantEmailActivity: Array.isArray(report.tenantEmailActivity) ? report.tenantEmailActivity : [],
    groceryItems: Array.isArray(report.groceryItems) ? report.groceryItems : [],
    settings: report.settings || null
  };
}

function normalizeBudgetEmailSettings(settings: Partial<BudgetEmailSettings> | undefined): BudgetEmailSettings {
  return {
    ...emptyBudgetReport.emailSettings,
    ...(settings || {}),
    tenants: Array.isArray(settings?.tenants) ? settings.tenants.map((tenant, index) => ({
      id: tenant.id || `tenant-${index + 1}`,
      name: tenant.name || '',
      email: tenant.email || '',
      mortgageLocalId: tenant.mortgageLocalId || '',
      rent: Number(tenant.rent || 0),
      rentFrequency: tenant.rentFrequency || 'weekly',
      active: tenant.active !== false
    })) : []
  };
}

function dayName(day: number) {
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day] || 'Monday';
}

function findBudgetMortgageForTenant(tenant: BudgetTenant, mortgages: BudgetMortgageBill[]) {
  if (tenant.mortgageLocalId) {
    const matched = mortgages.find((mortgage) => mortgage.localId === tenant.mortgageLocalId || mortgage.id === tenant.mortgageLocalId);
    if (matched) return matched;
  }
  return mortgages[0] || null;
}

function toWeeklyBudgetAmount(amount: number, frequency: string) {
  const value = Number(amount || 0);
  const text = String(frequency || 'weekly').toLowerCase();
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (text.includes('week')) return value;
  if (text.includes('fortnight')) return value / 2;
  if (text.includes('month')) return value * 12 / 52;
  if (text.includes('year') || text.includes('annual')) return value / 52;
  return value;
}

function emptyBudgetTables(): BudgetTables {
  return { income: [], expenses: [], debts: [], mortgages: [], mortgageExpenses: [], assets: [], savings: [] };
}

function countScheduledRows(rows: BudgetRow[]) {
  return rows.filter((row) => row.active !== false && normaliseScheduleType(row.schedule_type) !== '').length;
}

function budgetScheduledItems(tables: BudgetTables) {
  const mapRow = (kind: BudgetItemKind, row: BudgetRow): BudgetScheduleOccurrence | null => {
    if (row.active === false) return null;
    if (!normaliseScheduleType(row.schedule_type)) return null;
    const amountKey: keyof BudgetRow = kind === 'debts' || kind === 'mortgages' ? 'repayment' : 'amount';
    return {
      id: row.id || row.local_id || `${kind}-${budgetRowTitle(row)}`,
      date: '',
      title: budgetRowTitle(row),
      amount: budgetWeeklyValue(row, amountKey),
      kind,
      kindLabel: kindLabel(kind),
      frequency: String(row.frequency || ''),
      source: row
    };
  };

  return ([
    ...tables.income.map((row) => mapRow('income', row)),
    ...tables.expenses.map((row) => mapRow('expenses', row)),
    ...tables.debts.map((row) => mapRow('debts', row)),
    ...tables.mortgages.map((row) => mapRow('mortgages', row)),
    ...tables.mortgageExpenses.map((row) => mapRow('mortgageExpenses', row))
  ].filter(Boolean) as BudgetScheduleOccurrence[]);
}

function buildBudgetUpcomingSchedule(items: BudgetScheduleOccurrence[], days = 45) {
  const today = startOfLocalDay(new Date());
  const out: BudgetScheduleOccurrence[] = [];
  for (let offset = 0; offset <= days; offset += 1) {
    const date = addLocalDays(today, offset);
    const key = toLocalDateKey(date);
    for (const item of items) {
      if (budgetItemOccursOn(item.source, date)) out.push({ ...item, date: key });
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 24);
}

function buildBudgetScheduleMonth(items: BudgetScheduleOccurrence[]) {
  const now = startOfLocalDay(new Date());
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const offsetToMonday = (first.getDay() + 6) % 7;
  const start = addLocalDays(first, -offsetToMonday);
  const days: BudgetCalendarDay[] = [];

  for (let index = 0; index < 42; index += 1) {
    const date = addLocalDays(start, index);
    const dateKey = toLocalDateKey(date);
    const events = items
      .filter((item) => budgetItemOccursOn(item.source, date))
      .map((item) => ({ ...item, date: dateKey }));
    const income = sumNumbers(events.filter((item) => item.kind === 'income'), (item) => item.amount);
    const outgoing = sumNumbers(events.filter((item) => item.kind !== 'income'), (item) => item.amount);
    days.push({
      date: dateKey,
      dayNumber: date.getDate(),
      isToday: dateKey === toLocalDateKey(now),
      isMuted: date.getMonth() !== now.getMonth(),
      income,
      outgoing,
      incomePercent: 0,
      outgoingPercent: 0,
      events
    });
  }

  const maxIncome = Math.max(1, ...days.map((day) => day.income));
  const maxOutgoing = Math.max(1, ...days.map((day) => day.outgoing));
  return days.map((day) => ({
    ...day,
    incomePercent: day.income / maxIncome * 100,
    outgoingPercent: day.outgoing / maxOutgoing * 100
  }));
}

function buildBudgetTransferSuggestion(items: BudgetScheduleOccurrence[]) {
  const weeklyAmount = sumNumbers(items.filter((item) => item.kind !== 'income'), (item) => item.amount);
  const nextBills = buildBudgetUpcomingSchedule(items.filter((item) => item.kind !== 'income'), 21);
  if (weeklyAmount <= 0) {
    return {
      weeklyAmount: 0,
      message: 'Add payment schedules to expenses, debts, or mortgage costs and NoA will suggest a weekly bills transfer.'
    };
  }
  const pressure = nextBills.slice(0, 3).map((item) => `${item.title} on ${formatShortDate(item.date)}`).join(', ');
  return {
    weeklyAmount,
    message: pressure ? `Move this into bills weekly. Next pressure: ${pressure}.` : 'Weekly amount is based on all active scheduled outgoings.'
  };
}

function budgetScheduleCoverage(tables: BudgetTables) {
  return [
    { label: 'Income', rows: tables.income, detail: 'income events help find pay-day context' },
    { label: 'Expenses', rows: tables.expenses, detail: 'standard bills and recurring costs' },
    { label: 'Debts', rows: tables.debts, detail: 'repayments included in bills transfer pressure' },
    { label: 'Mortgage', rows: [...tables.mortgages, ...tables.mortgageExpenses], detail: 'repayments and property costs' }
  ].map((item) => ({ ...item, total: item.rows.length, scheduled: countScheduledRows(item.rows) }));
}

function normaliseScheduleType(value: unknown) {
  const raw = String(value || '').toLowerCase();
  if (!raw || raw === 'none') return '';
  if (raw === 'exact_date') return 'date';
  if (raw === 'monthly') return 'monthdate';
  if (raw === 'weekly' || raw === 'fortnightly') return 'weekday';
  return raw;
}

function budgetItemOccursOn(row: BudgetRow, date: Date) {
  const type = normaliseScheduleType(row.schedule_type);
  if (!type) return false;
  const frequency = String(row.frequency || '').toLowerCase();
  if (type === 'weekday') {
    const day = Number(row.schedule_day ?? 0);
    if (date.getDay() !== day) return false;
    if (frequency.includes('fortnight')) {
      const anchor = row.schedule_exact_date ? parseLocalDate(row.schedule_exact_date) : null;
      if (!anchor) return true;
      return Math.abs(Math.floor((startOfLocalDay(date).getTime() - anchor.getTime()) / 86400000)) % 14 === 0;
    }
    return true;
  }
  if (type === 'monthdate') {
    const target = Math.max(1, Math.min(31, Number(row.schedule_date || 1)));
    return date.getDate() === Math.min(target, daysInMonth(date));
  }
  if (type === 'date') {
    return row.schedule_exact_date === toLocalDateKey(date);
  }
  return false;
}

function parseLocalDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addLocalDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function daysInMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function toLocalDateKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function formatShortDate(value: string) {
  const date = parseLocalDate(value);
  if (!date) return value || 'No date';
  return date.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatFrequencyLabel(frequency: string) {
  const text = String(frequency || 'weekly').toLowerCase();
  if (text.includes('fortnight')) return 'fortnightly rent';
  if (text.includes('month')) return 'monthly rent';
  if (text.includes('year') || text.includes('annual')) return 'annual rent';
  return 'weekly rent';
}

function activityTone(status: string) {
  const value = String(status || '').toLowerCase();
  if (value === 'sent') return 'success';
  if (value === 'failed') return 'failed';
  if (value === 'skipped') return 'skipped';
  return 'neutral';
}

function activitySummary(item: BudgetEmailActivity) {
  const amount = item.total > 0 ? ` - ${formatMoney(item.total)}` : '';
  const destination = item.to ? ` to ${item.to}` : '';
  const source = item.source ? ` via ${item.source}` : '';
  return `${item.message || item.subject || 'Tenant billing activity'}${destination}${amount}${source}`;
}

function formatActivityTime(value: string) {
  if (!value) return 'Unknown time';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function budgetTenantWarnings(tenant: BudgetTenant, mortgage: BudgetMortgageBill | null, rentWeekly: number, utilitiesWeekly: number) {
  const warnings: string[] = [];
  if (tenant.active === false) return warnings;
  if (!tenant.email.trim()) warnings.push('missing email');
  if (!tenant.name.trim()) warnings.push('missing name');
  if (!mortgage) warnings.push('no linked property');
  if (rentWeekly <= 0) warnings.push('rent is zero');
  if (mortgage && utilitiesWeekly <= 0) warnings.push('no tenant-offset utilities');
  return warnings;
}

function buildMortgageExpenseGroups(mortgages: BudgetMortgageBill[], expenses: BudgetRow[]) {
  const linkedKeys = new Set<string>();
  const groups = mortgages.map((mortgage) => {
    const keys = [mortgage.localId, mortgage.id, mortgage.name].filter(Boolean).map(String);
    const rows = expenses.filter((expense) => {
      const matches = keys.includes(String(expense.mortgage_local_id || ''));
      if (matches && expense.id) linkedKeys.add(expense.id);
      return matches;
    });
    return buildMortgageExpenseGroup({
      key: mortgage.localId || mortgage.id || mortgage.name,
      title: mortgage.name || mortgage.propertyAddress || 'Mortgage',
      address: mortgage.propertyAddress,
      tenantCount: mortgage.tenantCount,
      mortgage,
      expenses: rows
    });
  });

  const unlinked = expenses.filter((expense) => expense.id ? !linkedKeys.has(expense.id) : !mortgages.some((mortgage) => [mortgage.localId, mortgage.id, mortgage.name].filter(Boolean).map(String).includes(String(expense.mortgage_local_id || ''))));
  if (unlinked.length > 0 || groups.length === 0) {
    groups.push(buildMortgageExpenseGroup({
      key: 'unlinked',
      title: 'Unlinked mortgage expenses',
      address: '',
      tenantCount: 0,
      mortgage: null,
      expenses: unlinked
    }));
  }

  return groups;
}

function buildMortgageExpenseGroup({
  key,
  title,
  address,
  tenantCount,
  mortgage,
  expenses
}: {
  key?: string;
  title: string;
  address: string;
  tenantCount: number;
  mortgage: BudgetMortgageBill | null;
  expenses: BudgetRow[];
}) {
  const activeExpenses = expenses.filter((expense) => expense.active !== false);
  const weeklyTotal = sumNumbers(activeExpenses, (expense) => budgetWeeklyValue(expense, 'amount'));
  const weeklyOffset = sumNumbers(activeExpenses.filter((expense) => expense.offset_to_tenants), (expense) => budgetWeeklyValue(expense, 'amount'));
  const weeklyOwner = weeklyTotal - weeklyOffset;
  const perTenant = tenantCount > 0 ? weeklyOffset / tenantCount : 0;
  const warnings: string[] = [];
  if (!mortgage) warnings.push('expenses are not linked to a property');
  if (mortgage && tenantCount <= 0) warnings.push('tenant count is zero');
  if (mortgage && weeklyOffset <= 0) warnings.push('no active expenses offset to tenants');
  if (activeExpenses.some((expense) => expense.offset_to_tenants && budgetWeeklyValue(expense, 'amount') <= 0)) warnings.push('offset expense has no amount');
  if (expenses.some((expense) => expense.active === false && expense.offset_to_tenants)) warnings.push('inactive expense has offset enabled');

  return {
    key: key || title,
    title,
    address,
    tenantCount,
    mortgage,
    expenses,
    weeklyTotal,
    weeklyOffset,
    weeklyOwner,
    perTenant,
    warnings
  };
}

function buildBudgetPropertyAnalytics(
  mortgages: BudgetMortgageBill[],
  tenantRows: BudgetTenantBillingRow[],
  expenseGroups: ReturnType<typeof buildMortgageExpenseGroups>
) {
  return mortgages.map((mortgage) => {
    const group = expenseGroups.find((item) => item.mortgage?.localId === mortgage.localId || item.mortgage?.id === mortgage.id || item.key === mortgage.localId || item.key === mortgage.id);
    const tenants = tenantRows.filter((row) => row.tenant.active !== false && row.mortgage === mortgage);
    const rentWeekly = sumNumbers(tenants, (row) => row.rentWeekly);
    const tenantWeeklyTotal = sumNumbers(tenants, (row) => row.totalWeekly);
    return {
      key: mortgage.localId || mortgage.id || mortgage.name,
      title: mortgage.name || mortgage.propertyAddress || 'Property',
      address: mortgage.propertyAddress,
      weeklyRepayment: mortgage.weeklyRepayment,
      ownerWeekly: group?.weeklyOwner || 0,
      tenantOffsetWeekly: group?.weeklyOffset || mortgage.weeklyOffsetExpenses || 0,
      rentWeekly,
      tenantWeeklyTotal,
      tenantCount: mortgage.tenantCount
    };
  });
}

function buildBudgetAttentionItems(
  analytics: ReturnType<typeof buildBudgetPageAnalytics>,
  tenantRows: BudgetTenantBillingRow[],
  expenseGroups: ReturnType<typeof buildMortgageExpenseGroups>,
  tables: BudgetTables
) {
  const items: Array<{ title: string; detail: string; tone: 'warn' | 'calm' | 'info' }> = [];
  const tenantWarningCount = tenantRows.reduce((count, row) => count + row.warnings.length, 0);
  const unlinkedCount = expenseGroups.find((group) => !group.mortgage)?.expenses.length || 0;
  const zeroTenantOffsetCount = expenseGroups.filter((group) => group.mortgage && group.weeklyOffset > 0 && group.tenantCount <= 0).length;

  if (analytics.monthlyNet < 0) {
    items.push({
      title: 'Projected deficit',
      detail: `${formatMoney(Math.abs(analytics.monthlyNet))} monthly gap based on active rows.`,
      tone: 'warn'
    });
  } else {
    items.push({
      title: 'Cashflow positive',
      detail: `${formatMoney(analytics.monthlyNet)} projected monthly surplus in this filter.`,
      tone: 'calm'
    });
  }

  if (tenantWarningCount > 0) {
    items.push({
      title: 'Tenant setup warnings',
      detail: `${tenantWarningCount} billing setup warning(s) need review before automation.`,
      tone: 'warn'
    });
  } else {
    items.push({
      title: 'Tenant setup clear',
      detail: 'No active tenant setup warnings are currently showing.',
      tone: 'calm'
    });
  }

  if (unlinkedCount > 0) {
    items.push({
      title: 'Unlinked mortgage expenses',
      detail: `${unlinkedCount} mortgage expense row(s) are not tied to a property.`,
      tone: 'warn'
    });
  }

  if (zeroTenantOffsetCount > 0) {
    items.push({
      title: 'Tenant count missing',
      detail: `${zeroTenantOffsetCount} property group(s) offset costs but cannot split them.`,
      tone: 'warn'
    });
  }

  if (analytics.weeklySavings <= 0) {
    items.push({
      title: 'No active savings plan',
      detail: 'Add or activate a savings row if you want savings pressure included.',
      tone: 'info'
    });
  }

  if (tables.income.length === 0) {
    items.push({
      title: 'No income rows in filter',
      detail: 'The selected filter has no active income rows, so net cashflow may look harsher.',
      tone: 'info'
    });
  }

  return items.slice(0, 5);
}

function filterBudgetTables(tables: BudgetTables, mode: BudgetModeFilter, showInactive: boolean): BudgetTables {
  const filterRows = (rows: BudgetRow[]) => rows.filter((row) => {
    const modeMatches = mode === 'all' || (row.mode || 'personal') === mode;
    const activeMatches = showInactive || row.active !== false;
    return modeMatches && activeMatches;
  });
  return {
    income: filterRows(tables.income),
    expenses: filterRows(tables.expenses),
    debts: filterRows(tables.debts),
    mortgages: filterRows(tables.mortgages),
    mortgageExpenses: filterRows(tables.mortgageExpenses),
    assets: filterRows(tables.assets),
    savings: filterRows(tables.savings)
  };
}

function buildBudgetPageAnalytics(report: BudgetReport, tables: BudgetTables) {
  const weeklyIncome = sumNumbers(tables.income, (row) => budgetWeeklyValue(row, 'amount'));
  const weeklyExpenses = sumNumbers(tables.expenses, (row) => budgetWeeklyValue(row, 'amount'));
  const weeklyDebt = sumNumbers(tables.debts, (row) => budgetWeeklyValue(row, 'repayment'));
  const weeklyMortgage = sumNumbers(tables.mortgages, (row) => budgetWeeklyValue(row, 'repayment'));
  const weeklyMortgageExpenses = sumNumbers(tables.mortgageExpenses, (row) => budgetWeeklyValue(row, 'amount'));
  const weeklySavings = sumNumbers(tables.savings, (row) => budgetWeeklyValue(row, 'amount'));
  const weeklyTenantOffsets = sumNumbers(tables.mortgageExpenses.filter((row) => row.offset_to_tenants), (row) => budgetWeeklyValue(row, 'amount'));
  const monthlyIncome = weeklyIncome * 52 / 12;
  const monthlyOutgoings = (weeklyExpenses + weeklyDebt + weeklyMortgage + weeklyMortgageExpenses + weeklySavings) * 52 / 12;
  const monthlyNet = monthlyIncome - monthlyOutgoings;
  const debtBalance = sumNumbers(tables.debts, (row) => numberOrZero(row.balance));
  const mortgageBalance = sumNumbers(tables.mortgages, (row) => numberOrZero(row.balance));
  const expenseCategories = buildBudgetCategoryTotals([...tables.expenses, ...tables.mortgageExpenses]);
  const largestExpense = expenseCategories[0];
  const nextTenantReady = report.emailSettings.tenants.filter((tenant) => tenant.active !== false && tenant.email).length;
  const todayTone = monthlyNet < 0 ? 'warn' : weeklyTenantOffsets > 0 ? 'calm' : 'info';

  return {
    weeklyIncome,
    weeklyExpenses,
    weeklyDebt,
    weeklyMortgage,
    weeklyMortgageExpenses,
    weeklySavings,
    weeklyTenantOffsets,
    monthlyIncome,
    monthlyOutgoings,
    monthlyNet,
    debtBalance,
    mortgageBalance,
    expenseCategories,
    today: {
      title: monthlyNet >= 0 ? 'Budget is holding' : 'Budget needs attention',
      detail: monthlyNet >= 0
        ? `Projected monthly surplus is ${formatMoney(monthlyNet)}. Keep an eye on the highest pressure category before adding new commitments.`
        : `Projected monthly deficit is ${formatMoney(Math.abs(monthlyNet))}. Review recurring expenses or debt pressure before taking on new spend.`,
      tone: todayTone,
      actions: [
        {
          label: largestExpense ? `Review ${largestExpense.label}` : 'Add spending categories',
          detail: largestExpense ? `${largestExpense.label} is currently ${formatMoney(largestExpense.amount)} per week across ${largestExpense.count} row(s).` : 'No expense categories are active in this filter yet.',
          tone: largestExpense && largestExpense.amount > weeklyIncome * 0.25 ? 'warn' : 'calm'
        },
        {
          label: nextTenantReady > 0 ? 'Tenant billing ready' : 'Tenant billing not ready',
          detail: nextTenantReady > 0 ? `${nextTenantReady} tenant recipient(s) can receive a bill preview or send now.` : 'Add tenant recipients and connect Gmail before relying on billing automation.',
          tone: nextTenantReady > 0 ? 'calm' : 'warn'
        },
        {
          label: debtBalance > 0 ? 'Debt balance visible' : 'Debt rows clear',
          detail: debtBalance > 0 ? `${formatMoney(debtBalance)} in debt balances with ${formatMoney(weeklyDebt)} weekly repayment pressure.` : 'No active debt balance is showing in this filtered view.',
          tone: debtBalance > 0 ? 'warn' : 'calm'
        }
      ]
    }
  };
}

function buildBudgetCategoryTotals(rows: BudgetRow[]) {
  const totals = new Map<string, { label: string; amount: number; count: number }>();
  for (const row of rows) {
    const label = row.category || (row.offset_to_tenants ? 'Mortgage tenant offsets' : row.mortgage_local_id ? 'Mortgage expenses' : 'Uncategorised');
    const current = totals.get(label) || { label, amount: 0, count: 0 };
    current.amount += budgetWeeklyValue(row, 'amount');
    current.count += 1;
    totals.set(label, current);
  }
  return Array.from(totals.values()).sort((a, b) => b.amount - a.amount);
}

function budgetWeeklyValue(row: BudgetRow, amountKey: keyof BudgetRow) {
  const explicit = numberOrZero(row.weekly_amount ?? row.weekly_repayment);
  if (explicit > 0) return explicit;
  const amount = numberOrZero(row[amountKey]);
  const frequency = String(row.frequency || '').toLowerCase();
  if (!amount) return 0;
  if (frequency.includes('week')) return amount;
  if (frequency.includes('fortnight')) return amount / 2;
  if (frequency.includes('month')) return amount * 12 / 52;
  if (frequency.includes('year') || frequency.includes('annual')) return amount / 52;
  return amount;
}

function getNextCycleDate(cycleDay: number) {
  const date = new Date();
  const target = Number.isFinite(cycleDay) ? cycleDay : 1;
  const delta = (target - date.getDay() + 7) % 7 || 7;
  date.setDate(date.getDate() + delta);
  return date.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'short' });
}

function sumNumbers<T>(items: T[], getter: (item: T) => number) {
  return items.reduce((total, item) => total + numberOrZero(getter(item)), 0);
}

function numberOrZero(value: unknown) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

function kindLabel(kind: BudgetItemKind) {
  return {
    income: 'Income',
    expenses: 'Expense',
    debts: 'Debt',
    mortgages: 'Mortgage',
    mortgageExpenses: 'Mortgage expense',
    assets: 'Asset',
    savings: 'Saving'
  }[kind];
}

function budgetRowTitle(row: BudgetRow) {
  return row.name || row.goal_name || row.property_address || row.local_id || 'Untitled row';
}

function budgetRowSubtitle(kind: BudgetItemKind, row: BudgetRow) {
  const status = row.active === false ? 'inactive' : 'active';
  if (kind === 'mortgageExpenses') return [row.mortgage_local_id, row.offset_to_tenants ? 'offset to tenants' : 'not offset', status].filter(Boolean).join(' · ');
  if (kind === 'mortgages') return [row.property_address, row.tenant_count ? `${row.tenant_count} tenants` : '', row.frequency, status].filter(Boolean).join(' · ');
  if (kind === 'assets') return [row.asset_type, status].filter(Boolean).join(' · ');
  if (kind === 'debts') return [row.debt_type, row.frequency, status].filter(Boolean).join(' · ');
  return [row.category, row.frequency, status].filter(Boolean).join(' · ');
}

function budgetPrimaryAmount(kind: BudgetItemKind, row: BudgetRow) {
  if (kind === 'debts' || kind === 'mortgages') return row.repayment || row.weekly_repayment || row.balance || 0;
  if (kind === 'assets') return row.value || 0;
  if (kind === 'savings') return row.amount || row.goal_amount || 0;
  return row.amount || row.weekly_amount || 0;
}

function budgetWeeklyImpact(kind: BudgetItemKind, row: BudgetRow) {
  if (kind === 'assets') return numberOrZero(row.value);
  if (kind === 'debts' || kind === 'mortgages') return budgetWeeklyValue(row, 'repayment');
  if (kind === 'savings') return budgetWeeklyValue(row, 'amount');
  return budgetWeeklyValue(row, 'amount');
}

function budgetRowScheduleLabel(row: BudgetRow): { label: string; tone: 'scheduled' | 'none' | 'once' } {
  const type = normaliseScheduleType(row.schedule_type);
  if (!type) return { label: 'No schedule', tone: 'none' };
  if (type === 'weekday') return { label: `${formatBudgetOption(String(row.frequency || 'weekly'))} · ${dayName(Number(row.schedule_day || 0))}`, tone: 'scheduled' };
  if (type === 'monthdate') return { label: `Monthly · day ${row.schedule_date || 1}`, tone: 'scheduled' };
  if (type === 'date') return { label: row.schedule_exact_date ? `Once · ${formatShortDate(row.schedule_exact_date)}` : 'One-off date', tone: 'once' };
  return { label: formatBudgetOption(type), tone: 'scheduled' };
}

function budgetRowChips(kind: BudgetItemKind, row: BudgetRow) {
  const chips = [
    row.mode ? formatBudgetOption(row.mode) : '',
    row.frequency ? formatBudgetOption(row.frequency) : ''
  ];
  if (kind === 'expenses' && row.category) chips.push(row.category);
  if (kind === 'mortgageExpenses') {
    if (row.category) chips.push(row.category);
    chips.push(row.offset_to_tenants ? 'Offset to tenants' : 'Owner-only');
  }
  if (kind === 'debts' && row.debt_type) chips.push(formatBudgetOption(row.debt_type));
  if (kind === 'assets' && row.asset_type) chips.push(formatBudgetOption(row.asset_type));
  if (kind === 'mortgages' && row.tenant_count) chips.push(`${row.tenant_count} tenants`);
  return chips.filter(Boolean).slice(0, 4);
}

function budgetFormForKind(kind: BudgetItemKind): {
  summaryLabel: string;
  summaryHint: string;
  detailHint: string;
  moneyHint: string;
  showSchedule: boolean;
  detailFields: BudgetEditorField[];
  moneyFields: BudgetEditorField[];
  noteFields: BudgetEditorField[];
} {
  const mode: BudgetEditorField = { key: 'mode', label: 'Budget mode', type: 'select', options: ['personal', 'business'] };
  const frequency: BudgetEditorField = { key: 'frequency', label: 'Repeats', type: 'select', options: ['weekly', 'fortnightly', 'monthly', 'annually'] };
  const activeNotes: BudgetEditorField = { key: 'notes', label: 'Notes', type: 'textarea', wide: true, placeholder: 'Anything Noah should remember about this item...' };

  if (kind === 'income') return {
    summaryLabel: 'Income amount',
    summaryHint: 'Add an amount and frequency to calculate its budget impact.',
    detailHint: 'Describe where this income comes from and whether it is personal or business.',
    moneyHint: 'Ledger uses this amount and frequency to calculate weekly and monthly cashflow.',
    showSchedule: true,
    detailFields: [{ key: 'name', label: 'Income name', placeholder: 'Salary, client retainer, dividends...' }, mode],
    moneyFields: [{ key: 'amount', label: 'Amount', type: 'number' }, frequency, { key: 'tax_rate', label: 'Tax reserve %', type: 'number', help: 'Optional. Used as context for income planning.' }],
    noteFields: [activeNotes]
  };

  if (kind === 'expenses') return {
    summaryLabel: 'Expense amount',
    summaryHint: 'Add the recurring cost and frequency.',
    detailHint: 'Name the bill or cost and assign the Ledger category that should carry it.',
    moneyHint: 'This feeds expense totals, category pressure, and scheduled bills.',
    showSchedule: true,
    detailFields: [{ key: 'name', label: 'Expense name', placeholder: 'Google Workspace, groceries, insurance...' }, mode, { key: 'category', label: 'Category', type: 'select', options: ['Housing', 'Utilities', 'Subscriptions', 'Transport', 'Food', 'Insurance', 'Business', 'Equipment', 'Other'] }],
    moneyFields: [{ key: 'amount', label: 'Amount', type: 'number' }, frequency],
    noteFields: [activeNotes]
  };

  if (kind === 'debts') return {
    summaryLabel: 'Repayment',
    summaryHint: 'Add the repayment amount to include this in weekly pressure.',
    detailHint: 'Track the debt type, balance, and repayment rhythm.',
    moneyHint: 'Debt repayments feed the smart bills transfer and payoff pressure.',
    showSchedule: true,
    detailFields: [{ key: 'name', label: 'Debt name', placeholder: 'Credit card, car loan, ATO...' }, mode, { key: 'debt_type', label: 'Debt type', type: 'select', options: ['credit_card', 'loan', 'tax', 'personal', 'business', 'other'] }],
    moneyFields: [{ key: 'balance', label: 'Current balance', type: 'number' }, { key: 'repayment', label: 'Repayment', type: 'number' }, frequency, { key: 'interest_rate', label: 'Interest rate %', type: 'number' }],
    noteFields: [activeNotes]
  };

  if (kind === 'mortgages') return {
    summaryLabel: 'Repayment',
    summaryHint: 'Add repayment and property values to calculate property pressure.',
    detailHint: 'Keep property, tenant count, and mortgage context together.',
    moneyHint: 'Mortgage repayments stay separate from tenant-offset utilities.',
    showSchedule: true,
    detailFields: [{ key: 'name', label: 'Property name', placeholder: 'Home loan, investment property...' }, mode, { key: 'property_address', label: 'Property address', wide: true }, { key: 'tenant_count', label: 'Number of tenants', type: 'number' }],
    moneyFields: [{ key: 'balance', label: 'Mortgage balance', type: 'number' }, { key: 'property_value', label: 'Property value', type: 'number' }, { key: 'repayment', label: 'Repayment', type: 'number' }, frequency, { key: 'interest_rate', label: 'Interest rate %', type: 'number' }],
    noteFields: [activeNotes]
  };

  if (kind === 'mortgageExpenses') return {
    summaryLabel: 'Property cost',
    summaryHint: 'Add a property cost and decide whether tenants should offset it.',
    detailHint: 'Link the cost to a property and classify whether it is owner-only or tenant-offset.',
    moneyHint: 'Offset expenses are split evenly into tenant utility bills.',
    showSchedule: true,
    detailFields: [{ key: 'name', label: 'Cost name', placeholder: 'Water, council rates, strata...' }, mode, { key: 'mortgage_local_id', label: 'Linked property', type: 'mortgage', wide: true }, { key: 'category', label: 'Category', type: 'select', options: ['Utilities', 'Rates', 'Insurance', 'Maintenance', 'Strata', 'Repairs', 'Other'] }, { key: 'offset_to_tenants', label: 'Offset this expense to tenants', type: 'checkbox', help: 'When enabled, NoA splits this cost evenly across configured tenants.' }],
    moneyFields: [{ key: 'amount', label: 'Amount', type: 'number' }, frequency],
    noteFields: [activeNotes]
  };

  if (kind === 'assets') return {
    summaryLabel: 'Asset value',
    summaryHint: 'Add the current value to include this in net worth.',
    detailHint: 'Assets are not scheduled; they support net worth and planning context.',
    moneyHint: 'The current value contributes to net worth.',
    showSchedule: false,
    detailFields: [{ key: 'name', label: 'Asset name', placeholder: 'Vehicle, equipment, shares...' }, mode, { key: 'asset_type', label: 'Asset type', type: 'select', options: ['property', 'vehicle', 'cash', 'investment', 'equipment', 'other'] }],
    moneyFields: [{ key: 'value', label: 'Current value', type: 'number' }],
    noteFields: [activeNotes]
  };

  return {
    summaryLabel: 'Savings amount',
    summaryHint: 'Add an amount and target to track savings pressure.',
    detailHint: 'Savings goals are lightweight Ledger commitments.',
    moneyHint: 'Savings rows are included in weekly outgoing pressure.',
    showSchedule: false,
    detailFields: [{ key: 'goal_name', label: 'Goal name', placeholder: 'Emergency fund, tax buffer...' }, mode],
    moneyFields: [{ key: 'amount', label: 'Saving amount', type: 'number' }, frequency, { key: 'goal_amount', label: 'Goal amount', type: 'number' }],
    noteFields: []
  };
}

function budgetDraftPrimaryValue(kind: BudgetItemKind, draft: Record<string, string | boolean>) {
  if (kind === 'debts' || kind === 'mortgages') return numberOrZero(draft.repayment);
  if (kind === 'assets') return numberOrZero(draft.value);
  return numberOrZero(draft.amount);
}

function budgetWeeklyDraftValue(kind: BudgetItemKind, draft: Record<string, string | boolean>) {
  if (kind === 'assets') return numberOrZero(draft.value);
  const key = kind === 'debts' || kind === 'mortgages' ? 'repayment' : 'amount';
  return toWeeklyBudgetAmount(numberOrZero(draft[key]), String(draft.frequency || 'weekly'));
}

function budgetScheduleSummary(draft: Record<string, string | boolean>) {
  const type = String(draft.schedule_type || '');
  if (!type) return 'No payment schedule. This item will not appear on the budget calendar.';
  if (type === 'weekly') return `Repeats weekly on ${dayName(Number(draft.schedule_day || 0))}.`;
  if (type === 'fortnightly') return `Repeats fortnightly on ${dayName(Number(draft.schedule_day || 0))}.`;
  if (type === 'monthly') return `Repeats monthly on day ${draft.schedule_date || 1}.`;
  if (type === 'exact_date') return draft.schedule_exact_date ? `One-off payment on ${formatShortDate(String(draft.schedule_exact_date))}.` : 'Pick the one-off payment date.';
  return 'Choose how this payment should appear on the calendar.';
}

function formatBudgetOption(option: string) {
  if (!option) return option;
  return option
    .split(/[_-]/g)
    .map((part) => part ? `${part[0].toUpperCase()}${part.slice(1)}` : part)
    .join(' ');
}

function budgetDraftFromRow(kind: BudgetItemKind, row: BudgetRow | null): Record<string, string | boolean> {
  const draft: Record<string, string | boolean> = {};
  for (const field of budgetFieldsForKind(kind)) {
    const value = row?.[field.key as keyof BudgetRow];
    draft[field.key] = field.type === 'checkbox' ? Boolean(value) : value == null ? '' : String(value);
  }
  if (!row) {
    draft.active = true;
    if ('frequency' in draft) draft.frequency = 'weekly';
  }
  return draft;
}

function budgetFieldsForKind(kind: BudgetItemKind): BudgetEditorField[] {
  const common = [
    { key: 'name', label: 'Name' },
    { key: 'mode', label: 'Mode', type: 'select' as const, options: ['personal', 'business'] },
    { key: 'frequency', label: 'Frequency', type: 'select' as const, options: ['weekly', 'fortnightly', 'monthly', 'annually'] },
    { key: 'schedule_type', label: 'Schedule type', type: 'select' as const, options: ['weekly', 'fortnightly', 'monthly', 'exact_date'] },
    { key: 'schedule_day', label: 'Schedule day', type: 'select' as const, options: ['0', '1', '2', '3', '4', '5', '6'] },
    { key: 'schedule_date', label: 'Schedule date', type: 'number' as const },
    { key: 'schedule_exact_date', label: 'Schedule exact date', type: 'date' as const },
    { key: 'active', label: 'Active', type: 'checkbox' as const },
    { key: 'notes', label: 'Notes', type: 'textarea' as const }
  ];

  if (kind === 'income') return [
    common[0],
    common[1],
    { key: 'amount', label: 'Amount', type: 'number' },
    common[2],
    { key: 'tax_rate', label: 'Tax rate', type: 'number' },
    common[3],
    common[4],
    common[5],
    common[6],
    common[7],
    common[8]
  ];

  if (kind === 'expenses') return [
    common[0],
    common[1],
    { key: 'category', label: 'Category', type: 'select', options: ['Housing', 'Utilities', 'Subscriptions', 'Transport', 'Food', 'Insurance', 'Business', 'Equipment', 'Other'] },
    { key: 'amount', label: 'Amount', type: 'number' },
    common[2],
    common[3],
    common[4],
    common[5],
    common[6],
    common[7],
    common[8]
  ];

  if (kind === 'debts') return [
    common[0],
    common[1],
    { key: 'debt_type', label: 'Debt type', type: 'select', options: ['credit_card', 'loan', 'tax', 'personal', 'business', 'other'] },
    { key: 'balance', label: 'Balance', type: 'number' },
    { key: 'repayment', label: 'Repayment', type: 'number' },
    common[2],
    { key: 'interest_rate', label: 'Interest rate', type: 'number' },
    common[3],
    common[4],
    common[5],
    common[6],
    common[7],
    common[8]
  ];

  if (kind === 'mortgages') return [
    common[0],
    common[1],
    { key: 'property_address', label: 'Property address' },
    { key: 'balance', label: 'Balance', type: 'number' },
    { key: 'property_value', label: 'Property value', type: 'number' },
    { key: 'repayment', label: 'Repayment', type: 'number' },
    common[2],
    { key: 'tenant_count', label: 'Tenant count', type: 'number' },
    { key: 'interest_rate', label: 'Interest rate', type: 'number' },
    common[3],
    common[4],
    common[5],
    common[6],
    common[7],
    common[8]
  ];

  if (kind === 'mortgageExpenses') return [
    common[0],
    common[1],
    { key: 'mortgage_local_id', label: 'Mortgage local ID' },
    { key: 'category', label: 'Category', type: 'select', options: ['Utilities', 'Rates', 'Insurance', 'Maintenance', 'Strata', 'Repairs', 'Other'] },
    { key: 'amount', label: 'Amount', type: 'number' },
    common[2],
    { key: 'offset_to_tenants', label: 'Offset expense to tenants', type: 'checkbox' },
    common[3],
    common[4],
    common[5],
    common[6],
    common[7],
    common[8]
  ];

  if (kind === 'assets') return [
    common[0],
    common[1],
    { key: 'asset_type', label: 'Asset type', type: 'select', options: ['property', 'vehicle', 'cash', 'investment', 'equipment', 'other'] },
    { key: 'value', label: 'Value', type: 'number' },
    common[7],
    common[8]
  ];

  return [
    { key: 'goal_name', label: 'Goal name' },
    common[1],
    { key: 'amount', label: 'Amount', type: 'number' },
    { key: 'goal_amount', label: 'Goal amount', type: 'number' },
    common[2],
    common[7]
  ];
}

function mergeXeroReport(report: Partial<XeroReport>): XeroReport {
  const invoices = report.invoices || [];
  const customerInvoices = report.customerInvoices || invoices.filter((invoice) => invoice.direction !== 'expense' && invoice.type !== 'ACCPAY');
  const supplierBills = report.supplierBills || invoices.filter((invoice) => invoice.direction === 'expense' || invoice.type === 'ACCPAY');

  return {
    ...emptyXeroReport,
    ...report,
    totals: {
      ...emptyXeroReport.totals,
      ...(report.totals || {})
    },
    analytics: {
      ...emptyXeroReport.analytics,
      ...(report.analytics || {})
    },
    invoices,
    customerInvoices,
    supplierBills,
    contacts: report.contacts || [],
    warnings: report.warnings || []
  };
}

function XeroInvoiceDrawer({
  invoice,
  currency,
  isLoadingDetails,
  onClose
}: {
  invoice: XeroInvoice;
  currency: string;
  isLoadingDetails: boolean;
  onClose: () => void;
}) {
  useModalEscape(onClose);
  const recordLabel = invoice.recordKind === 'bill' ? 'bill' : 'invoice';
  const counterpartyLabel = invoice.counterpartyLabel || (invoice.recordKind === 'bill' ? 'Supplier' : 'Customer');
  const pdfUrl = `/api/xero/invoice-pdf?id=${encodeURIComponent(invoice.id)}`;
  const paidPercent = invoice.total > 0 ? Math.min(100, Math.round((invoice.amountPaid / invoice.total) * 100)) : 0;
  const balanceTone = invoice.isOverdue ? 'danger' : invoice.amountDue > 0 ? 'warn' : 'calm';

  return (
    <ModalPortal>
    <div className="modal-shell xero-drawer-shell" role="dialog" aria-modal="true" aria-label={`${recordLabel} ${invoice.number}`}>
      <button className="modal-backdrop" onClick={onClose} aria-label="Close invoice details" />
      <aside className="xero-invoice-drawer">
        <div className="modal-head">
          <div>
            <p className="eyebrow">Xero {recordLabel}</p>
            <h3>{invoice.number}</h3>
          </div>
          <button type="button" className="icon-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className={`xero-invoice-status ${balanceTone}`}>
          <span>{formatXeroStatus(invoice.status)}</span>
          <strong>{invoice.amountDue > 0 ? `${formatMoney(invoice.amountDue, currency)} due` : 'No balance due'}</strong>
          <p>{invoice.isOverdue ? `Overdue since ${invoice.dueDate}` : invoice.dueDate ? `Due ${invoice.dueDate}` : 'No due date recorded'}</p>
        </div>

        <section className="xero-detail-grid">
          <div>
            <span>{counterpartyLabel}</span>
            <strong>{invoice.contact || `Unknown ${counterpartyLabel.toLowerCase()}`}</strong>
          </div>
          <div>
            <span>{recordLabel === 'bill' ? 'Bill date' : 'Invoice date'}</span>
            <strong>{invoice.invoiceDate || 'No date'}</strong>
          </div>
          <div>
            <span>Reference</span>
            <strong>{invoice.reference || 'None'}</strong>
          </div>
          <div>
            <span>Paid on</span>
            <strong>{invoice.fullyPaidOnDate || 'Not fully paid'}</strong>
          </div>
        </section>

        <section className="xero-payment-card">
          <div className="xero-payment-head">
            <span>Payment progress</span>
            <strong>{paidPercent}%</strong>
          </div>
          <div className="xero-progress-track">
            <i style={{ width: `${paidPercent}%` }} />
          </div>
          <div className="xero-total-grid">
            <div><span>Subtotal</span><strong>{formatMoney(invoice.subTotal, currency)}</strong></div>
            <div><span>Tax</span><strong>{formatMoney(invoice.totalTax, currency)}</strong></div>
            <div><span>Total</span><strong>{formatMoney(invoice.total, currency)}</strong></div>
            <div><span>Paid</span><strong>{formatMoney(invoice.amountPaid, currency)}</strong></div>
            <div><span>Credited</span><strong>{formatMoney(invoice.amountCredited, currency)}</strong></div>
            <div><span>Balance</span><strong>{formatMoney(invoice.amountDue, currency)}</strong></div>
          </div>
        </section>

        <section className="xero-line-items">
          <div className="panel-row-head">
            <PanelTitle eyebrow={`${recordLabel} lines`} title="Line items" />
            <span>{isLoadingDetails ? 'Loading...' : `${invoice.lineItems.length} line(s)`}</span>
          </div>
          {isLoadingDetails ? (
            <p className="empty-state">Loading full {recordLabel} detail from Xero...</p>
          ) : invoice.lineItems.length === 0 ? (
            <p className="empty-state">No line items were returned for this {recordLabel} snapshot.</p>
          ) : (
            invoice.lineItems.map((item, index) => (
              <article className="xero-line-item" key={item.id || `${item.description}-${index}`}>
                <div>
                  <strong>{item.description || item.itemCode || 'Line item'}</strong>
                  <p>{[item.itemCode, item.accountCode, item.taxType].filter(Boolean).join(' · ') || 'No item metadata'}</p>
                </div>
                <div>
                  <span>{formatQuantity(item.quantity)} x {formatMoney(item.unitAmount, currency)}</span>
                  <strong>{formatMoney(item.lineAmount, currency)}</strong>
                </div>
              </article>
            ))
          )}
        </section>

        <div className="modal-actions">
          {invoice.url && (
            <a className="secondary-action" href={invoice.url} target="_blank" rel="noreferrer">
              <ArrowUpRight size={16} />
              Open in Xero
            </a>
          )}
          <a className="primary-action" href={pdfUrl} target="_blank" rel="noreferrer">
            <ReceiptText size={16} />
            View PDF
          </a>
          <button type="button" className="secondary-action" onClick={onClose}>Close</button>
        </div>
      </aside>
    </div>
    </ModalPortal>
  );
}

function XeroDraftInvoiceModal({
  job,
  currency,
  onClose,
  onCreated
}: {
  job: NotionJobsReport['upcomingJobs'][number];
  currency: string;
  onClose: () => void;
  onCreated: (invoice: XeroInvoice) => void;
}) {
  useModalEscape(onClose);
  const [form, setForm] = useState<DraftInvoiceForm>(() => ({
    contactName: job.client || '',
    reference: job.title || '',
    dueDate: job.jobDate || '',
    description: job.deliverableTypes.length ? `${job.title} - ${job.deliverableTypes.join(', ')}` : job.title || 'Service',
    quantity: '1',
    unitAmount: '',
    accountCode: '200',
    taxType: 'OUTPUT'
  }));
  const [notice, setNotice] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const estimatedTotal = Math.max(0, Number(form.quantity || 0) * Number(form.unitAmount || 0));

  const update = (key: keyof DraftInvoiceForm, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setNotice('');
    if (!form.contactName.trim()) {
      setNotice('Add a Xero contact/customer name before creating the draft.');
      return;
    }
    if (!form.description.trim() || Number(form.unitAmount) < 0 || !form.unitAmount.trim()) {
      setNotice('Add a description and a unit amount before creating the draft.');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/xero/draft-invoice', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          contactName: form.contactName,
          reference: form.reference,
          dueDate: form.dueDate,
          lineItems: [
            {
              description: form.description,
              quantity: Number(form.quantity) || 1,
              unitAmount: Number(form.unitAmount) || 0,
              accountCode: form.accountCode,
              taxType: form.taxType
            }
          ]
        })
      });
      const result = await response.json();
      if (!result.ok) {
        setNotice(result.message || 'Xero rejected the draft invoice.');
        return;
      }
      onCreated(result.invoice);
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : 'Could not create draft invoice.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ModalPortal>
    <div className="modal-shell" role="dialog" aria-modal="true" aria-label={`Draft invoice for ${job.title}`}>
      <button className="modal-backdrop" onClick={onClose} aria-label="Close draft invoice" />
      <form className="notion-modal xero-draft-modal" onSubmit={submit}>
        <div className="modal-head">
          <div>
            <p className="eyebrow">Review before Xero</p>
            <h3>Create draft invoice</h3>
          </div>
          <button type="button" className="icon-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <article className="xero-approval-summary">
          <span>NoA will create a DRAFT invoice only</span>
          <strong>{job.title}</strong>
          <p>{[job.client, job.jobDate, job.location].filter(Boolean).join(' · ') || 'Review the invoice details before sending anything externally.'}</p>
        </article>

        <div className="notion-form-grid">
          <label className="notion-field">
            <span>Xero contact</span>
            <input value={form.contactName} onChange={(event) => update('contactName', event.target.value)} required />
          </label>
          <label className="notion-field">
            <span>Due date</span>
            <input type="date" value={form.dueDate} onChange={(event) => update('dueDate', event.target.value)} />
          </label>
          <label className="notion-field wide">
            <span>Reference</span>
            <input value={form.reference} onChange={(event) => update('reference', event.target.value)} />
          </label>
          <label className="notion-field wide">
            <span>Line description</span>
            <input value={form.description} onChange={(event) => update('description', event.target.value)} required />
          </label>
          <label className="notion-field">
            <span>Quantity</span>
            <input type="number" min="1" step="0.01" value={form.quantity} onChange={(event) => update('quantity', event.target.value)} />
          </label>
          <label className="notion-field">
            <span>Unit amount</span>
            <input type="number" min="0" step="0.01" value={form.unitAmount} onChange={(event) => update('unitAmount', event.target.value)} required />
          </label>
          <label className="notion-field">
            <span>Account code</span>
            <input value={form.accountCode} onChange={(event) => update('accountCode', event.target.value)} />
          </label>
          <label className="notion-field">
            <span>Tax type</span>
            <input value={form.taxType} onChange={(event) => update('taxType', event.target.value)} />
          </label>
        </div>

        <div className="xero-draft-total">
          <span>Estimated line total</span>
          <strong>{formatMoney(estimatedTotal, currency)}</strong>
        </div>

        {notice && <p className="integration-notice">{notice}</p>}

        <div className="modal-actions">
          <button type="button" className="secondary-action" onClick={onClose}>Cancel</button>
          <button type="submit" className="primary-action" disabled={isSaving}>
            <ReceiptText size={16} />
            {isSaving ? 'Creating...' : 'Create draft in Xero'}
          </button>
        </div>
      </form>
    </div>
    </ModalPortal>
  );
}

function XeroRevenueChart({
  data,
  currency,
  emptyLabel = 'Sync Xero to build revenue trend analytics.'
}: {
  data: XeroReport['analytics']['monthlyRevenue'];
  currency: string;
  emptyLabel?: string;
}) {
  const maxValue = Math.max(1, ...data.map((month) => month.total));

  if (data.length === 0) {
    return <p className="empty-state">{emptyLabel}</p>;
  }

  return (
    <div className="xero-bars" aria-label="Monthly invoiced revenue chart">
      {data.map((month) => {
        const height = Math.max(6, Math.round((month.total / maxValue) * 100));
        const outstandingPercent = month.total > 0 ? Math.round((month.outstanding / month.total) * 100) : 0;
        return (
          <div className="xero-bar-column" key={month.key}>
            <div className="xero-bar-value">{formatCompactMoney(month.total, currency)}</div>
            <div className="xero-bar-track">
              <span className="xero-bar-fill" style={{ height: `${height}%` }}>
                {outstandingPercent > 0 && <i style={{ height: `${Math.min(100, outstandingPercent)}%` }} />}
              </span>
            </div>
            <strong>{month.label}</strong>
          </div>
        );
      })}
    </div>
  );
}

function XeroStatusChart({ data, currency }: { data: XeroReport['analytics']['statusBreakdown']; currency: string }) {
  const maxAmount = Math.max(1, ...data.map((item) => item.amount));

  if (data.length === 0) {
    return <p className="empty-state">No invoice status data returned yet.</p>;
  }

  return (
    <div className="xero-progress-list">
      {data.map((item) => (
        <div className="xero-progress-row" key={item.status}>
          <div>
            <strong>{formatXeroStatus(item.status)}</strong>
            <span>{item.count} invoice(s) · {formatMoney(item.amount, currency)}</span>
          </div>
          <div className="xero-progress-track">
            <i style={{ width: `${Math.max(4, Math.round((item.amount / maxAmount) * 100))}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function XeroClientChart({
  data,
  currency,
  valueLabel = 'invoice(s)',
  emptyLabel = 'No client revenue data returned yet.'
}: {
  data: XeroReport['analytics']['topClients'];
  currency: string;
  valueLabel?: string;
  emptyLabel?: string;
}) {
  const maxRevenue = Math.max(1, ...data.map((client) => client.revenue));

  if (data.length === 0) {
    return <p className="empty-state">{emptyLabel}</p>;
  }

  return (
    <div className="xero-client-chart">
      {data.slice(0, 6).map((client, index) => (
        <div className="xero-client-bar" key={client.name}>
          <div className="xero-client-rank">{index + 1}</div>
          <div>
            <div className="xero-client-head">
              <strong>{client.name}</strong>
              <span>{formatMoney(client.revenue, currency)}</span>
            </div>
            <div className="xero-progress-track">
              <i style={{ width: `${Math.max(5, Math.round((client.revenue / maxRevenue) * 100))}%` }} />
            </div>
            <p>{client.invoiceCount} {valueLabel}{client.outstanding > 0 ? ` · ${formatMoney(client.outstanding, currency)} outstanding` : ''}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function XeroAgingChart({ data, currency }: { data: XeroReport['analytics']['overdueAging']; currency: string }) {
  const maxAmount = Math.max(1, ...data.map((bucket) => bucket.amount));

  return (
    <div className="xero-aging-grid">
      {data.map((bucket) => (
        <div className={`xero-aging-bucket ${bucket.amount > 0 ? 'active' : ''}`} key={bucket.label}>
          <span>{bucket.label}</span>
          <strong>{formatMoney(bucket.amount, currency)}</strong>
          <div className="xero-aging-track">
            <i style={{ height: `${bucket.amount > 0 ? Math.max(8, Math.round((bucket.amount / maxAmount) * 100)) : 0}%` }} />
          </div>
          <p>{bucket.count} invoice(s)</p>
        </div>
      ))}
    </div>
  );
}

function XeroFocusItem({ tone, title, detail }: { tone: 'danger' | 'warn' | 'calm'; title: string; detail: string }) {
  return (
    <div className={`xero-focus ${tone}`}>
      <span />
      <div>
        <strong>{title}</strong>
        <p>{detail}</p>
      </div>
    </div>
  );
}

function buildXeroIntelligenceSignals(report: XeroReport, notionReport: NotionJobsReport): XeroIntelligenceSignal[] {
  const signals: XeroIntelligenceSignal[] = [];
  const jobs = notionReport.upcomingJobs || [];
  const tasks = [...(notionReport.pipelineTasks || []), ...(notionReport.taskList || [])];
  const activeJobs = jobs.filter((job) => job.title && !job.archived);
  const xeroContactNames = new Set(report.contacts.map((contact) => normalizeMatchText(contact.name)).filter(Boolean));
  const clientInvoices = report.customerInvoices.length > 0
    ? report.customerInvoices
    : report.invoices.filter((invoice) => invoice.direction !== 'expense' && invoice.type !== 'ACCPAY');
  const invoiceMatchText = clientInvoices.map((invoice) => normalizeMatchText([
    invoice.contact,
    invoice.reference,
    invoice.number
  ].join(' ')));

  const overdueClientsWithWork = clientInvoices
    .filter((invoice) => invoice.isOverdue)
    .filter((invoice) => activeJobs.some((job) => namesLikelyMatch(invoice.contact, job.client) || textIncludes(invoice.contact, job.title)));

  if (overdueClientsWithWork.length > 0) {
    const invoice = overdueClientsWithWork[0];
    signals.push({
      id: `overdue-active-${invoice.id}`,
      tone: 'danger',
      label: 'Client risk',
      title: `${invoice.contact || 'A client'} has overdue money and active work`,
      detail: `${invoice.number} has ${formatMoney(invoice.amountDue, invoice.currencyCode || report.organisation?.baseCurrency || 'AUD')} outstanding while Notion shows related active job context.`,
      action: 'Review the job context before doing more delivery work or draft a follow-up for approval.'
    });
  }

  const possibleUninvoicedJobs = activeJobs
    .filter((job) => ['Overdue', 'Due today', 'Tomorrow', 'Due soon', 'Scheduled'].includes(job.dueState))
    .filter((job) => !invoiceMatchText.some((text) => textIncludes(text, job.title) || textIncludes(text, job.client)))
    .slice(0, 3);

  if (possibleUninvoicedJobs.length > 0) {
    const job = possibleUninvoicedJobs[0];
    signals.push({
      id: `uninvoiced-${job.id}`,
      tone: 'warn',
      label: 'Possible invoice gap',
      title: `${job.title} may not be represented in recent Xero invoices`,
      detail: `${job.client || 'This job'} appears in Notion, but I could not find a recent invoice match by job/client text.`,
      action: 'Check whether this job has been invoiced, then create a draft invoice workflow in Phase 4.'
    });
  }

  const unmappedJobs = activeJobs
    .filter((job) => job.client)
    .filter((job) => !xeroContactNames.has(normalizeMatchText(job.client)))
    .slice(0, 3);

  if (unmappedJobs.length > 0) {
    const job = unmappedJobs[0];
    signals.push({
      id: `unmapped-${job.id}`,
      tone: 'warn',
      label: 'Contact mapping',
      title: `${job.client} is not an obvious Xero contact match`,
      detail: `${job.title} has a Notion client name that does not exactly match the Xero contact snapshot.`,
      action: 'Confirm the Xero contact or add a client mapping so invoices and jobs connect cleanly.'
    });
  }

  const financeTasks = tasks
    .filter((task) => /invoice|payment|xero|deposit|quote|paid|overdue/i.test(`${task.title} ${task.description}`))
    .slice(0, 3);

  if (financeTasks.length > 0) {
    const task = financeTasks[0];
    signals.push({
      id: `finance-task-${task.id}`,
      tone: task.priority === 'High' ? 'danger' : 'calm',
      label: 'Finance task',
      title: task.title,
      detail: `${task.status || 'Active'}${task.dueDate ? ` · ${task.dueState} ${task.dueDate}` : ''}`,
      action: 'Keep this visible while reviewing Xero so accounting work does not detach from delivery work.'
    });
  }

  if (signals.length === 0 && (report.ok || activeJobs.length > 0)) {
    signals.push({
      id: 'all-clear',
      tone: 'calm',
      label: 'No obvious gaps',
      title: 'NoA did not find a strong Xero/Notion mismatch',
      detail: 'Recent invoices, contacts, and active Notion jobs did not produce an obvious warning-level signal.',
      action: 'Next useful step is approval-gated draft invoice creation from a Notion job.'
    });
  }

  return signals.slice(0, 4);
}

function getInvoiceCandidateJobs(report: XeroReport, notionReport: NotionJobsReport) {
  const clientInvoices = report.customerInvoices.length > 0
    ? report.customerInvoices
    : report.invoices.filter((invoice) => invoice.direction !== 'expense' && invoice.type !== 'ACCPAY');
  const invoiceMatchText = clientInvoices.map((invoice) => normalizeMatchText([
    invoice.contact,
    invoice.reference,
    invoice.number
  ].join(' ')));

  return (notionReport.upcomingJobs || [])
    .filter((job) => job.title && !job.archived)
    .filter((job) => !isCompleteNotionStatus(job.status))
    .filter((job) => !invoiceMatchText.some((text) => textIncludes(text, job.title) || textIncludes(text, job.client)))
    .sort((a, b) => {
      if (a.jobDate && !b.jobDate) return -1;
      if (!a.jobDate && b.jobDate) return 1;
      return (a.jobDate || '').localeCompare(b.jobDate || '');
    });
}

function normalizeMatchText(value: string) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(pty|ltd|limited|the|and|media|co|company)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function namesLikelyMatch(a: string, b: string) {
  const left = normalizeMatchText(a);
  const right = normalizeMatchText(b);
  if (!left || !right) return false;
  return left === right || left.includes(right) || right.includes(left);
}

function textIncludes(haystack: string, needle: string) {
  const normalizedHaystack = normalizeMatchText(haystack);
  const normalizedNeedle = normalizeMatchText(needle);
  return Boolean(normalizedHaystack && normalizedNeedle && normalizedHaystack.includes(normalizedNeedle));
}

function useModalEscape(onClose: () => void) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);
}

function ModalPortal({ children }: { children: React.ReactNode }) {
  return createPortal(children, document.body);
}

function NotionItemModal({
  mode,
  kind,
  item,
  initialValues,
  availableJobs,
  onClose,
  onEdit,
  onSave,
  onArchive
}: {
  mode: NotionEditorMode;
  kind: NotionItemKind;
  item?: (NotionTask | NotionJobsReport['upcomingJobs'][number]) | null;
  initialValues?: Record<string, string>;
  availableJobs?: NotionUpcomingJob[];
  onClose: () => void;
  onEdit: () => void;
  onSave: (values: Record<string, string>) => Promise<void>;
  onArchive?: () => Promise<void>;
}) {
  useModalEscape(onClose);
  const isJob = kind === 'job';
  const jobOptions = availableJobs ?? EMPTY_UPCOMING_JOBS;
  const initialValuesKey = JSON.stringify(initialValues || {});
  const resolveInitialValues = () => ({ ...getInitialNotionValues(kind, item), ...(initialValues || {}) });
  const [values, setValues] = useState<Record<string, string>>(resolveInitialValues);
  const [attachments, setAttachments] = useState<AttachmentDraft[]>(() => attachmentDraftsFromValue(values.attachments));
  const [jobSearch, setJobSearch] = useState(() => getTaskJobSearchLabel(getInitialNotionValues(kind, item), jobOptions));
  const [isSaving, setIsSaving] = useState(false);
  const [formMessage, setFormMessage] = useState('');
  const firstInputRef = useRef<HTMLInputElement | null>(null);
  const isReadOnly = mode === 'view';
  const title = mode === 'create'
    ? isJob ? 'New job' : 'New task'
    : values.title || (isJob ? 'Job details' : 'Task details');

  const updateValue = (key: string, value: string) => setValues((current) => ({ ...current, [key]: value }));
  const selectedTaskJob = useMemo(() => jobOptions.find((job) => job.id === values.jobId) || null, [jobOptions, values.jobId]);
  const filteredTaskJobs = useMemo(() => {
    if (isJob || isReadOnly) return [];
    const search = normalizeMatchText(jobSearch);
    const selectedFirst = selectedTaskJob ? [selectedTaskJob] : [];
    const matches = jobOptions.filter((job) => {
      if (job.id === selectedTaskJob?.id) return false;
      if (!search) return true;
      return normalizeMatchText([
        job.title,
        job.client,
        job.status,
        job.jobDate,
        job.dueDate,
        job.location
      ].filter(Boolean).join(' ')).includes(search);
    });
    return [...selectedFirst, ...matches].slice(0, 8);
  }, [isJob, isReadOnly, jobOptions, jobSearch, selectedTaskJob]);
  const selectTaskJob = (job: NotionUpcomingJob) => {
    setValues((current) => ({ ...current, jobId: job.id, jobTitle: job.title }));
    setJobSearch(job.title);
  };
  const clearTaskJob = () => {
    setValues((current) => ({ ...current, jobId: '', jobTitle: '' }));
    setJobSearch('');
  };
  const updateAttachment = (id: string, key: 'name' | 'url', value: string) => {
    setAttachments((current) => current.map((attachment) => (
      attachment.id === id ? { ...attachment, [key]: value } : attachment
    )));
  };
  const addAttachment = () => {
    setAttachments((current) => [...current, createAttachmentDraft('', '')]);
  };
  const removeAttachment = (id: string) => {
    setAttachments((current) => current.filter((attachment) => attachment.id !== id));
  };

  useEffect(() => {
    const nextValues = resolveInitialValues();
    setValues(nextValues);
    setAttachments(attachmentDraftsFromValue(nextValues.attachments));
    setJobSearch(getTaskJobSearchLabel(nextValues, jobOptions));
    setFormMessage('');
    setIsSaving(false);
  }, [kind, item, mode, jobOptions, initialValuesKey]);

  useEffect(() => {
    if (mode === 'edit' || mode === 'create') {
      window.setTimeout(() => firstInputRef.current?.focus(), 40);
    }
  }, [mode, item?.id]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isReadOnly || !values.title.trim()) return;
    const cleanAttachments = attachments
      .map((attachment) => ({
        name: attachment.name.trim(),
        url: attachment.url.trim()
      }))
      .filter((attachment) => attachment.name || attachment.url);
    const invalidAttachment = cleanAttachments.find((attachment) => attachment.url && !/^https?:\/\//i.test(attachment.url));
    if (invalidAttachment) {
      setFormMessage('Attachment links need to start with http:// or https://.');
      return;
    }
    setIsSaving(true);
    setFormMessage('Saving to Notion...');
    try {
      await onSave({
        ...values,
        attachments: formatAttachmentValue(cleanAttachments.filter((attachment) => attachment.url))
      });
    } catch (error) {
      setFormMessage(error instanceof Error ? error.message : 'Notion did not save this item.');
    } finally {
      setIsSaving(false);
    }
  };

  const archive = async () => {
    if (!onArchive || !window.confirm(`Archive ${values.title || 'this item'} in Notion?`)) return;
    setIsSaving(true);
    try {
      await onArchive();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ModalPortal>
    <div className="modal-shell" role="dialog" aria-modal="true" aria-label={title}>
      <button className="modal-backdrop" onClick={onClose} aria-label="Close" />
      <form className="notion-modal" onSubmit={submit}>
        <div className="modal-head">
          <div>
            <p className="eyebrow">{isJob ? 'Notion job' : 'Notion task'}</p>
            <h3>{title}</h3>
          </div>
          <button type="button" className="icon-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="notion-form-grid">
          <label className="notion-field wide">
            <span>{isJob ? 'Job title' : 'Task title'}</span>
            <input ref={firstInputRef} value={values.title} onChange={(event) => updateValue('title', event.target.value)} readOnly={isReadOnly} required />
          </label>

          {isJob ? (
            <>
              <label className="notion-field">
                <span>Client</span>
                <input value={values.client} onChange={(event) => updateValue('client', event.target.value)} readOnly={isReadOnly} />
              </label>
              <label className="notion-field">
                <span>Client relation ID</span>
                <input value={values.clientId} onChange={(event) => updateValue('clientId', event.target.value)} readOnly={isReadOnly} placeholder="Notion client page id" />
              </label>
              <label className="notion-field">
                <span>Status</span>
                <select value={values.status} onChange={(event) => updateValue('status', event.target.value)} disabled={isReadOnly}>
                  <option value="">No status</option>
                  <option>Notes/Client Info</option>
                  <option>Not Started</option>
                  <option>In Progress</option>
                  <option>Posted / Done</option>
                </select>
              </label>
              <label className="notion-field">
                <span>Shoot Date</span>
                <input type="date" value={values.jobDate} onChange={(event) => updateValue('jobDate', event.target.value)} readOnly={isReadOnly} />
              </label>
              <label className="notion-field">
                <span>Due Date</span>
                <input type="date" value={values.dueDate} onChange={(event) => updateValue('dueDate', event.target.value)} readOnly={isReadOnly} />
              </label>
              <label className="notion-field">
                <span>Priority</span>
                <select value={values.priority} onChange={(event) => updateValue('priority', event.target.value)} disabled={isReadOnly}>
                  <option value="">No priority</option>
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>
              </label>
              <label className="notion-field">
                <span>John's Cut</span>
                <input type="number" value={values.johnsCut} onChange={(event) => updateValue('johnsCut', event.target.value)} readOnly={isReadOnly} />
              </label>
              <label className="notion-field">
                <span>Location</span>
                <input value={values.location} onChange={(event) => updateValue('location', event.target.value)} readOnly={isReadOnly} />
              </label>
              <label className="notion-field wide">
                <span>Description</span>
                <textarea value={values.description} onChange={(event) => updateValue('description', event.target.value)} readOnly={isReadOnly} />
              </label>
              <label className="notion-field wide">
                <span>Notes</span>
                <textarea value={values.notes} onChange={(event) => updateValue('notes', event.target.value)} readOnly={isReadOnly} />
              </label>
            </>
          ) : (
            <>
              <label className="notion-field">
                <span>Status</span>
                <select value={values.status} onChange={(event) => updateValue('status', event.target.value)} disabled={isReadOnly}>
                  <option>Notes/Client Info</option>
                  <option>Not Started</option>
                  <option>In Progress</option>
                  <option>Ready For Revision</option>
                  <option>Final Draft/Notes</option>
                  <option>Ready To Post</option>
                  <option>Posted / Done</option>
                </select>
              </label>
              <label className="notion-field">
                <span>Linked job</span>
                {isReadOnly ? (
                  <div className="selected-job-pill">
                    <strong>{selectedTaskJob?.title || values.jobTitle || 'No linked job'}</strong>
                    {(selectedTaskJob?.client || selectedTaskJob?.jobDate || selectedTaskJob?.status) && (
                      <small>{[selectedTaskJob?.client, selectedTaskJob?.jobDate, selectedTaskJob?.status].filter(Boolean).join(' - ')}</small>
                    )}
                  </div>
                ) : (
                  <div className="task-job-picker">
                    <input
                      value={jobSearch}
                      onChange={(event) => {
                        const nextSearch = event.target.value;
                        setJobSearch(nextSearch);
                        if (values.jobId) {
                          setValues((current) => ({ ...current, jobId: '', jobTitle: '' }));
                        }
                      }}
                      placeholder="Search jobs by title or client"
                    />
                    {values.jobId && (
                      <button type="button" className="job-picker-clear" onClick={clearTaskJob}>
                        Clear
                      </button>
                    )}
                    <div className="job-picker-results">
                      {filteredTaskJobs.length === 0 ? (
                        <p className="job-picker-empty">No matching jobs found.</p>
                      ) : (
                        filteredTaskJobs.map((job) => (
                          <button
                            type="button"
                            className={job.id === values.jobId ? 'job-picker-option selected' : 'job-picker-option'}
                            key={job.id}
                            onClick={() => selectTaskJob(job)}
                          >
                            <strong>{job.title}</strong>
                            <small>{[job.client, job.jobDate || job.dueDate, job.status].filter(Boolean).join(' - ') || 'No extra details'}</small>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </label>
              <label className="notion-field">
                <span>Assigned To</span>
                <select value={values.assignedTo} onChange={(event) => updateValue('assignedTo', event.target.value)} disabled={isReadOnly}>
                  <option value="">Unassigned</option>
                  <option>John</option>
                  <option>Jack</option>
                </select>
              </label>
              <label className="notion-field">
                <span>Due date</span>
                <input type="date" value={values.dueDate} onChange={(event) => updateValue('dueDate', event.target.value)} readOnly={isReadOnly} />
              </label>
              <label className="notion-field">
                <span>Shoot Date</span>
                <input type="date" value={values.shootDate} onChange={(event) => updateValue('shootDate', event.target.value)} readOnly={isReadOnly} />
              </label>
              <label className="notion-field">
                <span>Priority</span>
                <select value={values.priority} onChange={(event) => updateValue('priority', event.target.value)} disabled={isReadOnly}>
                  <option value="">No priority</option>
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>
              </label>
              <label className="notion-field">
                <span>Effort</span>
                <select value={values.effortLevel} onChange={(event) => updateValue('effortLevel', event.target.value)} disabled={isReadOnly}>
                  <option value="">No effort</option>
                  <option>Small</option>
                  <option>Medium</option>
                  <option>Large</option>
                </select>
              </label>
              <label className="notion-field">
                <span>Captured By</span>
                <select value={values.capturedBy} onChange={(event) => updateValue('capturedBy', event.target.value)} disabled={isReadOnly}>
                  <option value="">Not set</option>
                  <option>Phone</option>
                  <option>Camera</option>
                </select>
              </label>
              <label className="notion-field wide">
                <span>Description</span>
                <textarea value={values.description} onChange={(event) => updateValue('description', event.target.value)} readOnly={isReadOnly} />
              </label>
              <label className="notion-field wide">
                <span>Notes</span>
                <textarea value={values.notes} onChange={(event) => updateValue('notes', event.target.value)} readOnly={isReadOnly} />
              </label>
            </>
          )}
        </div>

        <section className="attachment-editor">
          <div className="attachment-editor-head">
            <div>
              <span>Google Drive links</span>
              <small>Links are saved back to the Notion attachment field.</small>
            </div>
            {!isReadOnly && (
              <button type="button" className="secondary-action compact" onClick={addAttachment}>
                <Plus size={14} />
                Add link
              </button>
            )}
          </div>

          {isReadOnly ? (
            parseAttachmentValue(formatAttachmentValue(attachments)).length > 0 ? (
              <div className="attachment-list">
                {parseAttachmentValue(formatAttachmentValue(attachments)).map((attachment) => (
                  <a href={attachment.url} target="_blank" rel="noreferrer" key={attachment.url}>
                    <ArrowUpRight size={14} />
                    {attachment.name}
                  </a>
                ))}
              </div>
            ) : (
              <p className="empty-inline">No Google Drive links attached.</p>
            )
          ) : (
            <div className="attachment-rows">
              {attachments.length === 0 && (
                <button type="button" className="attachment-empty-add" onClick={addAttachment}>
                  <Plus size={16} />
                  Add the first Google Drive link
                </button>
              )}
              {attachments.map((attachment, index) => (
                <div className="attachment-row" key={attachment.id}>
                  <label>
                    <span>Name</span>
                    <input
                      value={attachment.name}
                      onChange={(event) => updateAttachment(attachment.id, 'name', event.target.value)}
                      placeholder={`Link ${index + 1}`}
                    />
                  </label>
                  <label>
                    <span>URL</span>
                    <input
                      value={attachment.url}
                      onChange={(event) => updateAttachment(attachment.id, 'url', event.target.value)}
                      placeholder="https://drive.google.com/..."
                      inputMode="url"
                    />
                  </label>
                  <div className="attachment-row-actions">
                    {attachment.url && /^https?:\/\//i.test(attachment.url) && (
                      <a className="icon-link" href={attachment.url} target="_blank" rel="noreferrer" aria-label={`Open ${attachment.name || 'link'}`}>
                        <ArrowUpRight size={15} />
                      </a>
                    )}
                    <button type="button" className="icon-danger" onClick={() => removeAttachment(attachment.id)} aria-label="Remove link">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {formMessage && <p className={`form-message ${formMessage.toLowerCase().includes('saving') ? 'saving' : 'error'}`}>{formMessage}</p>}

        <div className="modal-actions">
          {item?.url && (
            <a className="secondary-action" href={item.url} target="_blank" rel="noreferrer">
              <ArrowUpRight size={16} />
              Open in Notion
            </a>
          )}
          {isReadOnly ? (
            <button type="button" className="primary-action" onClick={onEdit}>
              <Edit3 size={16} />
              Edit
            </button>
          ) : (
            <button type="submit" className="primary-action" disabled={isSaving || !values.title.trim()}>
              <Save size={16} />
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          )}
          {onArchive && (
            <button type="button" className="danger-action" onClick={() => void archive()} disabled={isSaving}>
              <Trash2 size={16} />
              Archive
            </button>
          )}
        </div>
      </form>
    </div>
    </ModalPortal>
  );
}

function getInitialNotionValues(kind: NotionItemKind, item?: (NotionTask | NotionJobsReport['upcomingJobs'][number]) | null): Record<string, string> {
  if (kind === 'job') {
    const job = item as NotionJobsReport['upcomingJobs'][number] | null | undefined;
    return {
      title: job?.title || '',
      clientId: job?.clientId || '',
      client: job?.client || '',
      status: normalizeNotionStatusName(job?.status || ''),
      jobDate: job?.jobDate || '',
      dueDate: job?.dueDate || '',
      priority: job?.priority || '',
      johnsCut: getJobJohnsCut(job || {}) ? String(getJobJohnsCut(job || {})) : '',
      location: job?.location || '',
      description: job?.description || '',
      notes: job?.notes || '',
      attachments: formatAttachmentValue(job?.attachments || [])
    };
  }

  const task = item as NotionTask | null | undefined;
  return {
    title: task?.title || '',
    jobId: task?.jobId || '',
    jobTitle: task?.jobTitle || '',
    assignedTo: task?.assignedTo || '',
    status: normalizeNotionStatusName(task?.status || 'Not Started'),
    dueDate: task?.dueDate || '',
    shootDate: task?.shootDate || '',
    priority: task?.priority || '',
    effortLevel: task?.effortLevel || '',
    capturedBy: task?.capturedBy || '',
    description: task?.description || '',
    notes: task?.notes || '',
    attachments: formatAttachmentValue(task?.attachments || [])
  };
}

function getTaskJobSearchLabel(values: Record<string, string>, jobs: NotionUpcomingJob[]) {
  if (!values.jobId) return values.jobTitle || '';
  const selectedJob = jobs.find((job) => job.id === values.jobId);
  return selectedJob?.title || values.jobTitle || '';
}

function formatAttachmentValue(attachments: Array<{ name: string; url: string }>) {
  return attachments
    .filter((attachment) => attachment.url)
    .map((attachment, index) => `${attachment.name || `Attachment ${index + 1}`}: ${attachment.url}`)
    .join('\n');
}

function createAttachmentDraft(name: string, url: string): AttachmentDraft {
  return {
    id: `attachment-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name,
    url
  };
}

function attachmentDraftsFromValue(value: string): AttachmentDraft[] {
  return parseAttachmentValue(value).map((attachment) => createAttachmentDraft(attachment.name, attachment.url));
}

function parseAttachmentValue(value: string) {
  return String(value || '')
    .split(/\r?\n|,\s*(?=https?:\/\/)/)
    .map((line, index) => {
      const trimmed = line.trim();
      const match = trimmed.match(/https?:\/\/\S+/i);
      if (!match) return null;
      const rawUrl = match[0];
      const url = rawUrl.replace(/[),.;]+$/, '');
      const name = trimmed.replace(rawUrl, '').replace(/[:\-–—|]+$/g, '').trim();
      return { name: name || `Attachment ${index + 1}`, url };
    })
    .filter((attachment): attachment is { name: string; url: string } => Boolean(attachment));
}

function getJobJohnsCut(job: Pick<NotionUpcomingJob, 'johnsCut' | 'payAud'>) {
  return typeof job.johnsCut === 'number'
    ? job.johnsCut
    : typeof job.payAud === 'number'
      ? job.payAud
      : 0;
}

function getJobMonthKey(job: Pick<NotionUpcomingJob, 'jobDate' | 'dueDate' | 'shootDate'>) {
  const date = job.jobDate || job.shootDate || job.dueDate || '';
  return date ? date.slice(0, 7) : '';
}

function buildClientBudgetSummaries(report: NotionJobsReport, monthKey: string) {
  const jobs = report.upcomingJobs || [];
  return (report.clients || [])
    .filter((client) => !client.archived)
    .map((client) => {
      const clientJobs = jobs.filter((job) => (
        job.clientId === client.id || namesLikelyMatch(job.client, client.title)
      ));
      const monthJobs = clientJobs.filter((job) => getJobMonthKey(job) === monthKey);
      const budget = typeof client.budget === 'number' ? client.budget : 0;
      const johnsCutThisMonth = monthJobs.reduce((sum, job) => sum + getJobJohnsCut(job), 0);
      const johnsCutAllTime = clientJobs.reduce((sum, job) => sum + getJobJohnsCut(job), 0);
      const remaining = budget - johnsCutThisMonth;
      const utilization = budget > 0 ? (johnsCutThisMonth / budget) * 100 : 0;
      return {
        ...client,
        budget,
        jobs: clientJobs,
        monthJobs,
        johnsCutThisMonth,
        johnsCutAllTime,
        remaining,
        utilization,
        activeJobCount: clientJobs.filter((job) => !isCompleteNotionStatus(job.status)).length
      };
    })
    .sort((a, b) => {
      if (b.johnsCutThisMonth !== a.johnsCutThisMonth) return b.johnsCutThisMonth - a.johnsCutThisMonth;
      if (b.budget !== a.budget) return b.budget - a.budget;
      return a.title.localeCompare(b.title);
    });
}

function getAllReportTasks(report: NotionJobsReport) {
  return dedupeTasks([
    ...(report.tasks || []),
    ...(report.taskList || []),
    ...(report.pipelineTasks || []),
    ...(report.calendarTasks || [])
  ]);
}

function getClientJobsForClient(report: NotionJobsReport, client: Pick<NotionJobsReport['clients'][number], 'id' | 'title'>) {
  return (report.upcomingJobs || [])
    .filter((job) => !job.archived)
    .filter((job) => job.clientId === client.id || namesLikelyMatch(job.client, client.title))
    .filter(shouldShowJobInClientCrm)
    .sort(sortClientCrmJobs);
}

function shouldShowJobInClientCrm(job: NotionUpcomingJob) {
  if (!isCompleteNotionStatus(job.status)) return true;
  const dateKey = getJobSortDateKey(job);
  if (!dateKey) return false;
  return dateKey >= getTwoMonthsAgoKey();
}

function sortClientCrmJobs(a: NotionUpcomingJob, b: NotionUpcomingJob) {
  const statusDelta = clientJobStatusWeight(a.status) - clientJobStatusWeight(b.status);
  if (statusDelta !== 0) return statusDelta;

  const aDate = getJobSortDateKey(a);
  const bDate = getJobSortDateKey(b);
  if (aDate && !bDate) return -1;
  if (!aDate && bDate) return 1;
  if (aDate && bDate && aDate !== bDate) return aDate.localeCompare(bDate);

  return priorityWeight(a.priority) - priorityWeight(b.priority) || a.title.localeCompare(b.title);
}

function clientJobStatusWeight(status: string) {
  const normalized = normalizeNotionStatusName(status);
  const weights: Record<string, number> = {
    'Not Started': 0,
    'Not started': 0,
    'In Progress': 1,
    'In progress': 1,
    'Ready for Revision': 2,
    'Ready For Revision': 2,
    'Final Draft/Notes': 3,
    'Ready To Post': 4,
    'Posted / Done': 5,
    Archived: 6,
    'Notes/Client Info': 7
  };
  return weights[normalized] ?? 8;
}

function getJobSortDateKey(job: Pick<NotionUpcomingJob, 'jobDate' | 'dueDate' | 'shootDate'>) {
  return job.jobDate || job.shootDate || job.dueDate || '';
}

function getTwoMonthsAgoKey() {
  const today = dateFromKey(brisbaneToday());
  today.setUTCMonth(today.getUTCMonth() - 2);
  return today.toISOString().slice(0, 10);
}

function getTasksForClient(
  report: NotionJobsReport,
  client: Pick<NotionJobsReport['clients'][number], 'id' | 'title'>,
  clientJobs: NotionUpcomingJob[]
) {
  const clientJobIds = new Set(clientJobs.map((job) => job.id));
  return getAllReportTasks(report)
    .filter((task) => !task.archived)
    .filter((task) => (
      Boolean(task.jobId && clientJobIds.has(task.jobId))
      || namesLikelyMatch(task.client || '', client.title)
      || clientJobs.some((job) => namesLikelyMatch(task.jobTitle || '', job.title))
    ))
    .sort(sortTodayTasks);
}

function getTasksForJob(tasks: NotionTask[], job: NotionUpcomingJob) {
  return tasks
    .filter((task) => task.jobId === job.id || namesLikelyMatch(task.jobTitle || '', job.title))
    .filter(shouldShowTaskInJobCrm)
    .sort(sortJobCrmTasks);
}

function getClientJobStatusGroups(jobs: NotionUpcomingJob[]) {
  const groups = jobs.reduce<Array<{ status: string; jobs: NotionUpcomingJob[] }>>((acc, job) => {
    const status = normalizeNotionStatusName(job.status) || 'No status';
    let group = acc.find((item) => item.status === status);
    if (!group) {
      group = { status, jobs: [] };
      acc.push(group);
    }
    group.jobs.push(job);
    return acc;
  }, []);
  return groups.sort((a, b) => clientJobStatusWeight(a.status) - clientJobStatusWeight(b.status));
}

function getItemAttachmentLinks(item: { attachments?: Array<{ name?: string; url?: string }> }) {
  return (item.attachments || []).filter((attachment) => Boolean(attachment.url));
}

function shouldShowTaskInJobCrm(task: NotionTask) {
  if (!isCompleteNotionTask(task)) return true;
  const dateKey = getTaskSortDateKey(task);
  if (!dateKey) return false;
  return dateKey >= getTwoMonthsAgoKey();
}

function sortJobCrmTasks(a: NotionTask, b: NotionTask) {
  const completeDelta = Number(isCompleteNotionTask(a)) - Number(isCompleteNotionTask(b));
  if (completeDelta !== 0) return completeDelta;

  const statusDelta = clientJobStatusWeight(a.status) - clientJobStatusWeight(b.status);
  if (statusDelta !== 0) return statusDelta;

  const aDate = getTaskSortDateKey(a);
  const bDate = getTaskSortDateKey(b);
  if (aDate && !bDate) return -1;
  if (!aDate && bDate) return 1;
  if (aDate && bDate && aDate !== bDate) return aDate.localeCompare(bDate);

  return priorityWeight(a.priority) - priorityWeight(b.priority) || a.title.localeCompare(b.title);
}

function getTaskSortDateKey(task: Pick<NotionTask, 'shootDate' | 'dueDate'>) {
  return task.shootDate || task.dueDate || '';
}

function getClientDisplayMeta(client: ReturnType<typeof buildClientBudgetSummaries>[number]) {
  return [
    client.status || 'No status',
    client.retainer === 'Yes' ? 'Retainer' : '',
    client.industry?.slice(0, 2).join(', '),
    `${client.jobs.length} linked job${client.jobs.length === 1 ? '' : 's'}`
  ].filter(Boolean).join(' - ');
}

function buildCalendarJobs(report: NotionJobsReport): CalendarJob[] {
  const dedicatedJobs: CalendarJob[] = (report.upcomingJobs || []).map((job) => ({
    ...job,
    sourceKind: 'job',
    sourceLabel: 'Jobs database'
  }));
  const seenTaskIds = new Set<string>();
  const sourceTasks = report.calendarTasks?.length
    ? report.calendarTasks
    : [...(report.taskList || []), ...(report.tasks || [])];
  const taskJobs = sourceTasks
    .filter((task) => {
      if (!task.id || seenTaskIds.has(task.id) || !task.shootDate || task.archived) return false;
      seenTaskIds.add(task.id);
      return Boolean(task.title);
    })
    .map<CalendarJob>((task) => ({
      id: task.id,
      title: task.title,
      client: task.assignees?.[0]?.name || task.status || '',
      status: normalizeNotionStatusName(task.status || ''),
      jobDate: task.shootDate,
      dueState: task.shootState,
      priority: task.priority,
      deliverableTypes: task.taskTypes || [],
      location: [task.column || task.status, task.dueDate ? `Due ${task.dueDate}` : ''].filter(Boolean).join(' - '),
      notes: task.description || '',
      attachments: task.attachments || [],
      url: task.url,
      archived: task.archived,
      sourceKind: 'task',
      sourceLabel: "JOHN'S HUB task",
      task
    }));

  return [...dedicatedJobs, ...taskJobs].sort(sortCalendarJobs);
}

function sortCalendarJobs(a: CalendarJob, b: CalendarJob) {
  if (a.jobDate && !b.jobDate) return -1;
  if (!a.jobDate && b.jobDate) return 1;
  if (a.jobDate && b.jobDate && a.jobDate !== b.jobDate) return a.jobDate.localeCompare(b.jobDate);
  return priorityWeight(a.priority) - priorityWeight(b.priority);
}

function sortUpcomingJobs(a: NotionUpcomingJob, b: NotionUpcomingJob) {
  if (a.jobDate && !b.jobDate) return -1;
  if (!a.jobDate && b.jobDate) return 1;
  if (a.jobDate && b.jobDate && a.jobDate !== b.jobDate) return a.jobDate.localeCompare(b.jobDate);
  return priorityWeight(a.priority) - priorityWeight(b.priority);
}

function priorityWeight(priority: string) {
  return { High: 0, Medium: 1, Low: 2 }[priority] ?? 3;
}

function dedupeTasks(tasks: NotionTask[]) {
  const seen = new Set<string>();
  return tasks.filter((task) => {
    if (!task.id || seen.has(task.id)) return false;
    seen.add(task.id);
    return true;
  });
}

function sortTodayTasks(a: NotionTask, b: NotionTask) {
  const stateWeight = (task: NotionTask) => {
    if (task.dueState === 'Overdue') return 0;
    if (task.dueState === 'Due today') return 1;
    if (task.dueState === 'Tomorrow') return 2;
    return 3;
  };
  const stateDelta = stateWeight(a) - stateWeight(b);
  if (stateDelta !== 0) return stateDelta;
  const priorityDelta = priorityWeight(a.priority) - priorityWeight(b.priority);
  if (priorityDelta !== 0) return priorityDelta;
  return (a.dueDate || '9999-12-31').localeCompare(b.dueDate || '9999-12-31');
}

function isDateWithinDays(dateKey: string, startKey: string, days: number) {
  if (!dateKey) return false;
  const date = dateFromKey(dateKey).getTime();
  const start = dateFromKey(startKey).getTime();
  const end = start + (days * 24 * 60 * 60 * 1000);
  return date >= start && date < end;
}

function isTaskInRecentWindow(task: NotionTask) {
  const todayKey = brisbaneToday();
  const start = dateFromKey(todayKey);
  start.setUTCDate(start.getUTCDate() - 6);
  const startTime = start.getTime();
  const endTime = dateFromKey(todayKey).getTime();
  return [task.dueDate, task.shootDate].some((dateKey) => {
    if (!dateKey) return false;
    const time = dateFromKey(dateKey).getTime();
    return time >= startTime && time <= endTime;
  });
}

function buildSevenDayPulse(jobs: CalendarJob[], tasks: NotionTask[], todayKey: string) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = dateFromKey(todayKey);
    date.setUTCDate(date.getUTCDate() + index);
    const key = date.toISOString().slice(0, 10);
    const jobCount = jobs.filter((job) => job.jobDate === key).length;
    const taskCount = tasks.filter((task) => task.dueDate === key || task.shootDate === key).length;
    return {
      date: key,
      label: index === 0 ? 'Today' : date.toLocaleDateString('en-AU', { weekday: 'short', timeZone: 'UTC' }),
      total: jobCount + taskCount
    };
  });
}

function dateFromKey(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function brisbaneToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Brisbane',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

function shiftMonth(monthKey: string, offset: number) {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1 + offset, 1));
  return date.toISOString().slice(0, 7);
}

function formatCalendarMonth(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-AU', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  });
}

function formatCalendarDay(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  });
}

function buildJobsCalendarDays(jobs: CalendarJob[], monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number);
  const firstOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const startOffset = (firstOfMonth.getUTCDay() + 6) % 7;
  const start = new Date(firstOfMonth);
  start.setUTCDate(firstOfMonth.getUTCDate() - startOffset);
  const jobsByDate = jobs.reduce<Record<string, CalendarJob[]>>((groups, job) => {
    if (!job.jobDate) return groups;
    groups[job.jobDate] = [...(groups[job.jobDate] || []), job];
    return groups;
  }, {});

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    const key = date.toISOString().slice(0, 10);
    return {
      date: key,
      inMonth: key.startsWith(monthKey),
      jobs: jobsByDate[key] || []
    };
  });
}

function Today({
  greeting,
  command,
  setCommand,
  sendCommand,
  capture,
  setCapture,
  addCapture,
  notes,
  smartBriefing,
  inboxSummary,
  jobsReport,
  xeroReport,
  setScreen
}: {
  greeting: string;
  command: string;
  setCommand: (value: string) => void;
  sendCommand: () => void;
  capture: string;
  setCapture: (value: string) => void;
  addCapture: () => void;
  notes: CaptureNote[];
  smartBriefing: SmartBriefing;
  inboxSummary: { label: string; value: string; detail: string }[];
  jobsReport: NotionJobsReport;
  xeroReport: XeroReport;
  setScreen: (screen: Screen) => void;
}) {
  const todayKey = brisbaneToday();
  const calendarJobs = buildCalendarJobs(jobsReport);
  const todayJobs = calendarJobs.filter((job) => job.jobDate === todayKey).slice(0, 4);
  const nextJobs = calendarJobs.filter((job) => job.jobDate && job.jobDate >= todayKey).slice(0, 4);
  const allTasks = dedupeTasks([...jobsReport.taskList, ...jobsReport.tasks, ...jobsReport.calendarTasks]);
  const urgentTasks = allTasks
    .filter((task) => !isCompleteNotionTask(task) && (['Overdue', 'Due today', 'Tomorrow'].includes(task.dueState) || task.priority === 'High'))
    .sort(sortTodayTasks)
    .slice(0, 5);
  const moneyDue = xeroReport.totals.amountDue + xeroReport.totals.billsDue;
  const currency = xeroReport.organisation?.baseCurrency || 'AUD';
  const todayFocus = urgentTasks[0]?.title || todayJobs[0]?.title || nextJobs[0]?.title || smartBriefing.mainFocus;
  const todayReason = urgentTasks[0]
    ? `${urgentTasks[0].dueState || urgentTasks[0].status} ${urgentTasks[0].dueDate || ''}`.trim()
    : todayJobs[0]
      ? `Scheduled today from ${todayJobs[0].sourceLabel}`
      : nextJobs[0]
        ? `Next scheduled item is ${nextJobs[0].jobDate}`
        : smartBriefing.risk;
  const todayMetrics = [
    { label: 'Today', value: String(todayJobs.length), detail: 'jobs/tasks scheduled', tone: 'blue' },
    { label: 'Urgent', value: String(urgentTasks.length), detail: 'high or due soon', tone: urgentTasks.length ? 'amber' : 'green' },
    { label: 'This week', value: String(calendarJobs.filter((job) => isDateWithinDays(job.jobDate, todayKey, 7)).length), detail: 'calendar items', tone: 'violet' },
    { label: 'Finance', value: formatCompactMoney(moneyDue, currency), detail: 'invoices + bills due', tone: moneyDue > 0 ? 'amber' : 'green' }
  ];
  const sevenDayPulse = buildSevenDayPulse(calendarJobs, allTasks, todayKey);
  const strongestPulse = Math.max(1, ...sevenDayPulse.map((day) => day.total));

  return (
    <section className="page-fade today-page">
      <article className="today-briefing-card">
        <div className="today-main">
          <div className="today-profile-row">
            <p className="eyebrow">{greeting} - {formatCalendarDay(todayKey)}</p>
            <span>{urgentTasks.length > 0 ? `${urgentTasks.length} urgent` : 'Clear priority lane'}</span>
          </div>
          <h2>Today starts with {todayFocus}</h2>
          <p>{todayReason}</p>
          <div className="today-signal-row">
            <span><Sparkles size={14} /> Focus selected from live work</span>
            <span><Clock3 size={14} /> {todayJobs.length ? `${todayJobs.length} today` : 'No fixed work today'}</span>
            <span><ShieldCheck size={14} /> Private command centre</span>
          </div>
          <div className="today-actions">
            <button className="primary-action" onClick={() => setScreen('crm')}>
              <BriefcaseBusiness size={16} />
              Open calendar
            </button>
            <button className="secondary-action" onClick={() => setScreen('crm')}>
              <ListTodo size={16} />
              Review tasks
            </button>
            <button className="secondary-action" onClick={() => setScreen('xero')}>
              <WalletCards size={16} />
              Check Xero
            </button>
          </div>
        </div>
        <div className="today-insight-stack">
          <article className="today-performance-card">
            <div>
              <span>Workload pulse</span>
              <strong>{sevenDayPulse.reduce((sum, day) => sum + day.total, 0)}</strong>
              <small>items across the next 7 days</small>
            </div>
            <div className="today-hero-chart" aria-label="Seven day workload preview">
              {sevenDayPulse.map((day) => (
                <i key={day.date} title={`${day.label}: ${day.total}`} style={{ height: `${Math.max(10, (day.total / strongestPulse) * 100)}%` }} />
              ))}
            </div>
          </article>
          <div className="today-pulse">
            {todayMetrics.map((metric) => (
              <article className={`today-pulse-card ${metric.tone}`} key={metric.label}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
                <small>{metric.detail}</small>
              </article>
            ))}
          </div>
        </div>
      </article>

      <section className="today-grid">
        <article className="glass-card wide today-panel">
          <PanelTitle eyebrow="Today" title="Scheduled work" />
          <div className="today-list">
            {(todayJobs.length ? todayJobs : nextJobs.slice(0, 3)).map((job) => (
              <button className="today-job-row" onClick={() => setScreen('crm')} key={`${job.sourceKind}-${job.id}`}>
                <span className={`priority-dot priority-${(job.priority || 'none').toLowerCase()}`} />
                <div>
                  <strong>{job.title}</strong>
                  <p>{[job.client, job.location, job.sourceLabel].filter(Boolean).join(' - ') || 'No details yet'}</p>
                </div>
                <em>{job.jobDate === todayKey ? 'Today' : job.jobDate}</em>
              </button>
            ))}
            {!todayJobs.length && !nextJobs.length && <p className="empty-state">No dated jobs or Shoot Date tasks found yet.</p>}
          </div>
        </article>

        <article className="glass-card wide today-panel">
          <PanelTitle eyebrow="Noah recommends" title="Priority stack" />
          <div className="priority-list">
            {(urgentTasks.length > 0 ? urgentTasks.map((task) => ({
              title: task.title,
              detail: `${task.status || 'Active'}${task.dueDate ? ` - ${task.dueState} ${task.dueDate}` : ''}`,
              signal: task.priority || 'Task',
              status: task.dueState === 'Overdue' ? 'critical' : task.priority === 'High' ? 'warning' : 'active'
            })) : priorities).map((priority) => (
              <div className={`priority-row ${priority.status}`} key={priority.title}>
                <div>
                  <strong>{priority.title}</strong>
                  <p>{priority.detail}</p>
                </div>
                <span>{priority.signal}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="today-analytics-row">
        <article className="glass-card wide today-chart-panel">
          <PanelTitle eyebrow="7 day shape" title="Workload pulse" />
          <div className="today-mini-chart">
            {sevenDayPulse.map((day) => (
              <div key={day.date}>
                <span>{day.label}</span>
                <div>
                  <i style={{ height: `${Math.max(8, day.total * 18)}px` }} />
                </div>
                <strong>{day.total}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="glass-card wide">
          <PanelTitle eyebrow="Ask Noah" title="Plan the next move" />
          <p className="section-copy">Ask for a priority call, a job summary, or what to move first today.</p>
          <CommandBar command={command} setCommand={setCommand} sendCommand={sendCommand} />
        </article>
      </section>

      <section className="briefing-strip">
        {[
          { label: 'Memory focus', value: smartBriefing.mainFocus, detail: smartBriefing.firstAction },
          { label: 'Risk', value: smartBriefing.risk, detail: 'Noah is watching for scattered context and loose tasks.' },
          { label: 'Inbox', value: inboxSummary[0]?.value || '0', detail: inboxSummary[0]?.detail || 'Captured items ready for review.' }
        ].map((item) => (
          <article key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <p>{item.detail}</p>
          </article>
        ))}
      </section>

      <section className="home-command-strip">
        <button onClick={() => setScreen('crm')}>
          <Kanban size={18} />
          <span>Pipeline</span>
          <strong>{jobsReport.pipelineTasks.filter((task) => !isCompleteNotionTask(task)).length} active</strong>
        </button>
        <button onClick={() => setScreen('crm')}>
          <BriefcaseBusiness size={18} />
          <span>Next job</span>
          <strong>{nextJobs[0]?.title || 'No dated job'}</strong>
        </button>
        <button onClick={() => setScreen('xero')}>
          <WalletCards size={18} />
          <span>Finance due</span>
          <strong>{formatCompactMoney(moneyDue, currency)}</strong>
        </button>
      </section>

      <section className="split-grid lower-grid">
        <article className="glass-card wide">
          <PanelTitle eyebrow="Capture" title="Give Noah something to remember" />
          <div className="capture-input">
            <input
              value={capture}
              onChange={(event) => setCapture(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') addCapture();
              }}
              placeholder="Capture a task, decision, client note, or loose thought..."
            />
            <button onClick={addCapture}>Save</button>
          </div>
          <div className="capture-list">
            {notes.length === 0 ? (
              <p className="empty-state">Nothing captured yet. Add one thought Noah should keep close.</p>
            ) : (
              notes.slice(0, 4).map((note) => (
                <div className="capture-note" key={note.id}>
                  <div>
                    <span className={`memory-chip ${note.category}`}>{formatCategory(note.category)}</span>
                    <p>{note.text}</p>
                  </div>
                  <time>{note.createdAt}</time>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="glass-card wide">
          <PanelTitle eyebrow="Review" title="Awaiting attention" />
          <div className="approval-list">
            {(urgentTasks.length ? urgentTasks.slice(0, 3).map((task) => ({
              title: task.title,
              detail: task.description || `${task.status} - ${task.dueState}`,
              source: task.priority || 'Task'
            })) : approvalItems).map((item) => (
              <div className="approval-row" key={item.title}>
                <CircleAlert size={20} />
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.detail}</p>
                  <span>{item.source}</span>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </section>
  );
}

function Noah({
  messages,
  command,
  setCommand,
  sendCommand,
  notes,
  smartBriefing,
  isNoahThinking
}: {
  messages: ChatMessage[];
  command: string;
  setCommand: (value: string) => void;
  sendCommand: () => void;
  notes: CaptureNote[];
  smartBriefing: SmartBriefing;
  isNoahThinking: boolean;
}) {
  const counts = countByCategory(notes);
  const copyMessage = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };

  return (
    <section className="chat-layout page-fade">
      <div className="chat">
        <div className="chat-intro">
          <MessageSquareText size={24} />
          <div>
            <h2>Conversation with Noah</h2>
            <p>Ask for priorities, draft a follow-up, or turn a messy thought into a clear next action.</p>
          </div>
        </div>

        <div className="chat-log">
          {messages.map((message, index) => (
            <div className={`bubble-wrap ${message.role}`} key={`${message.role}-${index}`}>
              <div className={`bubble ${message.role}`}>
                <MarkdownText text={message.text} />
                {message.role === 'noah' && (
                  <div className="bubble-actions">
                    <button aria-label="Copy text" title="Copy text" onClick={() => void copyMessage(message.text)}>
                      <Copy size={15} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isNoahThinking && (
            <div className="bubble-wrap noah">
              <div className="bubble noah thinking-bubble">Noah is thinking...</div>
            </div>
          )}
        </div>

        <CommandBar command={command} setCommand={setCommand} sendCommand={sendCommand} docked />
      </div>

      <aside className="context-panel">
        <PanelTitle eyebrow="Noah sees" title="Memory context" />
        <div className="context-brief">
          <strong>{smartBriefing.mainFocus}</strong>
          <p>{smartBriefing.risk} - {smartBriefing.firstAction}</p>
        </div>
        <div className="context-counts">
          {(['task', 'client', 'project', 'decision', 'approval', 'memory'] as CaptureCategory[]).map((category) => (
            <div key={category}>
              <span className={`memory-chip ${category}`}>{formatCategory(category)}</span>
              <strong>{counts[category]}</strong>
            </div>
          ))}
        </div>
        <div className="context-list">
          {notes.length === 0 ? (
            <p className="empty-state">No memory captured yet.</p>
          ) : (
            notes.slice(0, 5).map((note) => (
              <div className="context-note" key={note.id}>
                <span className={`memory-chip ${note.category}`}>{formatCategory(note.category)}</span>
                <p>{note.text}</p>
              </div>
            ))
          )}
        </div>
      </aside>
    </section>
  );
}

function Memory({ notes }: { notes: CaptureNote[] }) {
  const groupedNotes = groupNotes(notes);

  return (
    <section className="page-fade">
      <article className="glass-card wide">
        <PanelTitle eyebrow="Memory foundation" title="What Noah should know first" />
        <p className="section-copy">
          Memory is what makes Noah feel personal. Start with stable facts, project context, client context, workflow
          preferences, and decisions worth carrying forward.
        </p>
      </article>
      <div className="memory-grid">
        {memoryItems.map((item) => (
          <article className="glass-card memory-card" key={item.label}>
            <p>{item.label}</p>
            <h3>{item.value}</h3>
            <span>{item.detail}</span>
          </article>
        ))}
      </div>
      <article className="glass-card wide memory-inbox">
        <PanelTitle eyebrow="Memory inbox" title="Captured context" />
        {notes.length === 0 ? (
          <p className="empty-state">Capture tasks, decisions, project notes, and client context from the Today screen.</p>
        ) : (
          <div className="memory-columns">
            {groupedNotes.map((group) => (
              <section className="memory-column" key={group.category}>
                <div className="memory-column-head">
                  <span className={`memory-chip ${group.category}`}>{formatCategory(group.category)}</span>
                  <strong>{group.items.length}</strong>
                </div>
                {group.items.slice(0, 5).map((note) => (
                  <div className="memory-note" key={note.id}>
                    <p>{note.text}</p>
                    <time>{note.createdAt}</time>
                  </div>
                ))}
              </section>
            ))}
          </div>
        )}
      </article>
    </section>
  );
}

function Automations() {
  return (
    <section className="page-fade">
      <article className="glass-card wide">
        <PanelTitle eyebrow="n8n bridge" title="Automation layer" />
        <p className="section-copy">
          Automations should feel helpful, quiet, and controlled. NoA decides what matters and asks for approval; n8n
          handles the repeatable background work.
        </p>
      </article>
      <div className="automation-grid">
        {automations.map((automation) => (
          <article className="automation-card" key={automation.name}>
            <div className="automation-head">
              <WorkflowIcon state={automation.state} />
              <div>
                <h3>{automation.name}</h3>
                <p>{automation.trigger}</p>
              </div>
            </div>
            <span>{automation.result}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

type MapMode = 'overview' | 'live' | 'debug' | 'focus';
type MapNodeStatus = 'connected' | 'syncing' | 'idle' | 'error' | 'needs-auth';
type MapNodeCategory = 'AI / Reasoning' | 'Data Sources' | 'App Backend' | 'Communication' | 'Display Outputs' | 'Automation / Deployment';
type MapDirection = 'in' | 'out' | 'two-way' | 'dependency';
type MapDomain = 'work' | 'finance' | 'communication' | 'backend' | 'display';
const MAP_CANVAS_WIDTH = 1000;
const MAP_CANVAS_HEIGHT = 620;
const MAP_CANVAS_PADDING = 36;
const MAP_FIT_MIN_ZOOM = 0.26;
const MAP_MIN_ZOOM = 0.32;
const MAP_MAX_ZOOM = 1.55;
const MAP_WHEEL_SENSITIVITY = 0.00035;

type IntegrationNode = {
  id: string;
  label: string;
  type: MapNodeCategory;
  domain: MapDomain;
  description: string;
  icon: React.ElementType;
  status: MapNodeStatus;
  lastSync: string;
  health: number;
  metadata: string;
  data: string[];
  features: string[];
  config: string[];
  error?: string;
  x: number;
  y: number;
  dominant?: boolean;
  integrationId?: IntegrationId;
  route?: Screen;
};

type IntegrationConnection = {
  source: string;
  target: string;
  label: string;
  direction: MapDirection;
  status: MapNodeStatus;
  animated: boolean;
  description: string;
};

const mapModes: Array<{ id: MapMode; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'live', label: 'Live' },
  { id: 'debug', label: 'Debug' },
  { id: 'focus', label: 'Focus' }
];

const mapDomains: Array<{ id: 'all' | MapDomain; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'work', label: 'Work' },
  { id: 'finance', label: 'Finance' },
  { id: 'communication', label: 'Comms' },
  { id: 'backend', label: 'Backend' },
  { id: 'display', label: 'Displays' }
];

function getPointDistance(first: { x: number; y: number }, second: { x: number; y: number }) {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function clampValue(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

const baseMapNodes: IntegrationNode[] = [
  {
    id: 'core',
    label: 'NoA Core',
    type: 'AI / Reasoning',
    domain: 'backend',
    description: 'AI reasoning, policy, orchestration, and user intent layer.',
    icon: BrainCircuit,
    status: 'connected',
    lastSync: 'Live',
    health: 96,
    metadata: 'Reasoning hub',
    data: ['Tool routing', 'User context', 'Approval policy', 'Response planning'],
    features: ['Noah chat', 'Today card', 'Map orchestration', 'Automation decisions'],
    config: ['OPENAI_API_KEY', 'NOA_PIN_CODE'],
    x: 500,
    y: 310,
    dominant: true,
    integrationId: 'openai',
    route: 'noah'
  },
  {
    id: 'notion',
    label: 'Notion',
    type: 'Data Sources',
    domain: 'work',
    description: 'Tasks, jobs, notes, clients, pipeline state, and linked work context.',
    icon: ListTodo,
    status: 'connected',
    lastSync: '2 min ago',
    health: 91,
    metadata: 'Tasks / jobs / clients',
    data: ['Tasks', 'Jobs', 'Clients', 'Pipeline statuses', 'Google Drive links'],
    features: ['CRM', 'Pipeline', 'Calendar', 'Clients', 'Today focus'],
    config: ['NOTION_TOKEN', 'NOTION_TASKS_DATABASE_ID', 'NOTION_JOBS_DATABASE_ID', 'NOTION_CLIENTS_DATABASE_ID'],
    x: 220,
    y: 130,
    integrationId: 'notion',
    route: 'crm'
  },
  {
    id: 'supabase',
    label: 'Supabase',
    type: 'App Backend',
    domain: 'backend',
    description: 'Application database, private settings, auth support, and budget data bridge.',
    icon: Database,
    status: 'connected',
    lastSync: '1 min ago',
    health: 94,
    metadata: 'Database / settings',
    data: ['Budget rows', 'Private tokens', 'Integration settings', 'App state'],
    features: ['Budgeting', 'Xero token storage', 'Integration setup', 'Secure backend reads'],
    config: ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'],
    x: 520,
    y: 95,
    integrationId: 'supabase',
    route: 'budgeting'
  },
  {
    id: 'gmail',
    label: 'Gmail',
    type: 'Communication',
    domain: 'communication',
    description: 'Email intake, scheduled tenant notices, invoice context, and user communication.',
    icon: Mail,
    status: 'needs-auth',
    lastSync: 'Waiting for OAuth',
    health: 62,
    metadata: 'Email input',
    data: ['Inbox signals', 'Tenant emails', 'Receipts', 'Client threads'],
    features: ['Budget automation', 'Email intake', 'Noah summaries'],
    config: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN'],
    error: 'OAuth credentials are required before automated Gmail actions can run.',
    x: 785,
    y: 130,
    integrationId: 'email',
    route: 'integrations'
  },
  {
    id: 'calendar',
    label: 'Google Calendar',
    type: 'Data Sources',
    domain: 'work',
    description: 'Schedule awareness for job dates, reminders, and day planning.',
    icon: CalendarDays,
    status: 'idle',
    lastSync: 'Ready',
    health: 76,
    metadata: 'Schedule awareness',
    data: ['Events', 'Job reminders', 'Availability windows'],
    features: ['Today card', 'CRM calendar', 'Planning'],
    config: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
    x: 835,
    y: 310,
    route: 'crm'
  },
  {
    id: 'xero',
    label: 'Xero',
    type: 'Data Sources',
    domain: 'finance',
    description: 'Invoices, bills, contacts, accounts, cashflow, and finance analytics.',
    icon: CreditCard,
    status: 'connected',
    lastSync: '4 min ago',
    health: 88,
    metadata: 'Finance layer',
    data: ['Invoices', 'Bills', 'Contacts', 'Balances', 'Cashflow'],
    features: ['Xero overview', 'Bills', 'Invoices', 'Client finance intelligence'],
    config: ['XERO_CLIENT_ID', 'XERO_CLIENT_SECRET', 'XERO_TENANT_ID'],
    x: 730,
    y: 520,
    integrationId: 'xero',
    route: 'xero'
  },
  {
    id: 'vercel',
    label: 'Vercel',
    type: 'Automation / Deployment',
    domain: 'backend',
    description: 'Deployment, hosting, serverless runtime, and public app delivery.',
    icon: Cloud,
    status: 'connected',
    lastSync: 'Deployment live',
    health: 87,
    metadata: 'Runtime / hosting',
    data: ['Deployments', 'Runtime health', 'Environment variables'],
    features: ['Remote mobile access', 'Serverless APIs', 'Public PWA'],
    config: ['VERCEL_PROJECT_ID', 'VERCEL_ENVIRONMENT'],
    x: 500,
    y: 535,
    route: 'integrations'
  },
  {
    id: 'weather',
    label: 'Weather',
    type: 'Data Sources',
    domain: 'work',
    description: 'Live weather telemetry for shoot planning and job-day awareness.',
    icon: CloudSun,
    status: 'syncing',
    lastSync: 'Updating',
    health: 82,
    metadata: 'Telemetry',
    data: ['Forecast', 'Conditions', 'Shoot-day risk'],
    features: ['Today card', 'Job preparation', 'Map telemetry'],
    config: ['WEATHER_API_KEY'],
    x: 260,
    y: 510,
    route: 'today'
  },
  {
    id: 'spotify',
    label: 'Spotify',
    type: 'Data Sources',
    domain: 'display',
    description: 'Currently playing media state and ambience signals.',
    icon: Music,
    status: 'idle',
    lastSync: 'Idle',
    health: 73,
    metadata: 'Media state',
    data: ['Track', 'Playback state', 'Device context'],
    features: ['Ambient dashboard', 'Map telemetry'],
    config: ['SPOTIFY_CLIENT_ID', 'SPOTIFY_CLIENT_SECRET', 'SPOTIFY_REFRESH_TOKEN'],
    x: 155,
    y: 320,
    route: 'integrations'
  },
  {
    id: 'dashboards',
    label: 'Dashboard Displays',
    type: 'Display Outputs',
    domain: 'display',
    description: 'Screens, tablets, widgets, kiosk views, and visual output surfaces.',
    icon: MonitorSmartphone,
    status: 'connected',
    lastSync: 'Live',
    health: 90,
    metadata: 'Output surfaces',
    data: ['Today view', 'Map', 'Calendar', 'Finance cards'],
    features: ['Tablet kiosk', 'Mobile PWA', 'Desktop command centre'],
    config: ['PWA_MANIFEST', 'SERVICE_WORKER_CACHE'],
    x: 845,
    y: 455,
    route: 'today'
  }
];

const mapConnections: IntegrationConnection[] = [
  { source: 'notion', target: 'core', label: 'Work context', direction: 'in', status: 'connected', animated: true, description: 'Reads tasks, jobs, clients, notes, and pipeline updates.' },
  { source: 'core', target: 'notion', label: 'Task updates', direction: 'out', status: 'connected', animated: true, description: 'Pushes status changes, edits, new tasks, and linked job updates.' },
  { source: 'supabase', target: 'core', label: 'App state', direction: 'two-way', status: 'connected', animated: true, description: 'Stores private settings, budget records, tokens, and app state.' },
  { source: 'gmail', target: 'core', label: 'Email intake', direction: 'in', status: 'needs-auth', animated: false, description: 'Will read approved email signals and prepare communication workflows.' },
  { source: 'core', target: 'gmail', label: 'Approved sends', direction: 'out', status: 'needs-auth', animated: false, description: 'Sends tenant notices and drafted messages only after configured approval.' },
  { source: 'calendar', target: 'core', label: 'Schedule awareness', direction: 'in', status: 'idle', animated: false, description: 'Provides event context and planning windows.' },
  { source: 'xero', target: 'core', label: 'Finance intelligence', direction: 'in', status: 'connected', animated: true, description: 'Pulls invoices, bills, contacts, balances, and cashflow analytics.' },
  { source: 'core', target: 'vercel', label: 'Runtime dependency', direction: 'dependency', status: 'connected', animated: false, description: 'Uses Vercel deployment and serverless functions for remote access.' },
  { source: 'weather', target: 'core', label: 'Shoot telemetry', direction: 'in', status: 'syncing', animated: true, description: 'Feeds weather signals into shoot-day planning.' },
  { source: 'spotify', target: 'core', label: 'Media state', direction: 'in', status: 'idle', animated: false, description: 'Feeds current playback state into display surfaces.' },
  { source: 'core', target: 'dashboards', label: 'Visual output', direction: 'out', status: 'connected', animated: true, description: 'Publishes processed context into desktop, tablet, mobile, and kiosk views.' },
  { source: 'notion', target: 'dashboards', label: 'Job calendar', direction: 'out', status: 'connected', animated: true, description: 'Surfaces upcoming jobs and task calendars as readable dashboards.' },
  { source: 'xero', target: 'dashboards', label: 'Finance views', direction: 'out', status: 'connected', animated: true, description: 'Displays invoice, bill, cashflow, and client finance analytics.' },
  { source: 'supabase', target: 'dashboards', label: 'Budget views', direction: 'out', status: 'connected', animated: true, description: 'Displays ledger, mortgage, fuel, and budget analytics.' }
];

function MapView({
  integrationStatus,
  testResults,
  jobsReport,
  xeroReport,
  budgetReport,
  isLoadingJobs,
  isLoadingXero,
  isLoadingBudget,
  setScreen,
  runIntegrationTests
}: {
  integrationStatus: IntegrationStatus;
  testResults: IntegrationTestResult[];
  jobsReport: NotionJobsReport;
  xeroReport: XeroReport;
  budgetReport: BudgetReport;
  isLoadingJobs: boolean;
  isLoadingXero: boolean;
  isLoadingBudget: boolean;
  setScreen: (screen: Screen) => void;
  runIntegrationTests: () => Promise<IntegrationTestResult[]>;
}) {
  const [mode, setMode] = useState<MapMode>(() => getStoredMapMode());
  const [selectedNodeId, setSelectedNodeId] = useState(() => window.localStorage.getItem('noa.map.selectedNode') || 'core');
  const [hoveredNodeId, setHoveredNodeId] = useState('');
  const [hoveredConnectionIndex, setHoveredConnectionIndex] = useState<number | null>(null);
  const [domainFilter, setDomainFilter] = useState<'all' | MapDomain>(() => getStoredMapDomain());
  const [showIssuesOnly, setShowIssuesOnly] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [actionMessage, setActionMessage] = useState('');
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ pointerId: number; x: number; y: number; panX: number; panY: number } | null>(null);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{ distance: number; zoom: number; panX: number; panY: number; centerX: number; centerY: number } | null>(null);
  const mapNodes = useMemo(() => buildRuntimeMapNodes({
    integrationStatus,
    testResults,
    jobsReport,
    xeroReport,
    budgetReport,
    isLoadingJobs,
    isLoadingXero,
    isLoadingBudget
  }), [integrationStatus, testResults, jobsReport, xeroReport, budgetReport, isLoadingJobs, isLoadingXero, isLoadingBudget]);
  const mapConnections = useMemo(() => buildRuntimeMapConnections(mapNodes), [mapNodes]);
  const selectedNode = mapNodes.find((node) => node.id === selectedNodeId) || mapNodes[0];
  const issueNodes = mapNodes.filter((node) => isMapIssue(node));
  const hoveredConnection = hoveredConnectionIndex === null ? null : mapConnections[hoveredConnectionIndex];
  const hoveredConnectionNodes = hoveredConnection
    ? {
        source: mapNodes.find((node) => node.id === hoveredConnection.source),
        target: mapNodes.find((node) => node.id === hoveredConnection.target)
      }
    : null;
  const activeNodeId = hoveredNodeId || (mode === 'focus' ? selectedNode.id : '');
  const categorySummaries = useMemo(() => {
    const categories: MapNodeCategory[] = ['AI / Reasoning', 'Data Sources', 'App Backend', 'Communication', 'Display Outputs', 'Automation / Deployment'];
    return categories.map((category) => {
      const nodes = mapNodes.filter((node) => node.type === category);
      const healthy = nodes.filter((node) => ['connected', 'syncing', 'idle'].includes(node.status)).length;
      return { category, count: nodes.length, healthy };
    });
  }, [mapNodes]);

  const connectedIds = useMemo(() => {
    if (!activeNodeId) return new Set<string>();
    return new Set(mapConnections.flatMap((connection) => (
      connection.source === activeNodeId || connection.target === activeNodeId
        ? [connection.source, connection.target]
        : []
    )));
  }, [activeNodeId, mapConnections]);

  useEffect(() => {
    window.localStorage.setItem('noa.map.mode', mode);
  }, [mode]);

  useEffect(() => {
    window.localStorage.setItem('noa.map.selectedNode', selectedNode.id);
  }, [selectedNode.id]);

  useEffect(() => {
    window.localStorage.setItem('noa.map.domain', domainFilter);
  }, [domainFilter]);

  const getCanvasViewport = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return { width: canvas.clientWidth, height: canvas.clientHeight };
  };

  const clampMapPan = (nextPan: { x: number; y: number }, nextZoom: number) => {
    const viewport = getCanvasViewport();
    if (!viewport) return nextPan;
    const contentWidth = MAP_CANVAS_WIDTH * nextZoom;
    const contentHeight = MAP_CANVAS_HEIGHT * nextZoom;
    const clampAxis = (nextValue: number, viewportSize: number, contentSize: number) => {
      if (contentSize <= viewportSize - MAP_CANVAS_PADDING * 2) {
        return Math.round((viewportSize - contentSize) / 2);
      }
      return Math.round(clampValue(nextValue, viewportSize - contentSize - MAP_CANVAS_PADDING, MAP_CANVAS_PADDING));
    };
    return {
      x: clampAxis(nextPan.x, viewport.width, contentWidth),
      y: clampAxis(nextPan.y, viewport.height, contentHeight)
    };
  };

  const getFittedMapViewport = () => {
    const viewport = getCanvasViewport();
    if (!viewport) return null;
    const { width, height } = viewport;
    const fitZoom = Math.min(
      1,
      Math.max(
        MAP_FIT_MIN_ZOOM,
        Math.min((width - MAP_CANVAS_PADDING * 2) / MAP_CANVAS_WIDTH, (height - MAP_CANVAS_PADDING * 2) / MAP_CANVAS_HEIGHT)
      )
    );
    const nextZoom = Number(fitZoom.toFixed(3));
    return {
      zoom: nextZoom,
      pan: {
        x: Math.round((width - MAP_CANVAS_WIDTH * nextZoom) / 2),
        y: Math.round((height - MAP_CANVAS_HEIGHT * nextZoom) / 2)
      }
    };
  };

  const fitCanvas = () => {
    const fitted = getFittedMapViewport();
    if (!fitted) return;
    setZoom(fitted.zoom);
    setPan(fitted.pan);
  };

  const zoomCanvasAt = (clientX: number, clientY: number, nextZoom: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clampedZoom = Number(clampValue(nextZoom, MAP_MIN_ZOOM, MAP_MAX_ZOOM).toFixed(3));
    const originX = clientX - rect.left;
    const originY = clientY - rect.top;
    const contentX = (originX - pan.x) / zoom;
    const contentY = (originY - pan.y) / zoom;
    setZoom(clampedZoom);
    setPan(clampMapPan({
      x: originX - contentX * clampedZoom,
      y: originY - contentY * clampedZoom
    }, clampedZoom));
  };

  useEffect(() => {
    fitCanvas();
    const canvas = canvasRef.current;
    if (!canvas || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(() => fitCanvas());
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  const handleCanvasWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const nextZoom = zoom * Math.exp(-event.deltaY * MAP_WHEEL_SENSITIVITY);
    zoomCanvasAt(event.clientX, event.clientY, nextZoom);
  };

  const beginPan = (event: React.PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest('.map-node') || target.closest('.map-canvas-toolbar')) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    event.currentTarget.setPointerCapture(event.pointerId);
    if (pointersRef.current.size === 2) {
      const [first, second] = Array.from(pointersRef.current.values());
      pinchRef.current = {
        distance: getPointDistance(first, second),
        zoom,
        panX: pan.x,
        panY: pan.y,
        centerX: (first.x + second.x) / 2,
        centerY: (first.y + second.y) / 2
      };
      dragRef.current = null;
      return;
    }
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y };
  };

  const movePan = (event: React.PointerEvent<HTMLDivElement>) => {
    if (pointersRef.current.has(event.pointerId)) {
      pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    }
    if (pointersRef.current.size >= 2 && pinchRef.current) {
      const [first, second] = Array.from(pointersRef.current.values());
      const nextDistance = getPointDistance(first, second);
      const nextCenter = { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
      const nextZoom = Number(clampValue(pinchRef.current.zoom * (nextDistance / pinchRef.current.distance), MAP_MIN_ZOOM, MAP_MAX_ZOOM).toFixed(3));
      const contentX = (pinchRef.current.centerX - (canvasRef.current?.getBoundingClientRect().left || 0) - pinchRef.current.panX) / pinchRef.current.zoom;
      const contentY = (pinchRef.current.centerY - (canvasRef.current?.getBoundingClientRect().top || 0) - pinchRef.current.panY) / pinchRef.current.zoom;
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      const originX = canvasRect ? nextCenter.x - canvasRect.left : nextCenter.x;
      const originY = canvasRect ? nextCenter.y - canvasRect.top : nextCenter.y;
      setZoom(nextZoom);
      setPan(clampMapPan({
        x: originX - contentX * nextZoom,
        y: originY - contentY * nextZoom
      }, nextZoom));
      return;
    }
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setPan(clampMapPan({
      x: drag.panX + event.clientX - drag.x,
      y: drag.panY + event.clientY - drag.y
    }, zoom));
  };

  const endPan = (event: React.PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(event.pointerId);
    pinchRef.current = null;
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  };

  const testSelectedIntegration = async () => {
    if (!selectedNode.integrationId) return;
    setActionMessage(`Testing ${selectedNode.label}...`);
    const results = await runIntegrationTests();
    const result = [...results].reverse().find((item) => item.id === selectedNode.integrationId);
    setActionMessage(result ? `${selectedNode.label}: ${result.message}` : `Test run completed. ${selectedNode.label} did not return a direct result.`);
  };

  const copyConfigKeys = async () => {
    await navigator.clipboard.writeText(selectedNode.config.join('\n'));
    setActionMessage(`Copied ${selectedNode.label} config keys.`);
  };

  return (
    <section className="map-page page-fade">
      <article className="map-hero">
        <div>
          <PanelTitle eyebrow="System intelligence" title="Orchestration Map" />
          <p className="section-copy">
            A live-facing view of how NoA reasons across integrations, data sources, automation surfaces, and dashboards.
          </p>
        </div>
          <div className="map-mode-switcher" role="tablist" aria-label="Map mode">
            {mapModes.map((item) => (
              <button key={item.id} className={mode === item.id ? 'active' : ''} onClick={() => setMode(item.id)}>
                {item.label}
              </button>
            ))}
          </div>
      </article>

      <section className={`map-shell map-mode-${mode}`}>
        <aside className="map-sidebar">
          <PanelTitle eyebrow="Categories" title="Integration groups" />
          <div className="map-domain-filter" aria-label="Map domain filter">
            {mapDomains.map((domain) => (
              <button key={domain.id} className={domainFilter === domain.id ? 'active' : ''} onClick={() => setDomainFilter(domain.id)}>
                {domain.label}
              </button>
            ))}
          </div>
          <div className="map-category-list">
            {categorySummaries.map((summary) => (
              <button
                key={summary.category}
                onClick={() => {
                  const firstNode = mapNodes.find((node) => node.type === summary.category);
                  if (firstNode) setSelectedNodeId(firstNode.id);
                  setMode('focus');
                }}
              >
                <span>{summary.category}</span>
                <strong>{summary.healthy}/{summary.count}</strong>
              </button>
            ))}
          </div>
          <div className="map-health-card">
            <span>System health</span>
            <strong>{Math.round(mapNodes.reduce((sum, node) => sum + node.health, 0) / mapNodes.length)}%</strong>
            <small>{issueNodes.length ? `${issueNodes.length} issue${issueNodes.length === 1 ? '' : 's'} visible` : `${mapConnections.filter((connection) => connection.animated).length} active pathways`}</small>
          </div>
          <div className="map-issue-panel">
            <div className="map-issue-head">
              <span>Issues</span>
              <button className={showIssuesOnly ? 'active' : ''} onClick={() => setShowIssuesOnly((current) => !current)}>
                {showIssuesOnly ? 'Show all' : 'Filter'}
              </button>
            </div>
            {issueNodes.length === 0 ? (
              <p>No critical integration issues detected.</p>
            ) : (
              issueNodes.map((node) => (
                <button key={node.id} onClick={() => {
                  setSelectedNodeId(node.id);
                  setMode('debug');
                }}>
                  <strong>{node.label}</strong>
                  <span>{node.error || `${node.health}% health`}</span>
                </button>
              ))
            )}
          </div>
        </aside>

        <div className="map-canvas-shell">
          <div className="map-canvas-toolbar">
            <span>{mode === 'debug' ? 'Latency and auth view' : mode === 'live' ? 'Animated activity view' : mode === 'focus' ? 'Focused dependency path' : 'Complete ecosystem'}</span>
            <div>
              <button type="button" aria-label="Fit map to view" onClick={fitCanvas}>Fit</button>
              <span>{Math.round(zoom * 100)}%</span>
            </div>
          </div>

          <div
            ref={canvasRef}
            className="map-canvas"
            onMouseLeave={() => setHoveredNodeId('')}
            onWheel={handleCanvasWheel}
            onPointerDown={beginPan}
            onPointerMove={movePan}
            onPointerUp={endPan}
            onPointerCancel={endPan}
            onDoubleClick={fitCanvas}
          >
            <div className="map-viewport-inner" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
            <svg className="map-connections" viewBox="0 0 1000 620" aria-hidden="true">
              <defs>
                <marker id="map-arrow" markerWidth="10" markerHeight="10" refX="7" refY="3" orient="auto" markerUnits="strokeWidth">
                  <path d="M0,0 L0,6 L8,3 z" />
                </marker>
                <marker id="map-arrow-start" markerWidth="10" markerHeight="10" refX="1" refY="3" orient="auto" markerUnits="strokeWidth">
                  <path d="M8,0 L8,6 L0,3 z" />
                </marker>
              </defs>
              {mapConnections.map((connection, index) => {
                const source = mapNodes.find((node) => node.id === connection.source);
                const target = mapNodes.find((node) => node.id === connection.target);
                if (!source || !target) return null;
                const path = getMapConnectionPath(source, target, index);
                const isRelated = !activeNodeId || connection.source === activeNodeId || connection.target === activeNodeId;
                const isHovered = hoveredConnectionIndex === index;
                const shouldAnimate = connection.animated && (mode === 'live' || mode === 'overview') && isRelated;
                const isDomainFiltered = domainFilter !== 'all' && source.domain !== domainFilter && target.domain !== domainFilter;
                const isIssueFiltered = showIssuesOnly && !isMapIssue(source) && !isMapIssue(target);
                return (
                  <g
                    key={`${connection.source}-${connection.target}-${connection.label}`}
                    className={`map-connection ${statusClass(connection.status)} ${isRelated && !isDomainFiltered && !isIssueFiltered ? 'related' : 'dimmed'} ${isHovered ? 'hovered' : ''}`}
                    onMouseEnter={() => setHoveredConnectionIndex(index)}
                    onMouseLeave={() => setHoveredConnectionIndex(null)}
                  >
                    <path className="map-connection-hit" d={path} />
                    <path
                      id={`map-path-${index}`}
                      className="map-connection-line"
                      d={path}
                      markerEnd={connection.direction !== 'in' ? 'url(#map-arrow)' : undefined}
                      markerStart={connection.direction === 'two-way' || connection.direction === 'in' ? 'url(#map-arrow-start)' : undefined}
                    />
                    {shouldAnimate && (
                      <circle r="4" className="map-flow-dot">
                        <animateMotion dur={`${3.4 + (index % 4) * 0.35}s`} repeatCount="indefinite">
                          <mpath href={`#map-path-${index}`} />
                        </animateMotion>
                      </circle>
                    )}
                    {(isHovered || (mode === 'debug' && connection.status !== 'connected')) && (
                      <text className="map-connection-label" x={(source.x + target.x) / 2} y={(source.y + target.y) / 2 - 12}>
                        {connection.label}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
            {hoveredConnection && hoveredConnectionNodes?.source && hoveredConnectionNodes.target && (
              <div
                className="map-connection-tooltip"
                style={{
                  left: `${(hoveredConnectionNodes.source.x + hoveredConnectionNodes.target.x) / 2}px`,
                  top: `${(hoveredConnectionNodes.source.y + hoveredConnectionNodes.target.y) / 2}px`
                }}
              >
                <strong>{hoveredConnection.label}</strong>
                <span>{hoveredConnection.direction.replace('-', ' ')} / {hoveredConnection.status.replace('-', ' ')}</span>
                <p>{hoveredConnection.description}</p>
              </div>
            )}

            {mapNodes.map((node) => {
              const Icon = node.icon;
              const isActive = selectedNodeId === node.id || hoveredNodeId === node.id;
              const isRelated = !activeNodeId || connectedIds.has(node.id) || node.id === activeNodeId;
              const isDomainFiltered = domainFilter !== 'all' && node.domain !== domainFilter;
              const isIssueFiltered = showIssuesOnly && !isMapIssue(node);
              const isDimmed = (mode === 'focus' ? !connectedIds.has(node.id) : Boolean(activeNodeId && !isRelated)) || isDomainFiltered || isIssueFiltered;
              return (
                <button
                  key={node.id}
                  className={`map-node ${node.dominant ? 'core' : ''} ${statusClass(node.status)} ${isActive ? 'active' : ''} ${isDimmed ? 'dimmed' : ''}`}
                  style={{ left: `${node.x}px`, top: `${node.y}px` }}
                  onClick={() => {
                    setSelectedNodeId(node.id);
                    if (mode === 'overview') setMode('focus');
                  }}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId('')}
                >
                  <span className="map-node-icon"><Icon size={node.dominant ? 28 : 19} /></span>
                  <span className="map-node-copy">
                    <strong>{node.label}</strong>
                    <small>{node.description}</small>
                  </span>
                  <span className={`map-node-status ${statusClass(node.status)}`}>{node.status.replace('-', ' ')}</span>
                  <span className="map-node-meta">{node.lastSync} / {node.metadata}</span>
                </button>
              );
            })}
            </div>
          </div>
        </div>

        <aside className="map-inspector">
          <div className="map-inspector-head">
            <span className="map-node-icon">{React.createElement(selectedNode.icon, { size: 20 })}</span>
            <div>
              <p className="eyebrow">{selectedNode.type}</p>
              <h3>{selectedNode.label}</h3>
            </div>
          </div>
          <div className="map-inspector-status">
            <span className={`map-node-status ${statusClass(selectedNode.status)}`}>{selectedNode.status.replace('-', ' ')}</span>
            <strong>{selectedNode.health}% health</strong>
          </div>
          <p>{selectedNode.description}</p>
          <MapInspectorBlock title="Provides" items={selectedNode.data} />
          <MapInspectorBlock title="Used by" items={selectedNode.features} />
          <MapInspectorBlock title="Config keys" items={selectedNode.config} />
          <div className="map-inspector-actions">
            <button type="button" onClick={() => setScreen(selectedNode.route || 'integrations')}>Open related page</button>
            <button type="button" onClick={() => setScreen('integrations')}>Integration settings</button>
            <button type="button" onClick={() => void copyConfigKeys()}>Copy config keys</button>
            <button type="button" onClick={() => void testSelectedIntegration()} disabled={!selectedNode.integrationId}>Test connection</button>
          </div>
          <div className="map-inspector-meta">
            <span>Last sync</span>
            <strong>{selectedNode.lastSync}</strong>
          </div>
          {actionMessage && <p className="map-action-message">{actionMessage}</p>}
          {selectedNode.error && (
            <div className="map-error-box">
              <span>Last error</span>
              <p>{selectedNode.error}</p>
            </div>
          )}
        </aside>
      </section>
    </section>
  );
}

function MapInspectorBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="map-inspector-block">
      <span>{title}</span>
      <div>
        {items.map((item) => <small key={item}>{item}</small>)}
      </div>
    </div>
  );
}

function getMapConnectionPath(source: IntegrationNode, target: IntegrationNode, index: number) {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const distance = Math.max(1, Math.hypot(dx, dy));
  const curve = index % 2 === 0 ? 0.18 : -0.18;
  const offsetX = (-dy / distance) * distance * curve;
  const offsetY = (dx / distance) * distance * curve;
  const c1x = source.x + dx * 0.36 + offsetX;
  const c1y = source.y + dy * 0.36 + offsetY;
  const c2x = source.x + dx * 0.64 + offsetX;
  const c2y = source.y + dy * 0.64 + offsetY;
  return `M ${source.x} ${source.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${target.x} ${target.y}`;
}

function statusClass(status: MapNodeStatus) {
  return `status-${status}`;
}

function buildRuntimeMapNodes({
  integrationStatus,
  testResults,
  jobsReport,
  xeroReport,
  budgetReport,
  isLoadingJobs,
  isLoadingXero,
  isLoadingBudget
}: {
  integrationStatus: IntegrationStatus;
  testResults: IntegrationTestResult[];
  jobsReport: NotionJobsReport;
  xeroReport: XeroReport;
  budgetReport: BudgetReport;
  isLoadingJobs: boolean;
  isLoadingXero: boolean;
  isLoadingBudget: boolean;
}) {
  const latestResult = (id: IntegrationId) => [...testResults].reverse().find((result) => result.id === id);
  const integrationState = (id: IntegrationId, fallback: MapNodeStatus = 'needs-auth'): MapNodeStatus => {
    const result = latestResult(id);
    if (result) return result.ok ? 'connected' : 'error';
    return integrationStatus[id] ? 'connected' : fallback;
  };

  return baseMapNodes.map((node) => {
    if (node.id === 'core') {
      const status = integrationState('openai');
      return {
        ...node,
        status,
        health: status === 'connected' ? 96 : 58,
        lastSync: latestResult('openai') ? 'Last tested' : node.lastSync,
        error: status === 'connected' ? undefined : latestResult('openai')?.message || 'OpenAI configuration has not been confirmed.'
      };
    }

    if (node.id === 'notion') {
      const hasErrors = notionHasErrors(jobsReport);
      const status: MapNodeStatus = isLoadingJobs ? 'syncing' : hasErrors ? 'error' : integrationState('notion');
      return {
        ...node,
        status,
        health: status === 'connected' ? 92 : status === 'syncing' ? 84 : 52,
        lastSync: formatMapSyncTime(jobsReport.fetchedAt, isLoadingJobs ? 'Syncing' : node.lastSync),
        metadata: `${jobsReport.taskList.length || jobsReport.tasks.length} tasks / ${jobsReport.upcomingJobs.length} jobs`,
        error: hasErrors ? [jobsReport.mainJobsError, jobsReport.tasksError, jobsReport.upcomingJobsError].filter(Boolean).join(' ') : latestResult('notion')?.ok === false ? latestResult('notion')?.message : undefined
      };
    }

    if (node.id === 'supabase') {
      const status: MapNodeStatus = isLoadingBudget ? 'syncing' : budgetReport.ok ? 'connected' : integrationState('supabase');
      return {
        ...node,
        status,
        health: status === 'connected' ? 94 : status === 'syncing' ? 82 : 55,
        lastSync: formatMapSyncTime(budgetReport.fetchedAt, isLoadingBudget ? 'Syncing' : node.lastSync),
        metadata: budgetReport.ok ? 'Budget data reachable' : 'Database/settings layer',
        error: budgetReport.ok ? undefined : budgetReport.message || latestResult('supabase')?.message
      };
    }

    if (node.id === 'gmail') {
      const status = integrationState('email');
      return {
        ...node,
        status,
        health: status === 'connected' ? 86 : status === 'error' ? 48 : 62,
        lastSync: latestResult('email') ? 'Last tested' : node.lastSync,
        error: status === 'connected' ? undefined : latestResult('email')?.message || node.error
      };
    }

    if (node.id === 'xero') {
      const status: MapNodeStatus = isLoadingXero ? 'syncing' : xeroReport.ok ? 'connected' : integrationState('xero');
      return {
        ...node,
        status,
        health: status === 'connected' ? 90 : status === 'syncing' ? 84 : 50,
        lastSync: formatMapSyncTime(xeroReport.fetchedAt, isLoadingXero ? 'Syncing' : node.lastSync),
        metadata: xeroReport.ok ? `${xeroReport.totals.invoiceCount} invoices / ${xeroReport.totals.billCount} bills` : 'Finance layer',
        error: xeroReport.ok ? undefined : xeroReport.message || latestResult('xero')?.message
      };
    }

    return node;
  });
}

function buildRuntimeMapConnections(nodes: IntegrationNode[]) {
  const nodeById = Object.fromEntries(nodes.map((node) => [node.id, node]));
  return mapConnections.map((connection) => {
    const source = nodeById[connection.source];
    const target = nodeById[connection.target];
    const status = strongestMapStatus([connection.status, source?.status, target?.status].filter(Boolean) as MapNodeStatus[]);
    return {
      ...connection,
      status,
      animated: connection.animated && status !== 'error' && status !== 'needs-auth'
    };
  });
}

function strongestMapStatus(statuses: MapNodeStatus[]): MapNodeStatus {
  if (statuses.includes('error')) return 'error';
  if (statuses.includes('needs-auth')) return 'needs-auth';
  if (statuses.includes('syncing')) return 'syncing';
  if (statuses.includes('connected')) return 'connected';
  return 'idle';
}

function isMapIssue(node: IntegrationNode) {
  return node.status === 'error' || node.status === 'needs-auth' || node.health < 70;
}

function formatMapSyncTime(value: string, fallback: string) {
  if (!value) return fallback;
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return fallback;
  const diff = Date.now() - time;
  if (diff < 60_000) return 'Just now';
  if (diff < 3_600_000) return `${Math.max(1, Math.round(diff / 60_000))} min ago`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)} hr ago`;
  return new Date(value).toLocaleDateString();
}

function getStoredMapMode(): MapMode {
  const value = window.localStorage.getItem('noa.map.mode');
  return mapModes.some((mode) => mode.id === value) ? value as MapMode : 'overview';
}

function getStoredMapDomain(): 'all' | MapDomain {
  const value = window.localStorage.getItem('noa.map.domain');
  return mapDomains.some((domain) => domain.id === value) ? value as 'all' | MapDomain : 'all';
}

function Integrations({
  integrationStatus,
  testResults,
  testCheckedAt,
  isTestingIntegrations,
  runIntegrationTests,
  recordIntegrationTestResult
}: {
  integrationStatus: IntegrationStatus;
  testResults: IntegrationTestResult[];
  testCheckedAt: string;
  isTestingIntegrations: boolean;
  runIntegrationTests: () => Promise<IntegrationTestResult[]>;
  recordIntegrationTestResult: (result: IntegrationTestResult, checkedAt: string) => void;
}) {
  const [settings, setSettings] = useState<IntegrationSettingsReport | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Record<string, string>>>({});
  const [revealedFields, setRevealedFields] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<IntegrationId | ''>('');
  const [testingId, setTestingId] = useState<IntegrationId | ''>('');
  const [revealingKey, setRevealingKey] = useState('');
  const [notice, setNotice] = useState('');

  const loadSettings = async () => {
    if (!window.noa?.getIntegrationSettings) {
      setNotice('Run NoA from the desktop app to manage saved integration settings.');
      return;
    }

    try {
      const report = await window.noa.getIntegrationSettings();
      setSettings(report);
      setNotice('');
    } catch {
      setNotice('Open NoA from the desktop app or the Windows-hosted LAN URL to manage saved integration settings.');
    }
  };

  useEffect(() => {
    void loadSettings();
  }, []);

  const saveIntegration = async (integration: IntegrationSetup) => {
    if (!window.noa?.saveIntegrationSettings) return;
    const values = Object.fromEntries(
      integration.fields
        .map((field) => [field.key, drafts[integration.id]?.[field.key]?.trim() || ''])
        .filter(([, value]) => value)
    );

    setSavingId(integration.id);
    try {
      const result = await window.noa.saveIntegrationSettings({ integrationId: integration.id, values });
      setSettings(result.settings);
      setDrafts((current) => ({ ...current, [integration.id]: {} }));
      setRevealedFields((current) => Object.fromEntries(Object.entries(current).filter(([key]) => !key.startsWith(`${integration.id}:`))));
      setNotice(`${integration.name}: ${result.message}`);
    } catch {
      setNotice(`${integration.name}: add or replace this value in Vercel project environment variables, then redeploy.`);
    } finally {
      setSavingId('');
    }
  };

  const toggleRevealField = async (integration: IntegrationSetup, field: IntegrationField) => {
    const revealId = `${integration.id}:${field.key}`;
    if (revealedFields[revealId]) {
      setRevealedFields((current) => {
        const next = { ...current };
        delete next[revealId];
        return next;
      });
      return;
    }

    if (!window.noa?.revealIntegrationSetting) return;
    setRevealingKey(revealId);
    try {
      const result = await window.noa.revealIntegrationSetting({ integrationId: integration.id, key: field.key });
      if (result.ok) {
        setRevealedFields((current) => ({ ...current, [revealId]: result.value }));
      } else {
        setNotice(`${integration.name}: ${result.message}`);
      }
    } catch {
      setNotice(`${integration.name}: deployed secrets are intentionally not revealable from the browser. Inspect or replace them in Vercel.`);
    } finally {
      setRevealingKey('');
    }
  };

  const testIntegration = async (integration: IntegrationSetup) => {
    if (!window.noa?.testIntegration) return;
    setTestingId(integration.id);
    try {
      const report = await window.noa.testIntegration({ integrationId: integration.id });
      recordIntegrationTestResult(report.result, report.checkedAt);
      setNotice(`${integration.name}: ${report.result.message}`);
    } catch {
      setNotice(`${integration.name}: connection tests need the deployed Vercel API routes or local Vercel dev server.`);
    } finally {
      setTestingId('');
    }
  };

  const getFieldState = (integrationId: IntegrationId, key: string) =>
    settings?.integrations[integrationId]?.fields.find((field) => field.key === key);

  const isFieldReady = (integrationId: IntegrationId, field: IntegrationField) =>
    Boolean(drafts[integrationId]?.[field.key]?.trim() || getFieldState(integrationId, field.key)?.configured);

  const isSetupReady = (integration: IntegrationSetup) =>
    integration.fields.filter((field) => field.required).every((field) => isFieldReady(integration.id, field));

  const getLatestResult = (id: IntegrationId) => testResults.find((result) => result.id === id);

  return (
    <section className="page-fade">
      <article className="glass-card wide">
        <PanelTitle eyebrow="Connections" title="Set up NoA without opening code" />
        <p className="section-copy">
          Add credentials to Vercel environment variables, then use this page to confirm what is configured and test
          each connection. Secret values are never exposed in the browser.
        </p>
        <div className="integration-actions">
          <button className="secondary-action test-button" onClick={() => void runIntegrationTests()} disabled={isTestingIntegrations}>
            {isTestingIntegrations ? 'Testing...' : 'Test all connections'}
          </button>
          <button className="secondary-action test-button" onClick={() => void loadSettings()}>
            Refresh environment status
          </button>
        </div>
        {notice && <p className="integration-notice">{notice}</p>}
      </article>
      {testResults.length > 0 && (
        <article className="glass-card wide test-results">
          <PanelTitle eyebrow="Connection test" title="Latest results" />
          {testCheckedAt && <p className="test-time">Checked {new Date(testCheckedAt).toLocaleString()}</p>}
          <div className="test-result-grid">
            {testResults.map((result) => (
              <div className={`test-result ${result.ok ? 'ok' : 'fail'}`} key={result.id}>
                <strong>{result.name}</strong>
                <span>{result.ok ? 'Connected' : 'Needs attention'}</span>
                <p>{result.message}</p>
                <small>Status: {result.status}</small>
              </div>
            ))}
          </div>
        </article>
      )}
      <div className="integrations-grid">
        {integrationSetups.map((integration) => {
          const latestResult = getLatestResult(integration.id);
          const ready = isSetupReady(integration);
          const connected = latestResult?.ok || integrationStatus[integration.id];
          const tagClass = connected ? 'online' : ready ? 'pending' : 'planned';
          const tagText = latestResult ? latestResult.ok ? 'Connected' : 'Needs attention' : ready ? 'Ready to test' : integration.statusLabel;

          return (
            <article className="integration-card setup-card" key={integration.id}>
              <div className="integration-head">
                <div className="integration-icon"><PlugIcon status={connected ? 'online' : 'planned'} /></div>
                <div>
                  <h3>{integration.name}</h3>
                  <p>{integration.role}</p>
                </div>
              </div>
              <div className="integration-meta">
                <span className={`tag ${tagClass}`}>{tagText}</span>
                <div className="credential-path">{integration.credential}</div>
              </div>
              <div className="integration-form">
                {integration.fields.map((field) => {
                  const saved = getFieldState(integration.id, field.key);
                  const draftValue = drafts[integration.id]?.[field.key] || '';
                  const revealId = `${integration.id}:${field.key}`;
                  const revealedValue = revealedFields[revealId] || '';
                  const displayedValue = draftValue || revealedValue || (saved?.configured ? saved.displayValue || saved.maskedValue : '');
                  const isRevealed = Boolean(revealedValue);
                  const inputType = field.type === 'url'
                    ? 'url'
                    : field.type === 'password' && !isRevealed
                      ? 'password'
                      : 'text';
                  return (
                    <label className="integration-field" key={field.key}>
                      <span>
                        {field.label}
                        <span className="field-badges">
                          {saved?.configured && <small className="configured">Configured</small>}
                          {field.required && !saved?.configured && <small>Required</small>}
                        </span>
                      </span>
                      <div className="integration-field-control">
                        <input
                          value={displayedValue}
                          type={inputType}
                          placeholder={field.placeholder || field.key}
                          onChange={(event) => {
                            const value = event.target.value;
                            setDrafts((current) => ({
                              ...current,
                              [integration.id]: {
                                ...current[integration.id],
                                [field.key]: value
                              }
                            }));
                          }}
                          autoComplete="off"
                        />
                        {saved?.configured && (
                          <button
                            type="button"
                            className="field-eye"
                            onClick={() => void toggleRevealField(integration, field)}
                            disabled={revealingKey === revealId}
                            aria-label={isRevealed ? `Hide ${field.label}` : `Reveal ${field.label}`}
                            title={isRevealed ? 'Hide value' : 'Reveal value'}
                          >
                            {isRevealed ? <EyeOff size={17} /> : <Eye size={17} />}
                          </button>
                        )}
                      </div>
                      <em>{field.help || (saved?.configured ? 'Saved on this machine. Type over it to replace.' : field.key)}</em>
                    </label>
                  );
                })}
              </div>
              <div className="integration-card-actions">
                <button className="primary-action" onClick={() => void saveIntegration(integration)} disabled={savingId === integration.id}>
                  {savingId === integration.id ? 'Checking...' : 'Where to add this'}
                </button>
                <button className="secondary-action" onClick={() => void testIntegration(integration)} disabled={testingId === integration.id}>
                  {testingId === integration.id ? 'Testing...' : 'Test connection'}
                </button>
              </div>
              {latestResult && (
                <p className={`integration-result ${latestResult.ok ? 'ok' : 'fail'}`}>
                  {latestResult.message}
                </p>
              )}
              <details className="setup-details">
                <summary>Setup notes</summary>
                <ol className="setup-steps">
                  {integration.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </details>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function GroceryListStandalonePage() {
  const cachedScreensavers = loadCachedGroceryScreensavers();
  const [report, setReport] = useState<PublicGroceryListReport>({
    ok: false,
    message: '',
    fetchedAt: '',
    owner: { email: 'info@fearlessau.com', userId: '' },
    groceryItems: [],
    personalisation: cachedScreensavers
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncingScreensavers, setIsSyncingScreensavers] = useState(false);
  const [screensaverSyncedAt, setScreensaverSyncedAt] = useState(() => window.localStorage.getItem(GROCERY_SCREENSAVER_SYNCED_AT_KEY) || '');
  const [message, setMessage] = useState('');
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [category, setCategory] = useState('General');
  const [addedBy, setAddedBy] = useState(() => window.localStorage.getItem('noa.groceryList.addedBy') || '');
  const [updatingId, setUpdatingId] = useState('');
  const [isSleeping, setIsSleeping] = useState(false);
  const [activeScreensaverIndex, setActiveScreensaverIndex] = useState(0);
  const [now, setNow] = useState(Date.now());
  const idleTimerRef = useRef<number | null>(null);
  const activeItems = report.groceryItems.filter((item) => !item.completed);
  const completedItems = report.groceryItems.filter((item) => item.completed).slice(0, 10);
  const personalisation = normalizeGroceryListPersonalisation(report.personalisation);
  const enabledScreensavers = personalisation.screensavers.filter((item) => item.enabled);
  const activeScreensaver = enabledScreensavers[activeScreensaverIndex % Math.max(enabledScreensavers.length, 1)] || null;
  const categories = ['General', 'Fresh food', 'Pantry', 'Household', 'Personal', 'Other'];

  const restartIdleTimer = () => {
    if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
    idleTimerRef.current = window.setTimeout(() => {
      setIsSleeping(true);
      setActiveScreensaverIndex(0);
    }, personalisation.sleepMinutes * 60 * 1000);
  };

  const refreshGroceryList = async () => {
    if (!window.noa?.getPublicGroceryListSummary) return report;
    setIsLoading(true);
    const next = await window.noa.getPublicGroceryListSummary();
    setReport((current) => ({
      ...next,
      owner: next.owner || { email: 'info@fearlessau.com', userId: '' },
      groceryItems: Array.isArray(next.groceryItems) ? next.groceryItems : [],
      personalisation: next.personalisationIncluded ? normalizeGroceryListPersonalisation(next.personalisation) : current.personalisation
    }));
    setIsLoading(false);
    return next;
  };

  const syncScreensavers = async () => {
    if (!window.noa?.getPublicGroceryListSummary) return report;
    setIsSyncingScreensavers(true);
    setMessage('');
    try {
      const next = await window.noa.getPublicGroceryListSummary({ includePersonalisation: true });
      const nextPersonalisation = normalizeGroceryListPersonalisation(next.personalisation);
      saveCachedGroceryScreensavers(nextPersonalisation);
      await warmGroceryScreensaverCache(nextPersonalisation);
      const syncedAt = window.localStorage.getItem(GROCERY_SCREENSAVER_SYNCED_AT_KEY) || new Date().toISOString();
      setScreensaverSyncedAt(syncedAt);
      setReport({
        ...next,
        owner: next.owner || { email: 'info@fearlessau.com', userId: '' },
        groceryItems: Array.isArray(next.groceryItems) ? next.groceryItems : [],
        personalisation: nextPersonalisation
      });
      setMessage(`Screensavers synced${nextPersonalisation.screensavers.length ? ` (${nextPersonalisation.screensavers.length})` : ''}.`);
      return next;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not sync screensavers.');
      return report;
    } finally {
      setIsSyncingScreensavers(false);
    }
  };

  useEffect(() => {
    void refreshGroceryList();
  }, []);

  useEffect(() => {
    window.localStorage.setItem('noa.groceryList.addedBy', addedBy);
  }, [addedBy]);

  useEffect(() => {
    restartIdleTimer();
    const handleActivity = () => {
      if (isSleeping) return;
      restartIdleTimer();
    };
    const events = ['pointerdown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((eventName) => window.addEventListener(eventName, handleActivity, { passive: true }));
    return () => {
      events.forEach((eventName) => window.removeEventListener(eventName, handleActivity));
      if (idleTimerRef.current) {
        window.clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
    };
  }, [isSleeping, personalisation.sleepMinutes]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isSleeping || enabledScreensavers.length <= 1) return undefined;
    const timer = window.setInterval(() => {
      setActiveScreensaverIndex((current) => (current + 1) % enabledScreensavers.length);
    }, personalisation.cycleSeconds * 1000);
    return () => window.clearInterval(timer);
  }, [isSleeping, enabledScreensavers.length, personalisation.cycleSeconds]);

  const wakeScreensaver = () => {
    setIsSleeping(false);
    restartIdleTimer();
  };

  const startScreensaver = () => {
    setIsSleeping(true);
    setActiveScreensaverIndex(0);
  };

  const addItem = async () => {
    const cleanedName = itemName.trim();
    if (!cleanedName) {
      setMessage('Add an item name first.');
      return;
    }
    if (!window.noa?.managePublicGroceryListItem) {
      setMessage('This grocery list needs the cloud API.');
      return;
    }
    setIsSaving(true);
    setMessage('');
    const response = await window.noa.managePublicGroceryListItem({
      action: 'create',
      values: {
        item: cleanedName,
        quantity: quantity.trim(),
        category,
        addedBy: addedBy.trim() || report.owner.displayName || 'House'
      }
    });
    setIsSaving(false);
    setMessage(response.message || (response.ok ? 'Grocery item added.' : 'Could not add grocery item.'));
    if (response.ok) {
      setItemName('');
      setQuantity('');
      await refreshGroceryList();
    }
  };

  const updateItem = async (id: string, values: Record<string, unknown>) => {
    if (!window.noa?.managePublicGroceryListItem) return;
    setUpdatingId(id);
    const response = await window.noa.managePublicGroceryListItem({ action: 'update', id, values });
    setUpdatingId('');
    setMessage(response.message || (response.ok ? 'Grocery list updated.' : 'Could not update grocery item.'));
    if (response.ok) await refreshGroceryList();
  };

  const deleteItem = async (id: string) => {
    if (!window.noa?.managePublicGroceryListItem) return;
    setUpdatingId(id);
    const response = await window.noa.managePublicGroceryListItem({ action: 'delete', id });
    setUpdatingId('');
    setMessage(response.message || (response.ok ? 'Grocery item removed.' : 'Could not remove grocery item.'));
    if (response.ok) await refreshGroceryList();
  };

  return (
    <main className="grocery-route-shell">
      <section className="grocery-route-inner">
        <article className="glass-card wide grocery-route-hero">
          <div>
            <PanelTitle eyebrow="NoA household extension" title="Grocery List" />
          </div>
          <div className="grocery-route-meta">
            <div className="grocery-summary-pill">
              <ListTodo size={18} />
              <span>{activeItems.length} active</span>
            </div>
            <button className="secondary-action" onClick={() => void refreshGroceryList()} disabled={isLoading}>
              <RefreshCw size={16} />
              {isLoading ? 'Syncing...' : 'Refresh'}
            </button>
            <button className="secondary-action" onClick={() => void syncScreensavers()} disabled={isSyncingScreensavers}>
              <ImageIcon size={16} />
              {isSyncingScreensavers ? 'Syncing images...' : 'Sync screensavers'}
            </button>
            <button className="secondary-action" onClick={startScreensaver}>
              <MonitorSmartphone size={16} />
              Start screensaver
            </button>
          </div>
          {screensaverSyncedAt && (
            <small className="grocery-screensaver-sync-note">
              Screensavers synced {new Date(screensaverSyncedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
            </small>
          )}
        </article>

        <article className="glass-card wide grocery-route-form-card">
          <div className="panel-row-head">
            <PanelTitle eyebrow="Quick add" title="Add an item" />
            <span>{report.owner.displayName || 'House list'}</span>
          </div>
          <div className="grocery-entry-grid standalone">
            <label>
              <span>Item</span>
              <input
                value={itemName}
                onChange={(event) => setItemName(event.currentTarget.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void addItem();
                }}
                placeholder="Milk, bread, bananas..."
              />
            </label>
            <label>
              <span>Quantity</span>
              <input
                value={quantity}
                onChange={(event) => setQuantity(event.currentTarget.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void addItem();
                }}
                placeholder="1x, 2L, large..."
              />
            </label>
            <label>
              <span>Category</span>
              <select value={category} onChange={(event) => setCategory(event.currentTarget.value)}>
                {categories.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
            <label>
              <span>Added by</span>
              <input
                value={addedBy}
                onChange={(event) => setAddedBy(event.currentTarget.value)}
                placeholder="Kitchen, John, House..."
              />
            </label>
            <button className="primary-action" onClick={() => void addItem()} disabled={isSaving}>
              <Plus size={16} />
              {isSaving ? 'Adding...' : 'Add item'}
            </button>
          </div>
          {message && <p className="form-message">{message}</p>}
        </article>

        <section className="grocery-layout standalone">
          <article className="glass-card budget-panel">
            <div className="panel-row-head">
              <PanelTitle eyebrow="To buy" title="Active items" />
              <span>{activeItems.length} item(s)</span>
            </div>
            <div className="grocery-list">
              {activeItems.length === 0 ? (
                <div className="empty-state">The house grocery list is clear.</div>
              ) : activeItems.map((item) => (
                <GroceryItemRow
                  key={item.id}
                  item={item}
                  isUpdating={updatingId === item.id}
                  onToggle={(completed) => void updateItem(item.id, { completed })}
                  onDelete={() => void deleteItem(item.id)}
                />
              ))}
            </div>
          </article>

          <article className="glass-card budget-panel">
            <div className="panel-row-head">
              <PanelTitle eyebrow="Just cleared" title="Completed" />
              <span>{completedItems.length} item(s)</span>
            </div>
            <div className="grocery-list compact">
              {completedItems.length === 0 ? (
                <div className="empty-state">Completed items will appear here.</div>
              ) : completedItems.map((item) => (
                <GroceryItemRow
                  key={item.id}
                  item={item}
                  isUpdating={updatingId === item.id}
                  onToggle={(completed) => void updateItem(item.id, { completed })}
                  onDelete={() => void deleteItem(item.id)}
                />
              ))}
            </div>
          </article>
        </section>
      </section>

      {isSleeping && (
        <div
          className="grocery-screensaver-overlay"
          role="button"
          tabIndex={0}
          onPointerDown={wakeScreensaver}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') wakeScreensaver();
          }}
          style={activeScreensaver ? { backgroundImage: `url("${activeScreensaver.image}")` } : undefined}
        >
          <div className="grocery-screensaver-clock">
            <span>{new Date(now).toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}</span>
            <strong>{new Date(now).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</strong>
            <p>{activeScreensaver ? activeScreensaver.name : 'Tap anywhere to wake the list'}</p>
          </div>
        </div>
      )}
    </main>
  );
}

function PersonalisationSettingsPanel({
  budgetReport,
  refreshBudget
}: {
  budgetReport: BudgetReport;
  refreshBudget: () => Promise<BudgetReport>;
}) {
  const current = readBudgetGroceryPersonalisation(budgetReport.settings);
  const [sleepMinutes, setSleepMinutes] = useState(String(current.sleepMinutes));
  const [cycleSeconds, setCycleSeconds] = useState(String(current.cycleSeconds));
  const [screensavers, setScreensavers] = useState<GroceryScreensaver[]>(current.screensavers);
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const screensaversRef = useRef<GroceryScreensaver[]>(current.screensavers);

  const setScreensaverList = (next: GroceryScreensaver[] | ((currentState: GroceryScreensaver[]) => GroceryScreensaver[])) => {
    const resolved = typeof next === 'function' ? next(screensaversRef.current) : next;
    screensaversRef.current = resolved;
    setScreensavers(resolved);
    return resolved;
  };

  useEffect(() => {
    if (!window.noa?.getNoaPersonalisationSettings) return undefined;
    let cancelled = false;

    void window.noa.getNoaPersonalisationSettings().then((response) => {
      if (cancelled || !response.ok) return;
      const next = normalizeGroceryListPersonalisation(response.personalisation?.groceryList || {});
      setSleepMinutes(String(next.sleepMinutes));
      setCycleSeconds(String(next.cycleSeconds));
      setScreensaverList(next.screensavers);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const savePersonalisation = async (nextScreensavers = screensaversRef.current, options: { quiet?: boolean } = {}) => {
    if (!window.noa?.saveNoaPersonalisationSettings) {
      setMessage('Personalisation settings are only available through the cloud API.');
      return;
    }
    setIsSaving(true);
    const response = await window.noa.saveNoaPersonalisationSettings({
      groceryList: {
        sleepMinutes: clampNumberValue(sleepMinutes, 1, 60, 5),
        cycleSeconds: clampNumberValue(cycleSeconds, 5, 120, 12),
        screensavers: nextScreensavers
      }
    });
    setIsSaving(false);
    if (!options.quiet || !response.ok) {
      setMessage(response.message || (response.ok ? 'Personalisation saved.' : 'Could not save personalisation.'));
    }
    if (response.ok) void refreshBudget();
  };

  const updateScreensaver = (id: string, patch: Partial<GroceryScreensaver>) => {
    return setScreensaverList((currentState) => currentState.map((entry) => entry.id === id ? { ...entry, ...patch } : entry));
  };

  const importScreensavers = async (files: FileList | null) => {
    const fileEntries = Array.from(files || []);
    if (fileEntries.length === 0) return;
    setIsUploading(true);
    try {
      const imported = await Promise.all(fileEntries.map(async (file) => ({
        id: crypto.randomUUID(),
        name: file.name.replace(/\.[^.]+$/, '') || 'Screensaver',
        image: await compressImageFileToDataUrl(file),
        enabled: true
      })));
      const nextList = setScreensaverList((currentState) => [...currentState, ...imported]);
      setMessage(`${imported.length} screensaver${imported.length === 1 ? '' : 's'} added. Saving...`);
      void savePersonalisation(nextList, { quiet: true });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not import those images.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <section className="settings-personalisation">
      <article className="glass-card wide">
        <PanelTitle eyebrow="Tablet extension" title="Grocery list screensaver" />
        <p className="section-copy">
          Configure the public `/grocery-list` sleep screen. Uploaded images rotate behind the clock and date once the page has been idle for a while.
        </p>
      </article>

      <section className="budget-analytics-grid">
        <article className="glass-card budget-panel">
          <div className="panel-row-head">
            <PanelTitle eyebrow="Timing" title="Idle behaviour" />
            <Clock3 size={20} />
          </div>
          <div className="notion-form-grid">
            <label>
              <span>Sleep after (minutes)</span>
              <input type="number" min={1} max={60} value={sleepMinutes} onChange={(event) => setSleepMinutes(event.currentTarget.value)} />
            </label>
            <label>
              <span>Rotate every (seconds)</span>
              <input type="number" min={5} max={120} value={cycleSeconds} onChange={(event) => setCycleSeconds(event.currentTarget.value)} />
            </label>
          </div>
          <div className="budget-settings-actions">
            <button className="secondary-action" onClick={() => void savePersonalisation()} disabled={isSaving}>
              <Save size={16} />
              {isSaving ? 'Saving...' : 'Save personalisation'}
            </button>
          </div>
        </article>

        <article className="glass-card budget-panel">
          <div className="panel-row-head">
            <PanelTitle eyebrow="Library" title="Screensaver images" />
            <MonitorSmartphone size={20} />
          </div>
          <label className="file-upload-card">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => {
                void importScreensavers(event.currentTarget.files);
                event.currentTarget.value = '';
              }}
            />
            <Plus size={18} />
            <div>
              <strong>{isUploading ? 'Preparing images...' : 'Add screensaver images'}</strong>
              <p>Upload one or more images. NoA compresses them before saving to the system.</p>
            </div>
          </label>
        </article>
      </section>

      <article className="glass-card wide">
        <div className="panel-row-head">
          <PanelTitle eyebrow="Preview library" title="Saved screensavers" />
          <span>{screensavers.length} item(s)</span>
        </div>
        <div className="screensaver-grid">
          {screensavers.length === 0 ? (
            <div className="empty-state">No images saved yet. Without images, `/grocery-list` falls back to a dark sleep screen.</div>
          ) : screensavers.map((item) => (
            <article key={item.id} className="screensaver-card">
              <div className="screensaver-preview" style={{ backgroundImage: `url("${item.image}")` }} />
              <div className="screensaver-card-body">
                <label>
                  <span>Name</span>
                  <input
                    value={item.name}
                    onChange={(event) => {
                      const nextName = event.currentTarget.value;
                      updateScreensaver(item.id, { name: nextName });
                    }}
                    onBlur={() => {
                      void savePersonalisation(screensaversRef.current, { quiet: true });
                    }}
                  />
                </label>
                <label className="toggle-row">
                  <input
                    type="checkbox"
                    checked={item.enabled}
                    onChange={(event) => {
                      const nextEnabled = event.currentTarget.checked;
                      const nextList = updateScreensaver(item.id, { enabled: nextEnabled });
                      void savePersonalisation(nextList, { quiet: true });
                    }}
                  />
                  Include in rotation
                </label>
              </div>
              <button
                className="icon-action danger"
                onClick={() => {
                  const nextList = setScreensaverList((currentState) => currentState.filter((entry) => entry.id !== item.id));
                  void savePersonalisation(nextList, { quiet: true });
                }}
                aria-label={`Remove ${item.name}`}
              >
                <Trash2 size={16} />
              </button>
            </article>
          ))}
        </div>
        {message && <p className="form-message">{message}</p>}
      </article>
    </section>
  );
}

function SettingsView({
  integrationStatus,
  budgetReport,
  refreshBudget
}: {
  integrationStatus: IntegrationStatus;
  budgetReport: BudgetReport;
  refreshBudget: () => Promise<BudgetReport>;
}) {
  const configuredCount = Object.values(integrationStatus).filter(Boolean).length;
  const [tab, setTab] = useState<'credentials' | 'personalisation'>('credentials');

  return (
    <section className="settings page-fade">
      <article className="glass-card wide settings-tab-card">
        <PanelTitle eyebrow="System settings" title="Configuration" />
        <div className="segmented-control settings-tabs">
          <button className={tab === 'credentials' ? 'active' : ''} onClick={() => setTab('credentials')}>Credentials</button>
          <button className={tab === 'personalisation' ? 'active' : ''} onClick={() => setTab('personalisation')}>Personalisation</button>
        </div>
      </article>

      {tab === 'credentials' ? (
        <>
          <article className="glass-card wide">
            <PanelTitle eyebrow="Connection settings" title="Credential storage" />
            <p className="section-copy">
              Do not paste keys into chat. Store production secrets in Vercel environment variables. Live calls run through
              Vercel API routes, not directly from the frontend.
            </p>
            <div className="settings-row">
              <span>Configured services</span>
              <strong>{configuredCount} / {integrationSetups.length}</strong>
            </div>
            <div className="settings-row">
              <span>OpenAI key</span>
              <strong>Vercel / OPENAI_API_KEY</strong>
            </div>
            <div className="settings-row">
              <span>Secret handling</span>
              <strong>Vercel env first</strong>
            </div>
          </article>

          <article className="glass-card wide env-guide">
            <PanelTitle eyebrow="Deployment setup" title="Vercel environment template" />
            <p className="section-copy">
              Add these keys in your Vercel project settings for Production, Preview, and Development as needed. Local
              development can still use `.env.local`.
            </p>
            <pre>{`OPENAI_API_KEY=your_openai_key_here
OPENAI_MODEL=gpt-4.1-mini
OPENAI_TRANSCRIBE_MODEL=gpt-4o-transcribe
OPENAI_TTS_MODEL=gpt-4o-mini-tts
OPENAI_TTS_VOICE=marin
OPENAI_TTS_INSTRUCTIONS=Speak like Noah: natural, warm, calm, and conversational.
NOA_PIN=8726
NOA_SESSION_SECRET=make_this_a_long_random_secret
CRON_SECRET=make_this_a_long_random_cron_secret
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
N8N_WEBHOOK_URL=your_n8n_webhook_url
N8N_SHARED_SECRET=choose_a_long_random_secret
NOTION_TOKEN=your_notion_token_optional
NOTION_CLIENTS_DATABASE_ID=5a836c85-e6ca-4fc5-b89e-b3b97b4bf38b
NOTION_CLIENTS_DATA_SOURCE_ID=9b4ead34-fcaf-4a27-a999-72248287878b
NOTION_JOBS_DATABASE_ID=47b8cec5-c99a-4975-a2d6-ff1e990eb2b1
NOTION_JOBS_DATA_SOURCE_ID=e9c28fc3-a5ab-44ff-b589-898a31b05e55
NOTION_TASKS_DATABASE_ID=b5cdeb9c-0bcb-4c87-833b-ddeeee4ca956
NOTION_TASKS_DATA_SOURCE_ID=476fc915-819c-45e2-b990-8917290f675c
XERO_CLIENT_ID=your_xero_client_id
XERO_CLIENT_SECRET=your_xero_client_secret
XERO_REFRESH_TOKEN=your_xero_refresh_token
XERO_TENANT_ID=your_xero_tenant_id_optional
XERO_REDIRECT_URI=https://no-a.vercel.app/api/xero/callback`}</pre>
          </article>

          <article className="glass-card wide">
            <PanelTitle eyebrow="Implementation sequence" title="What we connect first" />
            <div className="decision-list">
              <Decision icon={MessageSquareText} title="OpenAI" detail="Use your local key to power Noah from a backend-safe request path." />
              <Decision icon={Database} title="Supabase" detail="Move local captures into durable memory, events, approvals, and conversations." />
              <Decision icon={Zap} title="n8n" detail="Accept scheduled and trigger-based events through signed webhooks." />
              <Decision icon={ArrowUpRight} title="Notion" detail="Start with read-only sync so knowledge enters NoA without risky writes." />
              <Decision icon={Database} title="Xero" detail="Start with read-only accounting context, then keep invoices and payments approval-gated." />
            </div>
          </article>
        </>
      ) : (
        <PersonalisationSettingsPanel budgetReport={budgetReport} refreshBudget={refreshBudget} />
      )}
    </section>
  );
}

function CommandBar({ command, setCommand, sendCommand, docked = false }: {
  command: string;
  setCommand: (value: string) => void;
  sendCommand: () => void;
  docked?: boolean;
}) {
  return (
    <div className={`command-card ${docked ? 'docked' : 'hero-command'}`}>
      <Sparkles size={20} />
      <input
        value={command}
        onChange={(event) => setCommand(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') sendCommand();
        }}
        placeholder="Ask Noah what matters next..."
      />
      <button onClick={sendCommand} aria-label="Send message">
        <Send size={18} />
      </button>
    </div>
  );
}

function MarkdownText({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);

  return (
    <div className="markdown-body">
      {blocks.map((block, index) => {
        const lines = block.split(/\n/).map((line) => line.trim()).filter(Boolean);
        const isList = lines.every((line) => /^[-*]\s+/.test(line));
        const isNumberedList = lines.every((line) => /^\d+\.\s+/.test(line));

        if (isList || isNumberedList) {
          const Tag = isNumberedList ? 'ol' : 'ul';
          return (
            <Tag key={`${block}-${index}`}>
              {lines.map((line) => (
                <li key={line}>{renderInlineMarkdown(line.replace(/^[-*]\s+|^\d+\.\s+/, ''))}</li>
              ))}
            </Tag>
          );
        }

        return (
          <p key={`${block}-${index}`}>
            {renderInlineMarkdown(lines.join(' '))}
          </p>
        );
      })}
    </div>
  );
}

function renderInlineMarkdown(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={`${part}-${index}`}>{part.slice(1, -1)}</code>;
    }
    return <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>;
  });
}

function PanelTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="panel-title">
      <p className="eyebrow">{eyebrow}</p>
      <h3>{title}</h3>
    </div>
  );
}

function Decision({ icon: Icon, title, detail }: { icon: React.ElementType; title: string; detail: string }) {
  return (
    <div className="decision-row">
      <Icon size={20} />
      <div>
        <strong>{title}</strong>
        <p>{detail}</p>
      </div>
      <ChevronRight size={18} />
    </div>
  );
}

function StatusPill({ icon: Icon, label, tone }: { icon: React.ElementType; label: string; tone: string }) {
  return (
    <div className={`status-pill ${tone}`}>
      <Icon size={16} />
      {label}
    </div>
  );
}

function buildSyncStatusPill(state: StartupSyncState, activelyLoading: boolean): { icon: React.ElementType; label: string; tone: string } {
  if (activelyLoading || state.status === 'syncing') {
    return { icon: RefreshCw, label: 'Syncing data', tone: 'info' };
  }

  if (state.status === 'partial') {
    return { icon: CircleAlert, label: 'Sync needs attention', tone: 'warning' };
  }

  if (state.status === 'synced') {
    return {
      icon: CheckCircle2,
      label: state.checkedAt ? `Synced ${formatTimeOnly(state.checkedAt)}` : 'Data synced',
      tone: 'success'
    };
  }

  return { icon: Database, label: 'Data ready', tone: 'muted' };
}

function formatTimeOnly(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function notionHasErrors(report: NotionJobsReport) {
  return Boolean(report.mainJobsError || report.tasksError || report.upcomingJobsError);
}

function WorkflowIcon({ state }: { state: 'draft' | 'ready' | 'approval' }) {
  if (state === 'ready') return <CheckCircle2 size={22} />;
  if (state === 'approval') return <CircleAlert size={22} />;
  return <Clock3 size={22} />;
}

function PlugIcon({ status }: { status: string }) {
  if (status === 'online') return <Activity size={20} />;
  if (status === 'planned') return <ArrowUpRight size={20} />;
  return <Database size={20} />;
}

function screenTitle(screen: Screen) {
  return {
    today: 'Command Centre',
    noah: 'Noah',
    crm: 'CRM',
    hubgauge: 'HubGauge',
    pipeline: 'Pipeline',
    tasks: 'Tasks',
    'upcoming-jobs': 'Upcoming Jobs',
    clients: 'Clients',
    xero: 'Xero',
    budgeting: 'Budgeting',
    map: 'Map',
    plan: 'Build Plan',
    memory: 'Memory',
    automations: 'Automations',
    integrations: 'Integrations',
    settings: 'Settings'
  }[screen];
}

function formatDuration(value: number) {
  const totalSeconds = Math.max(0, Math.floor((Number.isFinite(value) ? value : 0) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function getAdjacentHubGaugeFace(face: HubGaugeFace, direction: 1 | -1): HubGaugeFace {
  const currentIndex = hubGaugeFaces.indexOf(face);
  const nextIndex = (currentIndex + direction + hubGaugeFaces.length) % hubGaugeFaces.length;
  return hubGaugeFaces[nextIndex];
}

function getHubGaugePollDelay(face: HubGaugeFace, spotify: HubGaugePayload['spotify']) {
  if (!spotify.configured) return 15000;
  if (face === 'spotify') return spotify.isPlaying ? 4000 : 7000;
  return spotify.isPlaying ? 12000 : 20000;
}

function formatMoney(value: number, currency = 'AUD') {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: currency || 'AUD',
    maximumFractionDigits: 2
  }).format(Number.isFinite(value) ? value : 0);
}

function formatCompactMoney(value: number, currency = 'AUD') {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: currency || 'AUD',
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(Number.isFinite(value) ? value : 0);
}

function formatXeroStatus(status: string) {
  return status
    ? status.toLowerCase().replace(/(^|\s|_)\w/g, (match) => match.toUpperCase()).replace(/_/g, ' ')
    : 'Unknown';
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat('en-AU', {
    maximumFractionDigits: 2
  }).format(Number.isFinite(value) ? value : 0);
}

function statusForColumn(column: string) {
  return {
    'Not Started': 'Not started',
    'In Progress': 'In progress',
    'Ready for Revision': 'Ready For Revision',
    'Final Draft/Notes': 'Final Draft/Notes'
  }[column] || column;
}

function normalizeNotionStatusName(status: string) {
  return /^done$/i.test(String(status || '').trim()) ? 'Posted / Done' : String(status || '').trim();
}

function isCompleteNotionStatus(status: string) {
  const normalized = normalizeNotionStatusName(status);
  return normalized === 'Posted / Done' || normalized === 'Ready To Post' || normalized === 'Archived';
}

function isCompleteNotionTask(task: Pick<NotionTask, 'complete' | 'status'>) {
  return Boolean(task.complete) || isCompleteNotionStatus(task.status);
}

function getLocalNoahReply(input: string, notes: CaptureNote[], briefing: SmartBriefing) {
  const lowered = input.toLowerCase();
  const counts = countByCategory(notes);
  const topTask = notes.find((note) => note.category === 'task');
  const topApproval = notes.find((note) => note.category === 'approval');
  const topClient = notes.find((note) => note.category === 'client');
  const topProject = notes.find((note) => note.category === 'project');

  if (notes.length === 0) {
    return 'I do not have any captured memory yet. Start by saving one task, client note, project note, or decision from the Today screen. Once there is context, I can prioritise it and turn it into a useful briefing.';
  }

  if (lowered.includes('focus') || lowered.includes('today')) {
    return [
      `I would focus on: ${briefing.mainFocus}.`,
      `Reason: your memory inbox currently has ${counts.task} task item(s), ${counts.client} client signal(s), ${counts.project} project item(s), and ${counts.approval} approval item(s).`,
      `Risk: ${briefing.risk}.`,
      `Next action: ${briefing.firstAction}.`
    ].join('\n\n');
  }
  if (lowered.includes('n8n') || lowered.includes('automation')) {
    return 'Use n8n for the quiet background work: triggers, schedules, and integrations. I should still own the recommendation, explain the reason, and ask before anything external happens.';
  }
  if (lowered.includes('supabase') || lowered.includes('memory')) {
    return [
      'Here is what I currently remember locally:',
      `Tasks: ${counts.task}`,
      `Clients: ${counts.client}`,
      `Projects: ${counts.project}`,
      `Decisions: ${counts.decision}`,
      `Approvals: ${counts.approval}`,
      `General memory: ${counts.memory}`,
      'The next upgrade is moving this from local app storage into Supabase so it becomes durable, searchable, and available to the real Noah advisor layer.'
    ].join('\n');
  }
  if (lowered.includes('approval') || lowered.includes('review')) {
    if (!topApproval) return 'I do not see any captured approval items yet. If something needs review before it is sent, updated, or published, capture it with words like "approve", "review", "send", or "confirm".';
    return `The first approval I see is: ${topApproval.text}\n\nI would review that before any external workflow runs. NoA should treat this as a protected action.`;
  }
  if (lowered.includes('client') || lowered.includes('follow')) {
    if (!topClient) return 'I do not see a client follow-up in memory yet. Capture a client note or follow-up and I can help prepare the next touchpoint.';
    return `The client signal I would look at first is: ${topClient.text}\n\nI would prepare the follow-up, keep it as a draft, and ask you before anything is sent.`;
  }
  if (lowered.includes('project')) {
    if (!topProject) return 'I do not see a project note yet. Capture the active project or blocker, then I can help organise the next step.';
    return `The project context I see first is: ${topProject.text}\n\nI would turn this into a concrete next action and connect any related tasks or decisions.`;
  }
  if (lowered.includes('task') || lowered.includes('todo') || lowered.includes('to do')) {
    if (!topTask) return 'I do not see a task captured yet. Add one task and I can help rank it against the rest of your memory inbox.';
    return `The task I would start with is: ${topTask.text}\n\nI would make it specific, decide the next action, and keep any external action behind approval.`;
  }
  return `I found ${notes.length} captured item(s). My read is: focus on "${briefing.mainFocus}", watch for "${briefing.risk}", and take this first action: ${briefing.firstAction}.`;
}

function isIntegrationTestRequest(input: string) {
  const value = input.toLowerCase();
  return (
    value.includes('test integration') ||
    value.includes('test my integration') ||
    value.includes('check integration') ||
    value.includes('check my connection') ||
    value.includes('test connection')
  );
}

function formatIntegrationTestReply(results: IntegrationTestResult[]) {
  const okCount = results.filter((result) => result.ok).length;
  const lines = results.map((result) => {
    const status = result.ok ? 'Connected' : 'Needs attention';
    return `${result.name}: ${status} (${result.status}) - ${result.message}`;
  });

  return [
    `I tested ${results.length} integration(s). ${okCount} connected successfully.`,
    ...lines,
    okCount === results.length
      ? 'Everything is reachable. The next step is to let Noah use OpenAI for real responses and log events into Supabase.'
      : 'Fix the services marked as needing attention, then run "test integrations" again.'
  ].join('\n');
}

function classifyCapture(text: string): CaptureCategory {
  const value = text.toLowerCase();
  if (/\b(approve|approval|review|send|publish|confirm)\b/.test(value)) return 'approval';
  if (/\b(client|customer|lead|follow[- ]?up|call|email)\b/.test(value)) return 'client';
  if (/\b(project|build|launch|roadmap|milestone|scope)\b/.test(value)) return 'project';
  if (/\b(decided|decision|choose|chosen|agreed|preference)\b/.test(value)) return 'decision';
  if (/\b(task|todo|to do|finish|complete|due|urgent|today)\b/.test(value)) return 'task';
  return 'memory';
}

function formatCategory(category: CaptureCategory) {
  return {
    task: 'Task',
    client: 'Client',
    project: 'Project',
    decision: 'Decision',
    approval: 'Approval',
    memory: 'Memory'
  }[category];
}

function buildSmartBriefing(notes: CaptureNote[]): SmartBriefing {
  if (notes.length === 0) {
    return {
      mainFocus: 'Capture the work',
      risk: 'No context yet',
      firstAction: 'Add one task'
    };
  }

  const firstTask = notes.find((note) => note.category === 'task');
  const firstApproval = notes.find((note) => note.category === 'approval');
  const firstClient = notes.find((note) => note.category === 'client');
  const firstProject = notes.find((note) => note.category === 'project');

  return {
    mainFocus: firstTask ? shortLabel(firstTask.text) : firstProject ? shortLabel(firstProject.text) : 'Clarify the next move',
    risk: firstApproval ? 'Approval waiting' : firstClient ? 'Relationship follow-up' : 'Scattered context',
    firstAction: firstApproval
      ? 'Review the approval'
      : firstClient
        ? 'Prepare the follow-up'
        : 'Turn memory into a task'
  };
}

function buildInboxSummary(notes: CaptureNote[]) {
  const counts = countByCategory(notes);
  return [
    { label: 'Inbox', value: String(notes.length), detail: 'captured items' },
    { label: 'Tasks', value: String(counts.task), detail: 'ready to prioritise' },
    { label: 'Clients', value: String(counts.client), detail: 'relationship signals' },
    { label: 'Projects', value: String(counts.project), detail: 'active context' },
    { label: 'Decisions', value: String(counts.decision), detail: 'durable preferences' },
    { label: 'Approvals', value: String(counts.approval), detail: 'need review' },
    { label: 'Memory', value: String(counts.memory), detail: 'general context' },
    { label: 'Noah', value: notes.length ? 'Learning' : 'Ready', detail: 'local memory mode' }
  ];
}

function countByCategory(notes: CaptureNote[]) {
  return notes.reduce<Record<CaptureCategory, number>>(
    (counts, note) => {
      counts[note.category] += 1;
      return counts;
    },
    { task: 0, client: 0, project: 0, decision: 0, approval: 0, memory: 0 }
  );
}

function groupNotes(notes: CaptureNote[]) {
  const order: CaptureCategory[] = ['task', 'client', 'project', 'decision', 'approval', 'memory'];
  return order
    .map((category) => ({
      category,
      items: notes.filter((note) => note.category === category)
    }))
    .filter((group) => group.items.length > 0);
}

function shortLabel(text: string) {
  const trimmed = text.trim();
  return trimmed.length > 34 ? `${trimmed.slice(0, 31)}...` : trimmed;
}

function stripMarkdownForSpeech(text: string) {
  return text
    .replace(/```[\s\S]*?```/g, 'I have prepared a code block in the chat.')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/^[-*]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[#>*_]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function prepareSpeechText(text: string) {
  const spoken = stripMarkdownForSpeech(text);
  if (spoken.length <= 900) return spoken;

  const sentences = spoken.match(/[^.!?]+[.!?]+/g) || [];
  const summary = sentences.reduce((current, sentence) => {
    if ((current + sentence).length > 760) return current;
    return `${current}${sentence} `;
  }, '').trim();

  return `${summary || spoken.slice(0, 760).trim()} I have put the rest of the detail in chat.`;
}

function isEmptyFollowUp(text: string) {
  const cleaned = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return true;
  if (cleaned.length < 3) return true;
  return [
    'thank you',
    'thanks',
    'you',
    'uh',
    'um',
    'hmm',
    'silence',
    'no speech'
  ].includes(cleaned);
}

function findWakePhrase(text: string) {
  const phrases = [
    'hey noah',
    'hey noa',
    'hey no a',
    'hi noah',
    'hello noah',
    'ok noah',
    'okay noah',
    'hey know'
  ];

  return phrases
    .map((phrase) => ({ phrase, index: text.indexOf(phrase) }))
    .filter((match) => match.index !== -1)
    .sort((a, b) => a.index - b.index)[0] || null;
}

function buildTranscriptionHints(report: NotionJobsReport, recentMessages: ChatMessage[]) {
  const taskHints = report.tasks.flatMap((task) => [
    task.title,
    task.status,
    task.priority,
    task.effortLevel,
    ...task.taskTypes,
    ...task.assignees.map((assignee) => assignee.name)
  ]);
  const jobHints = report.upcomingJobs.flatMap((job) => [
    job.title,
    job.client,
    job.location,
    job.priority,
    ...job.deliverableTypes
  ]);
  const conversationHints = recentMessages
    .slice(-6)
    .flatMap((message) => message.text.match(/\b[A-Z][A-Za-z0-9&'-]{2,}\b/g) || []);

  return Array.from(new Set([
    'NoA',
    'Noah',
    'Hey Noah',
    'TruShot Media',
    'Notion',
    'n8n',
    'Supabase',
    ...taskHints,
    ...jobHints,
    ...conversationHints
  ]
    .map((hint) => String(hint || '').trim())
    .filter((hint) => hint.length >= 2 && hint.length <= 80)))
    .slice(0, 70);
}

function preferredAudioMimeType() {
  const options = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
  return options.find((type) => MediaRecorder.isTypeSupported(type)) || '';
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);

