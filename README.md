# W3C Design Tokens Importer for Figma

A Figma plugin that imports W3C Design Tokens and Style Dictionary formats from GitHub or local files, automatically converting them to Figma variables with parallel processing and smart format detection.

## Features

- **Multiple Token Formats**: W3C Design Tokens and Style Dictionary support
- **GitHub Integration**: Direct import from GitHub repositories
- **Local Import**: Upload ZIP files or individual JSON files
- **Parallel Processing**: 6x faster file fetching with batched parallel processing
- **Auto-Format Detection**: Automatically detects token format with confidence scoring
- **Smart References**: Resolves token references and creates Figma variable aliases
- **Comprehensive Types**: Colors (HSL, RGB, HEX), spacing, dimensions, typography, numbers
- **Scope Management**: Apply Figma variable scopes via dedicated UI
- **Modern Architecture**: SOLID principles, registry pattern, dependency injection

## Installation

### Development Installation

1. Clone and install:
   ```bash
   git clone https://github.com/OkudenPietroFiana/figma-tokens-reader.git
   cd figma-tokens-reader
   npm install
   npm run build
   ```

2. In Figma:
   - Go to **Plugins → Development → Import plugin from manifest**
   - Select the `manifest.json` file
   - Plugin appears in your Plugins menu

## Quick Start

### GitHub Import
1. Open plugin in Figma
2. Select **GitHub** import mode
3. Enter repository details (owner, repo, branch, token)
4. Select token files to import
5. Click **Sync to Figma** to import

### Local Import
1. Open plugin in Figma
2. Select **Local** import mode
3. Upload ZIP file or individual JSON files
4. Preview loaded tokens
5. Click **Export to Figma Variables**

### Token Format Examples

**W3C Design Tokens** (primitives.json):
```json
{
  "color": {
    "primary": {
      "600": {
        "$value": "#1e40af",
        "$type": "color"
      }
    }
  }
}
```

**Style Dictionary** (tokens.json):
```json
{
  "color": {
    "primary": {
      "value": "#1e40af",
      "type": "color"
    }
  }
}
```

**References** (semantics.json):
```json
{
  "button": {
    "background": {
      "$value": "{color.primary.600}",
      "$type": "color"
    }
  }
}
```

## Token Sync Features

### Supported Token Types

#### Colors
The plugin supports multiple color formats with automatic conversion to Figma RGB:

**✅ Supported Formats:**
- Hex: `"#E8E9EC"`, `"#f80"` (3-digit), `"#ff8800ff"` (8-digit)
- RGB strings: `"rgb(255, 128, 0)"`, `"rgba(255, 128, 0, 0.5)"`
- RGB objects: `{ r: 255, g: 128, b: 0 }` or `{ r: 1.0, g: 0.5, b: 0.0 }`
- HSL with hex: `{ colorSpace: "hsl", components: [225, 16, 92], hex: "#E8E9EC" }`

**Expected Result**: Colors display correctly in Figma variables (not black or gray)

#### Dimensions (Font Size, Spacing, Border Radius)
The plugin automatically converts rem/em units to pixels:

**✅ Supported Formats:**
- Direct pixels: `16`, `"32px"`, `{ value: 16, unit: "px" }`
- REM units: `"0.625rem"` → **10px**, `{ value: 0.625, unit: "rem" }` → **10px**
- EM units: `"1.5em"` → **24px**, `{ value: 1.5, unit: "em" }` → **24px**

**Conversion Rule**: REM/EM values × 16 = Pixels (standard browser base)

**Examples:**
- `0.625rem` → `10px`
- `0.75rem` → `12px`
- `1rem` → `16px`
- `1.5rem` → `24px`
- `2.5rem` → `40px`

**Expected Result**: Dimensions show pixel values in Figma (not fractional rem values like 0.625)

#### Token References
The plugin resolves all token references before syncing:

**✅ Supported Formats:**
- Simple alias: `"{primitive.color.primary.600}"`
- Nested references: `"{semantic.button.background}"`
- Cross-collection: Semantic tokens can reference primitive tokens

**Expected Result**: Variables show resolved values (not `"{...}"` reference strings)

### Code Syntax Generation

All synced variables include platform-specific code syntax:

- **WEB**: `--color-primary` (CSS custom properties)
- **ANDROID**: `@dimen/color_primary` (Android resources)
- **iOS**: `color.primary` (iOS tokens)

**How to View**: In Figma, select a variable → right panel shows code syntax for each platform

### Collections

Tokens are organized into separate Figma variable collections:

- **primitive** collection: Base design tokens (colors, spacing, etc.)
- **semantic** collection: Contextual tokens (button.background, text.primary, etc.)
- Custom collections: Any collection name from your tokens

