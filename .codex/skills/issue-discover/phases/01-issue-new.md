# Phase 1: Create New Issue

> 来源: `commands/issue/new.md`

## Overview

Create structured issue from GitHub URL or text description with clarity-based flow control.

**Core workflow**: Input Analysis → Clarity Detection → Data Extraction → Optional Clarification → GitHub Publishing → Create Issue

**Input sources**:
- **GitHub URL** - `https://github.com/owner/repo/issues/123` or `#123`
- **Structured text** - Text with expected/actual/affects keywords
- **Vague text** - Short description that needs clarification

**Output**:
- **Issue** (GH-xxx or ISS-YYYYMMDD-HHMMSS) - Registered issue ready for planning

## Prerequisites

- `gh` CLI available (for GitHub URLs)
- `ccw issue` CLI available

## Auto Mode

When `--yes` or `-y`: Skip clarification questions, create issue with inferred details.

## Arguments

| Argument | Required | Type | Default | Description |
|----------|----------|------|---------|-------------|
| input | Yes | String | - | GitHub URL, `#number`, or text description |
| --priority | No | Integer | auto | Priority 1-5 (auto-inferred if omitted) |
| -y, --yes | No | Flag | false | Skip all confirmations |

## Issue Structure

```typescript
interface Issue {
  id: string;                    // GH-123 or ISS-YYYYMMDD-HHMMSS
  title: string;
  status: 'registered' | 'planned' | 'queued' | 'in_progress' | 'completed' | 'failed';
  priority: number;              // 1 (critical) to 5 (low)
  context: string;               // Problem description (single source of truth)
  source: 'github' | 'text' | 'discovery';
  source_url?: string;
  labels?: string[];

  // GitHub binding (for non-GitHub sources that publish to GitHub)
  github_url?: string;
  github_number?: number;

  // Optional structured fields
  expected_behavior?: string;
  actual_behavior?: string;
  affected_components?: string[];

  // Feedback history
  feedback?: {
    type: 'failure' | 'clarification' | 'rejection';
    stage: string;
    content: string;
    created_at: string;
  }[];

  bound_solution_id: string | null;
  created_at: string;
  updated_at: string;
}
```

## Execution Steps

### Step 1.1: Input Analysis & Clarity Detection

```javascript
const input = userInput.trim();
const flags = parseFlags(userInput);

// Detect input type and clarity
const isGitHubUrl = input.match(/github\.com\/[\w-]+\/[\w-]+\/issues\/\d+/);
const isGitHubShort = input.match(/^#(\d+)$/);
const hasStructure = input.match(/(expected|actual|affects|steps):/i);

// Clarity score: 0-3
let clarityScore = 0;
if (isGitHubUrl || isGitHubShort) clarityScore = 3;  // GitHub = fully clear
else if (hasStructure) clarityScore = 2;             // Structured text = clear
else if (input.length > 50) clarityScore = 1;        // Long text = somewhat clear
else clarityScore = 0;                               // Vague

let issueData = {};
```

### Step 1.2: Data Extraction (GitHub or Text)

```javascript
if (isGitHubUrl || isGitHubShort) {
  // GitHub - fetch via gh CLI
  const result = Bash(`gh issue view ${extractIssueRef(input)} --json number,title,body,labels,url`);
  const gh = JSON.parse(result);
  issueData = {
    id: `GH-${gh.number}`,
    title: gh.title,
    source: 'github',
    source_url: gh.url,
    labels: gh.labels.map(l => l.name),
    context: gh.body?.substring(0, 500) || gh.title,
    ...parseMarkdownBody(gh.body)
  };
} else {
  // Text description
  issueData = {
    id: `ISS-${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)}`,
    source: 'text',
    ...parseTextDescription(input)
  };
}
```

### Step 1.3: Lightweight Context Hint (Conditional)

```javascript
// ACE search ONLY for medium clarity (1-2) AND missing components
// Skip for: GitHub (has context), vague (needs clarification first)
if (clarityScore >= 1 && clarityScore <= 2 && !issueData.affected_components?.length) {
  const keywords = extractKeywords(issueData.context);

  if (keywords.length >= 2) {
    try {
      const aceResult = mcp__ace-tool__search_context({
        project_root_path: process.cwd(),
        query: keywords.slice(0, 3).join(' ')
      });
      issueData.affected_components = aceResult.files?.slice(0, 3) || [];
    } catch {
      // ACE failure is non-blocking
    }
  }
}
```

### Step 1.4: Conditional Clarification (Only if Unclear)

```javascript
// ONLY ask questions if clarity is low
if (clarityScore < 2 && (!issueData.context || issueData.context.length < 20)) {
  const answer = ASK_USER([{
    id: "clarify",
    type: "input",
    prompt: "Please describe the issue in more detail:",
    description: "Describe what, where, and expected behavior"
  }]);  // BLOCKS (wait for user response)

  if (answer.customText) {
    issueData.context = answer.customText;
    issueData.title = answer.customText.split(/[.\n]/)[0].substring(0, 60);
    issueData.feedback = [{
      type: 'clarification',
      stage: 'new',
      content: answer.customText,
      created_at: new Date().toISOString()
    }];
  }
}
```

### Step 1.5: GitHub Publishing Decision (Non-GitHub Sources)

```javascript
// For non-GitHub sources, ask if user wants to publish to GitHub
let publishToGitHub = false;

if (issueData.source !== 'github') {
  // Yes → Create issue on GitHub and link it
  // No  → Store as local issue without GitHub sync
  publishToGitHub = CONFIRM("Would you like to publish this issue to GitHub?");  // BLOCKS (wait for user response)
}
```

