---
name: brainstorm-with-file
description: Interactive brainstorming with multi-CLI collaboration, idea expansion, and documented thought evolution
argument-hint: "[-y|--yes] [-c|--continue] [-m|--mode creative|structured] \"idea or topic\""
allowed-tools: TodoWrite(*), Task(*), AskUserQuestion(*), Read(*), Grep(*), Glob(*), Bash(*), Edit(*), Write(*)
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

### Phase 1: Seed Understanding

| Artifact | Description |
|----------|-------------|
| `brainstorm.md` | Complete thought evolution timeline (initialized) |
| Session variables | Dimensions, roles, exploration vectors |

### Phase 2: Divergent Exploration

| Artifact | Description |
|----------|-------------|
| `exploration-codebase.json` | Codebase context from cli-explore-agent |
| `perspectives.json` | Multi-CLI perspective findings (creative/pragmatic/systematic) |
| Updated `brainstorm.md` | Round 2 multi-perspective exploration |

### Phase 3: Interactive Refinement

| Artifact | Description |
|----------|-------------|
| `ideas/{idea-slug}.md` | Deep-dive analysis for selected ideas |
| Updated `brainstorm.md` | Round 3-6 refinement cycles |

### Phase 4: Convergence & Crystallization

| Artifact | Description |
|----------|-------------|
| `synthesis.json` | Final synthesis with top ideas, recommendations |
| Final `brainstorm.md` | ⭐ Complete thought evolution with conclusions |

## Overview

Interactive brainstorming workflow with **multi-CLI collaboration** and **documented thought evolution**. Expands initial ideas through questioning, multi-perspective analysis, and iterative refinement.

**Core workflow**: Seed Idea → Expand → Multi-CLI Discuss → Synthesize → Refine → Crystallize

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

## Implementation

### Session Initialization

**Objective**: Create session context and directory structure for brainstorming.

**Required Actions**:
1. Extract idea/topic from `$ARGUMENTS`
2. Generate session ID: `BS-{slug}-{date}`
   - slug: lowercase, alphanumeric + Chinese, max 40 chars
   - date: YYYY-MM-DD (UTC+8)
3. Define session folder: `.workflow/.brainstorm/{session-id}`
4. Parse command options:
   - `-c` or `--continue` for session continuation
   - `-m` or `--mode` for brainstorm mode (creative/structured/balanced)
   - `-y` or `--yes` for auto-approval mode
5. Auto-detect mode: If session folder + brainstorm.md exist → continue mode
6. Create directory structure: `{session-folder}/ideas/`

**Session Variables**:
- `sessionId`: Unique session identifier
- `sessionFolder`: Base directory for all artifacts
- `brainstormMode`: creative | structured | balanced
- `autoMode`: Boolean for auto-confirmation
- `mode`: new | continue

### Phase 1: Seed Understanding

**Objective**: Analyze topic, select roles, gather user input, expand into exploration vectors.

**Prerequisites**:
- Session initialized with valid sessionId and sessionFolder
- Topic/idea available from $ARGUMENTS

**Workflow Steps**:

1. **Parse Seed & Identify Dimensions**
   - Match topic keywords against BRAINSTORM_DIMENSIONS
   - Identify relevant dimensions: technical, ux, business, innovation, feasibility, scalability, security
   - Default dimensions based on brainstormMode if no match

2. **Role Selection**
   - **Recommend roles** based on topic keywords (see Role Keywords mapping)
   - **Options**:
     - **Professional roles**: system-architect, product-manager, ui-designer, ux-expert, data-architect, test-strategist, subject-matter-expert, product-owner, scrum-master
     - **Simple perspectives**: creative/pragmatic/systematic (fallback)
   - **Auto mode**: Select top 3 recommended professional roles
   - **Manual mode**: AskUserQuestion with recommended roles + "Use simple perspectives" option

3. **Initial Scoping Questions** (if new session + not auto mode)
   - **Direction**: Multi-select from directions generated by detected dimensions (see Brainstorm Dimensions)
   - **Depth**: Single-select from quick/balanced/deep (15-20min / 30-60min / 1-2hr)
   - **Constraints**: Multi-select from existing architecture, time, resources, or no constraints

