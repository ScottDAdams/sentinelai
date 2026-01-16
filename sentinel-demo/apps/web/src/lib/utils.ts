/**
 * Safe JSON parsing utility
 * Handles null, empty, or invalid JSON safely
 */
export function safeJsonParse<T>(value: any, fallback: T): T {
  if (value === null || value === undefined || value === '') {
    return fallback
  }
  
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T
    } catch {
      return fallback
    }
  }
  
  // If already an object, return as-is
  if (typeof value === 'object') {
    return value as T
  }
  
  return fallback
}
