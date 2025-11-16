# Abstraction Architecture: Tokens ↔ Variables

**Question**: *"How is currently managed the abstract levels? Variables? tokens? And how those two communicate?"*

---

## Architecture Overview

The plugin uses a **3-layer architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                   DATA FLOW PIPELINE                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  JSON Files → Token Layer → Translation Layer → Figma API  │
│  (Source)     (Universal)   (Bridge)            (Platform)  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Layer 1: Token Abstraction (Platform-Agnostic)

**Purpose**: Universal, platform-independent representation of design tokens.

### Core Components

#### 1.1 Token Model (`src/core/models/Token.ts`)

**The universal data structure that represents ANY design token, regardless of source format:**

```typescript
interface Token {
  // ===== IDENTITY =====
  id: string;                    // hash(projectId + qualifiedName)
  path: string[];                // ['color', 'semantic', 'button', 'primary']
  name: string;                  // 'primary'
  qualifiedName: string;         // 'color.semantic.button.primary'

  // ===== VALUE =====
  type: TokenType;               // 'color' | 'dimension' | 'typography' | etc.
  rawValue: any;                 // Original value from JSON (as-is)
  value: TokenValue;             // Normalized value (converted to standard format)
  resolvedValue?: TokenValue;    // After alias resolution (final computed value)

  // ===== RELATIONSHIPS =====
  aliasTo?: string;              // Reference target: "{color.primary.600}"
  referencedBy?: string[];       // Inverse: who references this token

  // ===== ORGANIZATION =====
  projectId: string;             // Multi-project isolation ("default", "primitive", etc.)
  collection: string;            // Figma collection name ('primitive' | 'semantic')
  theme?: string;                // Optional theme organization
  brand?: string;                // Optional brand organization

  // ===== METADATA =====
  description?: string;          // Human-readable description
  sourceFormat: string;          // 'w3c' | 'style-dictionary' | 'figma'
  source: TokenSource;           // Where it came from (file, line number, etc.)
  extensions: TokenExtensions;   // Format-specific metadata
  tags: string[];                // Searchable tags

  // ===== STATE =====
  status: TokenStatus;           // 'synced' | 'modified' | 'pending' | 'error'
  created: string;               // ISO timestamp
  lastModified: string;          // ISO timestamp
}
```

**Key Insight**: This is the SINGLE SOURCE OF TRUTH. All operations work with this model.

#### 1.2 TokenRepository (`src/core/services/TokenRepository.ts`)

**In-memory database with indexed queries for O(1) lookups:**

```typescript
class TokenRepository {
  // Primary storage
  private tokens: Map<string, Token>;

  // Indexes for fast O(1) lookups
  private projectIndex: Map<string, Set<string>>;         // projectId → tokenIds
  private typeIndex: Map<TokenType, Set<string>>;         // type → tokenIds
  private collectionIndex: Map<string, Set<string>>;      // collection → tokenIds
  private pathIndex: Map<string, string>;                 // qualifiedName → tokenId
  private aliasIndex: Map<string, Set<string>>;           // targetId → referrerIds

  // Core operations (all O(1) or O(k) where k = result size)
  add(tokens: Token[]): Result<number>
  get(id: string): Token | undefined
  getByQualifiedName(projectId: string, qualifiedName: string): Token | undefined
  getByProject(projectId: string): Token[]
  getByType(type: TokenType): Token[]
  query(query: TokenQuery): Token[]
}
```

**Performance Characteristics**:
- **O(1)** lookup by ID
- **O(1)** lookup by qualified name (using pathIndex)
- **O(k)** filtering by project, type, collection (k = result set size)
- Maintains 5 indexes automatically

**Example Usage**:
```typescript
// Store tokens
repository.add([token1, token2, token3]);

// Fast lookup by qualified name
const token = repository.getByQualifiedName(
  'default',
  'color.semantic.button.primary'
);

// Get all tokens in a project
const tokens = repository.getByProject('default');

// Complex query
const results = repository.query({
  projectId: 'default',
  type: 'color',
  collection: 'semantic'
});
```

#### 1.3 TokenResolver (`src/core/services/TokenResolver.ts`)

**Resolves token aliases/references with multi-tier caching:**

