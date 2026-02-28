# Command: monitor

Stop-Wait phase execution loop. Spawns workers synchronously and manages phase transitions.

## Purpose

Execute all roadmap phases sequentially using the Stop-Wait pattern. The coordinator spawns each worker synchronously (run_in_background: false), waits for completion, then proceeds to the next step. Handles gap closure loops and phase transitions.

## Design Principle

Models have no concept of time. Polling, sleeping, and periodic checking are forbidden. All coordination uses synchronous Task() calls where worker return = step done.

## Strategy

Sequential spawning -- coordinator spawns one worker at a time via synchronous Task() calls. Each worker processes its task and returns. The coordinator inspects the result and decides the next action.

```
Coordinator ──spawn──→ Planner (blocks until done)
            ←─return──
            ──spawn──→ Executor (blocks until done)
            ←─return──
            ──spawn──→ Verifier (blocks until done)
            ←─return──
            ──decide──→ next phase or gap closure
```

## Parameters

| Parameter | Source | Description |
|-----------|--------|-------------|
| `sessionFolder` | From coordinator | Session artifact directory |
| `roadmap` | From roadmap.md | Parsed phase list |
| `config` | From config.json | Execution mode and gates |
| `resumePhase` | From resume command (optional) | Phase to resume from |
| `resumeStep` | From resume command (optional) | Step within phase to resume from (plan/exec/verify/gap_closure) |
| `resumeGapIteration` | From resume command (optional) | Gap iteration to resume from |

## Execution Steps

### Step 1: Load Session State

```javascript
const roadmap = Read(`${sessionFolder}/roadmap.md`)
const config = JSON.parse(Read(`${sessionFolder}/config.json`))
const state = Read(`${sessionFolder}/state.md`)

const totalPhases = countPhases(roadmap)

// Support resume: use resume coordinates if provided, else parse from state
const currentPhase = resumePhase || parseCurrentPhase(state)
const startStep = resumeStep || 'plan'  // plan|exec|verify|gap_closure
const startGapIteration = resumeGapIteration || 0
```

### Step 2: Phase Loop

```javascript
for (let phase = currentPhase; phase <= totalPhases; phase++) {

  // --- Phase N execution ---

  // 2a. Dispatch task chain (if not already dispatched)
  // Read("commands/dispatch.md") → creates PLAN/EXEC/VERIFY tasks
  dispatch(phase, sessionFolder)

  let phaseComplete = false
  let gapIteration = 0
  const MAX_GAP_ITERATIONS = 3

  while (!phaseComplete && gapIteration <= MAX_GAP_ITERATIONS) {

    // 2b. Spawn Planner (Stop-Wait)
    const planResult = spawnPlanner(phase, gapIteration, sessionFolder)

    // 2c. Gate: plan_check (if configured)
    if (config.gates.plan_check && gapIteration === 0) {
      const plans = Glob(`${sessionFolder}/phase-${phase}/plan-*.md`)
      // Present plan summary to user
      AskUserQuestion({
        questions: [{
          question: `Phase ${phase} plan ready. Proceed with execution?`,
          header: "Plan Review",
          multiSelect: false,
          options: [
            { label: "Proceed", description: "Execute the plan as-is" },
            { label: "Revise", description: "Ask planner to revise" },
            { label: "Skip phase", description: "Skip this phase entirely" }
          ]
        }]
      })
      // Handle "Revise" → re-spawn planner
      // Handle "Skip phase" → break to next phase
    }

    // 2d. Spawn Executor (Stop-Wait)
    const execResult = spawnExecutor(phase, gapIteration, sessionFolder)

    // 2e. Spawn Verifier (Stop-Wait)
    const verifyResult = spawnVerifier(phase, gapIteration, sessionFolder)

    // 2f. Check verification result
    const verification = Read(`${sessionFolder}/phase-${phase}/verification.md`)
    const gapsFound = parseGapsFound(verification)

    if (!gapsFound || gapsFound.length === 0) {
      // Phase passed
      phaseComplete = true
    } else if (gapIteration < MAX_GAP_ITERATIONS) {
      // Gap closure: create new task chain for gaps
      gapIteration++
      triggerGapClosure(phase, gapIteration, gapsFound, sessionFolder)
    } else {
      // Max iterations reached, report to user
      AskUserQuestion({
        questions: [{
          question: `Phase ${phase} still has ${gapsFound.length} gaps after ${MAX_GAP_ITERATIONS} attempts. How to proceed?`,
          header: "Gap Closure Limit",
          multiSelect: false,
          options: [
            { label: "Continue anyway", description: "Accept current state, move to next phase" },
            { label: "Retry once more", description: "One more gap closure attempt" },
            { label: "Stop", description: "Halt execution for manual intervention" }
          ]
        }]
      })
      // Handle user choice
      phaseComplete = true // or stop based on choice
    }
  }

  // 2g. Phase transition
  updateStatePhaseComplete(phase, sessionFolder)

  // 2h. Interactive gate at phase boundary
  if (config.mode === "interactive" && phase < totalPhases) {
    AskUserQuestion({
      questions: [{
        question: `Phase ${phase} complete. Proceed to phase ${phase + 1}?`,
        header: "Phase Transition",
        multiSelect: false,
        options: [
          { label: "Proceed", description: `Start phase ${phase + 1}` },
          { label: "Review results", description: "Show phase summary before continuing" },
          { label: "Stop", description: "Pause execution here" }
        ]
      }]
    })
    // Handle "Review results" → display summary, then re-ask
    // Handle "Stop" → invoke pause command
    if (userChoice === "Stop") {
      Read("commands/pause.md")
      // Execute pause: save state with currentPhase, currentStep, gapIteration
      pauseSession(phase, "transition", gapIteration, sessionFolder)
      return  // Exit monitor loop
    }
  }
  // If mode === "yolo": auto-advance, no user interaction
}
```

