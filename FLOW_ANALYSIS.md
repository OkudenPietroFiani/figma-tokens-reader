# Figma Tokens Reader - Data Flow Analysis & Acceptance Criteria

**Date**: 2025-11-16
**Purpose**: Comprehensive mapping of all data flows with acceptance criteria, constraints, and improvement opportunities
**Status**: For Validation

---

## Table of Contents
1. [Flow 1: Token Import from External Sources](#flow-1-token-import-from-external-sources)
2. [Flow 2: Token Resolution & Processing](#flow-2-token-resolution--processing)
3. [Flow 3: Figma Variable Sync](#flow-3-figma-variable-sync)
4. [Flow 4: Figma Style Creation](#flow-4-figma-style-creation)
5. [Critical Constraints](#critical-constraints)
6. [Type Mapping Reference](#type-mapping-reference)
7. [Audit Findings](#audit-findings)

---

## Flow 1: Token Import from External Sources

### Purpose
Import design token files from GitHub, local upload, or other sources into the plugin's universal Token model.

### Steps

#### 1.1 Source Selection & Configuration
**Input**: User selects source type (GitHub, Local, etc.)
**Output**: Configured file source
**Constraints**:
- GitHub requires valid Personal Access Token
- Repository URL must be accessible
- Branch must exist

**Acceptance Criteria**:
```
AC-1.1.1: GitHub source validates token permissions
  Given: Invalid GitHub token
  When: User attempts to fetch files
  Then: Clear error message displayed

AC-1.1.2: Repository URL validation
  Given: Malformed repository URL
  When: User submits configuration
  Then: Validation error shown before API call
```

#### 1.2 File Discovery & Selection
**Input**: Source configuration
**Output**: List of available JSON files
**Process**:
1. `FileSourceRegistry.get(sourceType)` → Returns `IFileSource` implementation
2. `source.fetchFileList(config)` → Returns `Result<FileMetadata[]>`
3. Filter for `.json` files using `FileClassifier.isTokenFile()`
4. Display in UI for user selection

**Constraints**:
- Only JSON files are shown
- Maximum file size: (not specified - potential constraint needed)
- Parallel fetching using `BatchProcessor` (10 files per batch, 100ms delay)

**Acceptance Criteria**:
```
AC-1.2.1: Only JSON files displayed
  Given: Repository with .json, .ts, .md files
  When: File list fetched
  Then: Only .json files shown to user

AC-1.2.2: Parallel fetch performance
  Given: 50 JSON files in repository
  When: File list fetched
  Then: Completes in < 10 seconds (vs 30-45s sequential)
```

#### 1.3 File Content Retrieval
**Input**: Selected file paths
**Output**: Raw JSON content
**Process**:
1. `source.fetchMultipleFiles(config, filePaths)` → Uses `BatchProcessor`
2. Decode Base64 content using `Base64Decoder.decode()`
3. Parse JSON → Raw token data

**Constraints**:
- Files fetched in parallel (batchSize: 10, delayMs: 100)
- Base64 encoded content from GitHub API
- Must handle JSON parse errors gracefully

**Acceptance Criteria**:
```
AC-1.3.1: Base64 decoding
  Given: GitHub API returns base64 encoded content
  When: File content fetched
  Then: Correctly decoded to UTF-8 JSON string

AC-1.3.2: JSON parse error handling
  Given: Invalid JSON file
  When: Content parsed
  Then: Error logged, file skipped, user notified
```

#### 1.4 Format Detection
**Input**: Raw JSON data
**Output**: Detected format strategy
**Process**:
1. `TokenFormatRegistry.detectFormat(data)` → Auto-detection
2. Each registered strategy returns confidence score (0-1)
3. Highest confidence strategy selected
4. Format displayed to user for confirmation

**Supported Formats**:
- **W3C Design Tokens**: Keys `$type`, `$value` (confidence: 0.9)
- **Style Dictionary**: Keys `value`, no `$` prefix (confidence: 0.7)
- **Custom**: Fallback format

**Constraints**:
- Minimum confidence threshold: 0.5
- If multiple formats have same confidence, first registered wins
- Manual format override not currently supported (potential enhancement)

**Acceptance Criteria**:
```
AC-1.4.1: W3C format detection
  Given: Token file with "$type" and "$value" keys
  When: Format detected
  Then: W3CTokenFormatStrategy selected (confidence: 0.9)

AC-1.4.2: Style Dictionary detection
  Given: Token file with "value" key, no "$" prefix
  When: Format detected
  Then: StyleDictionaryFormatStrategy selected

AC-1.4.3: Ambiguous format handling
  Given: Token file with mixed patterns
  When: Format detected
  Then: Strategy with highest confidence used
```

#### 1.5 Token Parsing
**Input**: Raw JSON + Format strategy
**Output**: Array of `Token` objects
**Process**:
1. `strategy.parseTokens(data)` → Returns `Result<Token[]>`
2. Recursive traversal of token tree
3. Normalize to universal Token model
4. Extract metadata (type, value, path, qualifiedName)

**Token Model Fields**:
```typescript
Token {
  // Identity
  id: string                    // hash(projectId + qualifiedName)
  path: string[]                // ['color', 'semantic', 'button', 'primary']
  name: string                  // 'primary'
  qualifiedName: string         // 'color.semantic.button.primary'

  // Value
  type: TokenType               // 'color' | 'dimension' | 'typography' | etc.
  rawValue: any                 // Original value from JSON
  value: TokenValue             // Normalized value
  resolvedValue?: TokenValue    // After alias resolution

  // Relationships
  aliasTo?: string              // Reference to another token
  referencedBy?: string[]       // Tokens referencing this one

  // Organization
  projectId: string             // For multi-project isolation
  collection: string            // 'primitive' | 'semantic' | custom
  theme?: string
  brand?: string

  // Metadata
  description?: string
  sourceFormat: string          // 'w3c' | 'style-dictionary'
  source: TokenSource
  extensions: TokenExtensions
  tags: string[]
  status: TokenStatus

  // Timestamps
  created: string
  lastModified: string
}
```

**Constraints**:
- `qualifiedName` must be unique within project
- `id` is deterministic: `hash(projectId + qualifiedName)`
- Type inference from value if `$type` missing
- References stored as strings in `aliasTo`
- Collection defaults to filename or 'default'

**Acceptance Criteria**:
```
AC-1.5.1: Token identity generation
  Given: Token at path ['color', 'primary', '600']
  When: Parsed from JSON
  Then:
    - qualifiedName = 'color.primary.600'
    - id = hash('default' + 'color.primary.600')

AC-1.5.2: Type inference
  Given: Token with value "#FF0000", no $type
  When: Parsed
  Then: type = 'color' (inferred)

AC-1.5.3: Reference detection
  Given: Token with value "{primitive.color.blue}"
  When: Parsed
  Then: aliasTo = 'primitive.color.blue'

AC-1.5.4: Composite token parsing
  Given: Typography token with nested properties
  When: Parsed
  Then: value = { fontFamily, fontSize, lineHeight, ... }
```

#### 1.6 Repository Storage
**Input**: Parsed `Token[]`
**Output**: Tokens stored in `TokenRepository`
**Process**:
1. `repository.add(tokens)` → Stores in memory
2. Index by id, qualifiedName, collection, type
3. Build reference graph (aliasTo, referencedBy)
4. Available for resolution and sync

**Constraints**:
- Repository is in-memory only (no persistence)
- Tokens cleared on plugin reload
- Multiple imports append to repository
- Duplicate tokens (same id) get replaced

**Acceptance Criteria**:
```
AC-1.6.1: Token retrieval by ID
  Given: Token stored with id 'abc123'
  When: repository.get('abc123')
  Then: Returns correct token

AC-1.6.2: Collection filtering
  Given: Tokens with collections 'primitive', 'semantic'
  When: repository.getByCollection('primitive')
  Then: Returns only primitive tokens

AC-1.6.3: Type filtering
  Given: Tokens with types 'color', 'dimension'
  When: repository.getByType('color')
  Then: Returns only color tokens
```

---

## Flow 2: Token Resolution & Processing

### Purpose
Resolve token references (aliases) and prepare values for Figma sync.

### Steps

#### 2.1 Top-Level Alias Resolution
**Input**: Tokens in repository
**Output**: Map of resolved values
**Process**:
1. `resolver.resolveAllTokens(projectId)` → Returns `Map<tokenId, resolvedValue>`
2. Build dependency graph using `aliasTo` relationships
3. Topological sort to resolve in correct order
4. Detect circular references
5. Store resolved values in token.resolvedValue

**Algorithm**:
```typescript
// Simplified resolution logic
for each token in topological order:
  if token.aliasTo exists:
    targetToken = repository.get(token.aliasTo)
    if targetToken exists:
      token.resolvedValue = targetToken.resolvedValue || targetToken.value
    else:
      console.error("Unresolved alias")
      token.resolvedValue = token.value  // Fallback
  else:
    token.resolvedValue = token.value
```

**Constraints**:
- **CRITICAL**: Resolution is PROJECT-SCOPED
  - `resolveReference(ref, projectId)` only searches within `projectId`
  - Cannot resolve references across different projects
  - This is the #1 cause of "12px font, AUTO line height" issues
- Circular references detected and logged (not resolved)
- Missing targets logged as errors
- Maximum resolution depth: (not specified - potential constraint needed)

**Acceptance Criteria**:
```
AC-2.1.1: Simple alias resolution
  Given:
    - Token A: value = "16px"
    - Token B: aliasTo = "A"
  When: Resolution performed
  Then: B.resolvedValue = "16px"

AC-2.1.2: Chained alias resolution
  Given:
    - Token A: value = "16px"
    - Token B: aliasTo = "A"
    - Token C: aliasTo = "B"
  When: Resolution performed
  Then: C.resolvedValue = "16px"

AC-2.1.3: Circular reference detection
  Given:
    - Token A: aliasTo = "B"
    - Token B: aliasTo = "A"
  When: Resolution performed
  Then:
    - Circular reference detected
    - Error logged
    - Both remain unresolved

AC-2.1.4: PROJECT SCOPING CONSTRAINT
  Given:
    - Token A in project "primitive": value = "Inter"
    - Token B in project "default": aliasTo = "A"
  When: Resolution performed for project "default"
  Then:
    - B.resolvedValue = "{A}" (UNRESOLVED!)
    - Reference not found in project "default"
    - Console error logged
```

#### 2.2 Nested Reference Resolution (Composite Tokens)
**Input**: Composite token values (typography, shadow)
**Output**: Fully resolved composite values
**Process**:
1. Called during `createTextStyle()` and `createEffectStyle()`
2. `resolveNestedReferences(value, projectId)` → Recursively resolves
3. Deep traversal of object properties
4. Replace reference strings with resolved values

**Example**:
```typescript
// BEFORE nested resolution
{
  fontFamily: "{primitive.typography.font-family.primary}",
  fontSize: "{primitive.typography.font-size.20}",
  lineHeight: "1.5"
}

// AFTER nested resolution (if references exist in same project)
{
  fontFamily: "Inter",
  fontSize: "20px",
  lineHeight: "1.5"
}
```

**Constraints**:
- **CRITICAL**: PROJECT-SCOPED (same as top-level)
  - Typography token in project "default" referencing primitives in project "primitive" = FAILS
  - This causes properties to remain as reference strings
  - Figma receives `fontSize: "{primitive.typography.font-size.20}"` → Can't parse → Uses default (12px)
- Recursive resolution depth: unlimited (until no more references)
- Failed resolution returns original reference string

**Acceptance Criteria**:
```
AC-2.2.1: Typography nested reference resolution (SAME PROJECT)
  Given:
    - Typography token in project "default"
    - fontFamily: "{fonts.primary}"
    - Font token "fonts.primary" in project "default": value = "Inter"
  When: Nested resolution performed
  Then: fontFamily = "Inter" (RESOLVED)

AC-2.2.2: Typography PROJECT MISMATCH (CRITICAL FAILURE CASE)
  Given:
    - Typography token in project "default"
    - fontSize: "{primitive.typography.font-size.20}"
    - Referenced token in project "primitive": value = "20px"
  When: Nested resolution performed for project "default"
  Then:
    - fontSize = "{primitive.typography.font-size.20}" (UNRESOLVED!)
    - ❌ UNRESOLVED error logged
    - ⚠️ TYPOGRAPHY summary shows unresolved ref
    - Result: Figma uses default 12px

AC-2.2.3: Shadow color reference resolution
  Given:
    - Shadow token: color = "{primitive.color.neutral.900}"
    - Color token exists in SAME project: value = "#171717"
  When: Nested resolution performed
  Then: color = "#171717" (RESOLVED)

AC-2.2.4: Shadow color PROJECT MISMATCH
  Given:
    - Shadow token in project "default"
    - color: "{primitive.color.neutral.900}"
    - Referenced token in project "primitive"
  When: Nested resolution performed
  Then:
    - color = "{primitive.color.neutral.900}" (UNRESOLVED!)
    - ⚠️ SHADOW warning: "MISSING COLOR - shadow will be invisible!"
```

#### 2.3 Diagnostic Logging
**Input**: Failed reference resolution
**Output**: Structured console diagnostics
**Process**:
1. `logUnresolvedReference(reference, projectId)` called on failure
2. Search for token across ALL projects
3. Categorize issue type:
   - PROJECT MISMATCH: Token exists in different project
   - NAMING ISSUE: Similar tokens found (typos)
   - TOKEN NOT FOUND: Token doesn't exist anywhere
4. Log using `console.group()` for collapsible output

**Output Format**:
```
❌ UNRESOLVED: {primitive.typography.font-size.20}
  🔍 Searching in project: "default" (45 tokens)
  🎯 Looking for: "primitive.typography.font-size.20"

  ⚠️ PROJECT MISMATCH - Token found in different project(s):
    📍 "primitive.typography.font-size.20"
       Project: "primitive" (expected: "default")
       Collection: primitive
       Type: fontSize
       Value: "1.25rem"

    💡 FIX: Ensure all tokens are in the same project ID
```

**Acceptance Criteria**:
```
AC-2.3.1: Project mismatch detection
  Given: Reference to token in different project
  When: Resolution fails
  Then:
    - Console shows "PROJECT MISMATCH"
    - Shows actual vs expected project ID
    - Shows token value for verification

AC-2.3.2: Naming issue detection
  Given: Reference with typo "colr.primary" (should be "color.primary")
  When: Resolution fails
  Then:
    - Console shows "NAMING ISSUE"
    - Shows similar token names found

AC-2.3.3: Missing token detection
  Given: Reference to non-existent token
  When: Resolution fails
  Then:
    - Console shows "TOKEN NOT FOUND"
    - Shows available tokens in current project
```

---

## Flow 3: Figma Variable Sync

### Purpose
Create/update Figma variables from resolved tokens.

### Steps

#### 3.1 Collection Management
**Input**: Tokens grouped by collection
**Output**: Figma VariableCollection objects
**Process**:
1. Group tokens by `token.collection`
2. Get existing collections: `figma.variables.getLocalVariableCollectionsAsync()`
3. For each collection:
   - Find by name OR create new
   - Store in `collectionMap`

**Constraints**:
- Collection names must match exactly
- Default collection name: 'default' or filename
- Collections are not deleted (only created/updated)
- One collection can have multiple modes (not currently used)

**Acceptance Criteria**:
```
AC-3.1.1: Collection creation
  Given: Tokens with collection = "primitive"
  When: No "primitive" collection exists
  Then: New collection created with name "primitive"

AC-3.1.2: Collection reuse
  Given: "semantic" collection already exists
  When: Syncing tokens with collection = "semantic"
  Then: Existing collection used (not duplicated)
```

#### 3.2 Token Type to Figma Type Mapping
**Input**: Token type
**Output**: Figma variable type
**Mapping**:
```typescript
const typeMap: Record<string, VariableResolvedDataType> = {
  'color': 'COLOR',
  'number': 'FLOAT',
  'fontSize': 'FLOAT',
  'lineHeight': 'FLOAT',
  'letterSpacing': 'FLOAT',
  'fontWeight': 'FLOAT',
  'spacing': 'FLOAT',
  'dimension': 'FLOAT',
  'string': 'STRING',
  'boolean': 'BOOLEAN'
};
```

**Constraints**:
- Only mapped types sync as variables
- Typography and shadow types create STYLES (not variables)
- Unmapped types are skipped with warning
- No support for Figma VARIABLE_ALIAS type (limitation)

**Acceptance Criteria**:
```
AC-3.2.1: Color token mapping
  Given: Token with type = 'color'
  When: Synced to Figma
  Then: Variable created with resolvedType = 'COLOR'

AC-3.2.2: Dimension token mapping
  Given: Token with type = 'dimension'
  When: Synced to Figma
  Then: Variable created with resolvedType = 'FLOAT'

AC-3.2.3: Typography token exclusion
  Given: Token with type = 'typography'
  When: Sync attempted
  Then:
    - NOT created as variable
    - Routed to createTextStyle() instead
```

#### 3.3 Value Conversion
**Input**: Resolved token value
**Output**: Figma-compatible value
**Process**:
1. Convert based on variable type
2. Apply unit conversions
3. Validate value ranges

**Color Conversion**:
```typescript
// Input formats supported:
- Hex: "#FF0000" or "#FF0000FF"
- RGB: { r: 255, g: 0, b: 0 }
- RGBA: { r: 255, g: 0, b: 0, a: 1 }
- HSL: { h: 0, s: 100, l: 50, hex: "#FF0000" } // ⚠️ Must have hex fallback!

// Output:
{ r: 1.0, g: 0.0, b: 0.0 }  // RGB 0-1 range, alpha ignored
```

**Numeric Conversion** (`convertNumericValue`):
```typescript
// Input formats:
- Pure number: 16 → 16
- Pixels: "16px" → 16
- REM: "1rem" → 16 (assuming base 16)
- EM: "1em" → 16 (assuming base 16)
- Percentage: "50%" → 8 (50% of percentageBase)

// Output: Pure number (pixels)
```

**Line Height Conversion** (`convertLineHeight`):
```typescript
// Input → Output (Figma LineHeight):
- Unitless < 10: 1.5 → { value: 150, unit: 'PERCENT' }
- Unitless >= 10: 24 → { value: 24, unit: 'PIXELS' }
- Pixels: "24px" → { value: 24, unit: 'PIXELS' }
- REM: "1.5rem" → { value: 24, unit: 'PIXELS' }
- Percentage: "150%" → { value: 150, unit: 'PERCENT' }
- Invalid: → { unit: 'AUTO' } (fallback)
```

**Constraints**:
- HSL colors MUST have hex fallback (or appear black)
- Alpha channel ignored for COLOR variables (Figma limitation)
- Font size must be >= 1px
- percentageBase defaults to 16px
- Unit conversion is lossy (rem → px loses semantic meaning)

**Acceptance Criteria**:
```
AC-3.3.1: Hex color conversion
  Given: Token value = "#E8E9EC"
  When: Converted to Figma COLOR
  Then: { r: 0.909, g: 0.912, b: 0.925 } (0-1 range)

AC-3.3.2: REM to pixel conversion
  Given: Token value = "0.625rem", percentageBase = 16
  When: Converted to FLOAT
  Then: 10 (0.625 × 16)

AC-3.3.3: Unitless line height to percent
  Given: Token value = 1.5
  When: Converted to line height
  Then: { value: 150, unit: 'PERCENT' }

AC-3.3.4: HSL without hex fallback
  Given: Token value = { h: 200, s: 50, l: 50 } (no hex)
  When: Converted to COLOR
  Then: { r: 0, g: 0, b: 0 } (black - fallback)

AC-3.3.5: Invalid font size
  Given: Token value = "0px" or negative
  When: Converted
  Then: Error thrown, text style creation fails
```

#### 3.4 Variable Creation/Update
**Input**: Converted value + Collection + Name
**Output**: Figma Variable
**Process**:
1. Check if variable exists: Search by name in collection
2. If exists and `updateExisting=true`: Update value
3. If not exists: Create new variable
4. Set variable properties:
   - name (from token.qualifiedName)
   - resolvedType
   - valuesByMode (default mode)
   - scopes (preserved or default)
   - description (from token.description)
   - codeSyntax (platform-specific)

**Constraints**:
- Variable name must be unique within collection
- Cannot change resolvedType of existing variable
- Scopes preserved by default (user manages in Scopes tab)
- codeSyntax requires Figma desktop app (not web)

**Acceptance Criteria**:
```
AC-3.4.1: New variable creation
  Given: No variable named "color.primary.600" exists
  When: Token synced
  Then: New variable created with correct name, type, value

AC-3.4.2: Existing variable update
  Given: Variable "spacing.md" exists with value 16
  When: Token synced with value 20, updateExisting=true
  Then: Variable value updated to 20

AC-3.4.3: Existing variable skip
  Given: Variable exists, updateExisting=false
  When: Token synced
  Then: Variable skipped (not updated)

AC-3.4.4: Code syntax generation
  Given: Color variable
  When: Created on Figma desktop
  Then: codeSyntax set for CSS, iOS, Android
```

#### 3.5 Scope Assignment
**Input**: Token type
**Output**: Figma scopes
**Default Scoping**:
```typescript
const defaultScopes = {
  'color': ['ALL_FILLS', 'ALL_STROKES'],
  'dimension': ['WIDTH_HEIGHT', 'GAP'],
  'fontSize': ['FONT_SIZE'],
  'spacing': ['GAP', 'WIDTH_HEIGHT'],
  'number': ['OPACITY', 'WIDTH_HEIGHT'],
  'string': ['TEXT_CONTENT'],
  'boolean': []
};
```

**Constraints**:
- If variable exists: Scopes preserved (unless preserveScopes=false)
- If new variable: Default scopes assigned
- User can manually adjust in Figma Scopes panel
- No API to read current scopes (potential limitation)

**Acceptance Criteria**:
```
AC-3.5.1: Default scope assignment
  Given: New color variable
  When: Created
  Then: Scopes = ['ALL_FILLS', 'ALL_STROKES']

AC-3.5.2: Scope preservation
  Given: Existing variable with custom scopes
  When: Updated with preserveScopes=true
  Then: Scopes unchanged

AC-3.5.3: Scope override
  Given: Existing variable with scopes
  When: Updated with preserveScopes=false
  Then: Scopes reset to defaults
```

---

## Flow 4: Figma Style Creation

### Purpose
Create Figma Text Styles from typography tokens and Effect Styles from shadow tokens.

### Steps

#### 4.1 Style vs Variable Decision
**Input**: Token type and value
**Output**: Routing decision
**Logic**:
```typescript
private isStyleToken(token: Token): boolean {
  if (token.type === 'typography') {
    const value = token.resolvedValue || token.value;
    // Check for LEAF token (has actual properties)
    const hasTypographyProps =
      'fontFamily' in value ||
      'fontSize' in value ||
      'fontWeight' in value ||
      'lineHeight' in value ||
      'letterSpacing' in value;
    return hasTypographyProps;  // true → Text Style, false → skip
  }

  if (token.type === 'shadow') {
    const value = token.resolvedValue || token.value;
    const hasShadowProps =
      'offsetX' in value ||
      'offsetY' in value ||
      'blur' in value ||
      'color' in value;
    return hasShadowProps;  // true → Effect Style
  }

  return false;  // All other types → Variables
}
```

**Constraints**:
- GROUP tokens (parent containers with no actual values) are skipped
- Only LEAF tokens with actual properties create styles
- Individual fontSize, lineHeight tokens create VARIABLES (not styles)

**Acceptance Criteria**:
```
AC-4.1.1: Typography LEAF token → Text Style
  Given: Token type='typography' with { fontFamily, fontSize }
  When: Style routing evaluated
  Then: createTextStyle() called

AC-4.1.2: Typography GROUP token → Skip
  Given: Token type='typography' with no properties (parent only)
  When: Style routing evaluated
  Then: Skipped (no style created)

AC-4.1.3: Individual fontSize → Variable
  Given: Token type='fontSize', value="16px"
  When: Style routing evaluated
  Then: Creates FLOAT variable (not text style)
```

#### 4.2 Typography Text Style Creation
**Input**: Typography token with resolved value
**Output**: Figma TextStyle
**Process**:
1. Resolve nested references: `resolveNestedReferences(value, projectId)`
2. Validate all references resolved (diagnostic logging)
3. Extract font family from font stack (if comma-separated)
4. Resolve font weight reference (or use default 400)
5. Map font weight to style name: `mapFontWeightToStyle(weight)`
6. Load font asynchronously: `figma.loadFontAsync({ family, style })`
7. Set text style properties:
   - fontName (family + style)
   - fontSize (converted to pixels)
   - lineHeight (converted with units)
   - letterSpacing (pixels)
8. Create or update TextStyle

**Font Weight Mapping**:
```typescript
const weightMap = {
  100: 'Thin',
  200: 'ExtraLight',
  300: 'Light',
  400: 'Regular',
  500: 'Medium',
  600: 'SemiBold',   // ⚠️ May be "Semi Bold" in some fonts!
  700: 'Bold',
  800: 'ExtraBold',
  900: 'Black',
};
```

**Font Stack Handling**:
```typescript
// Input: "Inter,system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif"
// Extract first font: "Inter"
// Figma doesn't support fallback stacks
```

**Constraints**:
- **CRITICAL**: Nested references must resolve (project scoping!)
- Font must be installed in Figma
- Font style names vary across fonts (SemiBold vs Semi Bold)
- Unresolved properties → Figma defaults (12px, AUTO, Regular)
- Font loading failure → Falls back to Regular, or fails entirely

**Acceptance Criteria**:
```
AC-4.2.1: Typography with resolved refs → Text Style
  Given: Typography token (all refs in SAME project, resolved)
  When: createTextStyle() called
  Then:
    - TextStyle created with correct properties
    - fontFamily = "Inter"
    - fontSize = 20px (from "1.25rem")
    - lineHeight = { value: 150, unit: 'PERCENT' }

AC-4.2.2: Typography with UNRESOLVED refs → Defaults
  Given: Typography token (refs in DIFFERENT project)
  When: createTextStyle() called
  Then:
    - ⚠️ TYPOGRAPHY warning logged
    - TextStyle created with DEFAULTS:
      - fontSize = 12px (Figma default)
      - lineHeight = { unit: 'AUTO' }
    - Properties with unresolved refs ignored

AC-4.2.3: Font stack extraction
  Given: fontFamily = "Inter,system-ui,sans-serif"
  When: Font loaded
  Then: Uses "Inter" only (first font)

AC-4.2.4: Font weight mapping + fallback
  Given: fontWeight = 600
  When: Font loaded
  Then:
    - Try "SemiBold" first
    - If fails, fallback to "Regular"
    - If Regular fails, style creation fails

AC-4.2.5: Unresolved font weight
  Given: fontWeight = "{primitive.font-weight.semibold}" (UNRESOLVED)
  When: Font loaded
  Then:
    - ⚠️ Warning logged
    - Fallback to Regular
```

#### 4.3 Shadow Effect Style Creation
**Input**: Shadow token with resolved value
**Output**: Figma EffectStyle
**Process**:
1. Resolve nested references: `resolveNestedReferences(value, projectId)`
2. Validate color reference resolved (diagnostic logging)
3. Convert color to RGBA (with alpha support!)
4. Convert dimensions (offsetX, offsetY, blur, spread) to pixels
5. Determine shadow type from `inset` property
6. Create shadow effect object
7. Create or update EffectStyle

**Shadow Types**:
```typescript
// inset: false or undefined → DROP_SHADOW
// inset: true → INNER_SHADOW

const shadowEffect = {
  type: inset ? 'INNER_SHADOW' : 'DROP_SHADOW',
  visible: true,
  color: { r, g, b, a },  // ✅ Alpha supported (unlike variables!)
  offset: { x, y },
  radius: blur,
  spread: spread,
  blendMode: 'NORMAL',
};
```

**Constraints**:
- **CRITICAL**: Color reference must resolve (project scoping!)
- Unresolved color → Black or transparent (invisible shadow)
- Alpha channel supported for shadows (unlike COLOR variables)
- Spread not supported in all Figma shadow types

**Acceptance Criteria**:
```
AC-4.3.1: Shadow with resolved color → Effect Style
  Given: Shadow token, color ref in SAME project
  When: createEffectStyle() called
  Then:
    - EffectStyle created
    - color = correct RGBA value
    - offset, blur, spread converted to pixels

AC-4.3.2: Shadow with UNRESOLVED color → Invisible
  Given: Shadow token, color ref in DIFFERENT project
  When: createEffectStyle() called
  Then:
    - ⚠️ SHADOW warning: "MISSING COLOR - shadow will be invisible!"
    - EffectStyle created but shadow not visible

AC-4.3.3: Drop shadow vs inner shadow
  Given: Shadow token with inset=true
  When: createEffectStyle() called
  Then: Effect type = INNER_SHADOW

AC-4.3.4: Alpha channel support
  Given: Shadow color with alpha = 0.1
  When: createEffectStyle() called
  Then: Shadow has 10% opacity (alpha preserved)
```

#### 4.4 Style Validation & Error Handling
**Input**: Token value
**Output**: Validation summaries
**Process**:
1. After nested resolution, call `findUnresolvedReferences(resolvedValue)`
2. If unresolved refs found:
   - Log grouped warning with token name
   - List all unresolved properties
   - Highlight color refs in shadows
   - Refer to detailed error logs above
3. If font loading fails:
   - Log grouped error with token name
   - Show raw family/weight values
   - Attempt fallback or skip style

**Diagnostic Output**:
```
⚠️  TYPOGRAPHY: semantic.typography.heading.md
  ❌ 5 unresolved reference(s) - will use Figma defaults (12px, AUTO)
     fontFamily: {primitive.typography.font-family.primary}
     fontSize: {primitive.typography.font-size.20}
     fontWeight: {primitive.typography.font-weight.semibold}
     lineHeight: {primitive.typography.line-height.normal}
     letterSpacing: {primitive.typography.letter-spacing.normal}
  📋 Project: "default" | Collection: "semantic"
  💡 See individual reference errors above for details

⚠️  SHADOW: semantic.shadow.elevation.high
  ❌ 1 unresolved reference(s) - shadow may not render correctly
     color: {primitive.color.neutral.900} ⚠️  MISSING COLOR - shadow will be invisible!
  📋 Project: "default" | Collection: "semantic"
  💡 See individual reference errors above for details

❌ FONT ERROR: semantic.typography.heading.lg
  Family: "Inter,system-ui,sans-serif"
  Weight: 600
  Error: The font "Inter SemiBold" could not be loaded
```

**Acceptance Criteria**:
```
AC-4.4.1: Unresolved typography summary
  Given: Typography token with 3 unresolved refs
  When: Validation performed
  Then:
    - ⚠️ TYPOGRAPHY group logged
    - Lists all unresolved properties
    - Shows project and collection

AC-4.4.2: Missing shadow color highlight
  Given: Shadow token with unresolved color ref
  When: Validation performed
  Then:
    - ⚠️ SHADOW group logged
    - Color ref has "⚠️ MISSING COLOR" annotation

AC-4.4.3: Font loading error
  Given: Font "Inter SemiBold" not installed
  When: Font load attempted
  Then:
    - ❌ FONT ERROR group logged
    - Shows family, weight, error message
```

---

## Critical Constraints

### 1. Project ID Scoping (MOST CRITICAL)

**Constraint**: Token resolution is scoped to projectId. References can ONLY resolve tokens within the SAME project.

**Impact**:
- If tokens imported from different sources/files get different projectIds
- And semantic tokens reference primitive tokens
- References WILL NOT resolve → Properties remain as reference strings
- Figma receives unparsed references → Uses defaults

**Example Failure**:
```typescript
// Import 1: primitives.json → projectId = "primitive"
{
  "primitive": {
    "typography": {
      "font-size": {
        "20": { "$value": "1.25rem" }  // projectId: "primitive"
      }
    }
  }
}

// Import 2: semantic.json → projectId = "default"
{
  "semantic": {
    "typography": {
      "heading": {
        "$type": "typography",
        "$value": {
          "fontSize": "{primitive.typography.font-size.20}"  // projectId: "default"
        }
      }
    }
  }
}

// RESULT:
resolveNestedReferences("{primitive.typography.font-size.20}", "default")
  → searches in project "default"
  → doesn't find "primitive.typography.font-size.20"
  → returns "{primitive.typography.font-size.20}" unresolved
  → Figma receives "{primitive.typography.font-size.20}" as fontSize
  → Can't parse string as number
  → Uses default: 12px
```

**Mitigation**:
- Import all related token files together (same session)
- Ensure all tokens get same projectId
- Future: Implement cross-project resolution

### 2. Font Availability

**Constraint**: Fonts must be installed in Figma for text styles to load.

**Impact**:
- If font not available → `loadFontAsync()` throws error
- Style creation fails entirely OR falls back to Regular
- Font style name variations cause issues (SemiBold vs Semi Bold)

**Mitigation**:
- Always fallback to "Regular" on font load failure
- Log clear error messages
- Document required fonts

### 3. HSL Color Hex Fallback

**Constraint**: HSL colors without hex fallback appear black in COLOR variables.

**Impact**:
- If token has `{ h, s, l }` but no `hex` property
- Conversion fails → Returns black `{ r: 0, g: 0, b: 0 }`

**Mitigation**:
- Always include hex property in HSL color tokens
- Document this requirement

### 4. Alpha Channel Limitation

**Constraint**: Figma COLOR variables ignore alpha channel (API limitation).

**Impact**:
- Color variables always opaque
- Shadow effect styles DO support alpha

**Mitigation**:
- Document limitation
- Use effect styles for colors with transparency

### 5. Unit Conversion is Lossy

**Constraint**: Converting rem/em to px loses semantic meaning.

**Impact**:
- Designer changes variable to 17px
- No way to know it should be "1.0625rem"
- Semantic relationship to root font size lost

**Mitigation**:
- Document in variable description
- Potential: Store original value in codeSyntax

---

## Type Mapping Reference

### Token Type → Figma Object

| Token Type | Figma Object | Figma Type | Notes |
|------------|-------------|------------|-------|
| `color` | Variable | `COLOR` | Alpha ignored, HSL needs hex |
| `dimension` | Variable | `FLOAT` | Units converted to px |
| `fontSize` | Variable | `FLOAT` | Units converted to px |
| `fontWeight` | Variable | `FLOAT` | Raw number |
| `fontFamily` | Variable | `STRING` | Single font name |
| `lineHeight` | Variable | `FLOAT` | Raw number or percent |
| `letterSpacing` | Variable | `FLOAT` | Units converted to px |
| `spacing` | Variable | `FLOAT` | Units converted to px |
| `number` | Variable | `FLOAT` | Pass through |
| `string` | Variable | `STRING` | Pass through |
| `boolean` | Variable | `BOOLEAN` | Pass through |
| **`typography`** | **TextStyle** | N/A | Composite: fontFamily, fontSize, fontWeight, lineHeight, letterSpacing |
| **`shadow`** | **EffectStyle** | N/A | Composite: offsetX, offsetY, blur, spread, color, inset |

### Value Normalization

| Input Format | Output Format | Example |
|--------------|---------------|---------|
| Hex color | RGB 0-1 | `"#FF0000"` → `{r:1, g:0, b:0}` |
| RGB color | RGB 0-1 | `{r:255, g:0, b:0}` → `{r:1, g:0, b:0}` |
| HSL color | RGB 0-1 | `{h:0, s:100, l:50, hex:"#FF0000"}` → `{r:1, g:0, b:0}` |
| px dimension | number | `"16px"` → `16` |
| rem dimension | number | `"1rem"` → `16` (base 16) |
| em dimension | number | `"1em"` → `16` (base 16) |
| % dimension | number | `"50%"` → `8` (50% of 16) |
| Unitless lineHeight | PERCENT | `1.5` → `{value:150, unit:'PERCENT'}` |
| px lineHeight | PIXELS | `"24px"` → `{value:24, unit:'PIXELS'}` |

---

## Audit Findings

### Streamlining Opportunities

#### 1. **Unified Project ID Assignment**

**Current Issue**:
- ProjectId assigned per import session
- Different files can get different projectIds
- Causes cross-reference failures

**Proposed Improvement**:
- Option to set explicit projectId for all tokens
- UI: "Import into project: [dropdown: default | primitive | custom]"
- All tokens from current import use same projectId
- OR: Detect project from file path structure
  - `/primitive/tokens.json` → projectId = "primitive"
  - `/semantic/tokens.json` → projectId = "semantic"

**Implementation**:
```typescript
interface ImportOptions {
  projectId?: string;  // NEW: Explicit project ID
  autoDetectProject?: boolean;  // NEW: Detect from file path
}

// In TokenProcessor.parseTokens():
if (options.projectId) {
  token.projectId = options.projectId;  // Override
} else if (options.autoDetectProject) {
  token.projectId = detectProjectFromPath(filePath);  // Auto-detect
} else {
  token.projectId = 'default';  // Current behavior
}
```

**Benefits**:
- Eliminates #1 cause of unresolved references
- Users can control project organization
- Cross-file references work automatically

#### 2. **Cross-Project Reference Resolution**

**Current Issue**:
- References can't cross project boundaries
- Forces all tokens into one project
- Limits organizational flexibility

**Proposed Improvement**:
- Fallback to global search if not found in project
- Log when cross-project reference resolved
- Optional: Require explicit cross-project syntax
  - `{primitive:color.primary}` vs `{color.primary}`

**Implementation**:
```typescript
// In TokenResolver.resolveReference():
resolveReference(reference: string, projectId: string): Token | null {
  // 1. Try exact match in project
  const projectMatch = this.repository.getByQualifiedName(projectId, cleanRef);
  if (projectMatch) return projectMatch;

  // 2. NEW: Try global search
  const allTokens = this.repository.getAll();
  const globalMatch = allTokens.find(t => t.qualifiedName === cleanRef);

  if (globalMatch) {
    console.warn(`[TokenResolver] Cross-project reference: "${cleanRef}" found in project "${globalMatch.projectId}" (expected: "${projectId}")`);
    return globalMatch;
  }

  return null;
}
```

**Benefits**:
- Primitives in "primitive" project can be referenced from "semantic" project
- Maintains project organization
- Clear warnings when crossing boundaries

#### 3. **Type Safety for Figma Objects**

**Current Issue**:
- Variable and Style creation uses loosely typed objects
- No clear type mapping between Token and Figma objects
- Hard to track what's synced, what's updated

**Proposed Improvement**:
- Create TypeScript interfaces for sync state
- Map Token to FigmaVariable/FigmaStyle
- Track sync status (created, updated, skipped, error)

**Implementation**:
```typescript
interface SyncedVariable {
  tokenId: string;
  variableId: string;
  variableName: string;
  collectionId: string;
  status: 'created' | 'updated' | 'skipped';
  lastSynced: string;  // ISO timestamp
}

interface SyncedStyle {
  tokenId: string;
  styleId: string;
  styleName: string;
  styleType: 'TEXT' | 'EFFECT';
  status: 'created' | 'updated' | 'skipped' | 'error';
  error?: string;
  lastSynced: string;
}

interface SyncState {
  variables: Map<string, SyncedVariable>;
  styles: Map<string, SyncedStyle>;
  lastSync: string;
}

// Store in plugin data:
figma.root.setPluginData('syncState', JSON.stringify(syncState));
```

**Benefits**:
- Know which tokens are synced
- Detect if Figma object was manually deleted
- Show sync status in UI (green checkmark, yellow warning, red error)
- Enable "re-sync only changed tokens" optimization

#### 4. **Batch Update Optimization**

**Current Issue**:
- Each variable/style updated individually
- No detection of what actually changed
- Re-syncs everything every time

**Proposed Improvement**:
- Store hash of token value in plugin data
- Compare hash before updating
- Skip unchanged tokens
- Batch Figma API calls

**Implementation**:
```typescript
interface TokenHash {
  tokenId: string;
  valueHash: string;  // hash(JSON.stringify(resolvedValue))
  lastSynced: string;
}

// Before sync:
const stored = getStoredHash(token.id);
const current = hash(token.resolvedValue);

if (stored === current) {
  stats.skipped++;
  return;  // Skip unchanged
}

// After sync:
storeHash(token.id, current);
```

**Benefits**:
- Faster syncs (only updates changed tokens)
- Reduces Figma API calls
- Better performance for large token sets

#### 5. **Reference Validation Before Sync**

**Current Issue**:
- References validated during sync
- Styles created with unresolved refs → Defaults used
- No pre-sync validation

**Proposed Improvement**:
- Pre-sync validation step
- Report all unresolved references BEFORE creating anything
- User can fix token files before syncing

**Implementation**:
```typescript
async validateTokens(tokens: Token[]): Promise<ValidationReport> {
  const report: ValidationReport = {
    valid: true,
    errors: [],
    warnings: []
  };

  for (const token of tokens) {
    if (token.type === 'typography' || token.type === 'shadow') {
      const unresolvedRefs = this.findUnresolvedReferences(token.value);

      if (unresolvedRefs.length > 0) {
        report.valid = false;
        report.errors.push({
          tokenId: token.id,
          tokenName: token.qualifiedName,
          unresolvedRefs: unresolvedRefs,
          suggestion: this.suggestFix(unresolvedRefs)
        });
      }
    }
  }

  return report;
}

// In UI:
const validation = await service.validateTokens(tokens);
if (!validation.valid) {
  showValidationErrors(validation.errors);
  if (!confirm("Sync anyway with unresolved references?")) {
    return;
  }
}
```

**Benefits**:
- Catch reference issues early
- Prevent creating broken styles
- Better user experience

#### 6. **Figma Object Status Tracking**

**Current Issue**:
- No way to know if variable/style was manually deleted in Figma
- No way to track updates made in Figma vs plugin
- Can't detect drift between tokens and Figma

**Proposed Improvement**:
- Store Figma object IDs in plugin data
- On sync, check if objects still exist
- Detect manual changes
- Offer: "Sync token → Figma" or "Pull Figma → token"

**Implementation**:
```typescript
interface FigmaObjectStatus {
  tokenId: string;
  figmaId: string;  // variableId or styleId
  exists: boolean;
  lastPluginValue: any;
  currentFigmaValue: any;
  drifted: boolean;
}

async checkStatus(tokenId: string): Promise<FigmaObjectStatus> {
  const stored = getStoredFigmaId(tokenId);

  if (!stored) {
    return { exists: false };
  }

  const figmaObj = await figma.variables.getVariableByIdAsync(stored.figmaId);

  if (!figmaObj) {
    return { exists: false };  // Manually deleted
  }

  const currentValue = figmaObj.valuesByMode[figmaObj.defaultModeId];
  const drifted = !deepEqual(currentValue, stored.lastPluginValue);

  return {
    tokenId,
    figmaId: stored.figmaId,
    exists: true,
    lastPluginValue: stored.lastPluginValue,
    currentFigmaValue: currentValue,
    drifted
  };
}
```

**Benefits**:
- Detect manual deletions
- Warn about drift
- Enable two-way sync in future

---

## Recommendations for Validation

### Phase 1: Critical Constraints (Must Validate)
1. ✅ **Project ID scoping** - Most critical issue
2. ✅ **Nested reference resolution** - Causes 12px/AUTO
3. ✅ **Font availability** - Causes loading failures
4. ✅ **HSL hex fallback** - Causes black colors

### Phase 2: Flow Accuracy (Should Validate)
1. Token type mapping (color, dimension, typography, shadow)
2. Value conversion (rem→px, unitless→percent)
3. Style vs Variable routing
4. Collection management

### Phase 3: Enhancements (Nice to Have)
1. Cross-project references
2. Sync state tracking
3. Batch optimization
4. Pre-sync validation

---

**Next Steps**:
1. Please review and validate all acceptance criteria
2. Identify any missing constraints or flows
3. Prioritize audit findings for implementation
4. Approve Phase 1 fixes for immediate implementation

