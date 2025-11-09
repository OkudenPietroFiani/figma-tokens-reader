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
