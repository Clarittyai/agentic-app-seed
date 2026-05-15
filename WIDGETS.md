# 📱 Widget Design Guide

**Apple HIG-compliant widgets for Claritty Platform**

---

## 🎯 Widget Philosophy

Widgets are the **primary interface** for agentic apps on Claritty Platform:

- ✅ Users see widgets **90% of the time**
- ✅ Full app pages used **10%** (setup, advanced features)
- ✅ Design widgets **FIRST**, full app **SECOND**

**Widgets = Dashboard Cards**, not traditional web pages.

---

## 📐 Widget Specifications (CRITICAL)

### Exactly 2 Widget Sizes

**IMPORTANT**: Platform supports ONLY 2 sizes. No medium size exists.

| Size | Dimensions | Aspect Ratio | Use Case | Max Per Row (Desktop) | Max Per Row (Mobile) |
|------|------------|--------------|----------|----------------------|---------------------|
| **Small** | `190×190px` | 1:1 (square) | Quick status, single metric | 4 | 2 |
| **Large** | `400×190px` | 2.1:1 (wide) | Detailed view, multiple metrics | 2 | 1 |

**Key Constraint**: Both sizes have the **same 190px height** for perfect grid alignment!

**Mathematical Alignment**:
```
2 small widgets + gap = 1 large widget width
190px + 20px + 190px = 400px ✅
```

### Grid Layout

**CSS Grid Implementation**:
```tsx
// Container with explicit column sizing
<div className="grid grid-cols-[repeat(2,190px)] md:grid-cols-[repeat(4,190px)] gap-[20px] w-full max-w-7xl mx-auto justify-center">

  {/* Small widget - spans 1 column */}
  <div style={{ width: '190px', height: '190px' }}>
    <YourSmallWidget />
  </div>

  {/* Large widget - spans 2 columns */}
  <div style={{ width: '400px', height: '190px', gridColumn: 'span 2' }}>
    <YourLargeWidget />
  </div>

</div>
```

**CRITICAL RULES**:
- ✅ ALWAYS use strict pixel dimensions via inline `style` prop
- ✅ ALWAYS set `gridColumn: 'span 2'` for large widgets
- ❌ NEVER use responsive classes (`w-full`, `h-full`, `w-screen`, `aspect-*`)
- ✅ ALWAYS set `overflow: hidden` on widget root containers
- ✅ Gap MUST be `gap-[20px]` (20px) for mathematical alignment

---

## 🚫 Window-Size Invariance (Hard Rule)

The Widget surface (`frontend/src/components/Widget.tsx` and `frontend/src/pages/WidgetPage.tsx`) MUST look **identical at every viewport size — mobile, tablet, desktop, embedded iframe**. The widget is a fixed-frame surface (190×190 or 400×190). Its appearance is controlled **only by the `size` prop** (small / large), never by the browser window.

### Forbidden inside `Widget.tsx` and `WidgetPage.tsx`

- Tailwind responsive prefixes: `sm:`, `md:`, `lg:`, `xl:`, `2xl:`
- CSS `@media` rules targeting widget classes
- `useBreakpoint()`, `useMediaQuery()`, `window.innerWidth`, `window.matchMedia`, `ResizeObserver`
- Any conditional that swaps the `size` prop based on viewport (e.g. `size={isMobile ? 'small' : 'large'}`)

### ⚠️ Watch out — global CSS leaks (the silent killer)

Static grep of `Widget.tsx` and `WidgetPage.tsx` is **not enough**. Any `@media` block in `index.css` (or any global stylesheet) that uses a **bare element selector** (`a`, `button`, `*`, `html`, `body`, `input`, …) silently applies to the widget too, because those selectors match elements *inside* the widget root.

**Real example we hit:**

```css
/* index.css — looks harmless, looks like a mobile-touch-target rule */
@media (max-width: 920px) {
  a, button {
    min-height: 44px;
    min-width: 44px;
  }
}
```

The widget has 18px signal-badge buttons and a 32px VIEW ALL button. At any viewport ≤ 920px (including the marketplace iframe), the rule above forces those to 44px and **the fixed 190×190 / 400×190 widget layout breaks**. Static grep of widget files reports "clean" — yet the widget visibly changes with window size.

**Fix:** scope the global rule away from the widget. The widget root carries `data-widget-size="small"` or `data-widget-size="large"`, so add a reset right after the global rule:

