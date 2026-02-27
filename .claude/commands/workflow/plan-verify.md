---
name: plan-verify
description: Perform READ-ONLY verification analysis between IMPL_PLAN.md, task JSONs, and brainstorming artifacts. Generates structured report with quality gate recommendation. Does NOT modify any files.
argument-hint: "[optional: --session session-id]"
allowed-tools: Read(*), Write(*), Glob(*), Bash(*)
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Goal

Generate a comprehensive verification report that identifies inconsistencies, duplications, ambiguities, and underspecified items between action planning artifacts (`IMPL_PLAN.md`, `task.json`) and brainstorming artifacts (`role analysis documents`). This command MUST run only after `/workflow:plan` has successfully produced complete `IMPL_PLAN.md` and task JSON files.

**Output**: A structured Markdown report saved to `.workflow/active/WFS-{session}/.process/PLAN_VERIFICATION.md` containing:
- Executive summary with quality gate recommendation
- Detailed findings by severity (CRITICAL/HIGH/MEDIUM/LOW)
- Requirements coverage analysis
- Dependency integrity check
- Synthesis alignment validation
- Actionable remediation recommendations

## Operating Constraints

**STRICTLY READ-ONLY FOR SOURCE ARTIFACTS**:
- **MUST NOT** modify `IMPL_PLAN.md`, any `task.json` files, or brainstorming artifacts
- **MUST NOT** create or delete task files
- **MUST ONLY** write the verification report to `.process/PLAN_VERIFICATION.md`

**Synthesis Authority**: The `role analysis documents` are **authoritative** for requirements and design decisions. Any conflicts between IMPL_PLAN/tasks and synthesis are automatically CRITICAL and require adjustment of the plan/tasks—not reinterpretation of requirements.

**Quality Gate Authority**: The verification report provides a binding recommendation (BLOCK_EXECUTION / PROCEED_WITH_FIXES / PROCEED_WITH_CAUTION / PROCEED) based on objective severity criteria. User MUST review critical/high issues before proceeding with implementation.

## Execution Steps

### 1. Initialize Analysis Context

```bash
# Detect active workflow session
IF --session parameter provided:
    session_id = provided session
ELSE:
    # Auto-detect active session
    active_sessions = bash(find .workflow/active/ -name "WFS-*" -type d 2>/dev/null)
    IF active_sessions is empty:
        ERROR: "No active workflow session found. Use --session <session-id>"
        EXIT
    ELSE IF active_sessions has multiple entries:
        # Use most recently modified session
        session_id = bash(ls -td .workflow/active/WFS-*/ 2>/dev/null | head -1 | xargs basename)
    ELSE:
        session_id = basename(active_sessions[0])

# Derive absolute paths
session_dir = .workflow/active/WFS-{session}
brainstorm_dir = session_dir/.brainstorming
task_dir = session_dir/.task
process_dir = session_dir/.process
session_file = session_dir/workflow-session.json

# Create .process directory if not exists (report output location)
IF NOT EXISTS(process_dir):
    bash(mkdir -p "{process_dir}")

# Validate required artifacts
# Note: "role analysis documents" refers to [role]/analysis.md files (e.g., product-manager/analysis.md)
SYNTHESIS_DIR = brainstorm_dir  # Contains role analysis files: */analysis.md
IMPL_PLAN = session_dir/IMPL_PLAN.md
TASK_FILES = Glob(task_dir/*.json)

# Abort if missing - in order of dependency
SESSION_FILE_EXISTS = EXISTS(session_file)
IF NOT SESSION_FILE_EXISTS:
    WARNING: "workflow-session.json not found. User intent alignment verification will be skipped."
    # Continue execution - this is optional context, not blocking

SYNTHESIS_FILES = Glob(brainstorm_dir/*/analysis.md)
IF SYNTHESIS_FILES.count == 0:
    ERROR: "No role analysis documents found in .brainstorming/*/analysis.md. Run /workflow:brainstorm:synthesis first"
    EXIT

IF NOT EXISTS(IMPL_PLAN):
    ERROR: "IMPL_PLAN.md not found. Run /workflow:plan first"
    EXIT

IF TASK_FILES.count == 0:
    ERROR: "No task JSON files found. Run /workflow:plan first"
    EXIT
```

### 2. Load Artifacts (Progressive Disclosure)

Load only minimal necessary context from each artifact:

**From workflow-session.json** (OPTIONAL - Primary Reference for User Intent):
- **ONLY IF EXISTS**: Load user intent context
- Original user prompt/intent (project or description field)
- User's stated goals and objectives
- User's scope definition
- **IF MISSING**: Set user_intent_analysis = "SKIPPED: workflow-session.json not found"

**From role analysis documents** (AUTHORITATIVE SOURCE):
- Functional Requirements (IDs, descriptions, acceptance criteria)
- Non-Functional Requirements (IDs, targets)
- Business Requirements (IDs, success metrics)
- Key Architecture Decisions
- Risk factors and mitigation strategies
- Implementation Roadmap (high-level phases)

