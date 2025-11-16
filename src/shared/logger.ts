// ====================================================================================
// SIMPLE LOGGER
// Respects DEBUG_MODE feature flag to reduce console noise in production
// ====================================================================================

import { isFeatureEnabled } from '../core/config/FeatureFlags';

/**
 * Debug logger that only outputs when DEBUG_MODE is enabled
 * Use this instead of console.log for development/diagnostic logging
 */
export const debug = {
  log: (...args: any[]) => {
    if (isFeatureEnabled('DEBUG_MODE')) {
      console.log(...args);
    }
  },

  group: (label: string) => {
    if (isFeatureEnabled('DEBUG_MODE')) {
      console.group(label);
    }
  },

  groupEnd: () => {
    if (isFeatureEnabled('DEBUG_MODE')) {
      console.groupEnd();
    }
  },
};

/**
 * Always log warnings (not gated by DEBUG_MODE)
 */
export const warn = (...args: any[]) => {
  console.warn(...args);
};

/**
 * Always log errors (not gated by DEBUG_MODE)
 */
export const error = (...args: any[]) => {
  console.error(...args);
};
