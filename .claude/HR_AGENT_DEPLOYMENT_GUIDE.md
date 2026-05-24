# HR Agent Deployment Guide — Standalone Workflow & Performance Monitoring

**Purpose:** Initialize and deploy HR Agent across projects for strict workflow enforcement and agent performance monitoring.

**Scope:** Not app-building focused. Pure workflow compliance + performance auditing.

**Status:** Ready to deploy to any project with agents and session-based workflows.

---

## What HR Agent Does

The HR Agent is a specialized auditing system that:

1. **Reads** — Extracts session logs, agent configs, execution data
2. **Analyzes** — Scores SOP compliance, identifies inefficiencies, calculates token waste
3. **Reports** — Generates dated audit reports with findings, recommendations, lessons learned
4. **Applies** — Updates SOP with fixes immediately after audit

**Key deliverable:** Dated audit report (`.claude/HR audit/[AUDIT-DATE]-audit-[SESSION-DATE].md`)

---

## Setup Instructions

### Step 1: Copy HR Agent Config

Copy `.claude/agents/hr-agent.md` to your project:

```
your-project/
└── .claude/
    └── agents/
        └── hr-agent.md  ← (copy from source)
```

**HR Agent config includes:**
- Phase 1 (Haiku): Read documents, extract raw data
- Phase 2 (Sonnet): Analyze compliance, identify inefficiencies
- Phase 3 (Haiku): Generate report + apply fixes

### Step 2: Create HR Audit Folder

```
your-project/
└── .claude/
    └── HR audit/  ← (create this folder)
```

Reports will be filed here as: `[AUDIT-DATE]-audit-[SESSION-DATE].md`

### Step 3: Define Your SOP File

**Create or reference your main SOP document:**
- Location: `.claude/CLAUDE.md` (or equivalent SOP file in your project)
- Content: All workflow rules, gates, prevention rules, agent configs

The HR Agent will audit against THIS document.

### Step 4: Define Session Logging Structure

**Sessions must follow this structure:**

```
.claude/sessions/[DATE]/
├── SESSION_LOG.md          ← Task specs, agent verdicts, carry-over tasks
├── technical_log_v1.md     ← Implementation details, findings, signatures
├── MEMORY.md               ← Cached agent configs (loaded once per session)
└── SC[N]_description.png   ← Screenshots
```

**Session Log example:**

```markdown
# Session Log — 2026-05-02

## Carry-Over Tasks
- Task: V31 Phase 1&2 Bug Fix | Status: EXECUTING | Started: 2026-05-01

## Task: Feature Implementation
**Ref:** MEMORY.md § Coding Agent | Config cached: ✓
**What:** Implement user authentication
**Files:** src/app/actions/auth.ts, src/lib/db/users.ts
**Validate:** npm run lint && npm test

## Build Results
- [CA | 10:30] Build 1 → PASS (technical_log_v1.md)
- [CR | 11:15] Code Review → PASS (technical_log_v1.md)
- [QA | 11:45] Testing → PASS (technical_log_v1.md)
```

### Step 5: Cache Agent Configs in MEMORY.md

**At session start, create MEMORY.md with cached agent configs:**

```markdown
# Session Memory — 2026-05-02

## Agent Config Index
**Loaded:** 2026-05-02 09:30 (session start)
**Status:** Cached — agents reference these, no re-reads

### Coding Agent Config
- Model: claude-sonnet-4-6
- Output: technical_log + verdict
- Key rule: Must commit+push before QA testing
[... rest of config summary ...]

### Code Reviewer Config
[... cached copy ...]

[... all other agent configs cached ...]
```

---

## Running an HR Audit

### User Request Format

```
"Run HR Agent"
"Audit session 2026-05-01 to 2026-05-02"
"Check compliance for date range [START] to [END]"
```

### Orchestrator Execution (3 Phases)

