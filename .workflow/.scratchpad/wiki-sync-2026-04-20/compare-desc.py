import json, re, sys

# Read commands.ts
with open('src/data/commands.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Extract all cmd+desc pairs
pattern = r"\{ cmd: '(/[^']+)',\s*desc: '([^']*)'"
matches = re.findall(pattern, content)
ts_cmds = {m[0]: m[1] for m in matches}

# Load extracted descriptions from agents
# We'll read from stdin
extracted = json.loads(sys.stdin.read())

changed = []
unchanged = []

for item in extracted:
    cmd = item['cmd']
    new_desc = item.get('frontmatterDesc', '') or item.get('summaryParagraph', '')
    if not new_desc:
        continue
    # Truncate to match commands.ts style (short desc)
    new_desc_short = new_desc[:80].rstrip('.,;:')
    
    if cmd in ts_cmds:
        old_desc = ts_cmds[cmd]
        # Check if descriptions are meaningfully different
        if old_desc != new_desc_short and old_desc not in new_desc and new_desc_short not in old_desc:
            changed.append({
                'cmd': cmd,
                'old': old_desc,
                'new': new_desc_short,
                'full_desc': new_desc
            })
        else:
            unchanged.append(cmd)
    else:
        unchanged.append(cmd)

print(json.dumps({'changed': changed, 'changed_count': len(changed), 'unchanged_count': len(unchanged)}, ensure_ascii=False, indent=2))
