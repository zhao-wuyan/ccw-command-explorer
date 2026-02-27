---
name: convert-to-plan
description: Convert planning artifacts (lite-plan, workflow session, markdown) to issue solutions
argument-hint: "[-y|--yes] [--issue <id>] [--supplement] <SOURCE>"
allowed-tools: TodoWrite(*), Bash(*), Read(*), Write(*), Glob(*), AskUserQuestion(*)
---

## Auto Mode

When `--yes` or `-y`: Skip confirmation, auto-create issue and bind solution.

# Issue Convert-to-Plan Command (/issue:convert-to-plan)

## Overview

Converts various planning artifact formats into issue workflow solutions with intelligent detection and automatic binding.

**Supported Sources** (auto-detected):
- **lite-plan**: `.workflow/.lite-plan/{slug}/plan.json`
- **workflow-session**: `WFS-xxx` ID or `.workflow/active/{session}/` folder
- **markdown**: Any `.md` file with implementation/task content
- **json**: Direct JSON files matching plan-json-schema

## Quick Reference

```bash
# Convert lite-plan to new issue (auto-creates issue)
/issue:convert-to-plan ".workflow/.lite-plan/implement-auth-2026-01-25"

# Convert workflow session to existing issue
/issue:convert-to-plan WFS-auth-impl --issue GH-123

# Supplement existing solution with additional tasks
/issue:convert-to-plan "./docs/additional-tasks.md" --issue ISS-001 --supplement

# Auto mode - skip confirmations
/issue:convert-to-plan ".workflow/.lite-plan/my-plan" -y
```

## Command Options

| Option | Description | Default |
|--------|-------------|---------|
| `<SOURCE>` | Planning artifact path or WFS-xxx ID | Required |
| `--issue <id>` | Bind to existing issue instead of creating new | Auto-create |
| `--supplement` | Add tasks to existing solution (requires --issue) | false |
| `-y, --yes` | Skip all confirmations | false |

## Core Data Access Principle

**⚠️ Important**: Use CLI commands for all issue/solution operations.

