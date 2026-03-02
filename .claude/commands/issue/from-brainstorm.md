---
name: from-brainstorm
description: Convert brainstorm session ideas into issue with executable solution for parallel-dev-cycle
argument-hint: "SESSION=\"<session-id>\" [--idea=<index>] [--auto] [-y|--yes]"
allowed-tools: TodoWrite(*), Bash(*), Read(*), Write(*), Glob(*), AskUserQuestion(*)
---

## Auto Mode

When `--yes` or `-y`: Auto-select highest-scored idea, skip confirmations, create issue directly.

# Issue From-Brainstorm Command (/issue:from-brainstorm)

## Overview

Bridge command that converts **brainstorm-with-file** session output into executable **issue + solution** for parallel-dev-cycle consumption.

**Core workflow**: Load Session → Select Idea → Convert to Issue → Generate Solution → Bind & Ready

**Input sources**:
- **synthesis.json** - Main brainstorm results with top_ideas
- **perspectives.json** - Multi-CLI perspectives (creative/pragmatic/systematic)
- **.brainstorming/** - Synthesis artifacts (clarifications, enhancements from role analyses)

**Output**:
- **Issue** (ISS-YYYYMMDD-NNN) - Full context with clarifications
- **Solution** (SOL-{issue-id}-{uid}) - Structured tasks for parallel-dev-cycle

## Quick Reference

```bash
# Interactive mode - select idea, confirm before creation
/issue:from-brainstorm SESSION="BS-rate-limiting-2025-01-28"

# Pre-select idea by index
/issue:from-brainstorm SESSION="BS-auth-system-2025-01-28" --idea=0

# Auto mode - select highest scored, no confirmations
/issue:from-brainstorm SESSION="BS-caching-2025-01-28" --auto -y
```

## Arguments

| Argument | Required | Type | Default | Description |
|----------|----------|------|---------|-------------|
| SESSION | Yes | String | - | Session ID or path to `.workflow/.brainstorm/BS-xxx` |
| --idea | No | Integer | - | Pre-select idea by index (0-based) |
| --auto | No | Flag | false | Auto-select highest-scored idea |
| -y, --yes | No | Flag | false | Skip all confirmations |

## Data Structures

### Issue Schema (Output)

```typescript
interface Issue {
  id: string;                    // ISS-YYYYMMDD-NNN
  title: string;                 // From idea.title
  status: 'planned';             // Auto-set after solution binding
  priority: number;              // 1-5 (derived from idea.score)
  context: string;               // Full description with clarifications
  source: 'brainstorm';
  labels: string[];              // ['brainstorm', perspective, feasibility]

  // Structured fields
  expected_behavior: string;     // From key_strengths
  actual_behavior: string;       // From main_challenges
  affected_components: string[]; // Extracted from description

  _brainstorm_metadata: {
    session_id: string;
    idea_score: number;
    novelty: number;
    feasibility: string;
    clarifications_count: number;
  };
}
```

### Solution Schema (Output)

```typescript
interface Solution {
  id: string;                    // SOL-{issue-id}-{4-char-uid}
  description: string;           // idea.title
  approach: string;              // idea.description
  tasks: Task[];                 // Generated from idea.next_steps

  analysis: {
    risk: 'low' | 'medium' | 'high';
    impact: 'low' | 'medium' | 'high';
    complexity: 'low' | 'medium' | 'high';
  };

  is_bound: boolean;             // true
  created_at: string;
  bound_at: string;
}

interface Task {
  id: string;                    // T1, T2, T3...
  title: string;                 // Actionable task name
  scope: string;                 // design|implementation|testing|documentation
  action: string;                // Implement|Design|Research|Test|Document
  description: string;

  implementation: string[];      // Step-by-step guide
  convergence: {
    criteria: string[];          // What defines success
    verification: string[];      // How to verify
  };

  priority: string;              // "critical"|"high"|"medium"|"low"
  depends_on: string[];          // Task dependencies
}
```

## Execution Flow

```
Phase 1: Session Loading
   ├─ Validate session path
   ├─ Load synthesis.json (required)
   ├─ Load perspectives.json (optional - multi-CLI insights)
   ├─ Load .brainstorming/** (optional - synthesis artifacts)
   └─ Validate top_ideas array exists

Phase 2: Idea Selection
   ├─ Auto mode: Select highest scored idea
   ├─ Pre-selected: Use --idea=N index
   └─ Interactive: Display table, ask user to select

Phase 3: Enrich Issue Context
   ├─ Base: idea.description + key_strengths + main_challenges
   ├─ Add: Relevant clarifications (Requirements/Architecture/Feasibility)
   ├─ Add: Multi-perspective insights (creative/pragmatic/systematic)
   └─ Add: Session metadata (session_id, completion date, clarification count)

Phase 4: Create Issue
   ├─ Generate issue data with enriched context
   ├─ Calculate priority from idea.score (0-10 → 1-5)
   ├─ Create via: ccw issue create (heredoc for JSON)
   └─ Returns: ISS-YYYYMMDD-NNN

Phase 5: Generate Solution Tasks
   ├─ T1: Research & Validate (if main_challenges exist)
   ├─ T2: Design & Specification (if key_strengths exist)
   ├─ T3+: Implementation tasks (from idea.next_steps)
   └─ Each task includes: implementation steps + convergence criteria

Phase 6: Bind Solution
   ├─ Write solution to .workflow/issues/solutions/{issue-id}.jsonl
   ├─ Bind via: ccw issue bind {issue-id} {solution-id}
   ├─ Update issue status to 'planned'
   └─ Returns: SOL-{issue-id}-{uid}

Phase 7: Next Steps (skip in auto mode)
   └─ Auto mode: complete directly | Interactive: Form queue | Convert another | Done
```

## Context Enrichment Logic

### Base Context (Always Included)

- **Description**: `idea.description`
- **Why This Idea**: `idea.key_strengths[]`
- **Challenges to Address**: `idea.main_challenges[]`
- **Implementation Steps**: `idea.next_steps[]`

### Enhanced Context (If Available)

**From Synthesis Artifacts** (`.brainstorming/*/analysis*.md`):
- Extract clarifications matching categories: Requirements, Architecture, Feasibility
- Format: `**{Category}** ({role}): {question} → {answer}`
- Limit: Top 3 most relevant

**From Perspectives** (`perspectives.json`):
- **Creative**: First insight from `perspectives.creative.insights[0]`
- **Pragmatic**: First blocker from `perspectives.pragmatic.blockers[0]`
- **Systematic**: First pattern from `perspectives.systematic.patterns[0]`

**Session Metadata**:
- Session ID, Topic, Completion Date
- Clarifications count (if synthesis artifacts loaded)

## Task Generation Strategy

### Task 1: Research & Validation
**Trigger**: `idea.main_challenges.length > 0`
- **Title**: "Research & Validate Approach"
- **Scope**: design
- **Action**: Research
- **Implementation**: Investigate blockers, review similar implementations, validate with team
- **Acceptance**: Blockers documented, feasibility assessed, approach validated

### Task 2: Design & Specification
**Trigger**: `idea.key_strengths.length > 0`
- **Title**: "Design & Create Specification"
- **Scope**: design
- **Action**: Design
- **Implementation**: Create design doc, define success criteria, plan phases
- **Acceptance**: Design complete, metrics defined, plan outlined

### Task 3+: Implementation Tasks
**Trigger**: `idea.next_steps[]`
- **Title**: From `next_steps[i]` (max 60 chars)
- **Scope**: Inferred from keywords (test→testing, api→backend, ui→frontend)
- **Action**: Detected from verbs (implement, create, update, fix, test, document)
- **Implementation**: Execute step + follow design + write tests
- **Acceptance**: Step implemented + tests passing + code reviewed

### Fallback Task
**Trigger**: No tasks generated from above
- **Title**: `idea.title`
- **Scope**: implementation
- **Action**: Implement
- **Generic implementation + convergence criteria**

## Priority Calculation

### Issue Priority (1-5)
```
idea.score: 0-10
priority = max(1, min(5, ceil((10 - score) / 2)))

