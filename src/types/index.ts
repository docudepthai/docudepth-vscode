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
    totalTokens?: number;
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
    edges?: DependencyEdge[];
    circularDependencies?: string[][];
    externalPackages?: ExternalPackage[];
    internal?: InternalDependency[];
    external?: ExternalDependency[];
  };
  patterns: Pattern[];
  // Extended fields for better AI context
  api?: ApiInfo;
  aiGuidance?: AIGuidance;
  semanticSearch?: SemanticSearch;
  configurationGuide?: ConfigurationGuide;
}

export interface Module {
  name: string;
  path: string;
  purpose: string;
  files: string[];
  publicAPI: string[];
  dependencies: string[];
  // Extended fields
  architectureRole?: string;
  businessContext?: string;
  gotchas?: string[];
  aiSummary?: string;
}

export interface FileInfo {
  path: string;
  language: string;
  purpose: string;
  role: string;
  exports: string[] | ExportInfo[];
  complexity: 'low' | 'medium' | 'high';
  architectureSignificance?: 'critical' | 'important' | 'supporting';
}

export interface ExportInfo {
  name: string;
  type: string;
  description: string;
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

export interface InternalDependency {
  source: string;
  target: string;
  relationship?: string;
  coupling?: string;
  reason?: string;
}

export interface ExternalDependency {
  package: string;
  version?: string;
  purpose?: string;
  usedIn?: string[];
  importantAPIs?: string[];
  alternatives?: string;
  notes?: string;
}

export interface Pattern {
  name: string;
  description: string;
  files: string[];
  rules?: string[];
  examples?: {
    correct?: string;
    incorrect?: string;
  };
}

export interface ApiInfo {
  overview?: string;
  baseUrl?: string;
  authentication?: string;
  endpoints?: ApiEndpoint[];
}

export interface ApiEndpoint {
  method: string;
  path: string;
  handler?: string;
  file?: string;
  purpose?: string;
}

export interface AIGuidance {
  mustFollow?: string[];
  mustAvoid?: string[];
  commonTasks?: Record<string, CommonTask>;
  projectSpecificKnowledge?: string[];
}

export interface CommonTask {
  approach: string;
  files?: string[];
  example?: string;
}

export interface SemanticSearch {
  byFeature?: Record<string, FeatureInfo>;
  byTask?: Record<string, TaskGuide>;
  byConcept?: Record<string, string[]>;
}

export interface FeatureInfo {
  description?: string;
  files?: string[];
  entryPoints?: string[];
  modifyingThisFeature?: string;
}

export interface TaskGuide {
  files?: string[];
  steps?: string[];
  template?: string;
  warnings?: string[];
}

export interface ConfigurationGuide {
  envVariables?: EnvVariable[];
  configFiles?: ConfigFile[];
  secrets?: string;
}

export interface EnvVariable {
  name: string;
  purpose?: string;
  required?: boolean;
  default?: string;
  example?: string;
  sensitive?: boolean;
}

export interface ConfigFile {
  file: string;
  purpose?: string;
  format?: string;
  keySettings?: string[];
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