4. **Expand Seed into Exploration Vectors**
   - Launch Gemini CLI with analysis mode
   - Generate 5-7 exploration vectors:
     - Core question: Fundamental problem/opportunity
     - User perspective: Who benefits and how
     - Technical angle: What enables this
     - Alternative approaches: Other solutions
     - Challenges: Potential blockers
     - Innovation angle: 10x better approach
     - Integration: Fit with existing systems
   - Parse result into structured vectors

**CLI Call Example**:
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

5. **Initialize brainstorm.md**
   - Create brainstorm.md with session metadata
   - Add initial context: user focus, depth, constraints
   - Add seed expansion: original idea + exploration vectors
   - Create empty sections for thought evolution timeline

**Success Criteria**:
- Session folder created with brainstorm.md initialized
- 1-3 roles selected (professional or simple perspectives)
- 5-7 exploration vectors generated
- User preferences captured (direction, depth, constraints)

### Phase 2: Divergent Exploration

**Objective**: Gather codebase context, then execute multi-perspective analysis in parallel.

**Prerequisites**:
- Phase 1 completed successfully
- Roles selected and stored
- brainstorm.md initialized

**Workflow Steps**:

1. **Primary Codebase Exploration via cli-explore-agent** (⚠️ FIRST)
   - Agent type: `cli-explore-agent`
   - Execution mode: synchronous (run_in_background: false)
   - **Tasks**:
     - Run: `ccw tool exec get_modules_by_depth '{}'`
     - Search code related to topic keywords
     - Read: `.workflow/project-tech.json` if exists
   - **Output**: `{sessionFolder}/exploration-codebase.json`
     - relevant_files: [{path, relevance, rationale}]
     - existing_patterns: []
     - architecture_constraints: []
     - integration_points: []
     - inspiration_sources: []
   - **Purpose**: Enrich CLI prompts with codebase context

**Agent Call Example**:
```javascript
Task({
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

2. **Multi-CLI Perspective Analysis** (⚠️ AFTER exploration)
   - Launch 3 CLI calls in parallel (Gemini/Codex/Claude)
   - **Perspectives**:
     - **Creative (Gemini)**: Innovation, cross-domain inspiration, challenge assumptions
     - **Pragmatic (Codex)**: Implementation reality, feasibility, technical blockers
     - **Systematic (Claude)**: Architecture, decomposition, scalability
   - **Shared context**: Include exploration-codebase.json findings in prompts
   - **Execution**: Bash with run_in_background: true, wait for all results
   - **Output**: perspectives.json with creative/pragmatic/systematic sections

**Multi-CLI Call Example** (parallel execution):
```javascript
// Build shared context from exploration results
const explorationContext = `
PRIOR EXPLORATION CONTEXT (from cli-explore-agent):
- Key files: ${explorationResults.relevant_files.slice(0,5).map(f => f.path).join(', ')}
- Existing patterns: ${explorationResults.existing_patterns.slice(0,3).join(', ')}
- Architecture constraints: ${explorationResults.architecture_constraints.slice(0,3).join(', ')}
- Integration points: ${explorationResults.integration_points.slice(0,3).join(', ')}`

// Launch 3 CLI calls in parallel (single message, multiple Bash calls)
Bash({
  command: `ccw cli -p "
PURPOSE: Creative brainstorming for '${idea_or_topic}' - generate innovative ideas
Success: 5+ unique creative solutions that push boundaries

${explorationContext}

TASK:
• Build on existing patterns - how can they be extended creatively?
• Think beyond obvious solutions - what would be surprising/delightful?
• Explore cross-domain inspiration
• Challenge assumptions - what if the opposite were true?
• Generate 'moonshot' ideas alongside practical ones

MODE: analysis
CONTEXT: @**/* | Topic: ${idea_or_topic}
EXPECTED: 5+ creative ideas with novelty/impact ratings, challenged assumptions, cross-domain inspirations
CONSTRAINTS: ${brainstormMode === 'structured' ? 'Keep ideas technically feasible' : 'No constraints - think freely'}
" --tool gemini --mode analysis`,
  run_in_background: true
})

