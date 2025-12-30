import * as vscode from 'vscode';
import { TokenManager } from './auth/tokenManager';
import { OAuthUriHandler } from './auth/oauthHandler';
import { StatusBarManager } from './ui/statusBar';
import { CommandHandlers } from './commands';
import { StatusBarState } from './config/constants';

let commandHandlers: CommandHandlers | null = null;
let statusBar: StatusBarManager | null = null;
let outputChannel: vscode.OutputChannel | null = null;
let oauthHandler: OAuthUriHandler | null = null;

/**
 * Extension activation
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  // Create output channel for debugging
  outputChannel = vscode.window.createOutputChannel('DocuDepth');
  outputChannel.appendLine('DocuDepth extension activating...');

  try {
    // Initialize managers
    const tokenManager = new TokenManager(context);
    statusBar = new StatusBarManager();

    // Initialize OAuth handler and register it
    oauthHandler = new OAuthUriHandler(context);
    context.subscriptions.push(vscode.window.registerUriHandler(oauthHandler));
    outputChannel.appendLine('OAuth URI handler registered');

    commandHandlers = new CommandHandlers(context, tokenManager, statusBar, oauthHandler);

    // Register commands
    const loginCommand = vscode.commands.registerCommand('docudepth.login', async () => {
      try {
        await commandHandlers?.login();
      } catch (error) {
        outputChannel?.appendLine(`Login error: ${error}`);
        vscode.window.showErrorMessage(`DocuDepth login failed: ${error}`);
      }
    });

    const logoutCommand = vscode.commands.registerCommand('docudepth.logout', async () => {
      try {
        await commandHandlers?.logout();
      } catch (error) {
        outputChannel?.appendLine(`Logout error: ${error}`);
      }
    });

    const initializeCommand = vscode.commands.registerCommand('docudepth.initialize', async () => {
      try {
        await commandHandlers?.initialize();
      } catch (error) {
        outputChannel?.appendLine(`Initialize error: ${error}`);
        vscode.window.showErrorMessage(`DocuDepth initialization failed: ${error}`);
      }
    });

    const refreshCommand = vscode.commands.registerCommand('docudepth.refresh', async () => {
      try {
        await commandHandlers?.refresh();
      } catch (error) {
        outputChannel?.appendLine(`Refresh error: ${error}`);
      }
    });

    const copyContextPromptCommand = vscode.commands.registerCommand(
      'docudepth.copyContextPrompt',
      async () => {
        try {
          await commandHandlers?.copyContextPrompt();
        } catch (error) {
          outputChannel?.appendLine(`Copy context error: ${error}`);
        }
      }
    );

    const openContextMapCommand = vscode.commands.registerCommand('docudepth.openContextMap', async () => {
      try {
        await commandHandlers?.openContextMap();
      } catch (error) {
        outputChannel?.appendLine(`Open context map error: ${error}`);
      }
    });

    const showProgressCommand = vscode.commands.registerCommand('docudepth.showProgress', async () => {
      try {
        await commandHandlers?.showProgress();
      } catch (error) {
        outputChannel?.appendLine(`Show progress error: ${error}`);
      }
    });

    // Add to subscriptions
    context.subscriptions.push(
      loginCommand,
      logoutCommand,
      initializeCommand,
      refreshCommand,
      copyContextPromptCommand,
      openContextMapCommand,
      showProgressCommand,
      statusBar,
      outputChannel
    );

    outputChannel.appendLine('Commands registered successfully');

    // Check authentication status on startup
    try {
      const isAuthenticated = await tokenManager.isAuthenticated();
      await vscode.commands.executeCommand('setContext', 'docudepth.isAuthenticated', isAuthenticated);

      if (isAuthenticated) {
        const email = await tokenManager.getEmail();
        outputChannel.appendLine(`User authenticated: ${email}`);
        // Check for existing context map
        await commandHandlers.checkExistingContextMap();
      } else {
        statusBar.update(StatusBarState.NOT_AUTHENTICATED);
        outputChannel.appendLine('User not authenticated');
      }
    } catch (error) {
      outputChannel.appendLine(`Error checking auth status: ${error}`);
      statusBar.update(StatusBarState.NOT_AUTHENTICATED);
    }

    outputChannel.appendLine('DocuDepth extension activated successfully');
  } catch (error) {
    // Critical activation error
    const errorMessage = error instanceof Error ? error.message : String(error);
    outputChannel?.appendLine(`CRITICAL: Extension activation failed: ${errorMessage}`);
    vscode.window.showErrorMessage(`DocuDepth failed to activate: ${errorMessage}`);
    throw error;
  }
}

/**
 * Extension deactivation
 */
export function deactivate(): void {
  console.log('DocuDepth extension deactivating...');

  if (commandHandlers) {
    commandHandlers.dispose();
    commandHandlers = null;
  }

  if (statusBar) {
    statusBar.dispose();
    statusBar = null;
  }

  console.log('DocuDepth extension deactivated');
}
