import { describe, it, expect } from 'vitest';
import {
  getFileNameWithoutExtension,
  getFileExtension,
  formatRelativeDate,
  pluralizeItems,
  pluralizeRussian,
  formatFolderStats,
  formatFolderStatsHeader,
} from '../formatters';

describe('formatters', () => {
  describe('getFileNameWithoutExtension', () => {
    it('should remove file extension', () => {
      expect(getFileNameWithoutExtension('document.txt')).toBe('document');
      expect(getFileNameWithoutExtension('photo.jpg')).toBe('photo');
      expect(getFileNameWithoutExtension('archive.tar.gz')).toBe('archive.tar');
    });

    it('should handle files without extension', () => {
      expect(getFileNameWithoutExtension('README')).toBe('README');
      expect(getFileNameWithoutExtension('Makefile')).toBe('Makefile');
    });

    it('should handle empty string', () => {
      expect(getFileNameWithoutExtension('')).toBe('');
    });
  });

  describe('getFileExtension', () => {
    it('should extract and uppercase extension', () => {
      expect(getFileExtension('document.txt')).toBe('TXT');
      expect(getFileExtension('photo.jpg')).toBe('JPG');
      expect(getFileExtension('script.js')).toBe('JS');
    });

    it('should truncate long extensions', () => {
      expect(getFileExtension('file.longext')).toBe('LONG');
    });

    it('should handle files without extension', () => {
      expect(getFileExtension('README')).toBe('READ'); // Truncated to 4 chars
    });

    it('should handle multiple dots', () => {
      expect(getFileExtension('archive.tar.gz')).toBe('GZ');
    });
  });

  describe('formatRelativeDate', () => {
    it('should return null for undefined', () => {
      expect(formatRelativeDate(undefined)).toBe(null);
    });

    it('should format today', () => {
      const today = new Date().toISOString();
      expect(formatRelativeDate(today)).toBe('сегодня');
    });

    it('should format yesterday', () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeDate(yesterday)).toBe('вчера');
    });

    it('should format days ago', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeDate(threeDaysAgo)).toBe('3 дня назад');
    });

    it('should format as date for older dates', () => {
      const oldDate = new Date('2026-03-15').toISOString();
      const result = formatRelativeDate(oldDate);
      expect(result).toContain('мар');
      expect(result).toContain('15');
    });
  });

  describe('pluralizeItems', () => {
    it('should pluralize correctly', () => {
      expect(pluralizeItems(1)).toBe('1 элемент');
      expect(pluralizeItems(2)).toBe('2 элемента');
      expect(pluralizeItems(3)).toBe('3 элемента');
      expect(pluralizeItems(4)).toBe('4 элемента');
      expect(pluralizeItems(5)).toBe('5 элементов');
      expect(pluralizeItems(10)).toBe('10 элементов');
    });
  });

  describe('pluralizeRussian', () => {
    it('should pluralize correctly for папка', () => {
      expect(pluralizeRussian(1, 'папка', 'папки', 'папок')).toBe('1 папка');
      expect(pluralizeRussian(2, 'папка', 'папки', 'папок')).toBe('2 папки');
      expect(pluralizeRussian(5, 'папка', 'папки', 'папок')).toBe('5 папок');
      expect(pluralizeRussian(11, 'папка', 'папки', 'папок')).toBe('11 папок');
      expect(pluralizeRussian(21, 'папка', 'папки', 'папок')).toBe('21 папка');
      expect(pluralizeRussian(22, 'папка', 'папки', 'папок')).toBe('22 папки');
    });

    it('should handle edge cases', () => {
      expect(pluralizeRussian(0, 'файл', 'файла', 'файлов')).toBe('0 файлов');
      expect(pluralizeRussian(100, 'файл', 'файла', 'файлов')).toBe('100 файлов');
    });
  });

  describe('formatFolderStats', () => {
    it('should return "Пусто" for empty folder', () => {
      expect(formatFolderStats(0, 0, 0)).toBe('Пусто');
    });

    it('should format single type', () => {
      expect(formatFolderStats(1, 0, 0)).toBe('1 папка');
      expect(formatFolderStats(0, 2, 0)).toBe('2 файла');
      expect(formatFolderStats(0, 0, 3)).toBe('3 фото');
    });

    it('should format multiple types', () => {
      expect(formatFolderStats(1, 2, 3)).toBe('1 папка · 2 файла · 3 фото');
      expect(formatFolderStats(5, 10, 0)).toBe('5 папок · 10 файлов');
    });

    it('should omit zero counts', () => {
      expect(formatFolderStats(1, 0, 3)).toBe('1 папка · 3 фото');
    });
  });

  describe('formatFolderStatsHeader', () => {
    it('should format with commas', () => {
      expect(formatFolderStatsHeader(1, 2, 3)).toBe('1 папка, 2 файла, 3 фото');
    });

    it('should omit zero counts', () => {
      expect(formatFolderStatsHeader(0, 5, 0)).toBe('5 файлов');
      expect(formatFolderStatsHeader(2, 0, 1)).toBe('2 папки, 1 фото');
    });

    it('should return empty string for all zeros', () => {
      expect(formatFolderStatsHeader(0, 0, 0)).toBe('');
    });
  });
});