**Expected Result**: Each collection appears separately in Figma's variable panel

### Verification Checklist

After syncing tokens, verify:

✅ **Colors display correctly**
- Primitive colors show RGB values (not black)
- HSL colors use hex fallback (not black)
- Semantic colors resolve to primitive values

✅ **Dimensions show pixel values**
- Font sizes: `10px`, `12px`, `16px` (not `0.625`, `0.75`, `1`)
- Spacing: `4px`, `8px`, `16px` (not fractional rem values)
- Border radius: pixel values (not rem values)

✅ **Variable types match token types**
- Color tokens → COLOR variables
- Dimension/number tokens → FLOAT variables
- String tokens → STRING variables

✅ **Code syntax present**
- WEB syntax shows `--token-name`
- ANDROID syntax shows `@dimen/token_name`
- iOS syntax shows `token.name`

✅ **Collections organized**
- Primitive collection exists with base tokens
- Semantic collection exists with contextual tokens
- No mixing of collections

### Troubleshooting Sync Issues

**Issue: All colors are black**
- **Cause**: HSL colors without hex fallback OR unresolved references
- **Solution**: Ensure your HSL color tokens include a `hex` property
- **Check Console**: Look for `[FigmaSyncService] Converting HSL color using hex fallback: #...`

**Issue: Font sizes show 0.625 instead of 10px**
- **Cause**: REM/EM units not being converted
- **Solution**: Verify tokens have `unit: "rem"` property
- **Check Console**: Look for `[FigmaSyncService] Converted 0.625rem to 10px`

**Issue: Variables show "{primitive.color...}" instead of color**
- **Cause**: References not resolved before sync
- **Solution**: Reload plugin (fix implemented in latest version)
- **Check Console**: Look for `[TokenController] Resolved X token values`

**Issue: Code syntax missing**
- **Cause**: Outdated Figma desktop app
- **Solution**: Update Figma to latest version
- **Check Console**: Look for `setVariableCodeSyntax method not available`

## Development

### Build Commands
```bash
npm run build        # Build plugin
npm run watch        # Auto-rebuild on changes
npm test             # Run tests (172 tests)
npm run lint         # Check code quality
npm run lint:fix     # Auto-fix lint issues
```

### Architecture

The plugin uses a modern, extensible architecture (Phases 1-4 complete):
- **Registry Pattern**: For file sources and token formats
- **Adapter Pattern**: Wraps existing services with new interfaces
- **Strategy Pattern**: Different parsing strategies per format
- **Parallel Processing**: BatchProcessor for 6x faster fetching
- **Feature Flags**: Safe rollout of new features
- **Result Pattern**: Type-safe error handling

### Contributing

For development guidelines, see:
- `.claude/instructions/SOLID_PRINCIPLES.md` - SOLID architecture guidelines
- `.claude/instructions/CODE_STYLE.md` - Code style and DRY principles
- `.claude/instructions/TESTING.md` - Testing requirements and patterns
- `.claude/instructions/ARCHITECTURE_DECISIONS.md` - Mandatory patterns
- `.claude/instructions/CONTRIBUTING.md` - Quick-start guides for adding features

All contributions must:
- Follow SOLID principles (target: 9/10 minimum)
- Maintain 85-100% test coverage
- Pass all 172+ tests
- Follow DRY principles for code and CSS
- Include tests for new features

See `ARCHITECTURE.md` for detailed architecture documentation.

## Technology Stack

- **TypeScript**: Type-safe development
- **Figma Plugin API**: Variable and scope management
- **GitHub API**: Repository integration with parallel fetching
- **Jest**: Testing framework (172 tests, 85-100% coverage)
- **ESBuild**: Fast compilation

## Troubleshooting

**Plugin won't load**: Run `npm run build` to compile code.js

**Tokens not importing**: Verify JSON matches W3C or Style Dictionary format

**GitHub import fails**: Check token permissions and repository access

**References not resolving**: Ensure referenced tokens exist and use correct syntax `{path.to.token}`

For detailed troubleshooting, check Figma console: **Plugins → Development → Open Console**

## Support

- Open issues on [GitHub](https://github.com/OkudenPietroFiana/figma-tokens-reader/issues)
- Review [W3C Design Tokens spec](https://design-tokens.github.io/community-group/format/)
- Review [Style Dictionary docs](https://amzn.github.io/style-dictionary/)

## License

MIT License

---

**Version**: 1.1.0
**Author**: Pietro Fiana
**Repository**: https://github.com/OkudenPietroFiana/figma-tokens-reader
