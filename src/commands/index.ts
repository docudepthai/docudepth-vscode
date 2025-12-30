import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { TokenManager } from '../auth/tokenManager';
import { OAuthUriHandler } from '../auth/oauthHandler';
import { apiClient } from '../api/apiClient';
import { StatusBarManager, ProgressNotification } from '../ui/statusBar';
import { FileWatcher, collectWorkspaceFiles, readRepoMetadata } from '../watchers/fileWatcher';
import { StatusBarState, EXTENSION_CONSTANTS } from '../config/constants';
import { ContextMap, FileChange } from '../types';
import { ContextFileGenerator } from '../generators/contextFileGenerator';

/**
 * Command handlers for DocuDepth extension
 */
export class CommandHandlers {
  private context: vscode.ExtensionContext;
  private tokenManager: TokenManager;
  private statusBar: StatusBarManager;
  private oauthHandler: OAuthUriHandler;
  private fileWatcher: FileWatcher | null = null;
  private currentContextMapId: string | null = null;
  private currentContextMap: ContextMap | null = null;

  constructor(
    context: vscode.ExtensionContext,
    tokenManager: TokenManager,
    statusBar: StatusBarManager,
    oauthHandler: OAuthUriHandler
  ) {
    this.context = context;
    this.tokenManager = tokenManager;
    this.statusBar = statusBar;
    this.oauthHandler = oauthHandler;
  }

  /**
   * Login command - opens browser for OAuth
   */
  async login(): Promise<void> {
    try {
      vscode.window.showInformationMessage(
        'Opening browser for login... Complete the login in your browser.',
        'OK'
      );

      // Start OAuth flow - opens browser and waits for callback
      const result = await this.oauthHandler.startLogin();

      // Store tokens
      await this.tokenManager.storeTokens(result.idToken, result.email);

      await vscode.commands.executeCommand('setContext', 'docudepth.isAuthenticated', true);

      // Check if we have an existing context map
      await this.checkExistingContextMap();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      vscode.window.showErrorMessage(`DocuDepth login failed: ${message}`);
      this.statusBar.update(StatusBarState.NOT_AUTHENTICATED);
    }
  }

  /**
   * Logout command
   */
  async logout(): Promise<void> {
    await this.tokenManager.logout();
    await vscode.commands.executeCommand('setContext', 'docudepth.isAuthenticated', false);
    await vscode.commands.executeCommand('setContext', 'docudepth.hasContextMap', false);

    this.stopFileWatcher();
    this.currentContextMapId = null;
    this.currentContextMap = null;

    this.statusBar.update(StatusBarState.NOT_AUTHENTICATED);
    vscode.window.showInformationMessage('Logged out of DocuDepth');
  }

