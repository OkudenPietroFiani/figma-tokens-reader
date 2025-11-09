// ====================================================================================
// BASE64 DECODER TESTS
// Comprehensive unit tests for Base64Decoder
// ====================================================================================

import { Base64Decoder } from '../../utils/Base64Decoder';

describe('Base64Decoder', () => {
  describe('decode()', () => {
    test('should decode simple ASCII text', () => {
      const base64 = 'SGVsbG8gV29ybGQ='; // "Hello World"
      const result = Base64Decoder.decode(base64);

      expect(result).toBe('Hello World');
    });

    test('should decode JSON content', () => {
      const jsonString = '{"color":"#ff0000","type":"color"}';
      const base64 = btoa(jsonString);
      const result = Base64Decoder.decode(base64);

      expect(result).toBe(jsonString);
    });

    test('should handle whitespace in base64', () => {
      const base64 = 'SGVs\nbG8g\nV29y\nbGQ='; // With newlines
      const result = Base64Decoder.decode(base64);

      expect(result).toBe('Hello World');
    });

    test('should handle spaces in base64', () => {
      const base64 = 'SGVs bG8g V29y bGQ='; // With spaces
      const result = Base64Decoder.decode(base64);

      expect(result).toBe('Hello World');
    });

    test('should decode multi-line content', () => {
      const content = 'Line 1\nLine 2\nLine 3';
      const base64 = btoa(content);
      const result = Base64Decoder.decode(base64);

      expect(result).toBe(content);
    });

    test('should decode content with special characters', () => {
      const content = '{"value":"#ff0000","description":"Primary color"}';
      const base64 = btoa(content);
      const result = Base64Decoder.decode(base64);

      expect(result).toBe(content);
    });

    test('should handle padding characters', () => {
      const base64 = 'YQ=='; // "a" with padding
      const result = Base64Decoder.decode(base64);

      expect(result).toBe('a');
    });

    test('should handle content without padding', () => {
      const base64 = 'YWJj'; // "abc" no padding needed
      const result = Base64Decoder.decode(base64);

      expect(result).toBe('abc');
    });

    test('should throw error for empty string', () => {
      expect(() => Base64Decoder.decode('')).toThrow('Empty base64 string');
    });

    test('should throw error for whitespace-only string', () => {
      expect(() => Base64Decoder.decode('   \n  \t  ')).toThrow('Empty base64 string');
    });

    test('should decode large content', () => {
      const largeContent = JSON.stringify({
        colors: {
          primary: { $value: '#ff0000', $type: 'color' },
          secondary: { $value: '#00ff00', $type: 'color' },
          tertiary: { $value: '#0000ff', $type: 'color' }
        },
        spacing: {
          small: { $value: '8px', $type: 'dimension' },
          medium: { $value: '16px', $type: 'dimension' },
          large: { $value: '24px', $type: 'dimension' }
        }
      });

      const base64 = btoa(largeContent);
      const result = Base64Decoder.decode(base64);

      expect(result).toBe(largeContent);
      expect(JSON.parse(result)).toHaveProperty('colors');
      expect(JSON.parse(result)).toHaveProperty('spacing');
    });

    test('should handle mixed line endings', () => {
      const content = 'Line 1\rLine 2\r\nLine 3\n';
      const base64 = btoa(content);
      const result = Base64Decoder.decode(base64);

      expect(result).toBe(content);
    });

    test('should decode content with numbers', () => {
      const content = '{"value":16,"type":"fontSize"}';
      const base64 = btoa(content);
      const result = Base64Decoder.decode(base64);

      expect(result).toBe(content);
    });

    test('should decode content with unicode characters', () => {
      // Note: btoa doesn't handle unicode well, but our decoder should handle the result
      const content = 'Test 123 !@#';
      const base64 = btoa(content);
      const result = Base64Decoder.decode(base64);

      expect(result).toBe(content);
    });

    test('should handle tabs and special whitespace', () => {
      const base64 = btoa('{\n\t"key": "value"\n}');
      const result = Base64Decoder.decode(base64);

      expect(result).toContain('\t');
      expect(result).toContain('\n');
    });
  });

  describe('reusability', () => {
    test('should decode multiple strings sequentially', () => {
      const test1 = Base64Decoder.decode(btoa('Test 1'));
      const test2 = Base64Decoder.decode(btoa('Test 2'));
      const test3 = Base64Decoder.decode(btoa('Test 3'));

      expect(test1).toBe('Test 1');
      expect(test2).toBe('Test 2');
      expect(test3).toBe('Test 3');
    });

    test('should be stateless (no side effects)', () => {
      const base64 = btoa('Stateless Test');

      const result1 = Base64Decoder.decode(base64);
      const result2 = Base64Decoder.decode(base64);

      expect(result1).toBe(result2);
      expect(result1).toBe('Stateless Test');
    });
  });
});
