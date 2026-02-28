# Command: pre-delivery-checklist

## Purpose

CSS-level pre-delivery checks for frontend files. Validates accessibility, interaction, design compliance, and layout patterns before final delivery.

## Phase 2: Context Loading

| Input | Source | Required |
|-------|--------|----------|
| Changed frontend files | git diff --name-only (filtered to .tsx, .jsx, .css, .scss) | Yes |
| File contents | Read each changed file | Yes |
| Design tokens path | `src/styles/tokens.css` or equivalent | No |
| Session folder | Task description `Session:` field | Yes |

## Phase 3: Checklist Execution

### Category 1: Accessibility (6 items)

| # | Check | Pattern to Detect | Severity |
|---|-------|--------------------|----------|
| 1 | Images have alt text | `<img` without `alt=` | CRITICAL |
| 2 | Form inputs have labels | `<input` without `<label` or `aria-label` | HIGH |
| 3 | Focus states visible | Interactive elements without `:focus` styles | HIGH |
| 4 | Color contrast 4.5:1 | Light text on light background patterns | HIGH |
| 5 | prefers-reduced-motion | Animations without `@media (prefers-reduced-motion)` | MEDIUM |
| 6 | Heading hierarchy | Skipped heading levels (h1 followed by h3) | MEDIUM |

**Do / Don't**:

| # | Do | Don't |
|---|-----|-------|
| 1 | Always provide descriptive alt text | Leave alt empty without `role="presentation"` |
| 2 | Associate every input with a label | Use placeholder as sole label |
| 3 | Add `focus-visible` outline | Remove default focus ring without replacement |
| 4 | Ensure 4.5:1 minimum contrast ratio | Use low-contrast decorative text for content |
| 5 | Wrap in `@media (prefers-reduced-motion: no-preference)` | Force animations on all users |
| 6 | Use sequential heading levels | Skip levels for visual sizing |

---

### Category 2: Interaction (4 items)

| # | Check | Pattern to Detect | Severity |
|---|-------|--------------------|----------|
| 7 | cursor-pointer on clickable | Buttons/links without `cursor: pointer` | MEDIUM |
| 8 | Transitions 150-300ms | Duration outside 150-300ms range | LOW |
| 9 | Loading states | Async operations without loading indicator | MEDIUM |
| 10 | Error states | Async operations without error handling UI | HIGH |

**Do / Don't**:

| # | Do | Don't |
|---|-----|-------|
| 7 | Add `cursor: pointer` to all clickable elements | Leave default cursor on buttons |
| 8 | Use 150-300ms for micro-interactions | Use >500ms or <100ms transitions |
| 9 | Show skeleton/spinner during fetch | Leave blank screen while loading |
| 10 | Show user-friendly error message | Silently fail or show raw error |

---

### Category 3: Design Compliance (4 items)

| # | Check | Pattern to Detect | Severity |
|---|-------|--------------------|----------|
| 11 | No hardcoded colors | Hex values (`#XXXXXX`) outside tokens file | HIGH |
| 12 | No hardcoded spacing | Raw `px` values for margin/padding | MEDIUM |
| 13 | No emoji as icons | Unicode emoji (U+1F300-1F9FF) in UI code | HIGH |
| 14 | Dark mode support | No `prefers-color-scheme` or `.dark` class | MEDIUM |

**Do / Don't**:

| # | Do | Don't |
|---|-----|-------|
| 11 | Use `var(--color-*)` design tokens | Hardcode `#hex` values |
| 12 | Use `var(--space-*)` spacing tokens | Hardcode pixel values |
| 13 | Use proper SVG/icon library | Use emoji for functional icons |
| 14 | Support light/dark themes | Design for light mode only |

---

### Category 4: Layout (2 items)

| # | Check | Pattern to Detect | Severity |
|---|-------|--------------------|----------|
| 15 | Responsive breakpoints | No `md:`/`lg:`/`@media` queries | MEDIUM |
| 16 | No horizontal scroll | Fixed widths greater than viewport | HIGH |

**Do / Don't**:

| # | Do | Don't |
|---|-----|-------|
| 15 | Mobile-first responsive design | Desktop-only layout |
| 16 | Use relative/fluid widths | Set fixed pixel widths on containers |

---

### Check Execution Strategy

| Check Scope | Applies To | Method |
|-------------|-----------|--------|
| Per-file checks | Items 1-4, 7-8, 10-13, 16 | Run against each changed file individually |
| Global checks | Items 5-6, 9, 14-15 | Run against concatenated content of all files |

**Detection example** (check for hardcoded colors):

```bash
Grep(pattern="#[0-9a-fA-F]{6}", path="<file_path>", output_mode="content", "-n"=true)
```

**Detection example** (check for missing alt text):

```bash
Grep(pattern="<img\\s(?![^>]*alt=)", path="<file_path>", output_mode="content", "-n"=true)
```

## Phase 4: Validation

### Pass/Fail Criteria

| Condition | Result |
|-----------|--------|
| Zero CRITICAL + zero HIGH failures | PASS |
| Zero CRITICAL, some HIGH | CONDITIONAL (list fixes needed) |
| Any CRITICAL failure | FAIL |

### Output Format

```
## Pre-Delivery Checklist Results

- Total checks: <n>
- Passed: <n> / <total>
- Failed: <n>

### Failed Items
- [CRITICAL] #1 Images have alt text -- <file_path>
- [HIGH] #11 No hardcoded colors -- <file_path>:<line>
- [MEDIUM] #7 cursor-pointer on clickable -- <file_path>

### Recommendations
(Do/Don't guidance for each failed item)
```

## Error Handling

| Scenario | Resolution |
|----------|------------|
| No frontend files to check | Report empty checklist, all checks N/A |
| File read error | Skip file, note in report |
| Regex match error | Skip check, note in report |
| Design tokens file not found | Skip items 11-12, adjust total |
