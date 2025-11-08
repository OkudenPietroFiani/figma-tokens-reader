#!/usr/bin/env node

/**
 * Build script for Figma plugin UI
 *
 * This script:
 * 1. Reads the bundled ui.js file
 * 2. Reads the ui-template.html file
 * 3. Inlines the JavaScript into the HTML
 * 4. Writes the final ui.html file
 *
 * Figma plugins require all JavaScript to be inlined in the HTML file.
 * External script loading via <script src="..."> is not supported.
 */

const fs = require('fs');
const path = require('path');

console.log('[Build UI] Starting...');

// Read the bundled JavaScript
const uiJsPath = path.join(__dirname, 'ui.js');
const uiJs = fs.readFileSync(uiJsPath, 'utf8');
console.log('[Build UI] Read ui.js:', uiJs.length, 'bytes');

// Read the HTML template
const templatePath = path.join(__dirname, 'ui-template.html');
const template = fs.readFileSync(templatePath, 'utf8');
console.log('[Build UI] Read ui-template.html:', template.length, 'bytes');

// Replace the placeholder with the actual JavaScript
const finalHtml = template.replace('<!-- INLINE_BUNDLE_HERE -->', `<script>\n${uiJs}\n</script>`);

// Write the final ui.html
const outputPath = path.join(__dirname, 'ui.html');
fs.writeFileSync(outputPath, finalHtml, 'utf8');

console.log('[Build UI] Generated ui.html:', finalHtml.length, 'bytes');
console.log('[Build UI] Done!');