```typescript
class TokenResolver {
  // Three-tier cache for performance
  private exactCache: Map<string, Token | null>;       // Exact match cache
  private normalizedCache: Map<string, Token | null>;  // Normalized (slash→dot)
  private fuzzyCache: Map<string, Token | null>;       // Fuzzy matching

  // Core operations
  resolveReference(reference: string, projectId: string): Token | null
  resolveAllTokens(projectId: string): Promise<Result<Map<string, TokenValue>>>
  detectCircularReferences(projectId: string): CircularReference[]
}
```

**Resolution Strategy** (3-tier fallback):
1. **Exact match**: Try exact qualified name (`color.primary.600`)
2. **Normalized match**: Convert slashes to dots (`color/primary/600` → `color.primary.600`)
3. **Fuzzy match**: Partial matching, suffix matching (expensive fallback)

**CRITICAL CONSTRAINT**: Resolution is **PROJECT-SCOPED**

```typescript
// ❌ This FAILS if tokens are in different projects
const semantic = {
  projectId: 'default',
  value: '{primitive.color.primary.600}'  // References primitive project
};

const primitive = {
  projectId: 'primitive',  // ← Different projectId!
  qualifiedName: 'primitive.color.primary.600'
};

// Resolution only searches within "default" project → NOT FOUND
resolver.resolveReference('{primitive.color.primary.600}', 'default'); // null
```

**Example Resolution Flow**:
```typescript
// Given these tokens in repository
const tokens = [
  { id: 'a', projectId: 'default', qualifiedName: 'color.primary', value: '#1e40af' },
  { id: 'b', projectId: 'default', qualifiedName: 'button.bg', value: '{color.primary}' }
];

// Resolve all tokens in dependency order
const resolved = await resolver.resolveAllTokens('default');
// Map {
//   'a' => '#1e40af',
//   'b' => '#1e40af'  ← Resolved from reference
// }
```

**Performance**: 98% cache hit rate on typical workloads.

---

## Layer 2: Translation/Communication Layer

**Purpose**: Bridge between platform-agnostic Token model and platform-specific Figma API.

### FigmaSyncService (`src/core/services/FigmaSyncService.ts`)

**The ONLY component that knows about both Token AND Figma APIs:**

```typescript
class FigmaSyncService {
  private repository: TokenRepository;  // Read tokens
  private resolver: TokenResolver;      // Resolve references
  private variableMap: Map<string, Variable>;
  private collectionMap: Map<string, VariableCollection>;

  async syncTokens(tokens: Token[], options?: SyncOptions): Promise<Result<SyncResult>>
}
```

### 2.1 Type Mapping (Token → Figma)

**How Token.type maps to Figma VariableResolvedDataType:**

```typescript
// In FigmaSyncService.getVariableType()
private getVariableType(token: Token): VariableResolvedDataType {
  switch (token.type) {
    case 'color':
      return 'COLOR';

    case 'dimension':
    case 'fontSize':
    case 'spacing':
    case 'borderRadius':
    case 'lineHeight':
    case 'letterSpacing':
    case 'fontWeight':
    case 'number':
      return 'FLOAT';

    case 'fontFamily':
    case 'string':
      return 'STRING';

    case 'boolean':
      return 'BOOLEAN';

    default:
      return 'STRING'; // Safe fallback
  }
}
```

**Type Mapping Table**:

| Token Type | Figma Type | Target |
|-----------|-----------|--------|
| `color` | `COLOR` | Variable |
| `dimension`, `fontSize`, `spacing`, `borderRadius`, `lineHeight`, `letterSpacing`, `fontWeight`, `number` | `FLOAT` | Variable |
| `fontFamily`, `string` | `STRING` | Variable |
| `boolean` | `BOOLEAN` | Variable |
| `typography` | N/A | **TextStyle** (not Variable!) |
| `shadow` | N/A | **EffectStyle** (not Variable!) |

**Key Insight**: Not all tokens become Variables! Typography and Shadow tokens become **Styles**.

### 2.2 Value Conversion (Token → Figma)

