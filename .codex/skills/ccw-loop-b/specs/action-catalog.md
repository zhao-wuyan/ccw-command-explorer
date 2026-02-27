# Action Catalog (CCW Loop-B)

Complete reference of worker actions and their capabilities.

## Action Matrix

| Action | Worker Agent | Purpose | Input Requirements | Output |
|--------|--------------|---------|-------------------|--------|
| init | ccw-loop-b-init.md | Session initialization | Task description | Task breakdown + execution plan |
| develop | ccw-loop-b-develop.md | Code implementation | Task list | Code changes + progress update |
| debug | ccw-loop-b-debug.md | Problem diagnosis | Issue description | Root cause analysis + fix suggestions |
| validate | ccw-loop-b-validate.md | Testing and verification | Files to test | Test results + coverage report |
| complete | ccw-loop-b-complete.md | Session finalization | All worker outputs | Summary + commit message |

## Detailed Action Specifications

### INIT

**Purpose**: Parse requirements, create execution plan

**Preconditions**:
- `status === 'running'`
- `skill_state === null` (first time)

**Input**:
```
- Task description (text)
- Project context files
```

**Execution**:
1. Read `.workflow/project-tech.json`
2. Read `.workflow/project-guidelines.json`
3. Parse task into phases
4. Create task breakdown
5. Generate execution plan

**Output**:
```
WORKER_RESULT:
- action: init
- status: success
- summary: "Initialized with 5 tasks"
- next_suggestion: develop

TASK_BREAKDOWN:
- T1: Create auth module
- T2: Implement JWT utils
- T3: Write tests
- T4: Validate implementation
- T5: Documentation

EXECUTION_PLAN:
1. Develop (T1-T2)
2. Validate (T3-T4)
3. Complete (T5)
```

**Effects**:
- `skill_state.pending_tasks` populated
- Progress structure created
- Ready for develop phase

---

### DEVELOP

**Purpose**: Implement code, create/modify files

**Preconditions**:
- `skill_state.pending_tasks.length > 0`
- `status === 'running'`

**Input**:
```
- Task list from state
- Project conventions
- Existing code patterns
```

**Execution**:
1. Load pending tasks
2. Find existing patterns
3. Implement tasks one by one
4. Update progress file
5. Mark tasks completed

**Output**:
```
WORKER_RESULT:
- action: develop
- status: success
- summary: "Implemented 3 tasks"
- files_changed: ["src/auth.ts", "src/utils.ts"]
- next_suggestion: validate

DETAILED_OUTPUT:
  tasks_completed: [T1, T2]
  metrics:
    lines_added: 180
    lines_removed: 15
```

**Effects**:
- Files created/modified
- `skill_state.completed_tasks` updated
- Progress documented

**Failure Modes**:
- Pattern unclear → suggest debug
- Task blocked → mark blocked, continue
- Partial completion → set `loop_back_to: "develop"`

---

### DEBUG

**Purpose**: Diagnose issues, root cause analysis

**Preconditions**:
- Issue exists (test failure, bug report, etc.)
- `status === 'running'`

**Input**:
```
- Issue description
- Error messages
- Stack traces
- Reproduction steps
```

**Execution**:
1. Understand problem symptoms
2. Gather evidence from code
3. Form hypothesis
4. Test hypothesis
5. Document root cause
6. Suggest fixes

**Output**:
```
WORKER_RESULT:
- action: debug
- status: success
- summary: "Root cause: memory leak in event listeners"
- next_suggestion: develop (apply fixes)

ROOT_CAUSE_ANALYSIS:
  hypothesis: "Listener accumulation"
  confidence: high
  evidence: [...]
  mechanism: "Detailed explanation"

FIX_RECOMMENDATIONS:
  1. Add removeAllListeners() on disconnect
  2. Verification: Monitor memory usage
```

**Effects**:
- `skill_state.findings` updated
- Fix recommendations documented
- Ready for develop to apply fixes

**Failure Modes**:
- Insufficient info → request more data
- Multiple hypotheses → rank by likelihood
- Inconclusive → suggest investigation areas

---

### VALIDATE

**Purpose**: Run tests, check coverage, quality gates

**Preconditions**:
- Code exists to validate
- `status === 'running'`

