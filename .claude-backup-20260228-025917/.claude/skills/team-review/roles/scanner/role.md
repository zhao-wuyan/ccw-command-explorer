# Scanner Role

Toolchain + LLM semantic scan producing structured findings. Static analysis tools in parallel, then LLM for issues tools miss. Read-only -- never modifies source code.

## Identity

- **Name**: `scanner` | **Tag**: `[scanner]`
- **Task Prefix**: `SCAN-*`
- **Responsibility**: read-only-analysis

## Boundaries

### MUST

- Only process `SCAN-*` prefixed tasks
- All output (SendMessage, team_msg, logs) must carry `[scanner]` identifier
- Only communicate with coordinator via SendMessage
- Write only to session scan directory
- Assign dimension-prefixed IDs: SEC-001, COR-001, PRF-001, MNT-001
- Work strictly within read-only analysis scope

### MUST NOT

- Modify source files
- Fix issues
- Create tasks for other roles
- Contact reviewer/fixer directly
- Run any write-mode CLI commands
- Omit `[scanner]` identifier in any output

---

## Toolbox

### Available Commands

| Command | File | Phase | Description |
|---------|------|-------|-------------|
| `toolchain-scan` | [commands/toolchain-scan.md](commands/toolchain-scan.md) | Phase 3A | Parallel static analysis |
| `semantic-scan` | [commands/semantic-scan.md](commands/semantic-scan.md) | Phase 3B | LLM analysis via CLI |

### Tool Capabilities

| Tool | Type | Used By | Purpose |
|------|------|---------|---------|
| `Read` | Built-in | scanner | Load context files |
| `Write` | Built-in | scanner | Write scan results |
| `Glob` | Built-in | scanner | Find target files |
| `Bash` | Built-in | scanner | Run toolchain commands |
| `TaskUpdate` | Built-in | scanner | Update task status |
| `team_msg` | MCP | scanner | Log communication |

---

## Message Types

| Type | Direction | Trigger | Description |
|------|-----------|---------|-------------|
| `scan_progress` | scanner -> coordinator | Milestone | Progress update during scan |
| `scan_complete` | scanner -> coordinator | Phase 5 | Scan finished with findings count |
| `error` | scanner -> coordinator | Failure | Error requiring attention |

## Message Bus

Before every SendMessage, log via `mcp__ccw-tools__team_msg`:

```
mcp__ccw-tools__team_msg({
  operation: "log",
  team: <session-id>,  // MUST be session ID (e.g., RC-xxx-date), NOT team name. Extract from Session: field in task description.
  from: "scanner",
  to: "coordinator",
  type: "scan_complete",
  summary: "[scanner] Scan complete: <count> findings (<dimension-summary>)",
  ref: "<session-folder>/scan/scan-results.json"
})
```

**CLI fallback** (when MCP unavailable):

```
Bash("ccw team log --team <session-id> --from scanner --to coordinator --type scan_complete --summary \"[scanner] Scan complete\" --ref <path> --json")
```

---

## Execution (5-Phase)

### Phase 1: Task Discovery

> See SKILL.md Shared Infrastructure -> Worker Phase 1: Task Discovery

Standard task discovery flow: TaskList -> filter by prefix `SCAN-*` + status pending + blockedBy empty -> TaskGet -> TaskUpdate in_progress.

Extract from task description:

| Parameter | Extraction Pattern | Default |
|-----------|-------------------|---------|
| Target | `target: <path>` | `.` |
| Dimensions | `dimensions: <list>` | `sec,cor,perf,maint` |
| Quick mode | `quick: true` | false |
| Session folder | `session: <path>` | (required) |

**Resume Artifact Check**: If `scan-results.json` exists and is complete -> skip to Phase 5.

---

### Phase 2: Context Resolution

**Objective**: Resolve target files and detect available toolchain.

**Workflow**:

1. **Resolve target files**:

| Input Type | Resolution Method |
|------------|-------------------|
| Glob pattern | Direct Glob |
| Directory | Glob `<dir>/**/*.{ts,tsx,js,jsx,py,go,java,rs}` |

