/**
 * API Client for Clarity Agentic App Backend
 *
 * Communicates with FastAPI backend on port 8000
 */

import axios from 'axios';

/**
 * Where API requests go depends on HOW the app is being served:
 *
 *  - PREVIEW (during/just-after generation): the platform serves this app
 *    through the clarity-api proxy at `…/api/proxy/app/<userId>/<appId>/`. The
 *    proxy authenticates the platform user and WRAPS every forwarded request
 *    with the trusted identity (X-User-Id + X-Claritty-Auth). So our requests
 *    MUST go through the proxy's backend path `…/api/proxy/api/<userId>/<appId>`
 *    — a root-relative `/api/...` would escape to the platform root and 401.
 *
 *  - DEPLOYED (CloudFront + Lambda@Edge): served same-origin on
 *    `<appId>.apps.claritty.ai` with `?claritty_token=<jwt>`; the edge wraps the
 *    request after verifying that token. Base is same-origin; we attach the token.
 *
 * Resolved ONCE and cached in sessionStorage so client-side routing / a refresh
 * on a sub-route (which can drop the URL prefix or the `?claritty_token`) never
 * loses the wrapping context.
 */
export function resolveProxyApiBase(pathname: string): string | null {
  // `…/api/proxy/app/<userId>/<appId>` → `…/api/proxy/api/<userId>/<appId>`
  const m = pathname.match(/^(.*\/api\/proxy)\/app\/([^/]+)\/([^/]+)(?=\/|$)/);
  return m ? `${m[1]}/api/${m[2]}/${m[3]}` : null;
}

function persisted(key: string, value: string | null): string | null {
  try {
    if (value) {
      sessionStorage.setItem(key, value);
      return value;
    }
    return sessionStorage.getItem(key);
  } catch {
    return value; // sessionStorage unavailable (rare) — fall back to the live value
  }
}

// Preview proxy base (if served through the proxy) — sticky across routing.
const proxyApiBase = persisted(
  'claritty_api_base',
  resolveProxyApiBase(window.location.pathname),
);

// Deployed edge token — sticky across routing (was previously a one-shot read
// of window.location.search, lost the moment routing dropped the query param).
const edgeToken = persisted(
  'claritty_token',
  new URLSearchParams(window.location.search).get('claritty_token'),
);

const API_BASE_URL =
  proxyApiBase ?? (import.meta.env.VITE_API_URL || ''); // proxy path, or same-origin

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add authentication to requests.
api.interceptors.request.use((config) => {
  // Multipart uploads: the axios instance defaults every request to
  // `Content-Type: application/json`. Sent with a FormData body that makes the
  // server unable to parse the file part (FastAPI → 422 "unprocessable"). Drop
  // the header for FormData so the browser sets `multipart/form-data` WITH the
  // required boundary. Must run before the early returns below so it applies in
  // both preview and deployed modes.
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    const h = config.headers as unknown as {
      delete?: (name: string) => void;
      [key: string]: unknown;
    };
    if (typeof h.delete === 'function') h.delete('Content-Type');
    else delete h['Content-Type'];
  }

  // PREVIEW: the proxy wraps the request with the trusted identity server-side,
  // so we attach NO token — sending one would be ignored, and the proxy is the
  // source of truth for "the right user".
  if (proxyApiBase) {
    return config;
  }

  // DEPLOYED: present the platform edge token; the edge verifies + injects the
  // identity. Never fall back to a default when it's present.
  if (edgeToken) {
    config.headers.Authorization = `Bearer ${edgeToken}`;
    return config;
  }

  // Marketplace / host-set identity fallback.
  const userId = localStorage.getItem('user_id');
  if (userId) {
    config.headers['X-User-ID'] = userId;
  }

  // A stored auth token, or — ONLY in local dev — the `test-user` convenience
  // identity so `docker compose up` works without the platform. In production we
  // send NO default Authorization: a real 401 is correct and safe, where
  // `test-user` would silently merge every user's data.
  const token =
    localStorage.getItem('auth_token') ||
    (import.meta.env.DEV ? 'test-user' : null);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// ── Error helpers ─────────────────────────────────────────────────────────────
/**
 * A typed view of an API error: HTTP status + the backend's machine `error` code
 * + a human message. ALWAYS run a caught error through this and show the message
 * in a toast — never swallow it (see "Surface every error" in CLAUDE.md). On a
 * 409 the backend signals NOT_CONNECTED ("connect <service>"); special-case it.
 */
export interface ApiError {
  status?: number;
  code?: string;
  message: string;
  /** On a NOT_CONNECTED 409: which integration, and a ready connect deep link. */
  service?: string;
  connectUrl?: string | null;
}

export function toApiError(err: unknown): ApiError {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    const raw = err.response?.data as Record<string, unknown> | undefined;
    // FastAPI nests a structured HTTPException payload under `detail`; a plain
    // error uses a string `detail`/`message`. Handle both.
    const detailObj =
      raw && typeof raw.detail === 'object' && raw.detail !== null
        ? (raw.detail as Record<string, unknown>)
        : null;
    const body = detailObj ?? raw ?? {};
    const str = (v: unknown): string | undefined =>
      typeof v === 'string' ? v : undefined;
    return {
      status,
      code: str(body.error),
      message:
        str(body.message) ||
        str(raw?.detail) ||
        str(raw?.message) ||
        err.message,
      service: str(body.service),
      connectUrl:
        typeof body.connect_url === 'string' ? body.connect_url : null,
    };
  }
  return { message: err instanceof Error ? err.message : 'Something went wrong' };
}

