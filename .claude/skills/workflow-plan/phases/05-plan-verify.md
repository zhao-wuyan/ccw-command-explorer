# Phase 5: Plan Verification

Perform READ-ONLY verification analysis between IMPL_PLAN.md, task JSONs, and brainstorming artifacts. Generates structured report with quality gate recommendation. Does NOT modify any source files.

## Objective

- Generate comprehensive verification report identifying inconsistencies, duplications, ambiguities
- Produce quality gate recommendation (BLOCK_EXECUTION / PROCEED_WITH_FIXES / PROCEED_WITH_CAUTION / PROCEED)
- Route to next action based on quality gate result

## Entry Points

- **From Plan Mode**: After Phase 4 completes, user selects "Verify Plan Quality"
- **From Verify Mode**: Directly triggered via `workflow-plan` skill (plan-verify phase)

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Operating Constraints

**STRICTLY READ-ONLY FOR SOURCE ARTIFACTS**:
- **MUST NOT** modify `IMPL_PLAN.md`, any `task.json` files, or brainstorming artifacts
- **MUST NOT** create or delete task files
- **MUST ONLY** write the verification report to `.process/PLAN_VERIFICATION.md`

**Synthesis Authority**: The `role analysis documents` are **authoritative** for requirements and design decisions. Any conflicts between IMPL_PLAN/tasks and synthesis are automatically CRITICAL and require adjustment of the plan/tasks—not reinterpretation of requirements.

**Quality Gate Authority**: The verification report provides a binding recommendation based on objective severity criteria. User MUST review critical/high issues before proceeding with implementation.

## Execution

### Step 5.1: Initialize Analysis Context

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
PLANNING_NOTES = session_dir/planning-notes.md  # N+1 context and constraints

# Abort if missing - in order of dependency
SESSION_FILE_EXISTS = EXISTS(session_file)
IF NOT SESSION_FILE_EXISTS:
    WARNING: "workflow-session.json not found. User intent alignment verification will be skipped."
    # Continue execution - this is optional context, not blocking

PLANNING_NOTES_EXISTS = EXISTS(PLANNING_NOTES)
IF NOT PLANNING_NOTES_EXISTS:
    WARNING: "planning-notes.md not found. Constraints/N+1 context verification will be skipped."
    # Continue execution - optional context

