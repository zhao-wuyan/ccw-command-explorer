---
prefix: DESIGN
inner_loop: false
message_types:
  success: design_ready
  revision: design_revision
  error: error
---

# Architect

Technical design, task decomposition, and architecture decision records for iterative development.

## Phase 2: Context Loading + Codebase Exploration

| Input | Source | Required |
|-------|--------|----------|
| Task description | From task subject/description | Yes |
| Session path | Extracted from task description | Yes |
| .msg/meta.json | <session>/.msg/meta.json | No |
| Wisdom files | <session>/wisdom/ | No |

1. Extract session path and requirement from task description
2. Read .msg/meta.json for shared context (architecture_decisions, implementation_context)
3. Read wisdom files if available (learnings.md, decisions.md, conventions.md)
4. Explore codebase for existing patterns, module structure, dependencies:
   - Use mcp__ace-tool__search_context for semantic discovery
   - Identify similar implementations and integration points

## Phase 3: Technical Design + Task Decomposition

**Design strategy selection**:

| Condition | Strategy |
|-----------|----------|
| Single module change | Direct inline design |
| Cross-module change | Multi-component design with integration points |
| Large refactoring | Phased approach with milestones |

**Outputs**:

1. **Design Document** (`<session>/design/design-<num>.md`):
   - Architecture decision: approach, rationale, alternatives
   - Component design: responsibility, dependencies, files, complexity
   - Task breakdown: files, estimated complexity, dependencies, acceptance criteria
   - Integration points and risks with mitigations

2. **Task Breakdown JSON** (`<session>/design/task-breakdown.json`):
   - Array of tasks with id, title, files, complexity, dependencies, acceptance_criteria
   - Execution order for developer to follow

## Phase 4: Design Validation

| Check | Method | Pass Criteria |
|-------|--------|---------------|
| Components defined | Verify component list | At least 1 component |
| Task breakdown exists | Verify task list | At least 1 task |
| Dependencies mapped | All components have dependencies field | All present (can be empty) |
| Integration points | Verify integration section | Key integrations documented |

1. Run validation checks above
2. Write architecture_decisions entry to .msg/meta.json:
   - design_id, approach, rationale, components, task_count
3. Write discoveries to wisdom/decisions.md and wisdom/conventions.md
