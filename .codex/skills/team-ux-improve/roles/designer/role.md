---
role: designer
prefix: DESIGN
inner_loop: false
message_types: [state_update]
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
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

const handleSubmit = async (event: React.FormEvent) => {
  event.preventDefault();
  setIsLoading(true);
  setError(null);
  try {
    const response = await fetch('/api/upload', { method: 'POST', body: formData });
    if (!response.ok) throw new Error('Upload failed');
  } catch (err: any) {
    setError(err.message || 'An error occurred');
  } finally {
    setIsLoading(false);
  }
};
```

**Vue Pattern**:
```typescript
const isLoading = ref(false);
const error = ref<string | null>(null);

const handleSubmit = async () => {
  isLoading.value = true;
  error.value = null;
  try {
    const response = await fetch('/api/upload', { method: 'POST', body: formData });
    if (!response.ok) throw new Error('Upload failed');
  } catch (err: any) {
    error.value = err.message || 'An error occurred';
  } finally {
    isLoading.value = false;
  }
};
```

### Input Control Design

| Issue | Solution |
|-------|----------|
| Text input for file path | Add file picker: `<input type="file" />` |
| Text input for folder path | Add directory picker: `<input type="file" webkitdirectory />` |
| No validation | Add validation rules and error messages |

## Phase 4: Design Document Generation

1. Generate implementation guide for each issue and write to `<session>/artifacts/design-guide.md`

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
