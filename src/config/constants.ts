/**
 * Cognito configuration (matches frontend)
 */
export const COGNITO_CONFIG = {
  userPoolId: 'us-east-2_2CIGCcS1A',
  clientId: 'rabac37l3srff107rev94uo0',
  region: 'us-east-2',
};

/**
 * API configuration
 */
export const API_CONFIG = {
  defaultEndpoint: 'https://9grz9fdho6.execute-api.us-east-2.amazonaws.com/prod',
};

/**
 * Extension constants
 */
export const EXTENSION_CONSTANTS = {
  docudepthDir: '.docudepth',
  contextMapFile: 'context-map.json',
  metadataFile: 'metadata.json',
};

/**
 * Status bar states
 */
export enum StatusBarState {
  NOT_AUTHENTICATED = 'not_authenticated',
  NEEDS_INIT = 'needs_init',
  GENERATING = 'generating',
  SYNCED = 'synced',
  CHANGES_PENDING = 'changes_pending',
  ERROR = 'error',
}
