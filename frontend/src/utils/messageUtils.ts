/**
 * Utility functions for message handling and temporary ID generation
 */

/**
 * Generate a temporary ID for optimistic UI updates
 * Format: temp_{timestamp}_{randomString}
 */
export function generateTempId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `temp_${timestamp}_${random}`;
}

/**
 * Check if an ID is a temporary ID
 */
export function isTempId(id: string): boolean {
  return id.startsWith('temp_');
}

/**
 * Message status types for tracking send states
 */
export enum MessageStatus {
  SENDING = 'sending',
  SENT = 'sent',
  FAILED = 'failed'
}

/**
 * Extract timestamp from temporary ID
 */
export function getTempIdTimestamp(tempId: string): number {
  if (!isTempId(tempId)) return 0;
  const parts = tempId.split('_');
  return parts.length >= 2 ? parseInt(parts[1]) : 0;
}