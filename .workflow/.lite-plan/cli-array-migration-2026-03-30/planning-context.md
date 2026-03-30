# Planning Context: CLI Array Migration

## Evidence Summary

### Handoff Source
- **Source**: analyze-with-file session ANL-cli-array-migration-2026-03-30
- **Summary**: 将 CLI 字段从单一字符串类型改为数组类型，支持同一命令适配多个 CLI

### Key Findings
1. 当前 CLIType 是单一字符串联合类型，需要改为数组支持多 CLI
2. 存在 3 个重复命令定义 (team-planex, team-lifecycle, review-cycle)
3. STATS 统计使用 === 比较，不支持数组

### Code Anchors
| File | Lines | Current | Target |
|------|-------|---------|--------|
| src/data/types.ts | 26 | `cli: CLIType` | `cli: CLIType[]` |
| src/data/commands.ts | 550-551 | `c.cli === 'claude'` | `c.cli.includes('claude')` |
| src/App.tsx | 135-155 | `CLIBadge` 单标签 | 多标签支持 |
| src/App.tsx | 28 | `c.cli === cli` | `c.cli.includes(cli)` |
| src/App.tsx | 3430 | `cmd.cli === selectedCLI` | `cmd.cli.includes(selectedCLI)` |

### Implementation Scope
1. **types.ts**: CLI 字段类型定义修改
2. **commands.ts**: 命令数据更新 + 合并重复 + 统计逻辑
3. **App.tsx**: 组件支持多 CLI 数组

### Decision Context
- **选择**: 数组类型 `CLIType[]`
- **原因**: 最直接支持多 CLI，修改清晰，保持代码简洁
- **拒绝**: 联合类型 `CLIType | CLIType[]` 会增加复杂度
