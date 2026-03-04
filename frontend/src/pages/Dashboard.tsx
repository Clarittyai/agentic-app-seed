import { useEffect, useState } from 'react';
import { getAgents, getWorkflows, type Agent, type Workflow } from '@/lib/api';
import Widget from '@/components/Widget';
import { Bot, Workflow as WorkflowIcon, Play, ChevronRight } from 'lucide-react';

export default function Dashboard() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [agentsResp, workflowsResp] = await Promise.all([
        getAgents(),
        getWorkflows(),
      ]);
      setAgents(agentsResp.agents);
      setWorkflows(workflowsResp.workflows);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/4 mb-4"></div>
          <div className="h-48 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Monitor your agentic app, manage workflows, and view execution history.
        </p>
      </div>

      {/* Widget */}
      <Widget size="large" />

      {/* Agents Section */}
      <section>
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
          <Bot className="h-6 w-6 text-primary" />
          AI Agents
          <span className="text-base font-normal text-muted-foreground">
            ({agents.length})
          </span>
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="bg-card rounded-lg border p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-lg">{agent.name}</h3>
                  <p className="text-xs text-muted-foreground capitalize mt-1">
                    {agent.category}
                  </p>
                </div>
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {agent.description}
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Inputs:</span>
                  <span className="font-medium">
                    {agent.inputs ? Object.keys(agent.inputs).length : 0}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Outputs:</span>
                  <span className="font-medium">
                    {agent.outputs ? Object.keys(agent.outputs).length : 0}
                  </span>
                </div>
                {agent.integrations && agent.integrations.length > 0 && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Integrations:</span>
                    <span className="font-medium">
                      {agent.integrations.map((i: { service: string }) => i.service).join(', ')}
                    </span>
                  </div>
                )}
              </div>
              <button className="mt-4 w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-md py-2 px-4 text-sm font-medium hover:bg-primary/90 transition-colors">
                <Play className="h-4 w-4" />
                Execute Agent
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Workflows Section */}
      <section>
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
          <WorkflowIcon className="h-6 w-6 text-primary" />
          Workflows
          <span className="text-base font-normal text-muted-foreground">
            ({workflows.length})
          </span>
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {workflows.map((workflow) => (
            <div
              key={workflow.id}
              className="bg-card rounded-lg border p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-lg">{workflow.name}</h3>
                  <p className="text-xs text-muted-foreground capitalize mt-1">
                    {workflow.execution_mode} mode
                  </p>
                </div>
                <WorkflowIcon className="h-5 w-5 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {workflow.description}
              </p>

              {/* Workflow Steps */}
              {workflow.agent_steps && workflow.agent_steps.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground mb-2">
                    Steps ({workflow.agent_steps.length}):
                  </p>
                  <div className="flex items-center gap-1 flex-wrap">
                    {workflow.agent_steps.map((step: { agent_id: string }, index: number) => (
                      <div key={index} className="flex items-center">
                        <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">
                          {step.agent_id}
                        </span>
                        {workflow.agent_steps && index < workflow.agent_steps.length - 1 && (
                          <ChevronRight className="h-3 w-3 text-muted-foreground mx-1" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-md py-2 px-4 text-sm font-medium hover:bg-primary/90 transition-colors">
                <Play className="h-4 w-4" />
                Execute Workflow
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
