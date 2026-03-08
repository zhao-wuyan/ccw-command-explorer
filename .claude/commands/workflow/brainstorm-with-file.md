---
name: brainstorm-with-file
description: Interactive brainstorming with multi-CLI collaboration, idea expansion, and documented thought evolution
argument-hint: "[-y|--yes] [-c|--continue] [-m|--mode creative|structured] \"idea or topic\""
allowed-tools: TodoWrite(*), Agent(*), AskUserQuestion(*), Read(*), Grep(*), Glob(*), Bash(*), Edit(*), Write(*)
---

## Auto Mode

When `--yes` or `-y`: Auto-confirm decisions, use recommended roles, balanced exploration mode.

# Workflow Brainstorm Command

## Quick Start

```bash
# Basic usage
/workflow:brainstorm-with-file "如何重新设计用户通知系统"

# With options
/workflow:brainstorm-with-file --continue "通知系统"              # Continue existing
/workflow:brainstorm-with-file -y -m creative "创新的AI辅助功能"   # Creative auto mode
/workflow:brainstorm-with-file -m structured "优化缓存策略"       # Goal-oriented mode
```

**Context Source**: cli-explore-agent + Multi-CLI perspectives (Gemini/Codex/Claude or Professional Roles)
**Output Directory**: `.workflow/.brainstorm/{session-id}/`
**Core Innovation**: Diverge-Converge cycles with documented thought evolution

## Output Artifacts

| Phase | Artifact | Description |
|-------|----------|-------------|
| 1 | `brainstorm.md` | Complete thought evolution timeline (initialized) |
| 1 | Session variables | Dimensions, roles, exploration vectors |
| 2 | `exploration-codebase.json` | Codebase context from cli-explore-agent |
| 2 | `perspectives.json` | Multi-CLI perspective findings (creative/pragmatic/systematic) |
| 2 | Updated `brainstorm.md` | Round 2 multi-perspective exploration |
| 3 | `ideas/{idea-slug}.md` | Deep-dive analysis for selected ideas |
| 3 | Updated `brainstorm.md` | Round 3-6 refinement cycles |
| 4 | `synthesis.json` | Final synthesis with top ideas, recommendations |
| 4 | Final `brainstorm.md` | Complete thought evolution with conclusions |

## Output Structure

```
.workflow/.brainstorm/BS-{slug}-{date}/
├── brainstorm.md                  # ⭐ Complete thought evolution timeline
├── exploration-codebase.json      # Phase 2: Codebase context
├── perspectives.json              # Phase 2: Multi-CLI findings
├── synthesis.json                 # Phase 4: Final synthesis
└── ideas/                         # Phase 3: Individual idea deep-dives
    ├── idea-1.md
    ├── idea-2.md
    └── merged-idea-1.md
```

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    INTERACTIVE BRAINSTORMING WORKFLOW                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Phase 1: Seed Understanding                                             │
│     ├─ Parse initial idea/topic                                          │
│     ├─ Identify dimensions (technical, UX, business, etc.)               │
│     ├─ Select roles (professional or simple perspectives)                │
│     ├─ Initial scoping questions                                         │
│     ├─ Expand into exploration vectors                                   │
│     └─ Initialize brainstorm.md                                          │
│                                                                          │
│  Phase 2: Divergent Exploration                                          │
│     ├─ cli-explore-agent: Codebase context (FIRST)                       │
│     ├─ Multi-CLI Perspectives (AFTER exploration)                        │
│     │   ├─ Creative (Gemini): Innovation, cross-domain                   │
│     │   ├─ Pragmatic (Codex): Implementation, feasibility                │
│     │   └─ Systematic (Claude): Architecture, structure                  │
│     └─ Aggregate diverse viewpoints                                      │
│                                                                          │
│  Phase 3: Interactive Refinement (Multi-Round)                           │
│     ├─ Present multi-perspective findings                                │
│     ├─ User selects promising directions                                 │
│     ├─ Actions: Deep dive | Generate more | Challenge | Merge            │
│     ├─ Update brainstorm.md with evolution                               │
│     └─ Repeat diverge-converge cycles (max 6 rounds)                     │
│                                                                          │
│  Phase 4: Convergence & Crystallization                                  │
│     ├─ Synthesize best ideas                                             │
│     ├─ Resolve conflicts between perspectives                            │
│     ├─ Generate actionable conclusions                                   │
│     ├─ Offer next steps (plan/issue/analyze/export)                      │
│     └─ Final brainstorm.md update                                        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Implementation