  /**
   * Initialize context map command
   */
  async initialize(): Promise<void> {
    const workspaceRoot = this.getWorkspaceRoot();
    if (!workspaceRoot) {
      vscode.window.showErrorMessage('No workspace folder open');
      return;
    }

    const idToken = await this.tokenManager.getIdToken();
    if (!idToken) {
      vscode.window.showErrorMessage('Please login first');
      this.statusBar.update(StatusBarState.NOT_AUTHENTICATED);
      return;
    }

    this.statusBar.update(StatusBarState.GENERATING, 0);

    try {
      // Collect all source files
      const progressNotification = new ProgressNotification();
      progressNotification.show('Generating Context Map');
      progressNotification.update('Collecting source files...');

      const files = await collectWorkspaceFiles(workspaceRoot);
      const repoMetadata = await readRepoMetadata(workspaceRoot);

      progressNotification.update(`Analyzing ${files.length} files...`);

      // Start generation
      const response = await apiClient.analyzeRepository(idToken, files, repoMetadata);
      this.currentContextMapId = response.context_map_id;

      progressNotification.update('Processing codebase...');

      // Poll for completion
      await this.pollForCompletion(idToken, response.context_map_id, (progress, message) => {
        this.statusBar.update(StatusBarState.GENERATING, progress);
        progressNotification.update(message);
      });

      // Get the result
      const result = await apiClient.getResult(idToken, response.context_map_id);
      this.currentContextMap = result.context_map;

      // Save locally
      await this.saveContextMapLocally(workspaceRoot, result.context_map);

      progressNotification.complete();
      this.statusBar.update(StatusBarState.SYNCED);
      await vscode.commands.executeCommand('setContext', 'docudepth.hasContextMap', true);

      // Start file watcher
      this.startFileWatcher(workspaceRoot);

      vscode.window.showInformationMessage(
        `Context map generated! ${result.tokens_used.toLocaleString()} tokens used.`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Generation failed';
      vscode.window.showErrorMessage(`Context map generation failed: ${message}`);
      this.statusBar.update(StatusBarState.ERROR);
    }
  }

  /**
   * Refresh/regenerate context map
   */
  async refresh(): Promise<void> {
    const confirmed = await vscode.window.showWarningMessage(
      'This will regenerate the entire context map. Continue?',
      'Yes',
      'No'
    );

    if (confirmed === 'Yes') {
      await this.initialize();
    }
  }

  /**
   * Copy context prompt to clipboard
   */
  async copyContextPrompt(): Promise<void> {
    const workspaceRoot = this.getWorkspaceRoot();
    if (!workspaceRoot) {
      vscode.window.showErrorMessage('No workspace folder open');
      return;
    }

    const contextMapPath = path.join(
      workspaceRoot,
      EXTENSION_CONSTANTS.docudepthDir,
      EXTENSION_CONSTANTS.contextMapFile
    );

    try {
      const contextMapContent = fs.readFileSync(contextMapPath, 'utf-8');
      const contextMap = JSON.parse(contextMapContent) as ContextMap;

      const prompt = this.generateContextPrompt(contextMap);
      await vscode.env.clipboard.writeText(prompt);

      vscode.window.showInformationMessage(
        'Context prompt copied to clipboard! Paste it into your AI assistant.'
      );
    } catch {
      vscode.window.showErrorMessage(
        'No context map found. Run "DocuDepth: Initialize Context Map" first.'
      );
    }
  }

  /**
   * Open context map in editor
   */
  async openContextMap(): Promise<void> {
    const workspaceRoot = this.getWorkspaceRoot();
    if (!workspaceRoot) {
      vscode.window.showErrorMessage('No workspace folder open');
      return;
    }

    const contextMapPath = path.join(
      workspaceRoot,
      EXTENSION_CONSTANTS.docudepthDir,
      EXTENSION_CONSTANTS.contextMapFile
    );

    try {
      const doc = await vscode.workspace.openTextDocument(contextMapPath);
      await vscode.window.showTextDocument(doc);
    } catch {
      vscode.window.showErrorMessage(
        'No context map found. Run "DocuDepth: Initialize Context Map" first.'
      );
    }
  }

  /**
   * Show generation progress
   */
  async showProgress(): Promise<void> {
    if (!this.currentContextMapId) {
      vscode.window.showInformationMessage('No generation in progress');
      return;
    }

    const idToken = await this.tokenManager.getIdToken();
    if (!idToken) {
      return;
    }

    try {
      const status = await apiClient.getStatus(idToken, this.currentContextMapId);
      vscode.window.showInformationMessage(
        `Generation: ${status.progress_percentage}% - ${status.progress_message}`
      );
    } catch {
      vscode.window.showErrorMessage('Failed to get generation status');
    }
  }

  /**
   * Handle file changes from watcher
   */
  async handleFileChanges(changes: FileChange[]): Promise<void> {
    console.log(`[DocuDepth] File changes detected: ${changes.length} files`);
    changes.forEach(c => console.log(`  ${c.changeType}: ${c.path}`));

    if (!this.currentContextMapId) {
      console.log('[DocuDepth] No context map ID - sync disabled. Initialize context map first.');
      return;
    }

    const config = vscode.workspace.getConfiguration('docudepth');
    if (!config.get<boolean>('autoSync')) {
      console.log('[DocuDepth] Auto-sync disabled in settings');
      return;
    }

    const idToken = await this.tokenManager.getIdToken();
    if (!idToken) {
      console.log('[DocuDepth] No auth token - user may need to re-login');
      return;
    }

    const maxFiles = config.get<number>('maxFilesPerBatch') || 50;
    const filesToUpdate = changes.slice(0, maxFiles);

    this.statusBar.update(StatusBarState.CHANGES_PENDING);
    console.log(`[DocuDepth] Syncing ${filesToUpdate.length} files to context map ${this.currentContextMapId}`);

    try {
      const response = await apiClient.updateContextMap(
        idToken,
        this.currentContextMapId,
        filesToUpdate
      );

      console.log(`[DocuDepth] Sync successful - ${response.tokens_used} tokens used`);
      this.currentContextMap = response.context_map;

      // Save updated context map
      const workspaceRoot = this.getWorkspaceRoot();
      if (workspaceRoot) {
        await this.saveContextMapLocally(workspaceRoot, response.context_map);
      }

      this.statusBar.update(StatusBarState.SYNCED);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[DocuDepth] Sync failed:', errorMessage);

      // Show error in output channel and status bar
      this.statusBar.update(StatusBarState.ERROR);

      // Only show notification for non-transient errors
      if (errorMessage.includes('not found') || errorMessage.includes('Unauthorized')) {
        vscode.window.showErrorMessage(`DocuDepth sync error: ${errorMessage}`);
      }
    }
  }

  /**
   * Check for existing context map on startup
   */
  async checkExistingContextMap(): Promise<void> {
    const workspaceRoot = this.getWorkspaceRoot();
    if (!workspaceRoot) {
      this.statusBar.update(StatusBarState.NEEDS_INIT);
      return;
    }

    const contextMapPath = path.join(
      workspaceRoot,
      EXTENSION_CONSTANTS.docudepthDir,
      EXTENSION_CONSTANTS.contextMapFile
    );

    const metadataPath = path.join(
      workspaceRoot,
      EXTENSION_CONSTANTS.docudepthDir,
      EXTENSION_CONSTANTS.metadataFile
    );

    try {
      const contextMapContent = fs.readFileSync(contextMapPath, 'utf-8');
      this.currentContextMap = JSON.parse(contextMapContent);

      // Try to read metadata for context map ID
      try {
        const metadataContent = fs.readFileSync(metadataPath, 'utf-8');
        const metadata = JSON.parse(metadataContent);
        this.currentContextMapId = metadata.contextMapId;
      } catch {
        // No metadata, but we have a context map
      }

      await vscode.commands.executeCommand('setContext', 'docudepth.hasContextMap', true);
      this.statusBar.update(StatusBarState.SYNCED);

      // Start file watcher
      this.startFileWatcher(workspaceRoot);
    } catch {
      // No existing context map
      this.statusBar.update(StatusBarState.NEEDS_INIT);
    }
  }

  /**
   * Start file watcher for workspace
   */
  private startFileWatcher(workspaceRoot: string): void {
    this.stopFileWatcher();

    this.fileWatcher = new FileWatcher(workspaceRoot);
    this.fileWatcher.start((changes) => {
      this.handleFileChanges(changes);
    });
  }

  /**
   * Stop file watcher
   */
  private stopFileWatcher(): void {
    if (this.fileWatcher) {
      this.fileWatcher.stop();
      this.fileWatcher = null;
    }
  }

  /**
   * Poll for generation completion
   */
  private async pollForCompletion(
    idToken: string,
    contextMapId: string,
    onProgress: (progress: number, message: string) => void
  ): Promise<void> {
    const pollInterval = 2000; // 2 seconds
    const maxAttempts = 900; // 30 minutes max for large codebases

    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((resolve) => setTimeout(resolve, pollInterval));

      const status = await apiClient.getStatus(idToken, contextMapId);

      onProgress(status.progress_percentage, status.progress_message);

      if (status.status === 'completed') {
        return;
      }

      if (status.status === 'failed') {
        throw new Error(status.error_message || 'Generation failed');
      }
    }

    throw new Error('Generation timed out');
  }

