# DocuDepth AI for Visual Studio Code

Generate intelligent context maps for your codebase that dramatically improve AI coding assistant accuracy.

## Features

- **One-click context map generation** - Analyze your entire codebase and create a comprehensive context map
- **Auto-sync** - Automatically updates the context map as you make changes
- **Copy context prompt** - Easily copy the context to paste into AI assistants like Claude, ChatGPT, or Cursor
- **Works with any language** - TypeScript, JavaScript, Python, Go, Rust, Java, Flutter/Dart, and more

## Getting Started

1. Install the extension
2. Run `DocuDepth: Login` from the Command Palette (Cmd/Ctrl+Shift+P)
3. Run `DocuDepth: Initialize Context Map` to analyze your codebase
4. Use `DocuDepth: Copy Context Prompt` to copy the context for your AI assistant

## Commands

| Command | Description |
|---------|-------------|
| `DocuDepth: Login` | Login with your DocuDepth account |
| `DocuDepth: Logout` | Logout from DocuDepth |
| `DocuDepth: Initialize Context Map` | Generate a context map for your codebase |
| `DocuDepth: Refresh Context Map` | Regenerate the entire context map |
| `DocuDepth: Copy Context Prompt` | Copy the context prompt to clipboard |
| `DocuDepth: Open Context Map` | View the raw context map JSON |

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `docudepth.autoSync` | `true` | Automatically sync file changes |
| `docudepth.autoSyncDebounce` | `3000` | Debounce time (ms) before syncing |
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
