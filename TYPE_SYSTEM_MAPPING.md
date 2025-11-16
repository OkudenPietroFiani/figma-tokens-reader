# Type System Mapping: Types Managed at Each Abstraction Layer

**Question**: *"Each interface manipulates types and classes, what types are managed at each level by each layer?"*

---

## Architecture Layers & Type Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         TYPE TRANSFORMATION PIPELINE                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  JSON Types → Parse Types → Token Types → Resolution Types → Figma Types│
│  (Source)     (Strategy)    (Universal)   (Cache)            (Platform)  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Layer 0: Input Types (Source JSON)

**Purpose**: Raw data from external sources (before parsing).

### Types Managed

#### W3C Design Tokens Format
```typescript
// Raw W3C JSON structure
interface W3CTokenJSON {
  [tokenName: string]: {
    $value: any;              // Color, dimension, etc.
    $type?: string;           // 'color' | 'dimension' | etc.
    $description?: string;    // Optional description
    $extensions?: any;        // Custom metadata
  } | W3CTokenJSON;          // Nested groups
}

// Example
{
  "color": {
    "primary": {
      "600": {
        "$value": "#1e40af",
        "$type": "color",
        "$description": "Primary brand color"
      }
    }
  }
}
```

#### Style Dictionary Format
```typescript
// Raw Style Dictionary JSON structure
interface StyleDictionaryJSON {
  [tokenName: string]: {
    value: any;             // Color, dimension, etc.
    type?: string;          // 'color' | 'dimension' | etc.
    comment?: string;       // Optional description
    attributes?: any;       // Custom metadata
  } | StyleDictionaryJSON; // Nested groups
}

// Example
{
  "color": {
    "primary": {
      "value": "#1e40af",
      "type": "color",
      "comment": "Primary brand color"
    }
  }
}
```

### Interfaces Operating on These Types

**IFileSource** (`src/core/interfaces/IFileSource.ts`)
```typescript
interface IFileSource {
  // INPUT: FileSourceConfig
  // OUTPUT: Raw JSON (any)
  fetchFileContent(config: FileSourceConfig, filePath: string): Promise<Result<any>>;
  fetchMultipleFiles(config: FileSourceConfig, filePaths: string[]): Promise<Result<any[]>>;
}
```

**Types Used**:
- **FileSourceConfig**: Configuration for connecting to source
- **FileMetadata**: File information (path, size, type)
- **Result\<any\>**: Raw JSON content wrapped in Result pattern

```typescript
// From shared/types.ts
interface FileSourceConfig {
  type: 'github' | 'gitlab' | 'local' | 'api' | 'figma';
  location: string;
  branch?: string;
  commit?: string;
}

interface FileMetadata {
  path: string;
  type: 'file' | 'dir';
  size?: number;
  sha?: string;
}
```

---

## Layer 1: Parse Types (Format Strategies)

**Purpose**: Convert format-specific JSON → intermediate ProcessedToken.

### Types Managed

#### Intermediate Types (During Parsing)

```typescript
// From shared/types.ts
interface TokenData {
  [key: string]: DesignToken | any;  // Recursive structure
}

interface DesignToken {
  $value?: any;       // W3C format
  $type?: string;
  $description?: string;
  value?: any;        // Style Dictionary format
  type?: string;
  [key: string]: any; // Allow any properties
}

interface ProcessedToken {
  path: string[];           // ['color', 'primary', '600']
  value: any;               // Raw value (not yet normalized)
  type: string;             // Token type as string
  originalValue?: any;      // Before transformations
}
```

### Interfaces Operating on These Types

**ITokenFormatStrategy** (`src/core/interfaces/ITokenFormatStrategy.ts`)
```typescript
interface ITokenFormatStrategy {
  // INPUT: TokenData (format-specific JSON)
  // OUTPUT: ProcessedToken[] (intermediate representation)

  detectFormat(data: TokenData): number;
  parseTokens(data: TokenData): Result<ProcessedToken[]>;
  normalizeValue(value: any, type: string): any;
  extractType(tokenData: any, path: string[]): string | null;
  isReference(value: any): boolean;
  extractReference(value: any): string | null;
  getFormatInfo(): TokenFormatInfo;
}
```

