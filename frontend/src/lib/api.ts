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

// Add authentication headers to requests
api.interceptors.request.use((config) => {
  // Authentication priority:
  // 1. X-User-ID header (Clarity platform marketplace - production)
  // 2. Bearer token (development / direct access)

  // Priority 1: X-User-ID for marketplace integration
  const userId = localStorage.getItem('user_id');
  if (userId) {
    config.headers['X-User-ID'] = userId;
  }

  // Priority 2: Bearer token for development
  const token = localStorage.getItem('auth_token') || 'test-user';
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

export interface WidgetData {
  active_triggers: number;
  total_executions?: number;
  success_rate?: number;
  last_execution?: string;
  recent_executions?: Array<{
    workflow_id: string;
    status: string;
    started_at: string;
    duration_seconds?: number;
  }>;
  // Email-specific fields (for Smart Email Filter example)
  important_emails_today?: number;
  last_checked?: string;
  recent_important_emails?: Array<{
    sender: string;
    subject: string;
    urgency_level: 'critical' | 'high' | 'medium' | 'low';
  }>;
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

// For mark emails as read functionality
export const markEmailsAsRead = async () => {
  return { message: 'Emails marked as read', success: true };
};

// Integrations (Settings → Integrations). Mirrors backend/integrations/routes.py.

export interface IntegrationSetupStep {
  step: string;
  detail?: string;
  url?: string;
}

export interface IntegrationCredentialField {
  key: string;
  label: string;
  help?: string;
  secret?: boolean;
  howToObtain?: IntegrationSetupStep[];
}

export interface Integration {
  id: string;
  name: string;
  icon?: string;
  authKind: 'byo-oauth' | 'apikey' | 'basic' | 'webhook' | string;
  summary?: string;
  capabilities?: string[];
  credentialFields: IntegrationCredentialField[];
  setupGuide?: IntegrationSetupStep[];
  status: { connected: boolean; account?: string };
  redirectUri?: string;
}

export const listIntegrations = async (): Promise<Integration[]> => {
  const response = await api.get('/api/integrations');
  return response.data.integrations;
};

export const saveIntegrationCredentials = async (
  integrationId: string,
  credentials: Record<string, string>,
): Promise<Integration> => {
  const response = await api.post(
    `/api/integrations/${integrationId}/credentials`,
    { credentials },
  );
  return response.data;
};

export const getIntegrationOAuthUrl = async (
  integrationId: string,
): Promise<{ authUrl: string; redirectUri: string }> => {
  const response = await api.post(`/api/integrations/${integrationId}/oauth/auth-url`);
  return response.data;
};

export const completeIntegrationOAuth = async (
  integrationId: string,
  code: string,
  state: string,
): Promise<Integration> => {
  const response = await api.post(
    `/api/integrations/${integrationId}/oauth/callback`,
    { code, state },
  );
  return response.data;
};

export const testIntegration = async (
  integrationId: string,
): Promise<{ ok: boolean; account?: string; detail?: string }> => {
  const response = await api.post(`/api/integrations/${integrationId}/test`);
  return response.data;
};

export const disconnectIntegration = async (integrationId: string): Promise<void> => {
  await api.delete(`/api/integrations/${integrationId}`);
};

export default api;
