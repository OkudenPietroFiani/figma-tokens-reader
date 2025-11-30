# Figma Tokens Reader

A Figma plugin that imports W3C Design Tokens and syncs them to Figma Variables and Styles with automatic type detection, reference resolution, and hierarchical organization.

**🏗️ Architecture:** Built with v3.0 Layered Architecture (100% Use Case pattern adoption)

## Features

- ✅ **Multiple Token Formats** - W3C Design Tokens, Style Dictionary (auto-detected)
- ✅ **Smart References** - Automatic alias resolution (`{color.primary}` → actual value)
- ✅ **GitHub Integration** - Direct import from repositories
- ✅ **Local Import** - Upload ZIP files or JSON files
- ✅ **Token Hierarchy** - Primitives, semantics, components (auto-detected from structure)
- ✅ **Type Support** - Colors, dimensions, typography, shadows, spacing, numbers, strings
- ✅ **Style Generation** - Typography → Text Styles, Shadows → Effect Styles
- ✅ **Documentation** - Auto-generate visual token documentation in Figma

## Quick Start

### Installation

1. Download latest release or clone this repository
2. In Figma: **Plugins → Development → Import plugin from manifest**
3. Select `manifest.json` from this project
4. Plugin ready to use!

### Usage

**Import Tokens:**
1. Run plugin: **Plugins → Development → Figma Tokens Reader**
2. Choose source: **GitHub Repository** or **Local Files**
3. For GitHub: Enter `owner/repo` and file paths (e.g., `tokens/primitives.json`)
4. For Local: Upload JSON files or ZIP archive
5. Click **Import**

**Sync to Figma:**
1. After import, click **Sync to Variables**
2. Tokens converted to Figma Variable Collections
3. Optionally **Sync to Styles** for typography/effects
4. Variables appear in Figma's Local Variables panel

**Token Structure:**
```json
{
  "color": {
    "primary": {
      "$type": "color",
      "$value": "#0066CC"
    }
  },
  "spacing": {
    "sm": {
      "$type": "dimension",
      "$value": "8px"
    }
  }
}
```

## Architecture

Built with **Layered Architecture** (Hexagonal/Ports & Adapters):
- **Presentation Layer** - Figma UI and plugin backend
- **Application Layer** - Use cases (Import, Sync, Query)
- **Domain Layer** - Pure business logic (Token model, services)
- **Infrastructure Layer** - Adapters (Parsers, Exporters, Repository)

**Bundle Size:** 244 KB (well under Figma's limits)
**Build Target:** ES2017 (strict Figma compatibility)
**Dependencies:** Zero runtime dependencies

## Development

### Setup
```bash
git clone https://github.com/OkudenPietroFiani/figma-tokens-reader
cd figma-tokens-reader
npm install
npm run build
```

### Commands
```bash
npm run build          # Build plugin
npm test              # Run tests
npm run test:coverage # Coverage report
```

### Project Structure
```
src/
├── application/       # Use cases, orchestration
├── core/             # Domain logic (Token model, services, ports)
├── infrastructure/   # Adapters (Parsers, Exporters, Repository)
├── backend/          # Plugin backend (controllers, main.ts)
├── frontend/         # Plugin UI (vanilla TypeScript, no React)
├── shared/           # Types, constants
└── utils/            # Pure utilities
```

### Testing
- **Unit Tests:** Domain and application layers
- **Integration Tests:** Use cases with real data
- **Manual Tests:** [Manual Test Checklist](docs/testing/MANUAL_TEST_CHECKLIST.md)

**Current Coverage:** 39.65% (target: 75%+)

## Documentation

### For Users
- [Product Specification](.claude/instructions/PRODUCT_SPECIFICATION.md)
- [Design System Guide](.claude/instructions/DESIGN_SYSTEM.md)

### For Developers
- **[Development Guide](.claude/instructions/DEVELOPMENT_GUIDE.md)** ⭐ Start here
- [Architecture Guide](.claude/instructions/ARCHITECTURE_GUIDE.md)
- [Technical Specification](.claude/instructions/TECHNICAL_SPECIFICATION.md)
- [Figma API Reference](.claude/instructions/FIGMA_API.md)

### Planning & Architecture
- [Layered Architecture ADR](docs/adr/001-layered-architecture.md)
- [Layer Responsibilities](docs/LAYER_RESPONSIBILITIES.md)
- [Implementation Plan](docs/planning/AGILE_IMPLEMENTATION_PLAN.md)
- [Test Coverage Report](docs/testing/TEST_COVERAGE.md)

## Contributing

Contributions welcome! Please:
1. Read [CONTRIBUTING.md](CONTRIBUTING.md)
2. Check [Development Guide](.claude/instructions/DEVELOPMENT_GUIDE.md)
3. Follow architecture patterns
4. Add tests for new features
5. Ensure `npm test` and `npm run build` pass

## Technical Constraints

⚠️ **Critical:** Figma plugins run in strict ES2017 environment
- ✅ Allowed: async/await, Promise.all(), Array methods
- ❌ Forbidden: ES2019+ features (flatMap, BigInt, etc.)
- ❌ No runtime dependencies (zero `dependencies` in package.json)
- ✅ Bundle must be < 300 KB

See [Technical Specification](.claude/instructions/TECHNICAL_SPECIFICATION.md) for details.

## Architecture Highlights

**Clean Architecture Benefits:**
- ✅ Easy to test (94% coverage on core domain)
- ✅ Easy to extend (add parsers/exporters in minutes)
- ✅ Zero circular dependencies
- ✅ Dependency injection throughout

**Adding Features:**
- New token format: Implement `ITokenParser`, register in `main.ts` (5 minutes)
- New export format: Implement `ITokenExporter`, register (5 minutes)
- New operation: Create use case, register (15 minutes)

See examples in [Development Guide](.claude/instructions/DEVELOPMENT_GUIDE.md).

## Status

- ✅ **v3.0** - Layered architecture complete
- ✅ Production-ready with all features working
- ✅ Comprehensive documentation
- 🚧 Test coverage improvement in progress (39% → 75% target)

## License

[MIT License](LICENSE) - Feel free to use and modify.

## Links

- **Repository:** https://github.com/OkudenPietroFiani/figma-tokens-reader
- **Issues:** https://github.com/OkudenPietroFiani/figma-tokens-reader/issues
- **Figma Plugin:** _(Publishing in progress)_

---

**Built with ❤️ using TypeScript and Clean Architecture**

_For detailed technical documentation, see [.claude/instructions/](.claude/instructions/)_
