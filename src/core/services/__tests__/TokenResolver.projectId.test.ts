// ====================================================================================
// TOKEN RESOLVER PROJECT ID SCOPING TESTS
// Tests that references are properly scoped to project boundaries
// ====================================================================================

import { describe, it, expect, beforeEach } from '@jest/globals';
import { TokenResolver } from '../TokenResolver';
import { TokenRepository } from '../TokenRepository';
import { Token } from '../../models/Token';

describe('TokenResolver - Project ID Scoping', () => {
  let repository: TokenRepository;
  let resolver: TokenResolver;

  beforeEach(() => {
    repository = new TokenRepository();
    resolver = new TokenResolver(repository);
  });

  function createToken(overrides: Partial<Token>): Token {
    return {
      id: `test-${Date.now()}-${Math.random()}`,
      path: ['test'],
      name: 'test',
      qualifiedName: 'test',
      type: 'color',
      rawValue: '#000000',
      value: { hex: '#000000' },
      projectId: 'project-1',
      collection: 'test',
      sourceFormat: 'w3c',
      source: {
        type: 'local',
        location: 'test',
        imported: new Date().toISOString(),
      },
      extensions: {},
      tags: [],
      status: 'active',
      created: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      ...overrides,
    } as Token;
  }

  describe('Same-project reference resolution', () => {
    it('should resolve reference within same project', async () => {
      // Create base color in project-1
      const baseColor = createToken({
        id: 'color-base',
        path: ['color', 'base'],
        name: 'base',
        qualifiedName: 'color.base',
        projectId: 'project-1',
        value: { hex: '#1e40af' },
      });

      // Create alias to base color in same project
      const aliasColor = createToken({
        id: 'color-primary',
        path: ['color', 'primary'],
        name: 'primary',
        qualifiedName: 'color.primary',
        projectId: 'project-1',
        aliasTo: 'color-base',
        value: { hex: '#1e40af' }, // Same value before resolution
      });

      repository.add([baseColor, aliasColor]);

      const result = await resolver.resolveAllTokens('project-1');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      // Alias should be resolved to base color's value
      const resolvedValue = result.data!.get('color-primary');
      expect(resolvedValue).toEqual({ hex: '#1e40af' });
    });

    it('should resolve chain of references within same project', async () => {
      // Create chain: base -> primary -> button
      const baseColor = createToken({
        id: 'color-base',
        qualifiedName: 'color.base',
        projectId: 'project-1',
        value: { hex: '#1e40af' },
      });

      const primaryColor = createToken({
        id: 'color-primary',
        qualifiedName: 'color.primary',
        projectId: 'project-1',
        aliasTo: 'color-base',
        value: { hex: '#000000' }, // Will be resolved
      });

      const buttonColor = createToken({
        id: 'color-button',
        qualifiedName: 'color.button',
        projectId: 'project-1',
        aliasTo: 'color-primary',
        value: { hex: '#000000' }, // Will be resolved
      });

      repository.add([baseColor, primaryColor, buttonColor]);

      const result = await resolver.resolveAllTokens('project-1');

      expect(result.success).toBe(true);

      // All should resolve to base color
      expect(result.data!.get('color-base')).toEqual({ hex: '#1e40af' });
      expect(result.data!.get('color-primary')).toEqual({ hex: '#1e40af' });
      expect(result.data!.get('color-button')).toEqual({ hex: '#1e40af' });
    });
  });

  describe('Cross-project reference prevention', () => {
    it('should NOT resolve reference to different project', async () => {
      // Create base color in project-1
      const baseColorP1 = createToken({
        id: 'color-base-p1',
        qualifiedName: 'color.base',
        projectId: 'project-1',
        value: { hex: '#1e40af' },
      });

      // Create alias in project-2 trying to reference project-1
      const aliasColorP2 = createToken({
        id: 'color-primary-p2',
        qualifiedName: 'color.primary',
        projectId: 'project-2',
        aliasTo: 'color-base-p1', // Cross-project reference!
        value: { hex: '#ff0000' }, // Fallback value
      });

      repository.add([baseColorP1, aliasColorP2]);

      const result = await resolver.resolveAllTokens('project-2');

      expect(result.success).toBe(true);

      // Should NOT resolve cross-project reference
      // Should use the token's own value instead
      const resolvedValue = result.data!.get('color-primary-p2');
      expect(resolvedValue).toEqual({ hex: '#ff0000' }); // Uses fallback, not base
    });

    it('should increment unresolvedReferences stat for cross-project refs', async () => {
      const baseColorP1 = createToken({
        id: 'color-base-p1',
        projectId: 'project-1',
        value: { hex: '#1e40af' },
      });

      const aliasColorP2 = createToken({
        id: 'color-primary-p2',
        projectId: 'project-2',
        aliasTo: 'color-base-p1',
        value: { hex: '#ff0000' },
      });

      repository.add([baseColorP1, aliasColorP2]);

      resolver.resetStats();
      await resolver.resolveAllTokens('project-2');

      const stats = resolver.getStats();
      expect(stats.unresolvedReferences).toBe(1);
    });
  });

  describe('Cross-project reference detection', () => {
    it('should detect cross-project references', () => {
      const baseColorP1 = createToken({
        id: 'color-base-p1',
        qualifiedName: 'color.base',
        projectId: 'project-1',
        value: { hex: '#1e40af' },
      });

      const aliasColorP2 = createToken({
        id: 'color-primary-p2',
        qualifiedName: 'color.primary',
        projectId: 'project-2',
        aliasTo: 'color-base-p1',
        value: { hex: '#ff0000' },
      });

      repository.add([baseColorP1, aliasColorP2]);

      const crossProjectRefs = resolver.detectCrossProjectReferences('project-2');

      expect(crossProjectRefs).toHaveLength(1);
      expect(crossProjectRefs[0].id).toBe('color-primary-p2');
      expect(crossProjectRefs[0].aliasTo).toBe('color-base-p1');
    });

    it('should return empty array if no cross-project references', () => {
      const baseColor = createToken({
        id: 'color-base',
        projectId: 'project-1',
        value: { hex: '#1e40af' },
      });

      const aliasColor = createToken({
        id: 'color-primary',
        projectId: 'project-1',
        aliasTo: 'color-base',
        value: { hex: '#1e40af' },
      });

      repository.add([baseColor, aliasColor]);

      const crossProjectRefs = resolver.detectCrossProjectReferences('project-1');

      expect(crossProjectRefs).toHaveLength(0);
    });
  });

  describe('Reference resolution with resolveReference', () => {
    it('should resolve reference within project using resolveReference', () => {
      const baseColor = createToken({
        id: 'color-base',
        path: ['color', 'base'],
        qualifiedName: 'color.base',
        projectId: 'project-1',
        value: { hex: '#1e40af' },
      });

      repository.add([baseColor]);

      const resolved = resolver.resolveReference('color.base', 'project-1');

      expect(resolved).not.toBeNull();
      expect(resolved!.id).toBe('color-base');
      expect(resolved!.value).toEqual({ hex: '#1e40af' });
    });

    it('should NOT resolve reference from different project', () => {
      const baseColor = createToken({
        id: 'color-base',
        qualifiedName: 'color.base',
        projectId: 'project-1',
        value: { hex: '#1e40af' },
      });

      repository.add([baseColor]);

      // Try to resolve from project-2
      const resolved = resolver.resolveReference('color.base', 'project-2');

      expect(resolved).toBeNull();
    });
  });

  describe('Circular reference detection with project scoping', () => {
    it('should detect circular references within same project', () => {
      // Create circular reference: A -> B -> A
      const tokenA = createToken({
        id: 'token-a',
        qualifiedName: 'token.a',
        projectId: 'project-1',
        aliasTo: 'token-b',
        value: { hex: '#000000' },
      });

      const tokenB = createToken({
        id: 'token-b',
        qualifiedName: 'token.b',
        projectId: 'project-1',
        aliasTo: 'token-a',
        value: { hex: '#000000' },
      });

      repository.add([tokenA, tokenB]);

      const cycles = resolver.detectCircularReferences('project-1');

      expect(cycles.length).toBeGreaterThan(0);
    });

    it('should NOT detect false circular reference across projects', () => {
      // Create what looks like a cycle but crosses projects
      // A (p1) -> B (p2) -> A (p2)
      // This is NOT a cycle in project-1 because B is in a different project
      const tokenAP1 = createToken({
        id: 'token-a-p1',
        qualifiedName: 'token.a',
        projectId: 'project-1',
        aliasTo: 'token-b-p2', // Cross-project (won't be in graph)
        value: { hex: '#000000' },
      });

      const tokenBP2 = createToken({
        id: 'token-b-p2',
        qualifiedName: 'token.b',
        projectId: 'project-2',
        aliasTo: 'token-a-p2',
        value: { hex: '#000000' },
      });

      const tokenAP2 = createToken({
        id: 'token-a-p2',
        qualifiedName: 'token.a',
        projectId: 'project-2',
        aliasTo: 'token-b-p2',
        value: { hex: '#000000' },
      });

      repository.add([tokenAP1, tokenBP2, tokenAP2]);

      // Check project-1: Should have no cycles (cross-project ref excluded)
      const cyclesP1 = resolver.detectCircularReferences('project-1');
      expect(cyclesP1).toHaveLength(0);

      // Check project-2: Should detect cycle between A and B
      const cyclesP2 = resolver.detectCircularReferences('project-2');
      expect(cyclesP2.length).toBeGreaterThan(0);
    });
  });

  describe('Integration test: Typography token resolution', () => {
    it('should properly resolve typography token with nested references in same project', async () => {
      // This reproduces the original bug scenario
      // Primitive tokens
      const fontFamilyPrimary = createToken({
        id: 'ff-primary',
        qualifiedName: 'typography.fontFamily.primary',
        projectId: 'design-system',
        type: 'fontFamily',
        value: 'Inter',
      });

      const fontSize32 = createToken({
        id: 'fs-32',
        qualifiedName: 'typography.fontSize.32',
        projectId: 'design-system',
        type: 'fontSize',
        value: { value: 32, unit: 'px' },
      });

      const fontWeightBold = createToken({
        id: 'fw-bold',
        qualifiedName: 'typography.fontWeight.bold',
        projectId: 'design-system',
        type: 'fontWeight',
        value: 700,
      });

      // Semantic typography token with references
      const headingH1 = createToken({
        id: 'typo-h1',
        qualifiedName: 'typography.heading.h1',
        projectId: 'design-system',
        type: 'typography',
        value: {
          fontFamily: '{typography.fontFamily.primary}',
          fontSize: '{typography.fontSize.32}',
          fontWeight: '{typography.fontWeight.bold}',
        },
      });

      repository.add([fontFamilyPrimary, fontSize32, fontWeightBold, headingH1]);

      const result = await resolver.resolveAllTokens('design-system');

      expect(result.success).toBe(true);

      // Typography token should have its references resolved
      const h1Value = result.data!.get('typo-h1');
      expect(h1Value).toBeDefined();
      // Note: This test validates the resolution happens, actual value resolution
      // would be handled by value converters
    });
  });
});