// Types
export interface Agent {
  id: string;
  name: string;
  description: string;
  category: string;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  integrations: Array<{
    service: string;
    required: boolean;
    auth_type: string;
  }>;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  execution_mode: string;
  steps: Array<{
    agent_id: string;
    output_key?: string;
  }>;
  agent_steps?: Array<{
    agent_id: string;
    output_key?: string;
  }>;
}

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: string;
  title: string;
  notes?: string | null;
  priority: TaskPriority;
  suggested_action?: string | null;
  done: boolean;
  created_at?: string | null;
}

export interface WidgetTask {
  id: string;
  title: string;
  priority: TaskPriority;
  done: boolean;
  suggested_action?: string | null;
}

// Agent/workflow/trigger graph — the v1 contract served at GET /api/graph
// (see claritty_sdk/graph.py → build_graph). Node ids are prefixed `agent:` /
// `trigger:`; edges connect those ids.
export interface GraphNode {
  id: string;
  type: 'agent' | 'trigger';
  name: string;
  data?: {
    agentId?: string;
    triggerId?: string;
    category?: string;
    description?: string;
    templateType?: string;
    workflowId?: string;
    inputs?: Record<string, unknown>;
    outputs?: Record<string, unknown>;
  };
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  data?: { workflowId?: string; trigger?: boolean };
}

export interface GraphWorkflow {
  id: string;
  name: string;
  executionMode?: string;
  steps?: Array<{ agentId: string; outputKey?: string; inputFrom?: string }>;
}

export interface GraphData {
  version: number;
  nodes: GraphNode[];
  edges: GraphEdge[];
  workflows: GraphWorkflow[];
  source?: string;
}

// Shape returned by GET /api/widget (see backend/routes/app.py).
export interface WidgetData {
  open_count: number;
  done_today?: number;
  top_priority?: TaskPriority | null;
  top_task?: string | null;
  top_task_id?: string | null;
  tasks?: WidgetTask[];
  last_updated: string;
}

// API Methods

export const healthCheck = async () => {
  const response = await api.get('/health');
  return response.data;
};

export const getWidgetData = async (
  size: 'small' | 'medium' | 'large' = 'medium',
): Promise<WidgetData> => {
  const response = await api.get(`/api/widget?size=${size}`);
  return response.data;
};

/**
 * One row of REAL output the app's automation produced. Every workflow / Team
 * run auto-persists its output into the Result store, so this is the app's live
 * data — not a placeholder. `kind` is the producing workflow id. Shape mirrors
 * `Result.to_dict()` (spine item + lifecycle) in backend/models.py.
 */
