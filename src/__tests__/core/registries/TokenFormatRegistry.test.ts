// ====================================================================================
// TOKEN FORMAT REGISTRY TESTS
// Comprehensive unit tests for TokenFormatRegistry
// ====================================================================================

import { TokenFormatRegistry } from '../../../core/registries/TokenFormatRegistry';
import { ITokenFormatStrategy, TokenFormatInfo } from '../../../core/interfaces/ITokenFormatStrategy';
import { TokenData, Success } from '../../../shared/types';

// Mock format strategy for testing
class MockFormatStrategy implements ITokenFormatStrategy {
  constructor(
    private formatName: string,
    private detectionScore: number = 0.5
  ) {}

  detectFormat(data: TokenData): number {
    return this.detectionScore;
  }

  getFormatInfo(): TokenFormatInfo {
    return {
      name: this.formatName,
      version: '1.0',
      description: `Mock ${this.formatName} format`
    };
  }

  parseTokens(data: TokenData) {
    return Success([]);
  }

  normalizeValue(value: any, type: string) {
    return value;
  }

  extractType(tokenData: any, path: string[]) {
    return 'string';
  }

  isReference(value: any): boolean {
    return false;
  }

  extractReference(value: any): string | null {
    return null;
  }
}

describe('TokenFormatRegistry', () => {
  beforeEach(() => {
    TokenFormatRegistry.clear();
  });

  afterEach(() => {
    TokenFormatRegistry.clear();
  });

  describe('register()', () => {
    test('should register a new format strategy', () => {
      const strategy = new MockFormatStrategy('W3C Design Tokens');

      TokenFormatRegistry.register(strategy);

      expect(TokenFormatRegistry.has('W3C Design Tokens')).toBe(true);
      expect(TokenFormatRegistry.count()).toBe(1);
    });

    test('should throw error when registering duplicate format name', () => {
      const strategy1 = new MockFormatStrategy('W3C Design Tokens');
      const strategy2 = new MockFormatStrategy('W3C Design Tokens');

      TokenFormatRegistry.register(strategy1);

      expect(() => TokenFormatRegistry.register(strategy2)).toThrow(
        "Token format 'W3C Design Tokens' is already registered"
      );
    });

    test('should allow registering multiple different formats', () => {
      const w3c = new MockFormatStrategy('W3C Design Tokens');
      const styleDict = new MockFormatStrategy('Style Dictionary');
      const custom = new MockFormatStrategy('Custom Format');

      TokenFormatRegistry.register(w3c);
      TokenFormatRegistry.register(styleDict);
      TokenFormatRegistry.register(custom);

      expect(TokenFormatRegistry.count()).toBe(3);
    });
  });

  describe('get()', () => {
    test('should retrieve registered strategy by format name', () => {
      const strategy = new MockFormatStrategy('W3C Design Tokens');
      TokenFormatRegistry.register(strategy);

      const retrieved = TokenFormatRegistry.get('W3C Design Tokens');

      expect(retrieved).toBe(strategy);
      expect(retrieved?.getFormatInfo().name).toBe('W3C Design Tokens');
    });

    test('should return undefined for unregistered format', () => {
      const retrieved = TokenFormatRegistry.get('Nonexistent Format');

      expect(retrieved).toBeUndefined();
    });
  });

  describe('detectFormat()', () => {
    test('should return strategy with highest detection score', () => {
      const lowScore = new MockFormatStrategy('Low Score', 0.3);
      const highScore = new MockFormatStrategy('High Score', 0.9);
      const mediumScore = new MockFormatStrategy('Medium Score', 0.6);

      TokenFormatRegistry.register(lowScore);
      TokenFormatRegistry.register(highScore);
      TokenFormatRegistry.register(mediumScore);

      const tokenData: TokenData = { test: 'data' };
      const detected = TokenFormatRegistry.detectFormat(tokenData);

      expect(detected).toBe(highScore);
      expect(detected?.getFormatInfo().name).toBe('High Score');
    });

    test('should return undefined when no strategies registered', () => {
      const tokenData: TokenData = { test: 'data' };
      const detected = TokenFormatRegistry.detectFormat(tokenData);

      expect(detected).toBeUndefined();
    });

    test('should return undefined when all scores are 0', () => {
      const zero1 = new MockFormatStrategy('Zero 1', 0);
      const zero2 = new MockFormatStrategy('Zero 2', 0);

      TokenFormatRegistry.register(zero1);
      TokenFormatRegistry.register(zero2);

      const tokenData: TokenData = { test: 'data' };
      const detected = TokenFormatRegistry.detectFormat(tokenData);

      expect(detected).toBeUndefined();
    });

    test('should handle tie in detection scores (returns first registered)', () => {
      const tied1 = new MockFormatStrategy('Tied 1', 0.8);
      const tied2 = new MockFormatStrategy('Tied 2', 0.8);

      TokenFormatRegistry.register(tied1);
      TokenFormatRegistry.register(tied2);

      const tokenData: TokenData = { test: 'data' };
      const detected = TokenFormatRegistry.detectFormat(tokenData);

      // Should return the first one that achieved the highest score
      expect(detected?.getFormatInfo().name).toBe('Tied 1');
    });
  });

  describe('has()', () => {
    test('should return true for registered format', () => {
      TokenFormatRegistry.register(new MockFormatStrategy('W3C Design Tokens'));

      expect(TokenFormatRegistry.has('W3C Design Tokens')).toBe(true);
    });

    test('should return false for unregistered format', () => {
      expect(TokenFormatRegistry.has('Nonexistent')).toBe(false);
    });
  });

  describe('getRegisteredFormats()', () => {
    test('should return empty array when no formats registered', () => {
      const formats = TokenFormatRegistry.getRegisteredFormats();

      expect(formats).toEqual([]);
    });

    test('should return all registered format names', () => {
      TokenFormatRegistry.register(new MockFormatStrategy('W3C Design Tokens'));
      TokenFormatRegistry.register(new MockFormatStrategy('Style Dictionary'));
      TokenFormatRegistry.register(new MockFormatStrategy('Custom Format'));

      const formats = TokenFormatRegistry.getRegisteredFormats();

      expect(formats).toHaveLength(3);
      expect(formats).toContain('W3C Design Tokens');
      expect(formats).toContain('Style Dictionary');
      expect(formats).toContain('Custom Format');
    });
  });

  describe('clear()', () => {
    test('should remove all registered strategies', () => {
      TokenFormatRegistry.register(new MockFormatStrategy('Format 1'));
      TokenFormatRegistry.register(new MockFormatStrategy('Format 2'));

      expect(TokenFormatRegistry.count()).toBe(2);

      TokenFormatRegistry.clear();

      expect(TokenFormatRegistry.count()).toBe(0);
      expect(TokenFormatRegistry.getRegisteredFormats()).toEqual([]);
    });
  });

  describe('count()', () => {
    test('should return 0 when no strategies registered', () => {
      expect(TokenFormatRegistry.count()).toBe(0);
    });

    test('should return correct count of registered strategies', () => {
      TokenFormatRegistry.register(new MockFormatStrategy('Format 1'));
      expect(TokenFormatRegistry.count()).toBe(1);

      TokenFormatRegistry.register(new MockFormatStrategy('Format 2'));
      expect(TokenFormatRegistry.count()).toBe(2);

      TokenFormatRegistry.register(new MockFormatStrategy('Format 3'));
      expect(TokenFormatRegistry.count()).toBe(3);
    });
  });
});
