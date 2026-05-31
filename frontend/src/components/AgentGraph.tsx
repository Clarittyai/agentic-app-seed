import { forwardRef, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Clock, Webhook, Cpu, LayoutGrid, Loader2, Workflow, Play, Zap, Check } from 'lucide-react';
import {
  getGraph,
  executeAgent,
  executeWorkflow,
  type GraphData,
  type GraphNode,
} from '@/lib/api';
import { cn } from '@/lib/utils';

/**
 * Live, INTERACTIVE view of THIS app's agent graph — the real triggers, agents,
 * and workflows the backend serves at GET /api/graph (see claritty_sdk/graph.py).
 * Laid out as a flow Triggers → Agents → Widget, with DOM-measured SVG
 * connectors. You can actually RUN the agent (or the workflow the trigger would
 * fire) and watch the nodes light up + see the real output. Plain SVG/CSS, no
 * graph or animation library.
 */

const WIDGET_NODE_ID = 'output:widget';

type Line = {
  id: string;
  source: string;
  target: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  trigger?: boolean;
};

// Priority → color, for the agent result chip.
const PRIORITY_CHIP: Record<string, string> = {
  urgent: 'text-destructive bg-destructive/10',
  high: 'text-warning bg-warning/10',
  medium: 'text-accent bg-accent/10',
  low: 'text-muted-foreground bg-muted',
};

function triggerIcon(templateType?: string) {
  if (templateType?.toLowerCase().includes('webhook')) return Webhook;
  return Clock;
}

// The input key the agent expects — derive from its declared inputs schema,
// preferring the first required string field; default to "task_title".
function primaryInputKey(node?: GraphNode): string {
  const inputs = node?.data?.inputs as Record<string, any> | undefined;
  if (inputs && typeof inputs === 'object') {
    const keys = Object.keys(inputs);
    const req = keys.find((k) => inputs[k]?.required && inputs[k]?.type === 'string');
    return req || keys[0] || 'task_title';
  }
  return 'task_title';
}

type RunResult =
  | { kind: 'agent'; priority?: string; suggestedAction?: string; ms: number }
  | { kind: 'workflow'; digest?: string; topTasks?: string[]; createdTitle?: string; createdPriority?: string; ms: number }
  | { kind: 'error'; message: string };

// Tell the in-page widgets (the gallery below) to refetch — used after a run
// mutates task data so the widgets visibly update. Same-document CustomEvent;
// Widget.tsx listens for it.
function refreshWidgets() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('claritty:widget-refresh'));
  }
}

// Pull a readable reason out of an axios error: FastAPI puts a string in
// `detail` for HTTPExceptions and an array of {loc,msg} for 422 validation
// errors. Falls back to the generic axios message.
function errMessage(err: any): string {
  const d = err?.response?.data?.detail;
  if (typeof d === 'string') return d;
  if (Array.isArray(d) && d.length) {
    const e = d[0];
    return `${e?.msg ?? 'Invalid request'}${e?.loc ? ` (${e.loc.join('.')})` : ''}`;
  }
  const status = err?.response?.status;
  return `${err?.message || 'Request failed'}${status ? ` — check the app backend is up to date` : ''}`;
}

