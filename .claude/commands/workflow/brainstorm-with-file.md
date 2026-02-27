---
name: brainstorm-with-file
description: Interactive brainstorming with multi-CLI collaboration, idea expansion, and documented thought evolution
argument-hint: "[-y|--yes] [-c|--continue] [-m|--mode creative|structured] \"idea or topic\""
allowed-tools: TodoWrite(*), Task(*), AskUserQuestion(*), Read(*), Grep(*), Glob(*), Bash(*), Edit(*), Write(*)
---

## Auto Mode

When `--yes` or `-y`: Auto-confirm decisions, use balanced exploration across all perspectives.

# Workflow Brainstorm-With-File Command (/workflow:brainstorm-with-file)

## Overview

Interactive brainstorming workflow with **multi-CLI collaboration** and **documented thought evolution**. Expands initial ideas through questioning, multi-perspective analysis, and iterative refinement.

**Core workflow**: Seed Idea → Expand → Multi-CLI Discuss → Synthesize → Refine → Crystallize

**Key features**:
- **brainstorm.md**: Complete thought evolution timeline
- **Multi-CLI collaboration**: Gemini (creative), Codex (pragmatic), Claude (systematic) perspectives
- **Idea expansion**: Progressive questioning and exploration
- **Diverge-Converge cycles**: Generate options then focus on best paths
- **Synthesis**: Merge multiple perspectives into coherent solutions

## Usage

```bash
/workflow:brainstorm-with-file [FLAGS] <IDEA_OR_TOPIC>

# Flags
-y, --yes              Skip confirmations, use recommended settings
-c, --continue         Continue existing session (auto-detected if exists)
-m, --mode <mode>      Brainstorm mode: creative (divergent) | structured (goal-oriented)

# Arguments
<idea-or-topic>        Initial idea, problem, or topic to brainstorm (required)

# Examples
/workflow:brainstorm-with-file "如何重新设计用户通知系统"
/workflow:brainstorm-with-file --continue "通知系统"              # Continue existing
/workflow:brainstorm-with-file -y -m creative "创新的AI辅助功能"   # Creative auto mode
/workflow:brainstorm-with-file -m structured "优化缓存策略"       # Goal-oriented mode
```

## Execution Process

```
Session Detection:
   ├─ Check if brainstorm session exists for topic
   ├─ EXISTS + brainstorm.md exists → Continue mode
   └─ NOT_FOUND → New session mode

Phase 1: Seed Understanding
   ├─ Parse initial idea/topic
   ├─ Identify brainstorm dimensions (technical, UX, business, etc.)
   ├─ Initial scoping questions (AskUserQuestion)
   ├─ Expand seed into exploration vectors
   └─ Document in brainstorm.md

Phase 2: Divergent Exploration (Multi-CLI Parallel)
   ├─ Gemini CLI: Creative/innovative perspectives
   ├─ Codex CLI: Pragmatic/implementation perspectives
   ├─ Claude CLI: Systematic/architectural perspectives
   └─ Aggregate diverse viewpoints

Phase 3: Interactive Refinement (Multi-Round)
   ├─ Present multi-perspective findings
   ├─ User selects promising directions
   ├─ Deep dive on selected paths
   ├─ Challenge assumptions (devil's advocate)
   ├─ Update brainstorm.md with evolution
   └─ Repeat diverge-converge cycles

Phase 4: Convergence & Crystallization
   ├─ Synthesize best ideas
   ├─ Resolve conflicts between perspectives
   ├─ Formulate actionable conclusions
   ├─ Generate next steps or implementation plan
   └─ Final brainstorm.md update

Output:
   ├─ .workflow/.brainstorm/{slug}-{date}/brainstorm.md (thought evolution)
   ├─ .workflow/.brainstorm/{slug}-{date}/perspectives.json (CLI findings)
   ├─ .workflow/.brainstorm/{slug}-{date}/synthesis.json (final ideas)
   └─ .workflow/.brainstorm/{slug}-{date}/ideas/ (individual idea deep-dives)
```

## Implementation

### Session Setup & Mode Detection

