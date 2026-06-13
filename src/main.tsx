import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import {
  Activity,
  ArrowUpRight,
  Bot,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  Copy,
  Database,
  Eye,
  EyeOff,
  Edit3,
  BriefcaseBusiness,
  Home,
  Kanban,
  LockKeyhole,
  ListTodo,
  Mic,
  MicOff,
  MessageSquareText,
  MoreHorizontal,
  Plus,
  Play,
  Save,
  Send,
  ServerCog,
  ShieldCheck,
  Sparkles,
  Trash2,
  Volume2,
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
  systemNodes
} from './data/foundation';
import type { ChatMessage, Screen } from './types/noa';
import './styles/app.css';

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

type IntegrationId = 'openai' | 'supabase' | 'n8n' | 'notion' | 'xero';

type IntegrationStatus = Record<IntegrationId, boolean>;

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
  status: string;
  priority: string;
  dueDate: string;
  dueState: string;
  effortLevel: string;
  effortSize: string;
  taskTypes: string[];
  assignees: Array<{ id: string; name: string; avatarUrl: string | null }>;
  description: string;
  url: string;
  archived: boolean;
  complete: boolean;
  column: string;
};

type NotionItemKind = 'task' | 'job';
type NotionEditorMode = 'create' | 'view' | 'edit';

type NotionJobsReport = {
  tasks: NotionTask[];
  pipelineTasks: NotionTask[];
  taskList: NotionTask[];
  upcomingJobs: Array<{
    id: string;
    title: string;
    client: string;
    jobDate: string;
    dueState: string;
    priority: string;
    deliverableTypes: string[];
    location: string;
    url: string;
    archived: boolean;
  }>;
  fetchedAt: string;
  mainJobsError: string;
  tasksError: string;
  upcomingJobsError: string;
};

const emptyJobsReport: NotionJobsReport = {
  tasks: [],
  pipelineTasks: [],
  taskList: [],
  upcomingJobs: [],
  fetchedAt: '',
  mainJobsError: '',
  tasksError: '',
  upcomingJobsError: ''
};

const jobColumns = ['Not Started', 'In Progress', 'Ready for Revision', 'Final Draft/Notes'];

if (!window.noa) {
  window.noa = createBrowserNoaClient();
}

function createBrowserNoaClient(): NonNullable<Window['noa']> {
  const postJson = async <T,>(url: string, payload: unknown = {}) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return response.json() as Promise<T>;
  };

  return {
    isBrowserLanMode: true,
    getVersion: () => fetch('/api/version').then((response) => response.json()),
    testIntegrations: () => postJson('/api/test-integrations'),
    getIntegrationSettings: () => fetch('/api/integration-settings').then((response) => response.json()),
    saveIntegrationSettings: (payload) => postJson('/api/integration-settings', payload),
    testIntegration: (payload) => postJson('/api/test-integration', payload),
    revealIntegrationSetting: (payload) => postJson('/api/reveal-integration-setting', payload),
    getNotionJobs: () => fetch('/api/notion-jobs').then((response) => response.json()),
    updateNotionTaskStatus: (payload) => postJson('/api/notion-task-status', payload),
    manageNotionItem: (payload) => postJson('/api/notion-item', payload),
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
    credential: 'Vercel env -> Supabase URL and anon key',
    steps: [
      'Create a Supabase project.',
      'Add the project URL and anon key locally.',
      'Run the NoA memory schema before syncing local captures.'
    ],
    fields: [
      { key: 'SUPABASE_URL', label: 'Project URL', type: 'url', required: true, placeholder: 'https://your-project.supabase.co' },
      { key: 'SUPABASE_ANON_KEY', label: 'Anon key', type: 'password', required: true, placeholder: 'eyJ...' }
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
      { key: 'NOTION_TASKS_DATABASE_ID', label: 'Tasks database ID', required: true, placeholder: '36ff2ec220f2808ba6a8cfa333adefb5' },
      { key: 'NOTION_PIPELINE_VIEW_ID', label: 'Pipeline view ID', required: true, placeholder: '36ff2ec220f280f18188000c8a4ed4e7' },
      { key: 'NOTION_TASKS_VIEW_ID', label: 'Tasks view ID', required: true, placeholder: '370f2ec220f2816791d9000c3aadc277' },
      { key: 'NOTION_JOBS_DATABASE_ID', label: 'Upcoming jobs database ID', required: true, placeholder: '36ff2ec220f280da9c3ac1072b0ef022' }
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
      'Save XERO_CLIENT_ID and XERO_CLIENT_SECRET in Vercel, redeploy, then open https://no-a.vercel.app/api/xero/start.',
      'Copy the returned refresh token and tenant id into Vercel environment variables, then redeploy again.'
    ],
    fields: [
      { key: 'XERO_CLIENT_ID', label: 'Client ID', required: true, placeholder: 'Xero app client id' },
      { key: 'XERO_CLIENT_SECRET', label: 'Client secret', type: 'password', required: true, placeholder: 'Xero app client secret' },
      { key: 'XERO_REFRESH_TOKEN', label: 'Refresh token', type: 'password', required: true, placeholder: 'OAuth refresh token with offline_access' },
      { key: 'XERO_TENANT_ID', label: 'Tenant ID', placeholder: 'Returned by /api/xero/callback' },
      { key: 'XERO_REDIRECT_URI', label: 'Redirect URI', placeholder: 'https://no-a.vercel.app/api/xero/callback' }
    ]
  }
];

