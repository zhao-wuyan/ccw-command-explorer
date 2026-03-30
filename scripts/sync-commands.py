#!/usr/bin/env python3
"""
同步 commands.ts 与目录中的实际命令文件

功能：
1. 扫描 .claude/commands、.claude/skills、.codex/prompts、.codex/skills 目录
2. 从 src/data/commands.ts 提取已定义的命令（含 CLI 数组）
3. 从 src/data/deprecated.ts 提取废弃命令
4. 从 src/data/patterns.ts 提取命令链引用
5. 对比差异，输出缺失和多余的命令
6. 检测残留旧命令（目录中存在但已被废弃）
7. 检测 CLI 类型不完整（命令存在多目录但 CLI 数组缺失类型）
8. 支持自动修复模式

使用方法：
  python scripts/sync-commands.py          # 仅检查
  python scripts/sync-commands.py --fix    # 自动修复（生成修复建议）
"""

import os
import re
import argparse
import json
from pathlib import Path
from typing import Set, Dict, List, Tuple

# 项目根目录
ROOT_DIR = Path(__file__).parent.parent
DATA_DIR = ROOT_DIR / 'src' / 'data'

def get_claude_commands() -> Set[str]:
    """扫描 .claude/commands 目录"""
    commands = set()
    commands_dir = ROOT_DIR / '.claude' / 'commands'

    if not commands_dir.exists():
        return commands

    for root, dirs, files in os.walk(commands_dir):
        # 排除 agent 目录
        dirs[:] = [d for d in dirs if d != 'agent']

        for f in files:
            if f.endswith('.md'):
                file_path = Path(root) / f
                rel_path = file_path.relative_to(commands_dir)
                parts = list(rel_path.parts)
                parts[-1] = parts[-1][:-3]  # 移除 .md 后缀
                if len(parts) == 1:
                    cmd = '/' + parts[0]
                else:
                    cmd = '/' + parts[0] + ':' + ':'.join(parts[1:])
                commands.add(cmd)

    return commands

# 排除列表：这些技能是同步工具本身，不应被检测
EXCLUDED_SKILLS = {
    'ccw-wiki-sync',  # 百科同步技能，不应出现在百科数据中
}

def get_claude_skills() -> Set[str]:
    """扫描 .claude/skills 目录

    注意：排除 EXCLUDED_SKILLS 中的技能（同步工具自身）
    """
    skills = set()
    skills_dir = ROOT_DIR / '.claude' / 'skills'

    if not skills_dir.exists():
        return skills

    for item in os.listdir(skills_dir):
        item_path = skills_dir / item
        # 排除 _ 开头的目录和 EXCLUDED_SKILLS 中的技能
        if item_path.is_dir() and not item.startswith('_') and item not in EXCLUDED_SKILLS:
            skills.add('/' + item)

    return skills

def get_codex_prompts() -> Set[str]:
    """扫描 .codex/prompts 目录"""
    prompts = set()
    prompts_dir = ROOT_DIR / '.codex' / 'prompts'

    if not prompts_dir.exists():
        return prompts

    for f in os.listdir(prompts_dir):
        if f.endswith('.md'):
            cmd = '/' + f.replace('.md', '')
            prompts.add(cmd)

    return prompts

def get_codex_skills() -> Set[str]:
    """扫描 .codex/skills 目录"""
    skills = set()
    skills_dir = ROOT_DIR / '.codex' / 'skills'

    if not skills_dir.exists():
        return skills

    for item in os.listdir(skills_dir):
        item_path = skills_dir / item
        if item_path.is_dir() and not item.startswith('_'):
            skills.add('/' + item)

    return skills

def get_ts_commands() -> Set[str]:
    """从 commands.ts 提取已定义的命令

    Returns:
        Set[str]: 活跃命令集合
    """
    commands_file = DATA_DIR / 'commands.ts'
    active_commands = set()

    if commands_file.exists():
        with open(commands_file, 'r', encoding='utf-8') as f:
            content = f.read()

        # 匹配 cmd: '/xxx' 格式
        pattern = r"cmd: '(/[^']+)'"
        active_commands = set(re.findall(pattern, content))

    return active_commands


