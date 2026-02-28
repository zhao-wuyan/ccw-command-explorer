# Command: pre-delivery-checklist

> 最终交付前的 CSS 级别精准检查清单，融合 ui-ux-pro-max Pre-Delivery Checklist 和 ux-guidelines.csv 规则。

## When to Use

- Phase 3 of qa role, Dimension 5: Pre-Delivery
- Final review type (`reviewType === 'final'` or `reviewType === 'code-review'`)

## Strategy

### Delegation Mode

**Mode**: Direct (inline pattern matching)

## Checklist Items

### Accessibility

| # | Check | Pattern | Severity | Do | Don't |
|---|-------|---------|----------|-----|-------|
| 1 | Images have alt text | `<img` without `alt=` | CRITICAL | Always provide descriptive alt text | Leave alt empty without role="presentation" |
| 2 | Form inputs have labels | `<input` without `<label`/`aria-label` | HIGH | Associate every input with a label | Use placeholder as sole label |
| 3 | Focus states visible | Interactive elements without `focus` styles | HIGH | Add focus-visible outline | Remove default focus ring without replacement |
| 4 | Color contrast 4.5:1 | Light text on light background | HIGH | Ensure 4.5:1 minimum ratio | Use low-contrast decorative text for content |
| 5 | prefers-reduced-motion | Animations without media query | MEDIUM | Wrap in @media (prefers-reduced-motion: no-preference) | Force animations on all users |
| 6 | Heading hierarchy | Skipped heading levels (h1→h3) | MEDIUM | Use sequential heading levels | Skip levels for visual sizing |

### Interaction

| # | Check | Pattern | Severity | Do | Don't |
|---|-------|---------|----------|-----|-------|
| 7 | cursor-pointer on clickable | Buttons/links without cursor-pointer | MEDIUM | Add cursor: pointer to all clickable elements | Leave default cursor |
| 8 | Transitions 150-300ms | Duration outside range | LOW | Use 150-300ms for micro-interactions | Use >500ms or <100ms transitions |
| 9 | Loading states | Async ops without loading indicator | MEDIUM | Show skeleton/spinner during fetch | Leave blank screen while loading |
| 10 | Error states | Async ops without error handling | HIGH | Show user-friendly error message | Silently fail or show raw error |

### Design Compliance

| # | Check | Pattern | Severity | Do | Don't |
|---|-------|---------|----------|-----|-------|
| 11 | No hardcoded colors | Hex values outside tokens.css | HIGH | Use var(--color-*) tokens | Hardcode #hex values |
| 12 | No hardcoded spacing | px values for margin/padding | MEDIUM | Use var(--space-*) tokens | Hardcode pixel values |
| 13 | No emoji as icons | Unicode emoji in UI | HIGH | Use proper SVG/icon library | Use emoji for functional icons |
| 14 | Dark mode support | No prefers-color-scheme | MEDIUM | Support light/dark themes | Design for light mode only |

### Layout

| # | Check | Pattern | Severity | Do | Don't |
|---|-------|---------|----------|-----|-------|
| 15 | Responsive breakpoints | No md:/lg:/@media | MEDIUM | Mobile-first responsive design | Desktop-only layout |
| 16 | No horizontal scroll | Fixed widths > viewport | HIGH | Use relative/fluid widths | Set fixed pixel widths on containers |

## Execution

```javascript
function runPreDeliveryChecklist(fileContents) {
  const results = { passed: 0, failed: 0, items: [] }

  const checks = [
    { id: 1, check: "Images have alt text", test: (c) => /<img\s/.test(c) && !/<img\s[^>]*alt=/.test(c), severity: 'CRITICAL' },
    { id: 7, check: "cursor-pointer on clickable", test: (c) => /button|onClick/.test(c) && !/cursor-pointer/.test(c), severity: 'MEDIUM' },
    { id: 11, check: "No hardcoded colors", test: (c, f) => f !== 'src/styles/tokens.css' && /#[0-9a-fA-F]{6}/.test(c), severity: 'HIGH' },
    { id: 13, check: "No emoji as icons", test: (c) => /[\u{1F300}-\u{1F9FF}]/u.test(c), severity: 'HIGH' },
    { id: 14, check: "Dark mode support", test: (c) => !/prefers-color-scheme|dark:|\.dark/.test(c), severity: 'MEDIUM', global: true },
    { id: 15, check: "Responsive breakpoints", test: (c) => !/md:|lg:|@media.*min-width/.test(c), severity: 'MEDIUM', global: true }
  ]

  // Per-file checks
  for (const [file, content] of Object.entries(fileContents)) {
    for (const check of checks.filter(c => !c.global)) {
      if (check.test(content, file)) {
        results.failed++
        results.items.push({ ...check, file, status: 'FAIL' })
      } else {
        results.passed++
        results.items.push({ ...check, file, status: 'PASS' })
      }
    }
  }

  // Global checks (across all content)
  const allContent = Object.values(fileContents).join('\n')
  for (const check of checks.filter(c => c.global)) {
    if (check.test(allContent)) {
      results.failed++
      results.items.push({ ...check, file: 'global', status: 'FAIL' })
    } else {
      results.passed++
      results.items.push({ ...check, file: 'global', status: 'PASS' })
    }
  }

  return results
}
```

## Output Format

```
## Pre-Delivery Checklist Results
- Passed: X / Y
- Failed: Z

### Failed Items
- [CRITICAL] #1 Images have alt text — src/components/Hero.tsx
- [HIGH] #11 No hardcoded colors — src/styles/custom.css
```

## Error Handling

| Scenario | Resolution |
|----------|------------|
| No files to check | Report empty checklist, score 10/10 |
| File read error | Skip file, note in report |
| Regex error | Skip check, note in report |
