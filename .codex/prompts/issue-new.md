---
description: Create structured issue from GitHub URL or text description. Auto mode with --yes flag.
argument-hint: "[--yes|-y] <GITHUB_URL | TEXT_DESCRIPTION> [--priority PRIORITY] [--labels LABELS]"
---

# Issue New Command

## Core Principles

**Requirement Clarity Detection** → Ask only when needed
**Flexible Parameter Input** → Support multiple formats and flags
**Auto Mode Support** → `--yes`/`-y` skips confirmation questions

```
Clear Input (GitHub URL, structured text)     → Direct creation (no questions)
Unclear Input (vague description)             → Clarifying questions (unless --yes)
Auto Mode (--yes or -y flag)                  → Skip all questions, use inference
```

## Parameter Formats

```bash
# GitHub URL (auto-detected)
/prompts:issue-new https://github.com/owner/repo/issues/123
/prompts:issue-new GH-123

# Text description with priority
/prompts:issue-new "Login fails with special chars" --priority 1

# Auto mode - skip all questions
/prompts:issue-new --yes "something broken"
/prompts:issue-new -y https://github.com/owner/repo/issues/456

# With labels
/prompts:issue-new "Database migration needed" --priority 2 --labels "enhancement,database"
```

## Issue Structure

```typescript
interface Issue {
  id: string;                    // GH-123 or ISS-YYYYMMDD-HHMMSS
  title: string;
  status: 'registered' | 'planned' | 'queued' | 'in_progress' | 'completed' | 'failed';
  priority: number;              // 1 (critical) to 5 (low)
  context: string;               // Problem description
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
  
  // Solution binding
  bound_solution_id: string | null;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}
```

## Inputs

- **GitHub URL**: `https://github.com/owner/repo/issues/123` or `#123`
- **Text description**: Natural language description
- **Priority flag**: `--priority 1-5` (optional, default: 3)

## Output Requirements

**Create Issue via CLI** (preferred method):
```bash
# Pipe input (recommended for complex JSON)
echo '{"title":"...", "context":"...", "priority":3}' | ccw issue create

# Returns created issue JSON
{"id":"ISS-20251229-001","title":"...","status":"registered",...}
```

**Return Summary:**
```json
{
  "created": true,
  "id": "ISS-20251229-001",
  "title": "Login fails with special chars",
  "source": "text",
  "github_published": false,
  "next_step": "/issue:plan ISS-20251229-001"
}
```

## Workflow

### Phase 0: Parse Arguments & Flags

Extract parameters from user input:

```bash
# Input examples (Codex placeholders)
INPUT="$1"          # GitHub URL or text description
AUTO_MODE="$2"      # Check for --yes or -y flag

# Parse flags (comma-separated in single argument)
PRIORITY=$(echo "$INPUT" | grep -oP '(?<=--priority\s)\d+' || echo "3")
LABELS=$(echo "$INPUT" | grep -oP '(?<=--labels\s)\K[^-]*' | xargs)
AUTO_YES=$(echo "$INPUT" | grep -qE '--yes|-y' && echo "true" || echo "false")

# Extract main input (URL or text) - remove all flags
MAIN_INPUT=$(echo "$INPUT" | sed 's/\s*--priority\s*\d*//; s/\s*--labels\s*[^-]*//; s/\s*--yes\s*//; s/\s*-y\s*//' | xargs)
```

### Phase 1: Analyze Input & Clarity Detection

```javascript
const mainInput = userInput.trim();

// Detect input type and clarity
const isGitHubUrl = mainInput.match(/github\.com\/[\w-]+\/[\w-]+\/issues\/\d+/);
const isGitHubShort = mainInput.match(/^GH-?\d+$/);
const hasStructure = mainInput.match(/(expected|actual|affects|steps):/i);

// Clarity score: 0-3
let clarityScore = 0;
if (isGitHubUrl || isGitHubShort) clarityScore = 3;  // GitHub = fully clear
else if (hasStructure) clarityScore = 2;             // Structured text = clear
else if (mainInput.length > 50) clarityScore = 1;    // Long text = somewhat clear
else clarityScore = 0;                               // Vague

// Auto mode override: if --yes/-y flag, skip all questions
const skipQuestions = process.env.AUTO_YES === 'true';
```

### Phase 2: Extract Issue Data & Priority

**For GitHub URL/Short:**

```bash
# Fetch issue details via gh CLI
gh issue view <issue-ref> --json number,title,body,labels,url

# Parse response with priority override
{
  "id": "GH-123",
  "title": "...",
  "priority": $PRIORITY || 3,  # Use --priority flag if provided
  "source": "github",
  "source_url": "https://github.com/...",
  "labels": $LABELS || [...existing labels],
  "context": "..."
}
```

**For Text Description:**

```javascript
// Generate issue ID
const id = `ISS-${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)}`;

// Parse structured fields if present
const expected = text.match(/expected:?\s*([^.]+)/i);
const actual = text.match(/actual:?\s*([^.]+)/i);
const affects = text.match(/affects?:?\s*([^.]+)/i);

// Build issue data with flags
{
  "id": id,
  "title": text.split(/[.\n]/)[0].substring(0, 60),
  "priority": $PRIORITY || 3,            # From --priority flag
  "labels": $LABELS?.split(',') || [],   # From --labels flag
  "source": "text",
  "context": text.substring(0, 500),
  "expected_behavior": expected?.[1]?.trim(),
  "actual_behavior": actual?.[1]?.trim()
}
```

### Phase 3: Context Hint (Conditional)

For medium clarity (score 1-2) without affected components:

```bash
# Use rg to find potentially related files
rg -l "<keyword>" --type ts | head -5
```

Add discovered files to `affected_components` (max 3 files).

