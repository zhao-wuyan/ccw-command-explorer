# Library Spec Profile

Defines additional required sections for library/SDK-type specifications.

## Required Sections (in addition to base template)

### In Architecture Document
- **Public API Surface**: MUST define all public interfaces with signatures, parameters, return types
- **Usage Examples**: MUST provide >= 3 code examples showing common usage patterns
- **Compatibility Matrix**: MUST define supported language versions, runtime environments
- **Dependency Policy**: MUST define transitive dependency policy, version constraints
- **Extension Points**: SHOULD define plugin/extension mechanisms if applicable
- **Bundle Size**: SHOULD define target bundle size and tree-shaking strategy

### In Requirements Document
- **API Ergonomics**: Requirements SHOULD address developer experience and API consistency
- **Error Reporting**: MUST define error types, messages, and recovery hints for consumers

### Quality Gate Additions
| Check | Criteria | Severity |
|-------|----------|----------|
| Public API documented | All public interfaces with types | Error |
| Usage examples | >= 3 working examples | Warning |
| Compatibility matrix | Supported environments listed | Warning |
| Dependency policy | Transitive deps strategy defined | Info |
