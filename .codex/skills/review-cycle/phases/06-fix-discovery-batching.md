# Phase 6: Fix Discovery & Batching

> Source: `commands/workflow/review-cycle-fix.md` Phase 1 + Phase 1.5

## Overview

Validate fix input source, create fix session structure, and perform intelligent grouping of findings into batches for parallel planning.

## Quick Start

```bash
# Fix from exported findings file (session-based path)
review-cycle --fix ${projectRoot}/.workflow/active/WFS-123/.review/fix-export-1706184622000.json

# Fix from review directory (auto-discovers latest export)
review-cycle --fix ${projectRoot}/.workflow/active/WFS-123/.review/

# Resume interrupted fix session
review-cycle --fix --resume

# Custom max retry attempts per finding
review-cycle --fix ${projectRoot}/.workflow/active/WFS-123/.review/ --max-iterations=5

# Custom batch size for parallel planning (default: 5 findings per batch)
review-cycle --fix ${projectRoot}/.workflow/active/WFS-123/.review/ --batch-size=3
```

**Fix Source**: Exported findings from review cycle dashboard
**Output Directory**: `{review-dir}/fixes/{fix-session-id}/` (within session .review/)
**Default Max Iterations**: 3 (per finding, adjustable)
**Default Batch Size**: 5 (findings per planning batch, adjustable)
**Max Parallel Agents**: 10 (concurrent planning agents)
**CLI Tools**: @cli-planning-agent (planning), @cli-execute-agent (fixing)

## Core Concept

Automated fix orchestrator with **parallel planning architecture**: Multiple AI agents analyze findings concurrently in batches, then coordinate parallel/serial execution. Generates fix timeline with intelligent grouping and dependency analysis, executes fixes with conservative test verification.

**Fix Process**:
- **Batching Phase (1.5)**: Orchestrator groups findings by file+dimension similarity, creates batches
- **Planning Phase (2)**: Up to 10 agents plan batches in parallel, generate partial plans, orchestrator aggregates
- **Execution Phase (3)**: Main orchestrator coordinates agents per aggregated timeline stages
- **Parallel Efficiency**: Customizable batch size (default: 5), MAX_PARALLEL=10 agents
- **No rigid structure**: Adapts to task requirements, not bound to fixed JSON format

**vs Manual Fixing**:
- **Manual**: Developer reviews findings one-by-one, fixes sequentially
- **Automated**: AI groups related issues, multiple agents plan in parallel, executes in optimal parallel/serial order with automatic test verification

### Value Proposition
1. **Parallel Planning**: Multiple agents analyze findings concurrently, reducing planning time for large batches (10+ findings)
2. **Intelligent Batching**: Semantic similarity grouping ensures related findings are analyzed together
3. **Multi-stage Coordination**: Supports complex parallel + serial execution with cross-batch dependency management
4. **Conservative Safety**: Mandatory test verification with automatic rollback on failure
5. **Resume Support**: Checkpoint-based recovery for interrupted sessions

### Orchestrator Boundary (CRITICAL)
- **ONLY command** for automated review finding fixes
- Manages: Intelligent batching (Phase 1.5), parallel planning coordination (spawn N agents), plan aggregation (merge partial plans, resolve cross-batch dependencies), stage-based execution scheduling, agent scheduling, progress tracking
- Delegates: Batch planning to @cli-planning-agent, fix execution to @cli-execute-agent

## Fix Process Overview

```
Phase 1: Discovery & Initialization
   └─ Validate export file, create fix session structure, initialize state files

Phase 1.5: Intelligent Grouping & Batching
   ├─ Analyze findings metadata (file, dimension, severity)
   ├─ Group by semantic similarity (file proximity + dimension affinity)
   ├─ Create batches respecting --batch-size (default: 5)
   └─ Output: Finding batches for parallel planning

Phase 2: Parallel Planning Coordination (@cli-planning-agent × N)
   ├─ Spawn MAX_PARALLEL planning agents concurrently (default: 10)
   ├─ Each agent processes one batch:
   │  ├─ Analyze findings for patterns and dependencies
   │  ├─ Group by file + dimension + root cause similarity
   │  ├─ Determine execution strategy (parallel/serial/hybrid)
   │  ├─ Generate fix timeline with stages
   │  └─ Output: partial-plan-{batch-id}.json
   ├─ Collect results from all agents
   └─ Aggregate: Merge partial plans → fix-plan.json (resolve cross-batch dependencies)

Phase 3: Execution Orchestration (Stage-based)
   For each timeline stage:
   ├─ Load groups for this stage
   ├─ If parallel: Spawn all group agents simultaneously
   ├─ If serial: Execute groups sequentially
   ├─ Each agent:
   │  ├─ Analyze code context
   │  ├─ Apply fix per strategy
   │  ├─ Run affected tests
   │  ├─ On test failure: Rollback, retry up to max_iterations
   │  └─ On success: Commit, update fix-progress-{N}.json
   └─ Advance to next stage

Phase 4: Completion & Aggregation
   └─ Aggregate results → Generate fix-summary.md → Update history → Output summary

Phase 5: Session Completion (Optional)
   └─ If all fixes successful → Prompt to complete workflow session
```

## Agent Roles

| Agent | Responsibility |
|-------|---------------|
| **Orchestrator** | Input validation, session management, intelligent batching (Phase 1.5), parallel planning coordination (spawn N agents), plan aggregation (merge partial plans, resolve cross-batch dependencies), stage-based execution scheduling, progress tracking, result aggregation |
| **@cli-planning-agent** | Batch findings analysis, intelligent grouping (file+dimension+root cause), execution strategy determination (parallel/serial/hybrid), timeline generation with dependency mapping, partial plan output |
| **@cli-execute-agent** | Fix execution per group, code context analysis, Edit tool operations, test verification, git rollback on failure, completion JSON generation |

