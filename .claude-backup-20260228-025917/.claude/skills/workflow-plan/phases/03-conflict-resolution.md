# Phase 3: Conflict Resolution

Detect and resolve conflicts with CLI analysis. This phase is **conditional** - only executes when `conflict_risk >= medium`.

## Objective

- Detect conflicts between planned changes and existing codebase
- Detect module scenario uniqueness (functional overlaps)
- Present conflicts to user with resolution strategies
- Apply selected resolution strategies
- Update planning-notes.md with conflict decisions

## Trigger Condition

Only execute when context-package.json indicates `conflict_risk` is "medium" or "high".
If `conflict_risk` is "none" or "low", skip directly to Phase 4.

## Conflict Categories

| Category | Description |
|----------|-------------|
| **Architecture** | Incompatible design patterns, module structure changes |
| **API** | Breaking contract changes, signature modifications |
| **Data Model** | Schema modifications, type breaking changes |
| **Dependency** | Version incompatibilities, setup conflicts |
| **ModuleOverlap** | Functional overlap, scenario boundary ambiguity, duplicate responsibility |

## Execution

### Step 3.1: Validation

```javascript
// 1. Verify session directory exists
const sessionDir = `.workflow/active/${sessionId}`;
if (!file_exists(sessionDir)) {
  throw new Error(`Session directory not found: ${sessionDir}`);
}

// 2. Load context-package.json
const contextPackage = JSON.parse(Read(contextPath));

// 3. Check conflict_risk (skip if none/low)
const conflictRisk = contextPackage.conflict_detection?.risk_level || 'low';
if (conflictRisk === 'none' || conflictRisk === 'low') {
  console.log("No significant conflicts detected, proceeding to task generation");
  // Skip directly to Phase 4
  return;
}
```

### Step 3.2: CLI-Powered Conflict Analysis

**Agent Delegation**:

```javascript
Task(subagent_type="cli-execution-agent", run_in_background=false, prompt=`
  ## Context
  - Session: ${sessionId}
  - Risk: ${conflictRisk}
  - Files: ${existing_files_list}

  ## Exploration Context (from context-package.exploration_results)
  - Exploration Count: ${contextPackage.exploration_results?.exploration_count || 0}
  - Angles Analyzed: ${JSON.stringify(contextPackage.exploration_results?.angles || [])}
  - Pre-identified Conflict Indicators: ${JSON.stringify(contextPackage.exploration_results?.aggregated_insights?.conflict_indicators || [])}
  - Critical Files: ${JSON.stringify(contextPackage.exploration_results?.aggregated_insights?.critical_files?.map(f => f.path) || [])}
  - All Patterns: ${JSON.stringify(contextPackage.exploration_results?.aggregated_insights?.all_patterns || [])}
  - All Integration Points: ${JSON.stringify(contextPackage.exploration_results?.aggregated_insights?.all_integration_points || [])}

  ## Analysis Steps

  ### 0. Load Output Schema (MANDATORY)
  Execute: cat ~/.ccw/workflows/cli-templates/schemas/conflict-resolution-schema.json

  ### 1. Load Context
  - Read existing files from conflict_detection.existing_files
  - Load plan from .workflow/active/${sessionId}/.process/context-package.json
  - Load exploration_results and use aggregated_insights for enhanced analysis
  - Extract role analyses and requirements

  ### 2. Execute CLI Analysis (Enhanced with Exploration + Scenario Uniqueness)

  Primary (Gemini):
  ccw cli -p "
  PURPOSE: Detect conflicts between plan and codebase, using exploration insights
  TASK:
  * Review pre-identified conflict_indicators from exploration results
  * Compare architectures (use exploration key_patterns)
  * Identify breaking API changes
  * Detect data model incompatibilities
  * Assess dependency conflicts
  * Analyze module scenario uniqueness
    - Use exploration integration_points for precise locations
    - Cross-validate with exploration critical_files
    - Generate clarification questions for boundary definition
  MODE: analysis
  CONTEXT: @**/*.ts @**/*.js @**/*.tsx @**/*.jsx @.workflow/active/${sessionId}/**/*
  EXPECTED: Conflict list with severity ratings, including:
    - Validation of exploration conflict_indicators
    - ModuleOverlap conflicts with overlap_analysis
    - Targeted clarification questions
  CONSTRAINTS: Focus on breaking changes, migration needs, and functional overlaps | Prioritize exploration-identified conflicts | analysis=READ-ONLY
  " --tool gemini --mode analysis --rule analysis-code-patterns --cd {project_root}

  Fallback: Qwen (same prompt) -> Claude (manual analysis)

  ### 3. Generate Strategies (2-4 per conflict)

  Template per conflict:
  - Severity: Critical/High/Medium
  - Category: Architecture/API/Data/Dependency/ModuleOverlap
  - Affected files + impact
  - For ModuleOverlap: Include overlap_analysis with existing modules and scenarios
  - Options with pros/cons, effort, risk
  - For ModuleOverlap strategies: Add clarification_needed questions for boundary definition
  - Recommended strategy + rationale

  ### 4. Return Structured Conflict Data

  Output to conflict-resolution.json (generated in Phase 4)

  **Schema Reference**: Execute cat ~/.ccw/workflows/cli-templates/schemas/conflict-resolution-schema.json to get full schema

  Return JSON following the schema. Key requirements:
  - Minimum 2 strategies per conflict, max 4
  - All text in Chinese for user-facing fields (brief, name, pros, cons, modification_suggestions)
  - modifications.old_content: 20-100 chars for unique Edit tool matching
  - modifications.new_content: preserves markdown formatting
  - modification_suggestions: 2-5 actionable suggestions for custom handling

  ### 5. Planning Notes Record (REQUIRED)
  After analysis complete, append to planning-notes.md:

  **File**: .workflow/active/${sessionId}/planning-notes.md
  **Location**: Under "## Conflict Decisions (Phase 3)" section
  **Format**:
  ### [Conflict-Resolution Agent] YYYY-MM-DD
  - **Note**: [Brief summary of conflict types, strategies, key decisions]
