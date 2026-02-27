# Coordination Protocol - Multi-Agent Communication

Inter-agent communication protocols and patterns for parallel-dev-cycle skill.

## Overview

The coordination protocol enables four parallel agents (RA, EP, CD, VAS) to communicate efficiently while maintaining clear responsibilities and avoiding conflicts.

## Communication Channels

### 1. Shared State File (Primary)

**Location**: `.workflow/.cycle/{cycleId}.json`

**Access Pattern**:
- **Agents**: READ ONLY - check dependencies and status
- **Orchestrator**: READ-WRITE - updates state after each phase

```javascript
// Every agent: Read state to check dependencies
const state = JSON.parse(Read(`.workflow/.cycle/${cycleId}.json`))
const canProceed = checkDependencies(state)

// Agent outputs PHASE_RESULT (reports to orchestrator, NOT writes directly)
console.log("PHASE_RESULT: ...")

// Only Orchestrator writes to state file after receiving PHASE_RESULT
// Write(`.workflow/.cycle/${cycleId}.json`, JSON.stringify(updatedState, null, 2))
```

**Protocol**:
- Only orchestrator writes to state file (no concurrent writes, no lock needed)
- Agents read state to understand dependencies
- Timestamp all orchestrator updates with ISO8601 format
- Never delete existing data, only append

### 2. Progress Markdown Files (Async Log)

**Location**: `.workflow/.cycle/{cycleId}.progress/{agent}/`

Each agent writes progress to dedicated markdown files:

| Agent | Main Documents (Rewrite) | Logs (Append-Only) |
|-------|--------------------------|-------------------|
| RA | requirements.md | changes.log |
| EP | exploration.md, architecture.md, plan.json | changes.log |
| CD | implementation.md, issues.md | changes.log, debug-log.ndjson |
| VAS | validation.md, summary.md, test-results.json | changes.log |

**Protocol**:
- **Main documents**: Complete rewrite per iteration, archived to `history/`
- **Log files**: Append-only (changes.log, debug-log.ndjson) - never delete
- **Version synchronization**: All main documents share same version (e.g., all v1.1.0 in iteration 2)
- Include timestamp on each update

### 3. Orchestrator send_input (Synchronous)

**When**: Orchestrator needs to send feedback or corrections

```javascript
// Example: CD agent receives test failure feedback
send_input({
  id: agents.cd,
  message: `
## FEEDBACK FROM VALIDATION

Test failures detected: ${failures}

## REQUIRED ACTION

Fix the following:
${actionItems}

## NEXT STEP
Update implementation.md with fixes, then re-run tests.
Output PHASE_RESULT when complete.
`
})
```

**Protocol**:
- Only orchestrator initiates send_input
- Clear action items and expected output
- Single message per iteration (no rapid-fire sends)

### 4. Coordination Log

**Location**: `.workflow/.cycle/{cycleId}.progress/coordination/`

Centralized log for inter-agent decisions and communication:

**feedback.md**:
```markdown
# Feedback & Coordination Log - Version X.Y.Z

## Timeline
- [10:00:00] Orchestrator: Created cycle
- [10:05:00] RA: Requirements analysis started
- [10:10:00] RA: Requirements completed, v1.0.0
- [10:10:01] EP: Starting exploration (depends on RA output)
- [10:15:00] EP: Architecture designed, plan.json v1.0.0
- [10:15:01] CD: Starting implementation (depends on EP plan)
- [10:30:00] CD: Implementation progressing, found blocker
- [10:31:00] RA: Clarified requirement after CD blocker
- [10:31:01] CD: Continuing with clarification
- [10:40:00] CD: Implementation complete
- [10:40:01] VAS: Starting validation
- [10:45:00] VAS: Testing complete, found failures
- [10:45:01] Orchestrator: Sending feedback to CD
- [10:46:00] CD: Fixed issues
- [10:50:00] VAS: Re-validation, all passing
- [10:50:01] Orchestrator: Cycle complete

## Decision Records
- [10:31:00] RA Clarification: OAuth optional vs required?
  - Decision: Optional (can use password)
  - Rationale: More flexible for users
  - Impact: Affects FR-003 implementation

## Blockers & Resolutions
- [10:30:00] Blocker: Database migration for existing users
  - Reported by: CD
  - Resolution: Set oauth_id = null for existing users
  - Status: Resolved

## Cross-Agent Dependencies
- EP depends on: RA requirements (v1.0.0)
- CD depends on: EP plan (v1.0.0)
- VAS depends on: CD code changes
```