```javascript
const getUtc8ISOString = () => new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()

const topicSlug = idea_or_topic.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-').substring(0, 40)
const dateStr = getUtc8ISOString().substring(0, 10)

const sessionId = `BS-${topicSlug}-${dateStr}`
const sessionFolder = `.workflow/.brainstorm/${sessionId}`
const brainstormPath = `${sessionFolder}/brainstorm.md`
const perspectivesPath = `${sessionFolder}/perspectives.json`
const synthesisPath = `${sessionFolder}/synthesis.json`
const ideasFolder = `${sessionFolder}/ideas`

// Auto-detect mode
const sessionExists = fs.existsSync(sessionFolder)
const hasBrainstorm = sessionExists && fs.existsSync(brainstormPath)
const forcesContinue = $ARGUMENTS.includes('--continue') || $ARGUMENTS.includes('-c')

const mode = (hasBrainstorm || forcesContinue) ? 'continue' : 'new'

// Brainstorm mode
const brainstormMode = $ARGUMENTS.includes('--mode') 
  ? $ARGUMENTS.match(/--mode\s+(creative|structured)/)?.[1] || 'balanced'
  : 'balanced'

if (!sessionExists) {
  bash(`mkdir -p ${sessionFolder}/ideas`)
}
```

---

### Phase 1: Seed Understanding

**Step 1.1: Parse Seed & Identify Dimensions**

```javascript
// Brainstorm dimensions for multi-perspective analysis
const BRAINSTORM_DIMENSIONS = {
  technical: ['技术', 'technical', 'implementation', 'code', '实现', 'architecture'],
  ux: ['用户', 'user', 'experience', 'UX', 'UI', '体验', 'interaction'],
  business: ['业务', 'business', 'value', 'ROI', '价值', 'market'],
  innovation: ['创新', 'innovation', 'novel', 'creative', '新颖'],
  feasibility: ['可行', 'feasible', 'practical', 'realistic', '实际'],
  scalability: ['扩展', 'scale', 'growth', 'performance', '性能'],
  security: ['安全', 'security', 'risk', 'protection', '风险']
}

function identifyDimensions(topic) {
  const text = topic.toLowerCase()
  const matched = []
  
  for (const [dimension, keywords] of Object.entries(BRAINSTORM_DIMENSIONS)) {
    if (keywords.some(k => text.includes(k))) {
      matched.push(dimension)
    }
  }
  
  // Default dimensions based on mode
  if (matched.length === 0) {
    return brainstormMode === 'creative' 
      ? ['innovation', 'ux', 'technical']
      : ['technical', 'feasibility', 'business']
  }
  
  return matched
}

const dimensions = identifyDimensions(idea_or_topic)
```

**Step 1.2: Initial Scoping Questions**

```javascript
const autoYes = $ARGUMENTS.includes('--yes') || $ARGUMENTS.includes('-y')

if (mode === 'new' && !autoYes) {
  // Expand the seed with targeted questions
  AskUserQuestion({
    questions: [
      {
        question: `头脑风暴主题: "${idea_or_topic}"\n\n您希望探索哪些方向?`,
        header: "方向",
        multiSelect: true,
        options: [
          { label: "技术方案", description: "探索技术实现可能性" },
          { label: "用户体验", description: "从用户角度出发" },
          { label: "创新突破", description: "寻找非常规解决方案" },
          { label: "可行性评估", description: "评估实际落地可能" }
        ]
      },
      {
        question: "头脑风暴深度?",
        header: "深度",
        multiSelect: false,
        options: [
          { label: "快速发散", description: "广度优先，快速生成多个想法 (15-20分钟)" },
          { label: "平衡探索", description: "深度和广度平衡 (30-60分钟)" },
          { label: "深度挖掘", description: "深入探索少数核心想法 (1-2小时)" }
        ]
      },
      {
        question: "是否有任何约束或必须考虑的因素?",
        header: "约束",
        multiSelect: true,
        options: [
          { label: "现有架构", description: "需要与现有系统兼容" },
          { label: "时间限制", description: "有实施时间约束" },
          { label: "资源限制", description: "开发资源有限" },
          { label: "无约束", description: "完全开放探索" }
        ]
      }
    ]
  })
}
```

**Step 1.3: Expand Seed into Exploration Vectors**

```javascript
// Generate exploration vectors from seed idea
const expansionPrompt = `
Given the initial idea: "${idea_or_topic}"
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
`

// Use quick Gemini call to expand seed
const expansionResult = await Bash({
  command: `ccw cli -p "${expansionPrompt}" --tool gemini --mode analysis --model gemini-2.5-flash`,
  run_in_background: false
})

const explorationVectors = parseExpansionResult(expansionResult)
```