def get_ts_commands_with_cli() -> Dict[str, List[str]]:
    """从 commands.ts 提取命令及其 CLI 数组

    Returns:
        Dict[str, List[str]]: {命令名: ['claude'] 或 ['codex'] 或 ['claude', 'codex']}
    """
    commands_file = DATA_DIR / 'commands.ts'
    commands_with_cli = {}

    if commands_file.exists():
        with open(commands_file, 'r', encoding='utf-8') as f:
            content = f.read()

        # 匹配命令对象块：{ cmd: '/xxx', ... cli: ['yyy', 'zzz'], ... }
        # 使用非贪婪匹配提取每个命令对象
        cmd_pattern = r"\{\s*cmd:\s*'(/[^']+)'[^}]*cli:\s*\[([^\]]*)\][^}]*\}"

        for match in re.finditer(cmd_pattern, content, re.DOTALL):
            cmd_name = match.group(1)
            cli_content = match.group(2)

            # 提取 CLI 数组中的值
            cli_values = re.findall(r"'(claude|codex)'", cli_content)
            commands_with_cli[cmd_name] = cli_values

    return commands_with_cli

def get_deprecated_commands() -> Dict[str, str]:
    """从 deprecated.ts 提取废弃命令

    Returns:
        Dict[str, str]: {旧命令: 替代命令或原因}
    """
    deprecated_file = DATA_DIR / 'deprecated.ts'
    deprecated = {}

    if deprecated_file.exists():
        with open(deprecated_file, 'r', encoding='utf-8') as f:
            content = f.read()

        # 匹配 { old: '/xxx', newCmd: '/yyy' 或 null, reason: '...' }
        pattern = r"\{\s*old:\s*'(/[^']+)',\s*newCmd:\s*(?:'(/[^']+)'|null),\s*reason:\s*'([^']+)'\s*\}"
        for match in re.finditer(pattern, content):
            old_cmd = match.group(1)
            new_cmd = match.group(2) or 'removed'
            deprecated[old_cmd] = new_cmd

    return deprecated

def get_pattern_commands() -> Set[str]:
    """从 patterns.ts 提取命令链中引用的命令

    Returns:
        Set[str]: 命令链中引用的所有命令
    """
    patterns_file = DATA_DIR / 'patterns.ts'
    pattern_commands = set()

    if patterns_file.exists():
        with open(patterns_file, 'r', encoding='utf-8') as f:
            content = f.read()

        # 匹配 cmd: '/xxx' 格式
        pattern = r"cmd: '(/[^']+)'"
        pattern_commands = set(re.findall(pattern, content))

    return pattern_commands

def get_command_source(cmd: str, claude_cmds: Set[str], claude_skls: Set[str],
                       codex_prmts: Set[str], codex_skls: Set[str]) -> str:
    """获取命令的来源目录"""
    if cmd in claude_cmds:
        return 'claude/commands'
    elif cmd in claude_skls:
        return 'claude/skills'
    elif cmd in codex_prmts:
        return 'codex/prompts'
    elif cmd in codex_skls:
        return 'codex/skills'
    return 'unknown'


def get_command_expected_cli(cmd: str, claude_cmds: Set[str], claude_skls: Set[str],
                              codex_prmts: Set[str], codex_skls: Set[str]) -> List[str]:
    """根据命令所在目录推断应该支持的 CLI 类型

    Returns:
        List[str]: 应该支持的 CLI 列表，如 ['claude'], ['codex'], 或 ['claude', 'codex']
    """
    in_claude = cmd in claude_cmds or cmd in claude_skls
    in_codex = cmd in codex_prmts or cmd in codex_skls

    if in_claude and in_codex:
        return ['claude', 'codex']
    elif in_claude:
        return ['claude']
    elif in_codex:
        return ['codex']
    return []


def detect_cli_mismatches(
    ts_commands_with_cli: Dict[str, List[str]],
    claude_cmds: Set[str], claude_skls: Set[str],
    codex_prmts: Set[str], codex_skls: Set[str]
) -> List[Dict]:
    """检测 CLI 类型不完整的命令

    检测 commands.ts 中记录的 CLI 数组是否与实际目录分布一致

    Returns:
        List[Dict]: [{cmd, expected_cli, actual_cli, missing_cli}]
    """
    mismatches = []

    for cmd, actual_cli in ts_commands_with_cli.items():
        expected_cli = get_command_expected_cli(
            cmd, claude_cmds, claude_skls, codex_prmts, codex_skls
        )

        if not expected_cli:
            # 命令不在任何目录中，这是 extra 的情况，单独处理
            continue

        # 检查是否有缺失的 CLI 类型
        actual_set = set(actual_cli)
        expected_set = set(expected_cli)
        missing_cli = expected_set - actual_set

        if missing_cli:
            mismatches.append({
                'cmd': cmd,
                'expected_cli': sorted(expected_cli),
                'actual_cli': actual_cli,
                'missing_cli': sorted(missing_cli)
            })

    return mismatches