```css
[data-widget-size] a,
[data-widget-size] button {
  min-height: 0;
  min-width: 0;
}
```

Apply the same pattern for any other global rule that uses bare element selectors inside a `@media` query — `body`, `html`, `input`, `*` are equally dangerous.

### Allowed

- The `size === 'small'` vs `size === 'large'` branches — those are driven by the marketplace host, not by the browser window.
- Fixed pixel values (`w-[190px]`, `h-[190px]`, `w-[400px]`).

### Scope

This rule applies **only to the Widget surface** (`Widget.tsx` + `WidgetPage.tsx`). Full app pages (Dashboard, settings, modals, etc.) remain free to use breakpoints and `useBreakpoint` for their own layouts. The widget is special.

### Wrong vs. Right

❌ **WRONG** — viewport-dependent styling inside the widget:
```tsx
// Widget.tsx
<div className="w-[190px] sm:w-[240px] md:w-[300px]">  // ❌ size changes with browser window
  ...
</div>
```

❌ **WRONG** — conditional `size` prop based on viewport:
```tsx
// WidgetPage.tsx
const breakpoint = useBreakpoint();                     // ❌ widget surface must not branch on viewport
return <Widget size={breakpoint === 'mobile' ? 'small' : 'large'} />;
```

✅ **RIGHT** — fixed dimensions, host-controlled size:
```tsx
// Widget.tsx
<div className="w-[190px] h-[190px]">                   // ✅ identical on every viewport
  ...
</div>
```

```tsx
// WidgetPage.tsx
const size = (searchParams.get('size') || 'large') as 'small' | 'large';  // ✅ size from host
return <Widget size={size} />;
```

### Why

The widget is rendered inside the Clarity marketplace host, which gives it a fixed frame. Window-dependent styling would make the widget render differently on a mobile-hosted dashboard vs. a desktop-hosted one, breaking the Apple-HIG fixed-frame contract and failing marketplace validation. The host owns layout; the widget owns content.

### Verification

This grep MUST return no matches:

```bash
grep -nE '\b(sm|md|lg|xl|2xl):|@media|useBreakpoint|window\.innerWidth|matchMedia|ResizeObserver' \
  frontend/src/components/Widget.tsx \
  frontend/src/pages/WidgetPage.tsx
```

Manual check: open `/widget?size=small` and `/widget?size=large`. Resize the browser from 320px to 1920px and toggle Chrome DevTools mobile emulation. The widget frame and its contents must not change a single pixel.

---

## 🎬 Widget Action Patterns

Widgets are interactive — buttons inside the iframe receive clicks (the host runs `sandbox="allow-scripts allow-same-origin"` and the click-capture overlay was removed). Two standard action types cover everything a widget button can do:

| Type | What happens | When to use |
|------|--------------|-------------|
| **Quick action** | Calls the app's own backend API directly. Widget updates in place. No host modal. | "Refresh", "Mark read", "Toggle", "Increment counter" — anything the user expects to happen *inside* the widget. |
| **Deep link** | Posts a message to the host. Host opens the app modal (`AppDialog`) with the iframe loaded at the given path. | "View details", "Open chart for BTC", "Settings" — anything that should show the full app at a specific route. |

### The contract

Both actions use one `postMessage` type:

```ts
// Sent by: widget (inside the iframe)
// Received by: marketplace host (parent window)
type WidgetActionMessage =
  | { type: 'WIDGET_ACTION'; actionType: 'quick_action'; actionId: string; source: string; timestamp: number }
  | { type: 'WIDGET_ACTION'; actionType: 'deep_link';    path: string;     source: string; timestamp: number };
```

`source` is your app slug (set `VITE_APP_SLUG` in env, or it falls back to `document.title`). The host uses it for analytics.

### Use the helpers — never call `window.parent.postMessage` directly

Import from `@/lib/widget-actions`:

```tsx
import { triggerDeepLink, runQuickAction } from '@/lib/widget-actions';

// Deep link — host opens modal at the path:
<button onClick={() => triggerDeepLink({ path: '/?view=chart&coin=BTC' })}>
  Open BTC chart
</button>

// Quick action — runs API inside the iframe, refreshes widget state:
<button
  onClick={async () => {
    await runQuickAction({
      actionId: 'mark-read',
      run: () => markEmailsAsRead(),
    });
    await fetchData(); // refresh widget
  }}
>
  Mark Read
</button>
```

