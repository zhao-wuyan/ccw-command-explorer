# Phase 2: Related CLAUDE.md Update (update-related)

仅更新 git 变更模块的 CLAUDE.md，使用深度优先执行和自动 tool fallback。

## Objective

- 检测 git 变更，识别受影响模块
- 按深度 N→0 顺序更新变更模块及其父级上下文
- <15 模块直接并行，≥15 模块使用 agent 批处理
- 自动 tool fallback (gemini→qwen→codex)

## Parameters

- `--tool <gemini|qwen|codex>`: Primary tool (default: gemini)

## Execution

**Execution Flow**: Change Detection → Plan Presentation → Batched Execution → Safety Verification

### Core Rules

1. **Detect Changes First**: Use git diff to identify affected modules
2. **Wait for Approval**: Present plan, no execution without user confirmation
3. **Execution Strategy**:
   - <15 modules: Direct parallel execution (max 4 concurrent per depth, no agent overhead)
   - ≥15 modules: Agent batch processing (4 modules/agent, 73% overhead reduction)
4. **Tool Fallback**: Auto-retry with fallback tools on failure
5. **Depth Sequential**: Process depths N→0, parallel batches within depth (both modes)
6. **Related Mode**: Update only changed modules and their parent contexts

### Tool Fallback Hierarchy

```javascript
--tool gemini  →  [gemini, qwen, codex]  // default
--tool qwen    →  [qwen, gemini, codex]
--tool codex   →  [codex, gemini, qwen]
```

**Trigger**: Non-zero exit code from update script

### Step 2.1: Change Detection & Analysis

```javascript
// Detect changed modules
Bash({command: "ccw tool exec detect_changed_modules '{\"format\":\"list\"}'", run_in_background: false});

// Cache git changes
Bash({command: "git add -A 2>/dev/null || true", run_in_background: false});
```

**Parse output** `depth:N|path:<PATH>|change:<TYPE>` to extract affected modules.

**Smart filter**: Auto-detect and skip tests/build/config/docs based on project tech stack (Node.js/Python/Go/Rust/etc).

**Fallback**: If no changes detected, use recent modules (first 10 by depth).

### Step 2.2: Plan Presentation

**Present filtered plan**:
```
Related Update Plan:
  Tool: gemini (fallback: qwen → codex)
  Changed: 4 modules | Batching: 4 modules/agent

  Will update:
  - ./src/api/auth (5 files) [new module]
  - ./src/api (12 files) [parent of changed auth/]
  - ./src (8 files) [parent context]
  - . (14 files) [root level]

  Auto-skipped (12 paths):
  - Tests: ./src/api/auth.test.ts (8 paths)
  - Config: tsconfig.json (3 paths)
  - Other: node_modules (1 path)

  Agent allocation:
  - Depth 3 (1 module): 1 agent [1]
  - Depth 2 (1 module): 1 agent [1]
  - Depth 1 (1 module): 1 agent [1]
  - Depth 0 (1 module): 1 agent [1]

  Confirm execution? (y/n)
```

**Decision logic**:
- User confirms "y": Proceed with execution
- User declines "n": Abort, no changes
- <15 modules: Direct execution
- ≥15 modules: Agent batch execution

### Step 2.3A: Direct Execution (<15 modules)

**Strategy**: Parallel execution within depth (max 4 concurrent), no agent overhead.

**CRITICAL**: All Bash commands use `run_in_background: false` for synchronous execution.

```javascript
for (let depth of sorted_depths.reverse()) {  // N → 0
  let batches = batch_modules(modules_by_depth[depth], 4);

  for (let batch of batches) {
    let parallel_tasks = batch.map(module => {
      return async () => {
        for (let tool of tool_order) {
          Bash({
            command: `cd ${module.path} && ccw tool exec update_module_claude '{"strategy":"single-layer","path":".","tool":"${tool}"}'`,
            run_in_background: false
          });
          if (bash_result.exit_code === 0) {
            report(`✅ ${module.path} updated with ${tool}`);
            return true;
          }
        }
        report(`❌ FAILED: ${module.path} failed all tools`);
        return false;
      };
    });
    await Promise.all(parallel_tasks.map(task => task()));
  }
}
```

### Step 2.3B: Agent Batch Execution (≥15 modules)

#### Batching Strategy