**Type Transformations**:
```typescript
// INPUT: Format-specific JSON
W3CTokenJSON | StyleDictionaryJSON
    ↓
// PROCESS: Extract and normalize
parseTokens() → ProcessedToken[]
    ↓
// OUTPUT: Intermediate representation
ProcessedToken {
  path: ['color', 'primary', '600'],
  value: '#1e40af',
  type: 'color'
}
```

**Implementations**:
- `W3CTokenFormatStrategy`: Handles W3C format ($value, $type)
- `StyleDictionaryFormatStrategy`: Handles Style Dictionary (value, type)

---

## Layer 2: Token Types (Universal Model)

**Purpose**: Platform-agnostic, normalized token representation.

### Core Types Managed

#### Token Type Enumeration
```typescript
// From core/models/Token.ts
type TokenType =
  | 'color'
  | 'dimension'
  | 'fontSize'
  | 'fontWeight'
  | 'fontFamily'
  | 'lineHeight'
  | 'letterSpacing'
  | 'spacing'
  | 'shadow'
  | 'border'
  | 'duration'
  | 'cubicBezier'
  | 'number'
  | 'string'
  | 'typography'    // Composite type
  | 'boolean'
  | 'other';
```

#### Token Value Types (Normalized)
```typescript
type TokenValue =
  | string
  | number
  | boolean
  | ColorValue
  | DimensionValue
  | ShadowValue
  | TypographyValue
  | CubicBezierValue
  | null;
```

#### Composite Value Types
```typescript
// Color value (supports multiple formats)
interface ColorValue {
  colorSpace?: 'sRGB' | 'display-p3' | 'hsl' | 'hsla' | 'rgb' | 'rgba';
  hex?: string;     // #RRGGBB or #RRGGBBAA
  r?: number;       // 0-255 or 0-1
  g?: number;
  b?: number;
  a?: number;       // 0-1 (alpha)
  h?: number;       // 0-360 (hue)
  s?: number;       // 0-100 (saturation)
  l?: number;       // 0-100 (lightness)
}

// Dimension with unit
interface DimensionValue {
  value: number;
  unit: 'px' | 'rem' | 'em' | '%' | 'pt';
}

// Shadow (box-shadow or text-shadow)
interface ShadowValue {
  offsetX: number | string;
  offsetY: number | string;
  blur: number | string;
  spread?: number | string;
  color: string | ColorValue;
  inset?: boolean;
}

// Typography (composite)
interface TypographyValue {
  fontFamily?: string;
  fontSize?: number | string;
  fontWeight?: number | string;
  lineHeight?: number | string;
  letterSpacing?: number | string;
}

// Cubic bezier timing
interface CubicBezierValue {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}
```

#### Main Token Interface
```typescript
// From core/models/Token.ts
interface Token {
  // ===== IDENTITY =====
  id: string;                    // Stable hash(projectId + path)
  path: string[];                // Hierarchical path
  name: string;                  // Last segment
  qualifiedName: string;         // Dot-separated path

  // ===== VALUE =====
  type: TokenType;               // Type enum
  rawValue: any;                 // Original from JSON
  value: TokenValue;             // Normalized value
  resolvedValue?: TokenValue;    // After alias resolution

  // ===== RELATIONSHIPS =====
  aliasTo?: string;              // Target token ID
  referencedBy?: string[];       // Inverse references

  // ===== ORGANIZATION =====
  projectId: string;             // Multi-project isolation
  collection: string;            // Collection name
  theme?: string;                // Optional theme
  brand?: string;                // Optional brand

  // ===== METADATA =====
  description?: string;
  sourceFormat: 'w3c' | 'style-dictionary' | 'figma' | 'custom';
  source: TokenSource;
  extensions: TokenExtensions;
  tags: string[];
  status: TokenStatus;
  version?: string;

  // ===== TIMESTAMPS =====
  created: string;               // ISO 8601
  lastModified: string;          // ISO 8601

  // ===== VALIDATION =====
  validation?: TokenValidation;
}
```