**From IMPL_PLAN.md**:
- Summary and objectives
- Context Analysis
- Implementation Strategy
- Task Breakdown Summary
- Success Criteria
- Brainstorming Artifacts References (if present)

**From task.json files**:
- Task IDs
- Titles and descriptions
- Status
- Dependencies (depends_on, blocks)
- Context (requirements, focus_paths, acceptance, artifacts)
- Flow control (pre_analysis, implementation_approach)
- Meta (complexity, priority)

### 3. Build Semantic Models

Create internal representations (do not include raw artifacts in output):

**Requirements inventory**:
- Each functional/non-functional/business requirement with stable ID
- Requirement text, acceptance criteria, priority

**Architecture decisions inventory**:
- ADRs from synthesis
- Technology choices
- Data model references

**Task coverage mapping**:
- Map each task to one or more requirements (by ID reference or keyword inference)
- Map each requirement to covering tasks

**Dependency graph**:
- Task-to-task dependencies (depends_on, blocks)
- Requirement-level dependencies (from synthesis)

### 4. Detection Passes (Agent-Driven Multi-Dimensional Analysis)

**Execution Strategy**:
- Single `cli-explore-agent` invocation
- Agent executes multiple CLI analyses internally (different dimensions: A-H)
- Token Budget: 50 findings maximum (aggregate remainder in overflow summary)
- Priority Allocation: CRITICAL (unlimited) → HIGH (15) → MEDIUM (20) → LOW (15)
- Early Exit: If CRITICAL findings > 0 in User Intent/Requirements Coverage, skip LOW/MEDIUM checks

**Execution Order** (Agent orchestrates internally):

1. **Tier 1 (CRITICAL Path)**: A, B, C - User intent, coverage, consistency (full analysis)
2. **Tier 2 (HIGH Priority)**: D, E - Dependencies, synthesis alignment (limit 15 findings)
3. **Tier 3 (MEDIUM Priority)**: F - Specification quality (limit 20 findings)
4. **Tier 4 (LOW Priority)**: G, H - Duplication, feasibility (limit 15 findings)

---

#### Phase 4.1: Launch Unified Verification Agent

```javascript
Task(
  subagent_type="cli-explore-agent",
  run_in_background=false,
  description="Multi-dimensional plan verification",
  prompt=`
## Plan Verification Task

### MANDATORY FIRST STEPS
1. Read: ~/.claude/workflows/cli-templates/schemas/plan-verify-agent-schema.json (dimensions & rules)
2. Read: ~/.claude/workflows/cli-templates/schemas/verify-json-schema.json (output schema)
3. Read: ${session_file} (user intent)
4. Read: ${IMPL_PLAN} (implementation plan)
5. Glob: ${task_dir}/*.json (task files)
6. Glob: ${SYNTHESIS_DIR}/*/analysis.md (role analyses)

### Execution Flow

**Load schema → Execute tiered CLI analysis → Aggregate findings → Write JSON**

FOR each tier in [1, 2, 3, 4]:
  - Load tier config from plan-verify-agent-schema.json
  - Execute: ccw cli -p "PURPOSE: Verify dimensions {tier.dimensions}
    TASK: {tier.checks from schema}
    CONTEXT: @${session_dir}/**/*
    EXPECTED: Findings JSON with dimension, severity, location, summary, recommendation
    CONSTRAINTS: Limit {tier.limit} findings
    " --tool gemini --mode analysis --rule {tier.rule}
  - Parse findings, check early exit condition
  - IF tier == 1 AND critical_count > 0: skip tier 3-4

### Output
Write: ${process_dir}/verification-findings.json (follow verify-json-schema.json)
Return: Quality gate decision + 2-3 sentence summary
`
)
```

---

#### Phase 4.2: Load and Organize Findings

```javascript
// Load findings (single parse for all subsequent use)
const data = JSON.parse(Read(`${process_dir}/verification-findings.json`))
const { session_id, timestamp, verification_tiers_completed, findings, summary } = data
const { critical_count, high_count, medium_count, low_count, total_findings, coverage_percentage, recommendation } = summary

// Group by severity and dimension
const bySeverity = Object.groupBy(findings, f => f.severity)
const byDimension = Object.groupBy(findings, f => f.dimension)

// Dimension metadata (from schema)
const DIMS = {
  A: "User Intent Alignment", B: "Requirements Coverage", C: "Consistency Validation",
  D: "Dependency Integrity", E: "Synthesis Alignment", F: "Task Specification Quality",
  G: "Duplication Detection", H: "Feasibility Assessment"
}
```

### 5. Generate Report

```javascript
// Helper: render dimension section
const renderDimension = (dim) => {
  const items = byDimension[dim] || []
  return items.length > 0
    ? items.map(f => `### ${f.id}: ${f.summary}\n- **Severity**: ${f.severity}\n- **Location**: ${f.location.join(', ')}\n- **Recommendation**: ${f.recommendation}`).join('\n\n')
    : `> ✅ No ${DIMS[dim]} issues detected.`
}