**Color Conversion**:
```typescript
// Token value formats:
const tokenColor = {
  hex: "#1e40af",                          // Hex string
  rgb: { r: 30, g: 64, b: 175 },          // RGB object (0-255)
  hsl: { h: 225, s: 70, l: 40 },          // HSL object
  colorSpace: "hsl",                       // W3C format
  components: [225, 16, 92],
  hex: "#E8E9EC"                           // Fallback
};

// Figma expects:
const figmaRGB = { r: 0.118, g: 0.251, b: 0.686 };  // 0-1 range!

// Conversion function
private convertColorToFigmaRGB(tokenValue: any): RGB {
  if (tokenValue.hex) {
    return this.hexToRGB(tokenValue.hex);
  }
  if (tokenValue.r !== undefined) {
    // Normalize to 0-1 range
    if (tokenValue.r > 1) {
      return { r: tokenValue.r / 255, g: tokenValue.g / 255, b: tokenValue.b / 255 };
    }
    return tokenValue;
  }
  // ... more formats
}
```

**Dimension Conversion** (REM/EM → Pixels):
```typescript
// Token value formats:
const tokenDimension = "1.5rem";  // or { value: 1.5, unit: "rem" }

// Figma expects:
const figmaFloat = 24;  // Always pixels!

// Conversion (default base: 16px)
private convertDimensionToPixels(value: any, base: number = 16): number {
  if (typeof value === 'object' && value.value && value.unit) {
    if (value.unit === 'rem' || value.unit === 'em') {
      return value.value * base;  // 1.5rem × 16 = 24px
    }
    return value.value;
  }
  if (typeof value === 'string') {
    if (value.endsWith('rem') || value.endsWith('em')) {
      return parseFloat(value) * base;  // "1.5rem" → 24
    }
    return parseFloat(value);
  }
  return value;  // Already a number
}
```

**Reference Resolution** (Nested):
```typescript
// Composite token with nested references
const typographyToken = {
  type: 'typography',
  value: {
    fontFamily: "{primitive.typography.font-family.primary}",   // Reference
    fontSize: "{primitive.typography.font-size.20}",             // Reference
    fontWeight: "{primitive.typography.font-weight.semibold}",   // Reference
    lineHeight: "{primitive.typography.line-height.normal}",     // Reference
    letterSpacing: "{primitive.typography.letter-spacing.normal}" // Reference
  }
};

// FigmaSyncService.resolveNestedReferences() recursively resolves
const resolved = this.resolveNestedReferences(typographyToken.value, typographyToken.projectId);
// {
//   fontFamily: "Inter",           // Resolved!
//   fontSize: 20,                  // Resolved!
//   fontWeight: 600,               // Resolved!
//   lineHeight: 1.5,               // Resolved!
//   letterSpacing: 0               // Resolved!
// }
```

### 2.3 Metadata Flow (Bidirectional)

**Token → Figma** (Write metadata):
```typescript
// After creating Figma variable, store metadata back in token
private async updateTokenExtensions(tokens: Token[]): Promise<void> {
  for (const token of tokens) {
    const variable = this.variableMap.get(token.qualifiedName);
    if (variable) {
      // Update token.extensions with Figma IDs
      token.extensions.figma = {
        variableId: variable.id,
        collectionId: this.collectionMap.get(token.collection)?.id,
        scopes: variable.scopes,
        codeSyntax: variable.codeSyntax
      };

      // Update in repository
      this.repository.update(token.id, { extensions: token.extensions });
    }
  }
}
```

**Figma → Token** (Read existing variables):
```typescript
// When loading existing variables, create/update tokens
private async loadExistingVariables(): Promise<Token[]> {
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  const tokens: Token[] = [];

  for (const collection of collections) {
    for (const variableId of collection.variableIds) {
      const variable = await figma.variables.getVariableByIdAsync(variableId);

      // Convert Figma Variable → Token
      const token: Token = {
        id: this.repository.generateTokenId('figma', [variable.name]),
        path: variable.name.split('.'),
        name: variable.name.split('.').pop()!,
        qualifiedName: variable.name,
        type: this.figmaTypeToTokenType(variable.resolvedType),
        value: this.figmaValueToTokenValue(variable.valuesByMode),
        rawValue: variable.valuesByMode,
        projectId: 'figma',
        collection: collection.name,
        sourceFormat: 'figma',
        extensions: {
          figma: {
            variableId: variable.id,
            collectionId: collection.id,
            scopes: variable.scopes,
            codeSyntax: variable.codeSyntax
          }
        },
        // ... other fields
      };

      tokens.push(token);
    }
  }

  return tokens;
}
```

