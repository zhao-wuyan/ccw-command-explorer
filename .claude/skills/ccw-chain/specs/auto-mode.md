# Auto Mode Specification

When user passes `-y` or `--yes` in arguments, the entire CCW chain enters auto mode.

## Detection

```javascript
const autoYes = /\b(-y|--yes)\b/.test($ARGUMENTS)
```

## Behavior Changes

| Phase | Normal Mode | Auto Mode |
|-------|-------------|-----------|
| Phase 1 (Analyze) | Full analysis | Same |
| Phase 1.5 (Clarify) | Ask if clarity < 2 | **Skip** — infer from available info |
| Phase 3 (Confirm) | Show pipeline, ask confirm | **Skip** — execute immediately |
| Phase 5 (Execute) | Error → ask retry/skip/abort | **Skip** failed step, continue |
| Skill Args | As-is | **Inject** `-y` to all downstream Skills |

## Propagation Mechanism

The `-y` flag is propagated to every Skill in the command chain via `assembleCommand`:

```javascript
function assembleCommand(step, previousResult) {
  let args = step.args || '';
  if (!args && previousResult?.session_id) {
    args = `--session="${previousResult.session_id}"`;
  }
  // Propagate -y to downstream Skills
  if (autoYes && !args.includes('-y') && !args.includes('--yes')) {
    args = args ? `${args} -y` : '-y';
  }
  return { skill: step.cmd, args };
}
```

## Examples

```bash
# Auto mode — skip all confirmations
/ccw -y "Add user authentication"

# Auto mode — urgent hotfix, skip everything
/ccw --yes "Fix memory leak in WebSocket handler"
```