def analyze_commands() -> Dict:
    """分析命令差异"""
    # 获取各来源的命令
    claude_commands = get_claude_commands()
    claude_skills = get_claude_skills()
    codex_prompts = get_codex_prompts()
    codex_skills = get_codex_skills()

    # 合并所有实际存在的命令
    all_actual = claude_commands | claude_skills | codex_prompts | codex_skills

    # 获取 commands.ts 中定义的命令
    ts_commands = get_ts_commands()

    # 获取 commands.ts 中的命令及其 CLI 数组
    ts_commands_with_cli = get_ts_commands_with_cli()

    # 获取废弃命令
    deprecated = get_deprecated_commands()

    # 获取命令链中引用的命令
    pattern_commands = get_pattern_commands()

    # 计算差异
    missing = all_actual - ts_commands  # 目录存在但 ts 缺失
    extra = ts_commands - all_actual     # ts 存在但目录不存在

    # 检测残留旧命令（目录中存在但已被废弃）
    stale_in_dirs = set()
    for cmd in all_actual:
        if cmd in deprecated:
            stale_in_dirs.add(cmd)

    # 检测 patterns.ts 中引用但实际不存在的命令
    pattern_orphans = pattern_commands - all_actual - ts_commands

    # 检测 CLI 类型不完整
    cli_mismatches = detect_cli_mismatches(
        ts_commands_with_cli,
        claude_commands, claude_skills,
        codex_prompts, codex_skills
    )

    return {
        'total_actual': len(all_actual),
        'total_ts': len(ts_commands),
        'total_deprecated': len(deprecated),
        'claude_commands': claude_commands,
        'claude_skills': claude_skills,
        'codex_prompts': codex_prompts,
        'codex_skills': codex_skills,
        'missing': missing,
        'extra': extra,
        'all_actual': all_actual,
        'ts_commands': ts_commands,
        'ts_commands_with_cli': ts_commands_with_cli,
        'deprecated': deprecated,
        'stale_in_dirs': stale_in_dirs,
        'pattern_commands': pattern_commands,
        'pattern_orphans': pattern_orphans,
        'cli_mismatches': cli_mismatches,
    }

def print_report(result: Dict):
    """打印分析报告"""
    print("=" * 70)
    print(f"目录中实际存在的命令/技能总数: {result['total_actual']}")
    print(f"commands.ts 中定义的命令总数: {result['total_ts']}")
    print(f"deprecated.ts 中废弃命令总数: {result['total_deprecated']}")
    print("=" * 70)

    # CLI 类型不完整
    if result['cli_mismatches']:
        print(f"\n[CLI 类型不完整 - 命令存在多目录但 cli 数组缺失类型] ({len(result['cli_mismatches'])}):")
        for m in sorted(result['cli_mismatches'], key=lambda x: x['cmd']):
            expected = '+'.join(m['expected_cli'])
            actual = '+'.join(m['actual_cli']) if m['actual_cli'] else '[]'
            missing = ', '.join(m['missing_cli'])
            print(f"  {m['cmd']:40} 应为 [{expected}] 实际 [{actual}] 缺失: {missing}")
    else:
        print("\n[CLI 类型不完整]: 无")

    # 缺失的命令
    if result['missing']:
        print(f"\n[目录存在但 commands.ts 缺失] ({len(result['missing'])}):")
        for cmd in sorted(result['missing']):
            source = get_command_source(
                cmd,
                result['claude_commands'],
                result['claude_skills'],
                result['codex_prompts'],
                result['codex_skills']
            )
            print(f"  {cmd:40} [{source}]")
    else:
        print("\n[目录存在但 commands.ts 缺失]: 无")

    # 多余的命令
    if result['extra']:
        print(f"\n[commands.ts 存在但目录不存在 - 应移入废弃列表] ({len(result['extra'])}):")
        for cmd in sorted(result['extra']):
            print(f"  {cmd}")
    else:
        print("\n[commands.ts 存在但目录不存在]: 无")

    # 残留旧命令
    if result['stale_in_dirs']:
        print(f"\n[残留旧命令 - 目录存在但已被废弃，应删除] ({len(result['stale_in_dirs'])}):")
        for cmd in sorted(result['stale_in_dirs']):
            replacement = result['deprecated'].get(cmd, 'removed')
            if replacement != 'removed':
                print(f"  {cmd:40} -> 使用 {replacement}")
            else:
                print(f"  {cmd:40} [已移除]")
    else:
        print("\n[残留旧命令]: 无")

    # patterns.ts 中的孤立引用
    if result['pattern_orphans']:
        print(f"\n[patterns.ts 引用但实际不存在的命令] ({len(result['pattern_orphans'])}):")
        for cmd in sorted(result['pattern_orphans']):
            print(f"  {cmd}")
    else:
        print("\n[patterns.ts 孤立引用]: 无")

    # 最终状态
    print("\n" + "=" * 70)
    issues = (len(result['missing']) + len(result['extra']) +
              len(result['stale_in_dirs']) + len(result['pattern_orphans']) +
              len(result['cli_mismatches']))
    if issues == 0:
        print("SUCCESS: 所有命令完全同步!")
    else:
        print(f"NEEDS WORK: {len(result['missing'])} 缺失, {len(result['extra'])} 多余, "
              f"{len(result['stale_in_dirs'])} 残留旧命令, {len(result['pattern_orphans'])} 孤立引用, "
              f"{len(result['cli_mismatches'])} CLI类型不完整")

