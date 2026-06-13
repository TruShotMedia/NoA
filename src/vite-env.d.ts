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
        effortLevel: string;
        effortSize: string;
        taskTypes: string[];
        assignees: Array<{ id: string; name: string; avatarUrl: string | null }>;
        description: string;
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
        effortLevel: string;
        effortSize: string;
        taskTypes: string[];
        assignees: Array<{ id: string; name: string; avatarUrl: string | null }>;
        description: string;
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
        effortLevel: string;
        effortSize: string;
        taskTypes: string[];
        assignees: Array<{ id: string; name: string; avatarUrl: string | null }>;
        description: string;
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
