# Windows Platform Guidelines

## Path Format

- **MCP Tools**: `D:\\path\\file.txt`
- **Bash**: `D:/path/file.txt` or `/d/path/file.txt`
- **Relative**: `./src/index.ts`

## Bash Rules (Prevent Garbage Files)

1. **Null redirect**: `command > NUL 2>&1`
2. **Quote all**: `echo "$VAR"`, `cat "file name.txt"`
3. **Variable assignment**: `export VAR=value && command`
4. **Regex escape**: `grep -F "State<T>"` or `grep "State\<T\>"`
5. **Pipe output**: `command 2>&1 | ...` (avoid bare command output)

## Tool Priority

MCP Tools > PowerShell > Git Bash > cmd