### Sandbox / origin notes

- Iframe sandbox is `allow-scripts allow-same-origin`. `window.parent.postMessage` is permitted; `window.parent.location = ...` is NOT and will throw.
- The helpers no-op when the widget runs standalone (`window.parent === window`) — local dev at `/widget` works without errors.
- The host verifies `event.origin` matches the widget iframe's origin before acting on the message. Don't try to post from a different origin or the host will drop the message.

### Rules

❌ **Never** call `useNavigate()` / `router.push()` / `window.location.href = ...` from inside a widget button. The widget is in an iframe — those calls only change the iframe URL, not the host page, and the user sees a confusing in-place navigation. Use `triggerDeepLink({ path })` instead.

❌ **Never** call `window.parent.location` or `top.window`. Sandbox blocks it.

✅ **Always** use the helpers — they handle the embedded-vs-standalone check and the analytics ping for free.

✅ **Pure UI state** (modals inside the widget, expanded rows, etc.) doesn't need either action — keep it as plain React state. The contract is for crossing the iframe boundary or touching the backend.

---

## 🍎 Apple HIG Compliance

### Touch Target Sizes

**Minimum touch target**: `44×44px`

```tsx
// ✅ CORRECT - 44px minimum
<button className="w-11 h-11">  {/* 44px × 44px */}
  <Icon />
</button>

// ❌ WRONG - Too small
<button className="w-8 h-8">  {/* 32px × 32px */}
  <Icon />
</button>
```

### Typography

**Minimum font size**: `12px`

```tsx
// ✅ CORRECT - 12px minimum
<p className="text-xs">Status: Active</p>  {/* 12px */}

// ❌ WRONG - Below minimum
<p className="text-[10px]">Status: Active</p>  {/* 10px */}
```

**Recommended Text Hierarchy**:
- **Title**: `text-base` (16px) or `text-lg` (18px)
- **Subtitle**: `text-sm` (14px)
- **Body/Metrics**: `text-xs` (12px) - minimum allowed

### Spacing & Padding

**Internal padding**: `p-3` (12px) recommended

```tsx
// ✅ CORRECT - Consistent padding
<div className="w-[190px] h-[190px] p-3 overflow-hidden">
  <WidgetContent />
</div>
```

**Element spacing**: `gap-2` (8px) for compact layouts

```tsx
// ✅ CORRECT - Compact spacing for widgets
<div className="flex flex-col gap-2">
  <Metric />
  <Metric />
</div>
```

---

## ⚡ Performance Requirements

### Response Time Targets

| Widget Size | Target Response Time |
|-------------|---------------------|
| Small | < **200ms** |
| Large | < **500ms** |

**Why it matters**: Widgets load on every page view. Slow widgets = poor UX.

### Optimization Strategies

1. **Cache Data**:
   ```python
   from functools import lru_cache

   @lru_cache(maxsize=128)
   def get_widget_metrics(workspace_id: str, size: str):
       # Cache expensive calculations
       return calculate_metrics(workspace_id)
   ```

2. **Return Only Necessary Data**:
   ```python
   @app.get("/api/widget")
   async def get_widget_data(size: str):
       if size == "small":
           # Minimal data for quick glance
           return {
               "activeTriggers": get_count(),
               "successRate": calculate_rate()
           }

       # Large widget: More detailed data
       return {
           "activeTriggers": get_count(),
           "recentExecutions": get_recent(limit=5),  # Limit results
           "alerts": get_alerts()
       }
   ```

3. **Use Database Indexes**:
   ```python
   class Execution(Base):
       __tablename__ = "executions"

       workspace_id = Column(String, index=True)  # ✅ Indexed
       created_at = Column(DateTime, index=True)  # ✅ Indexed
   ```

4. **Avoid N+1 Queries**:
   ```python
   # ✅ CORRECT - Single query with join
   executions = db.query(Execution).options(
       joinedload(Execution.trigger)
   ).filter(Execution.workspace_id == workspace_id).limit(5).all()

   # ❌ WRONG - N+1 queries
   executions = db.query(Execution).all()
   for exec in executions:
       trigger = db.query(Trigger).filter(Trigger.id == exec.trigger_id).first()
   ```

---

## 🎨 Widget Design Patterns