def generate_fix_suggestions(result: Dict) -> str:
    """生成修复建议"""
    suggestions = []

    # CLI 类型不完整修复建议
    if result['cli_mismatches']:
        suggestions.append("\n## CLI 类型不完整 - 需要更新 cli 数组:\n")
        suggestions.append("```typescript")
        suggestions.append("// 在 src/data/commands.ts 中找到对应命令，更新 cli 数组:")
        for m in sorted(result['cli_mismatches'], key=lambda x: x['cmd']):
            expected_cli = json.dumps(m['expected_cli'])
            suggestions.append(f"// {m['cmd']}: cli: {json.dumps(m['actual_cli'])} → cli: {expected_cli}")
        suggestions.append("```\n")

    if result['extra']:
        suggestions.append("\n## 需要删除或移入废弃列表的命令:\n")
        suggestions.append("```typescript")
        suggestions.append("// 添加到 src/data/deprecated.ts:")
        for cmd in sorted(result['extra']):
            suggestions.append(f"  {{ old: '{cmd}', newCmd: null, reason: '命令已移除' }},")
        suggestions.append("```\n")

    if result['missing']:
        suggestions.append("\n## 需要添加到 commands.ts 的命令:\n")
        for cmd in sorted(result['missing']):
            source = get_command_source(
                cmd,
                result['claude_commands'],
                result['claude_skills'],
                result['codex_prompts'],
                result['codex_skills']
            )
            # 根据目录推断正确的 cli 数组
            expected_cli = get_command_expected_cli(
                cmd,
                result['claude_commands'],
                result['claude_skills'],
                result['codex_prompts'],
                result['codex_skills']
            )
            category = 'skill' if 'skill' in source else ('prompt' if 'prompt' in source else 'workflow')
            suggestions.append(f"  {cmd:40} [{source}]")
            suggestions.append(f"    建议配置: category: '{category}', cli: {json.dumps(expected_cli)}")

    if result['stale_in_dirs']:
        suggestions.append("\n## 需要删除的残留旧命令目录:\n")
        suggestions.append("```bash")
        for cmd in sorted(result['stale_in_dirs']):
            # 根据命令格式推断目录路径
            if ':' in cmd:
                parts = cmd[1:].split(':')
                base = parts[0]
                sub = ':'.join(parts[1:])
                suggestions.append(f"# {cmd} -> rm -rf .claude/commands/{base}/{sub}.md 或 .claude/skills/{base}")
            else:
                suggestions.append(f"# {cmd} -> rm -rf .claude/commands/{cmd[1:]}.md 或 .claude/skills/{cmd[1:]}")
        suggestions.append("```\n")

    return '\n'.join(suggestions)

def main():
    parser = argparse.ArgumentParser(description='同步 commands.ts 与目录中的实际命令')
    parser.add_argument('--fix', action='store_true', help='生成修复建议')
    parser.add_argument('--json', action='store_true', help='输出 JSON 格式')
    args = parser.parse_args()

    result = analyze_commands()

    if args.json:
        # JSON 输出
        output = {
            'total_actual': result['total_actual'],
            'total_ts': result['total_ts'],
            'total_deprecated': result['total_deprecated'],
            'missing': sorted(list(result['missing'])),
            'extra': sorted(list(result['extra'])),
            'stale_in_dirs': sorted(list(result['stale_in_dirs'])),
            'pattern_orphans': sorted(list(result['pattern_orphans'])),
            'cli_mismatches': result['cli_mismatches'],
            'synced': (not result['missing'] and not result['extra'] and
                     not result['stale_in_dirs'] and not result['cli_mismatches']),
        }
        print(json.dumps(output, indent=2, ensure_ascii=False))
    else:
        # 文本报告
        print_report(result)

        if args.fix:
            print(generate_fix_suggestions(result))

if __name__ == '__main__':
    main()
