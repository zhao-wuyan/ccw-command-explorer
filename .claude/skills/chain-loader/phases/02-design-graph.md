# Phase 2: Design Node Graph

Transform skill analysis into a validated directed graph of chain nodes.

## Step 2.1: Choose Chain Pattern

Based on the workflow analysis from Phase 1, select a pattern from `specs/design-patterns.md`:

| Workflow Shape | Pattern | Example |
|----------------|---------|---------|
| Pure sequential | Linear Chain | `S1 → S2 → S3 → null` |
| Quality gate / retry | Decision Gate | `S1 → D1 --[pass]--> S2 --[fail]--> S1` |
| Normal vs escalation | Escalation Branch | `D1 --[simple]--> S2 --[complex]--> ->deep` |
| Reusable sub-workflow | Delegate | `S1 → DEL1 [->verify] → S2` |
| Multi-flow routing | Decision Router | `D1 --[A]--> S_A1 --[B]--> S_B1` (ccw-chain pattern) |

## Step 2.2: Define Nodes

For each workflow step, create a node definition:

**StepNode** — loads content for LLM execution:
- `content_ref: "@phases/{file}"` for existing files
- `content_inline: "..."` for short instructions only (<200 chars)
- `next: "{node_id}"` or `null` for terminal

**DecisionNode** — LLM chooses a path:
- `prompt`: describe what the LLM should assess
- `choices[]`: each with `label`, `description`, `next`
- `default`: fallback node ID

**DelegateNode** — route to sub-chain:
- `chain`: sub-chain filename (without .json)
- `next`: return node after sub-chain completes

**Node ID conventions**:
- Steps: `S1`, `S2`, `S3` (sequential) or `S_{prefix}{n}` for multi-flow (e.g., `S_R1`, `S_B1`)
- Decisions: `D1`, `D2`
- Delegates: `DEL1`, `DEL2`

## Step 2.3: Design Routing

For multi-flow chains (like ccw-chain's category chains), use the Decision Router pattern:

```
D1 (Select Flow)
├── choice 1 → S_A1 → S_A2 → null
├── choice 2 → S_B1 → S_B2 → S_B3 → null
└── choice 3 → S_C1 → null
```

For cross-chain routing, use `"next": "->chain-name"` to jump to another chain's entry node.

## Step 2.4: Validate Graph

Before proceeding to generation, verify:

1. **Entry exists** — `entry` points to a node in `nodes`
2. **All `next` references resolve** — every node ID in `next`, `choices[].next`, `default` either exists in `nodes`, is `null`, or starts with `->` (cross-chain)
3. **No orphan nodes** — BFS from entry reaches every node in `nodes`
4. **Content files exist** — every `content_ref` path resolves to a real file
5. **Decision completeness** — every DecisionNode has non-empty `choices` and a `default`

If validation fails, fix the graph before proceeding. Do NOT generate invalid chains.

## Output

- Validated node graph (nodes map ready for JSON serialization)
- Sub-chain definitions if any
- List of content files that need creation

## Next Phase

Proceed to [Phase 3: Generate & Validate](03-generate-validate.md).