export interface AppResult {
  id: string;
  title: string;
  body?: string | null;
  kind?: string | null;
  status?: string | null;
  priority?: string | null;
  source?: string | null;
  payload?: Record<string, unknown> | null;
  created_at?: string | null;
}

/**
 * Recent output the app's automation (workflows / the Team) produced, newest
 * first — the app's REAL data. Backed by GET /api/results (backend/main.py).
 * A generated app's Dashboard/Widget read this to show live output instead of
 * an empty placeholder; swap for a domain-entity endpoint once you model one.
 */
export const getResults = async (limit = 20): Promise<AppResult[]> => {
  const response = await api.get(`/api/results?limit=${limit}`);
  return response.data.results ?? [];
};

// Tasks CRUD — mirrors backend/routes/app.py.
export const getTasks = async (): Promise<Task[]> => {
  const response = await api.get('/api/tasks');
  return response.data.tasks;
};

export const createTask = async (title: string, notes?: string): Promise<Task> => {
  const response = await api.post('/api/tasks', { title, notes });
  return response.data;
};

export const toggleTask = async (taskId: string): Promise<Task> => {
  const response = await api.post(`/api/tasks/${taskId}/toggle`);
  return response.data;
};

export const deleteTask = async (taskId: string): Promise<void> => {
  await api.delete(`/api/tasks/${taskId}`);
};

// The full agent/workflow/trigger graph (one round-trip), for the template
// showcase. See claritty_sdk/graph.py for the contract.
export const getGraph = async (): Promise<GraphData> => {
  const response = await api.get('/api/graph');
  return response.data;
};

export const listAgents = async (): Promise<Agent[]> => {
  const response = await api.get('/api/agents');
  return response.data.agents;
};

export const getAgent = async (agentId: string): Promise<Agent> => {
  const response = await api.get(`/api/agents/${agentId}`);
  return response.data;
};

export const executeAgent = async (agentId: string, inputData: Record<string, unknown>) => {
  const response = await api.post(`/api/agents/${agentId}/execute`, inputData);
  return response.data;
};

export const listWorkflows = async (): Promise<Workflow[]> => {
  const response = await api.get('/api/workflows');
  return response.data.workflows;
};

export const executeWorkflow = async (workflowId: string, inputData?: Record<string, unknown>) => {
  const response = await api.post(`/api/workflows/${workflowId}/execute`, inputData);
  return response.data;
};

export const getWorkflowExecution = async (executionId: string) => {
  const response = await api.get(`/api/workflows/executions/${executionId}`);
  return response.data;
};

// Trigger management lives on the Claritty platform now (not in-app).

// ── Integrations setup (first-run checklist) ───────────────────────────────
export interface RequiredIntegration {
  id: string;
  name: string;
  connected: boolean;
  /** Platform-hosted connect deep link for this app + integration (null in bare
   *  local dev / when the app id isn't set). Opened in a popup by ConnectButton. */
  connect_url?: string | null;
}
export interface IntegrationsStatus {
  integrations: RequiredIntegration[];
  all_connected: boolean;
  /** This app's id — used to scope the connect flow to this app. */
  app_id?: string | null;
}

/** The app's required integrations + per-user connection status. Powers the
 * first-run checklist AND the Settings → Integrations page. Returns no
 * required integrations for a self-contained app. */
export const getRequiredIntegrations = async (): Promise<IntegrationsStatus> => {
  const response = await api.get('/api/integrations/required');
  return response.data;
};

// ── AI onboarding (per-user profile that tailors the agents) ────────────────
export interface OnboardingQuestion {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select';
  options?: { value: string; label: string }[];
  help?: string;
  placeholder?: string;
  /** Conversational script (optional — synthesized from label/help if absent). */
  ask?: string;
  ack?: string;
  ack_fallback?: string;
  prefix?: string;
  suffix?: string;
}
export interface OnboardingStatus {
  questions: OnboardingQuestion[];
  completed: boolean;
  answers: Record<string, unknown>;
  persona?: { name: string; tagline?: string } | null;
  intro?: string[];
  intro_fallback?: string[];
  finale?: string[];
}

