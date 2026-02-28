# Mermaid Utilities Library

Shared utilities for generating and validating Mermaid diagrams across all analysis skills.

## Sanitization Functions

### sanitizeId

Convert any text to a valid Mermaid node ID.

```javascript
/**
 * Sanitize text to valid Mermaid node ID
 * - Only alphanumeric and underscore allowed
 * - Cannot start with number
 * - Truncates to 50 chars max
 * 
 * @param {string} text - Input text
 * @returns {string} - Valid Mermaid ID
 */
function sanitizeId(text) {
  if (!text) return '_empty';
  return text
    .replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, '_')  // Allow Chinese chars
    .replace(/^[0-9]/, '_$&')                      // Prefix number with _
    .replace(/_+/g, '_')                           // Collapse multiple _
    .substring(0, 50);                             // Limit length
}

// Examples:
// sanitizeId("User-Service") → "User_Service"
// sanitizeId("3rdParty") → "_3rdParty"
// sanitizeId("用户服务") → "用户服务"
```

### escapeLabel

Escape special characters for Mermaid labels.

```javascript
/**
 * Escape special characters in Mermaid labels
 * Uses HTML entity encoding for problematic chars
 * 
 * @param {string} text - Label text
 * @returns {string} - Escaped label
 */
function escapeLabel(text) {
  if (!text) return '';
  return text
    .replace(/"/g, "'")                            // Avoid quote issues
    .replace(/\(/g, '#40;')                        // (
    .replace(/\)/g, '#41;')                        // )
    .replace(/\{/g, '#123;')                       // {
    .replace(/\}/g, '#125;')                       // }
    .replace(/\[/g, '#91;')                        // [
    .replace(/\]/g, '#93;')                        // ]
    .replace(/</g, '#60;')                         // <
    .replace(/>/g, '#62;')                         // >
    .replace(/\|/g, '#124;')                       // |
    .substring(0, 80);                             // Limit length
}

// Examples:
// escapeLabel("Process(data)") → "Process#40;data#41;"
// escapeLabel("Check {valid?}") → "Check #123;valid?#125;"
```

### sanitizeType

Sanitize type names for class diagrams.

```javascript
/**
 * Sanitize type names for Mermaid classDiagram
 * Removes generics syntax that causes issues
 * 
 * @param {string} type - Type name
 * @returns {string} - Sanitized type
 */
function sanitizeType(type) {
  if (!type) return 'any';
  return type
    .replace(/<[^>]*>/g, '')           // Remove generics <T>
    .replace(/\|/g, ' or ')            // Union types
    .replace(/&/g, ' and ')            // Intersection types
    .replace(/\[\]/g, 'Array')         // Array notation
    .substring(0, 30);
}

// Examples:
// sanitizeType("Array<string>") → "Array"
// sanitizeType("string | number") → "string or number"
```

## Diagram Generation Functions

### generateFlowchartNode

Generate a flowchart node with proper shape.

```javascript
/**
 * Generate flowchart node with shape
 * 
 * @param {string} id - Node ID
 * @param {string} label - Display label
 * @param {string} type - Node type: start|end|process|decision|io|subroutine
 * @returns {string} - Mermaid node definition
 */
function generateFlowchartNode(id, label, type = 'process') {
  const safeId = sanitizeId(id);
  const safeLabel = escapeLabel(label);
  
  const shapes = {
    start: `${safeId}(["${safeLabel}"])`,           // Stadium shape
    end: `${safeId}(["${safeLabel}"])`,             // Stadium shape
    process: `${safeId}["${safeLabel}"]`,           // Rectangle
    decision: `${safeId}{"${safeLabel}"}`,          // Diamond
    io: `${safeId}[/"${safeLabel}"/]`,              // Parallelogram
    subroutine: `${safeId}[["${safeLabel}"]]`,      // Subroutine
    database: `${safeId}[("${safeLabel}")]`,        // Cylinder
    manual: `${safeId}[/"${safeLabel}"\\]`          // Trapezoid
  };
  
  return shapes[type] || shapes.process;
}
```

### generateFlowchartEdge

Generate a flowchart edge with optional label.

```javascript
/**
 * Generate flowchart edge
 * 
 * @param {string} from - Source node ID
 * @param {string} to - Target node ID
 * @param {string} label - Edge label (optional)
 * @param {string} style - Edge style: solid|dashed|thick
 * @returns {string} - Mermaid edge definition
 */
function generateFlowchartEdge(from, to, label = '', style = 'solid') {
  const safeFrom = sanitizeId(from);
  const safeTo = sanitizeId(to);
  const safeLabel = label ? `|"${escapeLabel(label)}"|` : '';
  
  const arrows = {
    solid: '-->',
    dashed: '-.->',
    thick: '==>'
  };
  
  const arrow = arrows[style] || arrows.solid;
  return `    ${safeFrom} ${arrow}${safeLabel} ${safeTo}`;
}
```