### Session Initialization

1. Extract idea/topic from `$ARGUMENTS`
2. Generate session ID: `BS-{slug}-{date}` (slug: lowercase, alphanumeric + Chinese, max 40 chars; date: YYYY-MM-DD UTC+8)
3. Define session folder: `.workflow/.brainstorm/{session-id}`
4. Parse command options:
   - `-c` or `--continue` for session continuation
   - `-m` or `--mode` for brainstorm mode (creative/structured/balanced)
   - `-y` or `--yes` for auto-approval mode
5. Auto-detect mode: If session folder + brainstorm.md exist → continue mode
6. Create directory structure: `{session-folder}/ideas/`

7. **Create Progress Tracking** (TodoWrite — MANDATORY):
   ```
   TodoWrite([
     { id: "phase-1", title: "Phase 1: Seed Understanding", status: "in_progress" },
     { id: "phase-2", title: "Phase 2: Divergent Exploration", status: "pending" },
     { id: "phase-3", title: "Phase 3: Interactive Refinement", status: "pending" },
     { id: "phase-4", title: "Phase 4: Convergence & Crystallization", status: "pending" },
     { id: "next-step", title: "GATE: Post-Completion Next Step", status: "pending" }
   ])
   ```
   - Update status to `"in_progress"` when entering each phase, `"completed"` when done
   - **`next-step` is a terminal gate** — workflow is NOT complete until this todo is `"completed"`

**Session Variables**: `sessionId`, `sessionFolder`, `brainstormMode` (creative|structured|balanced), `autoMode` (boolean), `mode` (new|continue)

### Phase 1: Seed Understanding

1. **Parse Seed & Identify Dimensions**
   - Match topic keywords against Brainstorm Dimensions table
   - Default dimensions based on brainstormMode if no match

2. **Role Selection**
   - Recommend roles based on topic keywords (see Role Selection tables)
   - **Professional roles**: system-architect, product-manager, ui-designer, ux-expert, data-architect, test-strategist, subject-matter-expert, product-owner, scrum-master
   - **Simple perspectives** (fallback): creative/pragmatic/systematic
   - **Auto mode**: Select top 3 recommended professional roles
   - **Manual mode**: AskUserQuestion with recommended roles + "Use simple perspectives" option

3. **Initial Scoping Questions** (if new session + not auto mode)
   - **Direction**: Multi-select from directions generated by detected dimensions
   - **Depth**: Single-select from quick/balanced/deep (15-20min / 30-60min / 1-2hr)
   - **Constraints**: Multi-select from existing architecture, time, resources, or no constraints

4. **Expand Seed into Exploration Vectors**

```javascript
Bash({
  command: `ccw cli -p "
Given the initial idea: '${idea_or_topic}'
User focus areas: ${userFocusAreas.join(', ')}
Constraints: ${constraints.join(', ')}

Generate 5-7 exploration vectors (questions/directions) to expand this idea:
1. Core question: What is the fundamental problem/opportunity?
2. User perspective: Who benefits and how?
3. Technical angle: What enables this technically?
4. Alternative approaches: What other ways could this be solved?
5. Challenges: What could go wrong or block success?
6. Innovation angle: What would make this 10x better?
7. Integration: How does this fit with existing systems/processes?

