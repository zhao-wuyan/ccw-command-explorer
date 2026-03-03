#!/usr/bin/env node
/**
 * Real-time scan commands from .claude and .codex directories
 * Generates command.json with claude/codex differentiation
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.join(__dirname, '..');
const OUTPUT_FILE = path.join(PROJECT_ROOT, 'public', 'commands-scanned.json');

// Parse frontmatter from markdown content
function parseFrontmatter(content) {
  const frontmatter = {};
  if (content.startsWith('---')) {
    const lines = content.split('\n');
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim() === '---') break;
      if (line.includes(':')) {
        const colonIndex = line.indexOf(':');
        const key = line.slice(0, colonIndex).trim();
        const value = line.slice(colonIndex + 1).trim().replace(/^"|"$/g, '');
        frontmatter[key] = value;
      }
    }
  }
  return frontmatter;
}

// Extract H1 description - the content after # Title until next heading or blank line
function extractH1Description(content) {
  // Remove frontmatter if exists
  let body = content;
  if (content.startsWith('---')) {
    const endIdx = content.indexOf('---', 3);
    if (endIdx !== -1) {
      body = content.slice(endIdx + 3).trim();
    }
  }

  const lines = body.split('\n');
  let foundH1 = false;
  const descriptionParts = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    // Found H1 line
    if (!foundH1 && trimmed.startsWith('# ') && trimmed.length > 2) {
      foundH1 = true;
      continue;
    }

    // Collect content after H1 until we hit another heading or blank line
    if (foundH1) {
      // Stop at next heading, separator, or empty line after content
      if (trimmed.startsWith('#') || trimmed.startsWith('---') || trimmed.startsWith('```')) {
        break;
      }

      if (trimmed === '') {
        // If we already have content, stop at empty line
        if (descriptionParts.length > 0) break;
        // Otherwise skip leading empty lines
        continue;
      }

      descriptionParts.push(trimmed);
    }
  }

  return descriptionParts.join(' ').trim();
}

// Scan directory for markdown files
function scanDirectory(dir, pattern = '**/*.md') {
  const results = [];

  function walk(currentDir) {
    if (!fs.existsSync(currentDir)) return;

    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name.endsWith('.md')) {
        results.push(fullPath);
      }
    }
  }

  walk(dir);
  return results;
}

// Determine category from file path
function determineCategory(filePath, baseDir) {
  const relative = path.relative(baseDir, filePath);
  const parts = relative.split(path.sep);

  if (parts.length >= 2) {
    return parts[0].toLowerCase();
  }
  return 'general';
}

// Determine usage scenario from description and category
function determineUsageScenario(name, description, category) {
  const nameLower = name.toLowerCase();
  const descLower = (description || '').toLowerCase();
  const text = nameLower + ' ' + descLower;

  if (/plan|design|breakdown|brainstorm|roadmap/.test(text)) return 'planning';
  if (/implement|execute|generate|create|write|build/.test(text)) return 'implementation';
  if (/test|tdd|verify|coverage/.test(text)) return 'testing';
  if (/docs|documentation|memory|compact/.test(text)) return 'documentation';
  if (/session|resume|status|complete/.test(text)) return 'session-management';
  if (/analyze|review|diagnosis|discover/.test(text)) return 'analysis';
  if (/debug|fix|troubleshoot/.test(text)) return 'debugging';
  if (/issue|bug|problem/.test(text)) return 'issue-management';

  return 'general';
}

// Determine difficulty level
function determineDifficulty(name, description, category) {
  const nameLower = name.toLowerCase();
  const descLower = (description || '').toLowerCase();
  const text = nameLower + ' ' + descLower;

  const beginnerKeywords = ['status', 'list', 'chat', 'analyze', 'version', 'simple', 'basic'];
  if (beginnerKeywords.some(k => text.includes(k))) return 'Beginner';

  const advancedKeywords = ['tdd', 'conflict', 'agent', 'auto-parallel', 'coverage', 'synthesis', 'complex'];
  if (advancedKeywords.some(k => text.includes(k))) return 'Advanced';

  return 'Intermediate';
}

// Build command name from path
function buildCommandName(name, category, subcategory, cli) {
  // Handle names that already have colons
  if (name.includes(':')) {
    return `/${name}`;
  }

  // General commands without category prefix
  if (category === 'general') {
    return `/${name}`;
  }

  // Subcategory exists
  if (subcategory && subcategory !== '_root') {
    return `/${category}:${subcategory}:${name}`;
  }

  return `/${category}:${name}`;
}

