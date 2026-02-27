---
name: ccw view
description: Dashboard - Open CCW workflow dashboard for managing tasks and sessions
category: general
---

# CCW View Command

Open the CCW workflow dashboard for visualizing and managing project tasks, sessions, and workflow execution status.

## Description

`ccw view` launches an interactive web dashboard that provides:
- **Workflow Overview**: Visualize current workflow status and command chain execution
- **Session Management**: View and manage active workflow sessions
- **Task Tracking**: Monitor TODO items and task progress
- **Workspace Switching**: Switch between different project workspaces
- **Real-time Updates**: Live updates of command execution and status

## Usage

```bash
# Open dashboard for current workspace
ccw view

# Specify workspace path
ccw view --path /path/to/workspace

# Custom port (default: 3456)
ccw view --port 3000

# Bind to specific host
ccw view --host 0.0.0.0 --port 3456

# Open without launching browser
ccw view --no-browser

# Show URL without opening browser
ccw view --no-browser
```

## Options

| Option | Default | Description |
|--------|---------|-------------|
| `--path <path>` | Current directory | Workspace path to display |
| `--port <port>` | 3456 | Server port for dashboard |
| `--host <host>` | 127.0.0.1 | Server host/bind address |
| `--no-browser` | false | Don't launch browser automatically |
| `-h, --help` | - | Show help message |

## Features

### Dashboard Sections

#### 1. **Workflow Overview**
- Current workflow status
- Command chain visualization (with Minimum Execution Units marked)
- Live progress tracking
- Error alerts

#### 2. **Session Management**
- List active sessions by type (workflow, review, tdd)
- Session details (created time, last activity, session ID)
- Quick actions (resume, pause, complete)
- Session logs/history

#### 3. **Task Tracking**
- TODO list with status indicators
- Progress percentage
- Task grouping by workflow stage
- Quick inline task updates

#### 4. **Workspace Switcher**
- Browse available workspaces
- Switch context with one click
- Recent workspaces list

#### 5. **Command History**
- Recent commands executed
- Execution time and status
- Quick re-run options

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `R` | Refresh dashboard |
| `Cmd/Ctrl + J` | Jump to session search |
| `Cmd/Ctrl + K` | Open command palette |
| `?` | Show help |

## Multi-Instance Support

The dashboard supports multiple concurrent instances:

```bash
# Terminal 1: Workspace A on port 3456
ccw view --path ~/projects/workspace-a

# Terminal 2: Workspace B on port 3457
ccw view --path ~/projects/workspace-b --port 3457

# Switching workspaces on the same port
ccw view --path ~/projects/workspace-c  # Auto-switches existing server
```

When the server is already running and you execute `ccw view` with a different path:
1. Detects running server on the port
2. Sends workspace switch request
3. Updates dashboard to new workspace
4. Opens browser with updated context

## Server Lifecycle

### Startup

```
ccw view
  ├─ Check if server running on port
  │  ├─ If yes: Send switch-path request
  │  └─ If no: Start new server
  ├─ Launch browser (unless --no-browser)
  └─ Display dashboard URL
```

### Running

The dashboard server continues running until:
- User explicitly stops it (Ctrl+C)
- All connections close after timeout
- System shutdown

### Multiple Workspaces

Switching to a different workspace keeps the same server instance:
```
Server State Before: workspace-a on port 3456
ccw view --path ~/projects/workspace-b
Server State After: workspace-b on port 3456 (same instance)
```

## Environment Variables

```bash
# Set default port
export CCW_VIEW_PORT=4000
ccw view  # Uses port 4000

# Set default host
export CCW_VIEW_HOST=localhost
ccw view --port 3456  # Binds to localhost:3456

# Disable browser launch by default
export CCW_VIEW_NO_BROWSER=true
ccw view  # Won't auto-launch browser
```

## Integration with CCW Workflows

The dashboard is fully integrated with CCW commands:

### Viewing Workflow Progress

```bash
# Start a workflow
ccw "Add user authentication"

# In another terminal, view progress
ccw view  # Shows execution progress in real-time
```

### Session Management from Dashboard