| Operation | Correct | Incorrect |
|-----------|---------|-----------|
| Get issue | `ccw issue status <id> --json` | Read issues.jsonl directly |
| Create issue | `ccw issue init <id> --title "..."` | Write to issues.jsonl |
| Bind solution | `ccw issue bind <id> <sol-id>` | Edit issues.jsonl |
| List solutions | `ccw issue solutions --issue <id> --brief` | Read solutions/*.jsonl |

## Solution Schema Reference

Target format for all extracted data (from solution-schema.json):

```typescript
interface Solution {
  id: string;                    // SOL-{issue-id}-{4-char-uid}
  description?: string;          // High-level summary
  approach?: string;             // Technical strategy
  tasks: Task[];                 // Required: at least 1 task
  exploration_context?: object;  // Optional: source context
  analysis?: { risk, impact, complexity };
  score?: number;                // 0.0-1.0
  is_bound: boolean;
  created_at: string;
  bound_at?: string;
}

interface Task {
  id: string;                    // T1, T2, T3... (pattern: ^T[0-9]+$)
  title: string;                 // Required: action verb + target
  scope: string;                 // Required: module path or feature area
  action: Action;                // Required: Create|Update|Implement|...
  description?: string;
  modification_points?: Array<{file, target, change}>;
  implementation: string[];      // Required: step-by-step guide
  test?: { unit?, integration?, commands?, coverage_target? };
  acceptance: { criteria: string[], verification: string[] };  // Required
  commit?: { type, scope, message_template, breaking? };
  depends_on?: string[];
  priority?: number;             // 1-5 (default: 3)
}

type Action = 'Create' | 'Update' | 'Implement' | 'Refactor' | 'Add' | 'Delete' | 'Configure' | 'Test' | 'Fix';
```

## Implementation

### Phase 1: Parse Arguments & Detect Source Type

```javascript
const input = userInput.trim();
const flags = parseFlags(userInput);  // --issue, --supplement, -y/--yes

// Extract source path (first non-flag argument)
const source = extractSourceArg(input);

// Detect source type
function detectSourceType(source) {
  // Check for WFS-xxx pattern (workflow session ID)
  if (source.match(/^WFS-[\w-]+$/)) {
    return { type: 'workflow-session-id', path: `.workflow/active/${source}` };
  }

  // Check if directory
  const isDir = Bash(`test -d "${source}" && echo "dir" || echo "file"`).trim() === 'dir';

  if (isDir) {
    // Check for lite-plan indicator
    const hasPlanJson = Bash(`test -f "${source}/plan.json" && echo "yes" || echo "no"`).trim() === 'yes';
    if (hasPlanJson) {
      return { type: 'lite-plan', path: source };
    }

    // Check for workflow session indicator
    const hasSession = Bash(`test -f "${source}/workflow-session.json" && echo "yes" || echo "no"`).trim() === 'yes';
    if (hasSession) {
      return { type: 'workflow-session', path: source };
    }
  }

  // Check file extensions
  if (source.endsWith('.json')) {
    return { type: 'json-file', path: source };
  }
  if (source.endsWith('.md')) {
    return { type: 'markdown-file', path: source };
  }

  // Check if path exists at all
  const exists = Bash(`test -e "${source}" && echo "yes" || echo "no"`).trim() === 'yes';
  if (!exists) {
    throw new Error(`E001: Source not found: ${source}`);
  }

  return { type: 'unknown', path: source };
}

const sourceInfo = detectSourceType(source);
if (sourceInfo.type === 'unknown') {
  throw new Error(`E002: Unable to detect source format for: ${source}`);
}

console.log(`Detected source type: ${sourceInfo.type}`);
```

### Phase 2: Extract Data Using Format-Specific Extractor

```javascript
let extracted = { title: '', approach: '', tasks: [], metadata: {} };

switch (sourceInfo.type) {
  case 'lite-plan':
    extracted = extractFromLitePlan(sourceInfo.path);
    break;
  case 'workflow-session':
  case 'workflow-session-id':
    extracted = extractFromWorkflowSession(sourceInfo.path);
    break;
  case 'markdown-file':
    extracted = await extractFromMarkdownAI(sourceInfo.path);
    break;
  case 'json-file':
    extracted = extractFromJsonFile(sourceInfo.path);
    break;
}

// Validate extraction
if (!extracted.tasks || extracted.tasks.length === 0) {
  throw new Error('E006: No tasks extracted from source');
}

// Ensure task IDs are normalized to T1, T2, T3...
extracted.tasks = normalizeTaskIds(extracted.tasks);

console.log(`Extracted: ${extracted.tasks.length} tasks`);
```

#### Extractor: Lite-Plan

```javascript
function extractFromLitePlan(folderPath) {
  const planJson = Read(`${folderPath}/plan.json`);
  const plan = JSON.parse(planJson);

  return {
    title: plan.summary?.split('.')[0]?.trim() || 'Untitled Plan',
    description: plan.summary,
    approach: plan.approach,
    tasks: plan.tasks.map(t => ({
      id: t.id,
      title: t.title,
      scope: t.scope || '',
      action: t.action || 'Implement',
      description: t.description || t.title,
      modification_points: t.modification_points || [],
      implementation: Array.isArray(t.implementation) ? t.implementation : [t.implementation || ''],
      test: t.verification ? {
        unit: t.verification.unit_tests,
        integration: t.verification.integration_tests,
        commands: t.verification.manual_checks
      } : {},
      acceptance: {
        criteria: Array.isArray(t.acceptance) ? t.acceptance : [t.acceptance || ''],
        verification: t.verification?.manual_checks || []
      },
      depends_on: t.depends_on || [],
      priority: 3
    })),
    metadata: {
      source_type: 'lite-plan',
      source_path: folderPath,
      complexity: plan.complexity,
      estimated_time: plan.estimated_time,
      exploration_angles: plan._metadata?.exploration_angles || [],
      original_timestamp: plan._metadata?.timestamp
    }
  };
}
```

#### Extractor: Workflow Session

```javascript
function extractFromWorkflowSession(sessionPath) {
  // Load session metadata
  const sessionJson = Read(`${sessionPath}/workflow-session.json`);
  const session = JSON.parse(sessionJson);

  // Load IMPL_PLAN.md for approach (if exists)
  let approach = '';
  const implPlanPath = `${sessionPath}/IMPL_PLAN.md`;
  const hasImplPlan = Bash(`test -f "${implPlanPath}" && echo "yes" || echo "no"`).trim() === 'yes';
  if (hasImplPlan) {
    const implPlan = Read(implPlanPath);
    // Extract overview/approach section
    const overviewMatch = implPlan.match(/##\s*(?:Overview|Approach|Strategy)\s*\n([\s\S]*?)(?=\n##|$)/i);
    approach = overviewMatch?.[1]?.trim() || implPlan.split('\n').slice(0, 10).join('\n');
  }

  // Load all task JSONs from .task folder
  const taskFiles = Glob({ pattern: `${sessionPath}/.task/IMPL-*.json` });
  const tasks = taskFiles.map(f => {
    const taskJson = Read(f);
    const task = JSON.parse(taskJson);
    return {
      id: task.id?.replace(/^IMPL-0*/, 'T') || 'T1',  // IMPL-001 → T1
      title: task.title,
      scope: task.scope || inferScopeFromTask(task),
      action: capitalizeAction(task.type) || 'Implement',
      description: task.description,
      modification_points: task.implementation?.modification_points || [],
      implementation: task.implementation?.steps || [],
      test: task.implementation?.test || {},
      acceptance: {
        criteria: task.acceptance_criteria || [],
        verification: task.verification_steps || []
      },
      commit: task.commit,
      depends_on: (task.depends_on || []).map(d => d.replace(/^IMPL-0*/, 'T')),
      priority: task.priority || 3
    };
  });

  return {
    title: session.name || session.description?.split('.')[0] || 'Workflow Session',
    description: session.description || session.name,
    approach: approach || session.description,
    tasks: tasks,
    metadata: {
      source_type: 'workflow-session',
      source_path: sessionPath,
      session_id: session.id,
      created_at: session.created_at
    }
  };
}

