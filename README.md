# W3C Design Tokens Importer for Figma

A Figma plugin that imports W3C Design Tokens from JSON files and automatically converts them to Figma variables with proper type mapping and reference resolution.

## Features

### 🎨 Comprehensive Token Support
- **Colors**: HSL, RGB, HEX formats with automatic conversion
- **Spacing & Dimensions**: px and rem units (rem converted to px using 16px base)
- **Typography**: Font families, weights, sizes, and line heights
- **Numbers**: Raw numeric values for opacity, transparency, etc.

### 📦 Flexible Import Options
- Upload ZIP files containing multiple JSON files
- Upload individual JSON files (primitives.json, semantics.json)
- Drag-and-drop support for easy file upload
- Automatic file detection and parsing

### 🔗 Smart Reference Resolution
- Automatically resolves token references (e.g., `{primitive.color.primary.600}`)
- Creates Figma variable aliases for referenced tokens
- Supports both primitive and semantic token structures
- Handles nested token hierarchies

### 🎯 Figma Integration
- Creates two variable collections: "Primitive" and "Semantic"
- Replicates exact token hierarchy as nested groups
- Proper type mapping:
  - `color` → COLOR
  - `spacing`/`dimension` → FLOAT
  - `fontFamily`/`fontWeight` → STRING
  - `number` → FLOAT

### 🖥️ Modern UI
- Clean, Figma-style interface
- Two-column JSON preview with syntax highlighting
- Real-time loading states
- Success/error messages with details
- Responsive design (800x600 minimum)

## Installation

### Option 1: Install from Figma Community (Coming Soon)
1. Open Figma
2. Go to Plugins → Browse plugins in Community
3. Search for "W3C Design Tokens Importer"
4. Click Install

### Option 2: Development Installation
1. Clone this repository:
   ```bash
   git clone https://github.com/OkudenPietroFiana/figma-tokens-reader.git
   cd figma-tokens-reader
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the plugin:
   ```bash
   npm run build
   ```

4. In Figma:
   - Go to **Plugins → Development → Import plugin from manifest**
   - Select the `manifest.json` file from this repository
   - The plugin will now appear in your Plugins menu

## Usage

### 1. Prepare Your Token Files

Create W3C-compliant design token JSON files. Example structure:

**primitives.json:**
```json
{
  "color": {
    "primary": {
      "600": {
        "$value": "#1e40af",
        "$type": "color",
        "$description": "Primary brand color"
      }
    }
  },
  "spacing": {
    "sm": {
      "$value": "8px",
      "$type": "spacing"
    }
  }
}
```

**semantics.json:**
```json
{
  "button": {
    "primary": {
      "background": {
        "$value": "{color.primary.600}",
        "$type": "color"
      }
    }
  }
}
```

### 2. Run the Plugin

1. Open your Figma file
2. Go to **Plugins → W3C Design Tokens Importer**
3. The plugin window will open (800x600)

### 3. Import Your Tokens

**Option A: ZIP File**
- Create a ZIP file containing your `primitives.json` and `semantics.json`
- Drag and drop the ZIP file into the upload area, or click to browse

**Option B: Individual JSON Files**
- Select multiple JSON files (primitives.json and semantics.json)
- The plugin will automatically detect and parse them

### 4. Preview & Export

1. Review the JSON preview in the two-column layout
2. Click **"Export to Figma Variables"**
3. Wait for the import process to complete
4. Success! Your tokens are now available as Figma variables

## Token Format Specification

### Supported Token Types

| Token Type | W3C Format | Figma Variable Type | Conversion |
|------------|------------|---------------------|------------|
| Color | `#ff0000`, `rgb(255,0,0)`, `hsl(0,100%,50%)` | COLOR | Normalized to RGB |
| Spacing | `8px`, `1rem` | FLOAT | Strip px, convert rem (16px base) |
| Dimension | `16px`, `1.5rem` | FLOAT | Strip px, convert rem (16px base) |
| Font Family | `"Inter"`, `["Inter", "sans-serif"]` | STRING | String representation |
| Font Weight | `400`, `"bold"` | STRING | String representation |
| Font Size | `16px`, `1rem` | FLOAT | Convert to pixels |
| Line Height | `1.5`, `24px` | STRING | String representation |
| Number | `0.8`, `1.5` | FLOAT | Raw numeric value |

### Token Structure

Each token must have a `$value` property. Optional properties:
- `$type`: Explicit type declaration (recommended)
- `$description`: Token description (becomes variable description in Figma)

### Token References

Reference other tokens using curly braces:
```json
{
  "semantic-color": {
    "$value": "{primitive.color.primary.600}",
    "$type": "color"
  }
}
```

Supported reference formats:
- `{primitive.color.primary.600}`
- `{color.primary.600}`
- `{color/primary/600}`

## File Structure

```
figma-tokens-reader/
├── manifest.json          # Figma plugin manifest
├── code.ts               # Plugin logic (TypeScript)
├── code.js               # Compiled plugin code
├── ui.html               # Plugin UI (includes styles and JSZip)
├── package.json          # Node dependencies
├── tsconfig.json         # TypeScript configuration
└── README.md            # This file
```

## Development

### Build Command
```bash
npm run build
```
Compiles TypeScript to JavaScript.

### Watch Mode
```bash
npm run watch
```
Auto-recompiles on file changes.

### Lint
```bash
npm run lint
```
Check code quality with ESLint.

### Fix Lint Issues
```bash
npm run lint:fix
```

## Technology Stack

- **TypeScript**: Type-safe plugin development
- **Figma Plugin API**: Variable creation and management
- **JSZip**: ZIP file extraction (loaded via CDN)
- **Vanilla JavaScript**: UI interactions (no framework dependencies)

## Error Handling

The plugin handles various error scenarios:

- ❌ Invalid ZIP structure
- ❌ Missing required files
- ❌ JSON parsing errors
- ❌ Invalid token references
- ❌ Figma API errors
- ❌ Type conversion errors

All errors are displayed in the UI with detailed messages.

## Known Limitations

1. **Token References**: References must point to existing tokens in the same import
2. **Type Inference**: If `$type` is not specified, the plugin infers type from value format
3. **Collections**: Existing "Primitive" and "Semantic" collections will be reused and updated
4. **Nested References**: Multiple levels of references are resolved, but circular references are not supported

## Troubleshooting

### Plugin Won't Load
- Ensure `code.js` exists (run `npm run build`)
- Check Figma console for errors (Plugins → Development → Open Console)

### Tokens Not Importing
- Verify JSON structure matches W3C format
- Ensure files are named correctly (primitives.json, semantics.json)
- Check for JSON syntax errors

### References Not Resolving
- Ensure referenced tokens exist
- Check reference syntax (use dots or slashes)
- Verify primitives are imported before semantics

### Build Errors
- Run `npm install` to ensure all dependencies are installed
- Check Node.js version (recommended: 16+)

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is open source and available under the MIT License.

## Support

If you encounter any issues or have questions:

1. Check the [Troubleshooting](#troubleshooting) section
2. Open an issue on GitHub
3. Review the W3C Design Tokens spec: https://design-tokens.github.io/community-group/format/

## Acknowledgments

- Built with the [Figma Plugin API](https://www.figma.com/plugin-docs/)
- W3C Design Tokens Community Group
- [JSZip](https://stuk.github.io/jszip/) for ZIP file handling

---

**Version**: 1.0.0
**Author**: Pietro Fiana
**Repository**: https://github.com/OkudenPietroFiana/figma-tokens-reader