---

## Layer 3: Figma Abstraction (Platform-Specific)

**Purpose**: Figma-specific objects managed by Figma Plugin API.

### 3.1 Figma Variables (Simple Types)

**For tokens with simple values: color, dimension, number, string, boolean:**

```typescript
// Figma API structure (read-only types from Plugin API)
interface Variable {
  id: string;
  name: string;
  resolvedType: 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN';
  valuesByMode: { [modeId: string]: any };
  variableCollectionId: string;
  scopes: VariableScope[];
  codeSyntax: { [platform: string]: string };
}

interface VariableCollection {
  id: string;
  name: string;
  modes: { modeId: string; name: string }[];
  variableIds: string[];
}
```

**Creation Flow**:
```typescript
// In FigmaSyncService.syncCollectionTokens()
for (const token of tokens) {
  if (this.isSimpleType(token.type)) {
    // Create or update Figma variable
    let variable = await this.findExistingVariable(token);

    if (!variable) {
      variable = figma.variables.createVariable(
        token.qualifiedName,
        collection,
        this.getVariableType(token)
      );
      stats.added++;
    } else {
      stats.updated++;
    }

    // Set value (converted to Figma format)
    const figmaValue = this.convertTokenValueToFigma(token);
    variable.setValueForMode(collection.defaultModeId, figmaValue);

    // Set code syntax for all platforms
    variable.setVariableCodeSyntax('WEB', `--${token.qualifiedName.replace(/\./g, '-')}`);
    variable.setVariableCodeSyntax('ANDROID', `@dimen/${token.qualifiedName.replace(/\./g, '_')}`);
    variable.setVariableCodeSyntax('iOS', token.qualifiedName);

    // Store in map
    this.variableMap.set(token.qualifiedName, variable);
  }
}
```

### 3.2 Figma TextStyles (Typography Tokens)

**For tokens with type='typography':**

```typescript
// Figma API structure
interface TextStyle {
  id: string;
  name: string;
  fontName: { family: string; style: string };
  fontSize: number;
  lineHeight: LineHeight;
  letterSpacing: LetterSpacing;
  // ... more properties
}
```

**Creation Flow**:
```typescript
// In FigmaSyncService.createTextStyle()
private async createTextStyle(token: Token): Promise<void> {
  // Resolve ALL nested references first
  const resolvedValue = this.resolveNestedReferences(token.value, token.projectId);

  // Check if any references remain unresolved
  const unresolvedRefs = this.findUnresolvedReferences(resolvedValue);
  if (unresolvedRefs.length > 0) {
    console.group(`⚠️  TYPOGRAPHY: ${token.qualifiedName}`);
    console.log(`❌ ${unresolvedRefs.length} unresolved reference(s) - will use Figma defaults`);
    console.groupEnd();
    // Continue with Figma defaults (12px, AUTO)
  }

  // Extract typography properties
  const fontFamily = resolvedValue.fontFamily || 'Inter';
  const fontSize = this.convertDimensionToPixels(resolvedValue.fontSize) || 12;
  const lineHeight = this.convertLineHeight(resolvedValue.lineHeight);
  const letterSpacing = this.convertLetterSpacing(resolvedValue.letterSpacing);

  // Load font (with fallback)
  try {
    await figma.loadFontAsync({ family: fontFamily, style: 'Regular' });
  } catch (error) {
    console.warn(`⚠️  Font "${fontFamily}" not available - using Inter`);
    await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
  }

  // Create or update text style
  let style = figma.getLocalTextStyles().find(s => s.name === token.qualifiedName);
  if (!style) {
    style = figma.createTextStyle();
    style.name = token.qualifiedName;
  }

  // Apply properties
  style.fontName = { family: fontFamily, style: 'Regular' };
  style.fontSize = fontSize;
  style.lineHeight = lineHeight;
  style.letterSpacing = letterSpacing;
}
```