## Parallel Planning Architecture

**Batch Processing Strategy**:

| Phase | Agent Count | Input | Output | Purpose |
|-------|-------------|-------|--------|---------|
| **Batching (1.5)** | Orchestrator | All findings | Finding batches | Semantic grouping by file+dimension, respecting --batch-size |
| **Planning (2)** | N agents (≤10) | 1 batch each | partial-plan-{batch-id}.json | Analyze batch in parallel, generate execution groups and timeline |
| **Aggregation (2)** | Orchestrator | All partial plans | fix-plan.json | Merge timelines, resolve cross-batch dependencies |
| **Execution (3)** | M agents (dynamic) | 1 group each | fix-progress-{N}.json | Execute fixes per aggregated plan with test verification |

**Benefits**:
- **Speed**: N agents plan concurrently, reducing planning time for large batches
- **Scalability**: MAX_PARALLEL=10 prevents resource exhaustion
- **Flexibility**: Batch size customizable via --batch-size (default: 5)
- **Isolation**: Each planning agent focuses on related findings (semantic grouping)
- **Reusable**: Aggregated plan can be re-executed without re-planning

## Intelligent Grouping Strategy

**Three-Level Grouping**:

```javascript
// Level 1: Primary grouping by file + dimension
{file: "auth.ts", dimension: "security"} → Group A
{file: "auth.ts", dimension: "quality"} → Group B
{file: "query-builder.ts", dimension: "security"} → Group C

// Level 2: Secondary grouping by root cause similarity
Group A findings → Semantic similarity analysis (threshold 0.7)
  → Sub-group A1: "missing-input-validation" (findings 1, 2)
  → Sub-group A2: "insecure-crypto" (finding 3)

// Level 3: Dependency analysis
Sub-group A1 creates validation utilities
Sub-group C4 depends on those utilities
→ A1 must execute before C4 (serial stage dependency)
```

**Similarity Computation**:
- Combine: `description + recommendation + category`
- Vectorize: TF-IDF or LLM embedding
- Cluster: Greedy algorithm with cosine similarity > 0.7

## Phase 1: Discovery & Initialization (Orchestrator)

**Phase 1 Orchestrator Responsibilities**:
- Input validation: Check export file exists and is valid JSON
- Auto-discovery: If review-dir provided, find latest `*-fix-export.json`
- Session creation: Generate fix-session-id (`fix-{timestamp}`)
- Directory structure: Create `{review-dir}/fixes/{fix-session-id}/` with subdirectories
- State files: Initialize active-fix-session.json (session marker)
- Progress tracking initialization: Set up 5-phase tracking (including Phase 1.5)

## Phase 1.5: Intelligent Grouping & Batching (Orchestrator)

- Load all findings metadata (id, file, dimension, severity, title)
- Semantic similarity analysis:
  - Primary: Group by file proximity (same file or related modules)
  - Secondary: Group by dimension affinity (same review dimension)
  - Tertiary: Analyze title/description similarity (root cause clustering)
- Create batches respecting --batch-size (default: 5 findings per batch)
- Balance workload: Distribute high-severity findings across batches
- Output: Array of finding batches for parallel planning

```javascript
// Load findings
const findings = JSON.parse(Read(exportFile));
const batchSize = flags.batchSize || 5;

// Semantic similarity analysis: group by file+dimension
const batches = [];
const grouped = new Map(); // key: "${file}:${dimension}"

for (const finding of findings) {
  const key = `${finding.file || 'unknown'}:${finding.dimension || 'general'}`;
  if (!grouped.has(key)) grouped.set(key, []);
  grouped.get(key).push(finding);
}

// Create batches respecting batchSize
for (const [key, group] of grouped) {
  while (group.length > 0) {
    const batch = group.splice(0, batchSize);
    batches.push({
      batch_id: batches.length + 1,
      findings: batch,
      metadata: { primary_file: batch[0].file, primary_dimension: batch[0].dimension }
    });
  }
}

console.log(`Created ${batches.length} batches (${batchSize} findings per batch)`);
```

## Output File Structure

```
{projectRoot}/.workflow/active/WFS-{session-id}/.review/
├── fix-export-{timestamp}.json     # Exported findings (input)
└── fixes/{fix-session-id}/
    ├── partial-plan-1.json         # Batch 1 partial plan (planning agent 1 output)
    ├── partial-plan-2.json         # Batch 2 partial plan (planning agent 2 output)
    ├── partial-plan-N.json         # Batch N partial plan (planning agent N output)
    ├── fix-plan.json               # Aggregated execution plan (orchestrator merges partials)
    ├── fix-progress-1.json         # Group 1 progress (planning agent init → agent updates)
    ├── fix-progress-2.json         # Group 2 progress (planning agent init → agent updates)
    ├── fix-progress-3.json         # Group 3 progress (planning agent init → agent updates)
    ├── fix-summary.md              # Final report (orchestrator generates)
    ├── active-fix-session.json     # Active session marker
    └── fix-history.json            # All sessions history
```

**File Producers**:
- **Orchestrator**: Batches findings (Phase 1.5), aggregates partial plans → `fix-plan.json` (Phase 2), spawns parallel planning agents
- **Planning Agents (N)**: Each outputs `partial-plan-{batch-id}.json` + initializes `fix-progress-*.json` for assigned groups
- **Execution Agents (M)**: Update assigned `fix-progress-{N}.json` in real-time

## Output

- Variables: batches (array), fixSessionId, sessionDir
- Files: active-fix-session.json, directory structure created

## Next Phase

Return to orchestrator, then auto-continue to [Phase 7: Fix Parallel Planning](07-fix-parallel-planning.md).
