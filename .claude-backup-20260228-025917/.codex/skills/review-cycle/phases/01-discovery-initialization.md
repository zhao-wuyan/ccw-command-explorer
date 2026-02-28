# Phase 1: Discovery & Initialization

> Source: Fused from `commands/workflow/review-session-cycle.md` Phase 1 + `commands/workflow/review-module-cycle.md` Phase 1

## Overview

Detect review mode (session or module), resolve target files, create workflow session, initialize output directory structure and state files.

## Mode Detection

The review mode is determined by the input arguments:

- **Session mode**: No path pattern provided, OR a `WFS-*` session ID is provided. Reviews all changes within an existing workflow session (git-based change detection).
- **Module mode**: Glob/path patterns are provided (e.g., `src/auth/**`, `src/payment/processor.ts`). Reviews specific files/directories regardless of session history.

---

## Session Mode (review-session-cycle)

### Step 1.1: Session Discovery

```javascript
// If session ID not provided, auto-detect
if (!providedSessionId) {
  // Check for active sessions
  const activeSessions = Glob('${projectRoot}/.workflow/active/WFS-*');
  if (activeSessions.length === 1) {
    sessionId = activeSessions[0].match(/WFS-[^/]+/)[0];
  } else if (activeSessions.length > 1) {
    // List sessions and prompt user
    error("Multiple active sessions found. Please specify session ID.");
  } else {
    error("No active session found. Create session first.");
  }
} else {
  sessionId = providedSessionId;
}

// Validate session exists
Bash(`test -d ${projectRoot}/.workflow/active/${sessionId} && echo "EXISTS"`);
```

### Step 1.2: Session Validation

- Ensure session has implementation artifacts (check `.summaries/` or `.task/` directory)
- Extract session creation timestamp from `workflow-session.json`
- Use timestamp for git log filtering: `git log --since="${sessionCreatedAt}"`

### Step 1.3: Changed Files Detection

```bash
# Get files changed since session creation
git log --since="${sessionCreatedAt}" --name-only --pretty=format: | sort -u
```

---

## Module Mode (review-module-cycle)

### Step 1.1: Session Creation

```javascript
// Create workflow session for this review (type: review)
// Orchestrator handles session creation directly
Bash(`mkdir -p ${projectRoot}/.workflow/active/WFS-review-${Date.now()}`);

// Initialize workflow-session.json
const sessionId = `WFS-review-${Date.now()}`;
Write(`${projectRoot}/.workflow/active/${sessionId}/workflow-session.json`, JSON.stringify({
  session_id: sessionId,
  type: "review",
  description: `Code review for ${targetPattern}`,
  created_at: new Date().toISOString()
}, null, 2));
```

### Step 1.2: Path Resolution & Validation

```bash
# Expand glob pattern to file list (relative paths from project root)
find . -path "./src/auth/**" -type f | sed 's|^\./||'

# Validate files exist and are readable
for file in ${resolvedFiles[@]}; do
  test -r "$file" || error "File not readable: $file"
done
```

- Parse and expand file patterns (glob support): `src/auth/**` -> actual file list
- Validation: Ensure all specified files exist and are readable
- Store as **relative paths** from project root (e.g., `src/auth/service.ts`)
- Agents construct absolute paths dynamically during execution

**Syntax Rules**:
- All paths are **relative** from project root (e.g., `src/auth/**` not `/src/auth/**`)
- Multiple patterns: comma-separated, **no spaces** (e.g., `src/auth/**,src/payment/**`)
- Glob and specific files can be mixed (e.g., `src/auth/**,src/config.ts`)

**Supported Patterns**:
| Pattern Type | Example | Description |
|--------------|---------|-------------|
| Glob directory | `src/auth/**` | All files under src/auth/ |
| Glob with extension | `src/**/*.ts` | All .ts files under src/ |
| Specific file | `src/payment/processor.ts` | Single file |
| Multiple patterns | `src/auth/**,src/payment/**` | Comma-separated (no spaces) |

**Resolution Process**:
1. Parse input pattern (split by comma, trim whitespace)
2. Expand glob patterns to file list via `find` command
3. Validate all files exist and are readable
4. Error if pattern matches 0 files
5. Store resolved file list in review-state.json

---

## Common Steps (Both Modes)

### Step 1.4: Output Directory Setup

- Output directory: `${projectRoot}/.workflow/active/${sessionId}/.review/`
- Create directory structure:
  ```bash
  mkdir -p ${sessionDir}/.review/{dimensions,iterations,reports}
  ```

### Step 1.5: Initialize Review State

- State initialization: Create `review-state.json` with metadata, dimensions, max_iterations (merged metadata + state)
- Session mode includes `git_changes` in metadata
- Module mode includes `target_pattern` and `resolved_files` in metadata
- Progress tracking: Create `review-progress.json` for progress tracking

### Step 1.6: Initialize Review Progress