**WHY Typography Tokens Don't Become Variables**:
- Figma Variables only support **simple types** (COLOR, FLOAT, STRING, BOOLEAN)
- Typography is a **composite type** with multiple properties
- Figma uses **TextStyle** objects for typography definitions
- Same reason for Shadows → EffectStyle

### 3.3 Figma EffectStyles (Shadow Tokens)

**For tokens with type='shadow':**

```typescript
// Figma API structure
interface EffectStyle {
  id: string;
  name: string;
  effects: Effect[];
}

interface Effect {
  type: 'DROP_SHADOW' | 'INNER_SHADOW';
  color: RGBA;      // ← Must have alpha!
  offset: Vector;
  radius: number;
  spread: number;
}
```

**Creation Flow**:
```typescript
// In FigmaSyncService.createEffectStyle()
private async createEffectStyle(token: Token): Promise<void> {
  // Resolve nested references
  const resolvedValue = this.resolveNestedReferences(token.value, token.projectId);

  // Check for unresolved color reference (common issue!)
  const unresolvedRefs = this.findUnresolvedReferences(resolvedValue);
  if (unresolvedRefs.length > 0) {
    console.group(`⚠️  SHADOW: ${token.qualifiedName}`);
    unresolvedRefs.forEach(ref => {
      if (ref.includes('color')) {
        console.log(`   ${ref} ⚠️  MISSING COLOR - shadow will be invisible!`);
      }
    });
    console.groupEnd();
  }

  // Convert to Figma effect
  const effect: Effect = {
    type: 'DROP_SHADOW',
    color: this.convertColorToFigmaRGBA(resolvedValue.color),  // Note: RGBA with alpha!
    offset: { x: resolvedValue.offsetX || 0, y: resolvedValue.offsetY || 0 },
    radius: resolvedValue.blur || 0,
    spread: resolvedValue.spread || 0
  };

  // Create or update effect style
  let style = figma.getLocalEffectStyles().find(s => s.name === token.qualifiedName);
  if (!style) {
    style = figma.createEffectStyle();
    style.name = token.qualifiedName;
  }

  style.effects = [effect];
}
```

---

## Complete Data Flow

### Flow 1: Import (JSON → Tokens)

```
1. User uploads JSON files (W3C or Style Dictionary format)
   ↓
2. FileSource fetches files (GitHub/Local)
   ↓
3. FormatStrategy detects format (W3C, Style Dictionary, etc.)
   ↓
4. FormatStrategy.parseTokens() converts JSON → Token[]
   ↓
5. TokenRepository.add(tokens) stores in memory with indexes
```

**Example**:
```json
// primitives.json (W3C format)
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
↓ **Parsed to Token** ↓
```typescript
{
  id: "token_abc123",
  path: ["color", "primary", "600"],
  name: "600",
  qualifiedName: "color.primary.600",
  type: "color",
  rawValue: "#1e40af",
  value: { hex: "#1e40af" },
  projectId: "default",
  collection: "primitive",
  sourceFormat: "w3c"
}
```

### Flow 2: Resolution (Tokens → Resolved Tokens)

```
1. TokenResolver.resolveAllTokens(projectId)
   ↓
2. Build dependency graph (who references who)
   ↓
3. Topological sort (resolve in correct order)
   ↓
4. For each token in sorted order:
   - If has aliasTo → resolve reference
   - Store resolvedValue
   ↓
5. Return Map<tokenId, resolvedValue>
```

**Example**:
```typescript
// Before resolution
const tokens = [
  { qualifiedName: "color.primary", value: "#1e40af" },
  { qualifiedName: "button.bg", value: "{color.primary}", aliasTo: "token_primary_id" }
];

// After resolution
const resolved = Map {
  "token_primary_id" => "#1e40af",
  "token_button_id" => "#1e40af"  // ← Resolved!
};
```

### Flow 3: Sync (Tokens → Figma)

```
1. FigmaSyncService.syncTokens(tokens)
   ↓
2. Group tokens by collection
   ↓
