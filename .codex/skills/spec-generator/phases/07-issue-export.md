# Phase 7: Issue Export

Map specification Epics to issues, create them via `ccw issue create`, and generate an export report with spec document links.

> **Execution Mode: Inline**
> This phase runs in the main orchestrator context (not delegated to agent) for direct access to `ccw issue create` CLI and interactive handoff options.

## Objective

- Read all EPIC-*.md files from Phase 5 output
- Assign waves: MVP epics → wave-1, non-MVP → wave-2
- Create one issue per Epic via `ccw issue create`
- Map Epic dependencies to issue dependencies
- Generate issue-export-report.md with mapping table and spec links
- Present handoff options for execution

## Input

- Dependency: `{workDir}/epics/_index.md` (and individual `EPIC-*.md` files)
- Reference: `{workDir}/readiness-report.md`, `{workDir}/spec-config.json`
- Reference: `{workDir}/product-brief.md`, `{workDir}/requirements/_index.md`, `{workDir}/architecture/_index.md`

## Execution Steps

### Step 1: Load Epic Files

```javascript
const specConfig = JSON.parse(Read(`${workDir}/spec-config.json`));
const epicFiles = Glob(`${workDir}/epics/EPIC-*.md`);
const epicsIndex = Read(`${workDir}/epics/_index.md`);

// Parse each Epic file
const epics = epicFiles.map(epicFile => {
  const content = Read(epicFile);
  const fm = parseFrontmatter(content);
  const title = extractTitle(content);
  const description = extractSection(content, "Description");
  const stories = extractSection(content, "Stories");
  const reqRefs = extractSection(content, "Requirements");
  const adrRefs = extractSection(content, "Architecture");
  const deps = fm.dependencies || [];

  return {
    file: epicFile,
    id: fm.id,           // e.g., EPIC-001
    title,
    description,
    stories,
    reqRefs,
    adrRefs,
    priority: fm.priority,
    mvp: fm.mvp || false,
    dependencies: deps,   // other EPIC IDs this depends on
    size: fm.size
  };
});
```

### Step 2: Wave Assignment

```javascript
const epicWaves = epics.map(epic => ({
  ...epic,
  wave: epic.mvp ? 1 : 2
}));

// Log wave assignment
const wave1 = epicWaves.filter(e => e.wave === 1);
const wave2 = epicWaves.filter(e => e.wave === 2);
// wave-1: MVP epics (must-have, core functionality)
// wave-2: Post-MVP epics (should-have, enhancements)
```

### Step 3: Issue Creation Loop

```javascript
const createdIssues = [];
const epicToIssue = {};  // EPIC-ID -> Issue ID mapping

for (const epic of epicWaves) {
  // Build issue JSON matching roadmap-with-file schema
  const issueData = {
    title: `[${specConfig.session_id}] ${epic.title}`,
    status: "pending",
    priority: epic.wave === 1 ? 2 : 3,  // wave-1 = higher priority
    context: `## ${epic.title}

${epic.description}

## Stories
${epic.stories}

## Spec References
- Epic: ${epic.file}
- Requirements: ${epic.reqRefs}
- Architecture: ${epic.adrRefs}
- Product Brief: ${workDir}/product-brief.md
- Full Spec: ${workDir}/`,
    source: "text",
    tags: [
      "spec-generated",
      `spec:${specConfig.session_id}`,
      `wave-${epic.wave}`,
      epic.mvp ? "mvp" : "post-mvp",
      `epic:${epic.id}`
    ],
    extended_context: {
      notes: {
        session: specConfig.session_id,
        spec_dir: workDir,
        source_epic: epic.id,
        wave: epic.wave,
        depends_on_issues: [],  // Filled in Step 4
        spec_documents: {
          product_brief: `${workDir}/product-brief.md`,
          requirements: `${workDir}/requirements/_index.md`,
          architecture: `${workDir}/architecture/_index.md`,
          epic: epic.file
        }
      }
    },
    lifecycle_requirements: {
      test_strategy: "acceptance",
      regression_scope: "affected",
      acceptance_type: "manual",
      commit_strategy: "per-epic"
    }
  };

  // Create issue via ccw issue create (pipe JSON to avoid shell escaping)
  const result = Bash(`echo '${JSON.stringify(issueData)}' | ccw issue create`);

  // Parse returned issue ID
  const issueId = JSON.parse(result).id;  // e.g., ISS-20260308-001
  epicToIssue[epic.id] = issueId;

  createdIssues.push({
    epic_id: epic.id,
    epic_title: epic.title,
    issue_id: issueId,
    wave: epic.wave,
    priority: issueData.priority,
    mvp: epic.mvp
  });
}
```

### Step 4: Epic Dependency → Issue Dependency Mapping

```javascript
// Map EPIC dependencies to Issue dependencies
for (const epic of epicWaves) {
  if (epic.dependencies.length === 0) continue;

  const issueId = epicToIssue[epic.id];
  const depIssueIds = epic.dependencies
    .map(depEpicId => epicToIssue[depEpicId])
    .filter(Boolean);

  if (depIssueIds.length > 0) {
    // Update issue's extended_context.notes.depends_on_issues
    // This is informational — actual dependency enforcement is in execution phase
    // Note: ccw issue create already created the issue; dependency info is in the context
  }
}
```

### Step 5: Generate issue-export-report.md

