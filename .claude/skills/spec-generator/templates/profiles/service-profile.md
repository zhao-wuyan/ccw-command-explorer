# Service Spec Profile

Defines additional required sections for service-type specifications.

## Required Sections (in addition to base template)

### In Architecture Document
- **Concepts & Terminology**: MUST define all domain terms with consistent aliases
- **State Machine**: MUST include ASCII state diagram for each entity with a lifecycle
- **Configuration Model**: MUST define all configurable fields with types, defaults, constraints
- **Error Handling**: MUST define per-component error classification and recovery strategies
- **Observability**: MUST define >= 3 metrics, structured log format, health check endpoints
- **Trust & Safety**: SHOULD define trust levels and approval matrix
- **Graceful Shutdown**: MUST describe shutdown sequence and cleanup procedures
- **Implementation Guidance**: SHOULD provide implementation order and key decisions

### In Requirements Document
- **Behavioral Constraints**: MUST use RFC 2119 keywords (MUST/SHOULD/MAY) for all requirements
- **Data Model**: MUST define core entities with field-level detail (type, constraint, relation)

### Quality Gate Additions
| Check | Criteria | Severity |
|-------|----------|----------|
| State machine present | >= 1 lifecycle state diagram | Error |
| Configuration model | All config fields documented | Warning |
| Observability metrics | >= 3 metrics defined | Warning |
| Error handling defined | Per-component strategy | Warning |
| RFC keywords used | Behavioral requirements use MUST/SHOULD/MAY | Warning |