Examples:
score 9-10 → priority 1 (critical)
score 7-8  → priority 2 (high)
score 5-6  → priority 3 (medium)
score 3-4  → priority 4 (low)
score 0-2  → priority 5 (lowest)
```

### Task Priority (1-5)
- Research task: 1 (highest)
- Design task: 2
- Implementation tasks: 3 by default, decrement for later tasks
- Testing/documentation: 4-5

### Complexity Analysis
```
risk: main_challenges.length > 2 ? 'high' : 'medium'
impact: score >= 8 ? 'high' : score >= 6 ? 'medium' : 'low'
complexity: main_challenges > 3 OR tasks > 5 ? 'high'
            tasks > 3 ? 'medium' : 'low'
```

## CLI Integration

### Issue Creation
```bash
# Uses heredoc to avoid shell escaping
ccw issue create << 'EOF'
{
  "title": "...",
  "context": "...",
  "priority": 3,
  "source": "brainstorm",
  "labels": ["brainstorm", "creative", "feasibility-high"],
  ...
}
EOF
```

### Solution Binding
```bash
# Append solution to JSONL file
echo '{"id":"SOL-xxx","tasks":[...]}' >> .workflow/issues/solutions/{issue-id}.jsonl

# Bind to issue
ccw issue bind {issue-id} {solution-id}