**Phase 1 — Reading (Haiku):**
```
/model haiku
HR Agent: Audit session 2026-05-01
- Read: .claude/sessions/2026-05-01/SESSION_LOG.md
- Read: .claude/sessions/2026-05-01/technical_log_*.md
- Read: .claude/CLAUDE.md (SOP file)
- Read: .claude/agents/[all configs] (or MEMORY.md if cached)
- Extract: Raw data (tasks, verdicts, timestamps, violations)
```

**Phase 2 — Analysis (Sonnet):**
```
/model sonnet
HR Agent Phase 2: Analyze extracted data
- Score compliance (0-100)
- Identify inefficiencies
- Flag gate violations
- Estimate token waste
- Recommend fixes by priority
```

**Phase 3 — Report & Apply (Haiku):**
```
/model haiku
HR Agent Phase 3: Generate report + apply fixes
- Create: .claude/HR audit/[AUDIT-DATE]-audit-[SESSION-DATE].md
- Update: .claude/CLAUDE.md with Priority 1 fixes
- Format: Audit report with all 8 mandatory sections
```

---

## Audit Report Structure (Mandatory)

Every audit must produce a report file with these 8 sections:

### 1. Executive Summary (2-3 sentences)
```
What passed, what failed, overall grade (A-F).
Example: "Session 2026-05-01 scored 74/100 (C+). 5/6 gates enforced. 
Technical logs missing — documented and recommend logging standard."
```

### 2. Initial Audit Findings (Full Score)
```
Compliance Score: 74/100
✅ Passing checks (5/18):
- Config caching enforced
- Compressed signatures used
- Build→CR→QA sequence followed
- Code committed+pushed before QA
- Applied Learning rules documented

❌ Failing checks (13/18):
- Missing technical_log_v1.md
- GATE 6 not documented in SESSION_LOG
- QA dispatch template not used
[... etc ...]
```

### 3. Suggested Fixes (By Priority)
```
PRIORITY 1 — Implement Immediately:
1. Technical Log Standard — require technical_log_v1.md always
2. GATE 6 Documentation — enforce SESSION_LOG section for Applied Learning

PRIORITY 2 — Implement in Next 2 Sessions:
3. QA Dispatch Template — use formal template, not ad-hoc context
[... etc ...]
```

### 4. What Was Fixed (Applied Solutions)
```
Changes applied immediately to .claude/CLAUDE.md:
✅ Added "Technical Log Ownership" section to coding-agent.md
✅ Added technical_log creation checklist to Implementation Checklist
✅ Updated GATE_CHECKLIST.md GATE 6 with explicit documentation rule
[... each fix documented ...]
```

### 5. Lessons Learned (Root Cause Analysis)
```
Why technical_log was missing:
- Root: No gate checking for technical_log creation
- Lesson: Artifacts must be tracked, not optional
- Fix: Explicit ownership + checklist

Why GATE 6 wasn't documented:
- Root: Applied Learning rules checked but not logged in SESSION_LOG
- Lesson: Enforcement requires visible documentation
- Fix: GATE_CHECKLIST.md updated to require SESSION_LOG section
```

### 6. Violations Log (Track Over Time)
```
| Date | Violation | Gate | Prevention | Outcome |
|------|-----------|------|-----------|---------|
| 2026-05-01 | Missing technical_log | [none] | Not enforced | ❌ FAILED |
| 2026-05-01 | GATE 6 undocumented | Gate 6 | Not enforced | ❌ FAILED |
| 2026-05-01 | Wrong QA template | Gate 3 | Partially enforced | ⚠️ MARGINAL |
```

### 7. Next Audit Checklist (What to Verify)
```
Next audit scheduled: [date]

What to check:
- [ ] technical_log_v1.md created for all builds?
- [ ] GATE 6 documented in SESSION_LOG?
- [ ] QA dispatch template used?
- [ ] Were violations identical to previous audit?
- [ ] Did gates catch 90%+ of mistakes?

Verdict criteria:
✅ PASS: 0 violations from previous audit
⚠️ PASS WITH NOTES: 1-2 violations, gates caught them
❌ FAIL: 3+ violations, gates not enforced
```