export default function AgentGraph() {
  const [graph, setGraph] = useState<GraphData | null>(null);
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Map<string, HTMLElement>>(new Map());
  const [lines, setLines] = useState<Line[]>([]);

  // Runner state.
  const [taskTitle, setTaskTitle] = useState('Reply to the partnership email');
  const [runStatus, setRunStatus] = useState<'idle' | 'running' | 'done'>('idle');
  const [active, setActive] = useState<string[]>([]); // node ids lit up during a run
  const [result, setResult] = useState<RunResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    getGraph()
      .then((g) => {
        if (!cancelled) {
          setGraph(g);
          setStatus('ready');
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const triggers = graph?.nodes.filter((n) => n.type === 'trigger') ?? [];
  const agents = graph?.nodes.filter((n) => n.type === 'agent') ?? [];

  const agentNode = agents[0];
  const agentNodeId = agentNode?.id;
  const agentId = agentNode?.data?.agentId || agentNode?.id?.replace(/^agent:/, '') || 'example-agent';
  const triggerNodeId = triggers[0]?.id;
  const workflow = graph?.workflows?.[0];
  const inputKey = primaryInputKey(agentNode);

  // Synthesize the connections into the Widget output node: each workflow's
  // last agent feeds the widget; if there are no workflows, every agent does.
  const widgetSourceAgentIds = (() => {
    const ids = new Set<string>();
    const workflows = graph?.workflows ?? [];
    if (workflows.length) {
      for (const wf of workflows) {
        const last = wf.steps?.[wf.steps.length - 1];
        if (last?.agentId) ids.add(`agent:${last.agentId}`);
      }
    }
    if (!ids.size) agents.forEach((a) => ids.add(a.id));
    return ids;
  })();

  const setNodeRef = (id: string) => (el: HTMLElement | null) => {
    if (el) nodeRefs.current.set(id, el);
    else nodeRefs.current.delete(id);
  };

  // Measure node centers and rebuild the connector lines. Runs after layout
  // and on every resize so the curves track the responsive grid.
  useLayoutEffect(() => {
    if (status !== 'ready' || !graph) return;

    const measure = () => {
      const container = containerRef.current;
      if (!container) return;
      const base = container.getBoundingClientRect();
      const center = (id: string) => {
        const el = nodeRefs.current.get(id);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.left - base.left + r.width / 2, y: r.top - base.top + r.height / 2 };
      };

      const next: Line[] = [];
      const push = (id: string, source: string, target: string, trigger?: boolean) => {
        const a = center(source);
        const b = center(target);
        if (a && b) next.push({ id, source, target, x1: a.x, y1: a.y, x2: b.x, y2: b.y, trigger });
      };

      for (const e of graph.edges) push(e.id, e.source, e.target, e.data?.trigger);
      widgetSourceAgentIds.forEach((src) => push(`${src}->widget`, src, WIDGET_NODE_ID));

      setLines(next);
    };

    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, graph]);

  const runAgent = async () => {
    if (runStatus === 'running' || !agentNodeId) return;
    setResult(null);
    setRunStatus('running');
    setActive([agentNodeId, WIDGET_NODE_ID]); // light up agent → widget
    const start = Date.now();
    try {
      const res = await executeAgent(agentId, { [inputKey]: taskTitle });
      const data = res?.data ?? {};
      if (res?.success === false) throw new Error(res?.error || 'Agent run failed');
      setResult({
        kind: 'agent',
        priority: data.priority,
        suggestedAction: data.suggested_action,
        ms: Date.now() - start,
      });
    } catch (err: any) {
      setResult({ kind: 'error', message: errMessage(err) });
    } finally {
      setRunStatus('done');
      setActive([]);
    }
  };

  const runWorkflow = async () => {
    if (runStatus === 'running' || !workflow) return;
    setResult(null);
    setRunStatus('running');
    // Light up the full path the trigger fires: trigger → agent → widget.
    setActive([triggerNodeId, agentNodeId, WIDGET_NODE_ID].filter(Boolean) as string[]);
    const start = Date.now();
    try {
      const res = await executeWorkflow(workflow.id, { [inputKey]: taskTitle });
      if (res?.success === false) throw new Error(res?.error || 'Workflow run failed');
      const outputs = res?.outputs ?? {};
      const created = outputs.created_task;
      setResult({
        kind: 'workflow',
        digest: outputs.digest,
        topTasks: outputs.top_tasks,
        createdTitle: created?.title,
        createdPriority: created?.priority,
        ms: Date.now() - start,
      });
      // The workflow persisted a task — refresh the widgets so the effect shows.
      refreshWidgets();
    } catch (err: any) {
      setResult({ kind: 'error', message: errMessage(err) });
    } finally {
      setRunStatus('done');
      setActive([]);
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-border bg-card/50">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (status === 'error' || !graph) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 px-6 text-center">
        <p className="text-sm text-muted-foreground">
          Couldn&apos;t reach the agent graph. Start the backend, then reload.
        </p>
      </div>
    );
  }

  const running = runStatus === 'running';

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-2xl border border-border bg-card/50 p-5 sm:p-8"
    >
      {/* Connector lines — behind the node cards. */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
        {lines.map((l) => (
          <CurvedLine
            key={l.id}
            line={l}
            active={running && active.includes(l.source) && active.includes(l.target)}
          />
        ))}
      </svg>

      {/* Three lanes: Triggers → Agents → Widget. Stacks on mobile. */}
      <div className="relative grid grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-4">
        <Lane title="Triggers" icon={Clock}>
          {triggers.length ? (
            triggers.map((t) => (
              <NodeCard
                key={t.id}
                ref={setNodeRef(t.id)}
                icon={triggerIcon(t.data?.templateType)}
                title={t.name}
                subtitle={(t.data?.templateType || 'schedule').toLowerCase().replace(/_/g, ' ')}
                tone="trigger"
                active={active.includes(t.id)}
              />
            ))
          ) : (
            <EmptyNode label="No triggers yet" />
          )}
        </Lane>

        <Lane title="Agents" icon={Cpu}>
          {agents.length ? (
            agents.map((a) => (
              <NodeCard
                key={a.id}
                ref={setNodeRef(a.id)}
                icon={Cpu}
                title={a.name}
                subtitle={a.data?.category || a.data?.description}
                tone="agent"
                active={active.includes(a.id)}
              />
            ))
          ) : (
            <EmptyNode label="No agents yet" />
          )}
        </Lane>

        <Lane title="Output" icon={LayoutGrid}>
          <NodeCard
            ref={setNodeRef(WIDGET_NODE_ID)}
            icon={LayoutGrid}
            title="Widget"
            subtitle="What users see at a glance"
            tone="widget"
            active={active.includes(WIDGET_NODE_ID)}
          />
        </Lane>
      </div>

      {/* Runner — trigger the real agent / workflow and watch it work. */}
      {agents.length > 0 && (
        <div className="relative mt-6 rounded-xl border border-border bg-background/40 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex-1">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">
                Try the {agentNode?.name ?? 'agent'} on a task
              </span>
              <input
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="Describe a task…"
                className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-accent"
              />
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => void runAgent()}
                disabled={running || !taskTitle.trim()}
                className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-50"
              >
                {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                Run agent
              </button>
              {workflow && triggerNodeId && (
                <button
                  onClick={() => void runWorkflow()}
                  disabled={running}
                  title={`Run "${workflow.name}" the way the trigger would`}
                  className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
                >
                  <Zap className="h-4 w-4 text-warning" />
                  Run trigger
                </button>
              )}
            </div>
          </div>

          <p className="mt-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Run agent</span> shows the
            agent&apos;s output. <span className="font-medium text-foreground">Run trigger</span>{' '}
            runs the whole flow — it saves the task, so the widgets below fill in.
          </p>

          {/* Result */}
          {result && <RunResultView result={result} />}
        </div>
      )}

      {/* Workflow footnote — names the pipelines wiring it together. */}
      {graph.workflows.length > 0 && (
        <div className="relative mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
          <Workflow className="h-3.5 w-3.5 text-muted-foreground" />
          {graph.workflows.map((wf) => (
            <span
              key={wf.id}
              className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
            >
              {wf.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function RunResultView({ result }: { result: RunResult }) {
  if (result.kind === 'error') {
    return (
      <div className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {result.message}
      </div>
    );
  }
  if (result.kind === 'agent') {
    const chip = PRIORITY_CHIP[result.priority || 'medium'] ?? PRIORITY_CHIP.medium;
    return (
      <div className="mt-3 rounded-lg border border-border bg-card px-3.5 py-3">
        <div className="mb-1.5 flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Agent output</span>
          {result.priority && (
            <span className={cn('rounded px-1.5 py-0.5 text-xs font-semibold capitalize', chip)}>
              {result.priority}
            </span>
          )}
          <span className="ml-auto text-xs text-muted-foreground">ran in {result.ms} ms</span>
        </div>
        <p className="text-sm text-foreground">
          {result.suggestedAction || 'Done.'}
        </p>
      </div>
    );
  }
  // workflow
  const chip = result.createdPriority
    ? PRIORITY_CHIP[result.createdPriority] ?? PRIORITY_CHIP.medium
    : '';
  return (
    <div className="mt-3 rounded-lg border border-border bg-card px-3.5 py-3">
      <div className="mb-1.5 flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Workflow output</span>
        <span className="ml-auto text-xs text-muted-foreground">ran in {result.ms} ms</span>
      </div>
      {result.createdTitle && (
        <p className="mb-1.5 flex items-center gap-1.5 text-sm text-success">
          <Check className="h-4 w-4 flex-shrink-0" />
          <span className="text-foreground">
            Added &ldquo;{result.createdTitle}&rdquo;
          </span>
          {result.createdPriority && (
            <span className={cn('rounded px-1.5 py-0.5 text-xs font-semibold capitalize', chip)}>
              {result.createdPriority}
            </span>
          )}
          <span className="text-muted-foreground">— widgets updated</span>
        </p>
      )}
      {result.digest && <p className="text-sm text-foreground">{result.digest}</p>}
      {result.topTasks && result.topTasks.length > 0 && (
        <ul className="mt-1.5 space-y-1">
          {result.topTasks.slice(0, 5).map((t, i) => (
            <li key={i} className="truncate text-xs text-muted-foreground">
              • {t}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CurvedLine({ line, active }: { line: Line; active: boolean }) {
  // Adaptive control points: bow horizontally when nodes sit side-by-side
  // (desktop columns), vertically when stacked (mobile).
  const dx = line.x2 - line.x1;
  const dy = line.y2 - line.y1;
  const horizontal = Math.abs(dx) >= Math.abs(dy);
  const c = horizontal
    ? `C ${line.x1 + dx / 2} ${line.y1}, ${line.x2 - dx / 2} ${line.y2}, ${line.x2} ${line.y2}`
    : `C ${line.x1} ${line.y1 + dy / 2}, ${line.x2} ${line.y2 - dy / 2}, ${line.x2} ${line.y2}`;
  return (
    <path
      d={`M ${line.x1} ${line.y1} ${c}`}
      fill="none"
      stroke="hsl(var(--brand-accent))"
      strokeWidth={active ? 2.5 : 1.5}
      strokeOpacity={active ? 0.95 : line.trigger ? 0.55 : 0.35}
      strokeDasharray="5 6"
      className="agent-graph-flow"
    />
  );
}

function Lane({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Clock;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </div>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}

const TONE: Record<string, { ring: string; iconBg: string; iconText: string }> = {
  trigger: { ring: 'ring-warning/30', iconBg: 'bg-warning/10', iconText: 'text-warning' },
  agent: { ring: 'ring-accent/30', iconBg: 'bg-accent/10', iconText: 'text-accent' },
  widget: { ring: 'ring-success/30', iconBg: 'bg-success/10', iconText: 'text-success' },
};

// forwardRef so the parent can measure the card's DOM position for connectors.
const NodeCard = forwardRef<
  HTMLDivElement,
  {
    icon: typeof Clock;
    title: string;
    subtitle?: string;
    tone: keyof typeof TONE;
    active?: boolean;
  }
>(function NodeCard({ icon: Icon, title, subtitle, tone, active = false }, ref) {
  const t = TONE[tone];
  return (
    <div
      ref={ref}
      className={cn(
        'relative z-10 flex items-center gap-3 rounded-xl border bg-card px-3.5 py-3 shadow-sm ring-1 transition-all',
        active ? 'border-accent ring-2 ring-accent' : cn('border-border', t.ring),
      )}
    >
      {/* Pulsing halo while this node is working. */}
      {active && (
        <span className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-accent/60 animate-pulse" />
      )}
      <span className={cn('flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg', t.iconBg)}>
        <Icon className={cn('h-[18px] w-[18px]', t.iconText)} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">{title}</p>
        {subtitle && <p className="truncate text-xs capitalize text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
});

function EmptyNode({ label }: { label: string }) {
  return (
    <div className="flex items-center rounded-xl border border-dashed border-border bg-card/40 px-3.5 py-3 text-xs text-muted-foreground">
      {label}
    </div>
  );
}
