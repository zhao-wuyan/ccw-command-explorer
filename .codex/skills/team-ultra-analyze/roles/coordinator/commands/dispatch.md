# Command: Dispatch

Create the analysis task chain with correct dependencies and structured task descriptions. Supports Quick, Standard, and Deep pipeline modes.

## Phase 2: Context Loading

| Input | Source | Required |
|-------|--------|----------|
| User topic | From coordinator Phase 1 | Yes |
| Session folder | From coordinator Phase 2 | Yes |
| Pipeline mode | From coordinator Phase 1 | Yes |
| Perspectives | From coordinator Phase 1 (dimension detection) | Yes |

1. Load topic, pipeline mode, and selected perspectives from coordinator state
2. Load pipeline stage definitions from SKILL.md Task Metadata Registry
3. Determine depth = number of selected perspectives (Quick: always 1)

## Phase 3: Task Chain Creation

### Task Entry Template

Each task in tasks.json `tasks` object:
```json
{
  "<TASK-ID>": {
    "title": "<concise title>",
    "description": "PURPOSE: <what this task achieves> | Success: <measurable completion criteria>\nTASK:\n  - <step 1: specific action>\n  - <step 2: specific action>\n  - <step 3: specific action>\nCONTEXT:\n  - Session: <session-folder>\n  - Topic: <analysis-topic>\n  - Perspective: <perspective or 'all'>\n  - Upstream artifacts: <artifact-1>, <artifact-2>\n  - Shared memory: <session>/wisdom/.msg/meta.json\nEXPECTED: <deliverable path> + <quality criteria>\nCONSTRAINTS: <scope limits, focus areas>\n---\nInnerLoop: false",
    "role": "<role-name>",
    "prefix": "<PREFIX>",
    "deps": ["<dependency-list>"],
    "status": "pending",
    "findings": "",
    "error": ""
  }
}
```

### Mode Router

| Mode | Action |
|------|--------|
| `quick` | Create 3 tasks: EXPLORE-001 -> ANALYZE-001 -> SYNTH-001 |
| `standard` | Create N explorers + N analysts + DISCUSS-001 + SYNTH-001 |
| `deep` | Same as standard but omit SYNTH-001 (created after discussion loop) |

---

### Quick Mode Task Chain

**EXPLORE-001** (explorer):
```json
{
  "EXPLORE-001": {
    "title": "Explore codebase structure for analysis topic",
    "description": "PURPOSE: Explore codebase structure for analysis topic | Success: Key files, patterns, and findings collected\nTASK:\n  - Detect project structure and relevant modules\n  - Search for code related to analysis topic\n  - Collect file references, patterns, and key findings\nCONTEXT:\n  - Session: <session-folder>\n  - Topic: <topic>\n  - Perspective: general\n  - Dimensions: <dimensions>\n  - Shared memory: <session>/wisdom/.msg/meta.json\nEXPECTED: <session>/explorations/exploration-001.json | Structured exploration with files and findings\nCONSTRAINTS: Focus on <topic> scope\n---\nInnerLoop: false",
    "role": "explorer",
    "prefix": "EXPLORE",
    "deps": [],
    "status": "pending",
    "findings": "",
    "error": ""
  }
}
```

**ANALYZE-001** (analyst):
```json
{
  "ANALYZE-001": {
    "title": "Deep analysis from technical perspective",
    "description": "PURPOSE: Deep analysis of topic from technical perspective | Success: Actionable insights with confidence levels\nTASK:\n  - Load exploration results and build analysis context\n  - Analyze from technical perspective across selected dimensions\n  - Generate insights, findings, discussion points, recommendations\nCONTEXT:\n  - Session: <session-folder>\n  - Topic: <topic>\n  - Perspective: technical\n  - Dimensions: <dimensions>\n  - Upstream artifacts: explorations/exploration-001.json\n  - Shared memory: <session>/wisdom/.msg/meta.json\nEXPECTED: <session>/analyses/analysis-001.json | Structured analysis with evidence\nCONSTRAINTS: Focus on technical perspective | <dimensions>\n---\nInnerLoop: false",
    "role": "analyst",
    "prefix": "ANALYZE",
    "deps": ["EXPLORE-001"],
    "status": "pending",
    "findings": "",
    "error": ""
  }
}
```

