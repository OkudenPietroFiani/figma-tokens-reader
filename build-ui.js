#!/usr/bin/env node

/**
 * Build script for Figma plugin UI
 *
 * This script:
 * 1. Reads the main.css file
 * 2. Reads the bundled ui.js file
 * 3. Reads the ui-template.html file
 * 4. Inlines the CSS and JavaScript into the HTML
 * 5. Writes the final ui.html file
 *
 * Figma plugins require all CSS and JavaScript to be inlined in the HTML file.
 * External file loading via <link> or <script src="..."> is not supported.
 */

const fs = require('fs');
const path = require('path');

console.log('[Build UI] Starting...');

// Read the CSS file
const mainCssPath = path.join(__dirname, 'src', 'frontend', 'styles', 'main.css');
const mainCss = fs.readFileSync(mainCssPath, 'utf8');
console.log('[Build UI] Read main.css:', mainCss.length, 'bytes');

// Read the bundled JavaScript
const uiJsPath = path.join(__dirname, 'ui.js');
const uiJs = fs.readFileSync(uiJsPath, 'utf8');
console.log('[Build UI] Read ui.js:', uiJs.length, 'bytes');

// Read the HTML template
const templatePath = path.join(__dirname, 'ui-template.html');
let template = fs.readFileSync(templatePath, 'utf8');
console.log('[Build UI] Read ui-template.html:', template.length, 'bytes');

// Replace CSS placeholder with actual CSS
template = template.replace('<!-- INLINE_CSS_HERE -->', `<style>\n${mainCss}\n</style>`);

// Replace JS placeholder with actual JavaScript
const finalHtml = template.replace('<!-- INLINE_BUNDLE_HERE -->', `<script>\n${uiJs}\n</script>`);

// Write the final ui.html
const outputPath = path.join(__dirname, 'ui.html');
fs.writeFileSync(outputPath, finalHtml, 'utf8');

console.log('[Build UI] Generated ui.html:', finalHtml.length, 'bytes');
console.log('[Build UI] Done!');
