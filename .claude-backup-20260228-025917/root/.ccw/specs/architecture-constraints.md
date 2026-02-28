---
title: "Architecture Constraints"
dimension: specs
category: planning
keywords:
  - architecture
  - module
  - layer
  - pattern
readMode: required
priority: high
---

# Architecture Constraints

## Module Boundaries

- Each module owns its data and exposes a public API
- No circular dependencies between modules
- Shared utilities live in a dedicated shared layer

## Layer Separation

- Presentation layer must not import data layer directly
- Business logic must be independent of framework specifics
- Configuration must be externalized, not hardcoded

## Dependency Rules

- External dependencies require justification
- Prefer standard library when available
- Pin dependency versions for reproducibility
