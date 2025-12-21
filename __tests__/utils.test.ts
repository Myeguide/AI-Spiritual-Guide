/**
 * Utility Functions Tests
 * Tests for cn (classnames) utility
 */

import { cn } from '@/lib/utils';

describe('cn (classnames utility)', () => {
  describe('Basic functionality', () => {
    it('should merge simple class names', () => {
      expect(cn('class1', 'class2')).toBe('class1 class2');
    });

    it('should handle single class name', () => {
      expect(cn('single-class')).toBe('single-class');
    });

    it('should handle empty input', () => {
      expect(cn()).toBe('');
    });

    it('should handle empty strings', () => {
      expect(cn('', 'class1', '')).toBe('class1');
    });
  });

  describe('Conditional classes', () => {
    it('should handle boolean conditions', () => {
      expect(cn('base', true && 'active')).toBe('base active');
      expect(cn('base', false && 'inactive')).toBe('base');
    });

    it('should handle undefined values', () => {
      expect(cn('base', undefined, 'extra')).toBe('base extra');
    });

    it('should handle null values', () => {
      expect(cn('base', null, 'extra')).toBe('base extra');
    });

    it('should handle object syntax', () => {
      expect(cn({ active: true, disabled: false })).toBe('active');
    });

    it('should handle mixed syntax', () => {
      expect(cn('base', { active: true }, 'extra')).toBe('base active extra');
    });
  });

  describe('Tailwind merge', () => {
    it('should resolve conflicting padding classes', () => {
      expect(cn('px-2', 'px-4')).toBe('px-4');
    });

    it('should resolve conflicting margin classes', () => {
      expect(cn('mt-2', 'mt-4')).toBe('mt-4');
    });

    it('should resolve conflicting text color classes', () => {
      expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
    });

    it('should resolve conflicting background classes', () => {
      expect(cn('bg-white', 'bg-black')).toBe('bg-black');
    });

    it('should keep non-conflicting classes', () => {
      expect(cn('px-2', 'py-4')).toBe('px-2 py-4');
    });

    it('should resolve width conflicts', () => {
      expect(cn('w-4', 'w-8')).toBe('w-8');
    });

    it('should resolve height conflicts', () => {
      expect(cn('h-4', 'h-8')).toBe('h-8');
    });

    it('should handle responsive prefixes correctly', () => {
      expect(cn('md:px-2', 'md:px-4')).toBe('md:px-4');
    });

    it('should keep different breakpoint classes', () => {
      expect(cn('px-2', 'md:px-4')).toBe('px-2 md:px-4');
    });

    it('should handle dark mode variants', () => {
      expect(cn('bg-white', 'dark:bg-black')).toBe('bg-white dark:bg-black');
    });

    it('should resolve conflicting dark mode classes', () => {
      expect(cn('dark:bg-gray-800', 'dark:bg-gray-900')).toBe('dark:bg-gray-900');
    });
  });

  describe('Array inputs', () => {
    it('should handle array of classes', () => {
      expect(cn(['class1', 'class2'])).toBe('class1 class2');
    });

    it('should handle nested arrays', () => {
      expect(cn(['class1', ['class2', 'class3']])).toBe('class1 class2 class3');
    });
  });

  describe('Complex scenarios', () => {
    it('should handle real-world button styling', () => {
      const variant = 'primary';
      const size = 'medium';
      const disabled = false;

      const result = cn(
        'rounded-lg font-medium transition-colors',
        variant === 'primary' && 'bg-blue-500 text-white',
        variant === 'secondary' && 'bg-gray-200 text-gray-800',
        size === 'small' && 'px-2 py-1 text-sm',
        size === 'medium' && 'px-4 py-2 text-base',
        size === 'large' && 'px-6 py-3 text-lg',
        disabled && 'opacity-50 cursor-not-allowed'
      );

      expect(result).toBe('rounded-lg font-medium transition-colors bg-blue-500 text-white px-4 py-2 text-base');
    });

    it('should handle component override pattern', () => {
      const baseClasses = 'px-4 py-2 bg-blue-500';
      const overrideClasses = 'bg-red-500 px-6';

      const result = cn(baseClasses, overrideClasses);

      expect(result).toBe('py-2 bg-red-500 px-6');
    });
  });
});
