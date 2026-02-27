# Quality Standards

Quality gates and requirements for project analysis reports.

## When to Use

| Phase | Usage | Section |
|-------|-------|---------|
| Phase 4 | Check report structure before assembly | Report Requirements |
| Phase 5 | Validate before each iteration | Quality Gates |
| Phase 5 | Handle failures during refinement | Error Handling |

---

## Report Requirements

**Use in Phase 4**: Ensure report includes all required elements.

| Requirement | Check | How to Fix |
|-------------|-------|------------|
| Executive Summary | 3-5 key takeaways | Extract from analysis findings |
| Visual diagrams | Valid Mermaid syntax | Use `../_shared/mermaid-utils.md` |
| Code references | `file:line` format | Link to actual source locations |
| Recommendations | Actionable, specific | Derive from analysis insights |
| Consistent depth | Match user's depth level | Adjust detail per config.depth |

---

## Quality Gates

**Use in Phase 5**: Run these checks before asking user questions.

```javascript
function runQualityGates(report, config, diagrams) {
  const gates = [
    {
      name: "focus_areas_covered",
      check: () => config.focus_areas.every(area =>
        report.toLowerCase().includes(area.toLowerCase())
      ),
      fix: "Re-analyze missing focus areas"
    },
    {
      name: "diagrams_valid",
      check: () => diagrams.every(d => d.valid),
      fix: "Regenerate failed diagrams with mermaid-utils"
    },
    {
      name: "code_refs_accurate",
      check: () => extractCodeRefs(report).every(ref => fileExists(ref)),
      fix: "Update invalid file references"
    },
    {
      name: "no_placeholders",
      check: () => !report.includes('[TODO]') && !report.includes('[PLACEHOLDER]'),
      fix: "Fill in all placeholder content"
    },
    {
      name: "recommendations_specific",
      check: () => !report.includes('consider') || report.includes('specifically'),
      fix: "Make recommendations project-specific"
    }
  ];

  const results = gates.map(g => ({...g, passed: g.check()}));
  const allPassed = results.every(r => r.passed);

  return { allPassed, results };
}
```

**Integration with Phase 5**:
```javascript
// In 05-iterative-refinement.md
const { allPassed, results } = runQualityGates(report, config, diagrams);

if (allPassed) {
  // All gates passed → ask user to confirm or finalize
} else {
  // Gates failed → include failed gates in discovery questions
  const failedGates = results.filter(r => !r.passed);
  discoveries.qualityIssues = failedGates;
}
```

---

## Error Handling

**Use when**: Encountering errors during any phase.

| Error | Detection | Recovery |
|-------|-----------|----------|
| CLI timeout | Bash exits with timeout | Reduce scope via `config.scope`, retry |
| Exploration failure | Agent returns error | Fall back to `Read` + `Grep` directly |
| User abandons | User selects "cancel" | Save to `iterations/`, allow resume |
| Invalid scope path | Path doesn't exist | `AskUserQuestion` to correct path |
| Diagram validation fails | `validateMermaidSyntax` returns issues | Regenerate with stricter escaping |

**Recovery Flow**:
```javascript
try {
  await executePhase(phase);
} catch (error) {
  const recovery = ERROR_HANDLERS[error.type];
  if (recovery) {
    await recovery.action(error, config);
    // Retry phase or continue
  } else {
    // Save progress and ask user
    Write(`${outputDir}/error-state.json`, { phase, error, config });
    AskUserQuestion({ question: "遇到错误，如何处理？", ... });
  }
}
```
