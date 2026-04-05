# Chain Design Patterns

Common patterns and anti-patterns for chain graph design.

## Patterns

### 1. Linear Chain (Simplest)

```
S1 → S2 → S3 → null
```

Use when: Pure sequential workflow, no branching needed. Equivalent to numbered phases but with session tracking.

### 2. Decision Gate

```
S1 → S2 → D1 --[pass]--> S3 → null
                --[fail]--> S2 (loop back)
```

Use when: Quality gate after analysis, confidence check, retry loop.

### 3. Escalation Branch

```
S1 → S2 → D1 --[simple]--> S3 → null
                --[complex]--> →deep-analysis (cross-chain)
```

Use when: Normal path vs. escalation to separate workflow.

### 4. Delegate Sub-Chain

```
S1 → S2 → DEL1 [→verification] → S3 → null
```

Use when: Reusable sub-workflow that multiple chains can call.

### 5. Multi-Path Merge

```
S1 → D1 --[A]--> S2A → S3
         --[B]--> S2B → S3
```

Use when: Different approaches converge to same final step.

### 6. Decision Router (Multi-Flow)

```
D1 --[flow A]--> S_A1 → S_A2 → null
   --[flow B]--> S_B1 → S_B2 → S_B3 → null
   --[flow C]--> S_C1 → null
```

Use when: Single entry point dispatches to multiple independent pipelines. Each flow has its own step sequence. This is the primary pattern used in ccw-chain's category chains (ccw-lightweight, ccw-standard, ccw-exploration, etc.).

## Anti-Patterns

### 1. Too Many Decisions

Bad: `D1 → D2 → D3 → D4` (decision after decision)

Fix: Combine into one decision with more choices, or add a step between decisions.

### 2. Orphan Nodes

Bad: Node exists in `nodes` but unreachable from `entry`.

Fix: Remove it or connect it to the graph.

### 3. Missing Default

Bad: Decision node without `default` field.

Fix: Always set `default` to a safe fallback node.

### 4. Deep Delegation

Bad: Chain A delegates to B which delegates to C which delegates to D.

Fix: Keep delegation to max 2 levels. Flatten if possible.

### 5. Inline Novel Content

Bad: `content_inline` with 500+ words of unique instruction.

Fix: Extract to a `phases/*.md` file and use `content_ref`.

## Chain Sizing Guide

| Complexity | Nodes | Decisions | Sub-chains |
|-----------|-------|-----------|------------|
| Simple | 3-5 | 0-1 | 0 |
| Standard | 5-8 | 1-2 | 0-1 |
| Complex | 8-12 | 2-3 | 1-2 |
| Large | 12+ | Consider splitting into multiple chains |
