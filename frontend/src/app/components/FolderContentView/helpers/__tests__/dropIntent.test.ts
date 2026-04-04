import { describe, it, expect } from 'vitest';
import { calculateDropIntent } from '../dropIntent';

describe('calculateDropIntent', () => {
  const width = 280;
  const height = 180;

  describe('basic rules', () => {
    it('should return null when dragging to self', () => {
      const result = calculateDropIntent(140, 90, width, height, 'folder', 'item-1', 'item-1');
      expect(result).toBe(null);
    });

    it('should return "reorder" for file targets', () => {
      const result = calculateDropIntent(140, 90, width, height, 'file', 'item-1', 'item-2');
      expect(result).toBe('reorder');
    });
  });

  describe('folder targets - nest intent', () => {
    it('should return "nest" when in center area', () => {
      // Center of the card (50%, 50%)
      const result = calculateDropIntent(140, 90, width, height, 'folder', 'item-1', 'item-2');
      expect(result).toBe('nest');
    });

    it('should return "nest" when in center X and center Y', () => {
      // 60% X, 60% Y - still in center zone
      const result = calculateDropIntent(168, 108, width, height, 'folder', 'item-1', 'item-2');
      expect(result).toBe('nest');
    });

    it('should return "nest" at center boundaries', () => {
      // Just inside center zone (21% X, 21% Y)
      const result = calculateDropIntent(59, 38, width, height, 'folder', 'item-1', 'item-2');
      expect(result).toBe('nest');
    });
  });

  describe('folder targets - reorder intent', () => {
    it('should return "reorder" when in left edge', () => {
      // 10% X (left edge), 50% Y
      const result = calculateDropIntent(28, 90, width, height, 'folder', 'item-1', 'item-2');
      expect(result).toBe('reorder');
    });

    it('should return "reorder" when in right edge', () => {
      // 90% X (right edge), 50% Y
      const result = calculateDropIntent(252, 90, width, height, 'folder', 'item-1', 'item-2');
      expect(result).toBe('reorder');
    });

    it('should return "reorder" when in top edge', () => {
      // 50% X, 10% Y (top edge)
      const result = calculateDropIntent(140, 18, width, height, 'folder', 'item-1', 'item-2');
      expect(result).toBe('reorder');
    });

    it('should return "reorder" when in bottom edge', () => {
      // 50% X, 90% Y (bottom edge)
      const result = calculateDropIntent(140, 162, width, height, 'folder', 'item-1', 'item-2');
      expect(result).toBe('reorder');
    });

    it('should return "reorder" at corner', () => {
      // Top-left corner
      const result = calculateDropIntent(10, 10, width, height, 'folder', 'item-1', 'item-2');
      expect(result).toBe('reorder');
    });
  });

  describe('edge cases', () => {
    it('should handle zero dimensions', () => {
      const result = calculateDropIntent(0, 0, 0, 0, 'folder', 'item-1', 'item-2');
      expect(result).toBe('nest'); // 0 is within 0-0 range
    });

    it('should handle very small dimensions', () => {
      const result = calculateDropIntent(5, 5, 10, 10, 'folder', 'item-1', 'item-2');
      expect(result).toBe('nest');
    });

    it('should handle large dimensions', () => {
      const result = calculateDropIntent(500, 500, 1000, 1000, 'folder', 'item-1', 'item-2');
      expect(result).toBe('nest');
    });
  });
});