Bash({
  command: `ccw cli -p "
PURPOSE: Pragmatic brainstorming for '${idea_or_topic}' - focus on implementation reality
Success: Actionable approaches with clear implementation paths

${explorationContext}

TASK:
• Build on explored codebase - how to integrate with existing patterns?
• Evaluate technical feasibility of core concept
• Identify existing patterns/libraries that could help
• Estimate implementation complexity
• Highlight potential technical blockers
• Suggest incremental implementation approach

MODE: analysis
CONTEXT: @**/* | Topic: ${idea_or_topic}
EXPECTED: 3-5 practical approaches with effort/risk ratings, dependencies, quick wins vs long-term
CONSTRAINTS: Focus on what can actually be built with current tech stack
" --tool codex --mode analysis`,
  run_in_background: true
})

Bash({
  command: `ccw cli -p "
PURPOSE: Systematic brainstorming for '${idea_or_topic}' - architectural thinking
Success: Well-structured solution framework with clear tradeoffs

${explorationContext}

TASK:
• Build on explored architecture - how to extend systematically?
• Decompose the problem into sub-problems
• Identify architectural patterns that apply
• Map dependencies and interactions
• Consider scalability implications
• Propose systematic solution structure

MODE: analysis
CONTEXT: @**/* | Topic: ${idea_or_topic}
EXPECTED: Problem decomposition, 2-3 architectural approaches with tradeoffs, scalability assessment
CONSTRAINTS: Consider existing system architecture
" --tool claude --mode analysis`,
  run_in_background: true
})

