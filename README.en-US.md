

# CCW Command Explorer

> Claude Code Workflow Command Encyclopedia - Interactive Command Exploration Website

A modern web application designed to showcase and explore the complete command map of the [Claude-Code-Workflow](https://github.com/catlog22/Claude-Code-Workflow) project.

## Project Overview

CCW Command Explorer is an interactive command documentation website that helps developers quickly understand and use the various commands in the Claude Code Workflow system.

## Features

### LLM Smart Recommendations

Integrates an AI-powered command recommendation system driven by large language models, allowing AI to help you choose the most suitable workflow:

- **LLM Intent Analysis**: Once the API is configured, the AI deeply understands task descriptions and intelligently recommends command combinations
- **Multi-Model Support**: Compatible with the OpenAI API format, supporting Claude, Gemini, DeepSeek, local models, etc.
- **Full Context**: Automatically loads detailed descriptions of 127 commands as context to ensure recommendation accuracy
- **Secure Configuration**: API Keys are stored locally with encryption, and serverless proxy calls are used to avoid CORS issues
- **Keyword Matching**: When LLM is not configured, rule-based keyword matching serves as a fallback recommendation system

### Command Exploration

- **Categorized Browsing**: Browse by main entry, workflows, session management, issue management, memory system, brainstorming, TDD development, testing, code review, UI design, etc.
- **Level Filtering**: A 4-level workflow system, ranging from simple bug fixes to complex multi-role brainstorming
- **CLI Support**: Supports both Claude Code and Codex commands
- **Search Functionality**: Quickly search command names or descriptions

### Interactive Learning

- **Command Detail Modal**: Click on a command card to view detailed descriptions, usage scenarios, and related commands
- **Usage Cases**: Real-world examples categorized by level, demonstrating complete interaction processes
- **Version Timeline**: A project growth map to understand new features and commands in each version

### Quick Start Guide

- **Grandma-Friendly Guide**: Remember just 5 core commands, and let `/ccw` handle the rest for you
- **Installation Tutorial**: Step-by-step installation and update instructions
- **Deprecated Commands Documentation**: Obsolete commands and their alternatives

## Tech Stack

- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite 7
- **Styling**: CSS + Framer Motion animations
- **Icons**: Lucide React
- **Analytics**: Vercel Analytics + Speed Insights

## Quick Start

### Install Dependencies

```bash
npm install
```

### Development Mode

```bash
npm run dev
```

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
ccw-command-explorer/
├── public/              # Static assets
├── src/
│   ├── data/
│   │   ├── commands.ts  # Command data definitions
│   │   └── cases.ts     # Usage case data
│   ├── App.tsx          # Main application component
│   ├── App.css          # Stylesheet
│   ├── main.tsx         # Entry point
│   └── index.css        # Global styles
├── index.html           # HTML template
├── package.json         # Project configuration
├── tsconfig.json        # TypeScript configuration
└── vite.config.ts       # Vite configuration
```

## Core Data Structures

### Command

```typescript
interface Command {
  cmd: string;           // Command name
  desc: string;          // Short description
  status: CommandStatus; // Status: new | stable | recommended | deprecated
  category: CommandCategory; // Category
  cli: CLIType;          // CLI type: claude | codex
  level?: 1 | 2 | 3 | 4; // Workflow level
  detail?: string;       // Detailed description
  usage?: string;        // Usage scenario
}
```

### Case

```typescript
interface Case {
  id: string;
  title: string;
  level: CaseLevel;
  category: string;
  scenario: string;
  commands: Array<{ cmd: string; desc: string }>;
  steps: CaseStep[];
  tips?: string[];
}
```

## Main Pages

### Overview Page

- Project growth map (version timeline)
- 4-level workflow system explanation
- Beginner-friendly command guide

### Command Page

- Complete command list
- Multi-dimensional filtering (category/level/CLI)
- Command detail modal
- Deprecated commands documentation

### Cases Page

- Usage cases categorized by level
- Interaction process demonstration
- Practical tips

### Installation Page

- Project repository links
- Installation and update steps
- Quick start guide
- Related resource links

## Related Resources

- [CCW GitHub Repository](https://github.com/catlog22/Claude-Code-Workflow)
- [Installation Guide](https://github.com/catlog22/Claude-Code-Workflow/blob/master/INSTALL_CN.md)
- [Getting Started](https://github.com/catlog22/Claude-Code-Workflow/blob/master/GETTING_STARTED_CN.md)
- [Changelog](https://github.com/catlog22/Claude-Code-Workflow/blob/master/CHANGELOG.md)

## Development

### Code Linting

```bash
npm run lint
```

### Type Checking

```bash
npx tsc --noEmit
```

## License

MIT License

## Contributing

Issues and Pull Requests are welcome!
