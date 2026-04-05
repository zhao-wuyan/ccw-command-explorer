# Chain JSON Template

## Minimal Linear Chain

```json
{
  "chain_id": "my-workflow",
  "name": "My Workflow",
  "description": "Sequential 3-step workflow",
  "version": "1.0",
  "entry": "S1",
  "nodes": {
    "S1": { "type": "step", "name": "Step 1", "content_ref": "@phases/01-step.md", "next": "S2" },
    "S2": { "type": "step", "name": "Step 2", "content_ref": "@phases/02-step.md", "next": "S3" },
    "S3": { "type": "step", "name": "Step 3", "content_ref": "@phases/03-step.md", "next": null }
  }
}
```

## Decision Router (from ccw-chain/ccw-lightweight)

```json
{
  "chain_id": "ccw-lightweight",
  "name": "CCW Lightweight Workflows",
  "description": "Level 2: rapid, bugfix, hotfix, docs-only",
  "version": "2.0",
  "entry": "D1",
  "nodes": {
    "D1": {
      "type": "decision",
      "name": "Select Lightweight Flow",
      "prompt": "Based on the detected task_type, select the flow:\n1. Rapid\n2. Bugfix\n3. Hotfix\n4. Docs",
      "choices": [
        { "label": "Rapid", "description": "lite-plan + test-fix", "next": "S_R1" },
        { "label": "Bugfix", "description": "lite-plan(--bugfix) + test-fix", "next": "S_B1" },
        { "label": "Hotfix", "description": "lite-plan(--hotfix)", "next": "S_H1" },
        { "label": "Docs", "description": "lite-plan(--docs)", "next": "S_D1" }
      ],
      "default": "S_R1"
    },
    "S_R1": { "type": "step", "name": "Rapid: workflow-lite-plan", "content_ref": "@phases/workflow-lite-plan.md", "next": "S_R2" },
    "S_R2": { "type": "step", "name": "Rapid: workflow-test-fix", "content_ref": "@skills/workflow-test-fix/SKILL.md", "next": null },
    "S_B1": { "type": "step", "name": "Bugfix: workflow-lite-plan", "content_ref": "@phases/workflow-lite-plan.md", "next": "S_B2" },
    "S_B2": { "type": "step", "name": "Bugfix: workflow-test-fix", "content_ref": "@skills/workflow-test-fix/SKILL.md", "next": null },
    "S_H1": { "type": "step", "name": "Hotfix: workflow-lite-plan", "content_ref": "@phases/workflow-lite-plan.md", "next": null },
    "S_D1": { "type": "step", "name": "Docs: workflow-lite-plan", "content_ref": "@phases/workflow-lite-plan.md", "next": null }
  }
}
```

## Cross-Chain Routing (from ccw-chain/ccw-main)

Decision choice with `"next": "->ccw-lightweight"` jumps to another chain's entry node.

## Node ID Conventions

| Prefix | Type | Example |
|--------|------|---------|
| `S{n}` | Sequential step | S1, S2, S3 |
| `S_{prefix}{n}` | Flow-scoped step | S_R1, S_B1, S_CP2 |
| `D{n}` | Decision | D1, D2 |
| `DEL{n}` | Delegate | DEL1 |