**Note**: Skip this for GitHub issues (already have context) and vague inputs (needs clarification first).

### Phase 4: Conditional Clarification (Skip if Auto Mode)

**Only ask if**: clarity < 2 AND NOT in auto mode (skipQuestions = false)

If auto mode (`--yes`/`-y`), proceed directly to creation with inferred details.

Otherwise, present minimal clarification:

```
Input unclear. Please describe:
- What is the issue about?
- Where does it occur?
- What is the expected behavior?
```

Wait for user response, then update issue data.

### Phase 5: GitHub Publishing Decision (Skip if Already GitHub)

For non-GitHub sources, determine if user wants to publish to GitHub:

```

For non-GitHub sources AND NOT auto mode, ask:

```
Would you like to publish this issue to GitHub?
1. Yes, publish to GitHub (create issue and link it)
2. No, keep local only (store without GitHub sync)
```

In auto mode: Default to NO (keep local only, unless explicitly requested with --publish flag).

### Phase 6: Create Issue

**Create via CLI:**

```bash
# Build issue JSON
ISSUE_JSON='{"title":"...","context":"...","priority":3,"source":"text"}'

# Create issue (auto-generates ID)
echo "${ISSUE_JSON}" | ccw issue create
```

**If publishing to GitHub:**

```bash
# Create on GitHub first
GH_URL=$(gh issue create --title "..." --body "..." | grep -oE 'https://github.com/[^ ]+')
GH_NUMBER=$(echo $GH_URL | grep -oE '/issues/([0-9]+)$' | grep -oE '[0-9]+')

# Update local issue with binding
ccw issue update ${ISSUE_ID} --github-url "${GH_URL}" --github-number ${GH_NUMBER}
```

### Phase 7: Output Result

```markdown
## Issue Created

**ID**: ISS-20251229-001
**Title**: Login fails with special chars
**Source**: text
**Priority**: 2 (High)

**Context**:
500 error when password contains quotes

**Affected Components**:
- src/auth/login.ts
- src/utils/validation.ts

**GitHub**: Not published (local only)

**Next Step**: `/issue:plan ISS-20251229-001`
```

## Quality Checklist

Before completing, verify:

- [ ] Issue ID generated correctly (GH-xxx or ISS-YYYYMMDD-HHMMSS)
- [ ] Title extracted (max 60 chars)
- [ ] Context captured (problem description)
- [ ] Priority assigned (1-5)
- [ ] Status set to `registered`
- [ ] Created via `ccw issue create` CLI command

## Error Handling

| Situation | Action |
|-----------|--------|
| GitHub URL not accessible | Report error, suggest text input |
| gh CLI not available | Fall back to text-based creation |
| Empty input | Prompt for description |
| Very vague input | Ask clarifying questions |
| Issue already exists | Report duplicate, show existing |


## Start Execution

### Parameter Parsing (Phase 0)

```bash
# Codex passes full input as $1
INPUT="$1"

# Extract flags
AUTO_YES=false
PRIORITY=3
LABELS=""

# Parse using parameter expansion
while [[ $INPUT == -* ]]; do
  case $INPUT in
    -y|--yes)
      AUTO_YES=true
      INPUT="${INPUT#* }"  # Remove flag and space
      ;;
    --priority)
      PRIORITY="${INPUT#* }"
      PRIORITY="${PRIORITY%% *}"  # Extract next word
      INPUT="${INPUT#*--priority $PRIORITY }"
      ;;
    --labels)
      LABELS="${INPUT#* }"
      LABELS="${LABELS%% --*}"  # Extract until next flag
      INPUT="${INPUT#*--labels $LABELS }"
      ;;
    *)
      INPUT="${INPUT#* }"
      ;;
  esac
done

# Remaining text is the main input (GitHub URL or description)
MAIN_INPUT="$INPUT"
```

### Execution Flow (All Phases)

```
1. Parse Arguments (Phase 0)
   └─ Extract: AUTO_YES, PRIORITY, LABELS, MAIN_INPUT

2. Detect Input Type & Clarity (Phase 1)
   ├─ GitHub URL/Short? → Score 3 (clear)
   ├─ Structured text?   → Score 2 (somewhat clear)
   ├─ Long text?        → Score 1 (vague)
   └─ Short text?       → Score 0 (very vague)

3. Extract Issue Data (Phase 2)
   ├─ If GitHub: gh CLI fetch + parse
   └─ If text: Parse structure + apply PRIORITY/LABELS flags

4. Context Hint (Phase 3, conditional)
   └─ Only for clarity 1-2 AND no components → ACE search (max 3 files)

5. Clarification (Phase 4, conditional)
   └─ If clarity < 2 AND NOT auto mode → Ask for details
   └─ If auto mode (AUTO_YES=true) → Skip, use inferred data

6. GitHub Publishing (Phase 5, conditional)
   ├─ If source = github → Skip (already from GitHub)
   └─ If source != github:
      ├─ If auto mode → Default NO (keep local)
      └─ If manual → Ask user preference

7. Create Issue (Phase 6)
   ├─ Create local issue via ccw CLI
   └─ If publishToGitHub → gh issue create → link

8. Output Result (Phase 7)
   └─ Display: ID, title, source, GitHub status, next step
```

## Quick Examples

```bash
# Auto mode - GitHub issue (no questions)
/prompts:issue-new -y https://github.com/org/repo/issues/42

# Standard mode - text with priority
/prompts:issue-new "Database connection timeout" --priority 1

# Auto mode - text with priority and labels
/prompts:issue-new --yes "Add caching layer" --priority 2 --labels "enhancement,performance"

# GitHub short format
/prompts:issue-new GH-123

# Complex text description
/prompts:issue-new "User login fails. Expected: redirect to dashboard. Actual: 500 error"
```