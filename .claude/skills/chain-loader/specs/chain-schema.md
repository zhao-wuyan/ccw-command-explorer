# Chain JSON Schema & State Machine

## Chain JSON Structure

Files live at `.claude/skills/{skill}/chains/{chain-name}.json`.

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `chain_id` | string | Unique ID matching filename (without .json) |
| `name` | string | Human-readable name |
| `description` | string | What this chain does |
| `version` | string | Semantic version |
| `entry` | string? | Node ID of single entry point (backward compat) |
| `entries` | array? | Multiple named entry points (preferred over `entry`) |
| `triggers` | object? | Self-describing trigger conditions |
| `nodes` | object | Map of node ID to node definition |

### Entries (multiple entry points)

```json
"entries": [
  { "name": "default", "node": "D1", "description": "Select flow via decision" },
  { "name": "bugfix", "node": "S_B1", "description": "Direct: Bugfix flow" }
]
```
- First entry is the default when no `entry_name` or `node` specified in `start`
- Resolution priority: explicit `node` > `entry_name` lookup > `entries[0]` > `entry`

### Triggers (self-describing)

```json
"triggers": {
  "task_types": ["bugfix", "bugfix-hotfix", "quick-task"],
  "keywords": ["fix|bug|error", "urgent|production"],
  "scope": "Level 2: rapid, bugfix, hotfix, docs"
}
```
- `task_types`: array of task_type values this chain handles
- `keywords`: array of regex patterns for intent matching
- `scope`: human-readable description of when to use this chain

### StepNode

```json
{
  "type": "step",
  "name": "Phase Name",
  "content_ref": "@phases/01-xxx.md",
  "next": "S2"
}
```
- `content_ref` (`@`-prefixed path) or `content_inline` (direct text) — at least one required
- `content_ref` resolved relative to skill directory: `resolve(skillPath, refPath.replace('@',''))`
- `next: null` = chain termination

### DecisionNode

```json
{
  "type": "decision",
  "name": "Select Flow",
  "prompt": "Based on analysis, choose...",
  "choices": [
    { "label": "Option A", "description": "...", "next": "S_A1" },
    { "label": "Option B", "description": "...", "next": "S_B1" }
  ],
  "default": "S_A1"
}
```
- `choices` — non-empty array, selected by **1-based index**
- `choice.next` can be node ID or `"->chain-name"` for cross-chain routing
- `default` — fallback if no valid choice provided

### DelegateNode

```json
{
  "type": "delegate",
  "name": "Run Sub-workflow",
  "chain": "sub-chain-name",
  "next": "S5"
}
```
- `chain` — filename (without .json) of another chain in same skill's `chains/` dir
- `next` — return node after sub-chain completes; `null` if no return

### Cross-Chain Routing

- `"->chain-name"` in any `next` field jumps to that chain's entry node
- DelegateNode pushes current chain onto stack; sub-chain completion pops back to `next`

---

## Node State Machine

### Lifecycle

```
pending → active → completed
```

### Rules

1. `start` — creates session, entry node becomes `active`
2. `next` on `active` node — returns current content (idempotent, no state change)
3. `next` on `completed` node — auto-advances to next node
4. `done` — forces `active -> completed`, advances to next node
5. Decision `done` requires `choice` (1-based index)
6. Delegate `done` — pushes chain onto `chain_stack`, switches to sub-chain entry
7. Sub-chain termination (`next: null`) — pops `chain_stack`, returns to parent's `return_node`
8. All chains exhausted (empty stack + `next: null`) — session `completed`

### chain_loader Commands

| cmd | Params | Description |
|-----|--------|-------------|
| `list` | `skill?` | List chains with triggers/entries |
| `inspect` | `chain`, `skill?` | Show chain node graph and entries |
| `start` | `chain`, `skill?`, `node?`, `entry_name?` | Create session from entry, named entry, or any node |
| `next` | `session_id` | Read current node (idempotent if active) |
| `done` | `session_id`, `choice?` | Complete current node, advance |
| `status` | `session_id` | Query session state |
| `content` | `session_id` | Get all loaded content |
| `complete` | `session_id` | Mark session completed |
