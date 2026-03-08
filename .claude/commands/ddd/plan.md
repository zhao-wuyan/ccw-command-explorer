---
name: plan
description: Document-driven planning pipeline — queries doc-index, explores codebase with doc-aware angles, clarifies ambiguities, and produces unified plan.json + TASK-*.json artifacts with doc_context traceability.
argument-hint: "[-y|--yes] [--explore] [--skip-explore] [--skip-clarify] \"task description or feature keyword\""
allowed-tools: TodoWrite(*), Agent(*), AskUserQuestion(*), Read(*), Grep(*), Glob(*), Bash(*), Write(*), mcp__ace-tool__search_context(*)
---

## Auto Mode

When `--yes` or `-y`: Skip clarification (Phase 3), auto-select ddd:execute (Phase 5), skip interactive refinement.

# DDD Plan Command (/ddd:plan)

## Purpose

Full planning pipeline for document-driven development. Unlike simple context lookup, this command:
1. **Queries** the doc-index for instant context (features, requirements, components, ADRs)
2. **Explores** the codebase with doc-index-informed angles (not generic presets)
3. **Clarifies** ambiguities from exploration results and doc-index gaps
4. **Plans** with unified schema output (plan.json + TASK-*.json with doc_context)
5. **Hands off** to ddd:execute or other execution engines

### Key Differentiation from lite-plan
- Phase 1 provides instant context from doc-index (no cold-start exploration)
- Exploration angles are doc-index-informed (not generic preset selection)
- Tasks carry doc_context for traceability (features → requirements → code)
- Architecture decisions (ADRs) automatically surface as constraints

## Prerequisite

- `doc-index.json` must exist at `.workflow/.doc-index/doc-index.json`
- If not found → suggest running `/ddd:index-build` or `/ddd:scan` first

## Session Folder

```
.workflow/.doc-index/planning/{task-slug}-{YYYY-MM-DD}/
├── exploration-{angle}.json        # Per-angle exploration (Phase 2)
├── explorations-manifest.json      # Exploration index
├── plan.json                       # Plan overview (Phase 4)
├── planning-context.md             # Legacy context package (Phase 0+1 combined)
├── .process/
│   └── doc-context-package.json    # Bundled doc_context (Phase 1.8)
└── .task/
    ├── TASK-001.json
    └── TASK-002.json
```

---

## Phase 0: Parse Task Intent (enhanced)

### 0.1 Extract Keywords

From the user's task description, extract:
- **Domain keywords**: feature names, module names, business terms
- **Technical keywords**: file paths, class names, function names
- **Action type**: feature | bugfix | refactor | optimization | migration

### 0.2 Glossary Match

Cross-reference extracted keywords against `doc-index.json.glossary[]`:
- Match terms and aliases
- Expand user's vocabulary with canonical terms

### 0.3 Classify Complexity

Assess task complexity based on:
- Number of features potentially affected (from keyword matching)
- Whether new components are needed or existing ones modified
- Cross-feature impact (single feature vs multiple)

| Signal | Complexity |
|--------|-----------|
| Single feature, existing components | Low |
| 1-2 features, some new components | Medium |
| 3+ features, new architecture needed | High |

---

## Phase 1: Doc-Index Query

### 1.0 Schema Version Check (TASK-006)

Before querying doc-index, verify schema compatibility:

```javascript
const docIndex = JSON.parse(Read('.workflow/.doc-index/doc-index.json'));
const schemaVersion = docIndex.schema_version || '0.0'; // Default for legacy

if (schemaVersion !== '1.0') {
  console.warn(`Schema version mismatch: found ${schemaVersion}, expected 1.0`);
  console.warn('Consider running schema migration or regenerating doc-index with /ddd:scan');
  // Continue with degraded functionality - may encounter missing fields
}
```

**Graceful degradation**: If version mismatch detected → log warning → continue with caution (some features may not work as expected).

### 1.1 Feature Search