// ⚠️ STOP POINT: Wait for hook callback to receive all results before continuing
```

3. **Aggregate Multi-Perspective Findings**
   - Consolidate creative/pragmatic/systematic results
   - Extract synthesis:
     - Convergent themes (all agree)
     - Conflicting views (need resolution)
     - Unique contributions (perspective-specific insights)
   - Write to perspectives.json

4. **Update brainstorm.md**
   - Append Round 2 section with multi-perspective exploration
   - Include creative/pragmatic/systematic findings
   - Add perspective synthesis

**CLI Prompt Template**:
- **PURPOSE**: Role brainstorming for topic - focus description
- **TASK**: Bullet list of specific actions
- **MODE**: analysis
- **CONTEXT**: @**/* | Topic + Exploration vectors + Codebase findings
- **EXPECTED**: Output format requirements
- **CONSTRAINTS**: Role-specific constraints

**Success Criteria**:
- exploration-codebase.json created with codebase context
- perspectives.json created with 3 perspective analyses
- brainstorm.md updated with Round 2 findings
- All CLI calls completed successfully

### Phase 3: Interactive Refinement

**Objective**: Iteratively refine ideas through user-guided exploration cycles.

**Prerequisites**:
- Phase 2 completed successfully
- perspectives.json contains initial ideas
- brainstorm.md has Round 2 findings

**Guideline**: For complex tasks (code analysis, implementation, POC creation), delegate to agents via Task tool (cli-explore-agent, code-developer, universal-executor) or CLI calls (ccw cli). Avoid direct analysis/execution in main process.

**Workflow Steps**:

1. **Present Current State**
   - Extract top ideas from perspectives.json
   - Display with: title, source, brief description, novelty/feasibility ratings
   - List open questions

2. **Gather User Direction** (AskUserQuestion)
   - **Question 1**: Which ideas to explore (multi-select from top ideas)
   - **Question 2**: Next step (single-select):
     - **深入探索**: Deep dive on selected ideas
     - **继续发散**: Generate more ideas
     - **挑战验证**: Devil's advocate challenge
     - **合并综合**: Merge multiple ideas
     - **准备收敛**: Begin convergence (exit loop)

3. **Execute User-Selected Action**

   **Deep Dive** (per selected idea):
   - Launch Gemini CLI with analysis mode
   - Tasks: Elaborate concept, implementation requirements, challenges, POC approach, metrics, dependencies
   - Output: `{sessionFolder}/ideas/{idea-slug}.md`

   **Generate More Ideas**:
   - Launch CLI with new angles from unexplored vectors
   - Add results to perspectives.json

   **Devil's Advocate Challenge**:
   - Launch Codex CLI with analysis mode
   - Tasks: Identify objections, challenge assumptions, failure scenarios, alternatives, survivability rating
   - Return challenge results for idea strengthening

   **Merge Ideas**:
   - Launch Gemini CLI with analysis mode
   - Tasks: Identify complementary elements, resolve contradictions, create unified concept
   - Add merged idea to perspectives.json

4. **Update brainstorm.md**
   - Append Round N section with findings
   - Document user direction and action results

5. **Repeat or Converge**
   - Continue loop (max 6 rounds) or exit to Phase 4

**Refinement Actions**:

| Action | Tool | Output | Description |
|--------|------|--------|-------------|
| Deep Dive | Gemini CLI | ideas/{slug}.md | Comprehensive idea analysis |
| Generate More | Selected CLI | Updated perspectives.json | Additional idea generation |
| Challenge | Codex CLI | Challenge results | Critical weaknesses exposed |
| Merge | Gemini CLI | Merged idea | Synthesized concept |

**CLI Call Examples for Refinement Actions**:

**1. Deep Dive on Selected Idea**:
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
User interest reason: ${idea.userReason || 'Selected for exploration'}

EXPECTED:
- Detailed concept description
- Technical requirements list
- Risk/challenge matrix
- MVP definition
- Success criteria
- Recommendation: pursue/pivot/park

CONSTRAINTS: Focus on actionability
" --tool gemini --mode analysis`,
  run_in_background: false
})
```

**2. Devil's Advocate Challenge**:
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
• Assess whether this solves the right problem
• Rate survivability after challenge (1-5)

MODE: analysis

EXPECTED:
- Per-idea challenge report
- Critical weaknesses exposed
- Counter-arguments to objections (if any)
- Ideas that survive the challenge
- Modified/strengthened versions

CONSTRAINTS: Be genuinely critical, not just contrarian
" --tool codex --mode analysis`,
  run_in_background: false
})
```

**3. Merge Multiple Ideas**:
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
• Create unified concept
• Preserve key strengths from each
• Describe the merged solution
• Assess viability of merged idea

MODE: analysis

EXPECTED:
- Merged concept description
- Elements taken from each source idea
- Contradictions resolved (or noted as tradeoffs)
- New combined strengths
- Implementation considerations

CONSTRAINTS: Don't force incompatible ideas together
" --tool gemini --mode analysis`,
  run_in_background: false
})
```

**Success Criteria**:
- User-selected ideas processed
- brainstorm.md updated with all refinement rounds
- ideas/ folder contains deep-dive documents for selected ideas
- Exit condition reached (user selects "准备收敛" or max rounds)

### Phase 4: Convergence & Crystallization

**Objective**: Synthesize final ideas, generate conclusions, offer next steps.

**Prerequisites**:
- Phase 3 completed successfully
- Multiple rounds of refinement documented
- User ready to converge

**Workflow Steps**:

1. **Generate Final Synthesis**
   - Consolidate all ideas from perspectives.json and refinement rounds
   - **Top ideas**: Filter active ideas, sort by score, take top 5
     - Include: title, description, source_perspective, score, novelty, feasibility, strengths, challenges, next_steps
   - **Parked ideas**: Ideas marked as parked with reason and future trigger
   - **Key insights**: Process discoveries, challenged assumptions, unexpected connections
   - **Recommendations**: Primary recommendation, alternatives, not recommended
   - **Follow-up**: Implementation/research/validation summaries
   - Write to synthesis.json

2. **Final brainstorm.md Update**
   - Append synthesis & conclusions section
   - **Executive summary**: High-level overview
   - **Top ideas**: Ranked with descriptions, strengths, challenges, next steps
   - **Primary recommendation**: Best path forward with rationale
   - **Alternative approaches**: Other viable options with tradeoffs
   - **Parked ideas**: Future considerations
   - **Key insights**: Learnings from the process
   - **Session statistics**: Rounds, ideas generated/survived, duration

3. **Post-Completion Options** (AskUserQuestion)
   - **创建实施计划**: Launch workflow-plan with top idea
   - **创建Issue**: Launch issue-discover for top 3 ideas
   - **深入分析**: Launch workflow:analyze-with-file for top idea
   - **导出分享**: Generate shareable report
   - **完成**: No further action

**synthesis.json Schema**:
- `session_id`: Session identifier
- `topic`: Original idea/topic
- `completed`: Completion timestamp
- `total_rounds`: Number of refinement rounds
- `top_ideas[]`: Top 5 ranked ideas
- `parked_ideas[]`: Ideas parked for future
- `key_insights[]`: Process learnings
- `recommendations`: Primary/alternatives/not_recommended
- `follow_up[]`: Next step summaries

**Success Criteria**:
- synthesis.json created with final synthesis
- brainstorm.md finalized with conclusions
- User offered next step options
- Session complete

## Configuration

### Brainstorm Dimensions

Dimensions matched against topic keywords to identify focus areas:

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

**Professional Roles** (recommended based on topic keywords):

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

| Perspective | CLI Tool | Focus | Best For |
|-------------|----------|-------|----------|
| creative | Gemini | Innovation, cross-domain | Generating novel ideas |
| pragmatic | Codex | Implementation, feasibility | Reality-checking ideas |
| systematic | Claude | Architecture, structure | Organizing solutions |

**Selection Strategy**:
1. **Auto mode** (`-y`): Choose top 3 recommended professional roles
2. **Manual mode**: Present recommended roles + "Use simple perspectives" option
3. **Continue mode**: Use roles from previous session

### Collaboration Patterns

| Pattern | Usage | Description |
|---------|-------|-------------|
| Parallel Divergence | New topic | All roles explore simultaneously from different angles |
| Sequential Deep-Dive | Promising idea | One role expands, others critique/refine |
| Debate Mode | Controversial approach | Roles argue for/against approaches |
| Synthesis Mode | Ready to decide | Combine insights into actionable conclusion |

### Context Overflow Protection

**Per-Role Limits**:
- Main analysis output: < 3000 words
- Sub-document (if any): < 2000 words each
- Maximum sub-documents: 5 per role

**Synthesis Protection**:
- If total analysis > 100KB, synthesis reads only main analysis files (not sub-documents)
- Large ideas automatically split into separate idea documents in ideas/ folder

**Recovery Steps**:
1. Check CLI logs for context overflow errors
2. Reduce scope: fewer roles or simpler topic
3. Use `--mode structured` for more focused output
4. Split complex topics into multiple sessions

**Prevention**:
- Start with 3 roles (default), increase if needed
- Use structured topic format: "GOAL: ... SCOPE: ... CONTEXT: ..."
- Review output sizes before final synthesis

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

## Best Practices

1. **Clear Topic Definition**: Detailed topics → better role selection and exploration
2. **Agent-First for Complex Tasks**: For code analysis, POC implementation, or technical validation during refinement, delegate to agents via Task tool (cli-explore-agent, code-developer, universal-executor) or CLI calls (ccw cli). Avoid direct analysis/execution in main process
3. **Review brainstorm.md**: Check thought evolution before final decisions
4. **Embrace Conflicts**: Perspective conflicts often reveal important tradeoffs
5. **Document Evolution**: brainstorm.md captures full thinking process for team review
6. **Use Continue Mode**: Resume sessions to build on previous exploration

## Templates

### Brainstorm Document Structure

**brainstorm.md** contains:
- **Header**: Session metadata (ID, topic, started, mode, dimensions)
- **Initial Context**: User focus, depth, constraints
- **Seed Expansion**: Original idea + exploration vectors
- **Thought Evolution Timeline**: Round-by-round findings
  - Round 1: Seed Understanding
  - Round 2: Multi-Perspective Exploration (creative/pragmatic/systematic)
  - Round 3-N: Interactive Refinement (deep-dive/challenge/merge)
- **Synthesis & Conclusions**: Executive summary, top ideas, recommendations
- **Session Statistics**: Rounds, ideas, duration, artifacts

See full markdown template in original file (lines 955-1161).

## Usage Recommendations (Requires User Confirmation)

**Use `Skill(skill="brainstorm", args="\"topic or question\"")` when:**
- Starting a new feature/product without clear direction
- Facing a complex problem with multiple possible solutions
- Need to explore alternatives before committing
- Want documented thinking process for team review
- Combining multiple stakeholder perspectives

**Use `Skill(skill="workflow:analyze-with-file", args="\"topic\"")` when:**
- Investigating existing code/system
- Need factual analysis over ideation
- Debugging or troubleshooting
- Understanding current state

**Use `Skill(skill="workflow-plan", args="\"task description\"")` when:**
- Complex planning requiring multiple perspectives
- Large scope needing parallel sub-domain analysis
- Want shared collaborative planning document
- Need structured task breakdown with agent coordination

**Use `Skill(skill="workflow-lite-plan", args="\"task description\"")` when:**
- Direction is already clear
- Ready to move from ideas to execution
- Need simple implementation breakdown

---

**Now execute brainstorm-with-file for**: $ARGUMENTS
