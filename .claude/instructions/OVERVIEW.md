# Project Overview - Figma Tokens Reader

## What is this plugin?

The **Figma Tokens Reader** is a Figma plugin that imports design tokens from various sources and formats, transforming them into native Figma variables and styles. It bridges the gap between design systems defined in code and Figma design files.

## Key Features

### 🎯 Multi-Source Support
- **GitHub**: Import tokens from GitHub repositories
- **Local Files**: Upload token files directly
- **GitLab** (Ready): Add in 2 hours using `IFileSource` interface
- **Bitbucket** (Ready): Same extensible architecture

### 📦 Multi-Format Support
- **W3C Design Tokens**: Official W3C spec format
- **Style Dictionary**: Salesforce token format
- **Theo** (Ready): Add in 1 hour using `ITokenFormatStrategy`
- **Auto-detection**: Automatically identifies token format

### ⚡ Performance
- **6x faster** file importing with parallel processing
- Batch processing with configurable rate limiting
- Progress tracking for long operations
- Error isolation (one file failure doesn't break all)

### 🎨 Rich Visualization
- **Documentation Generator**: Creates visual token tables in Figma
- Token visualizers for colors, spacing, typography, borders
- Auto-layout with proper content hugging
- Customizable fonts and layouts

### 🔄 Token Management
- Import tokens as Figma variables
- Create/update Figma styles from tokens
- Scope selection for granular control
- Variable references (tokens consuming other tokens)

---

## Use Cases

### 1. Design System Maintenance
**Scenario**: Your design system is defined in code (JSON tokens), and you want to keep Figma in sync.

**Solution**: Use this plugin to automatically import tokens into Figma as variables, ensuring designers always have the latest design system.

### 2. Cross-Platform Design Systems
**Scenario**: You manage tokens for web, mobile, and desktop platforms.

**Solution**: Import different token sets from GitHub branches or folders, apply them to different Figma files, and maintain consistency across platforms.

### 3. Documentation Generation
**Scenario**: You need to create visual documentation of your design tokens for stakeholders.

**Solution**: Use the built-in documentation generator to create beautiful, organized tables of all your tokens with live previews.

### 4. Token Migration
**Scenario**: Migrating from one token format (e.g., custom) to another (e.g., W3C).

**Solution**: Auto-detection identifies the current format, and you can easily export/convert to another format using the same interface.

---

## Supported Token Types

### Visual Tokens
- **Colors**: Hex, RGB, HSL, with alpha support
- **Spacing**: Dimensions, margins, paddings
- **Border Radius**: Corner radiuses
- **Font Sizes**: Typography scales
- **Font Weights**: 100-900, named weights
- **Line Heights**: Leading values

### Semantic Tokens
- **Token References**: Tokens that reference other tokens
- **Recursive Resolution**: Automatically resolves nested references
- **Aliases**: W3C-style `$value` references
- **Mode Support**: Different values for light/dark modes

---

## Workflows

### Workflow 1: GitHub Import
```
1. Navigate to Import screen
2. Enter GitHub credentials (token, repo URL, branch)
3. Fetch files from repository
4. Select token files to import
5. Plugin automatically:
   - Detects token format
   - Parses tokens
   - Creates Figma variables
   - Creates/updates styles
```

### Workflow 2: Local Import
```
1. Navigate to Import screen
2. Upload JSON token files
3. Plugin processes files immediately
4. Review imported tokens in Tokens screen
5. Select scopes in Scope screen
6. Apply to Figma
```

### Workflow 3: Documentation Generation
```
1. Import tokens (via GitHub or local)
2. Navigate to Documentation screen
3. Configure:
   - Select token files
   - Choose font
   - Toggle descriptions
4. Generate documentation
5. Plugin creates formatted tables in Figma canvas
```

---

## Architecture Highlights

### Extensible Design
- **Registry Pattern**: Add new file sources or formats without modifying existing code
- **Strategy Pattern**: Different parsing strategies for different formats
- **Adapter Pattern**: Wrap existing services to match new interfaces

### Performance Optimized
- **Parallel Processing**: Batch processor for concurrent file fetching
- **Rate Limiting**: Configurable delays to respect API limits
- **Error Isolation**: Individual failures don't cascade

### Type-Safe
- **TypeScript**: 100% TypeScript codebase
- **Result Pattern**: Type-safe error handling (no exceptions)
- **Strict Types**: No `any` types, explicit interfaces

### Well-Tested
- **172 Tests**: Comprehensive test coverage
- **85-100% Coverage**: High coverage on new code
- **Unit Tests**: Fast, isolated tests
- **Integration Tests**: End-to-end workflows

---

## Technical Stack

### Frontend
- **TypeScript**: Type-safe development
- **CSS Variables**: Design system tokens
- **Component Pattern**: Reusable UI components
- **State Management**: Centralized AppState

### Backend
- **Figma Plugin API**: Native Figma integration
- **Controller Pattern**: Business logic orchestration
- **Service Layer**: Reusable services
- **Utility Layer**: Pure functions

### Build
- **esbuild**: Fast bundling
- **TypeScript Compiler**: Type checking
- **Jest**: Testing framework
- **npm scripts**: Automated builds

---

## Project Statistics

| Metric | Value |
|--------|-------|
| **Lines of Code** | ~15,000 |
| **Files** | 60+ |
| **Tests** | 172 |
| **Coverage** | 85-100% |
| **Bundle Size** | 115.4kb |
| **Languages** | TypeScript, CSS |

---

## Supported Formats

### W3C Design Tokens
```json
{
  "color": {
    "primary": {
      "$type": "color",
      "$value": "#0066FF",
      "$description": "Primary brand color"
    }
  }
}
```

### Style Dictionary
```json
{
  "color": {
    "primary": {
      "value": "#0066FF",
      "type": "color"
    }
  }
}
```

### With References
```json
{
  "color": {
    "brand": {
      "$type": "color",
      "$value": "#0066FF"
    },
    "primary": {
      "$type": "color",
      "$value": "{color.brand}"
    }
  }
}
```

---

## Benefits

### For Designers
- ✅ Always up-to-date design tokens
- ✅ Visual documentation of all tokens
- ✅ No manual variable creation
- ✅ Consistent design system

### For Developers
- ✅ Single source of truth (code → Figma)
- ✅ Automated synchronization
- ✅ Version control for design tokens
- ✅ CI/CD integration potential

### For Teams
- ✅ Cross-platform consistency
- ✅ Reduced manual errors
- ✅ Faster design system updates
- ✅ Better collaboration

---

## Limitations & Constraints

### Figma API Constraints
- Limited to local variables (no remote styles yet)
- Auto-layout requires specific patterns (see FIGMA_INTEGRATION.md)
- Plugin sandbox restrictions (no external scripts)

### Token Format Support
- Currently: W3C and Style Dictionary
- Future: Theo, custom formats (easy to add)

### File Size
- Optimized for 1-100 token files
- Large repos (1000+ files) may need filtering

---

## Future Roadmap

### Planned Features
- [ ] CI/CD integration (GitHub Actions)
- [ ] Bidirectional sync (Figma → Code)
- [ ] More token visualizers (shadows, animations)
- [ ] Bulk token editing
- [ ] Token versioning

### Potential Integrations
- [ ] Zeroheight documentation
- [ ] Storybook integration
- [ ] Tokens Studio integration
- [ ] Design system validators

---

## Getting Started

1. **Install Plugin**: Search "Figma Tokens Reader" in Figma Community
2. **Choose Source**: GitHub or Local files
3. **Import Tokens**: Follow the workflow
4. **Generate Docs** (optional): Create visual documentation
5. **Use Tokens**: Apply variables in your designs

For detailed instructions, see:
- [`DEVELOPMENT_GUIDE.md`](./DEVELOPMENT_GUIDE.md) - For contributors
- [`API_REFERENCE.md`](./API_REFERENCE.md) - For developers
- [`FIGMA_INTEGRATION.md`](./FIGMA_INTEGRATION.md) - For Figma-specific features

---

**Last Updated**: 2025-11-11
**Version**: 3.0
**Status**: Production Ready ✅