// Scan Claude commands
function scanClaudeCommands() {
  const commands = [];
  const commandsDir = path.join(PROJECT_ROOT, '.claude', 'commands');
  const files = scanDirectory(commandsDir);

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const frontmatter = parseFrontmatter(content);

    if (!frontmatter.name) continue;

    const category = determineCategory(file, commandsDir);
    const relativePath = path.relative(path.join(PROJECT_ROOT, '.claude'), file);
    const rawSubcategory = path.dirname(relativePath).split(path.sep).slice(1).join('/') || null;
    const subcategory = rawSubcategory !== category ? rawSubcategory : null;
    const h1Desc = extractH1Description(content);

    commands.push({
      name: frontmatter.name,
      command: buildCommandName(frontmatter.name, category, subcategory, 'claude'),
      description: frontmatter.description || '',
      h1_description: h1Desc,
      arguments: frontmatter['argument-hint'] || frontmatter.arguments || '',
      category,
      subcategory,
      usage_scenario: determineUsageScenario(frontmatter.name, frontmatter.description, category),
      difficulty: determineDifficulty(frontmatter.name, frontmatter.description, category),
      cli: 'claude',
      source: `.claude/${relativePath.replace(/\\/g, '/')}`,
      allowed_tools: frontmatter['allowed-tools'] || ''
    });
  }

  return commands;
}

// Scan Claude skills
function scanClaudeSkills() {
  const commands = [];
  const skillsDir = path.join(PROJECT_ROOT, '.claude', 'skills');

  if (!fs.existsSync(skillsDir)) return commands;

  const entries = fs.readdirSync(skillsDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const skillMdPath = path.join(skillsDir, entry.name, 'SKILL.md');
    if (!fs.existsSync(skillMdPath)) continue;

    const content = fs.readFileSync(skillMdPath, 'utf-8');
    const frontmatter = parseFrontmatter(content);

    if (!frontmatter.name) continue;

    const h1Desc = extractH1Description(content);

    commands.push({
      name: frontmatter.name,
      command: `/${frontmatter.name}`,
      description: frontmatter.description || '',
      h1_description: h1Desc,
      arguments: frontmatter['argument-hint'] || frontmatter.arguments || '',
      category: 'skill',
      subcategory: null,
      usage_scenario: determineUsageScenario(frontmatter.name, frontmatter.description, 'skill'),
      difficulty: determineDifficulty(frontmatter.name, frontmatter.description, 'skill'),
      cli: 'claude',
      source: `.claude/skills/${entry.name}/SKILL.md`,
      allowed_tools: frontmatter['allowed-tools'] || ''
    });
  }

  return commands;
}

// Scan Codex prompts
function scanCodexPrompts() {
  const commands = [];
  const promptsDir = path.join(PROJECT_ROOT, '.codex', 'prompts');

  if (!fs.existsSync(promptsDir)) return commands;

  const files = fs.readdirSync(promptsDir)
    .filter(f => f.endsWith('.md'))
    .map(f => path.join(promptsDir, f));

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const frontmatter = parseFrontmatter(content);

    const name = path.basename(file, '.md');
    const h1Desc = extractH1Description(content);

    commands.push({
      name,
      command: `/codex:${name}`,
      description: frontmatter.description || '',
      h1_description: h1Desc,
      arguments: frontmatter['argument-hint'] || frontmatter.arguments || '',
      category: 'prompt',
      subcategory: null,
      usage_scenario: determineUsageScenario(name, frontmatter.description, 'prompt'),
      difficulty: determineDifficulty(name, frontmatter.description, 'prompt'),
      cli: 'codex',
      source: `.codex/prompts/${path.basename(file)}`,
      allowed_tools: frontmatter['allowed-tools'] || ''
    });
  }

  return commands;
}

