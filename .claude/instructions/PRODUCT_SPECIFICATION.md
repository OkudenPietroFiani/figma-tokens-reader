# Figma Tokens Reader - Product Specification

## What is This?

The **Figma Tokens Reader** is a Figma plugin that imports design tokens from code repositories into Figma, creating native variables and styles automatically. It's the bridge between your design system code and Figma design files.

---

## Core Value Proposition

**For Designers:**
- Always up-to-date design tokens from code
- No manual variable creation
- Visual documentation of all tokens
- Consistent design system

**For Developers:**
- Single source of truth (code → Figma)
- Automated synchronization
- Version control for design tokens
- Cross-platform consistency

**For Teams:**
- Reduced manual errors
- Faster design system updates
- Better designer-developer collaboration

---

## Key Features

### 1. Multi-Source Import
- **GitHub**: Import from repositories
- **Local Files**: Upload JSON files directly
- **GitLab** (Ready to add): Extensible architecture

### 2. Multi-Format Support
- **W3C Design Tokens**: Official spec format
- **Style Dictionary**: Salesforce format
- **Auto-detection**: Automatically identifies format

### 3. Figma Integration
- **Variables**: Color, dimension, number, string, boolean
- **Text Styles**: Typography tokens → native text styles
- **Effect Styles**: Shadow tokens → native effect styles
- **Collections**: Organized by primitive/semantic/custom
- **Code Syntax**: Auto-generate CSS, Android, iOS code

### 4. Smart Features
- **Reference Resolution**: Tokens can reference other tokens
- **Unit Conversion**: rem/em/% → pixels automatically
- **Font Weight Mapping**: 400 → Regular, 700 → Bold, etc.
- **Alpha Channel**: Shadow colors support transparency
- **Parallel Processing**: 6x faster file importing

### 5. Documentation Generator
- Creates visual token tables in Figma
- Shows live previews of colors, spacing, typography
- Customizable layout and fonts
- Auto-layout with proper sizing

---

## Supported Token Types

| Token Type | Creates | Supported Values | Unit Conversion |
|------------|---------|------------------|-----------------|
| `color` | Variable (COLOR) | Hex, RGB, HSL, RGBA | N/A |
| `dimension` | Variable (FLOAT) | px, rem, em, % | ✅ |
| `fontSize` | Variable (FLOAT) | px, rem, em, % | ✅ |
| `spacing` | Variable (FLOAT) | px, rem, em, % | ✅ |
| `number` | Variable (FLOAT) | Any number | N/A |
| `string` | Variable (STRING) | Any string | N/A |
| `boolean` | Variable (BOOLEAN) | true, false | N/A |
| `typography` | Text Style | fontFamily, fontSize, fontWeight, lineHeight, letterSpacing | ✅ |
| `shadow` | Effect Style | offsetX, offsetY, blur, spread, color, inset | ✅ |

---

## Workflows

### Workflow 1: GitHub Import
```
1. Open plugin in Figma
2. Navigate to Import screen
3. Enter:
   - GitHub token
   - Repository URL
   - Branch name
4. Fetch files
5. Select token files to import
6. Plugin automatically:
   - Detects token format
   - Parses tokens
   - Resolves references
   - Creates Figma variables and styles
7. Review results in Tokens screen
```

### Workflow 2: Documentation Generation
```
1. Import tokens (GitHub or local)
2. Navigate to Documentation tab
3. Configure:
   - Select files to include
   - Choose font
   - Toggle descriptions
4. Generate
5. Plugin creates formatted tables on canvas
```

---

## User Acceptance Criteria

### Color Variables
**AC-1**: Hex colors sync correctly
```
Given: Token with value "#E8E9EC"
When: Synced to Figma
Then: Variable shows RGB(232, 233, 236)
```

**AC-2**: HSL colors use hex fallback
```
Given: HSL token with hex property
When: Synced to Figma
Then: Variable shows correct color (not black)
```

**AC-3**: Token references resolve
```
Given: Semantic token "{primitive.color.primary.600}"
When: Resolved and synced
Then: Variable shows resolved color (not reference string)
```

### Dimension Variables
**AC-4**: REM units convert to pixels
```
Given: Token with "0.625rem"
When: Synced to Figma
Then: Variable shows 10 (0.625 × 16px)
```

**AC-5**: Percentage units convert
```
Given: Token with "50%"
When: Synced with percentageBase=16
Then: Variable shows 8 (50% of 16px)
```

### Typography Styles
**AC-6**: Typography tokens create text styles
```
Given: Typography token with fontFamily, fontSize, fontWeight
When: Synced to Figma
Then: Text Style created (not variable)
```