function inferScopeFromTask(task) {
  if (task.implementation?.modification_points?.length) {
    const files = task.implementation.modification_points.map(m => m.file);
    // Find common directory prefix
    const dirs = files.map(f => f.split('/').slice(0, -1).join('/'));
    return [...new Set(dirs)][0] || '';
  }
  return '';
}

function capitalizeAction(type) {
  if (!type) return 'Implement';
  const map = { feature: 'Implement', bugfix: 'Fix', refactor: 'Refactor', test: 'Test', docs: 'Update' };
  return map[type.toLowerCase()] || type.charAt(0).toUpperCase() + type.slice(1);
}
```

#### Extractor: Markdown (AI-Assisted via Gemini)

```javascript
async function extractFromMarkdownAI(filePath) {
  const fileContent = Read(filePath);

  // Use Gemini CLI for intelligent extraction
  const cliPrompt = `PURPOSE: Extract implementation plan from markdown document for issue solution conversion. Must output ONLY valid JSON.
TASK: • Analyze document structure • Identify title/summary • Extract approach/strategy section • Parse tasks from any format (lists, tables, sections, code blocks) • Normalize each task to solution schema
MODE: analysis
CONTEXT: Document content provided below
EXPECTED: Valid JSON object with format:
{
  "title": "extracted title",
  "approach": "extracted approach/strategy",
  "tasks": [
    {
      "id": "T1",
      "title": "task title",
      "scope": "module or feature area",
      "action": "Implement|Update|Create|Fix|Refactor|Add|Delete|Configure|Test",
      "description": "what to do",
      "implementation": ["step 1", "step 2"],
      "acceptance": ["criteria 1", "criteria 2"]
    }
  ]
}
CONSTRAINTS: Output ONLY valid JSON - no markdown, no explanation | Action must be one of: Create, Update, Implement, Refactor, Add, Delete, Configure, Test, Fix | Tasks must have id, title, scope, action, implementation (array), acceptance (array)

DOCUMENT CONTENT:
${fileContent}`;

  // Execute Gemini CLI
  const result = Bash(`ccw cli -p '${cliPrompt.replace(/'/g, "'\\''")}' --tool gemini --mode analysis`, { timeout: 120000 });

  // Parse JSON from result (may be wrapped in markdown code block)
  let jsonText = result.trim();
  const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonText = jsonMatch[1].trim();
  }

  try {
    const extracted = JSON.parse(jsonText);

    // Normalize tasks
    const tasks = (extracted.tasks || []).map((t, i) => ({
      id: t.id || `T${i + 1}`,
      title: t.title || 'Untitled task',
      scope: t.scope || '',
      action: validateAction(t.action) || 'Implement',
      description: t.description || t.title,
      modification_points: t.modification_points || [],
      implementation: Array.isArray(t.implementation) ? t.implementation : [t.implementation || ''],
      test: t.test || {},
      acceptance: {
        criteria: Array.isArray(t.acceptance) ? t.acceptance : [t.acceptance || ''],
        verification: t.verification || []
      },
      depends_on: t.depends_on || [],
      priority: t.priority || 3
    }));

    return {
      title: extracted.title || 'Extracted Plan',
      description: extracted.summary || extracted.title,
      approach: extracted.approach || '',
      tasks: tasks,
      metadata: {
        source_type: 'markdown',
        source_path: filePath,
        extraction_method: 'gemini-ai'
      }
    };
  } catch (e) {
    // Provide more context for debugging
    throw new Error(`E005: Failed to extract tasks from markdown. Gemini response was not valid JSON. Error: ${e.message}. Response preview: ${jsonText.substring(0, 200)}...`);
  }
}

