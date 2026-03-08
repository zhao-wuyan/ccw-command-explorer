# State Management Patterns

## Local Component State
- Use for UI-only state (open/closed, hover, focus)
- Keep close to where it's used

## Shared State
- Lift state to lowest common ancestor
- Use context or state management library for deep trees

## Async State
- Track loading, error, and success states
- Handle race conditions with request cancellation
- Implement retry logic with exponential backoff