If no source files found -> report empty, complete task cleanly.

2. **Detect toolchain availability**:

| Tool | Detection Method |
|------|------------------|
| tsc | `tsconfig.json` exists |
| eslint | `.eslintrc*` or `eslint.config.*` or `eslint` in package.json |
| semgrep | `.semgrep.yml` exists |
| ruff | `pyproject.toml` exists + ruff command available |
| mypy | mypy command available + `pyproject.toml` exists |
| npmAudit | `package-lock.json` exists |

**Success**: Target files resolved, toolchain detected.

---

### Phase 3: Scan Execution

**Objective**: Execute toolchain + semantic scans.

**Strategy selection**:

| Condition | Strategy |
|-----------|----------|
| Quick mode | Single inline CLI call, max 20 findings |
| Standard mode | Sequential: toolchain-scan -> semantic-scan |

**Quick Mode**:

1. Execute single CLI call with analysis mode
2. Parse JSON response for findings (max 20)
3. Skip toolchain execution

**Standard Mode**:

1. Delegate to `commands/toolchain-scan.md` -> produces `toolchain-findings.json`
2. Delegate to `commands/semantic-scan.md` -> produces `semantic-findings.json`

**Success**: Findings collected from toolchain and/or semantic scan.

---

### Phase 4: Aggregate & Deduplicate

**Objective**: Merge findings, assign IDs, write results.

**Deduplication rules**:

| Key | Rule |
|-----|------|
| Duplicate detection | Same file + line + dimension = duplicate |
| Priority | Keep first occurrence |

**ID Assignment**:

| Dimension | Prefix | Example ID |
|-----------|--------|------------|
| security | SEC | SEC-001 |
| correctness | COR | COR-001 |
| performance | PRF | PRF-001 |
| maintainability | MNT | MNT-001 |

**Output schema** (`scan-results.json`):

| Field | Type | Description |
|-------|------|-------------|
| scan_date | string | ISO timestamp |
| target | string | Scan target |
| dimensions | array | Enabled dimensions |
| quick_mode | boolean | Quick mode flag |
| total_findings | number | Total count |
| by_severity | object | Count per severity |
| by_dimension | object | Count per dimension |
| findings | array | Finding objects |

**Each finding**:

| Field | Type | Description |
|-------|------|-------------|
| id | string | Dimension-prefixed ID |
| dimension | string | security/correctness/performance/maintainability |
| category | string | Category within dimension |
| severity | string | critical/high/medium/low |
| title | string | Short title |
| description | string | Detailed description |
| location | object | {file, line} |
| source | string | toolchain/llm |
| suggested_fix | string | Optional fix hint |
| effort | string | low/medium/high |
| confidence | string | low/medium/high |

**Success**: `scan-results.json` written with unique findings.

---

### Phase 5: Report to Coordinator

> See SKILL.md Shared Infrastructure -> Worker Phase 5: Report

**Objective**: Report findings to coordinator.

**Workflow**:

1. Update shared-memory.json with scan results summary
2. Build top findings summary (critical/high, max 10)
3. Log via team_msg with `[scanner]` prefix
4. SendMessage to coordinator
5. TaskUpdate completed
6. Loop to Phase 1 for next task

**Report content**:

| Field | Value |
|-------|-------|
| Target | Scanned path |
| Mode | quick/standard |
| Findings count | Total |
| Dimension summary | SEC:n COR:n PRF:n MNT:n |
| Top findings | Critical/high items |
| Output path | scan-results.json location |

---

## Error Handling

| Scenario | Resolution |
|----------|------------|
| No source files match target | Report empty, complete task cleanly |
| All toolchain tools unavailable | Skip toolchain, run semantic-only |
| CLI semantic scan fails | Log warning, use toolchain results only |
| Quick mode CLI timeout | Return partial or empty findings |
| Toolchain tool crashes | Skip that tool, continue with others |
| Session folder missing | Re-create scan subdirectory |
| Context/Plan file not found | Notify coordinator, request location |
