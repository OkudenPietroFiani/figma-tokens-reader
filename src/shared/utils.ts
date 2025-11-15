// ====================================================================================
// SHARED UTILITIES
// Common utility functions used across the codebase
// ====================================================================================

/**
 * Deep clone an object (handles circular references)
 * Used to prevent shared object references between tokens
 */
export function deepClone<T>(obj: T): T {
  // Handle primitives and null
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // Handle Date
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as any;
  }

  // Handle Array
  if (obj instanceof Array) {
    return obj.map(item => deepClone(item)) as any;
  }

  // Handle Set
  if (obj instanceof Set) {
    return new Set(Array.from(obj).map(deepClone)) as any;
  }

  // Handle Map
  if (obj instanceof Map) {
    const cloned = new Map();
    obj.forEach((value, key) => {
      cloned.set(deepClone(key), deepClone(value));
    });
    return cloned as any;
  }

  // Handle plain objects
  const cloned: any = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone((obj as any)[key]);
    }
  }

  return cloned;
}
