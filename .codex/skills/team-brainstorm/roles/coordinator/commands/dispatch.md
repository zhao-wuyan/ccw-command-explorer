# Command: Dispatch

Create the brainstorm task chain with correct dependencies and structured task descriptions based on selected pipeline mode.

## Phase 2: Context Loading

| Input | Source | Required |
|-------|--------|----------|
| User topic | From coordinator Phase 1 | Yes |
| Session folder | From coordinator Phase 2 | Yes |
| Pipeline mode | From session.json pipeline | Yes |
| Angles | From session.json angles | Yes |

1. Load topic, pipeline mode, and angles from session.json
2. Determine task chain from pipeline mode

## Phase 3: Task Chain Creation

### Task Description Template

Every task is built as a JSON entry in the tasks array:

```json
{
  "id": "<TASK-ID>",
  "title": "<TASK-ID>",
  "description": "PURPOSE: <what this task achieves> | Success: <completion criteria>\nTASK:\n  - <step 1>\n  - <step 2>\n  - <step 3>\nCONTEXT:\n  - Session: <session-folder>\n  - Topic: <topic>\n  - Angles: <angle-list>\n  - Upstream artifacts: <artifact-list>\nEXPECTED: <deliverable path> + <quality criteria>\nCONSTRAINTS: <scope limits>\n---\nInnerLoop: false",
  "status": "pending",
  "role": "<role>",
  "prefix": "<PREFIX>",
  "deps": ["<dependency-list>"],
  "findings": "",
  "error": ""
}
```

### Pipeline Router

| Mode | Action |
|------|--------|
| quick | Create 3 tasks (IDEA -> CHALLENGE -> SYNTH) |
| deep | Create 6 tasks (IDEA -> CHALLENGE -> IDEA-fix -> CHALLENGE-2 -> SYNTH -> EVAL) |
| full | Create 7 tasks (3 parallel IDEAs -> CHALLENGE -> IDEA-fix -> SYNTH -> EVAL) |

---

### Quick Pipeline

Build the tasks array and write to tasks.json:

```json
[
  {
    "id": "IDEA-001",
    "title": "IDEA-001",
    "description": "PURPOSE: Generate multi-angle ideas for brainstorm topic | Success: >= 6 unique ideas across all angles\nTASK:\n  - Read topic and angles from session context\n  - Generate 3+ ideas per angle with title, description, assumption, impact\n  - Self-review for coverage and uniqueness\nCONTEXT:\n  - Session: <session-folder>\n  - Topic: <topic>\n  - Angles: <angle-list>\nEXPECTED: <session>/ideas/idea-001.md with >= 6 ideas\nCONSTRAINTS: Divergent thinking only, no evaluation\n---\nInnerLoop: false",
    "status": "pending",
    "role": "ideator",
    "prefix": "IDEA",
    "deps": [],
    "findings": "",
    "error": ""
  },
  {
    "id": "CHALLENGE-001",
    "title": "CHALLENGE-001",
    "description": "PURPOSE: Challenge assumptions and assess feasibility of generated ideas | Success: Each idea rated by severity\nTASK:\n  - Read all idea files from ideas/ directory\n  - Challenge each idea across 4 dimensions (assumption, feasibility, risk, competition)\n  - Assign severity (CRITICAL/HIGH/MEDIUM/LOW) per idea\n  - Determine GC signal (REVISION_NEEDED or CONVERGED)\nCONTEXT:\n  - Session: <session-folder>\n  - Upstream artifacts: ideas/idea-001.md\nEXPECTED: <session>/critiques/critique-001.md with severity table and GC signal\nCONSTRAINTS: Critical analysis only, do not generate alternative ideas\n---\nInnerLoop: false",
    "status": "pending",
    "role": "challenger",
    "prefix": "CHALLENGE",
    "deps": ["IDEA-001"],
    "findings": "",
    "error": ""
  },
  {
    "id": "SYNTH-001",
    "title": "SYNTH-001",
    "description": "PURPOSE: Synthesize ideas and critiques into integrated proposals | Success: >= 1 consolidated proposal\nTASK:\n  - Read all ideas and critiques\n  - Extract themes, resolve conflicts, group complementary ideas\n  - Generate 1-3 integrated proposals with feasibility and innovation scores\nCONTEXT:\n  - Session: <session-folder>\n  - Upstream artifacts: ideas/*.md, critiques/*.md\nEXPECTED: <session>/synthesis/synthesis-001.md with proposals\nCONSTRAINTS: Integration and synthesis only, no new ideas\n---\nInnerLoop: false",
    "status": "pending",
    "role": "synthesizer",
    "prefix": "SYNTH",
    "deps": ["CHALLENGE-001"],
    "findings": "",
    "error": ""
  }
]
```