**SYNTH-001** (synthesizer):
```json
{
  "SYNTH-001": {
    "title": "Integrate analysis into final conclusions",
    "description": "PURPOSE: Integrate analysis into final conclusions | Success: Executive summary with recommendations\nTASK:\n  - Load all exploration, analysis, and discussion artifacts\n  - Extract themes, consolidate evidence, prioritize recommendations\n  - Write conclusions and update discussion.md\nCONTEXT:\n  - Session: <session-folder>\n  - Topic: <topic>\n  - Upstream artifacts: explorations/*.json, analyses/*.json\n  - Shared memory: <session>/wisdom/.msg/meta.json\nEXPECTED: <session>/conclusions.json + discussion.md update | Final conclusions with confidence levels\nCONSTRAINTS: Pure integration, no new exploration\n---\nInnerLoop: false",
    "role": "synthesizer",
    "prefix": "SYNTH",
    "deps": ["ANALYZE-001"],
    "status": "pending",
    "findings": "",
    "error": ""
  }
}
```

---

### Standard Mode Task Chain

Create tasks in dependency order with parallel exploration and analysis windows:

**EXPLORE-001..N** (explorer, parallel): One per perspective. Each receives unique agent name (explorer-1, explorer-2, ...) for task discovery matching.

```json
{
  "EXPLORE-<NNN>": {
    "title": "Explore codebase from <perspective> angle",
    "description": "PURPOSE: Explore codebase from <perspective> angle | Success: Perspective-specific files and patterns collected\nTASK:\n  - Search codebase from <perspective> perspective\n  - Collect files, patterns, findings relevant to this angle\n  - Generate questions for downstream analysis\nCONTEXT:\n  - Session: <session-folder>\n  - Topic: <topic>\n  - Perspective: <perspective>\n  - Dimensions: <dimensions>\n  - Shared memory: <session>/wisdom/.msg/meta.json\nEXPECTED: <session>/explorations/exploration-<NNN>.json\nCONSTRAINTS: Focus on <perspective> angle\n---\nInnerLoop: false",
    "role": "explorer",
    "prefix": "EXPLORE",
    "deps": [],
    "status": "pending",
    "findings": "",
    "error": ""
  }
}
```

**ANALYZE-001..N** (analyst, parallel): One per perspective. Each blocked by its corresponding EXPLORE-N.

```json
{
  "ANALYZE-<NNN>": {
    "title": "Deep analysis from <perspective> perspective",
    "description": "PURPOSE: Deep analysis from <perspective> perspective | Success: Insights with confidence and evidence\nTASK:\n  - Load exploration-<NNN> results\n  - Analyze from <perspective> perspective\n  - Generate insights, discussion points, open questions\nCONTEXT:\n  - Session: <session-folder>\n  - Topic: <topic>\n  - Perspective: <perspective>\n  - Dimensions: <dimensions>\n  - Upstream artifacts: explorations/exploration-<NNN>.json\n  - Shared memory: <session>/wisdom/.msg/meta.json\nEXPECTED: <session>/analyses/analysis-<NNN>.json\nCONSTRAINTS: <perspective> perspective | <dimensions>\n---\nInnerLoop: false",
    "role": "analyst",
    "prefix": "ANALYZE",
    "deps": ["EXPLORE-<NNN>"],
    "status": "pending",
    "findings": "",
    "error": ""
  }
}
```

**DISCUSS-001** (discussant): Blocked by all ANALYZE tasks.

