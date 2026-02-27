---
name: {{SKILL_NAME}}
description: {{SKILL_DESCRIPTION}}
allowed-tools: {{ALLOWED_TOOLS}}
---

# {{SKILL_TITLE}}

{{SKILL_DESCRIPTION}}

## Architecture

```
┌─────────────────────────────────────────────────┐
│               {{SKILL_TITLE}}                    │
│                                                 │
│  Input → {{PHASE_1}} → {{PHASE_2}} → Output    │
└─────────────────────────────────────────────────┘
```

## Execution Flow

```javascript
async function {{SKILL_FUNCTION}}(input) {
  // Phase 1: {{PHASE_1}}
  const prepared = await phase1(input);

  // Phase 2: {{PHASE_2}}
  const result = await phase2(prepared);

  return result;
}
```

### Phase 1: {{PHASE_1}}

```javascript
async function phase1(input) {
  // TODO: Implement {{PHASE_1_LOWER}} logic
  return output;
}
```

### Phase 2: {{PHASE_2}}

```javascript
async function phase2(input) {
  // TODO: Implement {{PHASE_2_LOWER}} logic
  return output;
}
```

## Usage

```bash
/skill:{{SKILL_NAME}} "input description"
```

## Examples

**Basic Usage**:
```
User: "{{EXAMPLE_INPUT}}"
{{SKILL_NAME}}:
  → Phase 1: {{PHASE_1_ACTION}}
  → Phase 2: {{PHASE_2_ACTION}}
  → Output: {{EXAMPLE_OUTPUT}}
```
