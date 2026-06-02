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

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PRISTINE_MARKER = join(ROOT, '.claritty-seed-pristine');

const read = (rel) => {
  const p = join(ROOT, rel);
  return existsSync(p) ? readFileSync(p, 'utf8') : null;
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

// ----- Report -----
if (existsSync(PRISTINE_MARKER)) {
  console.log('🟡 Identity gate inactive: this is the untouched seed template (.claritty-seed-pristine present).');
  console.log('   Delete .claritty-seed-pristine the moment you start building — that turns the gate on.');
  console.log('   See IDENTITY.md for the KEEP-vs-REPLACE manifest + redesign checklist.');
  process.exit(0);
}

if (failures.length === 0) {
  console.log('✅ Identity gate passed — this app no longer looks like the seed template.');
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
process.exit(1);