- Start new session: Click "New Session" button
- Resume paused session: Sessions list → Resume button
- View session logs: Click session name
- Complete session: Sessions list → Complete button

### Real-time Command Execution

- View active command chain execution
- Watch command transition through Minimum Execution Units
- See error alerts and recovery options
- View command output logs

## Troubleshooting

### Port Already in Use

```bash
# Use different port
ccw view --port 3457

# Or kill existing server
lsof -i :3456  # Find process
kill -9 <pid>   # Kill it
ccw view        # Start fresh
```

### Dashboard Not Loading

```bash
# Try without browser
ccw view --no-browser

# Check server logs
tail -f ~/.ccw/logs/dashboard.log

# Verify network access
curl http://localhost:3456/api/health
```

### Workspace Path Not Found

```bash
# Use full absolute path
ccw view --path "$(pwd)"

# Or specify explicit path
ccw view --path ~/projects/my-project
```

## Related Commands

- **`/ccw`** - Main workflow orchestrator
- **`/workflow:session:list`** - List workflow sessions
- **`/workflow:session:resume`** - Resume paused session
- **`/memory:compact`** - Compact session memory for dashboard display

## Examples

### Basic Dashboard View

```bash
cd ~/projects/my-app
ccw view
# → Launches http://localhost:3456 in browser
```

### Network-Accessible Dashboard

```bash
# Allow remote access
ccw view --host 0.0.0.0 --port 3000
# → Dashboard accessible at http://machine-ip:3000
```

### Multiple Workspaces on Different Ports

```bash
# Terminal 1: Main project
ccw view --path ~/projects/main --port 3456

# Terminal 2: Side project
ccw view --path ~/projects/side --port 3457

# View both simultaneously
# → http://localhost:3456 (main)
# → http://localhost:3457 (side)
```

### Headless Dashboard

```bash
# Run dashboard without browser
ccw view --port 3000 --no-browser
echo "Dashboard available at http://localhost:3000"

# Share URL with team
# Can be proxied through nginx/port forwarding
```

### Environment-Based Configuration

```bash
# Script for CI/CD
export CCW_VIEW_HOST=0.0.0.0
export CCW_VIEW_PORT=8080
ccw view --path /workspace

# → Dashboard accessible on port 8080 to all interfaces
```

## Dashboard Pages

### Overview Page (`/`)
- Current workflow status
- Active sessions summary
- Recent commands
- System health indicators

### Sessions Page (`/sessions`)
- All sessions (grouped by type)
- Session details and metadata
- Session logs viewer
- Quick actions (resume/complete)

### Tasks Page (`/tasks`)
- Current TODO items
- Progress tracking
- Inline task editing
- Workflow history

### Workspace Page (`/workspace`)
- Current workspace info
- Available workspaces
- Workspace switcher
- Workspace settings

### Settings Page (`/settings`)
- Port configuration
- Theme preferences
- Auto-refresh settings
- Export settings

## Server Health Monitoring

The dashboard includes health monitoring:

```bash
# Check health endpoint
curl http://localhost:3456/api/health
# → { "status": "ok", "uptime": 12345 }

# Monitor metrics
curl http://localhost:3456/api/metrics
# → { "sessions": 3, "tasks": 15, "lastUpdate": "2025-01-29T10:30:00Z" }
```

## Advanced Usage

### Custom Port with Dynamic Discovery

```bash
# Find next available port
available_port=$(find-available-port 3456)
ccw view --port $available_port

# Display in CI/CD
echo "Dashboard: http://localhost:$available_port"
```

### Dashboard Behind Proxy

```bash
# Configure nginx reverse proxy
# Proxy http://proxy.example.com/dashboard → http://localhost:3456

ccw view --host 127.0.0.1 --port 3456

# Access via proxy
# http://proxy.example.com/dashboard
```

### Session Export from Dashboard

- View → Sessions → Export JSON
- Exports session metadata and progress
- Useful for record-keeping and reporting

## See Also

- **CCW Commands**: `/ccw` - Auto workflow orchestration
- **Session Management**: `/workflow:session:start`, `/workflow:session:list`
- **Task Tracking**: `TodoWrite` tool for programmatic task management
- **Workflow Status**: `/workflow:status` for CLI-based status view