#### Supporting Types
```typescript
// Source tracking
interface TokenSource {
  type: 'github' | 'gitlab' | 'local' | 'api' | 'figma';
  location: string;              // File path or URL
  imported: string;              // ISO timestamp
  branch?: string;
  commit?: string;
}

// Extensions container
interface TokenExtensions {
  figma?: FigmaExtensions;
  w3c?: Record<string, any>;
  styleDictionary?: Record<string, any>;
  [key: string]: any;            // Custom extensions
}

// Figma-specific metadata
interface FigmaExtensions {
  variableId?: string;
  collectionId?: string;
  collectionName?: string;
  scopes?: VariableScope[];      // Figma type from Plugin API
  modeId?: string;
  modeName?: string;
}

// Token status
type TokenStatus = 'active' | 'deprecated' | 'draft' | 'archived';

// Validation result
interface TokenValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}
```

### Classes Operating on Token Types

**TokenRepository** (`src/core/services/TokenRepository.ts`)
```typescript
class TokenRepository {
  // Storage: Map<id, Token>
  private tokens: Map<string, Token>;

  // Indexes for O(1) lookups
  private projectIndex: Map<string, Set<string>>;         // projectId → tokenIds
  private typeIndex: Map<TokenType, Set<string>>;         // type → tokenIds
  private collectionIndex: Map<string, Set<string>>;      // collection → tokenIds
  private pathIndex: Map<string, string>;                 // qualifiedName → id
  private aliasIndex: Map<string, Set<string>>;           // targetId → referrerIds

  // CRUD operations on Token
  add(tokens: Token[]): Result<number>
  get(id: string): Token | undefined
  getByQualifiedName(projectId: string, qualifiedName: string): Token | undefined
  getByProject(projectId: string): Token[]
  getByType(type: TokenType): Token[]
  update(id: string, updates: TokenUpdate): Result<Token>
  remove(ids: string[]): Result<number>
  query(query: TokenQuery): Token[]
}
```

**Types Used by Repository**:
```typescript
// Query filter interface
interface TokenQuery {
  projectId?: string;
  type?: TokenType;
  types?: TokenType[];
  collection?: string;
  theme?: string;
  brand?: string;
  path?: string[];
  pathPrefix?: string[];
  qualifiedName?: string;
  tags?: string[];
  status?: Token['status'];
  isAlias?: boolean;
  ids?: string[];
}

// Repository statistics
interface RepositoryStats {
  totalTokens: number;
  byProject: Record<string, number>;
  byType: Partial<Record<TokenType, number>>;
  byCollection: Record<string, number>;
  aliasCount: number;
  circularReferenceCount: number;
}

// Update type (partial Token)
type TokenUpdate = Partial<Omit<Token, 'id' | 'created'>>;
```

---

## Layer 3: Resolution Types (Alias Resolution)

**Purpose**: Resolve token references and handle circular dependencies.

### Types Managed

#### Resolution Cache Types
```typescript
// Cache key format: "projectId:qualifiedName"
type CacheKey = string;

// Cache value: resolved token or null (not found)
type CacheValue = Token | null;

// Three-tier cache structure
interface ResolutionCaches {
  exactCache: Map<CacheKey, CacheValue>;       // Exact match
  normalizedCache: Map<CacheKey, CacheValue>;  // Normalized (slash→dot)
  fuzzyCache: Map<CacheKey, CacheValue>;       // Fuzzy matching
}
```

#### Resolution Result Types
```typescript
// Circular reference detection
interface CircularReference {
  cycle: string[];          // Array of token IDs forming cycle
  paths: string[][];        // Human-readable paths for each token
}

// Resolution statistics
interface ResolutionStats {
  totalResolutions: number;
  cacheHits: number;
  cacheMisses: number;
  cacheHitRate: number;
  circularReferences: number;
  unresolvedReferences: number;
}
```