**Step 1.4: Create brainstorm.md**

```markdown
# Brainstorm Session

**Session ID**: ${sessionId}
**Topic**: ${idea_or_topic}
**Started**: ${getUtc8ISOString()}
**Mode**: ${brainstormMode}
**Dimensions**: ${dimensions.join(', ')}

---

## Initial Context

**User Focus**: ${userFocusAreas.join(', ')}
**Depth**: ${analysisDepth}
**Constraints**: ${constraints.join(', ')}

---

## Seed Expansion

### Original Idea
> ${idea_or_topic}

### Exploration Vectors

${explorationVectors.map((v, i) => `
#### Vector ${i+1}: ${v.title}
**Question**: ${v.question}
**Angle**: ${v.angle}
**Potential**: ${v.potential}
`).join('\n')}

---

## Thought Evolution Timeline

### Round 1 - Seed Understanding (${timestamp})

#### Initial Parsing
- **Core concept**: ${coreConcept}
- **Problem space**: ${problemSpace}
- **Opportunity**: ${opportunity}

#### Key Questions to Explore
${keyQuestions.map((q, i) => `${i+1}. ${q}`).join('\n')}

---

## Current Ideas

*To be populated after exploration phases*

---

## Idea Graveyard

*Discarded ideas with reasons - kept for reference*
```

---

### Phase 2: Divergent Exploration (Multi-CLI Parallel)

**Step 2.1: Launch Multi-CLI Perspectives**

```javascript
const cliPromises = []

// 1. Gemini: Creative/Innovative Perspective
cliPromises.push(
  Bash({
    command: `ccw cli -p "
PURPOSE: Creative brainstorming for '${idea_or_topic}' - generate innovative, unconventional ideas
Success: 5+ unique creative solutions that push boundaries

TASK:
• Think beyond obvious solutions - what would be surprising/delightful?
• Explore cross-domain inspiration (what can we learn from other industries?)
• Challenge assumptions - what if the opposite were true?
• Generate 'moonshot' ideas alongside practical ones
• Consider future trends and emerging technologies

MODE: analysis

CONTEXT: @**/* | Topic: ${idea_or_topic}
Exploration vectors: ${explorationVectors.map(v => v.title).join(', ')}

EXPECTED:
- 5+ creative ideas with brief descriptions
- Each idea rated: novelty (1-5), potential impact (1-5)
- Key assumptions challenged
- Cross-domain inspirations
- One 'crazy' idea that might just work

CONSTRAINTS: ${brainstormMode === 'structured' ? 'Keep ideas technically feasible' : 'No constraints - think freely'}
" --tool gemini --mode analysis`,
    run_in_background: true
  })
)

// 2. Codex: Pragmatic/Implementation Perspective
cliPromises.push(
  Bash({
    command: `ccw cli -p "
PURPOSE: Pragmatic analysis for '${idea_or_topic}' - focus on implementation reality
Success: Actionable approaches with clear implementation paths

TASK:
• Evaluate technical feasibility of core concept
• Identify existing patterns/libraries that could help
• Consider integration with current codebase
• Estimate implementation complexity
• Highlight potential technical blockers
• Suggest incremental implementation approach

MODE: analysis

CONTEXT: @**/* | Topic: ${idea_or_topic}
Exploration vectors: ${explorationVectors.map(v => v.title).join(', ')}

EXPECTED:
- 3-5 practical implementation approaches
- Each rated: effort (1-5), risk (1-5), reuse potential (1-5)
- Technical dependencies identified
- Quick wins vs long-term solutions
- Recommended starting point

CONSTRAINTS: Focus on what can actually be built with current tech stack
" --tool codex --mode analysis`,
    run_in_background: true
  })
)

// 3. Claude: Systematic/Architectural Perspective
cliPromises.push(
  Bash({
    command: `ccw cli -p "
PURPOSE: Systematic analysis for '${idea_or_topic}' - architectural and structural thinking
Success: Well-structured solution framework with clear tradeoffs

TASK:
• Decompose the problem into sub-problems
• Identify architectural patterns that apply
• Map dependencies and interactions
• Consider scalability implications
• Evaluate long-term maintainability
• Propose systematic solution structure

MODE: analysis

CONTEXT: @**/* | Topic: ${idea_or_topic}
Exploration vectors: ${explorationVectors.map(v => v.title).join(', ')}

EXPECTED:
- Problem decomposition diagram (text)
- 2-3 architectural approaches with tradeoffs
- Dependency mapping
- Scalability assessment
- Recommended architecture pattern
- Risk matrix

CONSTRAINTS: Consider existing system architecture
" --tool claude --mode analysis`,
    run_in_background: true
  })
)

