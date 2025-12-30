# DocuDepth AI for Visual Studio Code - User Guide

## Introduction

DocuDepth AI is a powerful VS Code extension that generates intelligent context maps for your codebase. These context maps dramatically improve the accuracy of AI coding assistants like Claude, ChatGPT, Cursor, and GitHub Copilot by providing them with a comprehensive understanding of your project's architecture, patterns, and conventions.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Installation](#installation)
3. [Authentication](#authentication)
4. [Generating Your First Context Map](#generating-your-first-context-map)
5. [Using Context Maps with AI Assistants](#using-context-maps-with-ai-assistants)
6. [Commands Reference](#commands-reference)
7. [Settings](#settings)
8. [Auto-Sync Feature](#auto-sync-feature)
9. [Best Practices](#best-practices)
10. [Troubleshooting](#troubleshooting)
11. [FAQ](#faq)

---

## Getting Started

### What is a Context Map?

A context map is an AI-generated comprehensive overview of your codebase that includes:

- **Architecture Overview**: High-level structure and design patterns
- **Component Relationships**: How different parts of your code interact
- **Key Abstractions**: Important classes, functions, and modules
- **Code Conventions**: Naming patterns, file organization, and coding styles
- **Technical Debt**: Areas that may need refactoring
- **Semantic Index**: Concepts and features mapped to code locations

### Why Use DocuDepth AI?

AI coding assistants are powerful, but they often lack context about your specific codebase. DocuDepth AI solves this by:

- **Improving AI accuracy**: AI assistants understand your codebase structure before making suggestions
- **Reducing errors**: Fewer hallucinations and incorrect recommendations
- **Saving time**: No need to manually explain your codebase structure
- **Staying current**: Auto-sync keeps your context map updated as you code

---

## Installation

### From VS Code Marketplace

1. Open VS Code
2. Go to the Extensions view (`Cmd+Shift+X` on Mac, `Ctrl+Shift+X` on Windows/Linux)
3. Search for "DocuDepth AI"
4. Click **Install**

### From VSIX File

1. Download the `.vsix` file from the official website
2. Open VS Code
3. Go to Extensions view
4. Click the `...` menu at the top
5. Select "Install from VSIX..."
6. Choose the downloaded file

---

## Authentication

Before using DocuDepth AI, you need to authenticate with your account.

### Creating an Account

1. Visit [docudepthai.com](https://docudepthai.com)
2. Click "Sign Up" and create your account
3. Verify your email address

### Logging In

1. Open the Command Palette (`Cmd+Shift+P` on Mac, `Ctrl+Shift+P` on Windows/Linux)
2. Type "DocuDepth: Login" and select the command
3. Enter your email and password when prompted
4. You'll see a confirmation message when successfully logged in

### Checking Login Status

The status bar at the bottom of VS Code shows your authentication status:
- **Not logged in**: Shows a login prompt
- **Logged in**: Shows your DocuDepth status and context map state

### Logging Out

1. Open the Command Palette
2. Type "DocuDepth: Logout" and select the command

---

## Generating Your First Context Map

### Step 1: Open Your Project

Open a folder in VS Code containing the codebase you want to analyze.

### Step 2: Initialize Context Map

1. Open the Command Palette (`Cmd+Shift+P` or `Ctrl+Shift+P`)
2. Type "DocuDepth: Initialize Context Map"
3. Press Enter

### Step 3: Wait for Generation

DocuDepth AI will analyze your codebase. This process typically takes:
- **Small projects** (< 50 files): 1-2 minutes
- **Medium projects** (50-200 files): 2-5 minutes
- **Large projects** (200+ files): 5-15 minutes

You can monitor progress in the status bar and output panel.

### Step 4: View Your Context Map

Once generation is complete:
1. Open the Command Palette
2. Type "DocuDepth: Open Context Map"
3. The context map JSON will open in a new editor tab

---

## Using Context Maps with AI Assistants

### Automatic AI Integration (Recommended)

DocuDepth **automatically generates context files** that your AI tools read natively. No copy/paste required!

When you generate a context map, DocuDepth creates these files in your project:

| AI Tool | Generated File | What Happens |
|---------|----------------|--------------|
| **Claude Code** | `CLAUDE.md` | Claude reads it automatically |
| **Cursor** | `.cursorrules` | Cursor reads it automatically |
| **Windsurf** | `.windsurfrules` | Windsurf reads it automatically |
| **GitHub Copilot** | `.github/copilot-instructions.md` | Copilot reads it automatically |
| **Continue.dev** | `.continuerules` | Continue reads it automatically |
| **Aider** | `.aider/context.md` | Aider reads it automatically |

**Just run "Initialize Context Map" once, and every AI tool gets context automatically.**

These files are:
- Auto-generated when you initialize/refresh your context map
- Auto-updated when your code changes (with auto-sync enabled)
- Auto-added to `.gitignore` so they don't clutter your repo

### Manual Copy (For Other Tools)

For AI tools without native file support (ChatGPT web, Claude.ai, etc.):

1. Open the Command Palette
2. Type "DocuDepth: Copy Context Prompt"
3. Paste it at the beginning of your AI conversation

**Example:**
```
[Paste context prompt here]

Now, can you help me add a new API endpoint for user preferences?
```

### Tips for Best Results

- **Just code**: With automatic integration, your AI assistant already has context
- **Be specific**: Ask focused questions about your codebase
- **Trust the context**: AI will reference your architecture, patterns, and conventions
- **Keep auto-sync on**: Context stays current as you make changes

---

## Commands Reference

| Command | Description | Keyboard Shortcut |
|---------|-------------|-------------------|
| `DocuDepth: Login` | Authenticate with your DocuDepth account | - |
| `DocuDepth: Logout` | Sign out of your account | - |
| `DocuDepth: Initialize Context Map` | Generate a new context map for your project | - |
| `DocuDepth: Refresh Context Map` | Regenerate the entire context map | - |
| `DocuDepth: Copy Context Prompt` | Copy the context prompt to clipboard | - |
| `DocuDepth: Open Context Map` | View the raw context map JSON | - |
| `DocuDepth: Show Generation Progress` | Display the current generation status | - |

### Accessing Commands

All commands are available through:
1. **Command Palette**: `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
2. **Status Bar**: Click the DocuDepth status item

---

## Settings

Access settings via:
- **VS Code Settings UI**: Search for "DocuDepth"
- **settings.json**: Add `docudepth.*` settings

### Available Settings

#### `docudepth.autoSync`
- **Type**: Boolean
- **Default**: `true`
- **Description**: Automatically sync file changes to update the context map

When enabled, DocuDepth watches for file changes and incrementally updates your context map. This ensures your context stays current without manual intervention.

#### `docudepth.autoSyncDebounce`
- **Type**: Number (milliseconds)
- **Default**: `3000`
- **Description**: Debounce time before auto-syncing changes

This prevents excessive updates during rapid editing. The sync will trigger 3 seconds (default) after you stop making changes.

#### `docudepth.maxFilesPerBatch`
- **Type**: Number
- **Default**: `50`
- **Description**: Maximum number of files to include in a single update batch

For large changes, files are processed in batches to ensure smooth performance.

#### `docudepth.apiEndpoint`
- **Type**: String
- **Default**: Production API URL
- **Description**: DocuDepth API endpoint (advanced users only)

---

## Auto-Sync Feature

### How It Works

When auto-sync is enabled, DocuDepth automatically:

1. **Watches for file changes** in your workspace
2. **Detects significant modifications** (not just whitespace)
3. **Batches changes** to reduce API calls
4. **Updates the context map** incrementally

### What Triggers a Sync?

- Creating new files
- Modifying existing files
- Deleting files
- Renaming files

### What's Excluded?

Auto-sync ignores:
- `node_modules/` and other dependency directories
- `.git/` directory
- Build output directories (`dist/`, `build/`, etc.)
- Log files
- Binary files
- Files matching `.gitignore` patterns

### Disabling Auto-Sync

If you prefer manual control:

1. Open VS Code Settings
2. Search for "docudepth.autoSync"
3. Uncheck the setting

Or add to `settings.json`:
```json
{
  "docudepth.autoSync": false
}
```

---

## Best Practices

### 1. Initialize After Major Refactoring

After significant architectural changes, regenerate your context map using "Refresh Context Map" to ensure accuracy.

### 2. Use Descriptive File Names

DocuDepth analyzes file names and structure. Descriptive names improve context quality:
- Good: `user-authentication.service.ts`
- Less ideal: `auth.ts`

### 3. Keep Your Context Updated

For best AI assistant results:
- Enable auto-sync for continuous updates
- Manually refresh before major AI-assisted coding sessions

### 4. Scope Your Context

For monorepos or large projects, consider:
- Opening specific subdirectories as workspaces
- Generating separate context maps for different modules

### 5. Review Generated Context

Occasionally review your context map to:
- Verify it captures your architecture accurately
- Identify areas where code organization could improve

---

## Troubleshooting

### "Not Authenticated" Error

**Solution:**
1. Run "DocuDepth: Login" from the Command Palette
2. Enter valid credentials
3. Check your internet connection

### Context Map Generation Fails

**Possible causes and solutions:**

1. **Large codebase**: Generation may timeout for very large projects
   - Try opening a smaller subdirectory
   - Wait and retry later

2. **Network issues**: Check your internet connection

3. **Invalid project structure**: Ensure you have a valid code project open
   - The folder should contain source code files

### Auto-Sync Not Working

**Check:**
1. Auto-sync is enabled in settings
2. Files are not in ignored directories
3. You're authenticated
4. The project has been initialized

### Stale Context Map

If your context map seems outdated:
1. Run "DocuDepth: Refresh Context Map"
2. Wait for regeneration to complete

### Extension Not Loading

**Try:**
1. Reload VS Code (`Cmd+Shift+P` → "Developer: Reload Window")
2. Check the Output panel for errors (View → Output → select "DocuDepth")
3. Reinstall the extension

---

## FAQ

### How much does DocuDepth AI cost?

Visit [docudepthai.com/pricing](https://docudepthai.com/pricing) for current pricing plans.

### What languages are supported?

DocuDepth AI supports all major programming languages including:
- JavaScript / TypeScript
- Python
- Go
- Rust
- Java / Kotlin
- C / C++
- Ruby
- PHP
- Swift
- Flutter / Dart
- And many more

### Is my code stored on your servers?

DocuDepth processes your code to generate context maps. We prioritize security:
- Code is transmitted securely (HTTPS)
- Processing is ephemeral
- See our privacy policy for details

### How large of a codebase can DocuDepth handle?

DocuDepth can analyze codebases of virtually any size. For very large monorepos, we recommend:
- Analyzing specific modules or subdirectories
- Using workspace folders to scope analysis

### Can I use DocuDepth with private repositories?

Yes! DocuDepth works with any codebase you have open in VS Code, regardless of where it's hosted.

### How often should I refresh my context map?

- **With auto-sync enabled**: The context map updates automatically
- **Without auto-sync**: Refresh before important AI-assisted coding sessions or after major changes

### Does DocuDepth work offline?

No, DocuDepth requires an internet connection to:
- Authenticate your account
- Generate and update context maps
- Sync changes

---

## Support

### Getting Help

- **Documentation**: [docs.docudepthai.com](https://docs.docudepthai.com)
- **Issues**: [GitHub Issues](https://github.com/docudepthai/docudepth-vscode/issues)
- **Email**: support@docudepthai.com

### Reporting Bugs

When reporting issues, please include:
1. VS Code version
2. DocuDepth extension version
3. Operating system
4. Steps to reproduce the issue
5. Error messages (from Output panel)

---

## Changelog

### Version 1.2.0
- **Automatic AI tool integration** - Generates context files for Claude, Cursor, Copilot, Windsurf, Continue, and Aider
- Context files auto-update when code changes
- All generated files added to .gitignore automatically
- Browser-based OAuth login

### Version 1.1.0
- Browser-based authentication (removed SDK dependency)
- Extension size reduced from 428KB to 46KB
- Improved error handling

### Version 1.0.0
- Initial release
- Context map generation
- Auto-sync feature
- Copy context prompt functionality

---

*DocuDepth AI - Make AI coding assistants dramatically more accurate*