### Class Operating on Resolution Types

**TokenResolver** (`src/core/services/TokenResolver.ts`)
```typescript
class TokenResolver {
  private repository: TokenRepository;

  // Three-tier cache
  private exactCache: Map<string, Token | null>;
  private normalizedCache: Map<string, Token | null>;
  private fuzzyCache: Map<string, Token | null>;

  // Statistics
  private stats: ResolutionStats;

  // INPUT: Reference string, project context
  // OUTPUT: Resolved Token or null
  resolveReference(reference: string, projectId: string): Token | null

  // INPUT: Project ID
  // OUTPUT: Map of resolved values
  resolveAllTokens(projectId: string): Promise<Result<Map<string, TokenValue>>>

  // INPUT: Project ID
  // OUTPUT: Circular reference cycles
  detectCircularReferences(projectId: string): CircularReference[]

  clearCache(): void
  getStats(): ResolutionStats
}
```

**Type Transformations**:
```typescript
// INPUT: Reference string
"{color.primary.600}"
    ↓
// STEP 1: Clean reference
"color.primary.600"
    ↓
// STEP 2: Try exact match in cache
CacheKey: "default:color.primary.600" → Token | null
    ↓
// STEP 3: Try repository lookup
repository.getByQualifiedName("default", "color.primary.600") → Token
    ↓
// OUTPUT: Resolved token
Token {
  id: "token_xyz",
  qualifiedName: "color.primary.600",
  value: "#1e40af"
}
```

---

## Layer 4: Translation Types (Token → Figma)

**Purpose**: Convert universal Token types to platform-specific Figma types.

### Types Managed

#### Sync Configuration Types
```typescript
// Sync options
interface SyncOptions {
  updateExisting?: boolean;      // Update existing variables (default: true)
  preserveScopes?: boolean;      // Preserve existing scopes (default: true)
  createStyles?: boolean;        // Create text/effect styles (default: true)
  percentageBase?: number;       // Base for % calculations (default: 16px)
}

// Sync result
interface SyncResult {
  stats: ImportStats;
  collections: string[];                    // Collections created/updated
  variables: Map<string, Variable>;         // variableId → Variable
}

// Import statistics
interface ImportStats {
  added: number;
  updated: number;
  skipped: number;
}
```

#### Type Mapping (Token → Figma)
```typescript
// Token type → Figma variable type mapping
type FigmaTypeMapping = {
  // Simple types → Variables
  'color': 'COLOR';
  'dimension': 'FLOAT';
  'fontSize': 'FLOAT';
  'fontWeight': 'FLOAT';
  'lineHeight': 'FLOAT';
  'letterSpacing': 'FLOAT';
  'spacing': 'FLOAT';
  'number': 'FLOAT';
  'fontFamily': 'STRING';
  'string': 'STRING';
  'boolean': 'BOOLEAN';

  // Composite types → Styles (NOT Variables!)
  'typography': null;  // → TextStyle
  'shadow': null;      // → EffectStyle
};
```

### Class Operating on Translation Types

**FigmaSyncService** (`src/core/services/FigmaSyncService.ts`)
```typescript
class FigmaSyncService {
  private repository: TokenRepository;
  private resolver: TokenResolver;
  private variableMap: Map<string, Variable>;
  private collectionMap: Map<string, VariableCollection>;

  // INPUT: Token[], SyncOptions
  // OUTPUT: SyncResult (with Figma objects created)
  async syncTokens(tokens: Token[], options?: SyncOptions): Promise<Result<SyncResult>>

  // Maps and caches
  getVariableMap(): Map<string, Variable>
  getCollectionMap(): Map<string, VariableCollection>

  // PRIVATE: Type conversion methods
  private mapToFigmaType(tokenType: TokenType): VariableResolvedDataType | null
  private convertValue(value: TokenValue, figmaType: VariableResolvedDataType): any
  private convertColorToFigmaRGB(colorValue: ColorValue): RGB
  private convertDimensionToPixels(dimValue: DimensionValue, base: number): number
  private resolveNestedReferences(value: any, projectId: string): any
}
```

