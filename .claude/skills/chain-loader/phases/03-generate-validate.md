# Phase 3: Generate & Validate

Write chain JSON files and validate with the chain_loader tool.

## Step 3.1: Create Directory

```bash
mkdir -p ".claude/skills/${skillName}/chains"
```

## Step 3.2: Write Chain JSON

Write the main chain file using the validated graph from Phase 2:

```json
{
  "chain_id": "{chain-id}",
  "name": "{Human-Readable Name}",
  "description": "{What this chain does}",
  "version": "1.0",
  "entry": "{first-node-id}",
  "nodes": { ... }
}
```

Write to: `.claude/skills/{skill}/chains/{chain-id}.json`

If there are sub-chains, write each as a separate JSON file in the same `chains/` directory.

## Step 3.3: Create Missing Content Files

If any step nodes need new content files:
1. Write the content to `phases/{filename}.md`
2. Ensure the `content_ref` in the chain JSON matches: `@phases/{filename}.md`

For content files copied from commands or other skills, preserve the full document — do not summarize.

## Step 3.4: Validate Structure

Check the generated JSON:

1. **Required fields**: `chain_id`, `name`, `description`, `version`, `entry`, `nodes`
2. **Entry exists**: `entry` points to a key in `nodes`
3. **Node completeness**: every node has `type` and `name`
4. **Step nodes**: have `content_ref` or `content_inline`
5. **Decision nodes**: have non-empty `choices[]` and `default`
6. **Delegate nodes**: have `chain` field
7. **All `next` references**: resolve to existing nodes, `null`, or `->chain-name`
8. **No orphans**: BFS from entry reaches every node
9. **Content refs exist**: every `@phases/...` file is on disk

## Step 3.5: Integration Test

Test with the chain_loader tool from the **project root** (not from the skill directory):

```bash
# List — should show the new chain(s)
ccw tool exec chain_loader '{"cmd":"list","skill":"{skill-name}"}'

# Start — should return entry node content
ccw tool exec chain_loader '{"cmd":"start","skill":"{skill-name}","chain":"{chain-id}"}'
```

**Known gotcha**: `chain_loader list` auto-detects skill from cwd. Run from project root with explicit `skill` param to avoid empty results.

## Step 3.6: Report Results

Output summary:
- Chains generated (count and names)
- Total nodes, by type (step/decision/delegate)
- Validation status (PASS/FAIL)
- Any warnings (orphan nodes, missing content)

If FAIL: fix errors before marking complete.
If PASS: the chain is ready for use.
