# API Spec Profile

Defines additional required sections for API-type specifications.

## Required Sections (in addition to base template)

### In Architecture Document
- **Endpoint Definition**: MUST list all endpoints with method, path, auth, request/response schema
- **Authentication Model**: MUST define auth mechanism (OAuth2/JWT/API Key), token lifecycle
- **Rate Limiting**: MUST define rate limits per tier/endpoint, throttling behavior
- **Error Codes**: MUST define error response format, standard error codes with descriptions
- **API Versioning**: MUST define versioning strategy (URL/header/query), deprecation policy
- **Pagination**: SHOULD define pagination strategy for list endpoints
- **Idempotency**: SHOULD define idempotency requirements for write operations

### In Requirements Document
- **Endpoint Acceptance Criteria**: Each requirement SHOULD map to specific endpoints
- **SLA Definitions**: MUST define response time, availability targets per endpoint tier

### Quality Gate Additions
| Check | Criteria | Severity |
|-------|----------|----------|
| Endpoints documented | All endpoints with method + path | Error |
| Auth model defined | Authentication mechanism specified | Error |
| Error codes defined | Standard error format + codes | Warning |
| Rate limits defined | Per-endpoint or per-tier limits | Warning |
| API versioning strategy | Versioning approach specified | Warning |