**Type Transformations**:

1. **Color Conversion**:
```typescript
// INPUT: Token ColorValue
ColorValue {
  hex: "#1e40af"
}
    ↓
// CONVERT: Hex → RGB (0-1 range)
RGB {
  r: 0.118,  // 30/255
  g: 0.251,  // 64/255
  b: 0.686   // 175/255
}
    ↓
// OUTPUT: Figma RGB
```

2. **Dimension Conversion**:
```typescript
// INPUT: Token DimensionValue
DimensionValue {
  value: 1.5,
  unit: "rem"
}
    ↓
// CONVERT: REM → Pixels (base: 16)
1.5 * 16 = 24
    ↓
// OUTPUT: Figma FLOAT
24
```

3. **Typography Conversion**:
```typescript
// INPUT: Token TypographyValue
TypographyValue {
  fontFamily: "{primitive.font.family.primary}",  // Reference!
  fontSize: "{primitive.font.size.20}",            // Reference!
  fontWeight: "{primitive.font.weight.semibold}"   // Reference!
}
    ↓
// RESOLVE: Nested references
resolveNestedReferences() → {
  fontFamily: "Inter",
  fontSize: 20,
  fontWeight: 600
}
    ↓
// CONVERT: To Figma TextStyle properties
TextStyle {
  fontName: { family: "Inter", style: "Semi Bold" },
  fontSize: 20,
  fontWeight: 600
}
```

---

## Layer 5: Figma Types (Platform API)

**Purpose**: Native Figma Plugin API types.

### Types Managed (From Figma Plugin API)

#### Variable Types
```typescript
// Figma Plugin API type (read-only)
interface Variable {
  readonly id: string;
  name: string;
  readonly key: string;
  readonly variableCollectionId: string;
  resolvedType: VariableResolvedDataType;
  valuesByMode: { [modeId: string]: VariableValue | VariableAlias };
  description: string;
  readonly remote: boolean;
  readonly scopes: readonly VariableScope[];
  readonly codeSyntax: { [platform: string]: string };

  // Methods
  setValueForMode(modeId: string, value: VariableValue | VariableAlias): void;
  setVariableCodeSyntax(platform: CodeSyntaxPlatform, syntax: string): void;
  remove(): void;
}
```

#### Variable Value Types
```typescript
// Figma variable value types
type VariableResolvedDataType = 'BOOLEAN' | 'FLOAT' | 'STRING' | 'COLOR';

type VariableValue = boolean | number | string | RGB | RGBA;

// RGB color (0-1 range, no alpha)
interface RGB {
  r: number;  // 0-1
  g: number;  // 0-1
  b: number;  // 0-1
}

// RGBA color (0-1 range, with alpha)
interface RGBA {
  r: number;  // 0-1
  g: number;  // 0-1
  b: number;  // 0-1
  a: number;  // 0-1
}

// Variable alias (reference to another variable)
interface VariableAlias {
  type: 'VARIABLE_ALIAS';
  id: string;  // Variable ID
}
```

#### Variable Collection Types
```typescript
interface VariableCollection {
  readonly id: string;
  name: string;
  readonly key: string;
  readonly modes: readonly { modeId: string; name: string }[];
  readonly variableIds: readonly string[];
  readonly remote: boolean;
  readonly defaultModeId: string;

  // Methods
  addMode(name: string): string;
  removeMode(modeId: string): void;
}
```