- Create `review-progress.json` for real-time dashboard updates via polling
- See [Review Progress JSON](#review-progress-json) schema below

### Step 1.7: Progress Tracking Initialization

- Set up progress tracking with hierarchical structure
- Mark Phase 1 completed, Phase 2 in_progress

---

## Review State JSON (Session Mode)

**Purpose**: Unified state machine and metadata (merged from metadata + state)

```json
{
  "session_id": "WFS-payment-integration",
  "review_id": "review-20250125-143022",
  "review_type": "session",
  "metadata": {
    "created_at": "2025-01-25T14:30:22Z",
    "git_changes": {
      "commit_range": "abc123..def456",
      "files_changed": 15,
      "insertions": 342,
      "deletions": 128
    },
    "dimensions": ["security", "architecture", "quality", "action-items", "performance", "maintainability", "best-practices"],
    "max_iterations": 3
  },
  "phase": "parallel|aggregate|iterate|complete",
  "current_iteration": 1,
  "dimensions_reviewed": ["security", "architecture", "quality", "action-items", "performance", "maintainability", "best-practices"],
  "selected_strategy": "comprehensive",
  "next_action": "execute_parallel_reviews|aggregate_findings|execute_deep_dive|generate_final_report|complete",
  "severity_distribution": {
    "critical": 2,
    "high": 5,
    "medium": 12,
    "low": 8
  },
  "critical_files": [
    {
      "file": "src/payment/processor.ts",
      "finding_count": 5,
      "dimensions": ["security", "architecture", "quality"]
    }
  ],
  "iterations": [
    {
      "iteration": 1,
      "findings_analyzed": ["uuid-1", "uuid-2"],
      "findings_resolved": 1,
      "findings_escalated": 1,
      "severity_change": {
        "before": {"critical": 2, "high": 5, "medium": 12, "low": 8},
        "after": {"critical": 1, "high": 6, "medium": 12, "low": 8}
      },
      "timestamp": "2025-01-25T14:30:00Z"
    }
  ],
  "completion_criteria": {
    "target": "no_critical_findings_and_high_under_5",
    "current_status": "in_progress",
    "estimated_completion": "2 iterations remaining"
  }
}
```

**Field Descriptions**:
- `phase`: Current execution phase (state machine pointer)
- `current_iteration`: Iteration counter (used for max check)
- `next_action`: Next step orchestrator should execute
- `severity_distribution`: Aggregated counts across all dimensions
- `critical_files`: Files appearing in 3+ dimensions with metadata
- `iterations[]`: Historical log for trend analysis

## Review State JSON (Module Mode)

**Purpose**: Unified state machine and metadata (merged from metadata + state)

```json
{
  "review_id": "review-20250125-143022",
  "review_type": "module",
  "session_id": "WFS-auth-system",
  "metadata": {
    "created_at": "2025-01-25T14:30:22Z",
    "target_pattern": "src/auth/**",
    "resolved_files": [
      "src/auth/service.ts",
      "src/auth/validator.ts",
      "src/auth/middleware.ts"
    ],
    "dimensions": ["security", "architecture", "quality", "action-items", "performance", "maintainability", "best-practices"],
    "max_iterations": 3
  },
  "phase": "parallel|aggregate|iterate|complete",
  "current_iteration": 1,
  "dimensions_reviewed": ["security", "architecture", "quality", "action-items", "performance", "maintainability", "best-practices"],
  "selected_strategy": "comprehensive",
  "next_action": "execute_parallel_reviews|aggregate_findings|execute_deep_dive|generate_final_report|complete",
  "severity_distribution": {
    "critical": 2,
    "high": 5,
    "medium": 12,
    "low": 8
  },
  "critical_files": [...],
  "iterations": [...],
  "completion_criteria": {...}
}
```

## Review Progress JSON

**Purpose**: Real-time dashboard updates via polling

```json
{
  "review_id": "review-20250125-143022",
  "last_update": "2025-01-25T14:35:10Z",
  "phase": "parallel|aggregate|iterate|complete",
  "current_iteration": 1,
  "progress": {
    "parallel_review": {
      "total_dimensions": 7,
      "completed": 5,
      "in_progress": 2,
      "percent_complete": 71
    },
    "deep_dive": {
      "total_findings": 6,
      "analyzed": 2,
      "in_progress": 1,
      "percent_complete": 33
    }
  },
  "agent_status": [
    {
      "agent_type": "review-agent",
      "dimension": "security",
      "status": "completed",
      "started_at": "2025-01-25T14:30:00Z",
      "completed_at": "2025-01-25T15:15:00Z",
      "duration_ms": 2700000
    },
    {
      "agent_type": "deep-dive-agent",
      "finding_id": "sec-001-uuid",
      "status": "in_progress",
      "started_at": "2025-01-25T14:32:00Z"
    }
  ],
  "estimated_completion": "2025-01-25T16:00:00Z"
}
```

---

## Output File Structure

```
{projectRoot}/.workflow/active/WFS-{session-id}/.review/
├── review-state.json                    # Orchestrator state machine (includes metadata)
├── review-progress.json                 # Real-time progress for dashboard
├── dimensions/                          # Per-dimension results
│   ├── security.json
│   ├── architecture.json
│   ├── quality.json
│   ├── action-items.json
│   ├── performance.json
│   ├── maintainability.json
│   └── best-practices.json
├── iterations/                          # Deep-dive results
│   ├── iteration-1-finding-{uuid}.json
│   └── iteration-2-finding-{uuid}.json
└── reports/                             # Human-readable reports
    ├── security-analysis.md
    ├── security-cli-output.txt
    ├── deep-dive-1-{uuid}.md
    └── ...
```

## Session Context

```
{projectRoot}/.workflow/active/WFS-{session-id}/
├── workflow-session.json
├── IMPL_PLAN.md
├── TODO_LIST.md
├── .task/
├── .summaries/
└── .review/                             # Review results (this command)
    └── (structure above)
```

---

## Output

- **Variables**: `sessionId`, `reviewId`, `resolvedFiles`, `reviewMode`, `outputDir`
- **Files**: `review-state.json`, `review-progress.json`

## Next Phase

Return to orchestrator, then auto-continue to [Phase 2: Parallel Review](02-parallel-review.md).
