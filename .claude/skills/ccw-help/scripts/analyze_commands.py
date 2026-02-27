#!/usr/bin/env python3
"""
Analyze all command/agent files and generate index files for ccw-help skill.
Outputs relative paths pointing to source files (no reference folder duplication).
"""

import os
import re
import json
from pathlib import Path
from collections import defaultdict
from typing import Dict, List, Any

# Base paths
BASE_DIR = Path("D:/Claude_dms3/.claude")
COMMANDS_DIR = BASE_DIR / "commands"
AGENTS_DIR = BASE_DIR / "agents"
SKILL_DIR = BASE_DIR / "skills" / "ccw-help"
INDEX_DIR = SKILL_DIR / "index"

def parse_frontmatter(content: str) -> Dict[str, Any]:
    """Extract YAML frontmatter from markdown content."""
    frontmatter = {}
    if content.startswith('---'):
        lines = content.split('\n')
        for i, line in enumerate(lines[1:], 1):
            if line.strip() == '---':
                break
            if ':' in line:
                key, value = line.split(':', 1)
                frontmatter[key.strip()] = value.strip().strip('"')
    return frontmatter

def categorize_command(file_path: Path) -> tuple:
    """Determine category and subcategory from file path."""
    parts = file_path.relative_to(COMMANDS_DIR).parts

    if len(parts) == 1:
        return "general", None

    category = parts[0]  # cli, memory, task, workflow
    subcategory = parts[1].replace('.md', '') if len(parts) > 2 else None

    return category, subcategory

def determine_usage_scenario(name: str, description: str, category: str) -> str:
    """Determine primary usage scenario for command."""
    name_lower = name.lower()

    if any(word in name_lower for word in ['plan', 'design', 'breakdown', 'brainstorm']):
        return "planning"
    if any(word in name_lower for word in ['implement', 'execute', 'generate', 'create', 'write']):
        return "implementation"
    if any(word in name_lower for word in ['test', 'tdd', 'verify', 'coverage']):
        return "testing"
    if any(word in name_lower for word in ['docs', 'documentation', 'memory']):
        return "documentation"
    if any(word in name_lower for word in ['session', 'resume', 'status', 'complete']):
        return "session-management"
    if any(word in name_lower for word in ['analyze', 'review', 'diagnosis']):
        return "analysis"
    return "general"

def determine_difficulty(name: str, description: str, category: str) -> str:
    """Determine difficulty level."""
    name_lower = name.lower()

    beginner_keywords = ['status', 'list', 'chat', 'analyze', 'version']
    if any(word in name_lower for word in beginner_keywords):
        return "Beginner"

    advanced_keywords = ['tdd', 'conflict', 'agent', 'auto-parallel', 'coverage', 'synthesis']
    if any(word in name_lower for word in advanced_keywords):
        return "Advanced"

    return "Intermediate"

def analyze_command_file(file_path: Path) -> Dict[str, Any]:
    """Analyze a single command file and extract metadata."""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    frontmatter = parse_frontmatter(content)

    name = frontmatter.get('name', file_path.stem)
    description = frontmatter.get('description', '')
    argument_hint = frontmatter.get('argument-hint', '')

    category, subcategory = categorize_command(file_path)
    usage_scenario = determine_usage_scenario(name, description, category)
    difficulty = determine_difficulty(name, description, category)

    # Build relative path from INDEX_DIR (need to go up 3 levels: index -> ccw-help -> skills -> .claude)
    # e.g., "../../../commands/workflow/lite-plan.md"
    rel_from_base = file_path.relative_to(BASE_DIR)
    rel_path = "../../../" + str(rel_from_base).replace('\\', '/')

    # Build full command name
    if ':' in name:
        command_name = f"/{name}"
    elif category == "general":
        command_name = f"/{name}"
    else:
        if subcategory:
            command_name = f"/{category}:{subcategory}:{name}"
        else:
            command_name = f"/{category}:{name}"

    return {
        "name": name,
        "command": command_name,
        "description": description,
        "arguments": argument_hint,
        "category": category,
        "subcategory": subcategory,
        "usage_scenario": usage_scenario,
        "difficulty": difficulty,
        "source": rel_path  # Relative from index/ dir (e.g., "../../../commands/workflow/...")
    }