```
Search doc-index.json.features[] where:
  - name CONTAINS keyword (fuzzy)
  - tags INTERSECT keywords
  - requirementIds link to matching requirements
→ Output: matched feature IDs + names
```

### 1.2 Requirement Search

```
Search doc-index.json.requirements[] where:
  - title CONTAINS keyword
  - id matches explicit REQ-NNN reference
  - featureId matches found features
→ Output: matched requirement IDs + titles + priorities
```

### 1.3 Component Search

```
Search doc-index.json.technicalComponents[] where:
  - name CONTAINS keyword
  - codeLocations[].path CONTAINS file path keyword
  - codeLocations[].symbols CONTAINS symbol keyword
  - featureIds INTERSECT found features
→ Output: matched component IDs + code locations
```

### 1.4 ADR Search

```
Search doc-index.json.architectureDecisions[] where:
  - componentIds INTERSECT found components
→ Output: matched ADR IDs + titles
```

### 1.5 Action History Search

```
Search doc-index.json.actions[] where:
  - related to found features or components
→ Output: recent actions with descriptions
```

### 1.6 Build Impact Map

Assemble all found references into a structured impact map:

```json
{
  "affected_features": ["feat-auth"],
  "affected_requirements": ["REQ-001", "REQ-002"],
  "affected_components": ["tech-auth-service", "tech-user-model"],
  "architecture_constraints": ["ADR-001"],
  "recent_actions": ["task-123"],
  "complexity": "Medium"
}
```

Save as `planning-context.md` (legacy format for backward compatibility).

### Phase 1.7: Symbol Query (DeepWiki Bridge)

If DeepWiki is available (`deepwiki_feature_to_symbol_index` exists in doc-index.json):

1. Collect all `codeLocations[].path` from matched `technicalComponents[]`
2. Query DeepWiki: `POST /api/deepwiki/symbols-for-paths { paths: unique_paths }`
3. Build symbol_docs by component, sorted by type priority (class > function > method)
4. Populate `doc_context.symbol_docs[]` with Top-5 symbols per component

**Graceful degradation**: If DeepWiki unavailable → log warning → skip symbol injection → continue flow.

### Phase 1.8: Persist Doc Context Package

After building doc_context (including symbol_docs from Phase 1.7), persist it as a reusable context package:

1. Bundle doc_context into JSON structure:
```json
{
  "affected_features": ["feat-auth"],
  "affected_requirements": ["REQ-001", "REQ-002"],
  "affected_components": ["tech-auth-service"],
  "architecture_constraints": ["ADR-001"],
  "index_path": ".workflow/.doc-index/doc-index.json",
  "symbol_docs": [...]
}
```

2. Write to session folder: `{sessionFolder}/.process/doc-context-package.json`
3. Store relative path for task.json population: `../.process/doc-context-package.json`

**Error handling**: If write fails → log warning → continue without context package (backward compatible).

---

## Phase 2: Doc-Index-Guided Exploration (NEW)

Use Phase 1 results to **SELECT exploration angles intelligently**:

### 2.1 Angle Selection Logic

| Phase 1 Signal | Add Exploration Angle |
|----------------|----------------------|
| feat-auth or security-related ADR affected | `security` |
| Multiple features crossed (2+) | `integration-points` |
| New component needed (no matching tech-*) | `architecture` |
| Performance-related requirements | `performance` |
| Default (always included) | `patterns` + `dependencies` |

Select 1-4 angles total. More angles for higher complexity.

### 2.2 Skip & Trigger Conditions

| Complexity | Default Behavior | Override |
|-----------|-----------------|---------|
| **Low** | Auto-skip Phase 2 | `--explore` forces exploration |
| **Medium** | Ask user (unless `-y` → skip) | `--explore` forces, `--skip-explore` forces skip |
| **High** | Always run | `--skip-explore` forces skip |

Skip Phase 2 entirely when:
- Complexity is Low AND `--explore` not set
- OR `--skip-explore` flag is set
- OR `-y` flag AND complexity is Medium

### 2.3 Parallel Exploration