/** The app's onboarding questions + this user's saved answers. Questions are
 * authored per app in app-config.json → `onboarding.questions`. */
export const getOnboarding = async (): Promise<OnboardingStatus> => {
  const response = await api.get('/api/onboarding');
  return response.data;
};

/** Save onboarding answers. `complete:false` = incremental per-step save from
 * the concierge (profile stays resumable); default true = definitive save
 * (Settings form / concierge finale). */
export const saveOnboarding = async (
  answers: Record<string, unknown>,
  opts?: { complete?: boolean },
): Promise<OnboardingStatus> => {
  const response = await api.post('/api/onboarding', {
    answers,
    complete: opts?.complete ?? true,
  });
  return response.data;
};

/** Deterministic grounding facts the concierge weaves into its lines. */
export const getOnboardingContext = async (): Promise<{ facts: Record<string, unknown> }> => {
  const response = await api.get('/api/onboarding/context');
  return response.data;
};

/** One live in-persona concierge line for a step (LLM when the app opts in and
 * the proxy is up; ALWAYS falls back to the authored, data-grounded template). */
/** Wipe the onboarding profile so the concierge conversation replays. */
export const resetOnboarding = async (): Promise<{ reset: boolean }> => {
  const response = await api.delete('/api/onboarding');
  return response.data;
};

export const conciergeLine = async (payload: {
  step_key: string;
  value?: unknown;
  label?: unknown;
}): Promise<{ text: string; source: 'llm' | 'template' }> => {
  const response = await api.post('/api/onboarding/concierge', payload);
  return response.data;
};

// Helper functions / aliases for convenience (wrapped format for Dashboard compatibility)
export const getAgents = async () => ({ agents: await listAgents() });
export const getWorkflows = async () => ({ workflows: await listWorkflows() });

// ── Files: brokered per-app / per-user storage (images + documents) ──────────
// The platform mints presigned S3 URLs scoped to {appId}/{userId}; the app never
// holds storage credentials and bytes never stream through it. See FileUpload +
// AppImage, and backend/routes/files.py.
export interface StoredFile {
  fileId: string;
  filename: string;
  contentType: string;
  sizeBytes?: number;
  status?: 'PENDING' | 'READY';
  createdAt?: string;
}

/** Upload a file/image to this app's private storage: reserve a presigned URL,
 *  PUT the bytes STRAIGHT to S3 (not through the app — dodges Lambda's payload
 *  cap, exposes no credential), then confirm. Returns the stored file. */
export const uploadFile = async (file: File): Promise<StoredFile> => {
  const contentType = file.type || 'application/octet-stream';
  const reserve = await api.post('/api/files/upload-url', {
    filename: file.name,
    contentType,
    sizeBytes: file.size,
  });
  const { fileId, uploadUrl, contentType: putType } = reserve.data as {
    fileId: string;
    uploadUrl: string;
    contentType: string;
  };
  // Raw fetch, NOT the axios instance: presigned S3 needs the EXACT Content-Type
  // and rejects any extra/Authorization header (it would break the signature).
  const put = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': putType || contentType },
  });
  if (!put.ok) throw new Error(`Upload failed (${put.status})`);
  const confirmed = await api.post(`/api/files/${encodeURIComponent(fileId)}/confirm`);
  return confirmed.data as StoredFile;
};

export const listFiles = async (): Promise<StoredFile[]> => {
  const res = await api.get('/api/files');
  return (res.data?.files ?? []) as StoredFile[];
};

/** A fresh short-lived presigned GET URL for display/download. These expire —
 *  re-fetch per use, never persist. */
export const getFileUrl = async (fileId: string): Promise<string> => {
  const res = await api.get(`/api/files/${encodeURIComponent(fileId)}/url`);
  return (res.data?.url ?? '') as string;
};

export const deleteFile = async (fileId: string): Promise<void> => {
  await api.delete(`/api/files/${encodeURIComponent(fileId)}`);
};

export default api;