#### Variable Scope Types
```typescript
// Figma scopes (where variables can be applied)
type VariableScope =
  | 'ALL_SCOPES'
  | 'FRAME_FILL'
  | 'SHAPE_FILL'
  | 'TEXT_FILL'
  | 'STROKE_COLOR'
  | 'EFFECT_COLOR'
  | 'CORNER_RADIUS'
  | 'WIDTH_HEIGHT'
  | 'GAP'
  | 'TEXT_CONTENT'
  | 'FONT_FAMILY'
  | 'FONT_STYLE'
  | 'FONT_WEIGHT'
  | 'FONT_SIZE'
  | 'LINE_HEIGHT'
  | 'LETTER_SPACING'
  | 'PARAGRAPH_SPACING'
  | 'PARAGRAPH_INDENT';
```

#### Text Style Types
```typescript
interface TextStyle extends BaseStyle {
  fontName: FontName;
  fontSize: number;
  lineHeight: LineHeight;
  letterSpacing: LetterSpacing;
  paragraphSpacing: number;
  paragraphIndent: number;
  textCase: TextCase;
  textDecoration: TextDecoration;
  // ... more properties
}

interface FontName {
  family: string;   // "Inter"
  style: string;    // "Regular" | "Bold" | "Semi Bold"
}

type LineHeight =
  | { unit: 'PIXELS'; value: number }
  | { unit: 'PERCENT'; value: number }
  | { unit: 'AUTO' };

type LetterSpacing =
  | { unit: 'PIXELS'; value: number }
  | { unit: 'PERCENT'; value: number };
```

#### Effect Style Types
```typescript
interface EffectStyle extends BaseStyle {
  effects: readonly Effect[];
}

interface Effect {
  type: 'DROP_SHADOW' | 'INNER_SHADOW' | 'LAYER_BLUR' | 'BACKGROUND_BLUR';
  visible: boolean;
  radius: number;
  color?: RGBA;      // Required for shadows!
  offset?: Vector2;  // For shadows
  spread?: number;   // For shadows
  blendMode?: BlendMode;
}

interface Vector2 {
  x: number;
  y: number;
}
```

#### Base Style Types
```typescript
interface BaseStyle {
  readonly id: string;
  name: string;
  readonly key: string;
  description: string;
  readonly remote: boolean;

  remove(): void;
}

type CodeSyntaxPlatform = 'WEB' | 'ANDROID' | 'iOS';
```

### Figma API Methods Used

```typescript
// Variable creation/management
figma.variables.createVariable(
  name: string,
  collection: VariableCollection,
  type: VariableResolvedDataType
): Variable

figma.variables.getVariableByIdAsync(id: string): Promise<Variable | null>
figma.variables.getLocalVariableCollectionsAsync(): Promise<VariableCollection[]>

// Collection creation/management
figma.variables.createVariableCollection(name: string): VariableCollection
figma.variables.getVariableCollectionByIdAsync(id: string): Promise<VariableCollection | null>

// Style creation/management
figma.createTextStyle(): TextStyle
figma.createEffectStyle(): EffectStyle
figma.getLocalTextStyles(): TextStyle[]
figma.getLocalEffectStyles(): EffectStyle[]

// Font loading
figma.loadFontAsync(fontName: FontName): Promise<void>
```

---

## Complete Type Flow Example

Let's trace a **color token** through ALL layers:

### Step 1: JSON Input (W3C Format)
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
  }
}
```
**Type**: `W3CTokenJSON`

### Step 2: Parse (ITokenFormatStrategy)
```typescript
// W3CTokenFormatStrategy.parseTokens()
const processedToken: ProcessedToken = {
  path: ['color', 'primary', '600'],
  value: '#1e40af',
  type: 'color',
  originalValue: '#1e40af'
};
```
**Type**: `ProcessedToken`

### Step 3: Normalize (Create Token)
```typescript
// Token model
const token: Token = {
  id: 'token_abc123',
  path: ['color', 'primary', '600'],
  name: '600',
  qualifiedName: 'color.primary.600',
  type: 'color',
  rawValue: '#1e40af',
  value: { hex: '#1e40af' },  // ColorValue
  projectId: 'default',
  collection: 'primitive',
  sourceFormat: 'w3c',
  source: {
    type: 'github',
    location: 'primitives.json',
    imported: '2025-11-16T10:00:00Z'
  },
  extensions: {},
  tags: [],
  status: 'active',
  created: '2025-11-16T10:00:00Z',
  lastModified: '2025-11-16T10:00:00Z'
};
```
**Type**: `Token` with `ColorValue`

### Step 4: Store (TokenRepository)
```typescript
// TokenRepository.add()
repository.add([token]);

