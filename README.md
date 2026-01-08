# DocuDepth AI for Visual Studio Code

Generate intelligent context maps for your codebase that **automatically integrate** with AI coding assistants - no copy/paste needed.

## Zero-Config AI Integration

DocuDepth automatically generates context files that your AI tools read natively:

| AI Tool | Auto-Generated File | Status |
|---------|---------------------|--------|
| **Claude Code** | `CLAUDE.md` | Automatic |
| **Cursor** | `.cursorrules` | Automatic |
| **Windsurf** | `.windsurfrules` | Automatic |
| **GitHub Copilot** | `.github/copilot-instructions.md` | Automatic |
| **Continue.dev** | `.continuerules` | Automatic |
| **Aider** | `.aider/context.md` | Automatic |

**Just generate once - every AI tool gets context automatically.**

## Features

- **Automatic AI integration** - Context files generated for Claude, Cursor, Copilot, Windsurf, and more
- **One-click generation** - Analyze your entire codebase with a single command
- **Auto-sync** - Context files update automatically as you make changes
- **Works with any language** - TypeScript, JavaScript, Python, Go, Rust, Java, Flutter/Dart, and more

## Getting Started

1. Install the extension
2. Run `DocuDepth: Login` from the Command Palette (Cmd/Ctrl+Shift+P)
3. Run `DocuDepth: Initialize Context Map` to analyze your codebase
4. **Done!** Your AI assistant now has full codebase context automatically

No copy/paste required. Just start coding with your AI assistant.

## How It Works

```
You run "Initialize Context Map"
           ↓
DocuDepth analyzes your codebase
           ↓
Generates context files for ALL AI tools
           ↓
Your AI assistant reads them automatically
           ↓
AI suggestions are now dramatically more accurate
```

## Commands

| Command | Description |
|---------|-------------|
| `DocuDepth: Login` | Login with your DocuDepth account |
| `DocuDepth: Logout` | Logout from DocuDepth |
| `DocuDepth: Initialize Context Map` | Generate context for all AI tools |
| `DocuDepth: Refresh Context Map` | Regenerate the entire context map |
| `DocuDepth: Copy Context Prompt` | Copy context to clipboard (for tools without native support) |
| `DocuDepth: Open Context Map` | View the raw context map JSON |

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `docudepth.autoSync` | `true` | Automatically sync on file save (Cmd+S) |
| `docudepth.autoSyncDebounce` | `3000` | Debounce after save (batches "Save All") |
| `docudepth.syncOnFocusLoss` | `true` | Sync when VS Code loses focus |
| `docudepth.maxFilesPerBatch` | `50` | Max files per sync batch |

## Requirements

- VS Code 1.85.0 or higher
- Active internet connection
- DocuDepth account (sign up at [docudepthai.com](https://docudepthai.com))

## Support

- Website: [docudepthai.com](https://docudepthai.com)
- Issues: [GitHub Issues](https://github.com/docudepthai/docudepth-vscode/issues)

## License

MIT License - see [LICENSE](LICENSE) for details.