### Deep Pipeline

Creates all 6 tasks. First 2 same as Quick, then add:

**IDEA-002** (ideator, GC revision):
```json
{
  "id": "IDEA-002",
  "title": "IDEA-002",
  "description": "PURPOSE: Revise ideas based on critique feedback (GC Round 1) | Success: HIGH/CRITICAL challenges addressed\nTASK:\n  - Read critique feedback from critiques/\n  - Revise challenged ideas, replace unsalvageable ones\n  - Retain unchallenged ideas intact\nCONTEXT:\n  - Session: <session-folder>\n  - Upstream artifacts: critiques/critique-001.md\nEXPECTED: <session>/ideas/idea-002.md with revised ideas\nCONSTRAINTS: Address critique only, focused revision\n---\nInnerLoop: false",
  "status": "pending",
  "role": "ideator",
  "prefix": "IDEA",
  "deps": ["CHALLENGE-001"],
  "findings": "",
  "error": ""
}
```

**CHALLENGE-002** (challenger, round 2):
```json
{
  "id": "CHALLENGE-002",
  "title": "CHALLENGE-002",
  "description": "PURPOSE: Validate revised ideas (GC Round 2) | Success: Severity assessment of revised ideas\nTASK:\n  - Read revised idea files\n  - Re-evaluate previously challenged ideas\n  - Assess new replacement ideas\nCONTEXT:\n  - Session: <session-folder>\n  - Upstream artifacts: ideas/idea-002.md\nEXPECTED: <session>/critiques/critique-002.md\nCONSTRAINTS: Focus on revised/new ideas\n---\nInnerLoop: false",
  "status": "pending",
  "role": "challenger",
  "prefix": "CHALLENGE",
  "deps": ["IDEA-002"],
  "findings": "",
  "error": ""
}
```

**SYNTH-001** blocked by CHALLENGE-002. **EVAL-001** blocked by SYNTH-001:

```json
{
  "id": "EVAL-001",
  "title": "EVAL-001",
  "description": "PURPOSE: Score and rank synthesized proposals | Success: Ranked list with weighted scores\nTASK:\n  - Read synthesis results\n  - Score each proposal across 4 dimensions (Feasibility 30%, Innovation 25%, Impact 25%, Cost 20%)\n  - Generate final ranking and recommendation\nCONTEXT:\n  - Session: <session-folder>\n  - Upstream artifacts: synthesis/synthesis-001.md\nEXPECTED: <session>/evaluation/evaluation-001.md with scoring matrix\nCONSTRAINTS: Evaluation only, no new proposals\n---\nInnerLoop: false",
  "status": "pending",
  "role": "evaluator",
  "prefix": "EVAL",
  "deps": ["SYNTH-001"],
  "findings": "",
  "error": ""
}
```

### Full Pipeline

Creates 7 tasks. Parallel ideators:

| Task | Owner | Deps |
|------|-------|------|
| IDEA-001 | ideator-1 | (none) |
| IDEA-002 | ideator-2 | (none) |
| IDEA-003 | ideator-3 | (none) |
| CHALLENGE-001 | challenger | IDEA-001, IDEA-002, IDEA-003 |
| IDEA-004 | ideator | CHALLENGE-001 |
| SYNTH-001 | synthesizer | IDEA-004 |
| EVAL-001 | evaluator | SYNTH-001 |

Each parallel IDEA task scoped to a specific angle from the angles list.

## Phase 4: Validation

1. Verify all tasks created by reading tasks.json
2. Check dependency chain integrity:
   - No circular dependencies
   - All deps references exist
   - First task(s) have empty deps
3. Log task count and pipeline mode