### generateAlgorithmFlowchart (Enhanced)

Generate algorithm flowchart with branch/loop support.

```javascript
/**
 * Generate algorithm flowchart with decision support
 * 
 * @param {Object} algorithm - Algorithm definition
 *   - name: Algorithm name
 *   - inputs: [{name, type}]
 *   - outputs: [{name, type}]
 *   - steps: [{id, description, type, next: [id], conditions: [text]}]
 * @returns {string} - Complete Mermaid flowchart
 */
function generateAlgorithmFlowchart(algorithm) {
  let mermaid = 'flowchart TD\n';
  
  // Start node
  mermaid += `    START(["开始: ${escapeLabel(algorithm.name)}"])\n`;
  
  // Input node (if has inputs)
  if (algorithm.inputs?.length > 0) {
    const inputList = algorithm.inputs.map(i => `${i.name}: ${i.type}`).join(', ');
    mermaid += `    INPUT[/"输入: ${escapeLabel(inputList)}"/]\n`;
    mermaid += `    START --> INPUT\n`;
  }
  
  // Process nodes
  const steps = algorithm.steps || [];
  for (const step of steps) {
    const nodeId = sanitizeId(step.id || `STEP_${step.step_num}`);
    
    if (step.type === 'decision') {
      mermaid += `    ${nodeId}{"${escapeLabel(step.description)}"}\n`;
    } else if (step.type === 'io') {
      mermaid += `    ${nodeId}[/"${escapeLabel(step.description)}"/]\n`;
    } else if (step.type === 'loop_start') {
      mermaid += `    ${nodeId}[["循环: ${escapeLabel(step.description)}"]]\n`;
    } else {
      mermaid += `    ${nodeId}["${escapeLabel(step.description)}"]\n`;
    }
  }
  
  // Output node
  const outputDesc = algorithm.outputs?.map(o => o.name).join(', ') || '结果';
  mermaid += `    OUTPUT[/"输出: ${escapeLabel(outputDesc)}"/]\n`;
  mermaid += `    END_(["结束"])\n`;
  
  // Connect first step to input/start
  if (steps.length > 0) {
    const firstStep = sanitizeId(steps[0].id || 'STEP_1');
    if (algorithm.inputs?.length > 0) {
      mermaid += `    INPUT --> ${firstStep}\n`;
    } else {
      mermaid += `    START --> ${firstStep}\n`;
    }
  }
  
  // Connect steps based on next array
  for (const step of steps) {
    const nodeId = sanitizeId(step.id || `STEP_${step.step_num}`);
    
    if (step.next && step.next.length > 0) {
      step.next.forEach((nextId, index) => {
        const safeNextId = sanitizeId(nextId);
        const condition = step.conditions?.[index];
        
        if (condition) {
          mermaid += `    ${nodeId} -->|"${escapeLabel(condition)}"| ${safeNextId}\n`;
        } else {
          mermaid += `    ${nodeId} --> ${safeNextId}\n`;
        }
      });
    } else if (!step.type?.includes('end')) {
      // Default: connect to next step or output
      const stepIndex = steps.indexOf(step);
      if (stepIndex < steps.length - 1) {
        const nextStep = sanitizeId(steps[stepIndex + 1].id || `STEP_${stepIndex + 2}`);
        mermaid += `    ${nodeId} --> ${nextStep}\n`;
      } else {
        mermaid += `    ${nodeId} --> OUTPUT\n`;
      }
    }
  }
  
  // Connect output to end
  mermaid += `    OUTPUT --> END_\n`;
  
  return mermaid;
}
```

## Diagram Validation

### validateMermaidSyntax

Comprehensive Mermaid syntax validation.

