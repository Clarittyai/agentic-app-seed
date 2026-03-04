#!/usr/bin/env node
/**
 * Widget Validation CLI Tool
 *
 * Run: npm run validate:widgets
 *
 * Validates widget components meet Apple-style constraints:
 * - Small widget: 170×170px (square)
 * - Large widget: 360×170px (wide rectangle)
 * - Padding: 16px (p-4)
 * - Border radius: 24px (rounded-3xl)
 * - Overflow: hidden to prevent content escape
 */

const fs = require('fs');
const path = require('path');

const WIDGET_PATH = path.join(process.cwd(), 'frontend/src/components/Widget.tsx');

console.log('🔍 Validating widget constraints...\n');

// Check if Widget.tsx exists
if (!fs.existsSync(WIDGET_PATH)) {
  console.error(`❌ Widget.tsx not found at: ${WIDGET_PATH}`);
  process.exit(1);
}

const content = fs.readFileSync(WIDGET_PATH, 'utf-8');

let hasErrors = false;
let hasWarnings = false;

// Check 1: Small widget dimensions (170×170px square)
const smallWidgetRegex = /w-\[170px\]\s+h-\[170px\]/;
if (smallWidgetRegex.test(content)) {
  console.log('✅ Small widget: 170×170px square (correct)');
} else {
  console.error('❌ Small widget: Missing w-[170px] h-[170px]');
  console.error('   Expected: className="... w-[170px] h-[170px] ..."');
  hasErrors = true;
}

// Check 2: Large widget dimensions (360×170px wide rectangle)
const largeWidgetRegex = /w-\[360px\]\s+h-\[170px\]/;
if (largeWidgetRegex.test(content)) {
  console.log('✅ Large widget: 360×170px wide rectangle (correct)');
} else {
  console.error('❌ Large widget: Missing w-[360px] h-[170px]');
  console.error('   Expected: className="... w-[360px] h-[170px] ..."');
  hasErrors = true;
}

// Check 3: Padding (16px = p-4)
if (content.includes('p-4') || content.includes('p-[16px]')) {
  console.log('✅ Padding: 16px (p-4) found');
} else {
  console.warn('⚠️  Warning: p-4 (16px padding) not found');
  console.warn('   Recommended: Add p-4 class for consistent spacing');
  hasWarnings = true;
}

// Check 4: overflow-hidden (critical for preventing content escape)
if (content.includes('overflow-hidden')) {
  console.log('✅ Overflow: overflow-hidden set');
} else {
  console.error('❌ Overflow: Missing overflow-hidden class');
  console.error('   CRITICAL: Add overflow-hidden to prevent content overflow');
  hasErrors = true;
}

// Check 5: Border radius (24px = rounded-3xl for Apple-style)
if (content.includes('rounded-3xl') || content.includes('rounded-[24px]')) {
  console.log('✅ Border radius: 24px (rounded-3xl) found');
} else {
  console.warn('⚠️  Warning: rounded-3xl (24px radius) not found');
  console.warn('   Recommended: Add rounded-3xl for Apple-style corners');
  hasWarnings = true;
}

// Check 6: Data attributes for testing
if (content.includes('data-widget-size')) {
  console.log('✅ Test attributes: data-widget-size found');
} else {
  console.warn('⚠️  Warning: data-widget-size attribute not found');
  console.warn('   Recommended: Add data-widget-size="small|large" for testing');
  hasWarnings = true;
}

// Check 7: Size prop type enforcement
const sizeTypeRegex = /size\?:\s*['"]small['"]?\s*\|\s*['"]large['"]?/;
if (sizeTypeRegex.test(content)) {
  console.log('✅ Type safety: size prop restricted to "small" | "large"');
} else {
  console.warn('⚠️  Warning: size prop type not strictly enforced');
  console.warn('   Recommended: size?: "small" | "large"');
  hasWarnings = true;
}

// Summary
console.log('\n' + '='.repeat(50));

if (hasErrors) {
  console.error('\n❌ Widget validation FAILED');
  console.error('\nFix the errors above before proceeding.');
  console.error('See docs/WIDGET_DESIGN_GUIDE.md for specifications.\n');
  process.exit(1);
}

if (hasWarnings) {
  console.warn('\n⚠️  Widget validation PASSED with warnings');
  console.warn('\nConsider addressing warnings for best practices.\n');
  process.exit(0);
}

console.log('\n✅ All widget constraints validated!');
console.log('\nYour widgets meet Apple-style design standards.');
console.log('Ready for Clarity Marketplace submission.\n');
process.exit(0);