## Message Formats

### Agent Status Update

Each agent updates state with its status:

```json
{
  "agents": {
    "ra": {
      "status": "completed",
      "started_at": "2026-01-22T10:05:00+08:00",
      "completed_at": "2026-01-22T10:15:00+08:00",
      "output_files": [
        ".workflow/.cycle/cycle-xxx.progress/ra/requirements.md",
        ".workflow/.cycle/cycle-xxx.progress/ra/edge-cases.md",
        ".workflow/.cycle/cycle-xxx.progress/ra/changes.log"
      ],
      "iterations_completed": 1
    }
  }
}
```

### Feedback Message Format

When orchestrator sends feedback via send_input:

```text
## FEEDBACK FROM [Agent Name]

[Summary of findings or issues]

## REFERENCED OUTPUT
File: [path to agent output]
Version: [X.Y.Z]

## REQUIRED ACTION

1. [Action 1 with specific details]
2. [Action 2 with specific details]

## SUCCESS CRITERIA

- [ ] Item 1
- [ ] Item 2

## NEXT STEP
[What agent should do next]
Output PHASE_RESULT when complete.

## CONTEXT

Previous iteration: [N]
Current iteration: [N+1]
```

### Phase Result Format

Every agent outputs PHASE_RESULT:

```text
PHASE_RESULT:
- phase: [ra|ep|cd|vas]
- status: success | failed | partial
- files_written: [list of files]
- summary: [one-line summary]
- [agent-specific fields]
- issues: [list of issues if any]

PHASE_DETAILS:
[Additional details or metrics]
```

## Dependency Resolution

**Execution Model**: All four agents are spawned in parallel, but execution blocks based on dependencies. Orchestrator manages dependency resolution via shared state.

### Build Order (Default)

```
RA (Requirements) → EP (Planning) → CD (Development) → VAS (Validation)
       ↓                  ↓               ↓                 ↓
   Block EP         Block CD         Block VAS         Block completion
```

**Explanation**:
- All agents spawned simultaneously
- Each agent checks dependencies in shared state before proceeding
- Blocked agents wait for dependency completion
- Orchestrator uses `send_input` to notify dependent agents when ready

### Parallel Opportunities

Some phases can run in parallel:

```
RA + FrontendCode (independent)
EP + RA (not blocking)
CD.Task1 + CD.Task2 (if no dependencies)
```

### Dependency Tracking

State file tracks dependencies:

```json
{
  "agents": {
    "ep": {
      "depends_on": ["ra"],
      "ready": true,  // RA completed
      "can_start": true
    },
    "cd": {
      "depends_on": ["ep"],
      "ready": true,  // EP completed
      "can_start": true
    },
    "vas": {
      "depends_on": ["cd"],
      "ready": false,  // CD not yet complete
      "can_start": false
    }
  }
}
```

## Iteration Flow with Communication

### Iteration 1: Initial Execution