// Scan Codex skills
function scanCodexSkills() {
  const commands = [];
  const skillsDir = path.join(PROJECT_ROOT, '.codex', 'skills');

  if (!fs.existsSync(skillsDir)) return commands;

  const entries = fs.readdirSync(skillsDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const skillMdPath = path.join(skillsDir, entry.name, 'SKILL.md');
    if (!fs.existsSync(skillMdPath)) continue;

    const content = fs.readFileSync(skillMdPath, 'utf-8');
    const frontmatter = parseFrontmatter(content);

    const name = frontmatter.name || entry.name;
    const h1Desc = extractH1Description(content);

    commands.push({
      name,
      command: `/${name}`,
      description: frontmatter.description || '',
      h1_description: h1Desc,
      arguments: frontmatter['argument-hint'] || frontmatter.arguments || '',
      category: 'skill',
      subcategory: 'codex',
      usage_scenario: determineUsageScenario(name, frontmatter.description, 'skill'),
      difficulty: determineDifficulty(name, frontmatter.description, 'skill'),
      cli: 'codex',
      source: `.codex/skills/${entry.name}/SKILL.md`,
      allowed_tools: frontmatter['allowed-tools'] || ''
    });
  }

  return commands;
}

// Build command relationships
function buildCommandRelationships(commands) {
  const relationships = {};

  for (const cmd of commands) {
    const name = cmd.name;
    const rel = {
      prerequisites: [],
      next_steps: [],
      alternatives: [],
      related: []
    };

    // Infer relationships from description
    const desc = (cmd.description || '').toLowerCase();

    if (desc.includes('prerequisite') || desc.includes('requires')) {
      // Try to extract mentioned commands
      const matches = desc.match(/\/[a-z-:]+/g);
      if (matches) {
        rel.prerequisites = matches.filter(m => m !== cmd.command);
      }
    }

    if (desc.includes('next') || desc.includes('followed by') || desc.includes('then')) {
      const matches = desc.match(/\/[a-z-:]+/g);
      if (matches) {
        rel.next_steps = matches.filter(m => m !== cmd.command);
      }
    }

    // Add relationship if any found
    if (rel.prerequisites.length || rel.next_steps.length || rel.alternatives.length || rel.related.length) {
      relationships[name] = rel;
    }
  }

  return relationships;
}

// Main function
function main() {
  console.log('=== Scanning Commands from .claude and .codex ===\n');

  // Scan all sources
  const claudeCommands = scanClaudeCommands();
  console.log(`✓ Scanned .claude/commands: ${claudeCommands.length} commands`);

  const claudeSkills = scanClaudeSkills();
  console.log(`✓ Scanned .claude/skills: ${claudeSkills.length} skills`);

  const codexPrompts = scanCodexPrompts();
  console.log(`✓ Scanned .codex/prompts: ${codexPrompts.length} prompts`);

  const codexSkills = scanCodexSkills();
  console.log(`✓ Scanned .codex/skills: ${codexSkills.length} skills`);

  // Combine all commands
  const allCommands = [
    ...claudeCommands,
    ...claudeSkills,
    ...codexPrompts,
    ...codexSkills
  ];

  // Sort by name
  allCommands.sort((a, b) => a.name.localeCompare(b.name));

  // Build output
  const output = {
    _metadata: {
      version: '4.0.0',
      generated: new Date().toISOString(),
      total_commands: allCommands.length,
      sources: {
        claude_commands: claudeCommands.length,
        claude_skills: claudeSkills.length,
        codex_prompts: codexPrompts.length,
        codex_skills: codexSkills.length
      }
    },
    commands: allCommands,
    categories: [...new Set(allCommands.map(c => c.category))].sort(),
    clis: ['claude', 'codex'],
    relationships: buildCommandRelationships(allCommands)
  };

  // Ensure output directory exists
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write output
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf-8');

  console.log(`\n=== Build Complete ===`);
  console.log(`Output: ${OUTPUT_FILE}`);
  console.log(`Total Commands: ${allCommands.length}`);
  console.log(`  - Claude Commands: ${claudeCommands.length}`);
  console.log(`  - Claude Skills: ${claudeSkills.length}`);
  console.log(`  - Codex Prompts: ${codexPrompts.length}`);
  console.log(`  - Codex Skills: ${codexSkills.length}`);
  console.log(`Categories: ${output.categories.join(', ')}`);

  // Summary by CLI
  const claudeCount = allCommands.filter(c => c.cli === 'claude').length;
  const codexCount = allCommands.filter(c => c.cli === 'codex').length;
  console.log(`\nBy CLI:`);
  console.log(`  - Claude: ${claudeCount}`);
  console.log(`  - Codex: ${codexCount}`);
}

main();
