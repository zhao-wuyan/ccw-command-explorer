import re, json, sys

with open('src/data/commands.ts', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r"\{ cmd: '(/[^']+)',\s*desc: '([^']*)'"
matches = re.findall(pattern, content)
ts_cmds = {m[0]: m[1] for m in matches}

# Key SKILL.md changes that are MEANINGFUL (content changes, not just formatting)
# From the agent diffs, only /ship had a significant description change:
# Old: 5 phases → New: 7 phases (added platform publish + GitHub release)
meaningful_changes = {
    "/ship": "结构化发布流水线 - 预检→审查→版本→更新日志→PR→发布→GitHub Release",
    "/ccw-chain": "Chain 链式工作流编排，意图分析+自动路由",
    "/brainstorm": "统一头脑风暴 - 自动流程或单角色分析",
}

changed = []
for cmd, new_desc in meaningful_changes.items():
    if cmd in ts_cmds:
        old = ts_cmds[cmd]
        if old != new_desc:
            changed.append({"cmd": cmd, "old": old, "new": new_desc})
            print(f"CHANGED: {cmd}")
            print(f"  old: {old}")
            print(f"  new: {new_desc}")

if not changed:
    print("NO MEANINGFUL CHANGES - descriptions are already up to date")