### Step 3: Spawn Functions (Stop-Wait Pattern)

#### Spawn Planner

```javascript
function spawnPlanner(phase, gapIteration, sessionFolder) {
  const suffix = gapIteration === 0 ? "01" : `0${gapIteration + 1}`
  const gapContext = gapIteration > 0
    ? `\nGap closure iteration ${gapIteration}. Fix gaps from: ${sessionFolder}/phase-${phase}/verification.md`
    : ""

  // Synchronous call - blocks until planner returns
  Task({
    subagent_type: "general-purpose",
    description: `Spawn planner worker for phase ${phase}`,
    team_name: "roadmap-dev",
    name: "planner",
    prompt: `You are the PLANNER for team "roadmap-dev".

## Primary Directive
Skill(skill="team-roadmap-dev", args="--role=planner")

## Assignment
- Session: ${sessionFolder}
- Phase: ${phase}
- Task: PLAN-${phase}${suffix}${gapContext}

## Workflow
1. Skill(skill="team-roadmap-dev", args="--role=planner")
2. TaskList → find PLAN-${phase}${suffix} → execute
3. TaskUpdate completed when done

All outputs carry [planner] tag.`,
    run_in_background: false  // CRITICAL: Stop-Wait, blocks until done
  })
}
```

#### Spawn Executor

```javascript
function spawnExecutor(phase, gapIteration, sessionFolder) {
  const suffix = gapIteration === 0 ? "01" : `0${gapIteration + 1}`

  Task({
    subagent_type: "general-purpose",
    description: `Spawn executor worker for phase ${phase}`,
    team_name: "roadmap-dev",
    name: "executor",
    prompt: `You are the EXECUTOR for team "roadmap-dev".

## Primary Directive
Skill(skill="team-roadmap-dev", args="--role=executor")

## Assignment
- Session: ${sessionFolder}
- Phase: ${phase}
- Task: EXEC-${phase}${suffix}

## Workflow
1. Skill(skill="team-roadmap-dev", args="--role=executor")
2. TaskList → find EXEC-${phase}${suffix} → execute plans
3. TaskUpdate completed when done

All outputs carry [executor] tag.`,
    run_in_background: false  // CRITICAL: Stop-Wait
  })
}
```

#### Spawn Verifier

```javascript
function spawnVerifier(phase, gapIteration, sessionFolder) {
  const suffix = gapIteration === 0 ? "01" : `0${gapIteration + 1}`

  Task({
    subagent_type: "general-purpose",
    description: `Spawn verifier worker for phase ${phase}`,
    team_name: "roadmap-dev",
    name: "verifier",
    prompt: `You are the VERIFIER for team "roadmap-dev".

## Primary Directive
Skill(skill="team-roadmap-dev", args="--role=verifier")

## Assignment
- Session: ${sessionFolder}
- Phase: ${phase}
- Task: VERIFY-${phase}${suffix}

## Workflow
1. Skill(skill="team-roadmap-dev", args="--role=verifier")
2. TaskList → find VERIFY-${phase}${suffix} → verify against success criteria
3. TaskUpdate completed when done

All outputs carry [verifier] tag.`,
    run_in_background: false  // CRITICAL: Stop-Wait
  })
}
```

### Step 4: Gap Closure

