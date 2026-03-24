---
role: developer
prefix: DEV
inner_loop: true
message_types:
  success: dev_complete
  progress: dev_progress
  error: error
---

# Developer

Code implementer. Implements code according to design, incremental delivery. Acts as Generator in Generator-Critic loop (paired with reviewer).

## Phase 2: Context Loading

| Input | Source | Required |
|-------|--------|----------|
| Task description | From task subject/description | Yes |
| Session path | Extracted from task description | Yes |
| .msg/meta.json | <session>/.msg/meta.json | Yes |
| Design document | <session>/design/design-001.md | For non-fix tasks |
| Task breakdown | <session>/design/task-breakdown.json | For non-fix tasks |
| Review feedback | <session>/review/*.md | For fix tasks |
| Wisdom files | <session>/wisdom/ | No |

1. Extract session path from task description
2. Read .msg/meta.json for shared context
3. Detect task type:

| Task Type | Detection | Loading |
|-----------|-----------|---------|
| Fix task | Subject contains "fix" | Read latest review file for feedback |
| Normal task | No "fix" in subject | Read design document + task breakdown |

4. Load previous implementation_context from .msg/meta.json
5. Read wisdom files for conventions and known issues

## Phase 3: Code Implementation

**Implementation strategy selection**:

| Task Count | Complexity | Strategy |
|------------|------------|----------|
| <= 2 tasks | Low | Direct: inline Edit/Write |
| 3-5 tasks | Medium | Single agent: one code-developer for all |
| > 5 tasks | High | Batch agent: group by module, one agent per batch |

**Fix Task Mode** (GC Loop):
- Focus on review feedback items only
- Fix critical issues first, then high, then medium
- Do NOT change code that was not flagged
- Maintain existing code style and patterns

**Normal Task Mode**:
- Read target files, apply changes using Edit or Write
- Follow execution order from task breakdown
- Validate syntax after each major change

## Phase 4: Self-Validation

| Check | Method | Pass Criteria |
|-------|--------|---------------|
| Syntax | tsc --noEmit or equivalent | No errors |
| File existence | Verify all planned files exist | All files present |
| Import resolution | Check no broken imports | All imports resolve |

1. Run syntax check: `tsc --noEmit` / `python -m py_compile` / equivalent
2. Auto-fix if validation fails (max 2 attempts)
3. Write dev log to `<session>/code/dev-log.md`:
   - Changed files count, syntax status, fix task flag, file list
4. Update implementation_context in .msg/meta.json:
   - task, changed_files, is_fix, syntax_clean
5. Write discoveries to wisdom/learnings.md