function App() {
  const [screen, setScreen] = useState<Screen>('today');
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
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
      ? { openai: false, supabase: false, n8n: false, notion: false, xero: false, ...(JSON.parse(saved) as Partial<IntegrationStatus>) }
      : { openai: false, supabase: false, n8n: false, notion: false, xero: false };
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
  const [voiceEnabled, setVoiceEnabled] = useState(() => window.localStorage.getItem('noa.voiceEnabled') !== 'false');
  const [voiceState, setVoiceState] = useState<VoiceState>(() => window.localStorage.getItem('noa.voiceEnabled') === 'false' ? 'off' : 'active');
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
  const voiceSupported = false;
  const recordingSupported = typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia) && typeof MediaRecorder !== 'undefined';

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  useEffect(() => {
    window.localStorage.setItem('noa.quickCapture', JSON.stringify(notes));
  }, [notes]);

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

  useEffect(() => {
    if (!voiceEnabled || voiceActivationEnabledRef.current || !window.noa?.startOfflineWake) return;
    setVoiceFallbackMode(true);
    void enableOfflineActivation();
  }, [voiceEnabled]);

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

  const loadNotionJobs = async () => {
    if (!window.noa?.getNotionJobs) return emptyJobsReport;
    setIsLoadingJobs(true);
    try {
      const report = await window.noa.getNotionJobs();
      setJobsReport(report);
      return report;
    } finally {
      setIsLoadingJobs(false);
    }
  };

  useEffect(() => {
    if (screen === 'pipeline' || screen === 'tasks' || screen === 'upcoming-jobs') {
      void loadNotionJobs();
    }
  }, [screen]);

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

  return (
    <main className="shell">
      <aside className="rail">
        <div className="brand">
          <div className="brand-mark">NoA</div>
          <div>
            <strong>NoA</strong>
            <span>Personal command centre</span>
          </div>
        </div>

        <nav className="nav-list">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} className={screen === item.id ? 'active' : ''} onClick={() => setScreen(item.id)}>
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="rail-status">
          <span />
          Private workspace
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Noetic Advisor</p>
            <h1>{screenTitle(screen)}</h1>
          </div>
          <div className="top-actions">
            <button className="mobile-more-trigger" onClick={() => setIsMoreMenuOpen((current) => !current)} aria-label="Open more pages">
              <MoreHorizontal size={18} />
              More
            </button>
            <StatusPill tone="success" icon={ShieldCheck} label="Protected actions" />
            <StatusPill tone="info" icon={Bot} label="Noah ready" />
            <StatusPill tone="muted" icon={LockKeyhole} label="Private mode" />
          </div>
        </header>

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
            speakNoahReply={speakNoahReply}
          />
        )}
        {screen === 'pipeline' && (
          <PipelineBoard
            report={jobsReport}
            isLoading={isLoadingJobs}
            refreshJobs={loadNotionJobs}
          />
        )}
        {screen === 'tasks' && (
          <TasksView
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
        {screen === 'plan' && <Plan />}
        {screen === 'memory' && <Memory notes={notes} />}
        {screen === 'automations' && <Automations />}
        {screen === 'network' && <NetworkView />}
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
        {screen === 'settings' && <SettingsView integrationStatus={integrationStatus} />}
      </section>

      <MobileNav
        screen={screen}
        setScreen={(nextScreen) => {
          setScreen(nextScreen);
          setIsMoreMenuOpen(false);
        }}
        isMoreMenuOpen={isMoreMenuOpen}
        closeMoreMenu={() => setIsMoreMenuOpen(false)}
      />
    </main>
  );
}