Output as structured exploration vectors for multi-perspective analysis.
" --tool gemini --mode analysis --model gemini-2.5-flash`,
  run_in_background: false
})
```

5. **Initialize brainstorm.md** with session metadata, initial context (user focus, depth, constraints), seed expansion (original idea + exploration vectors), empty thought evolution timeline sections

**TodoWrite**: Update `phase-1` → `"completed"`, `phase-2` → `"in_progress"`

### Phase 2: Divergent Exploration

1. **Primary Codebase Exploration via cli-explore-agent** (⚠️ FIRST)

```javascript
Agent({
  subagent_type: "cli-explore-agent",
  run_in_background: false,
  description: `Explore codebase for brainstorm: ${topicSlug}`,
  prompt: `
## Brainstorm Context
Topic: ${idea_or_topic}
Dimensions: ${dimensions.join(', ')}
Mode: ${brainstormMode}
Session: ${sessionFolder}

## MANDATORY FIRST STEPS
1. Run: ccw tool exec get_modules_by_depth '{}'
2. Search for code related to topic keywords
3. Read: .workflow/project-tech.json (if exists)

## Exploration Focus
- Identify existing implementations related to the topic
- Find patterns that could inspire solutions
- Map current architecture constraints
- Locate integration points

## Output
Write findings to: ${sessionFolder}/exploration-codebase.json

Schema:
{
  "relevant_files": [{"path": "...", "relevance": "high|medium|low", "rationale": "..."}],
  "existing_patterns": [],
  "architecture_constraints": [],
  "integration_points": [],
  "inspiration_sources": [],
  "_metadata": { "exploration_type": "brainstorm-codebase", "timestamp": "..." }
}
`
})
```

2. **Multi-CLI Perspective Analysis** (⚠️ AFTER exploration)

Build shared context from exploration results:

```javascript
const explorationContext = `
PRIOR EXPLORATION CONTEXT (from cli-explore-agent):
- Key files: ${explorationResults.relevant_files.slice(0,5).map(f => f.path).join(', ')}
- Existing patterns: ${explorationResults.existing_patterns.slice(0,3).join(', ')}
- Architecture constraints: ${explorationResults.architecture_constraints.slice(0,3).join(', ')}
- Integration points: ${explorationResults.integration_points.slice(0,3).join(', ')}`
```

Launch 3 parallel CLI calls (`run_in_background: true` each), one per perspective:

| Perspective | Tool | PURPOSE | Key TASK bullets | EXPECTED | CONSTRAINTS |
|-------------|------|---------|-----------------|----------|-------------|
| Creative | gemini | Generate innovative ideas | Challenge assumptions, cross-domain inspiration, moonshot + practical ideas | 5+ creative ideas with novelty/impact ratings | structured mode: keep feasible |
| Pragmatic | codex | Implementation reality | Evaluate feasibility, estimate complexity, identify blockers, incremental approach | 3-5 practical approaches with effort/risk ratings | Current tech stack |
| Systematic | claude | Architectural thinking | Decompose problems, identify patterns, map dependencies, scalability | Problem decomposition, 2-3 approaches with tradeoffs | Existing architecture |

```javascript
// Each perspective uses this prompt structure (launch all 3 in parallel):
Bash({
  command: `ccw cli -p "
PURPOSE: ${perspective} brainstorming for '${idea_or_topic}' - ${purposeFocus}
Success: ${expected}

${explorationContext}

TASK:
• Build on explored ${contextType} - how to ${actionVerb}?
${perspectiveSpecificBullets}

MODE: analysis
CONTEXT: @**/* | Topic: ${idea_or_topic}
EXPECTED: ${expected}
CONSTRAINTS: ${constraints}
" --tool ${tool} --mode analysis`,
  run_in_background: true
})
// ⚠️ STOP POINT: Wait for hook callback to receive all results before continuing
```

3. **Aggregate Multi-Perspective Findings**
   - Convergent themes (all agree), conflicting views (need resolution), unique contributions
   - Write to perspectives.json

4. **Update brainstorm.md** with Round 2 multi-perspective exploration and synthesis

### Phase 3: Interactive Refinement

**Guideline**: Delegate complex tasks to agents (cli-explore-agent, code-developer, universal-executor) or CLI calls. Avoid direct analysis/execution in main process.

1. **Present Current State**: Extract top ideas from perspectives.json with title, source, description, novelty/feasibility ratings

2. **Gather User Direction** (AskUserQuestion)
   - **Q1**: Which ideas to explore (multi-select from top ideas)
   - **Q2**: Next step (single-select):
     - **深入探索**: Deep dive on selected ideas
     - **继续发散**: Generate more ideas
     - **挑战验证**: Devil's advocate challenge
     - **合并综合**: Merge multiple ideas
     - **准备收敛**: Begin convergence (exit loop)

3. **Execute User-Selected Action**

| Action | Tool | Output | Key Tasks |
|--------|------|--------|-----------|
| Deep Dive | Gemini CLI | ideas/{slug}.md | Elaborate concept, requirements, challenges, POC approach, metrics, dependencies |
| Generate More | Selected CLI | Updated perspectives.json | New angles from unexplored vectors |
| Challenge | Codex CLI | Challenge results | 3 objections per idea, challenge assumptions, failure scenarios, survivability (1-5) |
| Merge | Gemini CLI | ideas/merged-{slug}.md | Complementary elements, resolve contradictions, unified concept |

**Deep Dive CLI Call**:
```javascript
Bash({
  command: `ccw cli -p "
PURPOSE: Deep dive analysis on idea '${idea.title}'
Success: Comprehensive understanding with actionable next steps

TASK:
• Elaborate the core concept in detail
• Identify implementation requirements
• List potential challenges and mitigations
• Suggest proof-of-concept approach
• Define success metrics
• Map related/dependent features

MODE: analysis
CONTEXT: @**/*
Original idea: ${idea.description}
Source perspective: ${idea.source}

EXPECTED: Detailed concept, technical requirements, risk matrix, MVP definition, success criteria, recommendation (pursue/pivot/park)
CONSTRAINTS: Focus on actionability
" --tool gemini --mode analysis`,
  run_in_background: false
})
```

**Devil's Advocate CLI Call**:
```javascript
Bash({
  command: `ccw cli -p "
PURPOSE: Devil's advocate - rigorously challenge these brainstorm ideas
Success: Uncover hidden weaknesses and strengthen viable ideas

IDEAS TO CHALLENGE:
${ideas.map((idea, i) => `${i+1}. ${idea.title}: ${idea.brief}`).join('\n')}

TASK:
• For each idea, identify 3 strongest objections
• Challenge core assumptions
• Identify scenarios where this fails
• Consider competitive/alternative solutions
• Rate survivability after challenge (1-5)

MODE: analysis
EXPECTED: Per-idea challenge report, critical weaknesses, survivability ratings, modified/strengthened versions
CONSTRAINTS: Be genuinely critical, not just contrarian
" --tool codex --mode analysis`,
  run_in_background: false
})
```

**Merge Ideas CLI Call**:
```javascript
Bash({
  command: `ccw cli -p "
PURPOSE: Synthesize multiple ideas into unified concept
Success: Coherent merged idea that captures best elements

IDEAS TO MERGE:
${selectedIdeas.map((idea, i) => `
${i+1}. ${idea.title} (${idea.source})
   ${idea.description}
   Strengths: ${idea.strengths.join(', ')}
`).join('\n')}

TASK:
• Identify complementary elements
• Resolve contradictions
• Create unified concept preserving key strengths
• Assess viability of merged idea

MODE: analysis
EXPECTED: Merged concept, elements from each source, contradictions resolved, implementation considerations
CONSTRAINTS: Don't force incompatible ideas together
" --tool gemini --mode analysis`,
  run_in_background: false
})
```

4. **Update brainstorm.md** with Round N findings
5. **Repeat or Converge**: Continue loop (max 6 rounds) or exit to Phase 4

**TodoWrite**: Update `phase-2` → `"completed"` (after first round enters Phase 3), `phase-3` → `"in_progress"`
**TodoWrite** (on exit loop): Update `phase-3` → `"completed"`, `phase-4` → `"in_progress"`

### Phase 4: Convergence & Crystallization

1. **Generate Final Synthesis** → Write to synthesis.json
   - **Top ideas**: Filter active, sort by score, top 5 with title, description, source_perspective, score, novelty, feasibility, strengths, challenges, next_steps
   - **Parked ideas**: With reason and future trigger
   - **Key insights**: Process discoveries, challenged assumptions, unexpected connections
   - **Recommendations**: Primary, alternatives, not recommended
   - **Follow-up**: Implementation/research/validation summaries

**synthesis.json Schema**: `session_id`, `topic`, `completed` (timestamp), `total_rounds`, `top_ideas[]`, `parked_ideas[]`, `key_insights[]`, `recommendations` (primary/alternatives/not_recommended), `follow_up[]`

2. **Final brainstorm.md Update**: Executive summary, top ideas ranked, primary recommendation with rationale, alternative approaches, parked ideas, key insights, session statistics (rounds, ideas generated/survived, duration)

3. **MANDATORY GATE: Next Step Selection** — workflow MUST NOT end without executing this step.

   **TodoWrite**: Update `phase-4` → `"completed"`, `next-step` → `"in_progress"`

   > **CRITICAL**: This AskUserQuestion is a **terminal gate**. The workflow is INCOMPLETE if this question is not asked. After displaying synthesis (step 2), you MUST immediately proceed here.

   Call AskUserQuestion (single-select, header: "Next Step"):
   - **创建实施计划** (Recommended if top idea has high feasibility): "基于最佳创意启动 workflow-plan 制定实施计划"
   - **创建Issue**: "将 Top 3 创意转化为 issue 进行跟踪管理"
   - **深入分析**: "对最佳创意启动 analyze-with-file 深入技术分析"
   - **完成**: "头脑风暴已足够，无需进一步操作"

   **Handle user selection**:

   **"创建实施计划"** → MUST invoke Skill tool:
   1. Build `taskDescription` from top idea in synthesis.json (title + description + next_steps)
   2. Assemble context: `## Prior Brainstorm ({sessionId})` + summary + top idea details + key insights (up to 5)
   3. **Invoke Skill tool immediately**:
      ```javascript
      Skill({ skill: "workflow-plan", args: `${taskDescription}\n\n${contextLines}` })
      ```
      If Skill invocation is omitted, the workflow is BROKEN.
   4. After Skill invocation, brainstorm-with-file is complete

   **"创建Issue"** → Convert top ideas to issues:
   1. For each idea in synthesis.top_ideas (top 3):
      - Build issue JSON: `{title: idea.title, context: idea.description + '\n' + idea.next_steps.join('\n'), priority: idea.score >= 8 ? 2 : 3, source: 'brainstorm', labels: dimensions}`
      - Create via: `Skill({ skill: "issue:from-brainstorm", args: "${sessionFolder}/synthesis.json" })`
   2. Display created issue IDs

   **"深入分析"** → Launch analysis on top idea:
   1. Build analysis topic from top idea title + description
   2. **Invoke Skill tool immediately**:
      ```javascript
      Skill({ skill: "workflow:analyze-with-file", args: `${topIdea.title}: ${topIdea.description}` })
      ```

   **"完成"** → No further action needed.

   **TodoWrite**: Update `next-step` → `"completed"` after user selection is handled

