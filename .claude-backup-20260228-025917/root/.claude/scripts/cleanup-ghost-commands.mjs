#!/usr/bin/env node
/**
 * Cleanup script: Remove ghost command entries from ccw-help JSON indexes
 * and fix broken slash command references in skill/command .md files.
 *
 * Usage: node cleanup-ghost-commands.mjs [--dry-run]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const COMMANDS_DIR = path.join(ROOT, 'commands');
const SKILLS_DIR = path.join(ROOT, 'skills');
const INDEX_DIR = path.join(SKILLS_DIR, 'ccw-help', 'index');

const DRY_RUN = process.argv.includes('--dry-run');
const log = (msg) => console.log(DRY_RUN ? `[DRY-RUN] ${msg}` : msg);

// ─── Step 1: Build set of existing command source files ───
function getExistingCommandSources() {
  const sources = new Set();
  function walk(dir, prefix = '') {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        walk(path.join(dir, entry.name), rel);
      } else if (entry.name.endsWith('.md')) {
        // Store as relative path from index dir: ../../../commands/...
        sources.add(`../../../commands/${rel}`);
      }
    }
  }
  walk(COMMANDS_DIR);
  return sources;
}

// ─── Step 2: Build mapping of old commands → new skill names ───
// These commands were migrated to skills but references were never updated
const COMMAND_TO_SKILL_MAP = {
  // workflow commands → skills
  '/workflow:plan': 'workflow-plan',
  '/workflow:execute': 'workflow-execute',
  '/workflow:lite-plan': 'workflow-lite-plan',
  '/workflow:lite-execute': 'workflow-lite-plan',  // lite-execute is part of lite-plan skill
  '/workflow:lite-fix': 'workflow-lite-plan',       // lite-fix is part of lite-plan skill
  '/workflow:multi-cli-plan': 'workflow-multi-cli-plan',
  '/workflow:plan-verify': 'workflow-plan',          // plan-verify is a phase of workflow-plan
  '/workflow:replan': 'workflow-plan',               // replan is a phase of workflow-plan
  '/workflow:tdd-plan': 'workflow-tdd',
  '/workflow:tdd-verify': 'workflow-tdd',            // tdd-verify is a phase of workflow-tdd
  '/workflow:test-fix-gen': 'workflow-test-fix',
  '/workflow:test-gen': 'workflow-test-fix',
  '/workflow:test-cycle-execute': 'workflow-test-fix',
  '/workflow:review': 'review-cycle',
  '/workflow:review-session-cycle': 'review-cycle',
  '/workflow:review-module-cycle': 'review-cycle',
  '/workflow:review-cycle-fix': 'review-cycle',
  '/workflow:status': 'workflow-execute',             // status is part of workflow-execute
  // brainstorm commands → skills
  '/workflow:brainstorm:artifacts': 'brainstorm',
  '/workflow:brainstorm:auto-parallel': 'brainstorm',
  '/workflow:brainstorm:role-analysis': 'brainstorm',
  '/workflow:brainstorm:synthesis': 'brainstorm',
  // tools commands → skill phases
  '/workflow:tools:context-gather': 'workflow-plan',
  '/workflow:tools:conflict-resolution': 'workflow-plan',
  '/workflow:tools:task-generate-agent': 'workflow-plan',
  '/workflow:tools:task-generate-tdd': 'workflow-tdd',
  '/workflow:tools:tdd-coverage-analysis': 'workflow-tdd',
  '/workflow:tools:test-concept-enhanced': 'workflow-test-fix',
  '/workflow:tools:test-context-gather': 'workflow-test-fix',
  '/workflow:tools:test-task-generate': 'workflow-test-fix',
  // memory commands → skills
  '/memory:compact': 'memory-capture',
  '/memory:tips': 'memory-capture',
  '/memory:load': 'memory-manage',
  '/memory:docs': 'memory-manage',
  '/memory:docs-full-cli': 'memory-manage',
  '/memory:docs-related-cli': 'memory-manage',
  '/memory:update-full': 'memory-manage',
  '/memory:update-related': 'memory-manage',
  // general commands
  '/ccw-debug': null,  // deleted, no replacement
  '/ccw view': null,   // deleted, no replacement
  '/workflow:lite-lite-lite': 'workflow-lite-plan',
  // ui-design (these still exist as commands)
  '/workflow:ui-design:auto': '/workflow:ui-design:explore-auto',
  '/workflow:ui-design:update': '/workflow:ui-design:generate',
};

// ─── Step 3: Clean JSON index files ───
function cleanAllCommandsJson(existingSources) {
  const filePath = path.join(INDEX_DIR, 'all-commands.json');
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const before = data.length;

  const cleaned = data.filter(entry => {
    const exists = existingSources.has(entry.source);
    if (!exists) {
      log(`  REMOVE from all-commands.json: ${entry.command} (source: ${entry.source})`);
    }
    return exists;
  });

  const removed = before - cleaned.length;
  if (removed > 0) {
    if (!DRY_RUN) fs.writeFileSync(filePath, JSON.stringify(cleaned, null, 2) + '\n');
    log(`  all-commands.json: removed ${removed} ghost entries (${before} → ${cleaned.length})`);
  } else {
    log(`  all-commands.json: no ghost entries found`);
  }
  return removed;
}

function cleanEssentialCommandsJson(existingSources) {
  const filePath = path.join(INDEX_DIR, 'essential-commands.json');
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const before = data.length;

  const cleaned = data.filter(entry => {
    const exists = existingSources.has(entry.source);
    if (!exists) {
      log(`  REMOVE from essential-commands.json: ${entry.command} (source: ${entry.source})`);
    }
    return exists;
  });

  const removed = before - cleaned.length;
  if (removed > 0) {
    if (!DRY_RUN) fs.writeFileSync(filePath, JSON.stringify(cleaned, null, 2) + '\n');
    log(`  essential-commands.json: removed ${removed} ghost entries`);
  }
  return removed;
}

function cleanByCategoryJson(existingSources) {
  const filePath = path.join(INDEX_DIR, 'by-category.json');
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  let totalRemoved = 0;

  for (const [category, subcats] of Object.entries(data)) {
    for (const [subcat, entries] of Object.entries(subcats)) {
      if (!Array.isArray(entries)) continue;
      const before = entries.length;
      const cleaned = entries.filter(entry => {
        const exists = existingSources.has(entry.source);
        if (!exists) {
          log(`  REMOVE from by-category.json[${category}][${subcat}]: ${entry.command}`);
        }
        return exists;
      });
      if (cleaned.length < before) {
        subcats[subcat] = cleaned;
        totalRemoved += before - cleaned.length;
      }
      // Remove empty subcategory arrays
      if (cleaned.length === 0) {
        delete subcats[subcat];
      }
    }
    // Remove empty categories
    if (Object.keys(subcats).length === 0) {
      delete data[category];
    }
  }

  if (totalRemoved > 0) {
    if (!DRY_RUN) fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
    log(`  by-category.json: removed ${totalRemoved} ghost entries`);
  }
  return totalRemoved;
}

function cleanByUseCaseJson(existingSources) {
  const filePath = path.join(INDEX_DIR, 'by-use-case.json');
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  let totalRemoved = 0;

  for (const [useCase, entries] of Object.entries(data)) {
    if (!Array.isArray(entries)) continue;
    const before = entries.length;
    const cleaned = entries.filter(entry => {
      const exists = existingSources.has(entry.source);
      if (!exists) {
        log(`  REMOVE from by-use-case.json[${useCase}]: ${entry.command}`);
      }
      return exists;
    });
    if (cleaned.length < before) {
      data[useCase] = cleaned;
      totalRemoved += before - cleaned.length;
    }
    if (cleaned.length === 0) {
      delete data[useCase];
    }
  }

  if (totalRemoved > 0) {
    if (!DRY_RUN) fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
    log(`  by-use-case.json: removed ${totalRemoved} ghost entries`);
  }
  return totalRemoved;
}

function cleanCommandRelationshipsJson(existingSources) {
  const filePath = path.join(INDEX_DIR, 'command-relationships.json');
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  // Build set of existing command names (without leading /)
  // From source paths like ../../../commands/workflow/session/start.md → workflow:session:start
  const existingCommands = new Set();
  for (const src of existingSources) {
    // ../../../commands/workflow/session/start.md → workflow/session/start
    const rel = src.replace('../../../commands/', '').replace('.md', '');
    // workflow/session/start → workflow:session:start
    const cmd = rel.replace(/\//g, ':');
    existingCommands.add(cmd);
  }
  // Also add skill names as valid targets
  if (fs.existsSync(SKILLS_DIR)) {
    for (const entry of fs.readdirSync(SKILLS_DIR, { withFileTypes: true })) {
      if (entry.isDirectory()) existingCommands.add(entry.name);
    }
  }

  // Remove top-level keys that reference non-existent commands
  const keysToRemove = [];
  for (const key of Object.keys(data)) {
    if (!existingCommands.has(key)) {
      keysToRemove.push(key);
    }
  }

  // Also clean internal references
  for (const [key, relations] of Object.entries(data)) {
    for (const [relType, refs] of Object.entries(relations)) {
      if (Array.isArray(refs)) {
        const cleaned = refs.filter(ref => existingCommands.has(ref));
        if (cleaned.length < refs.length) {
          log(`  CLEAN command-relationships.json[${key}][${relType}]: removed ${refs.length - cleaned.length} dead refs`);
          relations[relType] = cleaned;
        }
      }
    }
  }

  for (const key of keysToRemove) {
    log(`  REMOVE command-relationships.json key: ${key}`);
    delete data[key];
  }

  if (keysToRemove.length > 0) {
    if (!DRY_RUN) fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
    log(`  command-relationships.json: removed ${keysToRemove.length} ghost keys`);
  }
  return keysToRemove.length;
}

// ─── Step 4: Fix broken references in .md files ───
function findMdFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  function walk(d) {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) {
        // Skip _shared, index dirs
        if (entry.name === 'node_modules' || entry.name === 'index') continue;
        walk(full);
      } else if (entry.name.endsWith('.md')) {
        results.push(full);
      }
    }
  }
  walk(dir);
  return results;
}

function fixBrokenReferences() {
  const mdFiles = [
    ...findMdFiles(COMMANDS_DIR),
    ...findMdFiles(SKILLS_DIR),
  ];

  let totalFixes = 0;
  const fixLog = [];

  for (const filePath of mdFiles) {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    const relPath = path.relative(ROOT, filePath);

    // Fix Skill() invocations with wrong skill names
    // e.g., Skill(skill="compact" → Skill(skill="memory-capture"
    const skillCallFixes = {
      'skill="compact"': 'skill="memory-capture"',
      "skill='compact'": "skill='memory-capture'",
      'skill="workflow:brainstorm:role-analysis"': 'skill="brainstorm"',
      "skill='workflow:brainstorm:role-analysis'": "skill='brainstorm'",
      'skill="workflow:lite-execute"': 'skill="workflow-lite-plan"',
      "skill='workflow:lite-execute'": "skill='workflow-lite-plan'",
    };

    for (const [oldCall, newCall] of Object.entries(skillCallFixes)) {
      if (content.includes(oldCall)) {
        content = content.replaceAll(oldCall, newCall);
        modified = true;
        fixLog.push(`  ${relPath}: ${oldCall} → ${newCall}`);
        totalFixes++;
      }
    }

    // Fix backtick-quoted slash command references in prose
    // Pattern: `/ command:name` references that point to non-existent commands
    // These are documentation references - update to point to skill names
    const proseRefFixes = {
      '`/workflow:plan`': '`workflow-plan` skill',
      '`/workflow:execute`': '`workflow-execute` skill',
      '`/workflow:lite-execute`': '`workflow-lite-plan` skill',
      '`/workflow:lite-fix`': '`workflow-lite-plan` skill',
      '`/workflow:plan-verify`': '`workflow-plan` skill (plan-verify phase)',
      '`/workflow:replan`': '`workflow-plan` skill (replan phase)',
      '`/workflow:tdd-plan`': '`workflow-tdd` skill',
      '`/workflow:tdd-verify`': '`workflow-tdd` skill (tdd-verify phase)',
      '`/workflow:test-fix-gen`': '`workflow-test-fix` skill',
      '`/workflow:test-gen`': '`workflow-test-fix` skill',
      '`/workflow:test-cycle-execute`': '`workflow-test-fix` skill',
      '`/workflow:review`': '`review-cycle` skill',
      '`/workflow:review-session-cycle`': '`review-cycle` skill',
      '`/workflow:review-module-cycle`': '`review-cycle` skill',
      '`/workflow:review-cycle-fix`': '`review-cycle` skill (fix phase)',
      '`/workflow:status`': '`workflow-execute` skill',
      '`/workflow:brainstorm:artifacts`': '`brainstorm` skill',
      '`/workflow:brainstorm:synthesis`': '`brainstorm` skill',
      '`/workflow:brainstorm:role-analysis`': '`brainstorm` skill',
      '`/memory:compact`': '`memory-capture` skill',
      '`/memory:docs`': '`memory-manage` skill',
      '`/compact`': '`memory-capture` skill',
      '`/workflow:tools:context-gather`': '`workflow-plan` skill (context-gather phase)',
      '`/workflow:tools:concept-enhanced`': '`workflow-test-fix` skill (concept-enhanced phase)',
      '`/workflow:tools:task-generate`': '`workflow-plan` skill (task-generate phase)',
      '`/workflow:ui-design:auto`': '`/workflow:ui-design:explore-auto`',
      '`/workflow:ui-design:update`': '`/workflow:ui-design:generate`',
      '`/workflow:multi-cli-plan`': '`workflow-multi-cli-plan` skill',
      '`/workflow:lite-plan`': '`workflow-lite-plan` skill',
      '`/cli:plan`': '`workflow-lite-plan` skill',
      '`/test-cycle-execute`': '`workflow-test-fix` skill',
    };

    for (const [oldRef, newRef] of Object.entries(proseRefFixes)) {
      if (content.includes(oldRef)) {
        content = content.replaceAll(oldRef, newRef);
        modified = true;
        fixLog.push(`  ${relPath}: ${oldRef} → ${newRef}`);
        totalFixes++;
      }
    }

    if (modified && !DRY_RUN) {
      fs.writeFileSync(filePath, content);
    }
  }

  for (const entry of fixLog) {
    log(entry);
  }
  return totalFixes;
}

// ─── Main ───
console.log('=== CCW Ghost Command Cleanup ===');
console.log(`Root: ${ROOT}`);
console.log(`Mode: ${DRY_RUN ? 'DRY-RUN (no files modified)' : 'LIVE'}\n`);

// Step 1
console.log('Step 1: Scanning existing command files...');
const existingSources = getExistingCommandSources();
console.log(`  Found ${existingSources.size} existing command files\n`);

// Step 2
console.log('Step 2: Cleaning JSON index files...');
let totalJsonRemoved = 0;
totalJsonRemoved += cleanAllCommandsJson(existingSources);
totalJsonRemoved += cleanEssentialCommandsJson(existingSources);
totalJsonRemoved += cleanByCategoryJson(existingSources);
totalJsonRemoved += cleanByUseCaseJson(existingSources);
totalJsonRemoved += cleanCommandRelationshipsJson(existingSources);
console.log(`\n  Total JSON ghost entries removed: ${totalJsonRemoved}\n`);

// Step 3
console.log('Step 3: Fixing broken references in .md files...');
const totalMdFixes = fixBrokenReferences();
console.log(`\n  Total .md reference fixes: ${totalMdFixes}\n`);

console.log('=== Done ===');
console.log(`Summary: ${totalJsonRemoved} JSON ghost entries, ${totalMdFixes} .md reference fixes`);
if (DRY_RUN) console.log('(No files were modified - run without --dry-run to apply changes)');