# Update status
ccw issue update {issue-id} --status planned
```

## Error Handling

| Error | Message | Resolution |
|-------|---------|------------|
| Session not found | synthesis.json missing | Check session ID, list available sessions |
| No ideas | top_ideas array empty | Complete brainstorm workflow first |
| Invalid idea index | Index out of range | Check valid range 0 to N-1 |
| Issue creation failed | ccw issue create error | Verify CLI endpoint working |
| Solution binding failed | Bind error | Check issue exists, retry |

## Examples

### Interactive Mode

```bash
/issue:from-brainstorm SESSION="BS-rate-limiting-2025-01-28"

# Output:
# | # | Title | Score | Feasibility |
# |---|-------|-------|-------------|
# | 0 | Token Bucket Algorithm | 8.5 | High |
# | 1 | Sliding Window Counter | 7.2 | Medium |
# | 2 | Fixed Window | 6.1 | High |

# User selects: #0

# Result:
# ✓ Created issue: ISS-20250128-001
# ✓ Created solution: SOL-ISS-20250128-001-ab3d
# ✓ Bound solution to issue
# → Next: /issue:queue
```

### Auto Mode

```bash
/issue:from-brainstorm SESSION="BS-caching-2025-01-28" --auto

# Result:
# Auto-selected: Redis Cache Layer (Score: 9.2/10)
# ✓ Created issue: ISS-20250128-002
# ✓ Solution with 4 tasks
# → Status: planned
```

## Integration Flow

```
brainstorm-with-file
        │
        ├─ synthesis.json
        ├─ perspectives.json
        └─ .brainstorming/** (optional)
        │
        ▼
 /issue:from-brainstorm  ◄─── This command
        │
        ├─ ISS-YYYYMMDD-NNN (enriched issue)
        └─ SOL-{issue-id}-{uid} (structured solution)
        │
        ▼
 /issue:queue
        │
        ▼
 /parallel-dev-cycle
        │
        ▼
   RA → EP → CD → VAS
```

## Session Files Reference

### Input Files

```
.workflow/.brainstorm/BS-{slug}-{date}/
├── synthesis.json           # REQUIRED - Top ideas with scores
├── perspectives.json        # OPTIONAL - Multi-CLI insights
├── brainstorm.md           # Reference only
└── .brainstorming/         # OPTIONAL - Synthesis artifacts
    ├── system-architect/
    │   └── analysis.md     # Contains clarifications + enhancements
    ├── api-designer/
    │   └── analysis.md
    └── ...
```

### Output Files

```
.workflow/issues/
├── solutions/
│   └── ISS-YYYYMMDD-001.jsonl  # Created solution (JSONL)
└── (managed by ccw issue CLI)
```

## Related Commands

- `/workflow:brainstorm-with-file` - Generate brainstorm sessions
- `brainstorm` skill - Add clarifications to brainstorm
- `/issue:new` - Create issues from GitHub or text
- `/issue:plan` - Generate solutions via exploration
- `/issue:queue` - Form execution queue
- `/issue:execute` - Execute with parallel-dev-cycle
- `ccw issue status <id>` - View issue
- `ccw issue solution <id>` - View solution