function MobileNav({
  screen,
  setScreen,
  isMoreMenuOpen,
  closeMoreMenu,
}: {
  screen: Screen;
  setScreen: (screen: Screen) => void;
  isMoreMenuOpen: boolean;
  closeMoreMenu: () => void;
}) {
  const primaryItems: Array<{ id: Screen; label: string; icon: React.ElementType }> = [
    { id: 'today', label: 'Home', icon: Home },
    { id: 'upcoming-jobs', label: 'Jobs', icon: BriefcaseBusiness },
    { id: 'tasks', label: 'Tasks', icon: ListTodo },
    { id: 'pipeline', label: 'Pipeline', icon: Kanban }
  ];
  const secondaryItems = navItems.filter((item) => !primaryItems.some((primary) => primary.id === item.id));

  return (
    <>
      {isMoreMenuOpen && (
        <div className="mobile-more-menu">
          <button className="mobile-menu-backdrop" onClick={closeMoreMenu} aria-label="Close more pages" />
          <div className="mobile-more-sheet">
            <div className="mobile-more-head">
              <strong>More</strong>
              <button onClick={closeMoreMenu}>Close</button>
            </div>
            <div className="mobile-more-grid">
              {secondaryItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    className={screen === item.id ? 'active' : ''}
                    onClick={() => setScreen(item.id)}
                  >
                    <Icon size={18} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <nav className="mobile-dock" aria-label="Primary mobile navigation">
        {primaryItems.slice(0, 2).map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.id} className={screen === item.id ? 'active' : ''} onClick={() => setScreen(item.id)}>
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
        <button
          className={`mobile-speak ${screen === 'noah' ? 'active' : ''}`}
          onClick={() => setScreen('noah')}
          aria-label="Open Noah"
        >
          <span className="speak-ring" />
          <Bot size={22} />
          <small>Noah</small>
        </button>
        {primaryItems.slice(2).map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.id} className={screen === item.id ? 'active' : ''} onClick={() => setScreen(item.id)}>
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
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

function VoicePanel({
  enabled,
  state,
  transcript,
  error,
  supported,
  fallbackMode,
  recordingSupported,
  isRecording,
  activationEnabled,
  offlineWakeReady,
  toggleVoice,
  toggleRecording,
  toggleActivation,
  interruptVoice
}: {
  enabled: boolean;
  state: VoiceState;
  transcript: string;
  error: string;
  supported: boolean;
  fallbackMode: boolean;
  recordingSupported: boolean;
  isRecording: boolean;
  activationEnabled: boolean;
  offlineWakeReady: boolean;
  toggleVoice: () => void;
  toggleRecording: () => void;
  toggleActivation: () => void | Promise<void>;
  interruptVoice: () => void;
}) {
  if (!enabled && state !== 'error') return null;

  const stateLabel = {
    off: 'Voice off',
    wake: 'Say "Hey Noah"',
    active: 'Listening',
    thinking: 'Thinking',
    speaking: 'Speaking',
    error: 'Voice unavailable'
  }[state];
  const voiceMode: VoiceMode = state === 'speaking'
    ? 'speaking'
    : state === 'thinking'
      ? 'thinking'
      : isRecording || state === 'active'
        ? 'listening'
        : state === 'error'
          ? 'error'
          : 'idle';
  const status = error
    || transcript
    || (activationEnabled
      ? offlineWakeReady ? 'Say "Hey Noah" whenever you need me.' : 'Starting local wake listening...'
      : 'Tap the mic or say Hey Noah once activation is ready.');

  return (
    <section className={`voice-panel ${state} ${voiceMode}`}>
      <div className="siri-orb" aria-hidden="true">
        <div className="siri-core">
          <span className="voice-wave w1" />
          <span className="voice-wave w2" />
          <span className="voice-wave w3" />
          <span className="voice-wave w4" />
          <span className="voice-wave w5" />
        </div>
      </div>
      <div className="voice-copy">
        <strong>{activationEnabled ? offlineWakeReady ? 'Noah is listening' : 'Starting Noah' : fallbackMode ? 'Noah voice is ready' : supported ? stateLabel : 'Voice assistant ready'}</strong>
        <p>{status}</p>
      </div>
      <div className="voice-actions">
        {state === 'speaking' && <button onClick={interruptVoice} aria-label="Stop Noah speaking">Stop</button>}
        {fallbackMode && recordingSupported && (
          <button className={isRecording ? 'recording icon-button' : 'icon-button'} onClick={() => void toggleRecording()} aria-label={isRecording ? 'Stop listening' : 'Talk to Noah'}>
            {isRecording ? <MicOff size={17} /> : <Mic size={17} />}
          </button>
        )}
        {window.noa?.startOfflineWake && (
          <button className={activationEnabled ? 'active' : ''} onClick={toggleActivation}>
            {activationEnabled ? 'Wake on' : window.noa?.isBrowserLanMode ? 'Tablet wake' : 'Wake'}
          </button>
        )}
        <button onClick={toggleVoice}>{enabled ? 'Off' : 'On'}</button>
      </div>
    </section>
  );
}

function VolumeControl({ volume, setVolume }: { volume: number; setVolume: (value: number) => void }) {
  return (
    <div className="volume-control">
      <Volume2 size={16} />
      <input
        aria-label="Noah voice volume"
        min="0"
        max="1"
        step="0.01"
        type="range"
        value={volume}
        onChange={(event) => setVolume(Number(event.target.value))}
      />
      <span>{Math.round(volume * 100)}</span>
    </div>
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
  const pipelineTasks = report.pipelineTasks?.length ? report.pipelineTasks : report.tasks;
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

  const overdueCount = boardTasks.filter((task) => task.dueState === 'Overdue').length;
  const dueTodayCount = boardTasks.filter((task) => task.dueState === 'Due today').length;
  const highPriorityCount = boardTasks.filter((task) => task.priority === 'High').length;

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
          <PanelTitle eyebrow="Notion pipeline view" title="Pipeline" />
          <p className="section-copy">
            Drag cards between columns to update the Status property in Notion.
          </p>
          {pipelineMessage && <p className="pipeline-message">{pipelineMessage}</p>}
        </div>
        <div className="jobs-actions">
          <div className="jobs-sync">
            <span>{report.fetchedAt ? `Synced ${new Date(report.fetchedAt).toLocaleString()}` : 'Not synced yet'}</span>
            <strong>{boardTasks.length} shown</strong>
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

      {report.mainJobsError && (
        <article className="glass-card wide jobs-error">
          <CircleAlert size={20} />
          <p>{report.mainJobsError}</p>
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
  task: NotionTask;
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
        {task.effortSize && <span>{task.effortSize}</span>}
      </div>
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
      {task.taskTypes.length > 0 && (
        <div className="job-chip-row">
          {task.taskTypes.slice(0, 3).map((type) => <span key={type}>{type}</span>)}
        </div>
      )}
      {task.assignees.length > 0 && (
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
  const tasks = report.taskList?.length ? report.taskList : [];
  const highPriorityCount = tasks.filter((task) => task.priority === 'High').length;
  const overdueCount = tasks.filter((task) => task.dueState === 'Overdue').length;
  const noDateCount = tasks.filter((task) => !task.dueDate).length;
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
      window.alert(result.message);
      return;
    }
    setEditor(null);
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
            Focused task list powered by your saved Notion tasks view.
          </p>
        </div>
        <div className="jobs-actions">
          <div className="jobs-sync">
            <span>{report.fetchedAt ? `Synced ${new Date(report.fetchedAt).toLocaleString()}` : 'Not synced yet'}</span>
            <strong>{tasks.length} tasks</strong>
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
          <span>Total</span>
          <strong>{tasks.length}</strong>
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
          <span>No date</span>
          <strong>{noDateCount}</strong>
        </article>
      </section>

      <section className="task-list">
        {tasks.length === 0 ? (
          <article className="glass-card wide">
            <p className="empty-state">No tasks are visible in this Notion view.</p>
          </article>
        ) : (
          tasks.map((task) => (
            <TaskRow
              task={task}
              key={task.id}
              onOpen={() => setEditor({ mode: 'view', kind: 'task', item: task })}
              onEdit={() => setEditor({ mode: 'edit', kind: 'task', item: task })}
            />
          ))
        )}
      </section>
      {editor && (
        <NotionItemModal
          mode={editor.mode}
          kind="task"
          item={editor.item}
          onClose={() => setEditor(null)}
          onEdit={() => setEditor((current) => current ? { ...current, mode: 'edit' } : current)}
          onSave={handleTaskSave}
          onArchive={editor.item ? handleTaskArchive : undefined}
        />
      )}
    </section>
  );
}

function TaskRow({ task, onOpen, onEdit }: { task: NotionTask; onOpen: () => void; onEdit: () => void }) {
  return (
    <article className={`task-row priority-${(task.priority || 'none').toLowerCase()}`}>
      <span className="priority-dot" />
      <button className="task-row-main" onClick={onOpen}>
        <strong>{task.title}</strong>
        <p>{task.description || task.status || 'No description'}</p>
      </button>
      <span>{task.status || 'No status'}</span>
      <span className={`due-pill ${task.dueState === 'Overdue' ? 'danger' : task.dueState === 'Due today' ? 'today' : ''}`}>
        {task.dueDate ? `${task.dueState} · ${task.dueDate}` : 'No date'}
      </span>
      <div className="row-actions">
        <button onClick={onOpen}>View</button>
        <button onClick={onEdit} aria-label={`Edit ${task.title}`}><Edit3 size={14} /></button>
      </div>
    </article>
  );
}

function UpcomingJobsView({
  report,
  isLoading,
  refreshJobs
}: {
  report: NotionJobsReport;
  isLoading: boolean;
  refreshJobs: () => Promise<NotionJobsReport>;
}) {
  const jobs = report.upcomingJobs;
  const dueSoonCount = jobs.filter((job) => ['Overdue', 'Due today', 'Tomorrow', 'Due soon'].includes(job.dueState)).length;
  const [editor, setEditor] = useState<{ mode: NotionEditorMode; kind: NotionItemKind; item?: NotionJobsReport['upcomingJobs'][number] | null } | null>(null);

  const handleJobSave = async (values: Record<string, string>) => {
    if (!editor || !window.noa?.manageNotionItem) return;
    const result = await window.noa.manageNotionItem({
      kind: 'job',
      action: editor.mode === 'create' ? 'create' : 'update',
      id: editor.item?.id,
      values
    });
    if (!result.ok) {
      window.alert(result.message);
      return;
    }
    setEditor(null);
    await refreshJobs();
  };

  const handleJobArchive = async () => {
    if (!editor?.item?.id || !window.noa?.manageNotionItem) return;
    const result = await window.noa.manageNotionItem({ kind: 'job', action: 'archive', id: editor.item.id });
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
          <PanelTitle eyebrow="Notion jobs database" title="Upcoming Jobs" />
          <p className="section-copy">
            Upcoming work pulled from your separate jobs database.
          </p>
        </div>
        <div className="jobs-actions">
          <div className="jobs-sync">
            <span>{report.fetchedAt ? `Synced ${new Date(report.fetchedAt).toLocaleString()}` : 'Not synced yet'}</span>
            <strong>{jobs.length} jobs</strong>
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
          <span>Total</span>
          <strong>{jobs.length}</strong>
        </article>
        <article>
          <span>Due soon</span>
          <strong>{dueSoonCount}</strong>
        </article>
        <article>
          <span>High priority</span>
          <strong>{jobs.filter((job) => job.priority === 'High').length}</strong>
        </article>
        <article>
          <span>Locations</span>
          <strong>{new Set(jobs.map((job) => job.location).filter(Boolean)).size}</strong>
        </article>
      </section>

      <section className="upcoming-grid">
        {jobs.length === 0 ? (
          <article className="glass-card wide">
            <p className="empty-state">No upcoming jobs found.</p>
          </article>
        ) : (
          jobs.map((job) => (
            <UpcomingJobCard
              job={job}
              key={job.id}
              onOpen={() => setEditor({ mode: 'view', kind: 'job', item: job })}
              onEdit={() => setEditor({ mode: 'edit', kind: 'job', item: job })}
            />
          ))
        )}
      </section>
      {editor && (
        <NotionItemModal
          mode={editor.mode}
          kind="job"
          item={editor.item}
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
  job: NotionJobsReport['upcomingJobs'][number];
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
      </div>
      {job.location && <p className="job-assignee">{job.location}</p>}
      {job.deliverableTypes.length > 0 && (
        <div className="job-chip-row">
          {job.deliverableTypes.slice(0, 4).map((type) => <span key={type}>{type}</span>)}
        </div>
      )}
    </article>
  );
}

function NotionItemModal({
  mode,
  kind,
  item,
  onClose,
  onEdit,
  onSave,
  onArchive
}: {
  mode: NotionEditorMode;
  kind: NotionItemKind;
  item?: (NotionTask | NotionJobsReport['upcomingJobs'][number]) | null;
  onClose: () => void;
  onEdit: () => void;
  onSave: (values: Record<string, string>) => Promise<void>;
  onArchive?: () => Promise<void>;
}) {
  const isJob = kind === 'job';
  const [values, setValues] = useState<Record<string, string>>(() => getInitialNotionValues(kind, item));
  const [isSaving, setIsSaving] = useState(false);
  const isReadOnly = mode === 'view';
  const title = mode === 'create'
    ? isJob ? 'New job' : 'New task'
    : values.title || (isJob ? 'Job details' : 'Task details');

  const updateValue = (key: string, value: string) => setValues((current) => ({ ...current, [key]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isReadOnly || !values.title.trim()) return;
    setIsSaving(true);
    try {
      await onSave(values);
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
            <input value={values.title} onChange={(event) => updateValue('title', event.target.value)} readOnly={isReadOnly} required />
          </label>

          {isJob ? (
            <>
              <label className="notion-field">
                <span>Client</span>
                <input value={values.client} onChange={(event) => updateValue('client', event.target.value)} readOnly={isReadOnly} />
              </label>
              <label className="notion-field">
                <span>Job date</span>
                <input type="date" value={values.jobDate} onChange={(event) => updateValue('jobDate', event.target.value)} readOnly={isReadOnly} />
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
                <span>Location</span>
                <input value={values.location} onChange={(event) => updateValue('location', event.target.value)} readOnly={isReadOnly} />
              </label>
              <label className="notion-field wide">
                <span>Deliverables</span>
                <input value={values.deliverableTypes} onChange={(event) => updateValue('deliverableTypes', event.target.value)} readOnly={isReadOnly} placeholder="Video, Photos, Reels" />
              </label>
            </>
          ) : (
            <>
              <label className="notion-field">
                <span>Status</span>
                <select value={values.status} onChange={(event) => updateValue('status', event.target.value)} disabled={isReadOnly}>
                  <option>Not started</option>
                  <option>In progress</option>
                  <option>Ready For Revision</option>
                  <option>Final Draft/Notes</option>
                  <option>Done</option>
                </select>
              </label>
              <label className="notion-field">
                <span>Due date</span>
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
                <span>Effort</span>
                <select value={values.effortLevel} onChange={(event) => updateValue('effortLevel', event.target.value)} disabled={isReadOnly}>
                  <option value="">No effort</option>
                  <option>Small</option>
                  <option>Medium</option>
                  <option>Large</option>
                </select>
              </label>
              <label className="notion-field wide">
                <span>Task types</span>
                <input value={values.taskTypes} onChange={(event) => updateValue('taskTypes', event.target.value)} readOnly={isReadOnly} placeholder="Bug, Feature request, Polish" />
              </label>
              <label className="notion-field wide">
                <span>Description</span>
                <textarea value={values.description} onChange={(event) => updateValue('description', event.target.value)} readOnly={isReadOnly} />
              </label>
            </>
          )}
        </div>

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
  );
}

function getInitialNotionValues(kind: NotionItemKind, item?: (NotionTask | NotionJobsReport['upcomingJobs'][number]) | null): Record<string, string> {
  if (kind === 'job') {
    const job = item as NotionJobsReport['upcomingJobs'][number] | null | undefined;
    return {
      title: job?.title || '',
      client: job?.client || '',
      jobDate: job?.jobDate || '',
      priority: job?.priority || '',
      location: job?.location || '',
      deliverableTypes: job?.deliverableTypes?.join(', ') || ''
    };
  }

  const task = item as NotionTask | null | undefined;
  return {
    title: task?.title || '',
    status: task?.status || 'Not started',
    dueDate: task?.dueDate || '',
    priority: task?.priority || '',
    effortLevel: task?.effortLevel || '',
    taskTypes: task?.taskTypes?.join(', ') || '',
    description: task?.description || ''
  };
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
  inboxSummary
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
}) {
  return (
    <section className="page-fade">
      <div className="hero-grid">
        <article className="hero-card">
          <p className="eyebrow">Daily intelligence loop</p>
          <h2>{greeting}. Here is what deserves your attention.</h2>
          <p>
            Noah is designed to reduce the number of things you need to hold in your head. Start with a question,
            capture what matters, and keep every external action behind a clear approval.
          </p>
          <CommandBar command={command} setCommand={setCommand} sendCommand={sendCommand} />
        </article>

        <article className="core-card">
          <div className="orb">
            <BrainCircuit size={58} />
          </div>
          <h3>Noah is listening</h3>
          <p>Your workspace is private. Drafts, recommendations, and workflows stay review-first.</p>
          <button className="secondary-action">
            <Play size={16} />
            Start briefing
          </button>
        </article>
      </div>

      <section className="briefing-strip">
        {[
          { label: 'Main focus', value: smartBriefing.mainFocus, detail: 'Based on the newest items in your memory inbox.' },
          { label: 'Risk', value: smartBriefing.risk, detail: 'Noah is watching for scattered context, unresolved approvals, and loose tasks.' },
          { label: 'First action', value: smartBriefing.firstAction, detail: 'The simplest useful move before connecting external systems.' }
        ].map((item) => (
          <article key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <p>{item.detail}</p>
          </article>
        ))}
      </section>

      <div className="metric-grid">
        {metricCards.map((card, index) => {
          const Icon = card.icon;
          const liveCard = inboxSummary[index] ?? card;
          return (
            <article className="glass-card metric-card" key={card.label}>
              <Icon size={22} />
              <p>{liveCard.label}</p>
              <h3>{liveCard.value}</h3>
              <span>{liveCard.detail}</span>
            </article>
          );
        })}
      </div>

      <section className="split-grid">
        <article className="glass-card wide">
          <PanelTitle eyebrow="Noah recommends" title="Priority stack" />
          <div className="priority-list">
            {priorities.map((priority) => (
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

        <article className="glass-card wide">
          <PanelTitle eyebrow="Focus rhythm" title="A calmer way through the day" />
          <div className="focus-list">
            {focusItems.map((item) => (
              <div className={`focus-row ${item.tone}`} key={item.title}>
                <span>{item.time}</span>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="split-grid lower-grid">
        <article className="glass-card wide">
          <PanelTitle eyebrow="Awaiting review" title="Approvals" />
          <div className="approval-list">
            {approvalItems.map((item) => (
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

        <article className="glass-card wide">
          <PanelTitle eyebrow="Ready when you are" title="Connect the next layer" />
          <div className="decision-list">
            <Decision icon={Database} title="Memory" detail="Tasks, projects, clients, decisions, and recurring preferences." />
            <Decision icon={Zap} title="Automations" detail="Scheduled briefings, event intake, and repeatable workflows through n8n." />
            <Decision icon={MessageSquareText} title="Noah" detail="Advisor responses that use your context and respect approvals." />
          </div>
        </article>
      </section>

      <article className="glass-card wide capture-panel">
        <PanelTitle eyebrow="Private capture" title="Give Noah something to remember" />
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
  isNoahThinking,
  speakNoahReply
}: {
  messages: ChatMessage[];
  command: string;
  setCommand: (value: string) => void;
  sendCommand: () => void;
  notes: CaptureNote[];
  smartBriefing: SmartBriefing;
  isNoahThinking: boolean;
  speakNoahReply: (text: string) => Promise<void>;
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
                    <button aria-label="Read aloud" title="Read aloud" onClick={() => void speakNoahReply(message.text)}>
                      <Volume2 size={15} />
                    </button>
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

function NetworkView() {
  return (
    <section className="network page-fade">
      <div className="scanline" />
      <div className="network-core">
        <span>NoA</span>
        <small>v2</small>
      </div>
      {systemNodes.map((node, index) => (
        <div key={node.name} className={`network-node n${index + 1} ${node.status}`}>
          {node.name}
        </div>
      ))}
      {systemNodes.map((node, index) => (
        <div key={`${node.name}-line`} className={`pulse-line l${index + 1}`} />
      ))}
      <div className="network-panel left">
        <p className="eyebrow">Topology</p>
        <h3>One platform, modular systems</h3>
        <p>NoA becomes useful when memory, automation, integrations, approvals, and Noah share the same context.</p>
      </div>
      <div className="network-panel right">
        <p className="eyebrow">Next layer</p>
        <h3>Make it live</h3>
        <p>Memory, workflows, and Noah's reasoning should connect without changing the calm shape of the app.</p>
      </div>
    </section>
  );
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

function SettingsView({ integrationStatus }: { integrationStatus: IntegrationStatus }) {
  const configuredCount = Object.values(integrationStatus).filter(Boolean).length;

  return (
    <section className="settings page-fade">
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
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
N8N_WEBHOOK_URL=your_n8n_webhook_url
N8N_SHARED_SECRET=choose_a_long_random_secret
NOTION_TOKEN=your_notion_token_optional
NOTION_TASKS_DATABASE_ID=36ff2ec220f2808ba6a8cfa333adefb5
NOTION_PIPELINE_VIEW_ID=36ff2ec220f280f18188000c8a4ed4e7
NOTION_TASKS_VIEW_ID=370f2ec220f2816791d9000c3aadc277
NOTION_JOBS_DATABASE_ID=36ff2ec220f280da9c3ac1072b0ef022
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
    pipeline: 'Pipeline',
    tasks: 'Tasks',
    'upcoming-jobs': 'Upcoming Jobs',
    plan: 'Build Plan',
    memory: 'Memory',
    automations: 'Automations',
    network: 'Network Core',
    integrations: 'Integrations',
    settings: 'Settings'
  }[screen];
}

function statusForColumn(column: string) {
  return {
    'Not Started': 'Not started',
    'In Progress': 'In progress',
    'Ready for Revision': 'Ready For Revision',
    'Final Draft/Notes': 'Final Draft/Notes'
  }[column] || column;
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