function validateAction(action) {
  const validActions = ['Create', 'Update', 'Implement', 'Refactor', 'Add', 'Delete', 'Configure', 'Test', 'Fix'];
  if (!action) return null;
  const normalized = action.charAt(0).toUpperCase() + action.slice(1).toLowerCase();
  return validActions.includes(normalized) ? normalized : null;
}
```

#### Extractor: JSON File

```javascript
function extractFromJsonFile(filePath) {
  const content = Read(filePath);
  const plan = JSON.parse(content);

  // Detect if it's already solution format or plan format
  if (plan.tasks && Array.isArray(plan.tasks)) {
    // Map tasks to normalized format
    const tasks = plan.tasks.map((t, i) => ({
      id: t.id || `T${i + 1}`,
      title: t.title,
      scope: t.scope || '',
      action: t.action || 'Implement',
      description: t.description || t.title,
      modification_points: t.modification_points || [],
      implementation: Array.isArray(t.implementation) ? t.implementation : [t.implementation || ''],
      test: t.test || t.verification || {},
      acceptance: normalizeAcceptance(t.acceptance),
      depends_on: t.depends_on || [],
      priority: t.priority || 3
    }));

    return {
      title: plan.summary?.split('.')[0] || plan.title || 'JSON Plan',
      description: plan.summary || plan.description,
      approach: plan.approach,
      tasks: tasks,
      metadata: {
        source_type: 'json',
        source_path: filePath,
        complexity: plan.complexity,
        original_metadata: plan._metadata
      }
    };
  }

  throw new Error('E002: JSON file does not contain valid plan structure (missing tasks array)');
}

function normalizeAcceptance(acceptance) {
  if (!acceptance) return { criteria: [], verification: [] };
  if (typeof acceptance === 'object' && acceptance.criteria) return acceptance;
  if (Array.isArray(acceptance)) return { criteria: acceptance, verification: [] };
  return { criteria: [String(acceptance)], verification: [] };
}
```

### Phase 3: Normalize Task IDs

```javascript
function normalizeTaskIds(tasks) {
  return tasks.map((t, i) => ({
    ...t,
    id: `T${i + 1}`,
    // Also normalize depends_on references
    depends_on: (t.depends_on || []).map(d => {
      // Handle various ID formats: IMPL-001, T1, 1, etc.
      const num = d.match(/\d+/)?.[0];
      return num ? `T${parseInt(num)}` : d;
    })
  }));
}
```

### Phase 4: Resolve Issue (Create or Find)

```javascript
let issueId = flags.issue;
let existingSolution = null;