// Stored in indexes:
tokens.set('token_abc123', token);
projectIndex.get('default').add('token_abc123');
typeIndex.get('color').add('token_abc123');
pathIndex.set('default:color.primary.600', 'token_abc123');
```
**Type**: `Map<string, Token>`

### Step 5: Resolve (TokenResolver)
```typescript
// No alias, so resolvedValue = value
const resolved: Map<string, TokenValue> = new Map([
  ['token_abc123', { hex: '#1e40af' }]
]);
```
**Type**: `Map<string, TokenValue>` where value is `ColorValue`

### Step 6: Translate (FigmaSyncService)
```typescript
// mapToFigmaType('color') → 'COLOR'
const figmaType: VariableResolvedDataType = 'COLOR';

// convertColorToFigmaRGB({ hex: '#1e40af' })
const figmaValue: RGB = {
  r: 0.118,  // 30/255
  g: 0.251,  // 64/255
  b: 0.686   // 175/255
};
```
**Types**: `VariableResolvedDataType` and `RGB`

### Step 7: Create Figma Variable
```typescript
// Figma Plugin API
const variable: Variable = figma.variables.createVariable(
  'color.primary.600',
  collection,
  'COLOR'
);

variable.setValueForMode(modeId, {
  r: 0.118,
  g: 0.251,
  b: 0.686
});

variable.setVariableCodeSyntax('WEB', '--color-primary-600');
variable.setVariableCodeSyntax('ANDROID', '@color/color_primary_600');
variable.setVariableCodeSyntax('iOS', 'color.primary.600');
```
**Type**: `Variable` (Figma Plugin API)

### Step 8: Update Token Metadata (Bidirectional)
```typescript
// Store Figma IDs back in Token
token.extensions.figma = {
  variableId: variable.id,
  collectionId: collection.id,
  scopes: variable.scopes,
  modeId: modeId
};