```javascript
/**
 * Validate Mermaid diagram syntax
 * 
 * @param {string} content - Mermaid diagram content
 * @returns {Object} - {valid: boolean, issues: string[]}
 */
function validateMermaidSyntax(content) {
  const issues = [];
  
  // Check 1: Diagram type declaration
  if (!content.match(/^(graph|flowchart|classDiagram|sequenceDiagram|stateDiagram|erDiagram|gantt|pie|mindmap)/m)) {
    issues.push('Missing diagram type declaration');
  }
  
  // Check 2: Undefined values
  if (content.includes('undefined') || content.includes('null')) {
    issues.push('Contains undefined/null values');
  }
  
  // Check 3: Invalid arrow syntax
  if (content.match(/-->\s*-->/)) {
    issues.push('Double arrow syntax error');
  }
  
  // Check 4: Unescaped special characters in labels
  const labelMatches = content.match(/\["[^"]*[(){}[\]<>][^"]*"\]/g);
  if (labelMatches?.some(m => !m.includes('#'))) {
    issues.push('Unescaped special characters in labels');
  }
  
  // Check 5: Node ID starts with number
  if (content.match(/\n\s*[0-9][a-zA-Z0-9_]*[\[\({]/)) {
    issues.push('Node ID cannot start with number');
  }
  
  // Check 6: Nested subgraph syntax error
  if (content.match(/subgraph\s+\S+\s*\n[^e]*subgraph/)) {
    // This is actually valid, only flag if brackets don't match
    const subgraphCount = (content.match(/subgraph/g) || []).length;
    const endCount = (content.match(/\bend\b/g) || []).length;
    if (subgraphCount > endCount) {
      issues.push('Unbalanced subgraph/end blocks');
    }
  }
  
  // Check 7: Invalid arrow type for diagram type
  const diagramType = content.match(/^(graph|flowchart|classDiagram|sequenceDiagram)/m)?.[1];
  if (diagramType === 'classDiagram' && content.includes('-->|')) {
    issues.push('Invalid edge label syntax for classDiagram');
  }
  
  // Check 8: Empty node labels
  if (content.match(/\[""\]|\{\}|\(\)/)) {
    issues.push('Empty node labels detected');
  }
  
  // Check 9: Reserved keywords as IDs
  const reserved = ['end', 'graph', 'subgraph', 'direction', 'class', 'click'];
  for (const keyword of reserved) {
    const pattern = new RegExp(`\\n\\s*${keyword}\\s*[\\[\\(\\{]`, 'i');
    if (content.match(pattern)) {
      issues.push(`Reserved keyword "${keyword}" used as node ID`);
    }
  }
  
  // Check 10: Line length (Mermaid has issues with very long lines)
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].length > 500) {
      issues.push(`Line ${i + 1} exceeds 500 characters`);
    }
  }
  
  return {
    valid: issues.length === 0,
    issues
  };
}
```

### validateDiagramDirectory

Validate all diagrams in a directory.

```javascript
/**
 * Validate all Mermaid diagrams in directory
 * 
 * @param {string} diagramDir - Path to diagrams directory
 * @returns {Object[]} - Array of {file, valid, issues}
 */
function validateDiagramDirectory(diagramDir) {
  const files = Glob(`${diagramDir}/*.mmd`);
  const results = [];

  for (const file of files) {
    const content = Read(file);
    const validation = validateMermaidSyntax(content);
    
    results.push({
      file: file.split('/').pop(),
      path: file,
      valid: validation.valid,
      issues: validation.issues,
      lines: content.split('\n').length
    });
  }

  return results;
}
```

## Class Diagram Utilities

### generateClassDiagram

Generate class diagram with relationships.

```javascript
/**
 * Generate class diagram from analysis data
 * 
 * @param {Object} analysis - Data structure analysis
 *   - entities: [{name, type, properties, methods}]
 *   - relationships: [{from, to, type, label}]
 * @param {Object} options - Generation options
 *   - maxClasses: Max classes to include (default: 15)
 *   - maxProperties: Max properties per class (default: 8)
 *   - maxMethods: Max methods per class (default: 6)
 * @returns {string} - Mermaid classDiagram
 */
function generateClassDiagram(analysis, options = {}) {
  const maxClasses = options.maxClasses || 15;
  const maxProperties = options.maxProperties || 8;
  const maxMethods = options.maxMethods || 6;
  
  let mermaid = 'classDiagram\n';

  const entities = (analysis.entities || []).slice(0, maxClasses);
  
  // Generate classes
  for (const entity of entities) {
    const className = sanitizeId(entity.name);
    mermaid += `    class ${className} {\n`;

    // Properties
    for (const prop of (entity.properties || []).slice(0, maxProperties)) {
      const vis = {public: '+', private: '-', protected: '#'}[prop.visibility] || '+';
      const type = sanitizeType(prop.type);
      mermaid += `        ${vis}${type} ${prop.name}\n`;
    }

    // Methods
    for (const method of (entity.methods || []).slice(0, maxMethods)) {
      const vis = {public: '+', private: '-', protected: '#'}[method.visibility] || '+';
      const params = (method.params || []).map(p => p.name).join(', ');
      const returnType = sanitizeType(method.returnType || 'void');
      mermaid += `        ${vis}${method.name}(${params}) ${returnType}\n`;
    }

    mermaid += '    }\n';
    
    // Add stereotype if applicable
    if (entity.type === 'interface') {
      mermaid += `    <<interface>> ${className}\n`;
    } else if (entity.type === 'abstract') {
      mermaid += `    <<abstract>> ${className}\n`;
    }
  }

  // Generate relationships
  const arrows = {
    inheritance: '--|>',
    implementation: '..|>',
    composition: '*--',
    aggregation: 'o--',
    association: '-->',
    dependency: '..>'
  };

  for (const rel of (analysis.relationships || [])) {
    const from = sanitizeId(rel.from);
    const to = sanitizeId(rel.to);
    const arrow = arrows[rel.type] || '-->';
    const label = rel.label ? ` : ${escapeLabel(rel.label)}` : '';
    
    // Only include if both entities exist
    if (entities.some(e => sanitizeId(e.name) === from) && 
        entities.some(e => sanitizeId(e.name) === to)) {
      mermaid += `    ${from} ${arrow} ${to}${label}\n`;
    }
  }

  return mermaid;
}
```

## Sequence Diagram Utilities

### generateSequenceDiagram

Generate sequence diagram from scenario.

```javascript
/**
 * Generate sequence diagram from scenario
 * 
 * @param {Object} scenario - Sequence scenario
 *   - name: Scenario name
 *   - actors: [{id, name, type}]
 *   - messages: [{from, to, description, type}]
 *   - blocks: [{type, condition, messages}]
 * @returns {string} - Mermaid sequenceDiagram
 */
function generateSequenceDiagram(scenario) {
  let mermaid = 'sequenceDiagram\n';

  // Title
  if (scenario.name) {
    mermaid += `    title ${escapeLabel(scenario.name)}\n`;
  }

  // Participants
  for (const actor of scenario.actors || []) {
    const actorType = actor.type === 'external' ? 'actor' : 'participant';
    mermaid += `    ${actorType} ${sanitizeId(actor.id)} as ${escapeLabel(actor.name)}\n`;
  }

  mermaid += '\n';

  // Messages
  for (const msg of scenario.messages || []) {
    const from = sanitizeId(msg.from);
    const to = sanitizeId(msg.to);
    const desc = escapeLabel(msg.description);
    
    let arrow;
    switch (msg.type) {
      case 'async': arrow = '->>'; break;
      case 'response': arrow = '-->>'; break;
      case 'create': arrow = '->>+'; break;
      case 'destroy': arrow = '->>-'; break;
      case 'self': arrow = '->>'; break;
      default: arrow = '->>';
    }

    mermaid += `    ${from}${arrow}${to}: ${desc}\n`;

    // Activation
    if (msg.activate) {
      mermaid += `    activate ${to}\n`;
    }
    if (msg.deactivate) {
      mermaid += `    deactivate ${from}\n`;
    }

    // Notes
    if (msg.note) {
      mermaid += `    Note over ${to}: ${escapeLabel(msg.note)}\n`;
    }
  }

  // Blocks (loops, alt, opt)
  for (const block of scenario.blocks || []) {
    switch (block.type) {
      case 'loop':
        mermaid += `    loop ${escapeLabel(block.condition)}\n`;
        break;
      case 'alt':
        mermaid += `    alt ${escapeLabel(block.condition)}\n`;
        break;
      case 'opt':
        mermaid += `    opt ${escapeLabel(block.condition)}\n`;
        break;
    }
    
    for (const m of block.messages || []) {
      mermaid += `        ${sanitizeId(m.from)}->>${sanitizeId(m.to)}: ${escapeLabel(m.description)}\n`;
    }
    
    mermaid += '    end\n';
  }

  return mermaid;
}
```

## Usage Examples

### Example 1: Algorithm with Branches

```javascript
const algorithm = {
  name: "用户认证流程",
  inputs: [{name: "credentials", type: "Object"}],
  outputs: [{name: "token", type: "JWT"}],
  steps: [
    {id: "validate", description: "验证输入格式", type: "process"},
    {id: "check_user", description: "用户是否存在?", type: "decision", 
     next: ["verify_pwd", "error_user"], conditions: ["是", "否"]},
    {id: "verify_pwd", description: "验证密码", type: "process"},
    {id: "pwd_ok", description: "密码正确?", type: "decision",
     next: ["gen_token", "error_pwd"], conditions: ["是", "否"]},
    {id: "gen_token", description: "生成 JWT Token", type: "process"},
    {id: "error_user", description: "返回用户不存在", type: "io"},
    {id: "error_pwd", description: "返回密码错误", type: "io"}
  ]
};

const flowchart = generateAlgorithmFlowchart(algorithm);
```

### Example 2: Validate Before Output

```javascript
const diagram = generateClassDiagram(analysis);
const validation = validateMermaidSyntax(diagram);

if (!validation.valid) {
  console.log("Diagram has issues:", validation.issues);
  // Fix issues or regenerate
} else {
  Write(`${outputDir}/class-diagram.mmd`, diagram);
}
```