## Configuration

### Brainstorm Dimensions

| Dimension | Keywords |
|-----------|----------|
| technical | 技术, technical, implementation, code, 实现, architecture |
| ux | 用户, user, experience, UX, UI, 体验, interaction |
| business | 业务, business, value, ROI, 价值, market |
| innovation | 创新, innovation, novel, creative, 新颖 |
| feasibility | 可行, feasible, practical, realistic, 实际 |
| scalability | 扩展, scale, growth, performance, 性能 |
| security | 安全, security, risk, protection, 风险 |

### Role Selection

**Professional Roles**:

| Role | CLI Tool | Focus Area | Keywords |
|------|----------|------------|----------|
| system-architect | Claude | Architecture, patterns | 架构, architecture, system, 系统, design pattern |
| product-manager | Gemini | Business value, roadmap | 产品, product, feature, 功能, roadmap |
| ui-designer | Gemini | Visual design, interaction | UI, 界面, interface, visual, 视觉 |
| ux-expert | Codex | User research, usability | UX, 体验, experience, user, 用户 |
| data-architect | Claude | Data modeling, storage | 数据, data, database, 存储, storage |
| test-strategist | Codex | Quality, testing | 测试, test, quality, 质量, QA |
| subject-matter-expert | Gemini | Domain knowledge | 领域, domain, industry, 行业, expert |
| product-owner | Codex | Priority, scope | 优先, priority, scope, 范围, backlog |
| scrum-master | Gemini | Process, collaboration | 敏捷, agile, scrum, sprint, 迭代 |

**Simple Perspectives** (fallback):

| Perspective | CLI Tool | Focus |
|-------------|----------|-------|
| creative | Gemini | Innovation, cross-domain |
| pragmatic | Codex | Implementation, feasibility |
| systematic | Claude | Architecture, structure |

**Selection Strategy**: Auto mode → top 3 professional roles | Manual mode → recommended roles + "Use simple perspectives" option | Continue mode → roles from previous session

## Error Handling

| Error | Resolution |
|-------|------------|
| cli-explore-agent fails | Continue with empty exploration context |
| CLI timeout | Retry with shorter prompt, or skip perspective |
| No good ideas | Reframe problem, adjust constraints, try new angles |
| User disengaged | Summarize progress, offer break point with resume |
| Perspectives conflict | Present as tradeoff, let user decide |
| Max rounds reached | Force synthesis, highlight unresolved questions |
| All ideas fail challenge | Return to divergent phase with new constraints |

---

**Now execute brainstorm-with-file for**: $ARGUMENTS
