import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { FileChange } from '../types';
import { EXTENSION_CONSTANTS } from '../config/constants';

/**
 * File watcher that tracks changes and batches them for updates
 */
export class FileWatcher {
  private watcher: vscode.FileSystemWatcher | null = null;
  private pendingChanges: Map<string, FileChange> = new Map();
  private debounceTimer: NodeJS.Timeout | null = null;
  private onChangesCallback: ((changes: FileChange[]) => void) | null = null;
  private workspaceRoot: string;

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
  }

  /**
   * Start watching for file changes
   */
  start(onChanges: (changes: FileChange[]) => void): void {
    this.onChangesCallback = onChanges;

    // Watch all files except node_modules, .git, and .docudepth
    const pattern = new vscode.RelativePattern(
      this.workspaceRoot,
      '**/*.{ts,tsx,js,jsx,py,java,go,rs,c,cpp,h,hpp,cs,rb,php,swift,kt,scala,md,json,yaml,yml,toml,xml,html,css,scss,sass,less,vue,svelte,dart}'
    );

    this.watcher = vscode.workspace.createFileSystemWatcher(pattern);

    this.watcher.onDidCreate((uri) => this.handleChange(uri, 'added'));
    this.watcher.onDidChange((uri) => this.handleChange(uri, 'modified'));
    this.watcher.onDidDelete((uri) => this.handleChange(uri, 'deleted'));
  }

  /**
   * Stop watching for file changes
   */
  stop(): void {
    if (this.watcher) {
      this.watcher.dispose();
      this.watcher = null;
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.pendingChanges.clear();
  }

  /**
   * Handle a file change event
   */
  private handleChange(uri: vscode.Uri, changeType: 'added' | 'modified' | 'deleted'): void {
    const relativePath = path.relative(this.workspaceRoot, uri.fsPath);

    // Skip files we don't want to track
    if (this.shouldIgnore(relativePath)) {
      return;
    }

    // Read file content for added/modified files
    let content: string | undefined;
    if (changeType !== 'deleted') {
      try {
        content = fs.readFileSync(uri.fsPath, 'utf-8');
        // Skip very large files (>100KB)
        if (content.length > 100 * 1024) {
          return;
        }
      } catch {
        // File might have been deleted between event and read
        return;
      }
    }

    // Add to pending changes (overwrites previous change for same file)
    this.pendingChanges.set(relativePath, {
      path: relativePath,
      changeType,
      content,
    });

    // Debounce the callback
    this.scheduleCallback();
  }

  /**
   * Schedule the callback with debouncing
   */
  private scheduleCallback(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    const config = vscode.workspace.getConfiguration('docudepth');
    const debounceMs = config.get<number>('autoSyncDebounce') || 3000;

    this.debounceTimer = setTimeout(() => {
      this.flushChanges();
    }, debounceMs);
  }

  /**
   * Flush pending changes and trigger callback
   */
  flushChanges(): void {
    if (this.pendingChanges.size === 0) {
      return;
    }

    const changes = Array.from(this.pendingChanges.values());
    this.pendingChanges.clear();

    if (this.onChangesCallback) {
      this.onChangesCallback(changes);
    }
  }

  /**
   * Check if a file path should be ignored
   */
  private shouldIgnore(relativePath: string): boolean {
    const ignoredPatterns = [
      'node_modules',
      '.git',
      '.docudepth',
      'dist',
      'build',
      'out',
      '.next',
      '.nuxt',
      '__pycache__',
      '.pytest_cache',
      'venv',
      '.venv',
      'target',
      '.idea',
      '.vscode',
      '*.log',
      '*.lock',
      'package-lock.json',
      'yarn.lock',
      'pnpm-lock.yaml',
    ];

    const normalizedPath = relativePath.replace(/\\/g, '/');

    for (const pattern of ignoredPatterns) {
      if (pattern.startsWith('*')) {
        // Wildcard pattern
        const ext = pattern.slice(1);
        if (normalizedPath.endsWith(ext)) {
          return true;
        }
      } else if (
        normalizedPath.startsWith(pattern + '/') ||
        normalizedPath === pattern ||
        normalizedPath.includes('/' + pattern + '/') ||
        normalizedPath.endsWith('/' + pattern)
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get count of pending changes
   */
  getPendingCount(): number {
    return this.pendingChanges.size;
  }

  /**
   * Check if there are pending changes
   */
  hasPendingChanges(): boolean {
    return this.pendingChanges.size > 0;
  }
}

/**
 * Collect all source files from workspace for initial analysis
 */
export async function collectWorkspaceFiles(
  workspaceRoot: string
): Promise<Array<{ path: string; content: string }>> {
  const files: Array<{ path: string; content: string }> = [];

  const sourceExtensions = [
    'ts', 'tsx', 'js', 'jsx', 'py', 'java', 'go', 'rs', 'c', 'cpp', 'h', 'hpp',
    'cs', 'rb', 'php', 'swift', 'kt', 'scala', 'vue', 'svelte',
    'dart', // Flutter/Dart support
  ];

  const configExtensions = ['json', 'yaml', 'yml', 'toml', 'xml'];
  const docExtensions = ['md'];
  const styleExtensions = ['css', 'scss', 'sass', 'less'];

  const allExtensions = [...sourceExtensions, ...configExtensions, ...docExtensions, ...styleExtensions];
  const pattern = `**/*.{${allExtensions.join(',')}}`;

  const uris = await vscode.workspace.findFiles(
    new vscode.RelativePattern(workspaceRoot, pattern),
    '{**/node_modules/**,**/.git/**,**/dist/**,**/build/**,**/.docudepth/**,**/out/**,**/.next/**,**/vendor/**,**/__pycache__/**,**/venv/**,**/.venv/**}'
  );

  const maxFileSizeKB = 100;
  const maxTotalFiles = 500;

  // Patterns to skip even if glob exclude didn't catch them
  const skipPatterns = [
    'node_modules',
    '.git',
    'dist',
    'build',
    '.docudepth',
    '.next',
    '__pycache__',
    'venv',
    '.venv',
    'vendor',
    'out',
  ];

  for (const uri of uris.slice(0, maxTotalFiles)) {
    try {
      const relativePath = path.relative(workspaceRoot, uri.fsPath);

      // Double-check for excluded paths
      const shouldSkip = skipPatterns.some(
        (p) =>
          relativePath.includes(`/${p}/`) ||
          relativePath.startsWith(`${p}/`) ||
          relativePath.includes(`\\${p}\\`) ||
          relativePath.startsWith(`${p}\\`)
      );
      if (shouldSkip) {
        continue;
      }

      const content = fs.readFileSync(uri.fsPath, 'utf-8');

      // Skip large files
      if (content.length > maxFileSizeKB * 1024) {
        continue;
      }

      files.push({
        path: relativePath,
        content,
      });
    } catch {
      // Skip files that can't be read
    }
  }

  console.log(`[DocuDepth] Collected ${files.length} files for analysis`);
  return files;
}

/**
 * Read repository metadata files
 */
export async function readRepoMetadata(workspaceRoot: string): Promise<{
  name: string;
  readme?: string;
  packageJson?: unknown;
  gitIgnore?: string;
}> {
  const name = path.basename(workspaceRoot);
  let readme: string | undefined;
  let packageJson: unknown | undefined;
  let gitIgnore: string | undefined;

  // Try to read README
  for (const readmeName of ['README.md', 'readme.md', 'README.MD', 'Readme.md']) {
    const readmePath = path.join(workspaceRoot, readmeName);
    try {
      readme = fs.readFileSync(readmePath, 'utf-8');
      break;
    } catch {
      // Continue to next option
    }
  }

  // Try to read package.json
  const packageJsonPath = path.join(workspaceRoot, 'package.json');
  try {
    const content = fs.readFileSync(packageJsonPath, 'utf-8');
    packageJson = JSON.parse(content);
  } catch {
    // No package.json
  }

  // Try to read .gitignore
  const gitIgnorePath = path.join(workspaceRoot, '.gitignore');
  try {
    gitIgnore = fs.readFileSync(gitIgnorePath, 'utf-8');
  } catch {
    // No .gitignore
  }

  return { name, readme, packageJson, gitIgnore };
}
