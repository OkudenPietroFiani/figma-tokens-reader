// ====================================================================================
// TOKEN DOCUMENTATION ADAPTER TESTS
// Comprehensive unit tests for TokenDocumentationAdapter
// ====================================================================================

import { TokenDocumentationAdapter } from '../../../core/adapters/TokenDocumentationAdapter';
import { TokenRepository } from '../../../core/services/TokenRepository';
import { Token, TokenType } from '../../../core/models/Token';

// Helper to create test tokens
function createTestToken(overrides: Partial<Token> = {}): Token {
  return {
    id: 'token_1',
    name: 'test',
    qualifiedName: 'test.token',
    path: ['test', 'token'],
    type: 'color' as TokenType,
    value: '#FF0000',
    rawValue: '#FF0000',
    projectId: 'project1',
    collection: 'primitives',
    source: {
      type: 'local',
      location: 'tokens.json',
      imported: new Date().toISOString(),
    },
    sourceFormat: 'w3c',
    status: 'active',
    created: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    tags: ['test'],
    extensions: {},
    ...overrides,
  };
}

describe('TokenDocumentationAdapter', () => {
  let adapter: TokenDocumentationAdapter;
  let repository: TokenRepository;

  beforeEach(() => {
    repository = new TokenRepository();
    adapter = new TokenDocumentationAdapter(repository);
  });

  describe('tokensToMetadata()', () => {
    it('should convert basic token to metadata', () => {
      const token = createTestToken({
        name: 'primary',
        qualifiedName: 'color.primary',
        path: ['color', 'primary'],
      });

      repository.add([token]);
      const metadata = adapter.tokensToMetadata([token]);

      expect(metadata).toHaveLength(1);
      expect(metadata[0].name).toBe('primary');
      expect(metadata[0].fullPath).toBe('color.primary');
      expect(metadata[0].type).toBe('color');
      expect(metadata[0].value).toBe('#FF0000');
      expect(metadata[0].originalValue).toBe('#FF0000');
      expect(metadata[0].collection).toBe('primitives');
    });

    it('should use resolvedValue if available', () => {
      const token = createTestToken({
        name: 'secondary',
        qualifiedName: 'color.secondary',
        path: ['color', 'secondary'],
        value: '{color.primary}',
        rawValue: '{color.primary}',
        resolvedValue: '#FF0000',
      });

      repository.add([token]);
      const metadata = adapter.tokensToMetadata([token]);

      expect(metadata[0].value).toBe('#FF0000'); // Uses resolvedValue
      expect(metadata[0].originalValue).toBe('{color.primary}'); // Uses rawValue
    });

    it('should convert aliasTo from Token ID to qualified name', () => {
      const primaryToken = createTestToken({
        id: 'token_1',
        name: 'primary',
        qualifiedName: 'color.primary',
        path: ['color', 'primary'],
      });

      const secondaryToken = createTestToken({
        id: 'token_2',
        name: 'secondary',
        qualifiedName: 'color.secondary',
        path: ['color', 'secondary'],
        value: '{color.primary}',
        rawValue: '{color.primary}',
        resolvedValue: '#FF0000',
        aliasTo: 'token_1',
        collection: 'semantic',
      });

      repository.add([primaryToken, secondaryToken]);
      const metadata = adapter.tokensToMetadata([secondaryToken]);

      expect(metadata[0].aliasTo).toBe('{color.primary}');
      expect(metadata[0].originalValue).toBe('{color.primary}');
    });

    it('should handle token with description', () => {
      const token = createTestToken({
        description: 'Primary brand color',
      });

      repository.add([token]);
      const metadata = adapter.tokensToMetadata([token]);

      expect(metadata[0].description).toBe('Primary brand color');
    });

    it('should handle token without description', () => {
      const token = createTestToken();

      repository.add([token]);
      const metadata = adapter.tokensToMetadata([token]);

      expect(metadata[0].description).toBeUndefined();
    });

    it('should handle alias reference not found', () => {
      const token = createTestToken({
        name: 'secondary',
        qualifiedName: 'color.secondary',
        value: '{color.primary}',
        rawValue: '{color.primary}',
        aliasTo: 'token_999', // Doesn't exist
        collection: 'semantic',
      });

      repository.add([token]);
      const metadata = adapter.tokensToMetadata([token]);

      // Should still work, just without aliasTo
      expect(metadata[0].aliasTo).toBeUndefined();
      expect(metadata[0].originalValue).toBe('{color.primary}');
    });

    it('should convert multiple tokens', () => {
      const tokens: Token[] = [
        createTestToken({
          id: 'token_1',
          name: 'primary',
          qualifiedName: 'color.primary',
          path: ['color', 'primary'],
        }),
        createTestToken({
          id: 'token_2',
          name: 'small',
          qualifiedName: 'spacing.small',
          path: ['spacing', 'small'],
          type: 'spacing' as TokenType,
          value: 8,
          rawValue: '8px',
        }),
      ];

      repository.add(tokens);
      const metadata = adapter.tokensToMetadata(tokens);

      expect(metadata).toHaveLength(2);
      expect(metadata[0].fullPath).toBe('color.primary');
      expect(metadata[1].fullPath).toBe('spacing.small');
    });

    it('should handle empty array', () => {
      const metadata = adapter.tokensToMetadata([]);
      expect(metadata).toHaveLength(0);
    });

    it('should preserve all token types', () => {
      const tokenTypes: TokenType[] = ['color', 'number', 'dimension', 'fontSize', 'spacing'];
      const tokens: Token[] = tokenTypes.map((type, i) =>
        createTestToken({
          id: `token_${i}`,
          name: `test${i}`,
          qualifiedName: `test.${type}`,
          path: ['test', type],
          type,
          value: i,
          rawValue: String(i),
          tags: [type],
        })
      );

      repository.add(tokens);
      const metadata = adapter.tokensToMetadata(tokens);

      expect(metadata).toHaveLength(tokenTypes.length);
      metadata.forEach((m, i) => {
        expect(m.type).toBe(tokenTypes[i]);
      });
    });
  });
});