3. For each collection:
   ├─ Get or create VariableCollection
   ├─ For each simple token (color, dimension, etc.):
   │  ├─ Convert value to Figma format
   │  ├─ Create or update Variable
   │  └─ Set code syntax (WEB, ANDROID, iOS)
   │
   ├─ For each typography token:
   │  ├─ Resolve nested references
   │  ├─ Convert to Figma font properties
   │  └─ Create or update TextStyle
   │
   └─ For each shadow token:
      ├─ Resolve nested references
      ├─ Convert to Figma effect
      └─ Create or update EffectStyle
   ↓
4. Update token.extensions.figma with IDs
   ↓
5. Repository.update() with metadata
```

### Flow 4: Metadata Feedback (Figma → Tokens)

```
1. After sync, Figma returns created object IDs
   ↓
2. FigmaSyncService.updateTokenExtensions()
   ↓
3. For each token:
   - Get corresponding Variable/Style
   - Extract: variableId, collectionId, scopes, codeSyntax
   - Update token.extensions.figma
   - Repository.update() to persist
```

---

## Communication Patterns

### Pattern 1: One-Way Translation (Token → Figma)

```typescript
// Token (platform-agnostic)
const token: Token = {
  type: 'color',
  value: { hex: '#1e40af' },
  qualifiedName: 'color.primary.600'
};

// ↓ FigmaSyncService translates ↓

// Figma Variable (platform-specific)
const variable = figma.variables.createVariable('color.primary.600', collection, 'COLOR');
variable.setValueForMode(modeId, { r: 0.118, g: 0.251, b: 0.686 });
```

### Pattern 2: Bidirectional Metadata (Token ↔ Figma)

```typescript
// Token → Figma: Create variable
const variable = figma.variables.createVariable(token.qualifiedName, collection, 'COLOR');

// Figma → Token: Store metadata
token.extensions.figma = {
  variableId: variable.id,
  collectionId: collection.id,
  scopes: variable.scopes,
  codeSyntax: variable.codeSyntax
};

// Later: Token → Figma: Update existing variable
const variable = await figma.variables.getVariableByIdAsync(token.extensions.figma.variableId);
variable.setValueForMode(modeId, newValue);
```

### Pattern 3: Nested Resolution (Composite Tokens)

```typescript
// Typography token with nested references
const token: Token = {
  type: 'typography',
  value: {
    fontFamily: "{primitive.font.family.primary}",
    fontSize: "{primitive.font.size.20}",
    // ... more references
  }
};

// FigmaSyncService.resolveNestedReferences() walks tree
function resolveNestedReferences(value: any, projectId: string): any {
  if (typeof value === 'string' && value.startsWith('{')) {
    // Resolve reference using TokenResolver
    const referencedToken = this.resolver.resolveReference(value, projectId);
    if (referencedToken) {
      // Recursively resolve (in case target is also a reference)
      return this.resolveNestedReferences(referencedToken.resolvedValue || referencedToken.value, projectId);
    } else {
      // UNRESOLVED - log diagnostics
      this.logUnresolvedReference(value, projectId);
      return value;  // Return as-is (will cause Figma defaults)
    }
  } else if (typeof value === 'object') {
    // Recursively resolve object properties
    const resolved = {};
    for (const [key, val] of Object.entries(value)) {
      resolved[key] = this.resolveNestedReferences(val, projectId);
    }
    return resolved;
  }
  return value;  // Primitive value
}
```

---

## Key Constraints & Insights

### 🔒 Constraint 1: Project ID Scoping

**WHY**: Token resolution is scoped to projectId to prevent cross-project pollution.

**IMPACT**: References can ONLY resolve within the same project.

```typescript
// ❌ FAILS
const semantic = {
  projectId: 'default',
  value: '{primitive.color.primary}'
};
const primitive = {
  projectId: 'primitive',  // Different project!
  qualifiedName: 'primitive.color.primary'
};
resolver.resolveReference('{primitive.color.primary}', 'default'); // null

