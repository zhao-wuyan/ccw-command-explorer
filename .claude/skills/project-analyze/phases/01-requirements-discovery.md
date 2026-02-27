# Phase 1: Requirements Discovery

Collect user requirements before analysis begins.

## Execution

### Step 1: Report Type Selection

```javascript
AskUserQuestion({
  questions: [{
    question: "What type of project analysis report would you like?",
    header: "Report Type",
    multiSelect: false,
    options: [
      {label: "Architecture (Recommended)", description: "System structure, module relationships, layer analysis, dependency graph"},
      {label: "Design", description: "Design patterns, class relationships, component interactions, abstraction analysis"},
      {label: "Methods", description: "Key algorithms, critical code paths, core function explanations with examples"},
      {label: "Comprehensive", description: "All above combined into a complete project analysis"}
    ]
  }]
})
```

### Step 2: Depth Level Selection

```javascript
AskUserQuestion({
  questions: [{
    question: "What depth level do you need?",
    header: "Depth",
    multiSelect: false,
    options: [
      {label: "Overview", description: "High-level understanding, suitable for onboarding"},
      {label: "Detailed", description: "In-depth analysis with code examples"},
      {label: "Deep-Dive", description: "Exhaustive analysis with implementation details"}
    ]
  }]
})
```

### Step 3: Scope Definition

```javascript
AskUserQuestion({
  questions: [{
    question: "What scope should the analysis cover?",
    header: "Scope",
    multiSelect: false,
    options: [
      {label: "Full Project", description: "Analyze entire codebase"},
      {label: "Specific Module", description: "Focus on a specific module or directory"},
      {label: "Custom Path", description: "Specify custom path pattern"}
    ]
  }]
})
```

## Focus Areas Mapping

| Report Type | Focus Areas |
|-------------|-------------|
| Architecture | Layer Structure, Module Dependencies, Entry Points, Data Flow |
| Design | Design Patterns, Class Relationships, Interface Contracts, State Management |
| Methods | Core Algorithms, Critical Paths, Public APIs, Complex Logic |
| Comprehensive | All above combined |

## Output

Save configuration to `analysis-config.json`:

```json
{
  "type": "architecture|design|methods|comprehensive",
  "depth": "overview|detailed|deep-dive",
  "scope": "**/*|src/**/*|custom",
  "focus_areas": ["..."]
}
```
