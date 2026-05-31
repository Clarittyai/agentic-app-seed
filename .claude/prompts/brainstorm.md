# Agentic App Brainstorming Prompt

**Use this with `/superpowers:brainstorming` in Claude Code**

---

## 🎯 Goal

Help you design a production-ready agentic app for Claritty Platform by answering key questions about:
- Problem you're solving
- AI agents needed
- User experience (widgets!)
- Automation schedules

---

## 📋 Questions to Answer

### 1. Problem & Users

**What problem does your app solve?**
- Who experiences this problem?
- How do they currently solve it (manually)?
- Why is manual work painful/time-consuming?

**Example**: "Sales teams spend 2 hours/day manually prioritizing leads from multiple sources"

---

### 2. Agentic Automation

**What tasks should AI agents handle automatically?**

Think about:
- Data collection (fetching, aggregating)
- Analysis (prioritization, classification, insights)
- Content generation (emails, reports, summaries)
- Actions (sending notifications, updating records)

**Example**:
- Agent 1: Fetch leads from CRM API
- Agent 2: Score leads using Claude (urgency, fit, intent)
- Agent 3: Generate personalized email drafts

---

### 3. User Schedule (Triggers)

**When/how often should your app run?**

Consider:
- Daily at specific time? (e.g., "9am every weekday")
- Interval-based? (e.g., "every 2 hours")
- Event-triggered? (e.g., "when new lead arrives via webhook")
- Data threshold? (e.g., "when pending count > 50")

**Key**: Users configure their own schedules! You define the template, they set their time/frequency.

**Example**:
- Template: "Daily Lead Review"
- User A: 9am EST, Mon-Fri
- User B: 6pm PST, Every day

---

### 4. Widget Interface (PRIMARY UX!)

**What should users see at a glance in their dashboard?**

Remember:
- Widgets are the PRIMARY interface (users see them 90% of the time)
- There are EXACTLY 3 Apple-HIG sizes (these only): Small 170×170, Medium 360×170, Large 360×360
- Design for glanceability - they should understand status in < 1 second
- Widgets are window-size invariant: fixed px, never responsive to the viewport

**Small Widget (170×170px)** — single quick metric:
- The one most important number
- An optional status chip + one action button

**Medium Widget (360×170px)** — a compact row / short list:
- A headline metric + 2-3 list rows (or a calendar/forecast strip)
- One or two quick actions

**Large Widget (360×360px)** — a rich multi-row view:
- Headline metric(s) + a fuller list (5-6 rows) that fills the height
- Quick actions; surface "+N more" rather than scrolling

**Example for Lead Scoring App**:
- Small: "47 New Leads" + "Score Now" button
- Medium: "47 New" + top 2-3 leads + "View All"
- Large: Hot (12) / Warm (24) / Cold (11) + top 5 leads + "View All"

---

### 5. Data & Multi-Tenancy

**What data will your app store?**

Every app gets:
- PostgreSQL database (DATABASE_URL)
- Per-user isolation (filter every user-data query by the X-User-ID caller)

Think about:
- What entities? (e.g., Leads, Tasks, Reports)
- What fields? (e.g., title, status, priority, score)
- Relationships? (e.g., Lead → ContactHistory)

**CRITICAL**: Every user-data model has a `user_id` column and EVERY query filters by it!

```python
# ✅ CORRECT — caller comes from the X-User-ID header (see routes/app.py)
leads = db.query(Lead).filter(Lead.user_id == user_id).all()

# ❌ WRONG - returns data across all tenants!
leads = db.query(Lead).all()
```

---

### 6. External Integrations

**What APIs/services will you integrate with?**

Common integrations:
- Claude (built in, via the Claritty LLM proxy — no API key) for AI analysis
- Email services (SendGrid, Mailgun)
- CRMs (Salesforce, HubSpot)
- Communication (Slack, Teams)
- Payment (Stripe)

**Remember**: User provides API keys via .env during installation!

---

## 🎨 Design Output

After brainstorming, you should have:

### Agents (1-3 recommended)
- **Agent 1**: [Name] - [What it does]
- **Agent 2**: [Name] - [What it does]
- **Agent 3**: [Name] - [What it does]

### Workflows (1-2 recommended)
- **Workflow 1**: [Name] - Chains Agent 1 → Agent 2 → Agent 3
- **Workflow 2**: [Name] - Runs Agent X in parallel with Agent Y

### Triggers (1-3 recommended)
- **Trigger 1**: [Type] - Runs Workflow 1 at [user-configured time]
- **Trigger 2**: [Type] - Runs Workflow 2 every [user-configured interval]

### Widgets
- **Small Widget**: Shows [single metric] + [action button]
- **Large Widget**: Shows [2-4 metrics] + [recent activity] + [actions]

### Database Entities
- **Entity 1**: [Name] - Fields: [list]
- **Entity 2**: [Name] - Fields: [list]

---

## ✅ Validation Checklist

Before implementing, verify:

- [ ] Problem is clear and specific
- [ ] Agents have well-defined single responsibilities
- [ ] Workflows chain agents logically
- [ ] Triggers allow user customization (time, frequency, filters)
- [ ] Small widget shows ONE key metric (glanceable)
- [ ] Large widget shows 2-4 metrics + activity
- [ ] Database entities have a `user_id` field (filtered on every query)
- [ ] External API keys identified and added to .env.example

---

## 🚀 Next Steps

After brainstorming:

1. **Create implementation plan** with Claude Code
2. **Start with agents** - Implement one agent at a time
3. **Chain into workflows** - Test agent composition
4. **Add trigger templates** - Let users configure schedules
5. **Design widgets** - Make them beautiful and fast (< 200ms small, < 500ms large)
6. **Test locally** - docker-compose up, test all endpoints
7. **Deploy to Claritty** - Submit GitHub URL to platform

---

## 💡 Example: Lead Scoring App

**Problem**: Sales teams waste time manually reviewing 100+ leads/day from multiple sources

**Agents**:
1. **Lead Fetcher** - Fetches leads from CRM API (HubSpot, Salesforce)
2. **Lead Scorer** - Uses Claude to score leads (urgency, fit, intent)
3. **Email Composer** - Generates personalized outreach emails

**Workflow**:
- **Daily Lead Review** - Fetches leads → Scores them → Generates emails → Sends summary

**Triggers**:
1. **Daily Review** - User configures time (e.g., 9am EST)
2. **New Lead Alert** - Webhook triggers when lead score > 90

**Widgets**:
- **Small**: "47 New Leads Today" + "Review Now" button
- **Large**: Hot (12), Warm (24), Cold (11) + Top 3 leads with scores + "View All"

**Database**:
- **Lead**: id, user_id, name, email, score, status, created_at
- **EmailDraft**: id, user_id, lead_id, subject, body, sent_at

**Integrations**:
- Claude API (scoring)
- HubSpot API (fetching leads)
- SendGrid (sending emails)

---

**Ready to build?** Run `/superpowers:brainstorming` in Claude Code and let's design your app! 🚀
