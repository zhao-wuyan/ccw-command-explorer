---
prefix: DESIGN
inner_loop: false
message_types:
  success: design_complete
  error: error
---

# UX Designer

Design feedback mechanisms (loading/error/success states) and state management patterns (React/Vue reactive updates).

## Phase 2: Context & Pattern Loading

1. Load diagnosis report from `<session>/artifacts/diagnosis.md`
2. Load diagnoser state via `team_msg(operation="get_state", session_id=<session-id>, role="diagnoser")`
3. Detect framework from project structure
4. Load framework-specific patterns:

| Framework | State Pattern | Event Pattern |
|-----------|---------------|---------------|
| React | useState, useRef | onClick, onChange |
| Vue | ref, reactive | @click, @change |

### Wisdom Input

1. Read `<session>/wisdom/patterns/ui-feedback.md` for established feedback design patterns
2. Read `<session>/wisdom/patterns/state-management.md` for state handling patterns
3. Read `<session>/wisdom/principles/general-ux.md` for UX design principles
4. Apply patterns when designing solutions for identified issues

### Complex Design (use CLI)

For complex multi-component solutions:

```
Bash(`ccw cli -p "PURPOSE: Design comprehensive feedback mechanism for multi-step form
CONTEXT: @<component-files>
EXPECTED: Complete design with state flow diagram and code patterns
CONSTRAINTS: Must support React hooks" --tool gemini --mode analysis`)
```

## Phase 3: Solution Design

For each diagnosed issue, design solution:

### Feedback Mechanism Design

| Issue Type | Solution Design |
|------------|-----------------|
| Missing loading | Add loading state + UI indicator (spinner, disabled button) |
| Missing error | Add error state + error message display |
| Missing success | Add success state + confirmation toast/message |
| No empty state | Add conditional rendering for empty data |

### State Management Design

**React Pattern**:
```typescript
// Add state variables
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

// Wrap async operation
const handleSubmit = async (event: React.FormEvent) => {
  event.preventDefault();
  setIsLoading(true);
  setError(null);

  try {
    const response = await fetch('/api/upload', { method: 'POST', body: formData });
    if (!response.ok) throw new Error('Upload failed');
    // Success handling
  } catch (err: any) {
    setError(err.message || 'An error occurred');
  } finally {
    setIsLoading(false);
  }
};

// UI binding
<button type="submit" disabled={isLoading}>
  {isLoading ? 'Uploading...' : 'Upload File'}
</button>
{error && <p style={{ color: 'red' }}>{error}</p>}
```

**Vue Pattern**:
```typescript
// Add reactive state
const isLoading = ref(false);
const error = ref<string | null>(null);

// Wrap async operation
const handleSubmit = async () => {
  isLoading.value = true;
  error.value = null;

  try {
    const response = await fetch('/api/upload', { method: 'POST', body: formData });
    if (!response.ok) throw new Error('Upload failed');
    // Success handling
  } catch (err: any) {
    error.value = err.message || 'An error occurred';
  } finally {
    isLoading.value = false;
  }
};

// UI binding
<button @click="handleSubmit" :disabled="isLoading">
  {{ isLoading ? 'Uploading...' : 'Upload File' }}
</button>
<p v-if="error" style="color: red">{{ error }}</p>
```

### Input Control Design

| Issue | Solution |
|-------|----------|
| Text input for file path | Add file picker: `<input type="file" />` |
| Text input for folder path | Add directory picker: `<input type="file" webkitdirectory />` |
| No validation | Add validation rules and error messages |

## Phase 4: Design Document Generation

1. Generate implementation guide for each issue:

```markdown
# Design Guide

## Issue #1: Upload form no loading state

### Solution Design
Add loading state with UI feedback and error handling.

### State Variables (React)
```typescript
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
```

### Event Handler
```typescript
const handleUpload = async (event: React.FormEvent) => {
  event.preventDefault();
  setIsLoading(true);
  setError(null);

  try {
    // API call
  } catch (err: any) {
    setError(err.message);
  } finally {
    setIsLoading(false);
  }
};
```

### UI Binding
```tsx
<button type="submit" disabled={isLoading}>
  {isLoading ? 'Uploading...' : 'Upload File'}
</button>
{error && <p className="error">{error}</p>}
```

### Acceptance Criteria
- Loading state shows during upload
- Button disabled during upload
- Error message displays on failure
- Success confirmation on completion
```

2. Write guide to `<session>/artifacts/design-guide.md`

### Wisdom Contribution

If novel design patterns created:
1. Write new patterns to `<session>/wisdom/contributions/designer-pattern-<timestamp>.md`
2. Format: Problem context, solution design, implementation hints, trade-offs

3. Share state via team_msg:
   ```
   team_msg(operation="log", session_id=<session-id>, from="designer",
            type="state_update", data={
              designed_solutions: <count>,
              framework: <framework>,
              patterns_used: [<pattern-list>]
            })
   ```