// Helper: render severity section
const renderSeverity = (severity, impact) => {
  const items = bySeverity[severity] || []
  return items.length > 0
    ? items.map(f => `#### ${f.id}: ${f.summary}\n- **Dimension**: ${f.dimension_name}\n- **Location**: ${f.location.join(', ')}\n- **Impact**: ${impact}\n- **Recommendation**: ${f.recommendation}`).join('\n\n')
    : `> ✅ No ${severity.toLowerCase()}-severity issues detected.`
}

// Build Markdown report
const fullReport = `
# Plan Verification Report

**Session**: WFS-${session_id} | **Generated**: ${timestamp}
**Tiers Completed**: ${verification_tiers_completed.join(', ')}

---

## Executive Summary

| Metric | Value | Status |
|--------|-------|--------|
| Risk Level | ${critical_count > 0 ? 'CRITICAL' : high_count > 0 ? 'HIGH' : medium_count > 0 ? 'MEDIUM' : 'LOW'} | ${critical_count > 0 ? '🔴' : high_count > 0 ? '🟠' : medium_count > 0 ? '🟡' : '🟢'} |
| Critical/High/Medium/Low | ${critical_count}/${high_count}/${medium_count}/${low_count} | |
| Coverage | ${coverage_percentage}% | ${coverage_percentage >= 90 ? '🟢' : coverage_percentage >= 75 ? '🟡' : '🔴'} |

**Recommendation**: **${recommendation}**

---

## Findings Summary

| ID | Dimension | Severity | Location | Summary |
|----|-----------|----------|----------|---------|
${findings.map(f => `| ${f.id} | ${f.dimension_name} | ${f.severity} | ${f.location.join(', ')} | ${f.summary} |`).join('\n')}

---

## Analysis by Dimension

${['A','B','C','D','E','F','G','H'].map(d => `### ${d}. ${DIMS[d]}\n\n${renderDimension(d)}`).join('\n\n---\n\n')}

---

## Findings by Severity

### CRITICAL (${critical_count})
${renderSeverity('CRITICAL', 'Blocks execution')}

### HIGH (${high_count})
${renderSeverity('HIGH', 'Fix before execution recommended')}

### MEDIUM (${medium_count})
${renderSeverity('MEDIUM', 'Address during/after implementation')}

### LOW (${low_count})
${renderSeverity('LOW', 'Optional improvement')}

---

## Next Steps

${recommendation === 'BLOCK_EXECUTION' ? '🛑 **BLOCK**: Fix critical issues → Re-verify' :
  recommendation === 'PROCEED_WITH_FIXES' ? '⚠️ **FIX RECOMMENDED**: Address high issues → Re-verify or Execute' :
  '✅ **READY**: Proceed to /workflow:execute'}

Re-verify: \`/workflow:plan-verify --session ${session_id}\`
Execute: \`/workflow:execute --resume-session="${session_id}"\`
`

// Write report
Write(`${process_dir}/PLAN_VERIFICATION.md`, fullReport)
console.log(`✅ Report: ${process_dir}/PLAN_VERIFICATION.md\n📊 ${recommendation} | C:${critical_count} H:${high_count} M:${medium_count} L:${low_count} | Coverage:${coverage_percentage}%`)
```

### 6. Next Step Selection

```javascript
const autoYes = $ARGUMENTS.includes('--yes') || $ARGUMENTS.includes('-y')
const canExecute = recommendation !== 'BLOCK_EXECUTION'

// Auto mode
if (autoYes) {
  if (canExecute) {
    SlashCommand("/workflow:execute --yes --resume-session=\"${session_id}\"")
  } else {
    console.log(`[--yes] BLOCK_EXECUTION - Fix ${critical_count} critical issues first.`)
  }
  return
}

// Interactive mode - build options based on quality gate
const options = canExecute
  ? [
      { label: canExecute && recommendation === 'PROCEED_WITH_FIXES' ? "Execute Anyway" : "Execute (Recommended)",
        description: "Proceed to /workflow:execute" },
      { label: "Review Report", description: "Review findings before deciding" },
      { label: "Re-verify", description: "Re-run after manual fixes" }
    ]
  : [
      { label: "Review Report", description: "Review critical issues" },
      { label: "Re-verify", description: "Re-run after fixing issues" }
    ]

const selection = AskUserQuestion({
  questions: [{
    question: `Quality gate: ${recommendation}. Next step?`,
    header: "Action",
    multiSelect: false,
    options
  }]
})

// Handle selection
if (selection.includes("Execute")) {
  SlashCommand("/workflow:execute --resume-session=\"${session_id}\"")
} else if (selection === "Re-verify") {
  SlashCommand("/workflow:plan-verify --session ${session_id}")
}
```
