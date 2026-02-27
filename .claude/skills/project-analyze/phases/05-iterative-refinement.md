# Phase 5: Iterative Refinement

Discovery-driven refinement based on analysis findings.

## Execution

### Step 1: Extract Discoveries

```javascript
function extractDiscoveries(deepAnalysis) {
  return {
    ambiguities: deepAnalysis.findings.filter(f => f.confidence < 0.7),
    complexityHotspots: deepAnalysis.findings.filter(f => f.complexity === 'high'),
    patternDeviations: deepAnalysis.patterns.filter(p => p.consistency < 0.8),
    unclearDependencies: deepAnalysis.dependencies.filter(d => d.type === 'implicit'),
    potentialIssues: deepAnalysis.recommendations.filter(r => r.priority === 'investigate'),
    depthOpportunities: deepAnalysis.sections.filter(s => s.has_more_detail)
  };
}

const discoveries = extractDiscoveries(deepAnalysis);
```

### Step 2: Build Dynamic Questions

Questions emerge from discoveries, NOT predetermined:

```javascript
function buildDynamicQuestions(discoveries, config) {
  const questions = [];

  if (discoveries.ambiguities.length > 0) {
    questions.push({
      question: `Analysis found ambiguity in "${discoveries.ambiguities[0].area}". Which interpretation is correct?`,
      header: "Clarify",
      options: discoveries.ambiguities[0].interpretations
    });
  }

  if (discoveries.complexityHotspots.length > 0) {
    questions.push({
      question: `These areas have high complexity. Which would you like explained?`,
      header: "Deep-Dive",
      multiSelect: true,
      options: discoveries.complexityHotspots.slice(0, 4).map(h => ({
        label: h.name,
        description: h.summary
      }))
    });
  }

  if (discoveries.patternDeviations.length > 0) {
    questions.push({
      question: `Found pattern deviations. Should these be highlighted in the report?`,
      header: "Patterns",
      options: [
        {label: "Yes, include analysis", description: "Add section explaining deviations"},
        {label: "No, skip", description: "Omit from report"}
      ]
    });
  }

  // Always include action question
  questions.push({
    question: "How would you like to proceed?",
    header: "Action",
    options: [
      {label: "Continue refining", description: "Address more discoveries"},
      {label: "Finalize report", description: "Generate final output"},
      {label: "Change scope", description: "Modify analysis scope"}
    ]
  });

  return questions.slice(0, 4); // Max 4 questions
}
```

### Step 3: Apply Refinements

```javascript
if (userAction === "Continue refining") {
  // Apply selected refinements
  for (const selection of userSelections) {
    applyRefinement(selection, deepAnalysis, report);
  }
  
  // Save iteration
  Write(`${outputDir}/iterations/iteration-${iterationCount}.json`, {
    timestamp: new Date().toISOString(),
    discoveries: discoveries,
    selections: userSelections,
    changes: appliedChanges
  });
  
  // Loop back to Step 1
  iterationCount++;
  goto Step1;
}

if (userAction === "Finalize report") {
  // Proceed to final output
  goto FinalizeReport;
}
```

### Step 4: Finalize Report

```javascript
// Add iteration history to report metadata
const finalReport = {
  ...report,
  metadata: {
    iterations: iterationCount,
    refinements_applied: allRefinements,
    final_discoveries: discoveries
  }
};

Write(`${outputDir}/${config.type.toUpperCase()}-REPORT.md`, finalReport);
```

## Output

Updated report with refinements, saved iterations to `iterations/` folder.