```
Time   Agent    Action                State Update
──────────────────────────────────────────────────────
10:00  Init     Create cycle          status: running
10:05  RA       Start analysis        agents.ra.status: running
10:10  RA       Complete (v1.0.0)     agents.ra.status: completed
10:10  EP       Start planning        agents.ep.status: running
       (depends on RA completion)
10:15  EP       Complete (v1.0.0)     agents.ep.status: completed
10:15  CD       Start development     agents.cd.status: running
       (depends on EP completion)
10:30  CD       Found blocker         coordination.blockers.add()
10:31  RA       Clarify blocker       requirements.v1.1.0 created
10:35  CD       Continue (with fix)   agents.cd.status: running
10:40  CD       Complete              agents.cd.status: completed
10:40  VAS      Start validation      agents.vas.status: running
       (depends on CD completion)
10:45  VAS      Tests failing         coordination.feedback_log.add()
10:45  Orch     Send feedback         agents.cd.message: "Fix these tests"
10:46  CD       Resume (send_input)   agents.cd.status: running
10:48  CD       Fix complete          agents.cd.status: completed
10:50  VAS      Re-validate           agents.vas.status: running
10:55  VAS      All pass              agents.vas.status: completed
11:00  Orch     Complete cycle        status: completed
```

## Conflict Resolution

### Conflict Type 1: Unclear Requirement

**Scenario**: CD needs clarification on FR-X

**Resolution Flow**:
1. CD reports blocker in issues.md
2. Orchestrator extracts blocker
3. Orchestrator sends message to RA
4. RA updates requirements with clarification
5. RA outputs new requirements.md (v1.1.0)
6. Orchestrator sends message to CD with clarification
7. CD resumes and continues

### Conflict Type 2: Test Failure

**Scenario**: VAS finds test failures

**Resolution Flow**:
1. VAS reports failures in validation.md
2. VAS outputs test-results.json with details
3. Orchestrator extracts failure details
4. Orchestrator categorizes failures
5. If blocker: Orchestrator sends to CD/RA for fixes
6. CD/RA fix and report completion
7. Orchestrator sends CD/VAS to retry
8. VAS re-validates

### Conflict Type 3: Plan Mismatch

**Scenario**: CD realizes plan tasks are incomplete

**Resolution Flow**:
1. CD reports in issues.md
2. Orchestrator extracts issue
3. Orchestrator sends to EP to revise plan
4. EP updates plan.json (v1.1.0)
5. EP adds new tasks or dependencies
6. Orchestrator sends to CD with updated plan
7. CD implements remaining tasks

## Escalation Path

For issues that block resolution:

```
Agent Issue
    ↓
Agent reports blocker
    ↓
Orchestrator analyzes
    ↓
Can fix automatically?
    ├─ Yes: send_input to agent with fix
    └─ No: Escalate to user
         ↓
         User provides guidance
         ↓
         Orchestrator applies guidance
         ↓
         Resume agents
```

## Communication Best Practices

1. **Clear Timestamps**: All events timestamped ISO8601 format
2. **Structured Messages**: Use consistent format for feedback
3. **Version Tracking**: Always include version numbers
4. **Audit Trail**: Maintain complete log of decisions
5. **No Direct Agent Communication**: All communication via orchestrator
6. **Document Decisions**: Record why decisions were made
7. **Append-Only Logs**: Never delete history

## State Consistency Rules

1. **Single Writer Per Field**: Only one agent updates each field
   - RA writes: requirements, edge_cases
   - EP writes: exploration, plan
   - CD writes: changes, implementation
   - VAS writes: test_results, summary

2. **Read-Write Serialization**: Orchestrator ensures no conflicts

3. **Version Synchronization**: All versions increment together
   - v1.0.0 → v1.1.0 (all docs updated)

4. **Timestamp Consistency**: All timestamps in state file UTC+8

## Monitoring & Debugging

### State Inspection

```javascript
// Check agent status
const state = JSON.parse(Read(`.workflow/.cycle/${cycleId}.json`))
console.log(state.agents)  // See status of all agents

// Check for blockers
console.log(state.coordination.blockers)

// Check feedback history
console.log(state.coordination.feedback_log)
```

### Log Analysis

```bash
# Check RA progress
tail .workflow/.cycle/cycle-xxx.progress/ra/changes.log

# Check CD changes
grep "TASK-001" .workflow/.cycle/cycle-xxx.progress/cd/changes.log

# Check coordination timeline
tail -50 .workflow/.cycle/cycle-xxx.progress/coordination/feedback.md
```
