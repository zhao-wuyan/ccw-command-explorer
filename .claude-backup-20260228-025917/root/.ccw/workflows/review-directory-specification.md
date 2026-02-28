# Review Directory Specification

## Overview

Unified directory structure for all review commands (session-based and module-based) within workflow sessions.

## Core Principles

1. **Session-Based**: All reviews run within a workflow session context
2. **Unified Structure**: Same directory layout for all review types
3. **Type Differentiation**: Review type indicated by metadata, not directory structure
4. **Progressive Creation**: Directories created on-demand during review execution
5. **Archive Support**: Reviews archived with their parent session

## Directory Structure

### Base Location
```
.workflow/active/WFS-{session-id}/.review/
```

### Complete Structure
```
.workflow/active/WFS-{session-id}/.review/
├── review-state.json              # Review orchestrator state machine
├── review-progress.json           # Real-time progress for dashboard polling
├── review-metadata.json           # Review configuration and scope
├── dimensions/                    # Per-dimension analysis results
│   ├── security.json
│   ├── architecture.json
│   ├── quality.json
│   ├── action-items.json
│   ├── performance.json
│   ├── maintainability.json
│   └── best-practices.json
├── iterations/                    # Deep-dive iteration results
│   ├── iteration-1-finding-{uuid}.json
│   ├── iteration-2-finding-{uuid}.json
│   └── ...
├── reports/                       # Human-readable reports
│   ├── security-analysis.md
│   ├── security-cli-output.txt
│   ├── architecture-analysis.md
│   ├── architecture-cli-output.txt
│   ├── ...
│   ├── deep-dive-1-{uuid}.md
│   └── deep-dive-2-{uuid}.md
├── REVIEW-SUMMARY.md              # Final consolidated summary
└── dashboard.html                 # Interactive review dashboard
```

## Review Metadata Schema

**File**: `review-metadata.json`

```json
{
  "review_id": "review-20250125-143022",
  "review_type": "module|session",
  "session_id": "WFS-auth-system",
  "created_at": "2025-01-25T14:30:22Z",
  "scope": {
    "type": "module|session",
    "module_scope": {
      "target_pattern": "src/auth/**",
      "resolved_files": [
        "src/auth/service.ts",
        "src/auth/validator.ts"
      ],
      "file_count": 2
    },
    "session_scope": {
      "commit_range": "abc123..def456",
      "changed_files": [
        "src/auth/service.ts",
        "src/payment/processor.ts"
      ],
      "file_count": 2
    }
  },
  "dimensions": ["security", "architecture", "quality", "action-items", "performance", "maintainability", "best-practices"],
  "max_iterations": 3,
  "cli_tools": {
    "primary": "gemini",
    "fallback": ["qwen", "codex"]
  }
}
```

## Review State Schema

**File**: `review-state.json`

```json
{
  "review_id": "review-20250125-143022",
  "phase": "init|parallel|aggregate|iterate|complete",
  "current_iteration": 1,
  "dimensions_status": {
    "security": "pending|in_progress|completed|failed",
    "architecture": "completed",
    "quality": "in_progress",
    "action-items": "pending",
    "performance": "pending",
    "maintainability": "pending",
    "best-practices": "pending"
  },
  "severity_distribution": {
    "critical": 2,
    "high": 5,
    "medium": 12,
    "low": 8
  },
  "critical_files": [
    "src/auth/service.ts",
    "src/payment/processor.ts"
  ],
  "iterations": [
    {
      "iteration": 1,
      "findings_selected": ["uuid-1", "uuid-2", "uuid-3"],
      "completed_at": "2025-01-25T15:30:00Z"
    }
  ],
  "completion_criteria": {
    "critical_count": 0,
    "high_count_threshold": 5,
    "max_iterations": 3
  },
  "next_action": "execute_parallel_reviews|aggregate_findings|execute_deep_dive|generate_final_report|complete"
}
```

## Session Integration

### Session Discovery

**review-session-cycle** (auto-discover):
```bash
# Auto-detect active session
/workflow:review-session-cycle

# Or specify session explicitly
/workflow:review-session-cycle WFS-auth-system
```

**review-module-cycle** (require session):
```bash
# Must have active session or specify one
/workflow:review-module-cycle src/auth/** --session WFS-auth-system

# Or use active session
/workflow:review-module-cycle src/auth/**
```

### Session Creation Logic

**For review-module-cycle**:

1. **Check Active Session**: Search `.workflow/active/WFS-*`
2. **If Found**: Use active session's `.review/` directory
3. **If Not Found**:
   - **Option A** (Recommended): Prompt user to create session first
   - **Option B**: Auto-create review-only session: `WFS-review-{pattern-hash}`

**Recommended Flow**:
```bash
# Step 1: Start session
/workflow:session:start --new "Review auth module"
# Creates: .workflow/active/WFS-review-auth-module/

# Step 2: Run review
/workflow:review-module-cycle src/auth/**
# Creates: .workflow/active/WFS-review-auth-module/.review/
```

