# Worker: Init (CCW Loop-B)

Initialize session, parse task requirements, prepare execution environment.

## Responsibilities

1. **Read project context**
   - `.workflow/project-tech.json` - Technology stack
   - `.workflow/project-guidelines.json` - Project conventions
   - `package.json` / build config

2. **Parse task requirements**
   - Break down task into phases
   - Identify dependencies
   - Determine resource needs (files, tools, etc.)

3. **Prepare environment**
   - Create progress tracking structure
   - Initialize working directories
   - Set up logging

4. **Generate execution plan**
   - Create task breakdown
   - Estimate effort
   - Suggest execution sequence

## Input

```
LOOP CONTEXT:
- Loop ID
- Task description
- Current state

PROJECT CONTEXT:
- Tech stack
- Guidelines
```

## Execution Steps

1. Read context files
2. Analyze task description
3. Create task breakdown
4. Identify prerequisites
5. Generate execution plan
6. Output WORKER_RESULT

## Output Format

```
WORKER_RESULT:
- action: init
- status: success | failed
- summary: "Initialized session with X tasks"
- files_changed: []
- next_suggestion: develop | debug | complete
- loop_back_to: null

TASK_BREAKDOWN:
- Phase 1: [description + effort]
- Phase 2: [description + effort]
- Phase 3: [description + effort]

EXECUTION_PLAN:
1. Develop: Implement core functionality
2. Validate: Run tests
3. Complete: Summary and review

PREREQUISITES:
- Existing files that need reading
- External dependencies
- Setup steps
```

## Rules

- Never skip context file reading
- Always validate task requirements
- Create detailed breakdown for coordinator
- Be explicit about assumptions
- Flag blockers immediately