// Wait for all CLI analyses
await Promise.all(cliPromises)
```

**Step 2.2: Aggregate Multi-Perspective Findings**

```javascript
const perspectives = {
  session_id: sessionId,
  timestamp: getUtc8ISOString(),
  topic: idea_or_topic,
  
  creative: {
    source: 'gemini',
    ideas: [...],
    insights: [...],
    challenges: [...]
  },
  
  pragmatic: {
    source: 'codex',
    approaches: [...],
    blockers: [...],
    recommendations: [...]
  },
  
  systematic: {
    source: 'claude',
    decomposition: [...],
    patterns: [...],
    tradeoffs: [...]
  },
  
  synthesis: {
    convergent_themes: [],
    conflicting_views: [],
    unique_contributions: []
  }
}

Write(perspectivesPath, JSON.stringify(perspectives, null, 2))
```

**Step 2.3: Update brainstorm.md with Perspectives**

```markdown
### Round 2 - Multi-Perspective Exploration (${timestamp})

#### Creative Perspective (Gemini)

**Top Creative Ideas**:
${creativeIdeas.map((idea, i) => `
${i+1}. **${idea.title}** ⭐ Novelty: ${idea.novelty}/5 | Impact: ${idea.impact}/5
   ${idea.description}
`).join('\n')}

**Challenged Assumptions**:
${challengedAssumptions.map(a => `- ~~${a.assumption}~~ → Consider: ${a.alternative}`).join('\n')}

**Cross-Domain Inspirations**:
${inspirations.map(i => `- ${i}`).join('\n')}

---

#### Pragmatic Perspective (Codex)

**Implementation Approaches**:
${pragmaticApproaches.map((a, i) => `
${i+1}. **${a.title}** | Effort: ${a.effort}/5 | Risk: ${a.risk}/5
   ${a.description}
   - Quick win: ${a.quickWin}
   - Dependencies: ${a.dependencies.join(', ')}
`).join('\n')}

**Technical Blockers**:
${blockers.map(b => `- ⚠️ ${b}`).join('\n')}

---

#### Systematic Perspective (Claude)

**Problem Decomposition**:
${decomposition}

**Architectural Options**:
${architecturalOptions.map((opt, i) => `
${i+1}. **${opt.pattern}**
   - Pros: ${opt.pros.join(', ')}
   - Cons: ${opt.cons.join(', ')}
   - Best for: ${opt.bestFor}
`).join('\n')}

---

#### Perspective Synthesis

**Convergent Themes** (all perspectives agree):
${convergentThemes.map(t => `- ✅ ${t}`).join('\n')}

**Conflicting Views** (need resolution):
${conflictingViews.map(v => `
- 🔄 ${v.topic}
  - Creative: ${v.creative}
  - Pragmatic: ${v.pragmatic}
  - Systematic: ${v.systematic}
`).join('\n')}

**Unique Contributions**:
${uniqueContributions.map(c => `- 💡 [${c.source}] ${c.insight}`).join('\n')}
```

---

### Phase 3: Interactive Refinement (Multi-Round)

**Step 3.1: Present & Select Directions**

```javascript
const MAX_ROUNDS = 6
let roundNumber = 3  // After initial exploration
let brainstormComplete = false

