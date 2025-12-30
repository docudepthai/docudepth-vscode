import * as vscode from 'vscode';

/**
 * Pending login state for OAuth flow
 */
interface PendingLogin {
  resolve: (value: { idToken: string; email: string }) => void;
  reject: (reason: Error) => void;
  timeout: NodeJS.Timeout;
}

/**
 * OAuth URI Handler for browser-based login
 */
export class OAuthUriHandler implements vscode.UriHandler {
  private pendingLogin: PendingLogin | null = null;
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  /**
   * Handle incoming URI from browser redirect
   * Expected format: vscode://docudepthai.docudepth-vscode/auth?token=xxx&email=xxx
   */
  async handleUri(uri: vscode.Uri): Promise<void> {
    console.log('[DocuDepth] Received URI:', uri.toString());

    if (uri.path === '/auth' || uri.path === '/callback') {
      const params = new URLSearchParams(uri.query);
      const token = params.get('token');
      const email = params.get('email');
      const error = params.get('error');

      if (error) {
        this.rejectPendingLogin(new Error(error));
        vscode.window.showErrorMessage(`Login failed: ${error}`);
        return;
      }

      if (token && email) {
        // Store tokens securely
        await this.context.secrets.store('docudepth.idToken', token);
        await this.context.secrets.store('docudepth.email', email);

        this.resolvePendingLogin({ idToken: token, email });
        vscode.window.showInformationMessage(`Successfully logged in as ${email}`);
      } else {
        this.rejectPendingLogin(new Error('Invalid callback - missing token or email'));
        vscode.window.showErrorMessage('Login failed: Invalid callback');
      }
    }
  }

  /**
   * Start OAuth login flow
   */
  async startLogin(): Promise<{ idToken: string; email: string }> {
    // Cancel any existing pending login
    if (this.pendingLogin) {
      clearTimeout(this.pendingLogin.timeout);
      this.pendingLogin.reject(new Error('Login cancelled'));
      this.pendingLogin = null;
    }

    return new Promise((resolve, reject) => {
      // Set 5 minute timeout
      const timeout = setTimeout(() => {
        this.pendingLogin = null;
        reject(new Error('Login timed out. Please try again.'));
      }, 5 * 60 * 1000);

      this.pendingLogin = { resolve, reject, timeout };

      // Open browser to login page
      const loginUrl = 'https://docudepthai.com/vscode-auth';
      vscode.env.openExternal(vscode.Uri.parse(loginUrl));
    });
  }

  /**
   * Resolve pending login
   */
  private resolvePendingLogin(result: { idToken: string; email: string }): void {
    if (this.pendingLogin) {
      clearTimeout(this.pendingLogin.timeout);
      this.pendingLogin.resolve(result);
      this.pendingLogin = null;
    }
  }

  /**
   * Reject pending login
   */
  private rejectPendingLogin(error: Error): void {
    if (this.pendingLogin) {
      clearTimeout(this.pendingLogin.timeout);
      this.pendingLogin.reject(error);
      this.pendingLogin = null;
    }
  }
}
