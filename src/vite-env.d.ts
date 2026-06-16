/// <reference types="vite/client" />

interface SpeechRecognitionResultItem {
  transcript: string;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionResultItem;
  [index: number]: SpeechRecognitionResultItem;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

interface Window {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
  webkitAudioContext?: typeof AudioContext;
  noa?: {
    isBrowserLanMode?: boolean;
    getVersion: () => Promise<{
      version: string;
      platform: string;
      phase: string;
    }>;
    testIntegrations: () => Promise<{
      checkedAt: string;
      results: Array<{
        id: string;
        name: string;
        ok: boolean;
        status: number | string;
        message: string;
      }>;
    }>;
    getIntegrationSettings?: () => Promise<{
      loadedAt: string;
      integrations: Record<string, {
        id: string;
        fields: Array<{
          key: string;
          configured: boolean;
          maskedValue: string;
          displayValue: string;
          secret: boolean;
        }>;
      }>;
    }>;
    saveIntegrationSettings?: (payload: {
      integrationId: string;
      values: Record<string, string>;
    }) => Promise<{
      ok: boolean;
      message: string;
      settings: {
        loadedAt: string;
        integrations: Record<string, {
          id: string;
          fields: Array<{
            key: string;
            configured: boolean;
            maskedValue: string;
            displayValue: string;
            secret: boolean;
          }>;
        }>;
      };
    }>;
    testIntegration?: (payload: {
      integrationId: string;
    }) => Promise<{
      checkedAt: string;
      result: {
        id: string;
        name: string;
        ok: boolean;
        status: number | string;
        message: string;
      };
    }>;
    revealIntegrationSetting?: (payload: {
      integrationId: string;
      key: string;
    }) => Promise<{
      ok: boolean;
      value: string;
      message: string;
    }>;
    getNotionJobs: () => Promise<{
      tasks: Array<{
        id: string;
        title: string;
        status: string;
        priority: string;
        dueDate: string;
        dueState: string;
        shootDate: string;
        shootState: string;
        effortLevel: string;
        effortSize: string;
        taskTypes: string[];
        assignees: Array<{ id: string; name: string; avatarUrl: string | null }>;
        description: string;
        attachments: Array<{ name: string; url: string }>;
        url: string;
        archived: boolean;
        complete: boolean;
        column: string;
      }>;
      pipelineTasks: Array<{
        id: string;
        title: string;
        status: string;
        priority: string;
        dueDate: string;
        dueState: string;
        shootDate: string;
        shootState: string;
        effortLevel: string;
        effortSize: string;
        taskTypes: string[];
        assignees: Array<{ id: string; name: string; avatarUrl: string | null }>;
        description: string;
        attachments: Array<{ name: string; url: string }>;
        url: string;
        archived: boolean;
        complete: boolean;
        column: string;
      }>;
      taskList: Array<{
        id: string;
        title: string;
        status: string;
        priority: string;
        dueDate: string;
        dueState: string;
        shootDate: string;
        shootState: string;
        effortLevel: string;
        effortSize: string;
        taskTypes: string[];
        assignees: Array<{ id: string; name: string; avatarUrl: string | null }>;
        description: string;
        attachments: Array<{ name: string; url: string }>;
        url: string;
        archived: boolean;
        complete: boolean;
        column: string;
      }>;
      calendarTasks: Array<{
        id: string;
        title: string;
        status: string;
        priority: string;
        dueDate: string;
        dueState: string;
        shootDate: string;
        shootState: string;
        effortLevel: string;
        effortSize: string;
        taskTypes: string[];
        assignees: Array<{ id: string; name: string; avatarUrl: string | null }>;
        description: string;
        attachments: Array<{ name: string; url: string }>;
        url: string;
        archived: boolean;
        complete: boolean;
        column: string;
      }>;
      upcomingJobs: Array<{
        id: string;
        title: string;
        client: string;
        jobDate: string;
        dueState: string;
        priority: string;
        deliverableTypes: string[];
        location: string;
        notes: string;
        attachments: Array<{ name: string; url: string }>;
        url: string;
        archived: boolean;
      }>;
      fetchedAt: string;
      mainJobsError: string;
      tasksError: string;
      upcomingJobsError: string;
    }>;
    updateNotionTaskStatus: (payload: {
      pageId: string;
      column: string;
    }) => Promise<{
      ok: boolean;
      message: string;
      task?: {
        id: string;
        title: string;
        status: string;
        priority: string;
        dueDate: string;
        dueState: string;
        shootDate: string;
        shootState: string;
        effortLevel: string;
        effortSize: string;
        taskTypes: string[];
        assignees: Array<{ id: string; name: string; avatarUrl: string | null }>;
        description: string;
        attachments: Array<{ name: string; url: string }>;
        url: string;
        archived: boolean;
        complete: boolean;
        column: string;
      };
    }>;
    manageNotionItem?: (payload: {
      kind: 'task' | 'job';
      action: 'create' | 'update' | 'archive';
      id?: string;
      values?: Record<string, string>;
    }) => Promise<{
      ok: boolean;
      message: string;
      archived?: boolean;
      id?: string;
      item?: unknown;
    }>;
    getXeroSummary?: () => Promise<{
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
      invoices: Array<{
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
      }>;
      customerInvoices: Array<{
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
      }>;
      supplierBills: Array<{
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
      }>;
      contacts: Array<{
        id: string;
        name: string;
        email: string;
        phone: string;
        isCustomer: boolean;
        isSupplier: boolean;
        outstanding: number;
        overdue: number;
        updatedAt: string;
      }>;
      warnings: string[];
    }>;
    getBudgetSummary?: () => Promise<{
      ok: boolean;
      message: string;
      fetchedAt: string;
      owner: {
        email: string;
        displayName?: string;
        userId: string;
      };
      tables: Record<string, unknown[]>;
      totals: Record<string, number>;
      mortgageSummary: {
        mortgages: unknown[];
        totalWeeklyTenantBill: number;
        totalWeeklyOffsetExpenses: number;
      };
      emailSettings: {
        enabled: boolean;
        cycleDay: number;
        subjectPrefix: string;
        replyTo: string;
        notes: string;
        tenants: Array<{
          id: string;
          name: string;
          email: string;
          mortgageLocalId: string;
          active: boolean;
        }>;
      };
      settings: Record<string, unknown> | null;
    }>;
    manageBudgetItem?: (payload: {
      kind: string;
      action: 'create' | 'update' | 'delete';
      id?: string;
      values?: Record<string, unknown>;
    }) => Promise<{
      ok: boolean;
      message: string;
      item?: unknown;
    }>;
    saveBudgetEmailSettings?: (payload: {
      settings: Record<string, unknown>;
    }) => Promise<{
      ok: boolean;
      message: string;
      settings?: unknown;
    }>;
    sendBudgetTenantEmail?: (payload: {
      dryRun?: boolean;
      tenantId?: string;
    }) => Promise<{
      ok: boolean;
      message: string;
      previews: unknown[];
      sent: unknown[];
    }>;
    startOfflineWake: () => Promise<{
      ok: boolean;
      message: string;
    }>;
    stopOfflineWake: () => Promise<{
      ok: boolean;
      message: string;
    }>;
    setOfflineWakePaused: (paused: boolean) => Promise<{
      ok: boolean;
      message: string;
    }>;
    onOfflineWakeEvent: (callback: (event: {
      type: string;
      text?: string;
      command?: string;
      message?: string;
      code?: number;
    }) => void) => () => void;
    transcribeAudio: (payload: {
      audio: ArrayBuffer;
      mimeType: string;
      filename: string;
      contextHints?: string[];
    }) => Promise<{
      ok: boolean;
      text: string;
      message: string;
    }>;
    synthesizeSpeech: (payload: {
      text: string;
    }) => Promise<{
      ok: boolean;
      audio: number[] | null;
      mimeType: string;
      message: string;
    }>;
    askNoah: (payload: {
      message: string;
      notes: unknown[];
      smartBriefing: unknown;
      integrationStatus: Record<string, boolean>;
      recentMessages: unknown[];
      notionJobs?: unknown;
      interactionMode?: 'typed' | 'voice';
    }) => Promise<{
      ok: boolean;
      text: string;
      logged?: boolean;
      logMessage?: string;
    }>;
  };
}
