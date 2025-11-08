// HTML Sanitization Utilities
// Prevents XSS attacks by escaping HTML special characters

/**
 * Escapes HTML special characters to prevent XSS attacks
 *
 * @param unsafe - String that may contain HTML special characters
 * @returns Sanitized string safe for innerHTML
 *
 * @example
 * escapeHtml('<script>alert("xss")</script>')
 * // Returns: '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
 */
export function escapeHtml(unsafe: string): string {
  if (typeof unsafe !== 'string') {
    return String(unsafe);
  }

  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Escapes HTML attributes to prevent XSS in attribute values
 * More strict than escapeHtml as it also escapes backticks
 *
 * @param unsafe - String to be used in HTML attribute
 * @returns Sanitized string safe for HTML attributes
 */
export function escapeHtmlAttr(unsafe: string): string {
  if (typeof unsafe !== 'string') {
    return String(unsafe);
  }

  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/`/g, '&#96;');
}

/**
 * Creates a safe HTML ID from potentially unsafe input
 * Removes/replaces characters that could cause issues in CSS selectors
 *
 * @param unsafe - String to convert to safe ID
 * @returns Safe ID string
 */
export function sanitizeId(unsafe: string): string {
  if (typeof unsafe !== 'string') {
    return String(unsafe);
  }

  // Replace unsafe characters with hyphens, remove leading/trailing hyphens
  return unsafe
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

/**
 * Safely sets text content (alternative to innerHTML)
 * Use this when you only need to display text
 *
 * @param element - DOM element to update
 * @param text - Text content to set
 */
export function setTextContent(element: HTMLElement, text: string): void {
  element.textContent = text;
}

/**
 * Safely creates HTML from a template with escaped values
 *
 * @param strings - Template string parts
 * @param values - Values to escape and insert
 * @returns Safe HTML string
 *
 * @example
 * const name = '<script>alert("xss")</script>';
 * const html = safeHtml`<div>${name}</div>`;
 * // Returns: '<div>&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;</div>'
 */
export function safeHtml(strings: TemplateStringsArray, ...values: any[]): string {
  let result = strings[0];

  for (let i = 0; i < values.length; i++) {
    result += escapeHtml(String(values[i]));
    result += strings[i + 1];
  }

  return result;
}