### Small Widget (190×190px)

**Use cases**:
- Single metric display
- Quick status check
- Simple action button
- Icon + number

**Example**:
```tsx
export function SmallWidget({ data }) {
  return (
    <div
      style={{ width: '190px', height: '190px' }}
      className="bg-white rounded-lg shadow-sm p-3 overflow-hidden"
    >
      <div className="flex flex-col gap-2 h-full">
        {/* Title */}
        <h3 className="text-sm font-semibold truncate">
          {data.appName}
        </h3>

        {/* Main Metric */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">
              {data.activeCount}
            </div>
            <div className="text-xs text-gray-500">
              Active Triggers
            </div>
          </div>
        </div>

        {/* Quick Action */}
        <button className="w-full h-11 bg-blue-500 text-white rounded text-sm">
          View Details
        </button>
      </div>
    </div>
  );
}
```

### Large Widget (400×190px)

**Use cases**:
- Multiple metrics
- Recent activity list
- Charts/graphs
- Multiple actions

**Example**:
```tsx
export function LargeWidget({ data }) {
  return (
    <div
      style={{ width: '400px', height: '190px', gridColumn: 'span 2' }}
      className="bg-white rounded-lg shadow-sm p-3 overflow-hidden"
    >
      <div className="flex gap-4 h-full">
        {/* Left: Metrics */}
        <div className="flex-1 flex flex-col gap-2">
          <h3 className="text-base font-semibold truncate">
            {data.appName}
          </h3>

          <div className="grid grid-cols-2 gap-2 flex-1">
            <MetricCard label="Active" value={data.active} />
            <MetricCard label="Success" value={`${data.successRate}%`} />
            <MetricCard label="Failed" value={data.failed} />
            <MetricCard label="Pending" value={data.pending} />
          </div>
        </div>

        {/* Right: Recent Activity */}
        <div className="w-48 flex flex-col gap-1">
          <div className="text-xs font-semibold text-gray-500">
            Recent Activity
          </div>
          <div className="flex-1 overflow-y-auto space-y-1">
            {data.recentExecutions.slice(0, 3).map(exec => (
              <ActivityItem key={exec.id} {...exec} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="bg-gray-50 rounded p-2">
      <div className="text-lg font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}
```

---

## 🔧 Implementation Guide

### Step 1: Backend Widget Endpoint

Create endpoint in `backend/main.py`:

```python
from fastapi import FastAPI, Depends
import os

app = FastAPI()

@app.get("/api/widget")
async def get_widget_data(
    size: str = "large",  # 'small' or 'large'
    user_id: str = Depends(get_current_user)
):
    workspace_id = os.getenv('CLARITY_WORKSPACE_ID')

    if size == "small":
        # Minimal data for quick glance (< 200ms)
        return {
            "appName": "My App",
            "activeTriggers": get_active_count(workspace_id),
            "successRate": calculate_success_rate(workspace_id)
        }

    # Detailed data for large widget (< 500ms)
    return {
        "appName": "My App",
        "activeTriggers": get_active_count(workspace_id),
        "totalExecutions": get_total_count(workspace_id),
        "successRate": calculate_success_rate(workspace_id),
        "recentExecutions": get_recent_executions(workspace_id, limit=5),
        "alerts": get_urgent_alerts(workspace_id)
    }

def get_active_count(workspace_id: str) -> int:
    # Query database with workspace filtering
    return db.query(Trigger).filter(
        Trigger.workspace_id == workspace_id,
        Trigger.active == True
    ).count()
```

### Step 2: Frontend Widget Component

Update `frontend/src/components/Widget.tsx`:

```typescript
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

interface WidgetProps {
  size?: 'small' | 'large';  // ONLY 2 sizes
}

export default function Widget({ size = 'large' }: WidgetProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['widget', size],
    queryFn: () => api.getWidgetData(size),
    refetchInterval: 30000,  // Refresh every 30 seconds
  });

  if (isLoading) {
    return <WidgetSkeleton size={size} />;
  }

  if (error) {
    return <WidgetError size={size} />;
  }

  if (size === 'small') {
    return <SmallWidget data={data} />;
  }

  return <LargeWidget data={data} />;
}
```

### Step 3: API Client

Update `frontend/src/lib/api.ts`:

```typescript
class API {
  private baseURL = import.meta.env.VITE_API_URL || '';

  async getWidgetData(size: 'small' | 'large') {
    const response = await fetch(
      `${this.baseURL}/api/widget?size=${size}`,
      {
        headers: {
          'Authorization': `Bearer ${this.getToken()}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch widget data');
    }

    return response.json();
  }

  private getToken(): string {
    // Get JWT token from localStorage or cookies
    return localStorage.getItem('auth_token') || '';
  }
}

export default new API();
```

---

## 🧪 Testing Widgets

### Local Testing

```bash
# Start development environment
docker-compose up -d

# Test widget endpoints
curl http://localhost:8000/api/widget?size=small
curl http://localhost:8000/api/widget?size=large

# Measure response time
time curl http://localhost:8000/api/widget?size=small
# Should be < 200ms

time curl http://localhost:8000/api/widget?size=large
# Should be < 500ms
```

### Visual Testing

1. **Open frontend**: http://localhost:3000
2. **View widget grid**: Check that widgets align properly
3. **Resize browser**: Verify responsive behavior (2 cols → 4 cols)
4. **Test interactions**: Click buttons, scroll lists

### Performance Testing

**Use browser DevTools**:
1. Open Network tab
2. Filter by "widget" API calls
3. Check response times:
   - Small: < 200ms
   - Large: < 500ms

**Use Lighthouse**:
```bash
# Install Lighthouse
npm install -g lighthouse

# Run performance audit
lighthouse http://localhost:3000 --only-categories=performance
```

### Apple HIG Validation

**Use platform validator**:
```bash
# Platform runs this automatically during validation
# You can test locally with:

# Check widget dimensions
grep -r "190px\|400px" frontend/src/components/Widget.tsx

# Check touch target sizes
grep -r "w-11\|h-11\|min-w-\[44px\]\|min-h-\[44px\]" frontend/src/components/

# Check font sizes
grep -r "text-xs\|text-sm\|text-base" frontend/src/components/Widget.tsx
```

---

## 📋 Widget Checklist

Before submitting to Claritty Platform, verify:

### Dimensions
- [ ] Small widget: Exactly `190×190px` (no responsive width/height)
- [ ] Large widget: Exactly `400×190px` + `gridColumn: 'span 2'`
- [ ] No medium size implemented (platform doesn't support it)
- [ ] All widgets use `overflow: hidden` to prevent overflow

### Apple HIG Compliance
- [ ] Touch targets ≥ `44×44px`
- [ ] Font sizes ≥ `12px` (text-xs)
- [ ] Consistent padding (`p-3` recommended)
- [ ] Proper spacing between elements (`gap-2` for compact)

### Performance
- [ ] Small widget endpoint responds in < 200ms
- [ ] Large widget endpoint responds in < 500ms
- [ ] Widget data cached where appropriate
- [ ] Database queries indexed and optimized

### Functionality
- [ ] Widgets display meaningful data
- [ ] Loading states implemented (WidgetSkeleton)
- [ ] Error states handled (WidgetError)
- [ ] Widgets refresh automatically (polling or real-time)

### Multi-Tenancy
- [ ] All widget data filtered by `CLARITY_WORKSPACE_ID`
- [ ] No cross-tenant data access
- [ ] Proper workspace isolation

---

## 🎓 Best Practices

### 1. Design for Glanceability

**Good**: User sees status in < 1 second
```tsx
// ✅ Clear, immediate information
<div className="text-3xl font-bold text-green-600">94%</div>
<div className="text-xs text-gray-500">Success Rate</div>
```

**Bad**: User has to read paragraphs
```tsx
// ❌ Too much text, not scannable
<p className="text-xs">
  Your app has executed 1,234 workflows in the last 24 hours
  with a success rate of 94.2% which is above the average...
</p>
```

### 2. Prioritize Information

**Small widget**: Show ONLY the most important metric
```tsx
// ✅ Single focus
<div>
  <div className="text-3xl font-bold">{data.activeCount}</div>
  <div className="text-xs">Active Triggers</div>
</div>
```

**Large widget**: Show 2-4 key metrics + recent activity
```tsx
// ✅ Multiple metrics, still scannable
<div className="grid grid-cols-2 gap-2">
  <Metric label="Active" value={data.active} />
  <Metric label="Success" value={`${data.successRate}%`} />
  <Metric label="Failed" value={data.failed} />
  <Metric label="Pending" value={data.pending} />