**Input**:
```
- Files to test
- Test configuration
- Coverage requirements
```

**Execution**:
1. Identify test framework
2. Run unit tests
3. Run integration tests
4. Measure coverage
5. Check quality (lint, types, security)
6. Generate report

**Output**:
```
WORKER_RESULT:
- action: validate
- status: success
- summary: "113 tests pass, coverage 95%"
- next_suggestion: complete (all pass) | develop (fix failures)

TEST_RESULTS:
  unit_tests: { passed: 98, failed: 0 }
  integration_tests: { passed: 15, failed: 0 }
  coverage: "95%"

QUALITY_CHECKS:
  lint: ✓ Pass
  types: ✓ Pass
  security: ✓ Pass
```

**Effects**:
- Test results documented
- Coverage measured
- Quality gates verified

**Failure Modes**:
- Tests fail → document failures, suggest fixes
- Coverage low → identify gaps
- Quality issues → flag problems

---

### COMPLETE

**Purpose**: Finalize session, generate summary, commit

**Preconditions**:
- All tasks completed
- Tests passing
- `status === 'running'`

**Input**:
```
- All worker outputs
- Progress files
- Current state
```

**Execution**:
1. Read all worker outputs
2. Consolidate achievements
3. Verify completeness
4. Generate summary
5. Prepare commit message
6. Cleanup and archive

**Output**:
```
WORKER_RESULT:
- action: complete
- status: success
- summary: "Session completed successfully"
- next_suggestion: null

SESSION_SUMMARY:
  achievements: [...]
  files_changed: [...]
  test_results: { ... }
  quality_checks: { ... }

COMMIT_SUGGESTION:
  message: "feat: ..."
  files: [...]
  ready_for_pr: true
```

**Effects**:
- `status` → 'completed'
- Summary file created
- Progress archived
- Commit message ready

**Failure Modes**:
- Pending tasks remain → mark partial
- Quality gates fail → list failures

---

## Action Flow Diagrams

### Interactive Mode Flow

```
+------+
| INIT |
+------+
    |
    v
+------+  user selects
| MENU |-------------+
+------+             |
    ^                v
    |         +--------------+
    |         | spawn worker |
    |         +--------------+
    |                |
    |                v
    |         +------+-------+
    +---------|  wait result |
              +------+-------+
                     |
                     v
              +------+-------+
              | update state |
              +--------------+
                     |
                     v
              [completed?] --no--> [back to MENU]
                     |
                    yes
                     v
              +----------+
              | COMPLETE |
              +----------+
```

### Auto Mode Flow

```
+------+      +---------+      +-------+      +----------+      +----------+
| INIT | ---> | DEVELOP | ---> | DEBUG | ---> | VALIDATE | ---> | COMPLETE |
+------+      +---------+      +-------+      +----------+      +----------+
                  ^                |               |
                  |                +--- [issues]   |
                  +--------------------------------+
                              [tests fail]
```

### Parallel Mode Flow

```
+------+
| INIT |
+------+
    |
    v
+---------------------+
| spawn all workers   |
| [develop, debug,    |
|  validate]          |
+---------------------+
    |
    v
+---------------------+
| wait({ ids: all })  |
+---------------------+
    |
    v
+---------------------+
| merge results       |
+---------------------+
    |
    v
+---------------------+
| coordinator decides |
+---------------------+
    |
    v
+----------+
| COMPLETE |
+----------+
```

## Worker Coordination

| Scenario | Worker Sequence | Mode |
|----------|-----------------|------|
| Simple task | init → develop → validate → complete | Auto |
| Complex task | init → develop → debug → develop → validate → complete | Auto |
| Bug fix | init → debug → develop → validate → complete | Auto |
| Analysis | init → [develop \|\| debug \|\| validate] → complete | Parallel |
| Interactive | init → menu → user selects → worker → menu → ... | Interactive |

## Best Practices

1. **Init always first**: Parse requirements before execution
2. **Validate often**: After each develop phase
3. **Debug when needed**: Don't skip diagnosis
4. **Complete always last**: Ensure proper cleanup
5. **Use parallel wisely**: For independent analysis tasks
6. **Follow sequence**: In auto mode, respect dependencies