def analyze_agent_file(file_path: Path) -> Dict[str, Any]:
    """Analyze a single agent file and extract metadata."""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    frontmatter = parse_frontmatter(content)

    name = frontmatter.get('name', file_path.stem)
    description = frontmatter.get('description', '')

    # Build relative path from INDEX_DIR (need to go up 3 levels)
    # e.g., "../../../agents/code-developer.md"
    rel_from_base = file_path.relative_to(BASE_DIR)
    rel_path = "../../../" + str(rel_from_base).replace('\\', '/')

    return {
        "name": name,
        "description": description,
        "source": rel_path  # Relative from index/ dir (e.g., "../../../agents/...")
    }

def build_command_relationships() -> Dict[str, Any]:
    """Build command relationship mappings."""
    return {
        "workflow:plan": {
            "calls_internally": ["workflow:session:start", "workflow:tools:context-gather", "workflow:tools:conflict-resolution", "workflow:tools:task-generate-agent"],
            "next_steps": ["workflow:plan-verify", "workflow:status", "workflow:execute"],
            "alternatives": ["workflow:tdd-plan"],
            "prerequisites": []
        },
        "workflow:tdd-plan": {
            "calls_internally": ["workflow:session:start", "workflow:tools:context-gather", "workflow:tools:task-generate-tdd"],
            "next_steps": ["workflow:tdd-verify", "workflow:status", "workflow:execute"],
            "alternatives": ["workflow:plan"],
            "prerequisites": []
        },
        "workflow:execute": {
            "prerequisites": ["workflow:plan", "workflow:tdd-plan"],
            "related": ["workflow:status", "workflow:resume"],
            "next_steps": ["workflow:review", "workflow:tdd-verify"]
        },
        "workflow:plan-verify": {
            "prerequisites": ["workflow:plan"],
            "next_steps": ["workflow:execute"],
            "related": ["workflow:status"]
        },
        "workflow:tdd-verify": {
            "prerequisites": ["workflow:execute"],
            "related": ["workflow:tools:tdd-coverage-analysis"]
        },
        "workflow:session:start": {
            "next_steps": ["workflow:plan", "workflow:execute"],
            "related": ["workflow:session:list", "workflow:session:resume"]
        },
        "workflow:session:resume": {
            "alternatives": ["workflow:resume"],
            "related": ["workflow:session:list", "workflow:status"]
        },
        "workflow:lite-plan": {
            "calls_internally": ["workflow:lite-execute"],
            "next_steps": ["workflow:lite-execute", "workflow:status"],
            "alternatives": ["workflow:plan"],
            "prerequisites": []
        },
        "workflow:lite-fix": {
            "next_steps": ["workflow:lite-execute", "workflow:status"],
            "alternatives": ["workflow:lite-plan"],
            "related": ["workflow:test-cycle-execute"]
        },
        "workflow:lite-execute": {
            "prerequisites": ["workflow:lite-plan", "workflow:lite-fix"],
            "related": ["workflow:execute", "workflow:status"]
        },
        "workflow:review-session-cycle": {
            "prerequisites": ["workflow:execute"],
            "next_steps": ["workflow:review-fix"],
            "related": ["workflow:review-module-cycle"]
        },
        "workflow:review-fix": {
            "prerequisites": ["workflow:review-module-cycle", "workflow:review-session-cycle"],
            "related": ["workflow:test-cycle-execute"]
        },
        "memory:docs": {
            "calls_internally": ["workflow:session:start", "workflow:tools:context-gather"],
            "next_steps": ["workflow:execute"]
        },
        "memory:skill-memory": {
            "next_steps": ["workflow:plan", "cli:analyze"],
            "related": ["memory:load-skill-memory"]
        }
    }

def identify_essential_commands(all_commands: List[Dict]) -> List[Dict]:
    """Identify the most essential commands for beginners."""
    essential_names = [
        "workflow:lite-plan", "workflow:lite-fix", "workflow:plan",
        "workflow:execute", "workflow:status", "workflow:session:start",
        "workflow:review-session-cycle", "cli:analyze", "cli:chat",
        "memory:docs", "workflow:brainstorm:artifacts",
        "workflow:plan-verify", "workflow:resume", "version"
    ]

    essential = []
    for cmd in all_commands:
        cmd_name = cmd['command'].lstrip('/')
        if cmd_name in essential_names:
            essential.append(cmd)

    essential.sort(key=lambda x: essential_names.index(x['command'].lstrip('/')) if x['command'].lstrip('/') in essential_names else 999)
    return essential[:14]

