#!/usr/bin/env node
/*
 * Template-residue gate ("identity gate").
 *
 * Purpose: a Claritty app scaffolded from this seed must become its OWN app —
 * keep the platform contract, but completely replace the template's visual
 * identity and example code. This script FAILS (exit 1) while the app still
 * looks like the seed, so the work can't be called "done" prematurely. It runs:
 *   - as a Claude Code Stop hook (.claude/settings.json) — blocks the agent
 *     from finishing while residue remains,
 *   - as `npm run check:identity` (frontend/package.json),
 *   - in CI (.github/workflows/validate-app.yml).
 *
 * The UNTOUCHED seed is allowed to pass: while the pristine marker
 * `.claritty-seed-pristine` exists, the gate is inactive. Delete that marker
 * the moment you start building your app (see IDENTITY.md) to turn it on.
 *
 * See IDENTITY.md for the full KEEP-vs-REPLACE manifest + redesign checklist.
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PRISTINE_MARKER = join(ROOT, '.claritty-seed-pristine');

const read = (rel) => {
  const p = join(ROOT, rel);
  return existsSync(p) ? readFileSync(p, 'utf8') : null;
};
const listFiles = (rel) => {
  try { return readdirSync(join(ROOT, rel)); } catch { return []; }
};
// Strip /* */ and // comments so "examples in a comment" don't count as real code.
const stripComments = (s) =>
  (s || '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const SEED_APP_NAME = 'Claritty Template';
const SEED_APP_DESC = 'A starter template for Claritty agentic apps.';

const failures = [];
const fail = (title, fix) => failures.push({ title, fix });

// 1) theme.css must carry a real per-app palette override (not just the comment example).
const theme = read('frontend/src/theme.css');
if (theme === null) {
  fail('frontend/src/theme.css is missing',
    'Restore it and add a :root override with your brand tokens.');
} else if (!stripComments(theme).includes('--brand-')) {
  fail('frontend/src/theme.css has no active palette override (still the empty seed file)',
    "Add an active :root { … } block setting --brand-accent / --brand-accent-600 / --brand-primary / --brand-font to YOUR palette. Token NAMES stay; values are yours.");
}

// 2) app-meta.ts must use the app's real name + description.
const meta = read('frontend/src/lib/app-meta.ts');
if (meta) {
  if (meta.includes(`'${SEED_APP_NAME}'`) || meta.includes(`"${SEED_APP_NAME}"`)) {
    fail("app-meta.ts still names the app 'Claritty Template'",
      'Set appName to your real app name in frontend/src/lib/app-meta.ts.');
  }
  if (meta.includes(SEED_APP_DESC)) {
    fail('app-meta.ts still has the seed appDescription',
      'Set appDescription to describe YOUR app in frontend/src/lib/app-meta.ts.');
  }
}

// 3) Dashboard.tsx must be the app's real landing — not the template showcase.
const dash = read('frontend/src/pages/Dashboard.tsx');
if (dash) {
  const showcase =
    dash.includes('Template showcase') ||
    /from '@\/components\/(AgentGraph|HowItWorks|WidgetGallery)'/.test(dash);
  if (showcase) {
    fail('Dashboard.tsx is still the template showcase (HowItWorks / AgentGraph / WidgetGallery)',
      "Replace frontend/src/pages/Dashboard.tsx with your app's real landing page.");
  }
}

// 4) Layout.tsx must carry the app's own mark, not the Claritty platform logo.
const layout = read('frontend/src/components/Layout.tsx');
if (layout && layout.includes('claritty-logo.png')) {
  fail('Layout.tsx still uses the Claritty platform logo as the app mark',
    "Swap /claritty-logo.png in frontend/src/components/Layout.tsx for YOUR app's own logo/wordmark.");
}

// 5) The seed's example agent/workflow/trigger must be gone (replaced by your domain).
for (const f of [
  'backend/agents/example_agent.py',
  'backend/workflows/example_workflow.py',
  'backend/triggers/example_trigger.py',
]) {
  if (existsSync(join(ROOT, f))) {
    fail(`Example component still present: ${f}`,
      'Delete the seed example and create your own agent/workflow/trigger.');
  }
}

// 6) NO MOCK DATA ON FIRST RUN — first run must be a connect-first empty
// state; data appears only after a real sync or user action. A startup seeder
// or "sample" rows fake the product and hide a broken value path.
{
  const stripComments = (s) => s.replace(/^\s*#.*$/gm, '');
  const mainPy = stripComments(read('backend/main.py') || '');
  if (/\bseed_[a-z0-9_]*\s*\(\s*\)/.test(mainPy)) {
    fail('backend/main.py seeds data on startup — first run must show REAL data or an honest empty state.',
      'Remove the startup seeder; ship polished empty states + a Connect/first-action CTA instead. Data appears only after a real sync or user action.');
  }
  for (const rel of ['backend/database.py', 'backend/models.py', 'backend/main.py']) {
    const content = stripComments(read(rel) || '');
    if (/source\s*=\s*["']sample["']/.test(content)) {
      fail(`${rel} creates rows marked source="sample" — mock data is not allowed.`,
        'Delete the sample-data path. First run = connect-first empty state; only a real sync/user action creates rows.');
    }
    if (/def\s+seed_[a-z0-9_]*\s*\(/.test(content) && /db\.add\(/.test(content)) {
      fail(`${rel} defines a seeder that inserts rows — mock data is not allowed.`,
        'Remove the seeder. Empty states + a Connect CTA are the first-run experience.');
    }
  }
}

// ===========================================================================
// Advisory warnings (NON-BLOCKING) — completeness, not identity. These never
// change the exit code; they nudge toward an app that actually works end-to-end.
// ===========================================================================
const warnings = [];
const warn = (title, fix) => warnings.push({ title, fix });

let cfg = {};
try { cfg = JSON.parse(read('app-config.json') || '{}'); } catch { /* ignore */ }
const mkt = cfg.clarity_marketplace || {};
const core = mkt.core_action || {};

const agentFiles = listFiles('backend/agents').filter((f) => f.endsWith('.py') && f !== '__init__.py');

// (a) Implies an external action but declares no integration to perform it.
// Connecting is PLATFORM-BROKERED: declaring the integration in intelligence.yaml
// (mirrored to app-config.json) is the sanctioned path — OAuth/keys run on the
// platform and tokens live in the broker; the app never stores a credential. The
// user connects IN-CONTEXT via the seed's shared primitives (IntegrationsChecklist
// / ConnectButton / toast.showApiError) — never a hand-rolled OAuth/connect page.
const ACTION_RE = /\b(post|publish|send|email|charge|tweet|sync|message|notify|sms|dm)\b/i;
const declaredIntegration =
  (Array.isArray(mkt.required_integrations) && mkt.required_integrations.length > 0) ||
  (Array.isArray(mkt.optional_integrations) && mkt.optional_integrations.length > 0) ||
  (Array.isArray(core.external_systems) && core.external_systems.length > 0);
let backendText = read('backend/routes/app.py') || '';
for (const f of agentFiles) backendText += '\n' + (read('backend/agents/' + f) || '');
if (ACTION_RE.test(backendText) && !declaredIntegration) {
  warn('This app looks like it acts on an external service but declares no integration for it.',
    'Declare it in intelligence.yaml#integrations — connecting is platform-brokered and the user connects in-context via the built-in primitives (no hand-rolled connect/OAuth page). If the action is intentionally self-contained, ignore this.');
}

// (b) No custom agent — does the app do anything?
if (agentFiles.length === 0) {
  warn('No custom agent in backend/agents/ — does the app actually do its core work?',
    'Add at least one @agent (and a workflow) that performs the app\'s job.');
}

// (c) Definition of done not written.
if (!String(core.definition_of_done || '').trim()) {
  warn('app-config.json → clarity_marketplace.core_action.definition_of_done is empty.',
    'Write one concrete end-to-end success sentence — the bar for "done".');
}

// (d) Design tells — make it look designed, not generated. Advisory for now
// (promote to fail() once tuned). Mirrors the platform's designLintCheck.
const walkTsx = (rel) => {
  const out = [];
  const recur = (r) => {
    let entries;
    try { entries = readdirSync(join(ROOT, r), { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const child = `${r}/${e.name}`;
      if (e.isDirectory()) recur(child);
      else if (e.name.endsWith('.tsx')) out.push(child);
    }
  };
  recur(rel);
  return out;
};
const SATURATED = 'red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';
const paletteRe = new RegExp(`\\b(?:bg|text|border|ring|from|via|to)-(?:${SATURATED})-\\d{2,3}\\b`);
const hexRe = /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/;
let hexHits = 0, paletteHits = 0, gradientHits = 0;
const hexFiles = new Set(), paletteFiles = new Set(), gradientFiles = new Set();
for (const rel of walkTsx('frontend/src')) {
  const content = read(rel) || '';
  for (const ln of content.split('\n')) {
    if (hexRe.test(ln) && !/url\(#|href=["']#/.test(ln)) { hexHits++; hexFiles.add(rel); }
    if (paletteRe.test(ln)) { paletteHits++; paletteFiles.add(rel); }
    if (/\bvia-[a-z]/.test(ln) || /bg-gradient-to-[trbl]+\b/.test(ln)) { gradientHits++; gradientFiles.add(rel); }
  }
}
if (hexHits) {
  warn(`Hardcoded hex color${hexHits === 1 ? '' : 's'} in ${[...hexFiles].join(', ')} fight the per-app theme.`,
    'Use theme tokens (text-accent / bg-accent / bg-card / text-foreground / text-muted-foreground / border) instead of raw hex.');
}
if (paletteHits) {
  warn(`Fixed-palette Tailwind color${paletteHits === 1 ? '' : 's'} (e.g. bg-indigo-500) in ${[...paletteFiles].join(', ')} make every app look the same.`,
    'Use the accent/foreground/card theme tokens; reserve the accent for the ONE primary action + key status.');
}
if (gradientHits) {
  warn(`Multi-stop / rainbow gradient${gradientHits === 1 ? '' : 's'} in ${[...gradientFiles].join(', ')}.`,
    'At most one restrained accent — let type + spacing carry the design (no from-…-via-…-to-…, no gradient text).');
}
// (e) App-kit usage — full-app pages should COMPOSE @clarittyai/app-ui, not
// hand-roll raw <button>. Mirrors the platform's appKitUsageCheck (advisory
// here; HARD in the engine behind DESIGN_HARD_GATE). The widget surface is
// exempt (it uses @clarittyai/widget-toolkit instead).
const handRolledPages = [];
for (const rel of walkTsx('frontend/src/pages')) {
  if (/WidgetPage\.tsx$/.test(rel)) continue;
  const content = read(rel) || '';
  if (/from\s+['"]@clarittyai\/app-ui['"]/.test(content)) continue;
  if (/<button[\s>]/.test(content)) handRolledPages.push(rel);
}
if (handRolledPages.length) {
  warn(`Page${handRolledPages.length === 1 ? '' : 's'} hand-roll a raw <button> instead of the Claritty app-ui kit (${handRolledPages.join(', ')}).`,
    "Import from '@clarittyai/app-ui' (Button/Card/PageHeader/Section/Stat/EmptyState/ErrorState…) and compose its primitives — the kit bakes in the spacing, hierarchy, one-primary-action and state discipline.");
}

const widgetTsx = read('frontend/src/components/Widget.tsx') || '';
if (/\berror\b/i.test(widgetTsx) && /text-muted-foreground/.test(widgetTsx) && !/text-foreground/.test(widgetTsx)) {
  warn('The widget error/empty state uses only text-muted-foreground on the glass surface (~2:1 contrast — invisible).',
    'Render the headline with text-foreground and a themed <WidgetButton> Retry — not muted text or a hardcoded-color button.');
}

// (f) Data-heavy category but the frontend renders no chart. The domain →
// design matrix (docs/golden/INDEX.md) says these domains LEAD with a chart.
const DATA_HEAVY = ['sales', 'gtm', 'revenue', 'crm', 'growth', 'finance', 'accounting',
  'investing', 'billing', 'analytics', 'reporting', 'data', 'marketing', 'ecommerce'];
const category = String(mkt.category || '').toLowerCase();
if (DATA_HEAVY.some((c) => category.includes(c))) {
  const hasChart = walkTsx('frontend/src').some((rel) => {
    const c = read(rel) || '';
    return /components\/charts/.test(c) || /\b(TrendLine|BarList|Sparkline)\b/.test(c);
  });
  if (!hasChart) {
    warn(`Category "${category}" is data-heavy but no chart component is used anywhere under frontend/src.`,
      "Lead the landing page with a chart — import { TrendLine, BarList, Sparkline } from '@/components/charts' and follow the domain → design matrix in docs/golden/INDEX.md.");
  }
}

// (g) "sample data" vocabulary in the UI — usually a leftover mock badge.
{
  const sampleFiles = new Set();
  for (const rel of [...walkTsx('frontend/src/pages'), ...walkTsx('frontend/src/components')]) {
    const c = read(rel) || '';
    if (/sample data/i.test(c) || /['"]sample['"]\s*(?:\)|,|:)/.test(c)) sampleFiles.add(rel);
  }
  if (sampleFiles.size) {
    warn(`UI mentions "sample" data (${[...sampleFiles].join(', ')}) — apps show REAL data or an honest empty state, never mock.`,
      'Remove the sample vocabulary/badges; render connect-first empty states until a real sync/user action produces rows.');
  }
}

// (h) Agents exist but no AI onboarding questions — the app can't tailor its
// intelligence to the user or define their "good progress".
if (agentFiles.length > 0) {
  const onboarding = cfg.onboarding || {};
  const questions = Array.isArray(onboarding.questions) ? onboarding.questions : [];
  if (questions.length === 0) {
    warn('No AI onboarding questions (app-config.json → onboarding.questions is empty) — the agents run un-tailored.',
      'Author 2–4 questions whose answers CHANGE agent behavior (goals, thresholds, priorities) + the progress metric the dashboard tracks. See backend/shared/onboarding.py + .claude/prompts/brainstorm.md.');
  }
}

function printWarnings() {
  if (!warnings.length) return;
  console.error('\n⚠ Advisory (non-blocking) — completeness checks:');
  for (const { title, fix } of warnings) {
    console.error(`  ⚠ ${title}`);
    console.error(`      → ${fix}`);
  }
  console.error("  (These don't block the build — address them or confirm they're intentional.)");
}

// ----- Report -----
if (existsSync(PRISTINE_MARKER)) {
  console.log('🟡 Identity gate inactive: this is the untouched seed template (.claritty-seed-pristine present).');
  console.log('   Delete .claritty-seed-pristine the moment you start building — that turns the gate on.');
  console.log('   See IDENTITY.md for the KEEP-vs-REPLACE manifest + redesign checklist.');
  process.exit(0);
}

if (failures.length === 0) {
  console.log('✅ Identity gate passed — this app no longer looks like the seed template.');
  printWarnings();
  process.exit(0);
}

console.error('\n❌ Identity gate failed — this app still looks like the Claritty seed template.\n');
console.error('Keep only the platform contract; give everything else your app\'s own identity.');
console.error('Fix each item below, then re-run. Full guide: IDENTITY.md\n');
for (const { title, fix } of failures) {
  console.error(`  ✗ ${title}`);
  console.error(`      → ${fix}\n`);
}
console.error(`(${failures.length} issue${failures.length === 1 ? '' : 's'}. The gate stays red until all are resolved.)`);
printWarnings();
process.exit(1);