Launch 1-4 parallel `cli-explore-agent` runs:

```
For each selected angle:
  Agent(subagent_type="cli-explore-agent", prompt="
    Explore codebase for: {user task description}
    Angle: {angle}

    ## Doc-Index Context (pre-loaded)
    Features affected: {feature names + IDs}
    Components: {component names + code locations}
    Requirements: {requirement titles}
    Architecture decisions: {ADR titles + decisions}

    Focus exploration on {angle}-specific concerns.
    Output: explore-json-schema format.
  ")
```

Each agent receives doc-index context (feature-maps, tech-registry docs) to avoid cold-start.

### 2.4 Save Exploration Results

- Each exploration → `exploration-{angle}.json` (explore-json-schema)
- Manifest → `explorations-manifest.json`:

```json
{
  "explorations": [
    { "angle": "patterns", "path": "exploration-patterns.json", "file_count": 12 },
    { "angle": "security", "path": "exploration-security.json", "file_count": 8 }
  ],
  "total_files_discovered": 18,
  "timestamp": "ISO8601"
}
```

---

## Phase 3: Clarification (NEW)

### 3.1 Aggregate Clarification Needs

Collect from three sources:
1. **Exploration results**: `clarification_needs[]` from each exploration JSON
2. **Doc-index gaps**: unmapped requirements, orphan components, missing feature coverage
3. **Conflicting constraints**: contradictory architecture decisions, requirement priority conflicts

### 3.2 Deduplicate & Batch

- Merge duplicate/similar questions across exploration angles
- Group into rounds (max 4 questions per AskUserQuestion call)
- Prioritize: blocking questions first, nice-to-have last

### 3.3 Skip Conditions

Skip Phase 3 when:
- `-y` flag is set
- `--skip-clarify` flag is set
- No clarification needs collected from any source
- Complexity is Low AND Phase 2 was skipped (no exploration results to aggregate)

### 3.4 Execute Clarification

```
AskUserQuestion(questions=[
  {
    question: "Which authentication strategy should the new endpoint use?",
    header: "Auth strategy",
    options: [
      { label: "JWT Bearer (Recommended)", description: "Consistent with ADR-001 and existing auth middleware" },
      { label: "API Key", description: "Simpler but inconsistent with current architecture" },
      { label: "OAuth2", description: "Most flexible but higher implementation cost" }
    ],
    multiSelect: false
  }
])
```

Feed answers back into Phase 4 as constraints.

---

## Phase 4: Task Planning (NEW — produces plan.json + TASK-*.json)

### 4.1 Planning Strategy Selection

| Complexity | Strategy |
|-----------|---------|
| Low | Direct Claude planning (inline) |
| Medium | cli-lite-planning-agent with doc-index context |
| High | cli-lite-planning-agent with full exploration + doc-index context |

### 4.2 Planning Input Assembly

Combine:
- User's original task description
- Phase 1 impact map (features, requirements, components, ADRs)
- Phase 2 exploration results (if executed)
- Phase 3 clarification answers (if collected)
- Relevant feature-map and tech-registry doc excerpts

### 4.3 Execute Planning

For **Low complexity** (direct):
```
Generate plan.json + TASK-*.json directly based on assembled context.
```

For **Medium/High complexity**:
```
Agent(subagent_type="cli-lite-planning-agent", prompt="
  Task: {user task description}

  ## Doc-Index Impact Map
  {Phase 1 results}

  ## Exploration Context
  {Phase 2 results summary}

  ## Clarification Answers
  {Phase 3 answers}

  ## Architecture Constraints
  {ADR excerpts}

  Generate plan following plan-overview-base-schema.
  Generate tasks following task-schema.
  Include doc_context in both plan.json and each TASK-*.json.
")
```

### 4.3.1 Populate Task Artifacts (TASK-002)

After task generation, enrich each TASK-*.json with artifacts[] field:

1. Load doc-index.json from `.workflow/.doc-index/doc-index.json`
2. For each task, extract feature_ids from task.doc_context
3. Filter doc-index features/requirements matching task scope:
   - Match by feature_ids in task.doc_context.feature_ids
   - Include linked requirements via requirementIds
   - Include linked components via componentIds
4. Populate task.artifacts[] with filtered references:

```json
{
  "artifacts": [
    {
      "type": "feature_spec",
      "source": "doc-index",
      "path": ".workflow/.doc-index/feature-maps/auth.md",
      "feature_id": "feat-auth",
      "usage": "Reference for authentication requirements"
    },
    {
      "type": "requirement",
      "source": "doc-index",
      "path": ".workflow/.doc-index/doc-index.json#requirements[0]",
      "feature_id": "feat-auth",
      "requirement_id": "REQ-001",
      "usage": "Acceptance criteria source"
    },
    {
      "type": "component_doc",
      "source": "doc-index",
      "path": ".workflow/.doc-index/tech-registry/auth-service.md",
      "component_id": "tech-auth-service",
      "usage": "Implementation reference"
    }
  ]
}
```

**Loading pattern** (following brainstorm pattern from action-planning-agent.md:200-214):
- Load doc-index.json once for catalog
- Filter by task-relevant feature IDs (1-3 per task)
- Only include artifacts directly referenced in task scope
- Use relative paths from task file location

### 4.3.2 Populate Context Package Path (TASK-001)

Set context_package_path field in each TASK-*.json:

```json
{
  "context_package_path": "../.process/doc-context-package.json"
}
```

Relative path from `.task/TASK-*.json` to `.process/doc-context-package.json`.

### 4.3.3 Add Navigation Links Block (TASK-003)

Add links{} navigation block to each TASK-*.json for improved discoverability:

```json
{
  "links": {
    "plan": "../plan.json",
    "doc_index": "../../../doc-index.json",
    "feature_maps": [
      "../../../feature-maps/auth.md"
    ],
    "related_tasks": [
      "TASK-002.json",
      "TASK-003.json"
    ]
  }
}
```

**Path computation**:
- `plan`: Relative path from `.task/TASK-*.json` to `plan.json` (sibling of .task/)
- `doc_index`: Relative path to `.workflow/.doc-index/doc-index.json`
- `feature_maps`: Paths to feature-map docs from task.doc_context.feature_docs
- `related_tasks`: Task IDs from task.depends_on or tasks sharing same feature_ids

**Backward compatibility**: links{} is optional field (task-schema allows additionalProperties).

### 4.4 Output Schema: plan.json

Follows `plan-overview-base-schema` with ddd-specific `doc_context` extension:

```json
{
  "summary": "...",
  "approach": "...",
  "task_ids": ["TASK-001", "TASK-002"],
  "task_count": 2,
  "complexity": "Medium",
  "doc_context": {
    "affected_features": ["feat-auth"],
    "affected_requirements": ["REQ-001", "REQ-002"],
    "affected_components": ["tech-auth-service"],
    "architecture_constraints": ["ADR-001"],
    "index_path": ".workflow/.doc-index/doc-index.json",
    "symbol_docs": [
      {
        "symbol_urn": "deepwiki:symbol:<path>#L<start>-L<end>",
        "name": "SymbolName",
        "type": "class|function|method",
        "doc_summary": "Generated documentation summary...",
        "source_path": "src/path/to/file.ts",
        "doc_path": ".deepwiki/file.md",
        "freshness": "fresh|stale|unknown"
      }
    ]
  },
  "_metadata": {
    "timestamp": "ISO8601",
    "source": "cli-lite-planning-agent",
    "plan_type": "feature",
    "schema_version": "2.0",
    "exploration_angles": ["patterns", "security"]
  }
}
```

### 4.5 Output Schema: TASK-*.json

Follows `task-schema` with ddd-specific `doc_context` extension:

```json
{
  "id": "TASK-001",
  "title": "Add rate limiting middleware",
  "description": "...",
  "depends_on": [],
  "convergence": {
    "criteria": ["Rate limiter middleware exists and is registered", "Tests pass"],
    "verification": "npm test -- --grep rate-limit",
    "definition_of_done": "API endpoints enforce rate limits per ADR-001 specifications"
  },
  "doc_context": {
    "feature_ids": ["feat-auth"],
    "requirement_ids": ["REQ-001"],
    "component_ids": ["tech-auth-service"],
    "adr_ids": ["ADR-001"],
    "feature_docs": ["feature-maps/auth.md"],
    "component_docs": ["tech-registry/auth-service.md"],
    "symbol_docs": [
      {
        "symbol_urn": "deepwiki:symbol:<path>#L<start>-L<end>",
        "name": "SymbolName",
        "type": "class|function|method",
        "doc_summary": "Generated documentation summary...",
        "source_path": "src/path/to/file.ts",
        "doc_path": ".deepwiki/file.md",
        "freshness": "fresh|stale|unknown"
      }
    ]
  },
  "files": [...],
  "implementation": [...]
}
```

### 4.6 Enrichment Rules

Each task is enriched with:
- `feature_ids`, `requirement_ids`, `component_ids`, `adr_ids` — traced from Phase 1
- Relevant feature-map and tech-registry doc paths
- Requirement acceptance criteria as convergence criteria source
- ADR decisions as implementation constraints

---

## Phase 5: Confirmation & Handoff Selection

### 5.1 Display Plan Summary

Show:
- Plan overview (summary, approach, complexity)
- Task list with dependencies
- Doc-index impact: which features/requirements/components will be affected
- Estimated scope

### 5.2 Handoff Options

| Option | Description | When |
|--------|-------------|------|
| **ddd:execute** | Document-aware execution (recommended) | Default for ddd workflow |
| **lite-execute** | Standard execution (no doc awareness) | When doc traceability not needed |
| **direct** | Output context, manual work | User prefers manual coding |
| **stop** | Planning only, no execution | Research/analysis tasks |

### 5.3 Auto-Selection

With `-y`: auto-select `ddd:execute`.

Without `-y`: present options via AskUserQuestion.

---

## Phase 6: Handoff

### 6.1 Build Execution Context

Build `executionContext` compatible with lite-execute format:

```json
{
  "plan_path": ".workflow/.doc-index/planning/{slug}/plan.json",
  "task_dir": ".workflow/.doc-index/planning/{slug}/.task/",
  "doc_index_path": ".workflow/.doc-index/doc-index.json",
  "exploration_manifest": ".workflow/.doc-index/planning/{slug}/explorations-manifest.json",
  "original_input": "user's task description"
}
```

### 6.2 Invoke Selected Engine

| Selection | Action |
|-----------|--------|
| `ddd:execute` | Invoke `/ddd:execute --in-memory` with executionContext |
| `lite-execute` | Invoke `/workflow:lite-execute` with plan.json path |
| `direct` | Display context package + file list for manual work |
| `stop` | Output plan summary, end here |

---

## Flags

| Flag | Effect |
|------|--------|
| `-y, --yes` | Skip clarification, auto-select ddd:execute |
| `--explore` | Force Phase 2 exploration even for Low complexity |
| `--skip-explore` | Skip Phase 2 (doc-index-guided exploration) |
| `--skip-clarify` | Skip Phase 3 (clarification) only |

## Output

- **Primary**: plan.json + TASK-*.json in session folder
- **Secondary**: planning-context.md (legacy format)
- **Exploration**: exploration-{angle}.json files (if Phase 2 ran)
- **Console**: Plan summary with doc-index impact

## Integration Points

- **Input from**: `doc-index.json` (built by `/ddd:index-build` or `/ddd:scan`)
- **Output to**: `/ddd:execute`, `/workflow:lite-execute`, `/ddd:sync` post-task
- **Schemas**: `plan-overview-ddd-schema.json` (plan output), `task-schema.json` + `task-ddd-extension-schema.json` (task output), `explore-json-schema.json`
- **Triggers**: Before any development task in ddd workflow
