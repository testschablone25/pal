import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('Utils', () => {
  describe('cn', () => {
    it('should merge class names correctly', () => {
      const result = cn('foo', 'bar', { baz: true, qux: false });
      expect(result).toContain('foo');
      expect(result).toContain('bar');
      expect(result).toContain('baz');
      expect(result).not.toContain('qux');
    });

    it('should handle empty inputs', () => {
      const result = cn();
      expect(result).toBe('');
    });

    it('should handle conditional classes', () => {
      const result = cn('base', undefined, null, false && 'falsy', 'defined');
      expect(result).toContain('base');
      expect(result).toContain('defined');
    });
  });
});