## Command Phase 1 Requirements

### Both Commands Must:

1. **Session Discovery**:
   ```javascript
   // Check for active session
   const sessions = Glob('.workflow/active/WFS-*');
   if (sessions.length === 0) {
     // Prompt user to create session first
     error("No active session found. Please run /workflow:session:start first");
   }
   const sessionId = sessions[0].match(/WFS-[^/]+/)[0];
   ```

2. **Create .review/ Structure**:
   ```javascript
   const reviewDir = `.workflow/active/${sessionId}/.review/`;

   // Create directory structure
   Bash(`mkdir -p ${reviewDir}/dimensions`);
   Bash(`mkdir -p ${reviewDir}/iterations`);
   Bash(`mkdir -p ${reviewDir}/reports`);
   ```

3. **Initialize Metadata**:
   ```javascript
   // Write review-metadata.json
   Write(`${reviewDir}/review-metadata.json`, JSON.stringify({
     review_id: `review-${timestamp}`,
     review_type: "module|session",
     session_id: sessionId,
     created_at: new Date().toISOString(),
     scope: {...},
     dimensions: [...],
     max_iterations: 3,
     cli_tools: {...}
   }));

   // Write review-state.json
   Write(`${reviewDir}/review-state.json`, JSON.stringify({
     review_id: `review-${timestamp}`,
     phase: "init",
     current_iteration: 0,
     dimensions_status: {},
     severity_distribution: {},
     critical_files: [],
     iterations: [],
     completion_criteria: {},
     next_action: "execute_parallel_reviews"
   }));
   ```

4. **Generate Dashboard**:
   ```javascript
   const template = Read('~/.claude/templates/review-cycle-dashboard.html');
   const dashboard = template
     .replace('{{SESSION_ID}}', sessionId)
     .replace('{{REVIEW_TYPE}}', reviewType)
     .replace('{{REVIEW_DIR}}', reviewDir);
   Write(`${reviewDir}/dashboard.html`, dashboard);

   // Output to user
   console.log(`📊 Review Dashboard: file://${absolutePath(reviewDir)}/dashboard.html`);
   console.log(`📂 Review Output: ${reviewDir}`);
   ```

## Archive Strategy

### On Session Completion

When `/workflow:session:complete` is called:

1. **Preserve Review Directory**:
   ```javascript
   // Move entire session including .review/
   Bash(`mv .workflow/active/${sessionId} .workflow/archives/${sessionId}`);
   ```

2. **Review Archive Structure**:
   ```
   .workflow/archives/WFS-auth-system/
   ├── workflow-session.json
   ├── IMPL_PLAN.md
   ├── TODO_LIST.md
   ├── .task/
   ├── .summaries/
   └── .review/                    # Review results preserved
       ├── review-metadata.json
       ├── REVIEW-SUMMARY.md
       └── dashboard.html
   ```

3. **Access Archived Reviews**:
   ```bash
   # Open archived dashboard
   start .workflow/archives/WFS-auth-system/.review/dashboard.html
   ```

## Benefits

### 1. Unified Structure
- Same directory layout for all review types
- Consistent file naming and schemas
- Easier maintenance and tooling

### 2. Session Integration
- Review history tracked with implementation
- Easy correlation between code changes and reviews
- Simplified archiving and retrieval

### 3. Progressive Creation
- Directories created only when needed
- No upfront overhead
- Clean session initialization

### 4. Type Flexibility
- Module-based and session-based reviews in same structure
- Type indicated by metadata, not directory layout
- Easy to add new review types

### 5. Dashboard Consistency
- Same dashboard template for both types
- Unified progress tracking
- Consistent user experience

## Migration Path

### For Existing Commands

**review-session-cycle**:
1. Change output from `.workflow/.reviews/session-{id}/` to `.workflow/active/{session-id}/.review/`
2. Update Phase 1 to use session discovery
3. Add review-metadata.json creation

**review-module-cycle**:
1. Add session requirement (or auto-create)
2. Change output from `.workflow/.reviews/module-{hash}/` to `.workflow/active/{session-id}/.review/`
3. Update Phase 1 to use session discovery
4. Add review-metadata.json creation

### Backward Compatibility

**For existing standalone reviews** in `.workflow/.reviews/`:
- Keep for reference
- Document migration in README
- Provide migration script if needed

## Implementation Checklist

- [ ] Update workflow-architecture.md with .review/ structure
- [ ] Update review-session-cycle.md command specification
- [ ] Update review-module-cycle.md command specification
- [ ] Update review-cycle-dashboard.html template
- [ ] Create review-metadata.json schema validation
- [ ] Update /workflow:session:complete to preserve .review/
- [ ] Update documentation examples
- [ ] Test both review types with new structure
- [ ] Validate dashboard compatibility
- [ ] Document migration path for existing reviews
