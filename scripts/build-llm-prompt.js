#!/usr/bin/env node
/**
 * Build LLM prompt from scanned commands (token-optimized version)
 * Generates a consolidated prompt file for LLM recommendation system
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.join(__dirname, '..');
const SCANNED_FILE = path.join(PROJECT_ROOT, 'public', 'commands-scanned.json');
const CCW_HELP_DIR = path.join(PROJECT_ROOT, '.claude', 'skills', 'ccw-help');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'public');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'llm-prompt.txt');

function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (e) {
    return null;
  }
}

function readJsonFile(filePath) {
  const content = readFile(filePath);
  if (!content) return null;
  try {
    return JSON.parse(content);
  } catch (e) {
    return null;
  }
}

// Extract only essential content from SKILL.md
function extractSkillEssentials(content) {
  const lines = content.split('\n');
  const essentials = [];
  let inFrontmatter = false;
  let frontmatterDone = false;

  for (const line of lines) {
    // Skip frontmatter markers
    if (line.trim() === '---') {
      inFrontmatter = !inFrontmatter;
      if (!inFrontmatter) frontmatterDone = true;
      continue;
    }

    // Skip frontmatter content (already have name/description from JSON)
    if (inFrontmatter) continue;

    // Skip empty lines at start
    if (!frontmatterDone && line.trim() === '') continue;

    // Keep headings, list items, and important content
    if (line.match(/^#{1,3}\s/)) {
      essentials.push(line.replace(/\s+/g, ' ').trim());
    } else if (line.match(/^[-*]\s/)) {
      essentials.push(line.replace(/\s+/g, ' ').trim());
    } else if (line.includes('Triggers')) {
      essentials.push(line.replace(/\s+/g, ' ').trim());
    }
  }

  return essentials.join('\n');
}

function buildPrompt() {
  console.log('=== Building Token-Optimized LLM Prompt ===\n');

  const sections = [];
  let totalTokens = 0;

  // 1. Minimal skill documentation
  const skillMdPath = path.join(CCW_HELP_DIR, 'SKILL.md');
  const skillContent = readFile(skillMdPath);
  if (skillContent) {
    const essentials = extractSkillEssentials(skillContent);
    sections.push(`#CCW\n${essentials}`);
    totalTokens += essentials.length / 4;
    console.log('✓ Skill doc');
  }

  // 2. Commands in compact format
  const scannedData = readJsonFile(SCANNED_FILE);
  if (scannedData) {
    const { commands, clis } = scannedData;

    // Group by CLI then category
    const cmdLines = ['#CMD'];

    clis.forEach(cli => {
      const cliCmds = commands.filter(cmd => cmd.cli === cli);
      if (cliCmds.length === 0) return;

      cmdLines.push(`\n[${cli}]`);

      // Group by category
      const byCat = {};
      cliCmds.forEach(cmd => {
        const cat = cmd.category || 'gen';
        if (!byCat[cat]) byCat[cat] = [];
        byCat[cat].push(cmd);
      });

      Object.keys(byCat).sort().forEach(cat => {
        cmdLines.push(`${cat}:`);
        byCat[cat].forEach(cmd => {
          // Compact format: cmd|desc|args|use
          const args = cmd.arguments ? `|${cmd.arguments}` : '';
          const use = cmd.usage_scenario ? `|${cmd.usage_scenario[0]}` : '';
          cmdLines.push(`  ${cmd.command}|${cmd.description}${args}${use}`);
        });
      });
    });

    sections.push(cmdLines.join('\n'));
    totalTokens += cmdLines.join('\n').length / 4;
    console.log(`✓ Commands (${commands.length})`);

    // 3. Relationships (compressed)
    if (scannedData.relationships && Object.keys(scannedData.relationships).length > 0) {
      const relLines = ['#REL'];
      Object.entries(scannedData.relationships).forEach(([cmd, rel]) => {
        const parts = [];
        if (rel.prerequisites?.length) parts.push(`pre:${rel.prerequisites.join(',')}`);
        if (rel.next_steps?.length) parts.push(`next:${rel.next_steps.join(',')}`);
        if (parts.length) relLines.push(`${cmd}:${parts.join(';')}`);
      });
      if (relLines.length > 1) {
        sections.push(relLines.join('\n'));
        totalTokens += relLines.join('\n').length / 4;
        console.log('✓ Relations');
      }
    }
  }

  // 4. Compact instructions
  sections.push(`#INST
You are CCW command recommendation expert.
Analyze user input, choose CLI(claude|codex), recommend commands.

Return JSON:
{taskType:string,level:1-4,flow:string,cli:string,confidence:0-1,reason:string,commands:[{cmd:string,desc:string}]}

Levels:
1=simple task
2=plan+execute
3=plan+execute+verify
4=explore+plan+execute+verify

Rules:
-Match to specific commands
-Consider prerequisites
-Suggest alternatives`);

  totalTokens += 500; // approx

  // Combine with minimal separators
  const fullPrompt = sections.join('\n\n');

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Write output
  fs.writeFileSync(OUTPUT_FILE, fullPrompt, 'utf-8');

  const sizeKB = (fs.statSync(OUTPUT_FILE).size / 1024).toFixed(2);
  const estTokens = Math.floor(fs.statSync(OUTPUT_FILE).size / 4);

  console.log(`\n=== Done ===`);
  console.log(`Size: ${sizeKB} KB`);
  console.log(`Est.tokens: ~${estTokens}`);
}

buildPrompt();
