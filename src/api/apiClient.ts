import * as vscode from 'vscode';
import { API_CONFIG } from '../config/constants';
import {
  AnalyzeResponse,
  StatusResponse,
  ResultResponse,
  UpdateResponse,
  FileChange,
} from '../types';

/**
 * API client for DocuDepth backend
 */
export class ApiClient {
  private getApiEndpoint(): string {
    const config = vscode.workspace.getConfiguration('docudepth');
    return config.get<string>('apiEndpoint') || API_CONFIG.defaultEndpoint;
  }

  /**
   * Make authenticated request to the API
   */
  private async request<T>(
    path: string,
    options: {
      method: 'GET' | 'POST' | 'DELETE';
      body?: unknown;
      idToken: string;
    }
  ): Promise<T> {
    const endpoint = this.getApiEndpoint();
    const url = `${endpoint}${path}`;

    const response = await fetch(url, {
      method: options.method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${options.idToken}`,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage: string;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error || errorJson.message || errorText;
      } catch {
        errorMessage = errorText || `HTTP ${response.status}`;
      }
      throw new Error(errorMessage);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Start context map generation
   */
  async analyzeRepository(
    idToken: string,
    files: Array<{ path: string; content: string }>,
    repoMetadata: {
      name: string;
      readme?: string;
      packageJson?: unknown;
      gitIgnore?: string;
    }
  ): Promise<AnalyzeResponse> {
    return this.request<AnalyzeResponse>('/api/context-map/analyze', {
      method: 'POST',
      idToken,
      body: {
        source_type: 'direct',
        files,
        repo_metadata: repoMetadata,
      },
    });
  }

  /**
   * Update context map with file changes
   */
  async updateContextMap(
    idToken: string,
    contextMapId: string,
    changes: FileChange[]
  ): Promise<UpdateResponse> {
    return this.request<UpdateResponse>('/api/context-map/update', {
      method: 'POST',
      idToken,
      body: {
        context_map_id: contextMapId,
        changes: changes.map((c) => ({
          path: c.path,
          change_type: c.changeType,
          content: c.content,
        })),
      },
    });
  }

  /**
   * Get context map status
   */
  async getStatus(idToken: string, contextMapId: string): Promise<StatusResponse> {
    return this.request<StatusResponse>(`/api/context-map/${contextMapId}/status`, {
      method: 'GET',
      idToken,
    });
  }

  /**
   * Get completed context map
   */
  async getResult(idToken: string, contextMapId: string): Promise<ResultResponse> {
    return this.request<ResultResponse>(`/api/context-map/${contextMapId}`, {
      method: 'GET',
      idToken,
    });
  }

  /**
   * List user's context maps
   */
  async listContextMaps(
    idToken: string
  ): Promise<{ context_maps: Array<{ id: string; repository_name: string; status: string }> }> {
    return this.request(`/api/context-map/list`, {
      method: 'GET',
      idToken,
    });
  }

  /**
   * Delete a context map
   */
  async deleteContextMap(idToken: string, contextMapId: string): Promise<{ success: boolean }> {
    return this.request(`/api/context-map/${contextMapId}`, {
      method: 'DELETE',
      idToken,
    });
  }
}

/**
 * Singleton API client instance
 */
export const apiClient = new ApiClient();
