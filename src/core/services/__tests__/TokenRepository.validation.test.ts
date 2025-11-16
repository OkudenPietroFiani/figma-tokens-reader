// ====================================================================================
// TOKEN REPOSITORY VALIDATION TESTS
// Tests Zod validation integration in token repository
// ====================================================================================

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { TokenRepository } from '../TokenRepository';
import { Token } from '../../models/Token';
import { FeatureFlags } from '../../config/FeatureFlags';

describe('TokenRepository - Validation Integration', () => {
  let repository: TokenRepository;
  let originalZodFlag: boolean;

  beforeEach(() => {
    repository = new TokenRepository();
    // Save original flag state
    originalZodFlag = FeatureFlags.ZOD_VALIDATION;
  });

  afterEach(() => {
    repository.clear();
    // Restore original flag state
    (FeatureFlags as any).ZOD_VALIDATION = originalZodFlag;
  });

  function createBaseToken(overrides: Partial<Token> = {}): Token {
    return {
      id: 'test-token-1',
      path: ['color', 'primary'],
      name: 'primary',
      qualifiedName: 'color.primary',
      type: 'color',
      rawValue: '#1e40af',
      value: { hex: '#1e40af' },
      projectId: 'test-project',
      collection: 'primitives',
      sourceFormat: 'w3c',
      source: {
        type: 'local',
        location: 'test.json',
        imported: '2025-01-01T00:00:00Z',
      },
      extensions: {},
      tags: ['color'],
      status: 'active',
      created: '2025-01-01T00:00:00Z',
      lastModified: '2025-01-01T00:00:00Z',
      ...overrides,
    } as Token;
  }

  describe('When ZOD_VALIDATION is disabled', () => {
    beforeEach(() => {
      (FeatureFlags as any).ZOD_VALIDATION = false;
    });

    it('should add tokens without validation', () => {
      const token = createBaseToken();
      const result = repository.add([token]);

      expect(result.success).toBe(true);
      expect(result.data).toBe(1);

      const stored = repository.get(token.id);
      expect(stored).toBeDefined();
      expect(stored!.status).toBe('active');
      expect(stored!.extensions.validationErrors).toBeUndefined();
    });

    it('should add invalid tokens without marking as draft', () => {
      const invalidToken = createBaseToken({
        value: {} as any, // Invalid - no hex, rgb, or hsl
      });

      const result = repository.add([invalidToken]);

      expect(result.success).toBe(true);
      expect(result.data).toBe(1);

      const stored = repository.get(invalidToken.id);
      expect(stored).toBeDefined();
      expect(stored!.status).toBe('active'); // No validation, so remains active
    });
  });

  describe('When ZOD_VALIDATION is enabled', () => {
    beforeEach(() => {
      (FeatureFlags as any).ZOD_VALIDATION = true;
    });

    it('should validate tokens before adding', () => {
      const token = createBaseToken();
      const result = repository.add([token]);

      expect(result.success).toBe(true);
      expect(result.data).toBe(1);

      const stored = repository.get(token.id);
      expect(stored).toBeDefined();
      expect(stored!.status).toBe('active');
      expect(stored!.extensions.validationErrors).toBeUndefined();
    });

    it('should mark invalid tokens as draft', () => {
      const invalidToken = createBaseToken({
        value: {} as any, // Invalid ColorValue - no hex, rgb, or hsl
      });

      const result = repository.add([invalidToken]);

      expect(result.success).toBe(true);
      expect(result.data).toBe(1);

      const stored = repository.get(invalidToken.id);
      expect(stored).toBeDefined();
      expect(stored!.status).toBe('draft'); // Marked as draft due to validation failure
      expect(stored!.extensions.validationErrors).toBeDefined();
    });

    it('should add validation errors to token extensions', () => {
      const invalidToken = createBaseToken({
        id: 'test-dimension',
        type: 'dimension',
        value: 'invalid' as any, // Should be DimensionValue
      });

      const result = repository.add([invalidToken]);

      expect(result.success).toBe(true);
      expect(result.data).toBe(1);

      const stored = repository.get(invalidToken.id);
      expect(stored).toBeDefined();
      expect(stored!.status).toBe('draft');
      expect(stored!.extensions.validationErrors).toBeDefined();

      const errors = stored!.extensions.validationErrors;
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toHaveProperty('path');
      expect(errors[0]).toHaveProperty('message');
      expect(errors[0]).toHaveProperty('code');
    });

    it('should add multiple tokens with mixed validation results', () => {
      const validToken = createBaseToken({
        id: 'valid-token',
      });

      const invalidToken = createBaseToken({
        id: 'invalid-token',
        value: {} as any, // Invalid
      });

      const result = repository.add([validToken, invalidToken]);

      expect(result.success).toBe(true);
      expect(result.data).toBe(2);

      // Check valid token
      const storedValid = repository.get(validToken.id);
      expect(storedValid).toBeDefined();
      expect(storedValid!.status).toBe('active');
      expect(storedValid!.extensions.validationErrors).toBeUndefined();

      // Check invalid token
      const storedInvalid = repository.get(invalidToken.id);
      expect(storedInvalid).toBeDefined();
      expect(storedInvalid!.status).toBe('draft');
      expect(storedInvalid!.extensions.validationErrors).toBeDefined();
    });

    it('should validate dimension tokens', () => {
      const validDimension = createBaseToken({
        id: 'dim-valid',
        type: 'dimension',
        rawValue: '16px',
        value: { value: 16, unit: 'px' },
      });

      const result = repository.add([validDimension]);

      expect(result.success).toBe(true);
      const stored = repository.get(validDimension.id);
      expect(stored!.status).toBe('active');
    });

    it('should validate typography tokens', () => {
      const validTypography = createBaseToken({
        id: 'typo-valid',
        type: 'typography',
        rawValue: {},
        value: {
          fontFamily: 'Inter',
          fontSize: 16,
          fontWeight: 600,
        },
      });

      const result = repository.add([validTypography]);

      expect(result.success).toBe(true);
      const stored = repository.get(validTypography.id);
      expect(stored!.status).toBe('active');
    });

    it('should validate shadow tokens', () => {
      const validShadow = createBaseToken({
        id: 'shadow-valid',
        type: 'shadow',
        rawValue: {},
        value: {
          offsetX: 0,
          offsetY: 4,
          blur: 6,
          spread: 0,
          color: '#000000',
        },
      });

      const result = repository.add([validShadow]);

      expect(result.success).toBe(true);
      const stored = repository.get(validShadow.id);
      expect(stored!.status).toBe('active');
    });

    it('should skip tokens missing required fields', () => {
      const invalidToken = createBaseToken({
        id: '', // Missing required ID
      });

      const result = repository.add([invalidToken]);

      expect(result.success).toBe(true);
      expect(result.data).toBe(0); // No tokens added

      const stored = repository.get('');
      expect(stored).toBeUndefined();
    });

    it('should update existing tokens and revalidate', () => {
      const token = createBaseToken();

      // Add valid token
      repository.add([token]);

      // Update with invalid value
      const invalidUpdate = {
        ...token,
        value: {} as any, // Invalid
      } as Token;

      const result = repository.add([invalidUpdate]);

      expect(result.success).toBe(true);
      const stored = repository.get(token.id);
      expect(stored).toBeDefined();
      expect(stored!.status).toBe('draft'); // Now marked as draft
      expect(stored!.extensions.validationErrors).toBeDefined();
    });
  });

  describe('Query validation status', () => {
    beforeEach(() => {
      (FeatureFlags as any).ZOD_VALIDATION = true;
    });

    it('should query tokens by status', () => {
      const validToken = createBaseToken({
        id: 'valid',
      });

      const invalidToken = createBaseToken({
        id: 'invalid',
        value: {} as any,
      });

      repository.add([validToken, invalidToken]);

      const activeTokens = repository.query({ status: 'active' });
      const draftTokens = repository.query({ status: 'draft' });

      expect(activeTokens.length).toBe(1);
      expect(activeTokens[0].id).toBe('valid');

      expect(draftTokens.length).toBe(1);
      expect(draftTokens[0].id).toBe('invalid');
    });

    it('should get repository stats including validation failures', () => {
      const tokens = [
        createBaseToken({ id: 'valid-1' }),
        createBaseToken({ id: 'valid-2' }),
        createBaseToken({ id: 'invalid-1', value: {} as any }),
        createBaseToken({ id: 'invalid-2', value: {} as any }),
      ];

      repository.add(tokens);

      const stats = repository.getStats();
      expect(stats.totalTokens).toBe(4);
    });
  });

  describe('Performance with validation', () => {
    beforeEach(() => {
      (FeatureFlags as any).ZOD_VALIDATION = true;
    });

    it('should handle large batches of tokens', () => {
      const tokens: Token[] = [];
      for (let i = 0; i < 100; i++) {
        tokens.push(
          createBaseToken({
            id: `token-${i}`,
            path: ['color', `token${i}`],
            qualifiedName: `color.token${i}`,
          })
        );
      }

      const result = repository.add(tokens);

      expect(result.success).toBe(true);
      expect(result.data).toBe(100);
      expect(repository.count()).toBe(100);
    });

    it('should validate large batches with mixed results', () => {
      const tokens: Token[] = [];
      for (let i = 0; i < 50; i++) {
        // Add valid token
        tokens.push(
          createBaseToken({
            id: `valid-${i}`,
            path: ['color', `valid${i}`],
            qualifiedName: `color.valid${i}`,
          })
        );

        // Add invalid token
        tokens.push(
          createBaseToken({
            id: `invalid-${i}`,
            path: ['color', `invalid${i}`],
            qualifiedName: `color.invalid${i}`,
            value: {} as any, // Invalid
          })
        );
      }

      const result = repository.add(tokens);

      expect(result.success).toBe(true);
      expect(result.data).toBe(100);

      const activeTokens = repository.query({ status: 'active' });
      const draftTokens = repository.query({ status: 'draft' });

      expect(activeTokens.length).toBe(50);
      expect(draftTokens.length).toBe(50);
    });
  });
});
