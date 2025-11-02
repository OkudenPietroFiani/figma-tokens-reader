// Type definitions for W3C Design Tokens Importer

export interface DesignToken {
  $value?: any;
  $type?: string;
  $description?: string;
  [key: string]: any;
}

export interface TokenData {
  [key: string]: DesignToken | any;
}

export interface ProcessedToken {
  path: string[];
  value: any;
  type: string;
  originalValue?: any;
}

export interface ImportStats {
  added: number;
  updated: number;
  skipped: number;
}

export interface TokenMetadata {
  name: string;
  fullPath: string;
  type: string;
  value: any;
  originalValue: any;
  description?: string;
  aliasTo?: string;
  collection: string;
}

export interface ProcessedValue {
  value: any;
  isAlias: boolean;
  aliasVariable?: Variable;
}

export interface ScopeAssignments {
  [tokenPath: string]: string[]; // Maps token path to array of scope strings
}

export interface PluginMessage {
  type: string;
  data?: any;
  scopeAssignments?: ScopeAssignments;
}