if (issueId) {
  // Validate issue exists
  let issueCheck;
  try {
    issueCheck = Bash(`ccw issue status ${issueId} --json 2>/dev/null`).trim();
    if (!issueCheck || issueCheck === '') {
      throw new Error('empty response');
    }
  } catch (e) {
    throw new Error(`E003: Issue not found: ${issueId}`);
  }

  const issue = JSON.parse(issueCheck);

  // Check if issue already has bound solution
  if (issue.bound_solution_id && !flags.supplement) {
    throw new Error(`E004: Issue ${issueId} already has bound solution (${issue.bound_solution_id}). Use --supplement to add tasks.`);
  }

  // Load existing solution for supplement mode
  if (flags.supplement && issue.bound_solution_id) {
    try {
      const solResult = Bash(`ccw issue solution ${issue.bound_solution_id} --json`).trim();
      existingSolution = JSON.parse(solResult);
      console.log(`Loaded existing solution with ${existingSolution.tasks.length} tasks`);
    } catch (e) {
      throw new Error(`Failed to load existing solution: ${e.message}`);
    }
  }
} else {
  // Create new issue via ccw issue create (auto-generates correct ID)
  // Smart extraction: title from content, priority from complexity
  const title = extracted.title || 'Converted Plan';
  const context = extracted.description || extracted.approach || title;

  // Auto-determine priority based on complexity
  const complexityMap = { high: 2, medium: 3, low: 4 };
  const priority = complexityMap[extracted.metadata.complexity?.toLowerCase()] || 3;

  try {
    // Use heredoc to avoid shell escaping issues
    const createResult = Bash(`ccw issue create << 'EOF'
{
  "title": ${JSON.stringify(title)},
  "context": ${JSON.stringify(context)},
  "priority": ${priority},
  "source": "converted"
}
EOF`).trim();

    // Parse result to get created issue ID
    const created = JSON.parse(createResult);
    issueId = created.id;
    console.log(`Created issue: ${issueId} (priority: ${priority})`);
  } catch (e) {
    throw new Error(`Failed to create issue: ${e.message}`);
  }
}
```

### Phase 5: Generate Solution

```javascript
// Generate solution ID
function generateSolutionId(issueId) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let uid = '';
  for (let i = 0; i < 4; i++) {
    uid += chars[Math.floor(Math.random() * chars.length)];
  }
  return `SOL-${issueId}-${uid}`;
}

let solution;
const solutionId = generateSolutionId(issueId);

if (flags.supplement && existingSolution) {
  // Supplement mode: merge with existing solution
  const maxTaskId = Math.max(...existingSolution.tasks.map(t => parseInt(t.id.slice(1))));

  const newTasks = extracted.tasks.map((t, i) => ({
    ...t,
    id: `T${maxTaskId + i + 1}`
  }));

  solution = {
    ...existingSolution,
    tasks: [...existingSolution.tasks, ...newTasks],
    approach: existingSolution.approach + '\n\n[Supplementary] ' + (extracted.approach || ''),
    updated_at: new Date().toISOString()
  };

  console.log(`Supplementing: ${existingSolution.tasks.length} existing + ${newTasks.length} new = ${solution.tasks.length} total tasks`);
} else {
  // New solution
  solution = {
    id: solutionId,
    description: extracted.description || extracted.title,
    approach: extracted.approach,
    tasks: extracted.tasks,
    exploration_context: extracted.metadata.exploration_angles ? {
      exploration_angles: extracted.metadata.exploration_angles
    } : undefined,
    analysis: {
      risk: 'medium',
      impact: 'medium',
      complexity: extracted.metadata.complexity?.toLowerCase() || 'medium'
    },
    is_bound: false,
    created_at: new Date().toISOString(),
    _conversion_metadata: {
      source_type: extracted.metadata.source_type,
      source_path: extracted.metadata.source_path,
      converted_at: new Date().toISOString()
    }
  };
}
```

### Phase 6: Confirm & Persist

```javascript
// Display preview
console.log(`
## Conversion Summary

**Issue**: ${issueId}
**Solution**: ${flags.supplement ? existingSolution.id : solutionId}
**Tasks**: ${solution.tasks.length}
**Mode**: ${flags.supplement ? 'Supplement' : 'New'}

### Tasks:
${solution.tasks.map(t => `- ${t.id}: ${t.title} [${t.action}]`).join('\n')}
`);

