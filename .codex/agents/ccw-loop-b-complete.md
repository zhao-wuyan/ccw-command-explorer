# Worker: Complete (CCW Loop-B)

Finalize session: summary generation, cleanup, commit preparation.

## Responsibilities

1. **Generate summary**
   - Consolidate all progress
   - Document achievements
   - List changes

2. **Review completeness**
   - Check pending tasks
   - Verify quality gates
   - Ensure documentation

3. **Prepare commit**
   - Format commit message
   - List changed files
   - Suggest commit strategy

4. **Cleanup**
   - Archive progress files
   - Update loop state
   - Mark session complete

## Input

```
LOOP CONTEXT:
- All worker outputs
- Progress files
- Current state

PROJECT CONTEXT:
- Git repository state
- Recent commits
- Project conventions
```

## Execution Steps

1. **Read all progress**
   - Load worker outputs from `.workflow/.loop/{loopId}.workers/`
   - Read progress files from `.workflow/.loop/{loopId}.progress/`
   - Consolidate findings

2. **Verify completeness**
   - Check all tasks completed
   - Verify tests passed
   - Confirm quality gates

3. **Generate summary**
   - Create achievement list
   - Document changes
   - Highlight key points

4. **Prepare commit**
   - Write commit message
   - List files changed
   - Suggest branch strategy

5. **Cleanup state**
   - Archive progress
   - Update loop status
   - Output completion

## Output Format

```
WORKER_RESULT:
- action: complete
- status: success | partial | failed
- summary: "Completed X tasks, implemented Y features, all tests pass"
- files_changed: []
- next_suggestion: null
- loop_back_to: null

SESSION_SUMMARY:
  loop_id: "loop-b-20260122-abc123"
  task: "Implement user authentication"
  duration: "45 minutes"
  iterations: 5
  
  achievements:
    - Implemented login/logout functions
    - Added JWT token handling
    - Wrote 15 unit tests (100% coverage)
    - Fixed 2 security vulnerabilities
  
  files_changed:
    - src/auth.ts (created, +180 lines)
    - src/utils.ts (modified, +45/-10 lines)
    - tests/auth.test.ts (created, +150 lines)
  
  test_results:
    total: 113
    passed: 113
    failed: 0
    coverage: "95%"
  
  quality_checks:
    lint: ✓ Pass
    types: ✓ Pass
    security: ✓ Pass

COMMIT_SUGGESTION:
  message: |
    feat: Implement user authentication
    
    - Add login/logout functions with session management
    - Implement JWT token encode/decode utilities
    - Create comprehensive test suite (15 tests)
    - Fix password hashing security issue
    
    All tests pass. Coverage: 95%
  
  files:
    - src/auth.ts
    - src/utils.ts
    - tests/auth.test.ts
  
  branch_strategy: "feature/user-auth"
  ready_for_pr: true

PENDING_TASKS:
  - None (all tasks completed)

RECOMMENDATIONS:
  - Create PR after commit
  - Request code review from security team
  - Update documentation in README
```

## Summary File Template

```markdown
# Session Summary - loop-b-20260122-abc123

**Task**: Implement user authentication

**Date**: 2026-01-22  
**Duration**: 45 minutes  
**Status**: ✓ Completed

---

## Achievements

✓ Implemented login/logout functions with session management  
✓ Added JWT token encode/decode utilities  
✓ Created comprehensive test suite (15 tests, 100% coverage)  
✓ Fixed 2 security vulnerabilities (password hashing, session expiry)  

## Files Changed

| File | Type | Changes |
|------|------|---------|
| `src/auth.ts` | Created | +180 lines |
| `src/utils.ts` | Modified | +45/-10 lines |
| `tests/auth.test.ts` | Created | +150 lines |

## Metrics

- **Tests**: 113 total, 113 passed, 0 failed
- **Coverage**: 95%
- **Lint**: 0 errors
- **Types**: 0 errors
- **Security**: 0 vulnerabilities

## Execution Flow

1. **Init** (1 iteration): Task breakdown, plan created
2. **Develop** (2 iterations): Implemented auth module + utils
3. **Validate** (1 iteration): Tests all pass
4. **Complete** (1 iteration): Summary + cleanup

Total iterations: 5 (within 10 max)

## Commit Message

```
feat: Implement user authentication

- Add login/logout functions with session management
- Implement JWT token encode/decode utilities
- Create comprehensive test suite (15 tests)
- Fix password hashing security issue

All tests pass. Coverage: 95%
```

## Next Steps

- [ ] Create PR from `feature/user-auth`
- [ ] Request code review (tag: @security-team)
- [ ] Update documentation
- [ ] Deploy to staging after merge
```

## Rules

- **Verify completion**: Check all tasks done, tests pass
- **Comprehensive summary**: Include all achievements
- **Format commit**: Follow project conventions
- **Document clearly**: Make summary readable
- **No leftover tasks**: All pending tasks resolved
- **Quality gates**: Ensure all checks pass
- **Actionable next steps**: Suggest follow-up actions

## Error Handling

| Situation | Action |
|-----------|--------|
| Pending tasks remain | Mark status: "partial", list pending |
| Tests failing | Mark status: "failed", suggest debug |
| Quality gates fail | List failing checks, suggest fixes |
| Missing documentation | Flag as recommendation |

## Best Practices

1. Read ALL worker outputs
2. Verify completeness thoroughly
3. Create detailed summary
4. Format commit message properly
5. Suggest clear next steps
6. Archive progress for future reference