repository.update(token.id, { extensions: token.extensions });
```
**Type**: `FigmaExtensions` added to `Token.extensions`

---

## Type Mapping Summary Tables

### Table 1: Type Flow by Layer

| Layer | Input Type | Processing Type | Output Type | Example |
|-------|-----------|----------------|-------------|---------|
| **Input** | JSON (any) | - | JSON (any) | `{ "$value": "#1e40af" }` |
| **Parse** | JSON (any) | `TokenData`, `DesignToken` | `ProcessedToken` | `{ path: [...], value: '#1e40af' }` |
| **Token** | `ProcessedToken` | `Token` | `Token` | Full Token object with metadata |
| **Repository** | `Token` | Indexes (`Map<>`) | `Token` | Stored with O(1) lookup |
| **Resolution** | `Token` | Cache (`Map<>`) | `Token`, `TokenValue` | Resolved references |
| **Translation** | `Token`, `TokenValue` | Type conversion | Figma types | RGB, FLOAT, STRING |
| **Figma** | Figma types | Figma API | `Variable`, `TextStyle`, `EffectStyle` | Platform objects |

### Table 2: Token Type → Figma Type Mapping

| Token Type | Token Value Type | Figma Target | Figma Type | Conversion |
|-----------|-----------------|--------------|-----------|-----------|
| `color` | `ColorValue` | Variable | `COLOR` | RGB → RGB (0-1) |
| `dimension` | `DimensionValue` | Variable | `FLOAT` | px/rem/em → px |
| `fontSize` | `DimensionValue \| number` | Variable | `FLOAT` | rem → px |
| `fontWeight` | `number \| string` | Variable | `FLOAT` | Direct or map |
| `lineHeight` | `DimensionValue \| number` | Variable | `FLOAT` | rem → px |
| `spacing` | `DimensionValue` | Variable | `FLOAT` | rem → px |
| `number` | `number` | Variable | `FLOAT` | Direct |
| `fontFamily` | `string` | Variable | `STRING` | Direct |
| `string` | `string` | Variable | `STRING` | Direct |
| `boolean` | `boolean` | Variable | `BOOLEAN` | Direct |
| `typography` | `TypographyValue` | **TextStyle** | N/A | Composite → Style |
| `shadow` | `ShadowValue` | **EffectStyle** | N/A | Composite → Effect |

### Table 3: Class → Types Mapping

| Class | Input Types | Internal Types | Output Types |
|-------|------------|---------------|-------------|
| **IFileSource** | `FileSourceConfig` | `FileMetadata` | `Result<any>` (raw JSON) |
| **ITokenFormatStrategy** | `TokenData` | `DesignToken` | `Result<ProcessedToken[]>` |
| **TokenRepository** | `Token[]` | `Map<id, Token>`, Indexes | `Token`, `Token[]` |
| **TokenResolver** | `string` (reference), `projectId` | Cache maps | `Token \| null`, `Map<id, TokenValue>` |
| **FigmaSyncService** | `Token[]`, `SyncOptions` | Type conversions | `Result<SyncResult>` |
| **Figma API** | `RGB`, `RGBA`, `FontName`, etc. | Platform types | `Variable`, `TextStyle`, `EffectStyle` |

---

## Key Type Constraints

### Constraint 1: Token Value Normalization
**Why**: Different formats represent values differently.
**Solution**: Normalize to `TokenValue` union type.

```typescript
// W3C: "$value": "#1e40af"
// Style Dictionary: "value": "#1e40af"
// Both normalize to:
ColorValue { hex: "#1e40af" }
```

### Constraint 2: Figma Type Limitations
**Why**: Figma Variables only support 4 types (COLOR, FLOAT, STRING, BOOLEAN).
**Impact**: Composite types must use Styles.

```typescript
// TypographyValue (composite) ✗ Cannot be Variable
// Must use TextStyle instead ✓
```

### Constraint 3: Reference String Format
**Why**: Different formats use different reference syntax.
**Solution**: Normalize to `{path.to.token}` format.

```typescript
// W3C: "{color.primary.600}"
// Style Dictionary: "{color.primary.600}"
// Custom: "$color.primary.600"
// All normalize to: "{color.primary.600}"
```

### Constraint 4: Project Scoping
**Why**: Token resolution is scoped to projectId.
**Impact**: Cross-project references fail.

```typescript
// Reference in projectId "default"
"{primitive.color.primary}"

// Token in projectId "primitive"  ← Different project!
Token { projectId: "primitive", qualifiedName: "primitive.color.primary" }

// Resolution fails! ❌
```

---

## Summary: Types at Each Level

| Level | Primary Types | Purpose |
|-------|--------------|---------|
| **0. Input** | JSON (`any`), `W3CTokenJSON`, `StyleDictionaryJSON` | Raw source data |
| **1. Parse** | `TokenData`, `DesignToken`, `ProcessedToken` | Format-specific parsing |
| **2. Token** | `Token`, `TokenType`, `TokenValue`, `ColorValue`, `DimensionValue`, etc. | Universal model |
| **3. Repository** | `Map<string, Token>`, `TokenQuery`, `RepositoryStats` | Storage & indexing |
| **4. Resolution** | `Map<CacheKey, Token>`, `CircularReference`, `ResolutionStats` | Alias resolution |
| **5. Translation** | `SyncOptions`, `SyncResult`, Conversion functions | Token → Figma |
| **6. Figma** | `Variable`, `VariableCollection`, `TextStyle`, `EffectStyle`, `RGB`, `RGBA` | Platform API |

---

**Version**: 1.0
**Date**: 2025-11-16
**Related**: ABSTRACTION_ARCHITECTURE.md, FLOW_ANALYSIS.md