// Confirm if not auto mode
if (!flags.yes && !flags.y) {
  const confirm = AskUserQuestion({
    questions: [{
      question: `Create solution for issue ${issueId} with ${solution.tasks.length} tasks?`,
      header: 'Confirm',
      multiSelect: false,
      options: [
        { label: 'Yes, create solution', description: 'Create and bind solution' },
        { label: 'Cancel', description: 'Abort without changes' }
      ]
    }]
  });

  if (!confirm.answers?.['Confirm']?.includes('Yes')) {
    console.log('Cancelled.');
    return;
  }
}

// Persist solution (following issue-plan-agent pattern)
Bash(`mkdir -p .workflow/issues/solutions`);

const solutionFile = `.workflow/issues/solutions/${issueId}.jsonl`;

if (flags.supplement) {
  // Supplement mode: update existing solution line atomically
  try {
    const existingContent = Read(solutionFile);
    const lines = existingContent.trim().split('\n').filter(l => l);
    const updatedLines = lines.map(line => {
      const sol = JSON.parse(line);
      if (sol.id === existingSolution.id) {
        return JSON.stringify(solution);
      }
      return line;
    });
    // Atomic write: write entire content at once
    Write({ file_path: solutionFile, content: updatedLines.join('\n') + '\n' });
    console.log(`✓ Updated solution: ${existingSolution.id}`);
  } catch (e) {
    throw new Error(`Failed to update solution: ${e.message}`);
  }

  // Note: No need to rebind - solution is already bound to issue
} else {
  // New solution: append to JSONL file (following issue-plan-agent pattern)
  try {
    const solutionLine = JSON.stringify(solution);

    // Read existing content, append new line, write atomically
    const existing = Bash(`test -f "${solutionFile}" && cat "${solutionFile}" || echo ""`).trim();
    const newContent = existing ? existing + '\n' + solutionLine + '\n' : solutionLine + '\n';
    Write({ file_path: solutionFile, content: newContent });

    console.log(`✓ Created solution: ${solutionId}`);
  } catch (e) {
    throw new Error(`Failed to write solution: ${e.message}`);
  }

  // Bind solution to issue
  try {
    Bash(`ccw issue bind ${issueId} ${solutionId}`);
    console.log(`✓ Bound solution to issue`);
  } catch (e) {
    // Cleanup: remove solution file on bind failure
    try {
      Bash(`rm -f "${solutionFile}"`);
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
    throw new Error(`Failed to bind solution: ${e.message}`);
  }

  // Update issue status to planned
  try {
    Bash(`ccw issue update ${issueId} --status planned`);
  } catch (e) {
    throw new Error(`Failed to update issue status: ${e.message}`);
  }
}
```

### Phase 7: Summary

```javascript
console.log(`
## Done

**Issue**: ${issueId}
**Solution**: ${flags.supplement ? existingSolution.id : solutionId}
**Tasks**: ${solution.tasks.length}
**Status**: planned

### Next Steps:
- \`/issue:queue\` → Form execution queue
- \`ccw issue status ${issueId}\` → View issue details
- \`ccw issue solution ${flags.supplement ? existingSolution.id : solutionId}\` → View solution
`);
```

## Error Handling

| Error | Code | Resolution |
|-------|------|------------|
| Source not found | E001 | Check path exists |
| Invalid source format | E002 | Verify file contains valid plan structure |
| Issue not found | E003 | Check issue ID or omit --issue to create new |
| Solution already bound | E004 | Use --supplement to add tasks |
| AI extraction failed | E005 | Check markdown structure, try simpler format |
| No tasks extracted | E006 | Source must contain at least 1 task |

## Related Commands

- `/issue:plan` - Generate solutions from issue exploration
- `/issue:queue` - Form execution queue from bound solutions
- `/issue:execute` - Execute queue with DAG parallelism
- `ccw issue status <id>` - View issue details
- `ccw issue solution <id>` - View solution details