```javascript
// Batch modules into groups of 4
function batch_modules(modules, batch_size = 4) {
  let batches = [];
  for (let i = 0; i < modules.length; i += batch_size) {
    batches.push(modules.slice(i, i + batch_size));
  }
  return batches;
}
// Examples: 10→[4,4,2] | 8→[4,4] | 3→[3]
```

#### Coordinator Orchestration

```javascript
let modules_by_depth = group_by_depth(changed_modules);
let tool_order = construct_tool_order(primary_tool);

for (let depth of sorted_depths.reverse()) {  // N → 0
  let batches = batch_modules(modules_by_depth[depth], 4);
  let worker_tasks = [];

  for (let batch of batches) {
    worker_tasks.push(
      Task(
        subagent_type="memory-bridge",
        description=`Update ${batch.length} modules at depth ${depth}`,
        prompt=generate_batch_worker_prompt(batch, tool_order, "related")
      )
    );
  }

  await parallel_execute(worker_tasks);  // Batches run in parallel
}
```

#### Batch Worker Prompt Template

```
PURPOSE: Update CLAUDE.md for assigned modules with tool fallback (related mode)

TASK:
Update documentation for the following modules based on recent changes. For each module, try tools in order until success.

MODULES:
{{module_path_1}}
{{module_path_2}}
{{module_path_3}}
{{module_path_4}}

TOOLS (try in order):
1. {{tool_1}}
2. {{tool_2}}
3. {{tool_3}}

EXECUTION:
For each module above:
  1. Try tool 1:
     Bash({
       command: `cd "{{module_path}}" && ccw tool exec update_module_claude '{"strategy":"single-layer","path":".","tool":"{{tool_1}}"}'`,
       run_in_background: false
     })
     → Success: Report "✅ {{module_path}} updated with {{tool_1}}", proceed to next module
     → Failure: Try tool 2
  2. Try tool 2:
     Bash({
       command: `cd "{{module_path}}" && ccw tool exec update_module_claude '{"strategy":"single-layer","path":".","tool":"{{tool_2}}"}'`,
       run_in_background: false
     })
     → Success: Report "✅ {{module_path}} updated with {{tool_2}}", proceed to next module
     → Failure: Try tool 3
  3. Try tool 3:
     Bash({
       command: `cd "{{module_path}}" && ccw tool exec update_module_claude '{"strategy":"single-layer","path":".","tool":"{{tool_3}}"}'`,
       run_in_background: false
     })
     → Success: Report "✅ {{module_path}} updated with {{tool_3}}", proceed to next module
     → Failure: Report "❌ FAILED: {{module_path}} failed all tools", proceed to next module

REPORTING:
Report final summary with:
- Total processed: X modules
- Successful: Y modules
- Failed: Z modules
- Tool usage: {{tool_1}}:X, {{tool_2}}:Y, {{tool_3}}:Z
```

### Step 2.4: Safety Verification

```javascript
// Check only CLAUDE.md modified
Bash({command: 'git diff --cached --name-only | grep -v "CLAUDE.md" || echo "Only CLAUDE.md files modified"', run_in_background: false});

// Display statistics
Bash({command: "git diff --stat", run_in_background: false});
```

**Aggregate results**:
```
Update Summary:
  Total: 4 | Success: 4 | Failed: 0

  Tool usage:
  - gemini: 4 modules
  - qwen: 0 modules (fallback)
  - codex: 0 modules

  Changes:
  src/api/auth/CLAUDE.md  | 45 +++++++++++++++++++++
  src/api/CLAUDE.md       | 23 +++++++++--
  src/CLAUDE.md           | 12 ++++--
  CLAUDE.md               | 8 ++--
  4 files changed, 82 insertions(+), 6 deletions(-)
```

## Error Handling

**Batch Worker**:
- Tool fallback per module (auto-retry)
- Batch isolation (failures don't propagate)
- Clear per-module status reporting

**Coordinator**:
- No changes: Use fallback (recent 10 modules)
- User decline: No execution
- Safety check fail: Auto-revert staging
- Partial failures: Continue execution, report failed modules

**Fallback Triggers**:
- Non-zero exit code
- Script timeout
- Unexpected output

## Output

- **Files**: Updated CLAUDE.md files for changed modules and their parents
- **Report**: Summary with success/failure counts, tool usage, and git diff statistics

## Next Phase

Return to [manage.md](../manage.md) router.
