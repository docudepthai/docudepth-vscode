import * as vscode from 'vscode';
import { StatusBarState } from '../config/constants';

/**
 * Status bar manager for DocuDepth
 */
export class StatusBarManager {
  private statusBarItem: vscode.StatusBarItem;
  private state: StatusBarState = StatusBarState.NOT_AUTHENTICATED;
  private progressPercentage: number = 0;

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.name = 'DocuDepth';
    this.update(StatusBarState.NOT_AUTHENTICATED);
  }

  /**
   * Update status bar state
   */
  update(state: StatusBarState, progress?: number): void {
    this.state = state;
    if (progress !== undefined) {
      this.progressPercentage = progress;
    }

    switch (state) {
      case StatusBarState.NOT_AUTHENTICATED:
        this.statusBarItem.text = '$(key) DocuDepth: Login';
        this.statusBarItem.tooltip = 'Click to login to DocuDepth';
        this.statusBarItem.command = 'docudepth.login';
        this.statusBarItem.backgroundColor = undefined;
        break;

      case StatusBarState.NEEDS_INIT:
        this.statusBarItem.text = '$(file-code) DocuDepth: Initialize';
        this.statusBarItem.tooltip = 'Click to generate context map for this workspace';
        this.statusBarItem.command = 'docudepth.initialize';
        this.statusBarItem.backgroundColor = undefined;
        break;

      case StatusBarState.GENERATING:
        const progressText = this.progressPercentage > 0
          ? ` ${this.progressPercentage}%`
          : '';
        this.statusBarItem.text = `$(sync~spin) DocuDepth: Generating${progressText}`;
        this.statusBarItem.tooltip = 'Context map generation in progress. Click for details.';
        this.statusBarItem.command = 'docudepth.showProgress';
        this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        break;

      case StatusBarState.SYNCED:
        this.statusBarItem.text = '$(check) DocuDepth: Synced';
        this.statusBarItem.tooltip = 'Context map is up to date. Click to copy context prompt.';
        this.statusBarItem.command = 'docudepth.copyContextPrompt';
        this.statusBarItem.backgroundColor = undefined;
        break;

      case StatusBarState.CHANGES_PENDING:
        this.statusBarItem.text = '$(cloud-upload) DocuDepth: Syncing...';
        this.statusBarItem.tooltip = 'Updating context map with recent changes';
        this.statusBarItem.command = 'docudepth.showProgress';
        this.statusBarItem.backgroundColor = undefined;
        break;

      case StatusBarState.ERROR:
        this.statusBarItem.text = '$(error) DocuDepth: Error';
        this.statusBarItem.tooltip = 'An error occurred. Click to retry.';
        this.statusBarItem.command = 'docudepth.initialize';
        this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
        break;
    }

    this.statusBarItem.show();
  }

  /**
   * Get current state
   */
  getState(): StatusBarState {
    return this.state;
  }

  /**
   * Show the status bar
   */
  show(): void {
    this.statusBarItem.show();
  }

  /**
   * Hide the status bar
   */
  hide(): void {
    this.statusBarItem.hide();
  }

  /**
   * Dispose the status bar
   */
  dispose(): void {
    this.statusBarItem.dispose();
  }
}

/**
 * Progress notification for generation
 */
export class ProgressNotification {
  private progress: vscode.Progress<{ message?: string; increment?: number }> | null = null;
  private resolve: (() => void) | null = null;

  /**
   * Show progress notification
   */
  async show(title: string): Promise<void> {
    return vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title,
        cancellable: false,
      },
      async (progress) => {
        this.progress = progress;
        return new Promise<void>((resolve) => {
          this.resolve = resolve;
        });
      }
    );
  }

  /**
   * Update progress
   */
  update(message: string, increment?: number): void {
    if (this.progress) {
      this.progress.report({ message, increment });
    }
  }

  /**
   * Complete the progress
   */
  complete(): void {
    if (this.resolve) {
      this.resolve();
      this.progress = null;
      this.resolve = null;
    }
  }
}