// ✅ WORKS
const semantic = {
  projectId: 'default',
  value: '{color.primary}'
};
const primitive = {
  projectId: 'default',  // Same project!
  qualifiedName: 'color.primary'
};
resolver.resolveReference('{color.primary}', 'default'); // Token found!
```

**SOLUTION**: Ensure all related tokens use the same projectId (implemented in Phase 1 of IMPROVEMENT_PLAN.md).

### 🎯 Constraint 2: Type Mapping

**WHY**: Figma only supports 4 variable types: COLOR, FLOAT, STRING, BOOLEAN.

**IMPACT**: Composite types (typography, shadow) MUST use Styles instead of Variables.

| Token Type | Figma Target | Reason |
|-----------|-------------|--------|
| `color` | Variable (COLOR) | Simple value |
| `dimension` | Variable (FLOAT) | Simple value |
| `typography` | **TextStyle** | Composite (family + size + weight + ...) |
| `shadow` | **EffectStyle** | Composite (color + offset + blur + ...) |

### 📦 Constraint 3: Nested Reference Resolution Order

**WHY**: References must resolve in dependency order.

**IMPACT**: Topological sort required to handle chains like:
```
A → B → C → D (must resolve D first, then C, then B, then A)
```

**SOLUTION**: `TokenResolver.resolveAllTokens()` uses topological sort.

### 🔄 Constraint 4: Metadata Synchronization

**WHY**: Tokens need to know their Figma IDs for updates.

**IMPACT**: Two-way metadata flow required:
1. Token → Figma: Create objects
2. Figma → Token: Store IDs in `token.extensions.figma`
3. Token → Figma: Update using stored IDs

### ⚡ Constraint 5: Performance

**WHY**: Large token sets (1000+ tokens) need fast lookups.

**IMPACT**:
- TokenRepository uses **5 indexes** for O(1) lookups
- TokenResolver uses **3-tier caching** for 98% cache hit rate
- FigmaSyncService batches Figma API calls

---

## Summary: Abstraction Management

**Question**: *"How is currently managed the abstract levels? Variables? tokens? And how those two communicate?"*

**Answer**:

1. **Token Layer** (Universal):
   - `Token` model: Platform-agnostic representation
   - `TokenRepository`: In-memory storage with O(1) indexed queries
   - `TokenResolver`: Alias resolution with multi-tier caching

2. **Translation Layer** (Bridge):
   - `FigmaSyncService`: Converts Token → Figma objects
   - Type mapping: Token.type → Figma type
   - Value conversion: Token format → Figma format
   - Metadata flow: Bidirectional ID storage

3. **Figma Layer** (Platform):
   - `Variable`: Simple types (color, dimension, etc.)
   - `TextStyle`: Typography tokens
   - `EffectStyle`: Shadow tokens

4. **Communication**:
   - One-way: Token → Figma (value translation)
   - Bidirectional: Token ↔ Figma (metadata sync)
   - Nested: Composite tokens require recursive reference resolution

**Visual Summary**:
```
┌──────────────────┐
│   JSON Files     │  (Source)
└────────┬─────────┘
         │ Parse
         ↓
┌──────────────────┐
│  Token[] Model   │  (Universal abstraction)
│  ┌─────────────┐ │
│  │ Repository  │ │  (Storage + Indexes)
│  │ Resolver    │ │  (Alias resolution)
│  └─────────────┘ │
└────────┬─────────┘
         │ Sync
         ↓
┌──────────────────┐
│ FigmaSyncService │  (Translation layer)
│  ┌─────────────┐ │
│  │ Type Map    │ │  (Token type → Figma type)
│  │ Value Conv  │ │  (Token value → Figma format)
│  │ Nested Res  │ │  (Composite token resolution)
│  └─────────────┘ │
└────────┬─────────┘
         │ Create/Update
         ↓
┌──────────────────┐
│  Figma Plugin    │  (Platform API)
│  ┌─────────────┐ │
│  │ Variables   │ │  (Simple types)
│  │ TextStyles  │ │  (Typography)
│  │ EffectStyles│ │  (Shadows)
│  └─────────────┘ │
└──────────────────┘
```

**Key Files**:
- `src/core/models/Token.ts` - Universal model
- `src/core/services/TokenRepository.ts` - Storage layer
- `src/core/services/TokenResolver.ts` - Resolution layer
- `src/core/services/FigmaSyncService.ts` - Translation layer

---

**Version**: 1.0
**Date**: 2025-11-16
**Related**: FLOW_ANALYSIS.md, IMPROVEMENT_PLAN.md