### 8. Audit Metadata
```
**Audit Duration:** [time spent]
**Token Budget Used:** [tokens] ([% of session])
**Report Location:** .claude/HR audit/2026-05-02-audit-2026-05-01-session.md
**Fixes Applied:** [count] (P1/P2/P3 breakdown)
**Violations Documented:** [count]
**Next Review:** [date]
**Status:** ✅ Fixes applied and documented
```

---

## SOP Compliance Gates (Enforce These)

The HR Agent audits against these 6 gates. Embed them in your SOP:

### GATE 1: Task Spec Before Agent Dispatch
- [ ] SESSION_LOG has task definition
- [ ] Task includes What/Files/Validate sections
- [ ] No vague tasks

### GATE 2: Build→CR→QA Sequence Lock
- [ ] Code Review dispatched after Build PASS
- [ ] QA dispatched after CR PASS
- [ ] Never skip steps

### GATE 3: Explicit Sub-Agent Context
- [ ] Test data path specified
- [ ] Code files confirmed to exist
- [ ] Feature scope documented
- [ ] Output location specified

### GATE 4: Code Commit+Push Before QA
- [ ] Code committed before QA gets checklist
- [ ] Code pushed to remote before testing
- [ ] User can verify on production

### GATE 5: Carry-Over Task Explicit Resolution
- [ ] SESSION_LOG has Carry-Over Tasks section
- [ ] Each task has explicit status (EXECUTING/DEFERRED/COMPLETE)
- [ ] No silent orphans

### GATE 6: Applied Learning Enforcement
- [ ] Agent reads SOP § Applied Learning before work
- [ ] Agent documents which rules apply
- [ ] Agent implements rules immediately
- [ ] SESSION_LOG has explicit section documenting applied rules

---

## Token Budget Constraint

**HR Agent token cap: 20% of session budget**

- Phase 1 (Reading): ~6.7% (Haiku I/O)
- Phase 2 (Analysis): ~6.7% (Sonnet deep thinking)
- Phase 3 (Report + Apply): ~6.7% (Haiku writing + CLAUDE.md edits)

**If approaching limit:**
- Phase 1: Abort collection, proceed with partial data
- Phase 2: Skip Priority 3 recommendations
- Phase 3: Compress report, apply only top 1 fix

---

## Integration Checklist

Use this checklist to deploy HR Agent to your project:

```
Project Setup:
- [ ] Copy .claude/agents/hr-agent.md
- [ ] Create .claude/HR audit/ folder
- [ ] Define SOP file (CLAUDE.md equivalent)
- [ ] Define session folder structure
- [ ] Create sample MEMORY.md for agent config caching

Gate Enforcement:
- [ ] GATE 1-6 documented in SOP
- [ ] GATE_CHECKLIST.md created (copy + customize)
- [ ] Agent configs updated with gate references
- [ ] Main Orchestrator enforces gates before dispatch

First Audit:
- [ ] User requests audit via "Run HR Agent"
- [ ] Orchestrator executes 3-phase workflow
- [ ] Report file created in .claude/HR audit/
- [ ] Priority 1 fixes applied to SOP immediately

Ongoing:
- [ ] Schedule audits after each major session (weekly recommended)
- [ ] Track violations log for recurring patterns
- [ ] Update SOP quarterly based on audit findings
- [ ] Archive old reports to identify trends
```

---

## Example Deployment to Another Project

**Copy to target project:**
```bash
cp -r .claude/agents/hr-agent.md /target-project/.claude/agents/
cp -r .claude/HR_AGENT_DEPLOYMENT_GUIDE.md /target-project/.claude/
mkdir -p /target-project/.claude/HR\ audit/
```

**Customize for target:**
1. Read the deployment guide
2. Update session folder references (if different structure)
3. Reference their SOP file (CLAUDE.md or equivalent)
4. First audit: ask "Run HR Agent" with date range

**Result:** Target project now has automated compliance auditing + performance monitoring.

---

**Last Updated:** 2026-05-02  
**HR Agent Version:** 1.0 (Stable)  
**Deployment Status:** Ready for multi-project use
