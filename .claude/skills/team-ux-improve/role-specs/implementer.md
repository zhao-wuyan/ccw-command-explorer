---
prefix: IMPL
inner_loop: true
message_types:
  success: impl_complete
  error: error
---

# Code Implementer

Generate executable fix code with proper state management, event handling, and UI feedback bindings.

## Phase 2: Task & Design Loading

1. Extract session path from task description
2. Read design guide: `<session>/artifacts/design-guide.md`
3. Extract implementation tasks from design guide
4. **Wisdom Input**:
   - Read `<session>/wisdom/patterns/state-management.md` for state handling patterns
   - Read `<session>/wisdom/patterns/ui-feedback.md` for UI feedback implementation patterns
   - Read `<session>/wisdom/principles/general-ux.md` for implementation principles
   - Load framework-specific conventions if available
   - Apply these patterns and principles when generating code to ensure consistency and quality
5. **For inner loop**: Load context_accumulator from prior IMPL tasks

### Context Accumulator (Inner Loop)

```
context_accumulator = {
  completed_fixes: [<fix-1>, <fix-2>],
  modified_files: [<file-1>, <file-2>],
  patterns_applied: [<pattern-1>]
}
```

## Phase 3: Code Implementation

Implementation backend selection:

| Backend | Condition | Method |
|---------|-----------|--------|
| CLI | Complex multi-file changes | `ccw cli --tool gemini --mode write` |
| Direct | Simple single-file changes | Inline Edit/Write |

### CLI Implementation (Complex)

```
Bash(`ccw cli -p "PURPOSE: Implement loading state and error handling for upload form
TASK:
  - Add useState for isLoading and error
  - Wrap async call in try/catch/finally
  - Update UI bindings for button and error display
CONTEXT: @src/components/Upload.tsx
EXPECTED: Modified Upload.tsx with complete implementation
CONSTRAINTS: Maintain existing code style" --tool gemini --mode write`)
```

### Direct Implementation (Simple)

For simple state variable additions or UI binding changes:

```
Edit({
  file_path: "src/components/Upload.tsx",
  old_string: "const handleUpload = async () => {",
  new_string: "const [isLoading, setIsLoading] = useState(false);\nconst [error, setError] = useState<string | null>(null);\n\nconst handleUpload = async () => {\n  setIsLoading(true);\n  setError(null);\n  try {"
})
```

### Implementation Steps

For each fix in design guide:
1. Read target file
2. Determine complexity (simple vs complex)
3. Apply fix using appropriate backend
4. Verify syntax (no compilation errors)
5. Append to context_accumulator

## Phase 4: Self-Validation

| Check | Method | Pass Criteria |
|-------|--------|---------------|
| Syntax | IDE diagnostics or tsc --noEmit | No errors |
| File existence | Verify planned files exist | All present |
| Acceptance criteria | Match against design guide | All met |

Validation steps:
1. Run syntax check on modified files
2. Verify all files from design guide exist
3. Check acceptance criteria from design guide
4. If validation fails -> attempt auto-fix (max 2 attempts)

### Context Accumulator Update

Append to context_accumulator:
```
{
  completed_fixes: [...prev, <current-fix>],
  modified_files: [...prev, <current-files>],
  patterns_applied: [...prev, <current-patterns>]
}
```

Write summary to `<session>/artifacts/fixes/README.md`:
```markdown
# Implementation Summary

## Completed Fixes
- Issue #1: Upload form loading state - DONE
- Issue #2: Error handling - DONE

## Modified Files
- src/components/Upload.tsx
- src/components/Form.tsx

## Patterns Applied
- React useState for loading/error states
- try/catch/finally for async handling
- Conditional rendering for error messages
```

Share state via team_msg:
```
team_msg(operation="log", session_id=<session-id>, from="implementer",
         type="state_update", data={
           completed_fixes: <count>,
           modified_files: [<file-list>],
           validation_passed: true
         })
```

### Wisdom Contribution

If reusable code patterns or snippets created:
1. Write code snippets to `<session>/wisdom/contributions/implementer-snippets-<timestamp>.md`
2. Format: Use case, code snippet with comments, framework compatibility notes

Example contribution format:
```markdown
# Implementer Snippets - <timestamp>

## Loading State Pattern (React)

### Use Case
Async operations requiring loading indicator

### Code Snippet
```tsx
const [isLoading, setIsLoading] = useState(false);

const handleAsyncAction = async () => {
  setIsLoading(true);
  try {
    await performAction();
  } finally {
    setIsLoading(false);
  }
};
```

### Framework Compatibility
- React 16.8+ (hooks)
- Next.js compatible
```