  /**
   * Save context map to local .docudepth directory
   */
  private async saveContextMapLocally(
    workspaceRoot: string,
    contextMap: ContextMap
  ): Promise<void> {
    const docudepthDir = path.join(workspaceRoot, EXTENSION_CONSTANTS.docudepthDir);

    // Create directory if it doesn't exist
    if (!fs.existsSync(docudepthDir)) {
      fs.mkdirSync(docudepthDir, { recursive: true });
    }

    // Save context map
    const contextMapPath = path.join(docudepthDir, EXTENSION_CONSTANTS.contextMapFile);
    fs.writeFileSync(contextMapPath, JSON.stringify(contextMap, null, 2));

    // Save metadata
    const metadataPath = path.join(docudepthDir, EXTENSION_CONSTANTS.metadataFile);
    const metadata = {
      contextMapId: this.currentContextMapId,
      lastUpdated: new Date().toISOString(),
      version: contextMap.version,
    };
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    // Generate context files for all AI tools (Claude, Cursor, Copilot, etc.)
    const generator = new ContextFileGenerator(workspaceRoot);
    await generator.generateAll(contextMap);

    // Add generated files to .gitignore if not already there
    await this.ensureGitignore(workspaceRoot);
  }

  /**
   * Ensure DocuDepth generated files are in .gitignore
   */
  private async ensureGitignore(workspaceRoot: string): Promise<void> {
    const gitignorePath = path.join(workspaceRoot, '.gitignore');

    // Files to add to gitignore (generated by DocuDepth)
    const docudepthFiles = [
      '.docudepth/',
      'CLAUDE.md',
      '.cursorrules',
      '.windsurfrules',
      '.continuerules',
      '.aider/',
    ];

    try {
      let content = '';
      try {
        content = fs.readFileSync(gitignorePath, 'utf-8');
      } catch {
        // No .gitignore yet
      }

      // Add DocuDepth section if any files are missing
      const missingFiles = docudepthFiles.filter(f => !content.includes(f));

      if (missingFiles.length > 0) {
        let newContent = content;
        if (!newContent.endsWith('\n')) {
          newContent += '\n';
        }

        // Add section header if we're adding new files
        if (!content.includes('# DocuDepth')) {
          newContent += '\n# DocuDepth AI generated files\n';
        }

        for (const file of missingFiles) {
          newContent += `${file}\n`;
        }

        fs.writeFileSync(gitignorePath, newContent);
      }
    } catch {
      // Ignore errors when updating .gitignore
    }
  }

