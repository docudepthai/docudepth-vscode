/**
 * Context map structure (matches server schema)
 */
export interface ContextMap {
  version: string;
  generatedAt: string;
  repository: {
    name: string;
    description?: string;
    primaryLanguage: string;
    framework?: string;
    totalFiles: number;
    totalTokens: number;
  };
  architecture: {
    style: string;
    summary: string;
    diagram?: string;
  };
  modules: Module[];
  files: Record<string, FileInfo>;
  symbols: Record<string, Symbol>;
  dependencies: {
    edges: DependencyEdge[];
    circularDependencies: string[][];
    externalPackages: ExternalPackage[];
  };
  patterns: Pattern[];
}

export interface Module {
  name: string;
  path: string;
  purpose: string;
  files: string[];
  publicAPI: string[];
  dependencies: string[];
}

export interface FileInfo {
  path: string;
  language: string;
  purpose: string;
  role: string;
  exports: string[];
  complexity: 'low' | 'medium' | 'high';
}

export interface Symbol {
  name: string;
  kind: string;
  signature?: string;
  description: string;
  location: {
    file: string;
    line: number;
  };
  exported: boolean;
}

export interface DependencyEdge {
  source: string;
  target: string;
  type: string;
  symbols: string[];
}

export interface ExternalPackage {
  name: string;
  version?: string;
  usedIn: string[];
}

export interface Pattern {
  name: string;
  description: string;
  files: string[];
}

/**
 * API response types
 */
export interface AnalyzeResponse {
  context_map_id: string;
  status: string;
  estimated_time: string;
  estimated_tokens?: number;
}

export interface StatusResponse {
  context_map_id: string;
  status: string;
  progress_percentage: number;
  progress_message: string;
  tokens_used?: number;
  error_message?: string;
}

export interface ResultResponse {
  context_map_id: string;
  status: string;
  repository_name: string;
  generated_at: string;
  tokens_used: number;
  context_map: ContextMap;
  error_message?: string;
}

export interface UpdateResponse {
  context_map_id: string;
  status: string;
  tokens_used: number;
  affected_modules: string[];
  updated_files: string[];
  context_map: ContextMap;
}

/**
 * File change for updates
 */
export interface FileChange {
  path: string;
  changeType: 'added' | 'modified' | 'deleted';
  content?: string;
}

/**
 * Extension state
 */
export interface ExtensionState {
  isAuthenticated: boolean;
  hasContextMap: boolean;
  contextMapId?: string;
  pendingChanges: FileChange[];
  isGenerating: boolean;
  generationProgress?: number;
}
