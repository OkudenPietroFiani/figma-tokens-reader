// ====================================================================================
// FEATURE FLAGS
// Control rollout of new features for safe experimentation
// ====================================================================================

/**
 * Feature flags for gradual rollout of improvements
 *
 * All flags default to FALSE for safety
 * Enable incrementally to test features
 *
 * Usage:
 * ```typescript
 * import { FeatureFlags } from './config/FeatureFlags';
 *
 * if (FeatureFlags.DISCRIMINATED_UNION_TYPES) {
 *   // Use new type system
 * } else {
 *   // Use legacy types
 * }
 * ```
 */
export const FeatureFlags: Record<string, boolean> = {
  /**
   * Phase 1.1: Use discriminated union types for Token
   * - Compile-time type safety (type determines value type)
   * - Type guards for type narrowing
   *
   * Default: false (use legacy Token interface)
   */
  DISCRIMINATED_UNION_TYPES: false,

  /**
   * Phase 1.2: Runtime validation with Zod schemas
   * - Validate tokens at parse time
   * - Validate tokens at repository add time
   * - Structured validation errors
   *
   * Default: false (no runtime validation)
   */
  ZOD_VALIDATION: false,

  /**
   * Phase 1.3: Use type-safe converters
   * - Type-safe value conversions (ColorValue → RGB, etc.)
   * - Structured error handling with Result pattern
   * - Detailed conversion errors
   *
   * Default: false (use legacy conversion functions)
   */
  TYPE_SAFE_CONVERTERS: false,

  /**
   * Phase 2.1: Unified project ID system
   * - All files import with single project ID
   * - User configures project in UI
   * - Auto-migration for existing tokens
   *
   * Default: false (each file gets separate project ID)
   */
  UNIFIED_PROJECT_ID: false,

  /**
   * Phase 2.2: Cross-project reference support
   * - Allow references across project boundaries
   * - Project registry for lookups
   * - Requires UNIFIED_PROJECT_ID to be enabled
   *
   * Default: false (references only within same project)
   */
  CROSS_PROJECT_REFS: false,

  /**
   * Phase 2.3: Pre-sync validation
   * - Validate all tokens before creating Figma objects
   * - Detect cross-project refs, circular deps, missing values
   * - Report all errors with actionable fixes
   *
   * Default: false (validation happens during sync)
   */
  PRE_SYNC_VALIDATION: false,

  /**
   * Phase 4.1: Structured logging
   * - Consistent log format with context
   * - Log levels (DEBUG, INFO, WARN, ERROR)
   * - Collapsible console groups
   *
   * Default: false (use console.log directly)
   */
  STRUCTURED_LOGGING: false,

  /**
   * Phase 4.2: Sync state tracking
   * - Track synced/modified/pending/error status
   * - Maintain sync history
   * - Queryable sync state
   *
   * Default: false (no state tracking)
   */
  SYNC_STATE_TRACKING: false,

  /**
   * Phase 5.1: Transactional sync
   * - Atomic sync operations (all or nothing)
   * - Automatic rollback on failure
   * - No partial syncs
   *
   * Default: false (no transactions)
   */
  TRANSACTION_SYNC: false,

  /**
   * Development/testing flags
   */

  /**
   * Enable verbose debug logging
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