```json
{
  "DISCUSS-001": {
    "title": "Process analysis results into discussion summary",
    "description": "PURPOSE: Process analysis results into discussion summary | Success: Convergent themes and discussion points identified\nTASK:\n  - Aggregate all analysis results across perspectives\n  - Identify convergent themes and conflicting views\n  - Generate top discussion points and open questions\nCONTEXT:\n  - Session: <session-folder>\n  - Topic: <topic>\n  - Round: 1\n  - Type: initial\n  - Upstream artifacts: analyses/*.json\n  - Shared memory: <session>/wisdom/.msg/meta.json\nEXPECTED: <session>/discussions/discussion-round-001.json + discussion.md update\nCONSTRAINTS: Aggregate only, no new exploration\n---\nInnerLoop: false",
    "role": "discussant",
    "prefix": "DISCUSS",
    "deps": ["ANALYZE-001", "...", "ANALYZE-<N>"],
    "status": "pending",
    "findings": "",
    "error": ""
  }
}
```

**SYNTH-001** (synthesizer): Blocked by DISCUSS-001.

```json
{
  "SYNTH-001": {
    "title": "Cross-perspective integration into final conclusions",
    "description": "PURPOSE: Cross-perspective integration into final conclusions | Success: Executive summary with prioritized recommendations\n...same as Quick mode SYNTH-001 but with discussion artifacts...",
    "role": "synthesizer",
    "prefix": "SYNTH",
    "deps": ["DISCUSS-001"],
    "status": "pending",
    "findings": "",
    "error": ""
  }
}
```

---

### Deep Mode Task Chain

Same as Standard mode, but **omit SYNTH-001**. It will be created dynamically after the discussion loop completes, with deps on the last DISCUSS-N task.

---

## Discussion Loop Task Creation

Dynamic tasks added to tasks.json during discussion loop:

**DISCUSS-N** (subsequent rounds):
```json
{
  "DISCUSS-<NNN>": {
    "title": "Process discussion round <N>",
    "description": "PURPOSE: Process discussion round <N> | Success: Updated understanding with user feedback integrated\nTASK:\n  - Process user feedback: <feedback>\n  - Execute <type> discussion strategy\n  - Update discussion timeline\nCONTEXT:\n  - Session: <session-folder>\n  - Topic: <topic>\n  - Round: <N>\n  - Type: <deepen|direction-adjusted|specific-questions>\n  - User feedback: <feedback>\n  - Shared memory: <session>/wisdom/.msg/meta.json\nEXPECTED: <session>/discussions/discussion-round-<NNN>.json\n---\nInnerLoop: false",
    "role": "discussant",
    "prefix": "DISCUSS",
    "deps": [],
    "status": "pending",
    "findings": "",
    "error": ""
  }
}
```

**ANALYZE-fix-N** (direction adjustment):
```json
{
  "ANALYZE-fix-<N>": {
    "title": "Supplementary analysis with adjusted focus",
    "description": "PURPOSE: Supplementary analysis with adjusted focus | Success: New insights from adjusted direction\nTASK:\n  - Re-analyze from adjusted perspective: <adjusted_focus>\n  - Build on previous exploration findings\n  - Generate updated discussion points\nCONTEXT:\n  - Session: <session-folder>\n  - Topic: <topic>\n  - Type: direction-fix\n  - Adjusted focus: <adjusted_focus>\n  - Shared memory: <session>/wisdom/.msg/meta.json\nEXPECTED: <session>/analyses/analysis-fix-<N>.json\n---\nInnerLoop: false",
    "role": "analyst",
    "prefix": "ANALYZE",
    "deps": [],
    "status": "pending",
    "findings": "",
    "error": ""
  }
}
```

## Phase 4: Validation

Verify task chain integrity:

| Check | Method | Expected |
|-------|--------|----------|
| Task count correct | tasks.json count | quick: 3, standard: 2N+2, deep: 2N+1 |
| Dependencies correct | Trace deps | Acyclic, correct ordering |
| All descriptions have PURPOSE/TASK/CONTEXT/EXPECTED | Pattern check | All present |
| Session path in every task | Check CONTEXT | Session: <folder> present |