`)
```

### Step 3.3: Iterative User Interaction

```javascript
const autoYes = workflowPreferences?.autoYes || false;

FOR each conflict:
  round = 0, clarified = false, userClarifications = []

  WHILE (!clarified && round++ < 10):
    // 1. Display conflict info (text output for context)
    displayConflictSummary(conflict)  // id, brief, severity, overlap_analysis if ModuleOverlap

    // 2. Strategy selection
    if (autoYes) {
      console.log(`[autoYes] Auto-selecting recommended strategy`)
      selectedStrategy = conflict.strategies[conflict.recommended || 0]
      clarified = true  // Skip clarification loop
    } else {
      AskUserQuestion({
        questions: [{
          question: formatStrategiesForDisplay(conflict.strategies),
          header: "Strategy",
          multiSelect: false,
          options: [
            ...conflict.strategies.map((s, i) => ({
              label: `${s.name}${i === conflict.recommended ? ' (Recommended)' : ''}`,
              description: `${s.complexity} complexity | ${s.risk} risk${s.clarification_needed?.length ? ' | Needs clarification' : ''}`
            })),
            { label: "Custom modification", description: `Suggestions: ${conflict.modification_suggestions?.slice(0,2).join('; ')}` }
          ]
        }]
      })

      // 3. Handle selection
      if (userChoice === "Custom modification") {
        customConflicts.push({ id, brief, category, suggestions, overlap_analysis })
        break
      }

      selectedStrategy = findStrategyByName(userChoice)
    }

    // 4. Clarification (if needed) - batched max 4 per call
    if (!autoYes && selectedStrategy.clarification_needed?.length > 0) {
      for (batch of chunk(selectedStrategy.clarification_needed, 4)) {
        AskUserQuestion({
          questions: batch.map((q, i) => ({
            question: q, header: `Clarify${i+1}`, multiSelect: false,
            options: [{ label: "Provide details", description: "Enter answer" }]
          }))
        })
        userClarifications.push(...collectAnswers(batch))
      }

      // 5. Agent re-analysis
      reanalysisResult = Task({
        subagent_type: "cli-execution-agent",
        run_in_background: false,
        prompt: `Conflict: ${conflict.id}, Strategy: ${selectedStrategy.name}
