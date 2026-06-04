/**
 * API Client for Clarity Agentic App Backend
 *
 * Communicates with FastAPI backend on port 8000
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || ''; // Use relative URLs for production (proxied by Nginx)

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// The Claritty platform embeds this app (and its widgets) in an iframe and puts
// the trusted edge admission token on the URL as `?claritty_token=<jwt>`. The
// backend's `require_user` verifies that token against the edge secret — a
// `Bearer test-user` fallback is rejected (401), which is what made every widget
// show its error state. Capture the token once at module load (it can be dropped
// from the URL later by client-side routing) so every request can present it.
const edgeToken = new URLSearchParams(window.location.search).get(
  'claritty_token',
);

// Add authentication headers to requests
api.interceptors.request.use((config) => {
  // Priority 1: the platform edge token (production / embedded iframe). This is
  // the trusted identity the backend verifies; never fall back to a default when
  // it is present.
  if (edgeToken) {
    config.headers.Authorization = `Bearer ${edgeToken}`;
    return config;
  }

  // Priority 2: X-User-ID for marketplace integration (when set by the host).
  const userId = localStorage.getItem('user_id');
  if (userId) {
    config.headers['X-User-ID'] = userId;
  }

  // Priority 3: a stored auth token, or — ONLY in local dev — the `test-user`
  // convenience identity so `docker compose up` works without the platform.
  // In production we send NO default Authorization: a real 401 is correct and
  // safe, where `test-user` would silently merge every user's data.
  const token =
    localStorage.getItem('auth_token') ||
    (import.meta.env.DEV ? 'test-user' : null);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Types
export interface Agent {
  id: string;
  name: string;
  description: string;
  category: string;
  inputs: Record<string, any>;
  outputs: Record<string, any>;
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
    inputs?: Record<string, any>;
    outputs?: Record<string, any>;
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

export const executeAgent = async (agentId: string, inputData: Record<string, any>) => {
  const response = await api.post(`/api/agents/${agentId}/execute`, inputData);
  return response.data;
};

export const listWorkflows = async (): Promise<Workflow[]> => {
  const response = await api.get('/api/workflows');
  return response.data.workflows;
};

export const executeWorkflow = async (workflowId: string, inputData?: Record<string, any>) => {
  const response = await api.post(`/api/workflows/${workflowId}/execute`, inputData);
  return response.data;
};

export const getWorkflowExecution = async (executionId: string) => {
  const response = await api.get(`/api/workflows/executions/${executionId}`);
  return response.data;
};

// Trigger management lives on the Claritty platform now (not in-app).

// Helper functions / aliases for convenience (wrapped format for Dashboard compatibility)
export const getAgents = async () => ({ agents: await listAgents() });
export const getWorkflows = async () => ({ workflows: await listWorkflows() });

export default api;