### Step 1.6: Create Issue

**Issue Creation** (via CLI endpoint):
```bash
# Option 1: Pipe input (recommended for complex JSON)
echo '{"title":"...", "context":"...", "priority":3}' | ccw issue create

# Option 2: Heredoc (for multi-line JSON)
ccw issue create << 'EOF'
{"title":"...", "context":"含\"引号\"的内容", "priority":3}
EOF
```

**GitHub Publishing** (if user opted in):
```javascript
// Step 1: Create local issue FIRST
const localIssue = createLocalIssue(issueData);  // ccw issue create

// Step 2: Publish to GitHub if requested
if (publishToGitHub) {
  const ghResult = Bash(`gh issue create --title "${issueData.title}" --body "${issueData.context}"`);
  const ghUrl = ghResult.match(/https:\/\/github\.com\/[\w-]+\/[\w-]+\/issues\/\d+/)?.[0];
  const ghNumber = parseInt(ghUrl?.match(/\/issues\/(\d+)/)?.[1]);

  if (ghNumber) {
    Bash(`ccw issue update ${localIssue.id} --github-url "${ghUrl}" --github-number ${ghNumber}`);
  }
}
```

**Workflow:**
```
1. Create local issue (ISS-YYYYMMDD-NNN) → stored in {projectRoot}/.workflow/issues.jsonl
2. If publishToGitHub:
   a. gh issue create → returns GitHub URL
   b. Update local issue with github_url + github_number binding
3. Both local and GitHub issues exist, linked together
```

## Execution Flow

```
Phase 1: Input Analysis
   └─ Detect clarity score (GitHub URL? Structured text? Keywords?)

Phase 2: Data Extraction (branched by clarity)
   ┌────────────┬─────────────────┬──────────────┐
   │  Score 3   │   Score 1-2     │   Score 0    │
   │  GitHub    │   Text + ACE    │   Vague      │
   ├────────────┼─────────────────┼──────────────┤
   │  gh CLI    │  Parse struct   │  ASK_USER    │
   │  → parse   │  + quick hint   │ (1 question) │
   │            │  (3 files max)  │  → feedback  │
   └────────────┴─────────────────┴──────────────┘

Phase 3: GitHub Publishing Decision (non-GitHub only)
   ├─ Source = github: Skip (already from GitHub)
   └─ Source ≠ github: CONFIRM
      ├─ Yes → publishToGitHub = true
      └─ No  → publishToGitHub = false

Phase 4: Create Issue
   ├─ Score ≥ 2: Direct creation
   └─ Score < 2: Confirm first → Create
   └─ If publishToGitHub: gh issue create → link URL

Note: Deep exploration & lifecycle deferred to /issue:plan
```

## Helper Functions

```javascript
function extractKeywords(text) {
  const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'not', 'with']);
  return text
    .toLowerCase()
    .split(/\W+/)
    .filter(w => w.length > 3 && !stopWords.has(w))
    .slice(0, 5);
}

function parseTextDescription(text) {
  const result = { title: '', context: '' };
  const sentences = text.split(/\.(?=\s|$)/);

  result.title = sentences[0]?.trim().substring(0, 60) || 'Untitled';
  result.context = text.substring(0, 500);

  const expected = text.match(/expected:?\s*([^.]+)/i);
  const actual = text.match(/actual:?\s*([^.]+)/i);
  const affects = text.match(/affects?:?\s*([^.]+)/i);

  if (expected) result.expected_behavior = expected[1].trim();
  if (actual) result.actual_behavior = actual[1].trim();
  if (affects) {
    result.affected_components = affects[1].split(/[,\s]+/).filter(c => c.includes('/') || c.includes('.'));
  }

  return result;
}

function parseMarkdownBody(body) {
  if (!body) return {};
  const result = {};

  const problem = body.match(/##?\s*(problem|description)[:\s]*([\s\S]*?)(?=##|$)/i);
  const expected = body.match(/##?\s*expected[:\s]*([\s\S]*?)(?=##|$)/i);
  const actual = body.match(/##?\s*actual[:\s]*([\s\S]*?)(?=##|$)/i);

  if (problem) result.context = problem[2].trim().substring(0, 500);
  if (expected) result.expected_behavior = expected[2].trim();
  if (actual) result.actual_behavior = actual[2].trim();

  return result;
}
```

## Error Handling

| Error | Message | Resolution |
|-------|---------|------------|
| GitHub fetch failed | gh CLI error | Check gh auth, verify URL |
| Clarity too low | Input unclear | Ask clarification question |
| Issue creation failed | CLI error | Verify ccw issue endpoint |
| GitHub publish failed | gh issue create error | Create local-only, skip GitHub |

## Examples

### Clear Input (No Questions)

```bash
issue-discover https://github.com/org/repo/issues/42
# → Fetches, parses, creates immediately

issue-discover "Login fails with special chars. Expected: success. Actual: 500"
# → Parses structure, creates immediately
```

### Vague Input (1 Question)

```bash
issue-discover "auth broken"
# → Asks: "Please describe the issue in more detail"
# → User provides details → saved to feedback[]
# → Creates issue
```

## Post-Phase Update

After issue creation:
- Issue created with `status: registered`
- Report: issue ID, title, source, affected components
- Show GitHub URL (if published)
- Recommend next step: `/issue:plan <id>` or `issue-resolve <id>`