SYNTHESIS_FILES = Glob(brainstorm_dir/*/analysis.md)
IF SYNTHESIS_FILES.count == 0:
    WARNING: "No role analysis documents found in .brainstorming/*/analysis.md. Synthesis-based dimensions (E, G) will use reduced coverage."
    SYNTHESIS_AVAILABLE = false
    # Continue execution - brainstorm artifacts are optional for direct planning workflows
ELSE:
    SYNTHESIS_AVAILABLE = true

IF NOT EXISTS(IMPL_PLAN):
    ERROR: "IMPL_PLAN.md not found. Run /workflow:plan first"
    EXIT

IF TASK_FILES.count == 0:
    ERROR: "No task JSON files found. Run /workflow:plan first"
    EXIT
```

### Step 5.2: Load Artifacts (Progressive Disclosure)

Load only minimal necessary context from each artifact:

**From workflow-session.json** (OPTIONAL - Primary Reference for User Intent):
- **ONLY IF EXISTS**: Load user intent context
- Original user prompt/intent (project or description field)
- User's stated goals and objectives
- User's scope definition
- **IF MISSING**: Set user_intent_analysis = "SKIPPED: workflow-session.json not found"

**From planning-notes.md** (OPTIONAL - Constraints & N+1 Context):
- **ONLY IF EXISTS**: Load planning context
- Consolidated Constraints (numbered list from Phase 1-3)
- N+1 Context: Decisions table (Decision | Rationale | Revisit?)
- N+1 Context: Deferred items list
- **IF MISSING**: Set planning_notes_analysis = "SKIPPED: planning-notes.md not found"

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

### Step 5.3: Build Semantic Models

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

### Step 5.4: Detection Passes (Agent-Driven Multi-Dimensional Analysis)

**Execution Strategy**:
- Single `cli-explore-agent` invocation
- Agent executes multiple CLI analyses internally (different dimensions: A-J)
- Token Budget: 50 findings maximum (aggregate remainder in overflow summary)
- Priority Allocation: CRITICAL (unlimited) → HIGH (15) → MEDIUM (20) → LOW (15)
- Early Exit: If CRITICAL findings > 0 in User Intent/Requirements Coverage, skip LOW/MEDIUM checks

**Execution Order** (Agent orchestrates internally):

1. **Tier 1 (CRITICAL Path)**: A, B, C, I - User intent, coverage, consistency, constraints compliance (full analysis)
2. **Tier 2 (HIGH Priority)**: D, E, J - Dependencies, synthesis alignment, N+1 context validation (limit 15 findings)
3. **Tier 3 (MEDIUM Priority)**: F - Specification quality (limit 20 findings)
4. **Tier 4 (LOW Priority)**: G, H - Duplication, feasibility (limit 15 findings)

---

#### Step 5.4.1: Launch Unified Verification Agent

```javascript
Task(
  subagent_type="cli-explore-agent",
  run_in_background=false,
  description="Multi-dimensional plan verification",
  prompt=`
## Plan Verification Task

### MANDATORY FIRST STEPS
1. Read: ~/.ccw/workflows/cli-templates/schemas/plan-verify-agent-schema.json (dimensions & rules)
2. Read: ~/.ccw/workflows/cli-templates/schemas/verify-json-schema.json (output schema)
3. Read: ${session_file} (user intent)
4. Read: ${PLANNING_NOTES} (constraints & N+1 context)
5. Read: ${IMPL_PLAN} (implementation plan)
6. Glob: ${task_dir}/*.json (task files)
7. Glob: ${SYNTHESIS_DIR}/*/analysis.md (role analyses)

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

#### Step 5.4.2: Load and Organize Findings

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
  G: "Duplication Detection", H: "Feasibility Assessment",
  I: "Constraints Compliance", J: "N+1 Context Validation"
}
```

### Step 5.5: Generate Report

```javascript
// Helper: render dimension section
const renderDimension = (dim) => {
  const items = byDimension[dim] || []
  return items.length > 0
    ? items.map(f => `### ${f.id}: ${f.summary}\n- **Severity**: ${f.severity}\n- **Location**: ${f.location.join(', ')}\n- **Recommendation**: ${f.recommendation}`).join('\n\n')
    : `> No ${DIMS[dim]} issues detected.`
}

// Helper: render severity section
const renderSeverity = (severity, impact) => {
  const items = bySeverity[severity] || []
  return items.length > 0
    ? items.map(f => `#### ${f.id}: ${f.summary}\n- **Dimension**: ${f.dimension_name}\n- **Location**: ${f.location.join(', ')}\n- **Impact**: ${impact}\n- **Recommendation**: ${f.recommendation}`).join('\n\n')
    : `> No ${severity.toLowerCase()}-severity issues detected.`
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
| Risk Level | ${critical_count > 0 ? 'CRITICAL' : high_count > 0 ? 'HIGH' : medium_count > 0 ? 'MEDIUM' : 'LOW'} | ${critical_count > 0 ? 'RED' : high_count > 0 ? 'ORANGE' : medium_count > 0 ? 'YELLOW' : 'GREEN'} |
| Critical/High/Medium/Low | ${critical_count}/${high_count}/${medium_count}/${low_count} | |
| Coverage | ${coverage_percentage}% | ${coverage_percentage >= 90 ? 'GREEN' : coverage_percentage >= 75 ? 'YELLOW' : 'RED'} |

**Recommendation**: **${recommendation}**

---

## Findings Summary

| ID | Dimension | Severity | Location | Summary |
|----|-----------|----------|----------|---------|
${findings.map(f => `| ${f.id} | ${f.dimension_name} | ${f.severity} | ${f.location.join(', ')} | ${f.summary} |`).join('\n')}

---

## Analysis by Dimension

${['A','B','C','D','E','F','G','H','I','J'].map(d => `### ${d}. ${DIMS[d]}\n\n${renderDimension(d)}`).join('\n\n---\n\n')}

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

${recommendation === 'BLOCK_EXECUTION' ? 'BLOCK: Fix critical issues then re-verify' :
  recommendation === 'PROCEED_WITH_FIXES' ? 'FIX RECOMMENDED: Address high issues then re-verify or execute' :
  'READY: Proceed to Skill(skill="workflow-execute")'}

Re-verify: \`/workflow:plan-verify --session ${session_id}\`
Execute: \`Skill(skill="workflow-execute", args="--resume-session=${session_id}")\`
`

// Write report
Write(`${process_dir}/PLAN_VERIFICATION.md`, fullReport)
console.log(`Report: ${process_dir}/PLAN_VERIFICATION.md\n${recommendation} | C:${critical_count} H:${high_count} M:${medium_count} L:${low_count} | Coverage:${coverage_percentage}%`)
```

### Step 5.6: Next Step Selection

```javascript
// Reference workflowPreferences (set by SKILL.md via AskUserQuestion)
const autoYes = workflowPreferences.autoYes
const canExecute = recommendation !== 'BLOCK_EXECUTION'

// Auto mode
if (autoYes) {
  if (canExecute) {
    Skill(skill="workflow-execute", args="--resume-session=\"${session_id}\"")
  } else {
    console.log(`[Auto] BLOCK_EXECUTION - Fix ${critical_count} critical issues first.`)
  }
  return
}

// Interactive mode - build options based on quality gate
const options = canExecute
  ? [
      { label: canExecute && recommendation === 'PROCEED_WITH_FIXES' ? "Execute Anyway" : "Execute (Recommended)",
        description: "Proceed to Skill(skill=\"workflow-execute\")" },
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
  Skill(skill="workflow-execute", args="--resume-session=\"${session_id}\"")
} else if (selection === "Re-verify") {
  // Direct phase re-execution: re-read and execute this phase
  Read("phases/05-plan-verify.md")
  // Re-execute with current session context
}
```

## Output

- **File**: `PLAN_VERIFICATION.md` (verification report with quality gate)
- **File**: `verification-findings.json` (structured findings data)

## Completion

Phase 5 is a terminal phase. Based on quality gate result, user routes to:
- Execute → Skill(skill="workflow-execute")
- Re-verify → Re-run Phase 5
- Review → Manual inspection