</div>
```

### 3. Use Visual Hierarchy

**Typography**:
- Title: `text-base` (16px) - app name
- Primary metric: `text-3xl` (30px) - main number
- Secondary metric: `text-lg` (18px) - supporting numbers
- Labels: `text-xs` (12px) - descriptions

**Color**:
- Use color to indicate status (green = good, red = error, yellow = warning)
- Keep backgrounds light for readability
- Use platform color palette (Tailwind defaults)

### 4. Handle States Gracefully

**Loading**:
```tsx
function WidgetSkeleton({ size }) {
  return (
    <div className="animate-pulse bg-gray-200 rounded-lg"
         style={{
           width: size === 'small' ? '190px' : '400px',
           height: '190px'
         }}>
      {/* Skeleton content */}
    </div>
  );
}
```

**Error**:
```tsx
function WidgetError({ size }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-3"
         style={{
           width: size === 'small' ? '190px' : '400px',
           height: '190px'
         }}>
      <div className="text-sm text-red-600">
        Failed to load widget
      </div>
      <button onClick={retry} className="mt-2 text-xs underline">
        Retry
      </button>
    </div>
  );
}
```

**Empty state**:
```tsx
function WidgetEmpty({ size }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-center"
         style={{
           width: size === 'small' ? '190px' : '400px',
           height: '190px'
         }}>
      <div className="text-center">
        <div className="text-sm text-gray-500">No data yet</div>
        <button className="mt-2 text-xs text-blue-600 underline">
          Get Started
        </button>
      </div>
    </div>
  );
}
```

---

## 📚 Related Documentation

- **README.md** - Quick start and core concepts
- **CLAUDE.md** - AI assistant guide for implementation
- **PLATFORM.md** - Deployment guide
- **INFRASTRUCTURE.md** - Infrastructure files explanation
- **docs/archive/WIDGET_*.md** - Comprehensive widget guides (archived)

---

## 🆘 Common Widget Mistakes

### ❌ Mistake 1: Creating 3 Widget Sizes

```tsx
// ❌ WRONG - Platform only supports 2 sizes
if (size === 'small') return <SmallWidget />;
if (size === 'medium') return <MediumWidget />;  // NO MEDIUM!
if (size === 'large') return <LargeWidget />;
```

**Solution**: Remove medium size. Only small (190×190px) and large (400×190px).

### ❌ Mistake 2: Using Responsive Width/Height

```tsx
// ❌ WRONG - Responsive classes break grid layout
<div className="w-full h-full">
  <Widget />
</div>

// ✅ CORRECT - Fixed pixel dimensions
<div style={{ width: '190px', height: '190px' }}>
  <Widget />
</div>
```

### ❌ Mistake 3: Forgetting gridColumn for Large Widgets

```tsx
// ❌ WRONG - Large widget doesn't span 2 columns
<div style={{ width: '400px', height: '190px' }}>
  <LargeWidget />
</div>

// ✅ CORRECT - Spans 2 columns
<div style={{ width: '400px', height: '190px', gridColumn: 'span 2' }}>
  <LargeWidget />
</div>
```

### ❌ Mistake 4: Slow Widget Endpoints

```python
# ❌ WRONG - Fetches all data (slow)
@app.get("/api/widget")
async def get_widget_data(size: str):
    # Takes 2 seconds to query everything
    all_executions = db.query(Execution).all()
    return process_all_data(all_executions)

# ✅ CORRECT - Fetches only what's needed
@app.get("/api/widget")
async def get_widget_data(size: str):
    workspace_id = os.getenv('CLARITY_WORKSPACE_ID')

    if size == "small":
        # Quick count queries (< 200ms)
        return {
            "activeCount": db.query(Trigger).filter(...).count()
        }
```

### ❌ Mistake 5: Missing Multi-Tenancy

```python
# ❌ WRONG - Returns data across all tenants
active_triggers = db.query(Trigger).filter(Trigger.active == True).all()

# ✅ CORRECT - Filters by workspace
workspace_id = os.getenv('CLARITY_WORKSPACE_ID')
active_triggers = db.query(Trigger).filter(
    Trigger.workspace_id == workspace_id,
    Trigger.active == True
).all()
```

---

**Ready to build widgets?** Check the examples in `frontend/src/components/Widget.tsx`! 📱
