/**
 * ScrollPosition - Index-based scroll position for virtual lists
 *
 * The correct approach for @tanstack/react-virtual:
 * - Save the INDEX of the item in the flat list
 * - NOT date+taskId (too complex, requires searching)
 * - NOT scrollTop pixels (breaks with dynamic heights)
 *
 * Pattern: Value Object (see .claude/skills/architecture-patterns.md)
 */

export interface ScrollPosition {
  /** The index in the flat list (date section index) */
  index: number;
  /** Task ID to scroll to */
  taskId: string;
  /** Exact scroll position (scrollTop) when saved */
  scrollTop: number;
}

/**
 * ScrollPositionManager - Manages scroll position persistence
 *
 * Single Responsibility: Handle saving/restoring scroll positions to sessionStorage
 */
export class ScrollPositionManager {
  private static readonly STORAGE_KEY = 'taskListScrollPosition';
  private static readonly RETURNING_FLAG_KEY = 'returningFromAttempts';

  /**
   * Save the current scroll position as an index
   */
  static save(position: ScrollPosition): void {
    sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(position));
  }

  /**
   * Restore the saved scroll position
   * @returns The scroll position if found, null otherwise
   */
  static restore(): ScrollPosition | null {
    const data = sessionStorage.getItem(this.STORAGE_KEY);
    if (!data) return null;

    try {
      const position = JSON.parse(data) as ScrollPosition;
      // Validate the structure
      if (typeof position.index === 'number' && position.taskId && typeof position.scrollTop === 'number') {
        return position;
      }
      return null;
    } catch {
      // Invalid JSON, clear it
      this.clear();
      return null;
    }
  }

  /**
   * Clear the saved scroll position
   */
  static clear(): void {
    sessionStorage.removeItem(this.STORAGE_KEY);
  }

  /**
   * Mark that the user is returning from the attempts view
   * This triggers scroll restoration on the next page load
   */
  static markReturningFromAttempts(): void {
    sessionStorage.setItem(this.RETURNING_FLAG_KEY, 'true');
  }

  /**
   * Check if the user is returning from the attempts view
   */
  static isReturningFromAttempts(): boolean {
    return sessionStorage.getItem(this.RETURNING_FLAG_KEY) === 'true';
  }

  /**
   * Clear the returning flag
   */
  static clearReturningFlag(): void {
    sessionStorage.removeItem(this.RETURNING_FLAG_KEY);
  }
}