```javascript
function triggerGapClosure(phase, iteration, gaps, sessionFolder) {
  const suffix = `0${iteration + 1}`

  // Log gap closure initiation
  mcp__ccw-tools__team_msg({
    operation: "log", team: sessionId  // MUST be session ID (e.g., RD-xxx-date), NOT team name,
    from: "coordinator", to: "planner",
    type: "gap_closure",
    summary: `[coordinator] Gap closure iteration ${iteration} for phase ${phase}: ${gaps.length} gaps`,
    ref: `${sessionFolder}/phase-${phase}/verification.md`
  })

  // Create new task chain for gap closure
  // PLAN-{phase}{suffix}: re-plan focusing on gaps only
  TaskCreate({
    subject: `PLAN-${phase}${suffix}: Gap closure for phase ${phase} (iteration ${iteration})`,
    description: `[coordinator] Gap closure re-planning for phase ${phase}.

## Session
- Folder: ${sessionFolder}
- Phase: ${phase}
- Gap Iteration: ${iteration}

## Gaps to Address
${gaps.map(g => `- ${g}`).join('\n')}

## Reference
- Original verification: ${sessionFolder}/phase-${phase}/verification.md
- Previous plans: ${sessionFolder}/phase-${phase}/plan-*.md

## Instructions
1. Focus ONLY on the listed gaps -- do not re-plan completed work
2. Create ${sessionFolder}/phase-${phase}/plan-${suffix}.md for gap fixes
3. TaskUpdate completed when gap plan is written`,
    activeForm: `Re-planning phase ${phase} gaps (iteration ${iteration})`
  })

  // EXEC and VERIFY tasks follow same pattern with blockedBy
  // (same as dispatch.md Step 4 and Step 5, with gap suffix)
}
```

### Step 5: State Updates

```javascript
function updateStatePhaseComplete(phase, sessionFolder) {
  const state = Read(`${sessionFolder}/state.md`)

  // Update current phase status
  Edit(`${sessionFolder}/state.md`, {
    old_string: `- Phase: ${phase}\n- Status: in_progress`,
    new_string: `- Phase: ${phase}\n- Status: completed\n- Completed: ${new Date().toISOString().slice(0, 19)}`
  })

  // If more phases remain, set next phase as ready
  const nextPhase = phase + 1
  if (nextPhase <= totalPhases) {
    // Append next phase readiness
    Edit(`${sessionFolder}/state.md`, {
      old_string: `- Phase: ${phase}\n- Status: completed`,
      new_string: `- Phase: ${phase}\n- Status: completed\n\n- Phase: ${nextPhase}\n- Status: ready_to_dispatch`
    })
  }
}
```

### Step 6: Completion

```javascript
// All phases done -- return control to coordinator Phase 5 (Report + Persist)
mcp__ccw-tools__team_msg({
  operation: "log", team: sessionId  // MUST be session ID (e.g., RD-xxx-date), NOT team name,
  from: "coordinator", to: "all",
  type: "project_complete",
  summary: `[coordinator] All ${totalPhases} phases complete.`,
  ref: `${sessionFolder}/roadmap.md`
})
```

## Gap Closure Loop Diagram

```
VERIFY-{N}01 → gaps_found?
  │ NO → Phase complete → next phase
  │ YES ↓
  PLAN-{N}02 (gaps only) → EXEC-{N}02 → VERIFY-{N}02
    │ gaps_found?
    │ NO → Phase complete
    │ YES ↓
    PLAN-{N}03 → EXEC-{N}03 → VERIFY-{N}03
      │ gaps_found?
      │ NO → Phase complete
      │ YES → Max iterations (3) → ask user
```

## Forbidden Patterns

| Pattern | Why Forbidden | Alternative |
|---------|---------------|-------------|
| `setTimeout` / `sleep` | Models have no time concept | Synchronous Task() return |
| `setInterval` / polling loop | Wastes tokens, unreliable | Stop-Wait spawn pattern |
| `TaskOutput` with sleep polling | Indirect, fragile | `run_in_background: false` |
| `while (!done) { check() }` | Busy wait, no progress | Sequential synchronous calls |

## Error Handling

| Scenario | Resolution |
|----------|------------|
| Worker Task() throws error | Log error, retry once. If still fails, report to user |
| Verification file missing | Treat as gap -- verifier may have crashed, re-spawn |
| Phase dispatch fails | Check roadmap integrity, report to user |
| User chooses "Stop" at gate | Invoke pause command: save state.md with coordinates, exit cleanly |
| Max gap iterations exceeded | Present to user with gap details, ask for guidance |
