#!/usr/bin/env python3
"""
同步 commands.ts 与目录中的实际命令文件

功能：
1. 扫描 .claude/commands、.claude/skills、.codex/prompts、.codex/skills 目录
2. 从 commands.ts 提取已定义的命令
3. 对比差异，输出缺失和多余的命令
4. 支持自动修复模式

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
                path = os.path.join(root, f)
                rel_path = path.replace(str(commands_dir) + '/', '').replace('.md', '')
                parts = rel_path.split('/')
                if len(parts) == 1:
                    cmd = '/' + parts[0]
                else:
                    cmd = '/' + parts[0] + ':' + ':'.join(parts[1:])
                commands.add(cmd)
    
    return commands

def get_claude_skills() -> Set[str]:
    """扫描 .claude/skills 目录"""
    skills = set()
    skills_dir = ROOT_DIR / '.claude' / 'skills'
    
    if not skills_dir.exists():
        return skills
    
    for item in os.listdir(skills_dir):
        item_path = skills_dir / item
        if item_path.is_dir() and not item.startswith('_'):
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
    """从 commands.ts 提取已定义的命令"""
    commands_file = ROOT_DIR / 'src' / 'data' / 'commands.ts'
    
    if not commands_file.exists():
        return set()
    
    with open(commands_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 匹配 cmd: '/xxx' 格式
    pattern = r"cmd: '(/[^']+)'"
    commands = set(re.findall(pattern, content))
    
    return commands

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
    
    # 计算差异
    missing = all_actual - ts_commands  # 目录存在但 ts 缺失
    extra = ts_commands - all_actual     # ts 存在但目录不存在
    
    return {
        'total_actual': len(all_actual),
        'total_ts': len(ts_commands),
        'claude_commands': claude_commands,
        'claude_skills': claude_skills,
        'codex_prompts': codex_prompts,
        'codex_skills': codex_skills,
        'missing': missing,
        'extra': extra,
        'all_actual': all_actual,
        'ts_commands': ts_commands,
    }

def print_report(result: Dict):
    """打印分析报告"""
    print("=" * 70)
    print(f"目录中实际存在的命令/技能总数: {result['total_actual']}")
    print(f"commands.ts 中定义的命令总数: {result['total_ts']}")
    print("=" * 70)
    
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
    
    # 最终状态
    print("\n" + "=" * 70)
    if not result['missing'] and not result['extra']:
        print("SUCCESS: commands.ts 与目录完全同步!")
    else:
        print(f"NEEDS WORK: {len(result['missing'])} 缺失, {len(result['extra'])} 多余")

def generate_fix_suggestions(result: Dict) -> str:
    """生成修复建议"""
    suggestions = []
    
    if result['extra']:
        suggestions.append("\n## 需要删除或移入废弃列表的命令:\n")
        suggestions.append("```typescript")
        suggestions.append("// 添加到 DEPRECATED_COMMANDS:")
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
            cli = 'claude' if 'claude' in source else 'codex'
            category = 'skill' if 'skill' in source else ('prompt' if 'prompt' in source else 'workflow')
            suggestions.append(f"  {cmd:40} [{source}]")
            suggestions.append(f"    建议配置: category: '{category}', cli: '{cli}'")
    
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
            'missing': sorted(list(result['missing'])),
            'extra': sorted(list(result['extra'])),
            'synced': not result['missing'] and not result['extra'],
        }
        print(json.dumps(output, indent=2, ensure_ascii=False))
    else:
        # 文本报告
        print_report(result)
        
        if args.fix:
            print(generate_fix_suggestions(result))

if __name__ == '__main__':
    main()