**AC-7**: Font weights map correctly
```
Given: Typography token with fontWeight: 700
When: Synced to Figma
Then: Text Style uses "Bold" font style
```

**AC-8**: Units convert in typography
```
Given: Typography token with fontSize: "2.5rem"
When: Synced to Figma
Then: Text Style has fontSize: 40px
```

### Shadow Styles
**AC-9**: Shadow tokens create effect styles
```
Given: Shadow token with offsetX, offsetY, blur, color
When: Synced to Figma
Then: Effect Style created (not variable)
```

**AC-10**: Shadow type respects inset property
```
Given: Shadow token with inset: true
When: Synced to Figma
Then: Effect Style has type INNER_SHADOW
```

**AC-11**: Shadow colors support alpha
```
Given: Shadow token with color "rgba(0, 0, 0, 0.1)"
When: Synced to Figma
Then: Effect Style color has alpha: 0.1
```

### Collections & Organization
**AC-12**: Multiple collections supported
```
Given: Tokens with collection="primitive" and collection="semantic"
When: Synced to Figma
Then: Two separate collections created
```

**AC-13**: Code syntax generated
```
Given: Token with path ["color", "primary"]
When: Synced to Figma
Then: Variable has code syntax:
  - WEB: --color-primary
  - ANDROID: @dimen/color_primary
  - iOS: color.primary
```

---

## Configuration Options

### Sync Options
```typescript
{
  updateExisting: true,    // Update existing variables/styles
  preserveScopes: true,    // Keep existing variable scopes
  createStyles: true,      // Create text/effect styles from tokens
  percentageBase: 16       // Base size for % conversion (pixels)
}
```

**Examples:**
```typescript
// Default: all features enabled
await sync(tokens);

// Only create new (don't update existing)
await sync(tokens, { updateExisting: false });

// Skip style creation (variables only)
await sync(tokens, { createStyles: false });

// Custom percentage base
await sync(tokens, { percentageBase: 20 }); // 50% = 10px
```

---

## Limitations

### Known Constraints

1. **Color Alpha Not Supported**: Figma COLOR variables don't support transparency
   - Semi-transparent colors sync as fully opaque
   - **Workaround**: Use shadow tokens (they support alpha)

2. **Font Must Be Installed**: Typography tokens require font in Figma
   - If font missing, text style creation fails
   - **Workaround**: Install required fonts before syncing

3. **REM/EM Base Fixed**: Default 16px base
   - **Workaround**: Configurable via `percentageBase` option

4. **Circular References**: Detected but may cause partial resolution
   - Warning logged in console

---

## Success Metrics

### Performance
- **File Import**: 6x faster with parallel processing
- **Large Repos**: Handles 100+ token files
- **Batch Size**: Configurable rate limiting

### Quality
- **172 Tests**: Comprehensive coverage
- **SOLID Compliance**: 10/10 architecture score
- **Type Safety**: 100% TypeScript

---

## Use Cases

### Use Case 1: Design System Maintenance
**Scenario**: Design system defined in code (JSON tokens)

**Goal**: Keep Figma in sync with code

**Solution**: Configure GitHub import, sync automatically

**Benefit**: Designers always have latest tokens

### Use Case 2: Cross-Platform Design Systems
**Scenario**: Manage tokens for web, mobile, desktop

**Goal**: Maintain consistency across platforms

**Solution**: Import different token sets from GitHub branches

**Benefit**: Single source of truth across platforms

### Use Case 3: Visual Documentation
**Scenario**: Need stakeholder-friendly token documentation

**Goal**: Create visual documentation

**Solution**: Use built-in documentation generator

**Benefit**: Beautiful token tables with live previews

---

## Token Format Examples

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

### Typography Tokens
```json
{
  "heading/h1": {
    "$type": "typography",
    "$value": {
      "fontFamily": "Inter",
      "fontSize": "2.5rem",
      "fontWeight": 700,
      "lineHeight": "3rem",
      "letterSpacing": "0.02em"
    }
  }
}
```

### Shadow Tokens
```json
{
  "shadow/card": {
    "$type": "shadow",
    "$value": {
      "offsetX": "0px",
      "offsetY": "4px",
      "blur": "8px",
      "spread": "0px",
      "color": "rgba(0, 0, 0, 0.1)"
    }
  }
}
```

---

## Future Roadmap

### Planned Features
- Bidirectional sync (Figma → Code)
- CI/CD integration (GitHub Actions)
- More token visualizers
- Bulk token editing
- Token versioning

### Potential Integrations
- Zeroheight documentation
- Storybook integration
- Tokens Studio compatibility

---

**Version**: 1.0
**Last Updated**: 2025-11-15
**Status**: Production Ready ✅