while (!brainstormComplete && roundNumber <= MAX_ROUNDS) {
  
  // Present current state
  console.log(`
## Brainstorm Round ${roundNumber}

### Top Ideas So Far

${topIdeas.map((idea, i) => `
${i+1}. **${idea.title}** (${idea.source})
   ${idea.brief}
   - Novelty: ${'⭐'.repeat(idea.novelty)} | Feasibility: ${'✅'.repeat(idea.feasibility)}
`).join('\n')}

### Open Questions
${openQuestions.map((q, i) => `${i+1}. ${q}`).join('\n')}
`)

  // Gather user direction
  const userDirection = AskUserQuestion({
    questions: [
      {
        question: "哪些想法值得深入探索?",
        header: "选择",
        multiSelect: true,
        options: topIdeas.slice(0, 4).map(idea => ({
          label: idea.title,
          description: idea.brief
        }))
      },
      {
        question: "下一步?",
        header: "方向",
        multiSelect: false,
        options: [
          { label: "深入探索", description: "深入分析选中的想法" },
          { label: "继续发散", description: "生成更多新想法" },
          { label: "挑战验证", description: "Devil's advocate - 挑战当前想法" },
          { label: "合并综合", description: "尝试合并多个想法" },
          { label: "准备收敛", description: "开始整理最终结论" }
        ]
      }
    ]
  })

  // Process based on direction
  switch (userDirection.direction) {
    case "深入探索":
      await deepDiveIdeas(userDirection.selectedIdeas)
      break
    case "继续发散":
      await generateMoreIdeas()
      break
    case "挑战验证":
      await devilsAdvocate(topIdeas)
      break
    case "合并综合":
      await mergeIdeas(userDirection.selectedIdeas)
      break
    case "准备收敛":
      brainstormComplete = true
      break
  }

  // Update brainstorm.md
  updateBrainstormDocument(roundNumber, userDirection, findings)
  roundNumber++
}
```

**Step 3.2: Deep Dive on Selected Ideas**

```javascript
async function deepDiveIdeas(selectedIdeas) {
  for (const idea of selectedIdeas) {
    // Create dedicated idea file
    const ideaPath = `${ideasFolder}/${idea.slug}.md`
    
    // Deep dive with targeted CLI call
    await Bash({
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
    
    // Save deep dive to dedicated file
    Write(ideaPath, deepDiveContent)
  }
}
```

**Step 3.3: Devil's Advocate Challenge**

```javascript
async function devilsAdvocate(ideas) {
  const challengeResult = await Bash({
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
  
  return challengeResult
}
```

**Step 3.4: Merge & Synthesize Ideas**

```javascript
async function mergeIdeas(ideaIds) {
  const selectedIdeas = ideas.filter(i => ideaIds.includes(i.id))
  
  const mergeResult = await Bash({
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
  
  // Add merged idea to list
  const mergedIdea = parseMergeResult(mergeResult)
  ideas.push(mergedIdea)
  
  return mergedIdea
}
```

**Step 3.5: Document Each Round**

Append to brainstorm.md:
```markdown
### Round ${n} - ${roundType} (${timestamp})

#### User Direction
- **Selected ideas**: ${selectedIdeas.join(', ')}
- **Action**: ${action}
- **Reasoning**: ${userReasoning || 'Not specified'}

${roundType === 'deep-dive' ? `
#### Deep Dive: ${ideaTitle}

**Elaborated Concept**:
${elaboratedConcept}

**Implementation Requirements**:
${requirements.map(r => `- ${r}`).join('\n')}

**Challenges & Mitigations**:
${challenges.map(c => `- ⚠️ ${c.challenge} → ✅ ${c.mitigation}`).join('\n')}

**MVP Definition**:
${mvpDefinition}

**Recommendation**: ${recommendation}
` : ''}

${roundType === 'challenge' ? `
#### Devil's Advocate Results

**Challenges Raised**:
${challenges.map(c => `
- 🔴 **${c.idea}**: ${c.objection}
  - Counter: ${c.counter || 'No strong counter-argument'}
  - Survivability: ${c.survivability}/5
`).join('\n')}

**Ideas That Survived**:
${survivedIdeas.map(i => `- ✅ ${i}`).join('\n')}

**Eliminated/Parked**:
${eliminatedIdeas.map(i => `- ❌ ${i.title}: ${i.reason}`).join('\n')}
` : ''}

${roundType === 'merge' ? `
#### Merged Idea: ${mergedIdea.title}

**Source Ideas Combined**:
${sourceIdeas.map(i => `- ${i}`).join('\n')}

**Unified Concept**:
${mergedIdea.description}

**Key Elements Preserved**:
${preservedElements.map(e => `- ✅ ${e}`).join('\n')}

**Tradeoffs Accepted**:
${tradeoffs.map(t => `- ⚖️ ${t}`).join('\n')}
` : ''}

#### Updated Idea Ranking

${updatedRanking.map((idea, i) => `
${i+1}. **${idea.title}** ${idea.status}
   - Score: ${idea.score}/10
   - Source: ${idea.source}
`).join('\n')}
```

---

### Phase 4: Convergence & Crystallization

**Step 4.1: Final Synthesis**

```javascript
const synthesis = {
  session_id: sessionId,
  topic: idea_or_topic,
  completed: getUtc8ISOString(),
  total_rounds: roundNumber,
  
  // Top ideas with full details
  top_ideas: ideas.filter(i => i.status === 'active').sort((a,b) => b.score - a.score).slice(0, 5).map(idea => ({
    title: idea.title,
    description: idea.description,
    source_perspective: idea.source,
    score: idea.score,
    novelty: idea.novelty,
    feasibility: idea.feasibility,
    key_strengths: idea.strengths,
    main_challenges: idea.challenges,
    next_steps: idea.nextSteps
  })),
  
  // Parked ideas for future reference
  parked_ideas: ideas.filter(i => i.status === 'parked').map(idea => ({
    title: idea.title,
    reason_parked: idea.parkReason,
    potential_future_trigger: idea.futureTrigger
  })),
  
  // Key insights from the process
  key_insights: keyInsights,
  
  // Recommendations
  recommendations: {
    primary: primaryRecommendation,
    alternatives: alternativeApproaches,
    not_recommended: notRecommended
  },
  
  // Follow-up suggestions
  follow_up: [
    { type: 'implementation', summary: '...' },
    { type: 'research', summary: '...' },
    { type: 'validation', summary: '...' }
  ]
}

Write(synthesisPath, JSON.stringify(synthesis, null, 2))
```

**Step 4.2: Final brainstorm.md Update**

```markdown
---

## Synthesis & Conclusions (${timestamp})

### Executive Summary

${executiveSummary}

### Top Ideas (Final Ranking)

${topIdeas.map((idea, i) => `
#### ${i+1}. ${idea.title} ⭐ Score: ${idea.score}/10

**Description**: ${idea.description}

**Why This Idea**:
${idea.strengths.map(s => `- ✅ ${s}`).join('\n')}

**Main Challenges**:
${idea.challenges.map(c => `- ⚠️ ${c}`).join('\n')}

**Recommended Next Steps**:
${idea.nextSteps.map((s, j) => `${j+1}. ${s}`).join('\n')}

---
`).join('\n')}

### Primary Recommendation

> ${primaryRecommendation}

**Rationale**: ${primaryRationale}

**Quick Start Path**:
1. ${step1}
2. ${step2}
3. ${step3}

### Alternative Approaches

${alternatives.map((alt, i) => `
${i+1}. **${alt.title}**
   - When to consider: ${alt.whenToConsider}
   - Tradeoff: ${alt.tradeoff}
`).join('\n')}

### Ideas Parked for Future

${parkedIdeas.map(idea => `
- **${idea.title}** (Parked: ${idea.reason})
  - Revisit when: ${idea.futureTrigger}
`).join('\n')}

---

## Key Insights

### Process Discoveries

${processDiscoveries.map(d => `- 💡 ${d}`).join('\n')}

### Assumptions Challenged

${challengedAssumptions.map(a => `- ~~${a.original}~~ → ${a.updated}`).join('\n')}

### Unexpected Connections

${unexpectedConnections.map(c => `- 🔗 ${c}`).join('\n')}

---

## Current Understanding (Final)

### Problem Reframed

${reframedProblem}

### Solution Space Mapped

${solutionSpaceMap}

### Decision Framework

When to choose each approach:
${decisionFramework}

---

## Session Statistics

- **Total Rounds**: ${totalRounds}
- **Ideas Generated**: ${totalIdeas}
- **Ideas Survived**: ${survivedIdeas}
- **Perspectives Used**: Gemini (creative), Codex (pragmatic), Claude (systematic)
- **Duration**: ${duration}
- **Artifacts**: brainstorm.md, perspectives.json, synthesis.json, ${ideaFiles.length} idea deep-dives
```

**Step 4.3: Post-Completion Options**

```javascript
AskUserQuestion({
  questions: [{
    question: "头脑风暴完成。是否需要后续操作?",
    header: "后续",
    multiSelect: true,
    options: [
      { label: "创建实施计划", description: "将最佳想法转为实施计划" },
      { label: "创建Issue", description: "将想法转为可追踪的Issue" },
      { label: "深入分析", description: "对某个想法进行深度技术分析" },
      { label: "导出分享", description: "生成可分享的报告" },
      { label: "完成", description: "不需要后续操作" }
    ]
  }]
})

// Handle selections
if (selection.includes("创建实施计划")) {
  const topIdea = synthesis.top_ideas[0]
  SlashCommand("/workflow:plan", `实施: ${topIdea.title} - ${topIdea.description}`)
}
if (selection.includes("创建Issue")) {
  for (const idea of synthesis.top_ideas.slice(0, 3)) {
    SlashCommand("/issue:new", `${idea.title}: ${idea.next_steps[0]}`)
  }
}
if (selection.includes("深入分析")) {
  SlashCommand("/workflow:analyze-with-file", synthesis.top_ideas[0].title)
}
if (selection.includes("导出分享")) {
  exportBrainstormReport(sessionFolder)
}
```

---

## Session Folder Structure

```
.workflow/.brainstorm/BS-{slug}-{date}/
├── brainstorm.md        # Complete thought evolution
├── perspectives.json    # Multi-CLI perspective findings
├── synthesis.json       # Final synthesis
└── ideas/               # Individual idea deep-dives
    ├── idea-1.md
    ├── idea-2.md
    └── merged-idea-1.md
```

## Brainstorm Document Template

```markdown
# Brainstorm Session

**Session ID**: BS-xxx-2025-01-27
**Topic**: [idea or topic]
**Started**: 2025-01-27T10:00:00+08:00
**Mode**: creative | structured | balanced
**Dimensions**: [technical, ux, innovation, ...]

---

## Initial Context

**User Focus**: [selected focus areas]
**Depth**: [quick|balanced|deep]
**Constraints**: [if any]

---

## Seed Expansion

### Original Idea
> [the initial idea]

### Exploration Vectors
[generated questions and directions]

---

## Thought Evolution Timeline

### Round 1 - Seed Understanding
...

### Round 2 - Multi-Perspective Exploration

#### Creative Perspective (Gemini)
...

#### Pragmatic Perspective (Codex)
...

#### Systematic Perspective (Claude)
...

#### Perspective Synthesis
...

### Round 3 - Deep Dive
...

### Round 4 - Challenge
...

---

## Synthesis & Conclusions

### Executive Summary
...

### Top Ideas (Final Ranking)
...

### Primary Recommendation
...

---

## Key Insights
...

---

## Current Understanding (Final)
...

---

## Session Statistics
...
```

## Multi-CLI Collaboration Strategy

### Perspective Roles

| CLI | Role | Focus | Best For |
|-----|------|-------|----------|
| Gemini | Creative | Innovation, cross-domain | Generating novel ideas |
| Codex | Pragmatic | Implementation, feasibility | Reality-checking ideas |
| Claude | Systematic | Architecture, structure | Organizing solutions |

### Collaboration Patterns

1. **Parallel Divergence**: All CLIs explore simultaneously from different angles
2. **Sequential Deep-Dive**: One CLI expands, others critique/refine
3. **Debate Mode**: CLIs argue for/against specific approaches
4. **Synthesis Mode**: Combine insights from all perspectives

### When to Use Each Pattern

- **New topic**: Parallel Divergence → get diverse initial ideas
- **Promising idea**: Sequential Deep-Dive → thorough exploration
- **Controversial approach**: Debate Mode → uncover hidden issues
- **Ready to decide**: Synthesis Mode → create actionable conclusion

## Error Handling

| Situation | Action |
|-----------|--------|
| CLI timeout | Retry with shorter prompt, or continue without that perspective |
| No good ideas | Reframe the problem, adjust constraints, try different angles |
| User disengaged | Summarize progress, offer break point with resume option |
| Perspectives conflict | Present as tradeoff, let user decide direction |
| Max rounds reached | Force synthesis, highlight unresolved questions |
| All ideas fail challenge | Return to divergent phase with new constraints |

## Usage Recommendations

Use `/workflow:brainstorm-with-file` when:
- Starting a new feature/product without clear direction
- Facing a complex problem with multiple possible solutions
- Need to explore alternatives before committing
- Want documented thinking process for team review
- Combining multiple stakeholder perspectives

Use `/workflow:analyze-with-file` when:
- Investigating existing code/system
- Need factual analysis over ideation
- Debugging or troubleshooting
- Understanding current state

Use `/workflow:plan` when:
- Direction is already clear
- Ready to move from ideas to execution
- Need implementation breakdown
