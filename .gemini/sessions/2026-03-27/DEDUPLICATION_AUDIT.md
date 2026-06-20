# Deduplication Audit — CLAUDE.md vs Agent Files
**Date:** 2026-03-27 | **Scope:** Entire .claude folder

---

## Executive Summary

**Finding:** CLAUDE.md is somewhat redundant. It contains SESSION_LOG/TECHNICAL_LOG FORMAT definitions and Agent Execution Order, but the ACTUAL detailed specifications for each agent (checklists, methodologies, rules) live in separate `agents/*.md` files. Most duplications are at the "output format" level, while agent-specific execution details are missing from CLAUDE.md.

**Impact:** Users reading CLAUDE.md won't know:
- Code Reviewer has a detailed checklist (correctness, performance, code quality, OLED compliance)
- QA Agent has specific test coverage requirements (happy path, auth failure, invalid input, edge case)
- Coding Agent has a "Before Writing Code" process (read rules, read pattern file, confirm understanding)
- Security Reviewer uses a different model (opus vs sonnet)
- Research Agent exists with its own spec (no mention in CLAUDE.md)

**Recommendation:** Consolidate agent specifications into CLAUDE.md with references to detailed agent/*.md files, OR lean fully into agent/*.md as the source of truth and remove duplicated format examples from CLAUDE.md.

---

## Detailed Findings

### 1. CODE REVIEWER — CLAUDE.md vs code-reviewer.md

**In CLAUDE.md:**
- FORMAT I (page ~460): Shows output format only
  ```
  ## Verdict: PASS | PASS WITH NOTES | FAIL
  ## Findings (max 5 bullets)
  - [high] src/lib/db/trackers.ts:12 — getUser() not called before query
  ```
- Agent Execution Order mentions "Code Reviewer" step but no details
- No mention of "0-context requirement"

**In code-reviewer.md:**
- **Review Scope:** Detailed guidance (read changed files only, focus on what changed)
- **Review Checklist:** 
  - Correctness (7 items: try/catch, error messages, auth, revalidatePath, dead code, TypeScript strict, tracker terminology)
  - Performance (5 items: N+1 queries, .select() specificity, blocking I/O, Gemini debouncing, cleanup)
  - Code Quality (5 items: function length, magic strings, exports, import grouping, server components)
  - OLED Theme Compliance (3 items: colors, backgrounds, borders)
- **Severity Levels:** Framework with [high], [medium], [low], [info] definitions
- **Rules:** "Be direct," "Reference exact lines," "Never rewrite code," "One FAIL is enough," "Check the rules files"
- **0-context requirement:** "You need to look at the code with 0 context and break the code down + give improvement notes"

**Duplication:**
- ✓ Output format duplicated (both have same verdict/findings structure)
- ✓ Agent responsibility duplicated in execution order (both mention code-reviewer step)

**Missing from CLAUDE.md:**
- ✗ Detailed Review Checklist (correctness, performance, code quality, OLED)
- ✗ Severity Levels framework
- ✗ "0-context requirement" (explicitly in code-reviewer.md, NOT in CLAUDE.md)
- ✗ Review scope guidance

---

### 2. CODING AGENT — CLAUDE.md vs coding-agent.md

**In CLAUDE.md:**
- FORMAT D (page ~380): "Coding Agent — Build [N] Released" announcement
  ```
  - Build v[N] compiled ✓ (exit 0, [N] routes)
  - Full technical details: `technical_log_v[N].md`
  ```
- Agent Execution Order mentions coding-agent step
- Mentions "Output Format (mandatory — return to orchestrator)" but no details

**In coding-agent.md:**
- **Model Preference:** claude-sonnet-4-6 (speed, rate limits, Next.js 15 instruction following)
- **Before Writing Any Code:** Checklist (read rules files, read pattern file, confirm understanding)
- **Implementation Checklist:** 8 items (read rules, read pattern, implement, TypeScript strict, error handling, RLS, no hardcoded secrets, revalidatePath, no file contents in output)
- **Output Format:** Verdict (PASS), Findings, Files Changed (paths only)
- **Validation Before Returning:** Must run `npm run lint && npm test` before declaring done
- **What You Build:** Details of Next.js 15 patterns (Data access, Server Actions, Route Handlers, Pages, Components, Types)

**Duplication:**
- ✓ Output format partially duplicated (both mention "PASS" verdict and "Files Changed")
- ✓ Agent step mentioned in execution order

**Missing from CLAUDE.md:**
- ✗ "Before Writing Any Code" checklist
- ✗ Implementation Checklist (8 items)
- ✗ Model preference (sonnet)
- ✗ Validation process (npm lint, npm test)
- ✗ Next.js 15 pattern details

---

### 3. QA AGENT — CLAUDE.md vs qa-agent.md

**In CLAUDE.md:**
- FORMAT E (page ~410): Test criteria checklist (shows structure)
- FORMAT F (page ~420): Test results summary (shows structure)
- Agent Execution Order mentions QA step
- Mentions "You must cover" but no detailed list

**In qa-agent.md:**
- **Model Preference:** claude-sonnet-4-6
- **Test Stack:** Vitest + React Testing Library + Supabase + mocked API tests
- **Test Coverage Requirements:** 4 mandatory items (happy path, auth failure, invalid input, edge case)
- **Test File Locations:** Detailed directory structure with examples
- **Test Patterns:** Code examples for DAL unit tests, Route Handler tests
- **Execution Process:** 5 steps (read files, check existing tests, write new tests, run npm test, return verdict)
- **Output Format:** Verdict, test results, test cases, coverage gaps, files tested
- **Rules:** Never declare PASS with failing test (3 rules total)

**Duplication:**
- ✓ Checklist structure duplicated (both show format)
- ✓ Agent step mentioned in execution order

**Missing from CLAUDE.md:**
- ✗ Test Coverage Requirements (happy path, auth failure, invalid input, edge case)
- ✗ Test Stack specification
- ✗ Test File Locations
- ✗ Test Patterns (code examples)
- ✗ Execution Process (5 steps)
- ✗ Rules about never declaring PASS with failing test
- ✗ Model preference (sonnet)

---

### 4. RESEARCH AGENT — CLAUDE.md vs research-agent.md

**In CLAUDE.md:**
- Agent Execution Order mentions "Research Agent" inline
- No dedicated section, format, or specification for Research Agent
- No mention of what Research Agent outputs or how it's used

**In research-agent.md:**
- **Model Preference:** claude-sonnet-4-6
- **When You Are Called:** 4 specific trigger cases (new external API, npm package evaluation, unclear constraints, security surface assessment)
- **Research Methodology:** 5 steps (check official docs, verify versions, assess security, check package health, note licensing)
- **Output Format:** Research Report with Answer, Key Findings, Implementation Notes, Recommended Approach, Sources
- **Rules:** No code, Current only, Be specific, Flag risks, One report per topic

**Duplication:**
- None directly (CLAUDE.md barely mentions Research Agent)

**Missing from CLAUDE.md:**
- ✗ **ENTIRE Research Agent specification** (when called, methodology, output format, rules)
- ✗ Research Agent format example
- ✗ Model preference (sonnet)
- ✗ When to dispatch research agent

---

### 5. SECURITY REVIEWER — CLAUDE.md vs security-reviewer.md

**In CLAUDE.md:**
- FORMAT G (page ~440): Security Reviewer announcement in SESSION_LOG
  ```
  - OWASP checklist: [summary]
  - Verdict: **PASS** | **FAIL**
  ```
- Agent Execution Order mentions security-reviewer step
- No detailed audit checklist

**In security-reviewer.md:**
- **Model Preference:** claude-opus-4-6 ⚠️ **DIFFERENT FROM OTHER AGENTS**
  - Reason: Deep reasoning for vulnerability detection and OWASP auditing
  - Action: CRITICAL: Upgrade to `/model opus` before auditing
- **Security Audit Checklist:** Comprehensive (Authentication & Authorization, RLS, Telegram Webhook, AI Output Sanitization, Secrets, Input Validation, OWASP Top 10 Quick Check)
- **Output Format:** Verdict, Findings (max 5), Files Audited
- **Rules:** One [critical] = FAIL, [warning] > 1 = FAIL, Never suggest workarounds, Reference .claude/rules/security.md

**Duplication:**
- ✓ Output format duplicated (both mention verdict/findings)
- ✓ Agent step mentioned in execution order

**Missing from CLAUDE.md:**
- ✗ **MODEL PREFERENCE UPGRADE** (opus instead of sonnet — CRITICAL MISS)
- ✗ Detailed Security Audit Checklist (5+ sections with 20+ items)
- ✗ Rules about [critical] and [warning] severity handling
- ✗ Reference to .claude/rules/security.md

---

## Consolidated Duplication Map

### What's DUPLICATED (appears in both CLAUDE.md and agent file):

| Item | CLAUDE.md | Agent File | Issue |
|------|-----------|-----------|-------|
| Output Format for Code Reviewer | FORMAT I | code-reviewer.md | Same structure, but agent file has more context |
| Output Format for Coding Agent | FORMAT D (SESSION_LOG) | coding-agent.md | Same, but agent file has validation details |
| Output Format for QA Agent | FORMAT E/F | qa-agent.md | Same, but agent file has execution process |
| Output Format for Security Reviewer | FORMAT G | security-reviewer.md | Same, but agent file has audit checklist |
| Agent Execution Order | Execution Order section | Each agent file | Mentioned in both, but details only in agent files |
| Model Preferences (mentioned) | Not mentioned clearly | Each agent file | CLAUDE.md doesn't specify sonnet vs opus |

### What's MISSING from CLAUDE.md (only in agent files):

| Specification | Agent File | Critical? |
|---------------|-----------|-----------|
| 0-context requirement for Code Reviewer | code-reviewer.md | YES — this is the job definition |
| Code Review Checklist (correctness, performance, code quality, OLED) | code-reviewer.md | YES — defines what to review |
| Severity Levels framework | code-reviewer.md | YES — defines verdict logic |
| Before Writing Code checklist | coding-agent.md | YES — defines implementation prep |
| Implementation Checklist | coding-agent.md | YES — defines what to do |
| Validation process (npm lint, npm test) | coding-agent.md | YES — defines done criteria |
| Test Coverage Requirements (happy path, auth failure, invalid input, edge case) | qa-agent.md | YES — defines test scope |
| Test Patterns & Examples | qa-agent.md | YES — shows how to write tests |
| Execution Process (5 steps) | qa-agent.md | YES — defines QA workflow |
| Rules (never PASS with failing test) | qa-agent.md | YES — defines verdict rules |
| **ENTIRE Research Agent Specification** | research-agent.md | YES — missing completely |
| **MODEL PREFERENCE: claude-opus-4-6 for Security Reviewer** | security-reviewer.md | **CRITICAL** — different model needed |
| Security Audit Checklist (OWASP, auth, RLS, secrets) | security-reviewer.md | YES — defines audit scope |
| Rules about [critical] and [warning] severity | security-reviewer.md | YES — defines verdict logic |

---

## Deduplication Strategy

### OPTION A: Consolidate Everything into CLAUDE.md
- Move all agent-specific details from agent/*.md files INTO CLAUDE.md
- Make CLAUDE.md the single source of truth
- Keep agent/*.md files as REFERENCE ONLY (linked from CLAUDE.md)
- **Pros:** One document to read; clear agent roles defined in main file
- **Cons:** CLAUDE.md becomes very large; harder to maintain separate agent configs

### OPTION B: Lean Into Agent Files as Source of Truth
- Remove OUTPUT FORMAT examples from CLAUDE.md (they're in agent files)
- Remove agent-specific CHECKLISTS from CLAUDE.md (they're in agent files)
- Keep CLAUDE.md focused on: SESSION_LOG structure, TECHNICAL_LOG structure, Execution Order, Session Folder Setup
- Add explicit REFERENCES in CLAUDE.md to each agent file (e.g., "See .claude/agents/code-reviewer.md for Code Review Checklist")
- Add a new section in CLAUDE.md: "Agent Specifications" with links to each agent file
- **Pros:** Clean separation of concerns; agent files stay as authoritative specs; CLAUDE.md stays focused
- **Cons:** Users must read multiple files

### OPTION C: Hybrid Approach (RECOMMENDED)
- **CLAUDE.md contains:**
  - Session/document structure (SESSION_LOG + TECHNICAL_LOG)
  - Agent Execution Order (high-level flow)
  - Links to each agent specification
  - SESSION_LOG/TECHNICAL_LOG format TEMPLATES (no duplication of content)
  - Loop-back rules and decision points
  
- **Agent files remain:**
  - Authoritative specifications (checklists, rules, methodologies)
  - Model preferences
  - Output formats (kept in agent files, referenced from CLAUDE.md)
  - Detailed execution process

- **Remove from CLAUDE.md:**
  - FORMAT A–J duplicates of agent output formats
  - Detailed checklists (move to agent files if not already there)
  - Agent-specific rules (keep in agent files only)

- **Add to CLAUDE.md:**
  - "Agent Specifications" section with links and brief descriptions
  - Quick reference table of model preferences (sonnet vs opus)
  - Explicit callout: "See .claude/agents/[agent-name].md for detailed [specification]"

---

## Specific Changes Required (Hybrid Approach)

### In CLAUDE.md:

**DELETE:**
- FORMAT A–J (they duplicate agent file output formats)
- "Agent Format Standards" section (move to agent files)
- Specific checklist details (move to agent files)
- Agent-specific rules sections (move to agent files)

**ADD:**
```markdown
## Agent Specifications Reference

Each agent has a detailed specification file. Read these before dispatching work:

| Agent | File | Key Responsibility |
|-------|------|-------------------|
| Coding Agent | `.claude/agents/coding-agent.md` | Implement features; validate with npm lint && npm test |
| Code Reviewer | `.claude/agents/code-reviewer.md` | Review code with 0 context; check correctness, performance, code quality, OLED |
| QA Agent | `.claude/agents/qa-agent.md` | Write and run tests; ensure happy path + error cases covered |
| Research Agent | `.claude/agents/research-agent.md` | Research new APIs/packages; return structured findings |
| Security Reviewer | `.claude/agents/security-reviewer.md` | Audit code against OWASP Top 10 and YAHA security rules |

### Model Preferences (CRITICAL)

- **Coding Agent:** `claude-sonnet-4-6` (speed, Next.js 15 instruction following)
- **Code Reviewer:** `claude-sonnet-4-6` (pattern matching, logic verification)
- **QA Agent:** `claude-sonnet-4-6` (test generation, log analysis)
- **Research Agent:** `claude-sonnet-4-6` (documentation search, API analysis)
- **Security Reviewer:** `claude-opus-4-6` ⚠️ **DIFFERENT — upgrade before audit** (deep reasoning for vulnerability detection)

Before dispatching security-reviewer, execute `/model opus` to switch models.
```

**MODIFY:**
- "Agent Hierarchy & Professional Workflow" section:
  - Remove FORMAT A–J
  - Keep "Session-Based Agent Pipeline" and "Agent Execution Order" (high-level only)
  - Add explicit links: "See `.claude/agents/code-reviewer.md` for detailed review checklist"
  - Keep loop-back rules and decision points

**CLARIFY:**
- Code Reviewer's 0-context requirement: "Every code reviewer must approach code with zero prior context"
- Add: "Agent specifications are authoritative. This document defines the session workflow; agent files define the execution details."

---

## Files to Create / Modify

| File | Action | Reason |
|------|--------|--------|
| CLAUDE.md | Modify | Remove duplicate FORMAT sections; add agent reference table; clarify model preferences |
| code-reviewer.md | Modify | Already good; ensure 0-context requirement is prominent |
| coding-agent.md | Modify | Already good; already has comprehensive specs |
| qa-agent.md | Modify | Already good; already has comprehensive specs |
| research-agent.md | Modify | Already good; ensure it's referenced from CLAUDE.md |
| security-reviewer.md | Modify | Add prominent callout: `claude-opus-4-6` model required; highlight CRITICAL emphasis |

---

## Risk Assessment

**Low Risk Changes:**
- Adding reference table to CLAUDE.md (informational only)
- Adding model preference callout (doesn't change behavior)
- Linking to agent files (they already exist)

**Medium Risk Changes:**
- Removing FORMAT sections from CLAUDE.md (if agents file content is complete, this is safe)
- Consolidating rules in agent files (ensure nothing is lost)

**High Risk Changes:**
- Removing anything from agent/*.md files (these are working configs)
- Making CLAUDE.md the single source of truth without proper references

---

## Recommendation

**Implement Hybrid Approach (OPTION C):**
1. Keep agent/*.md files as authoritative specifications (they're good as-is)
2. Add "Agent Specifications Reference" section to CLAUDE.md with links
3. Remove duplicate FORMAT A–J from CLAUDE.md
4. Add model preference table to CLAUDE.md
5. Ensure code-reviewer.md has 0-context requirement prominent
6. Ensure security-reviewer.md has claude-opus-4-6 callout prominent

**Outcome:** Users read CLAUDE.md for session workflow; read agent/*.md files for execution details. No duplication; clear responsibility division.
