// ====================================================================================
// FEATURE FLAGS
// Control rollout of new features for safe experimentation
// ====================================================================================

/**
 * Feature flags for development and experimental features
 *
 * All flags default to FALSE for safety
 *
 * Usage:
 * ```typescript
 * import { isFeatureEnabled } from './config/FeatureFlags';
 *
 * if (isFeatureEnabled('DEBUG_MODE')) {
 *   debug.log('Debug information...');
 * }
 * ```
 */
export const FeatureFlags: Record<string, boolean> = {
  /**
   * Development/testing flags
   */

  /**
   * Enable verbose debug logging
   * Controls debug.log() output from shared/logger.ts
   * Outputs detailed information about token processing
   *
   * Default: false
   */
  DEBUG_MODE: false,

  /**
   * Dry run mode - validate without syncing to Figma
   * Useful for testing validation without modifying Figma
   *
   * Default: false
   */
  DRY_RUN: false,

  /**
   * Experimental features (not yet implemented - reserved for future use)
   */

  /**
   * Unified project ID system
   * All files import with single project ID
   *
   * Default: false
   */
  UNIFIED_PROJECT_ID: false,

  /**
   * Cross-project reference support
   * Allow references across project boundaries
   *
   * Default: false
   */
  CROSS_PROJECT_REFS: false,

  /**
   * Sync state tracking
   * Track synced/modified/pending/error status
   *
   * Default: false
   */
  SYNC_STATE_TRACKING: false,

  /**
   * Transactional sync
   * Atomic sync operations with rollback
   *
   * Default: false
   */
  TRANSACTION_SYNC: false,
};

/**
 * Type for feature flag keys
 */
export type FeatureFlagKey = keyof typeof FeatureFlags;

/**
 * Check if a feature is enabled
 *
 * @param flag - Feature flag to check
 * @returns true if enabled
 */
export function isFeatureEnabled(flag: FeatureFlagKey): boolean {
  return FeatureFlags[flag] === true;
}

/**
 * Enable a feature flag (for testing)
 * Note: This only works in development
 *
 * @param flag - Feature flag to enable
 */
export function enableFeature(flag: FeatureFlagKey): void {
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    (FeatureFlags as any)[flag] = true;
    console.log(`[FeatureFlags] Enabled: ${flag}`);
  } else {
    console.warn(`[FeatureFlags] Cannot enable ${flag} in production`);
  }
}

/**
 * Disable a feature flag (for testing)
 *
 * @param flag - Feature flag to disable
 */
export function disableFeature(flag: FeatureFlagKey): void {
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    (FeatureFlags as any)[flag] = false;
    console.log(`[FeatureFlags] Disabled: ${flag}`);
  } else {
    console.warn(`[FeatureFlags] Cannot disable ${flag} in production`);
  }
}

/**
 * Get all enabled features
 *
 * @returns Array of enabled feature names
 */
export function getEnabledFeatures(): FeatureFlagKey[] {
  return (Object.keys(FeatureFlags) as FeatureFlagKey[]).filter(
    key => FeatureFlags[key] === true
  );
}

/**
 * Log current feature flag status
 */
export function logFeatureFlags(): void {
  console.group('[FeatureFlags] Current Configuration');

  const enabled = getEnabledFeatures();
  const disabled = (Object.keys(FeatureFlags) as FeatureFlagKey[]).filter(
    key => FeatureFlags[key] === false
  );

  if (enabled.length > 0) {
    console.group('✓ Enabled Features');
    enabled.forEach(flag => console.log(`  - ${flag}`));
    console.groupEnd();
  }

  if (disabled.length > 0) {
    console.group('✗ Disabled Features');
    disabled.forEach(flag => console.log(`  - ${flag}`));
    console.groupEnd();
  }

  console.groupEnd();
}
