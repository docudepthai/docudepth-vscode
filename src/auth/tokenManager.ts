import * as vscode from 'vscode';

/**
 * Token manager for secure storage - works with browser OAuth
 */
export class TokenManager {
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  /**
   * Store tokens after OAuth login
   */
  async storeTokens(idToken: string, email: string, refreshToken?: string): Promise<void> {
    await this.context.secrets.store('docudepth.idToken', idToken);
    await this.context.secrets.store('docudepth.email', email);
    if (refreshToken) {
      await this.context.secrets.store('docudepth.refreshToken', refreshToken);
    }
  }

  /**
   * Logout and clear tokens
   */
  async logout(): Promise<void> {
    await this.context.secrets.delete('docudepth.idToken');
    await this.context.secrets.delete('docudepth.refreshToken');
    await this.context.secrets.delete('docudepth.email');
  }

  /**
   * Get valid ID token
   */
  async getIdToken(): Promise<string | null> {
    const token = await this.context.secrets.get('docudepth.idToken');
    if (!token) {
      return null;
    }

    // Check if token is expired
    if (this.isTokenExpired(token)) {
      // Try to refresh
      const refreshed = await this.refreshToken();
      if (refreshed) {
        return await this.context.secrets.get('docudepth.idToken') || null;
      }
      return null;
    }

    return token;
  }

  /**
   * Check if authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getIdToken();
    return token !== null;
  }

  /**
   * Get stored email
   */
  async getEmail(): Promise<string | null> {
    return await this.context.secrets.get('docudepth.email') || null;
  }

  /**
   * Check if JWT token is expired
   */
  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp;
      if (!exp) {
        return false;
      }
      // Add 60 second buffer
      return Date.now() >= (exp * 1000) - 60000;
    } catch {
      return true;
    }
  }

  /**
   * Refresh the token using the API
   */
  private async refreshToken(): Promise<boolean> {
    const refreshToken = await this.context.secrets.get('docudepth.refreshToken');
    if (!refreshToken) {
      return false;
    }

    try {
      const config = vscode.workspace.getConfiguration('docudepth');
      const apiEndpoint = config.get<string>('apiEndpoint') || 'https://yi4c537i4h.execute-api.us-east-2.amazonaws.com/prod';

      const response = await fetch(`${apiEndpoint}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json() as { idToken: string };
      await this.context.secrets.store('docudepth.idToken', data.idToken);
      return true;
    } catch {
      return false;
    }
  }
}
