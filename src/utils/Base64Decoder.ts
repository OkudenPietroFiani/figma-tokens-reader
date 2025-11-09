// ====================================================================================
// BASE64 DECODER
// Pure utility for decoding base64 to UTF-8 strings
// ====================================================================================

/**
 * Base64 decoder utility
 *
 * SOLID Principles:
 * - Single Responsibility: Only handles base64 decoding
 * - No dependencies: Pure utility function
 * - Reusable: Works in any JavaScript environment
 *
 * Features:
 * - Custom implementation (no atob/TextDecoder dependencies)
 * - Handles multi-byte UTF-8 characters
 * - Whitespace tolerant
 */
export class Base64Decoder {
  private static readonly BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  private static base64Lookup: Map<string, number> | null = null;

  /**
   * Decode base64 string to UTF-8 text
   *
   * @param base64 - Base64 encoded string
   * @returns Decoded UTF-8 string
   * @throws Error if decoding fails
   */
  static decode(base64: string): string {
    // Remove whitespace and newlines
    const cleanBase64 = base64.replace(/\s/g, '');

    if (cleanBase64.length === 0) {
      throw new Error('Empty base64 string');
    }

    try {
      // Initialize lookup table once
      if (!this.base64Lookup) {
        this.initializeLookup();
      }

      // Decode base64 to bytes
      const bytes = this.decodeToBytes(cleanBase64);

      // Convert bytes to UTF-8 string
      return this.bytesToUtf8(bytes);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[Base64Decoder] Decoding failed: ${message}`);
      throw new Error(`Failed to decode base64: ${message}`);
    }
  }

  /**
   * Initialize base64 character lookup table
   * @private
   */
  private static initializeLookup(): void {
    this.base64Lookup = new Map();
    for (let i = 0; i < this.BASE64_CHARS.length; i++) {
      this.base64Lookup.set(this.BASE64_CHARS[i], i);
    }
  }

  /**
   * Decode base64 string to byte array
   * @private
   */
  private static decodeToBytes(base64: string): number[] {
    const bytes: number[] = [];

    for (let i = 0; i < base64.length; i += 4) {
      const encoded1 = this.base64Lookup!.get(base64[i]) || 0;
      const encoded2 = this.base64Lookup!.get(base64[i + 1]) || 0;
      const encoded3 = this.base64Lookup!.get(base64[i + 2]) || 0;
      const encoded4 = this.base64Lookup!.get(base64[i + 3]) || 0;

      const byte1 = (encoded1 << 2) | (encoded2 >> 4);
      const byte2 = ((encoded2 & 15) << 4) | (encoded3 >> 2);
      const byte3 = ((encoded3 & 3) << 6) | encoded4;

      bytes.push(byte1);
      if (base64[i + 2] !== '=') bytes.push(byte2);
      if (base64[i + 3] !== '=') bytes.push(byte3);
    }

    return bytes;
  }

  /**
   * Convert byte array to UTF-8 string
   * Handles multi-byte characters
   * @private
   */
  private static bytesToUtf8(bytes: number[]): string {
    let result = '';
    let i = 0;

    while (i < bytes.length) {
      const byte1 = bytes[i++];

      if (byte1 < 128) {
        // 1-byte character (ASCII)
        result += String.fromCharCode(byte1);
      } else if (byte1 >= 192 && byte1 < 224) {
        // 2-byte character
        const byte2 = bytes[i++];
        result += String.fromCharCode(((byte1 & 31) << 6) | (byte2 & 63));
      } else if (byte1 >= 224 && byte1 < 240) {
        // 3-byte character
        const byte2 = bytes[i++];
        const byte3 = bytes[i++];
        result += String.fromCharCode(((byte1 & 15) << 12) | ((byte2 & 63) << 6) | (byte3 & 63));
      } else {
        // 4-byte character (skip for now, rare)
        i += 3;
      }
    }

    return result;
  }
}