def main():
    """Main analysis function."""
    import sys
    import io

    if sys.platform == 'win32':
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

    print("=== CCW-Help Index Rebuild ===\n")

    # Analyze command files
    print("=== Analyzing Command Files ===")
    command_files = list(COMMANDS_DIR.rglob("*.md"))
    print(f"Found {len(command_files)} command files")

    all_commands = []
    for cmd_file in sorted(command_files):
        try:
            metadata = analyze_command_file(cmd_file)
            all_commands.append(metadata)
            print(f"  OK {metadata['command']}")
        except Exception as e:
            print(f"  ERROR analyzing {cmd_file}: {e}")

    # Analyze agent files
    print("\n=== Analyzing Agent Files ===")
    agent_files = list(AGENTS_DIR.rglob("*.md"))
    print(f"Found {len(agent_files)} agent files")

    all_agents = []
    for agent_file in sorted(agent_files):
        try:
            metadata = analyze_agent_file(agent_file)
            all_agents.append(metadata)
            print(f"  OK {metadata['name']}")
        except Exception as e:
            print(f"  ERROR analyzing {agent_file}: {e}")

    print(f"\nAnalyzed {len(all_commands)} commands, {len(all_agents)} agents")

    # Generate index files
    INDEX_DIR.mkdir(parents=True, exist_ok=True)

    # 1. all-commands.json
    all_commands_path = INDEX_DIR / "all-commands.json"
    with open(all_commands_path, 'w', encoding='utf-8') as f:
        json.dump(all_commands, f, indent=2, ensure_ascii=False)
    print(f"\nOK Generated {all_commands_path.name} ({os.path.getsize(all_commands_path)} bytes)")

    # 2. all-agents.json
    all_agents_path = INDEX_DIR / "all-agents.json"
    with open(all_agents_path, 'w', encoding='utf-8') as f:
        json.dump(all_agents, f, indent=2, ensure_ascii=False)
    print(f"OK Generated {all_agents_path.name} ({os.path.getsize(all_agents_path)} bytes)")

    # 3. by-category.json
    by_category = defaultdict(lambda: defaultdict(list))
    for cmd in all_commands:
        cat = cmd['category']
        subcat = cmd['subcategory'] or '_root'
        by_category[cat][subcat].append(cmd)

    by_category_path = INDEX_DIR / "by-category.json"
    with open(by_category_path, 'w', encoding='utf-8') as f:
        json.dump(dict(by_category), f, indent=2, ensure_ascii=False)
    print(f"OK Generated {by_category_path.name} ({os.path.getsize(by_category_path)} bytes)")

    # 4. by-use-case.json
    by_use_case = defaultdict(list)
    for cmd in all_commands:
        by_use_case[cmd['usage_scenario']].append(cmd)

    by_use_case_path = INDEX_DIR / "by-use-case.json"
    with open(by_use_case_path, 'w', encoding='utf-8') as f:
        json.dump(dict(by_use_case), f, indent=2, ensure_ascii=False)
    print(f"OK Generated {by_use_case_path.name} ({os.path.getsize(by_use_case_path)} bytes)")

    # 5. essential-commands.json
    essential = identify_essential_commands(all_commands)
    essential_path = INDEX_DIR / "essential-commands.json"
    with open(essential_path, 'w', encoding='utf-8') as f:
        json.dump(essential, f, indent=2, ensure_ascii=False)
    print(f"OK Generated {essential_path.name} ({os.path.getsize(essential_path)} bytes)")

    # 6. command-relationships.json
    relationships = build_command_relationships()
    relationships_path = INDEX_DIR / "command-relationships.json"
    with open(relationships_path, 'w', encoding='utf-8') as f:
        json.dump(relationships, f, indent=2, ensure_ascii=False)
    print(f"OK Generated {relationships_path.name} ({os.path.getsize(relationships_path)} bytes)")

    # Print summary
    print("\n=== Summary ===")
    print(f"Commands: {len(all_commands)}")
    print(f"Agents: {len(all_agents)}")
    print(f"Essential: {len(essential)}")
    print(f"\nBy category:")
    for cat in sorted(by_category.keys()):
        total = sum(len(cmds) for cmds in by_category[cat].values())
        print(f"  {cat}: {total}")

    print(f"\nIndex: {INDEX_DIR}")
    print("=== Complete ===")

if __name__ == '__main__':
    main()