```javascript
const timestamp = new Date().toISOString();

const reportContent = `---
session_id: ${specConfig.session_id}
phase: 7
document_type: issue-export-report
status: complete
generated_at: ${timestamp}
stepsCompleted: ["load-epics", "wave-assignment", "issue-creation", "dependency-mapping", "report-generation"]
version: 1
dependencies:
  - epics/_index.md
  - readiness-report.md
---

# Issue Export Report

## Summary

- **Session**: ${specConfig.session_id}
- **Issues Created**: ${createdIssues.length}
- **Wave 1 (MVP)**: ${wave1.length} issues
- **Wave 2 (Post-MVP)**: ${wave2.length} issues
- **Export Date**: ${timestamp}

## Issue Mapping

| Epic ID | Epic Title | Issue ID | Wave | Priority | MVP |
|---------|-----------|----------|------|----------|-----|
${createdIssues.map(i =>
  `| ${i.epic_id} | ${i.epic_title} | ${i.issue_id} | ${i.wave} | ${i.priority} | ${i.mvp ? 'Yes' : 'No'} |`
).join('\n')}

## Spec Document Links

| Document | Path | Description |
|----------|------|-------------|
| Product Brief | ${workDir}/product-brief.md | Vision, goals, scope |
| Requirements | ${workDir}/requirements/_index.md | Functional + non-functional requirements |
| Architecture | ${workDir}/architecture/_index.md | Components, ADRs, tech stack |
| Epics | ${workDir}/epics/_index.md | Epic/Story breakdown |
| Readiness Report | ${workDir}/readiness-report.md | Quality validation |
| Spec Summary | ${workDir}/spec-summary.md | Executive summary |

## Dependency Map

| Issue ID | Depends On |
|----------|-----------|
${createdIssues.map(i => {
  const epic = epicWaves.find(e => e.id === i.epic_id);
  const deps = (epic.dependencies || []).map(d => epicToIssue[d]).filter(Boolean);
  return `| ${i.issue_id} | ${deps.length > 0 ? deps.join(', ') : 'None'} |`;
}).join('\n')}

## Next Steps

1. **team-planex**: Execute all issues via coordinated team workflow
2. **Wave 1 only**: Execute MVP issues first (${wave1.length} issues)
3. **View issues**: Browse created issues via \`ccw issue list --tag spec:${specConfig.session_id}\`
4. **Manual review**: Review individual issues before execution
`;

Write(`${workDir}/issue-export-report.md`, reportContent);
```

### Step 6: Update spec-config.json

```javascript
specConfig.issue_ids = createdIssues.map(i => i.issue_id);
specConfig.issues_created = createdIssues.length;
specConfig.phasesCompleted.push({
  phase: 7,
  name: "issue-export",
  output_file: "issue-export-report.md",
  issues_created: createdIssues.length,
  wave_1_count: wave1.length,
  wave_2_count: wave2.length,
  completed_at: timestamp
});
Write(`${workDir}/spec-config.json`, JSON.stringify(specConfig, null, 2));
```

### Step 7: Handoff Options

```javascript
const answer = request_user_input({
  questions: [
    {
      header: "Next Step",
      id: "next_step",
      question: `${createdIssues.length} issues created from ${epicWaves.length} Epics. What would you like to do next?`,
      options: [
        {
          label: "Execute via team-planex(Recommended)",
          description: `Execute all ${createdIssues.length} issues with coordinated team workflow`
        },
        {
          label: "Wave 1 only",
          description: `Execute ${wave1.length} MVP issues first`
        },
        {
          label: "Done",
          description: "Export complete, handle manually"
        }
      ]
    }
  ]
});

// Based on user selection:
const selection = answer.answers.next_step.answers[0];
if (selection === "Execute via team-planex(Recommended)") {
  const issueIds = createdIssues.map(i => i.issue_id).join(',');
  invoke_skill("team-planex", `--issues ${issueIds}`);
}

if (selection === "Wave 1 only") {
  const wave1Ids = createdIssues.filter(i => i.wave === 1).map(i => i.issue_id).join(',');
  invoke_skill("team-planex", `--issues ${wave1Ids}`);
}

if (selection === "Done") {
  // Export complete, handle manually
}
```

## Output

- **File**: `issue-export-report.md` — Issue mapping table + spec links + next steps
- **Updated**: `.workflow/issues/issues.jsonl` — New issue entries appended
- **Updated**: `spec-config.json` — Phase 7 completion + issue IDs

## Quality Checklist

- [ ] All MVP Epics have corresponding issues created
- [ ] All non-MVP Epics have corresponding issues created
- [ ] Issue tags include `spec-generated` and `spec:{session_id}`
- [ ] Issue `extended_context.notes.spec_documents` paths are correct
- [ ] Wave assignment matches MVP status (MVP → wave-1, non-MVP → wave-2)
- [ ] Epic dependencies mapped to issue dependency references
- [ ] `issue-export-report.md` generated with mapping table
- [ ] `spec-config.json` updated with `issue_ids` and `issues_created`
- [ ] Handoff options presented

## Error Handling

| Error | Blocking? | Action |
|-------|-----------|--------|
| `ccw issue create` fails for one Epic | No | Log error, continue with remaining Epics, report partial creation |
| No EPIC files found | Yes | Error and return to Phase 5 |
| All issue creations fail | Yes | Error with CLI diagnostic, suggest manual creation |
| Dependency EPIC not found in mapping | No | Skip dependency link, log warning |

## Completion

Phase 7 is the final phase. The specification package has been fully converted to executable issues ready for team-planex or manual execution.