User Clarifications: ${JSON.stringify(userClarifications)}
Output: { uniqueness_confirmed, rationale, updated_strategy, remaining_questions }`
      })

      if (reanalysisResult.uniqueness_confirmed) {
        selectedStrategy = { ...reanalysisResult.updated_strategy, clarifications: userClarifications }
        clarified = true
      } else {
        selectedStrategy.clarification_needed = reanalysisResult.remaining_questions
      }
    } else {
      clarified = true
    }

    if (clarified) resolvedConflicts.push({ conflict, strategy: selectedStrategy })
  END WHILE
END FOR

selectedStrategies = resolvedConflicts.map(r => ({
  conflict_id: r.conflict.id, strategy: r.strategy, clarifications: r.strategy.clarifications || []
}))
```

### Step 3.4: Apply Modifications

```javascript
// 1. Extract modifications from resolved strategies
const modifications = [];
selectedStrategies.forEach(item => {
  if (item.strategy && item.strategy.modifications) {
    modifications.push(...item.strategy.modifications.map(mod => ({
      ...mod,
      conflict_id: item.conflict_id,
      clarifications: item.clarifications
    })));
  }
});

console.log(`Applying ${modifications.length} modifications...`);

// 2. Apply each modification using Edit tool (with fallback to context-package.json)
const appliedModifications = [];
const failedModifications = [];
const fallbackConstraints = [];  // For files that don't exist

modifications.forEach((mod, idx) => {
  try {
    console.log(`[${idx + 1}/${modifications.length}] Modifying ${mod.file}...`);

    // Check if target file exists (brainstorm files may not exist in lite workflow)
    if (!file_exists(mod.file)) {
      console.log(`  File not found, writing to context-package.json as constraint`);
      fallbackConstraints.push({
        source: "conflict-resolution",
        conflict_id: mod.conflict_id,
        target_file: mod.file,
        section: mod.section,
        change_type: mod.change_type,
        content: mod.new_content,
        rationale: mod.rationale
      });
      return;  // Skip to next modification
    }

    if (mod.change_type === "update") {
      Edit({ file_path: mod.file, old_string: mod.old_content, new_string: mod.new_content });
    } else if (mod.change_type === "add") {
      const fileContent = Read(mod.file);
      const updated = insertContentAfterSection(fileContent, mod.section, mod.new_content);
      Write(mod.file, updated);
    } else if (mod.change_type === "remove") {
      Edit({ file_path: mod.file, old_string: mod.old_content, new_string: "" });
    }

    appliedModifications.push(mod);
    console.log(`  Success`);
  } catch (error) {
    console.log(`  Failed: ${error.message}`);
    failedModifications.push({ ...mod, error: error.message });
  }
});

// 3. Generate conflict-resolution.json output file
const resolutionOutput = {
  session_id: sessionId,
  resolved_at: new Date().toISOString(),
  summary: {
    total_conflicts: conflicts.length,
    resolved_with_strategy: selectedStrategies.length,
    custom_handling: customConflicts.length,
    fallback_constraints: fallbackConstraints.length
  },
  resolved_conflicts: selectedStrategies.map(s => ({
    conflict_id: s.conflict_id,
    strategy_name: s.strategy.name,
    strategy_approach: s.strategy.approach,
    clarifications: s.clarifications || [],
    modifications_applied: s.strategy.modifications?.filter(m =>
      appliedModifications.some(am => am.conflict_id === s.conflict_id)
    ) || []
  })),
  custom_conflicts: customConflicts.map(c => ({
    id: c.id, brief: c.brief, category: c.category,
    suggestions: c.suggestions, overlap_analysis: c.overlap_analysis || null
  })),
  planning_constraints: fallbackConstraints,
  failed_modifications: failedModifications
};

const resolutionPath = `.workflow/active/${sessionId}/.process/conflict-resolution.json`;
Write(resolutionPath, JSON.stringify(resolutionOutput, null, 2));

// 4. Update context-package.json with resolution details
const contextPkg = JSON.parse(Read(contextPath));
contextPkg.conflict_detection.conflict_risk = "resolved";
contextPkg.conflict_detection.resolution_file = resolutionPath;
contextPkg.conflict_detection.resolved_conflicts = selectedStrategies.map(s => s.conflict_id);
contextPkg.conflict_detection.custom_conflicts = customConflicts.map(c => c.id);
contextPkg.conflict_detection.resolved_at = new Date().toISOString();
Write(contextPath, JSON.stringify(contextPkg, null, 2));

// 5. Output custom conflict summary with overlap analysis (if any)
if (customConflicts.length > 0) {
  customConflicts.forEach(conflict => {
    console.log(`[${conflict.category}] ${conflict.id}: ${conflict.brief}`);
    if (conflict.category === 'ModuleOverlap' && conflict.overlap_analysis) {
      console.log(`Overlap info: New module: ${conflict.overlap_analysis.new_module.name}`);
    }
    conflict.suggestions.forEach(s => console.log(`  - ${s}`));
  });
}
```