  /**
   * Generate context prompt for AI assistants
   */
  private generateContextPrompt(contextMap: ContextMap): string {
    const { repository, architecture, modules, patterns } = contextMap;

    let prompt = `# Codebase Context: ${repository.name}\n\n`;
    prompt += `## Overview\n`;
    prompt += `- **Primary Language**: ${repository.primaryLanguage}\n`;
    if (repository.framework) {
      prompt += `- **Framework**: ${repository.framework}\n`;
    }
    prompt += `- **Total Files**: ${repository.totalFiles}\n`;
    if (repository.description) {
      prompt += `- **Description**: ${repository.description}\n`;
    }
    prompt += '\n';

    prompt += `## Architecture\n`;
    prompt += `- **Style**: ${architecture.style}\n`;
    prompt += `- **Summary**: ${architecture.summary}\n\n`;

    if (modules.length > 0) {
      prompt += `## Modules\n`;
      for (const module of modules) {
        prompt += `### ${module.name}\n`;
        prompt += `- **Path**: ${module.path}\n`;
        prompt += `- **Purpose**: ${module.purpose}\n`;
        if (module.publicAPI.length > 0) {
          prompt += `- **Public API**: ${module.publicAPI.slice(0, 5).join(', ')}${module.publicAPI.length > 5 ? '...' : ''}\n`;
        }
        prompt += '\n';
      }
    }

    if (patterns.length > 0) {
      prompt += `## Patterns\n`;
      for (const pattern of patterns) {
        prompt += `- **${pattern.name}**: ${pattern.description}\n`;
      }
      prompt += '\n';
    }

    prompt += `---\n`;
    prompt += `*Use this context to understand the codebase structure when assisting with code changes.*\n`;

    return prompt;
  }

  /**
   * Get workspace root folder
   */
  private getWorkspaceRoot(): string | undefined {
    const folders = vscode.workspace.workspaceFolders;
    if (folders && folders.length > 0) {
      return folders[0].uri.fsPath;
    }
    return undefined;
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.stopFileWatcher();
  }
}