### TodoWrite Update (Phase 3 in progress, if conflict_risk >= medium)

```json
[
  {"content": "Phase 1: Session Discovery", "status": "completed", "activeForm": "Executing session discovery"},
  {"content": "Phase 2: Context Gathering", "status": "completed", "activeForm": "Executing context gathering"},
  {"content": "Phase 3: Conflict Resolution", "status": "in_progress", "activeForm": "Resolving conflicts"},
  {"content": "  -> Detect conflicts with CLI analysis", "status": "in_progress", "activeForm": "Detecting conflicts"},
  {"content": "  -> Present conflicts to user", "status": "pending", "activeForm": "Presenting conflicts"},
  {"content": "  -> Apply resolution strategies", "status": "pending", "activeForm": "Applying resolution strategies"},
  {"content": "Phase 4: Task Generation", "status": "pending", "activeForm": "Executing task generation"}
]
```

### TodoWrite Update (Phase 3 completed - tasks collapsed)

```json
[
  {"content": "Phase 1: Session Discovery", "status": "completed", "activeForm": "Executing session discovery"},
  {"content": "Phase 2: Context Gathering", "status": "completed", "activeForm": "Executing context gathering"},
  {"content": "Phase 3: Conflict Resolution", "status": "completed", "activeForm": "Resolving conflicts"},
  {"content": "Phase 4: Task Generation", "status": "pending", "activeForm": "Executing task generation"}
]
```

### Step 3.5: Update Planning Notes

After conflict resolution completes (if executed), update planning-notes.md:

```javascript
if (conflictRisk === 'medium' || conflictRisk === 'high') {
  const conflictResPath = `.workflow/active/${sessionId}/.process/conflict-resolution.json`;

  if (file_exists(conflictResPath)) {
    const conflictRes = JSON.parse(Read(conflictResPath));
    const resolved = conflictRes.resolved_conflicts || [];
    const modifiedArtifacts = conflictRes.modified_artifacts || [];
    const planningConstraints = conflictRes.planning_constraints || [];

    // Update Phase 3 section
    Edit(planningNotesPath, {
      old: '## Conflict Decisions (Phase 3)\n(To be filled if conflicts detected)',
      new: `## Conflict Decisions (Phase 3)

- **RESOLVED**: ${resolved.map(r => `${r.type} -> ${r.strategy}`).join('; ') || 'None'}
- **MODIFIED_ARTIFACTS**: ${modifiedArtifacts.join(', ') || 'None'}
- **CONSTRAINTS**: ${planningConstraints.join('; ') || 'None'}`
    })

    // Append Phase 3 constraints to consolidated list
    if (planningConstraints.length > 0) {
      const currentNotes = Read(planningNotesPath);
      const constraintCount = (currentNotes.match(/^\d+\./gm) || []).length;

      Edit(planningNotesPath, {
        old: '## Consolidated Constraints (Phase 4 Input)',
        new: `## Consolidated Constraints (Phase 4 Input)
${planningConstraints.map((c, i) => `${constraintCount + i + 1}. [Conflict] ${c}`).join('\n')}`
      })
    }
  }
}
```

**Auto-Continue**: Return to user showing conflict resolution results and selected strategies, then auto-continue.

**Auto Mode**: When `workflowPreferences.autoYes` is true, conflict-resolution automatically applies recommended resolution strategies without user confirmation.

### Step 3.6: Memory State Check

Evaluate current context window usage and memory state:

- If memory usage is high (>120K tokens or approaching context limits):

```javascript
Skill(skill="memory-capture")
```

- Memory compaction is particularly important after analysis phase which may generate extensive documentation
- Ensures optimal performance and prevents context overflow

## Output

- **File**: `conflict-resolution.json` (if conflicts resolved)
- **TodoWrite**: Mark Phase 3 completed, Phase 4 in_progress

## Next Phase

Return to orchestrator, then auto-continue to [Phase 4: Task Generation](04-task-generation.md).
