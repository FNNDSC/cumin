# TypeScript Style Guide

## Language Version & Configuration
**TypeScript 5.0+** - Use modern TypeScript and ECMAScript (ES2022+) features.
- The `tsconfig.json` file should have `strict: true` enabled to enforce strong type safety.
- Use optional chaining (`?.`), nullish coalescing (`??`), and other modern syntax.

---

## Naming Convention: RPN (Reverse Polish Notation) Style

Functions and methods follow a machine-parsable **`<object>_<method>`** pattern. This places the entity being acted upon before the action, separated by a single underscore.

**Note:** This is a specific convention for this project. It deviates from the broader TypeScript/JavaScript community standard, which typically uses `camelCase` for function names.

### Pattern Breakdown

The pattern can be broken down into four optional components:

`<subject>[Qualifier]_<verb>[Adverb]`

-   **`<object>`** = `<subject>[Qualifier]`
    -   **subject:** The primary noun (e.g., `user`, `site`).
    -   **Qualifier:** An optional descriptor, using camelCase (e.g., `user`'s `Names` -> `userNames`).
-   **`<method>`** = `<verb>[Adverb]`
    -   **verb:** The core action (e.g., `get`, `check`, `calculate`).
    -   **Adverb:** An optional modifier, using PascalCase, that specifies the action (e.g., `check` becomes `checkIsValid`).

### Examples

**Standard TypeScript (verb-noun, camelCase):**
```typescript
function getUserNames(): string[] { ... }
function isLoginValid(): boolean { ... }
function parseUserData(raw: string): Record<string, any> { ... }
```

**Project RPN (object_method):**
```typescript
function userNames_get(): string[] { ... }
function login_checkIsValid(): boolean { ... }
function dataFromUser_parse(raw: string): Record<string, any> { ... }
```

### Rationale

#### 1. Subject-First Thinking & Grouping
Placing the object first makes it clear what is being operated on. It also causes related operations on the same object to cluster together alphabetically in file explorers and IDE outlines, making the API surface of a module highly discoverable.
```typescript
// Automatically groups in an IDE outline
user_create
user_delete
user_get
userPassword_reset
```

#### 2. Machine Parsability
The strict `<object>_<method>` structure, combined with the capitalization convention, makes this naming scheme trivial to parse programmatically. A regex like `^([a-z]+(?:[A-Z][a-z]*)*)_(.*)$` can reliably split any function name into its core `object` and `method` components.

This enables powerful meta-programming and analysis, such as:
-   **Automated Tooling:** Automatically generating documentation, API call graphs, or boilerplate code based on function names.
-   **Custom Linters:** Writing ESLint rules that can enforce this convention with high precision.
-   **Enhanced Code Analysis:** Easily finding every action performed on a specific object type across the entire codebase.

---

## Typing: Pervasive and Explicit

**Every function, method, and variable** must have an explicit type, relying on inference only when the type is trivially obvious from the right-hand side of the assignment. Avoid `any` at all costs.

### Function Signatures
```typescript
// ✓ GOOD: Complete types
function revenueStreams_calculate(
    assumptions: ScenarioAssumptions,
    year: number,
    siteCount: number,
    newSites: number,
): Record<string, number> {
    ...
}

// ✗ BAD: Missing return type and implicit `any` parameters
function revenueStreams_calculate(assumptions, year, siteCount, newSites) {
    ...
}
```

### Local Variables
Type hints on local variables when the type isn't obvious from initialization:

```typescript
// ✓ GOOD: Clear from initialization
const revenueInstall: number = newSites * installFee / 1_000_000;

// ✓ GOOD: Type hint clarifies intent
const projectionsMap: Record<string, ProjectionResult> = {};

// ✗ BAD: Type is `any`
const result = {}; // What type is this?
```

### Collections
Be specific about collection contents. Use `Array<T>` or `T[]`.

```typescript
// ✓ GOOD
function columns_get(): string[] { ... }
function results_map(): Record<string, ProjectionResult> { ... }

// ✗ BAD: Generic types hide information
function columns_get(): any[] { ... }
function results_map(): object { ... }
```

---

## Return Types: Models for Non-Primitives

**Any non-primitive return type should be a defined `interface` or `class`.**

### Use `interface` or `class`

**`interface`** - Default choice for pure data structures.
```typescript
interface ProjectionResult {
    scenario: string;
    columns: string[];
    rows: Array<Record<string, number>>;
}
```

**`class`** - When methods, constructors, or validation logic are needed. For validation, libraries like `class-validator` or `zod` can be used.
```typescript
import { IsString, IsInt, Min, Max } from 'class-validator';

class DatabaseConfig {
    @IsString()
    host: string = 'localhost';

    @IsInt()
    @Min(1024)
    @Max(65535)
    port: number = 5432;

    constructor(partial: Partial<DatabaseConfig> = {}) {
        Object.assign(this, partial);
    }
}
```

### When to Use Each

| Use Case | Model Type | Rationale |
|----------|-----------|-----------|
| Pure data structure | `interface` | Simpler, idiomatic, no runtime overhead |
| Needs methods/logic | `class` | Encapsulates behavior with data |
| Validation needed | `class` + lib | Frameworks like `class-validator` integrate with classes |

### Examples

```typescript
// ✓ GOOD: Defined model
interface FundingRound {
    year: number;
    amount: number;
    label: string;
}

function fundingRounds_get(): FundingRound[] {
    ...
}

// ✗ BAD: Returns unstructured object
function fundingRounds_get(): Array<Record<string, any>> {
    ...
}
```

---

## Method Length: Contextual Refactoring

No hard line limit. Refactor based on **multiple factors**:

1. **Nesting depth** - More than 3 levels suggests extraction.
2. **Responsibility count** - Method doing >1 conceptual task.
3. **Readability** - Can you explain it in one sentence?
4. **Repetition** - Same logic appearing multiple times.

---

## Code Structure Principles

### 1. Explicit Over Implicit
```typescript
// ✓ GOOD: Clear intent
const REVENUE_SCALE_FACTOR = 1_000_000;
const revenueInstall: number = newSites * installFee / REVENUE_SCALE_FACTOR;
const revenueSubscription: number = siteCount * subscriptionFee / REVENUE_SCALE_FACTOR;

// ✗ BAD: Magic number obscured
const revenueInstall = newSites * installFee / 1e6;
```

### 2. One Source of Truth
```typescript
// ✓ GOOD: Configuration drives behavior
const assumptions: ScenarioAssumptions = ...;
const siteCount = siteTrajectory_calculate(assumptions, year);

// ✗ BAD: Hardcoded values
const siteCount = 10 * (1.25 ** year);  // Where did 10 and 1.25 come from?
```

### 3. Type Safety Over Flexibility
Use `unknown` instead of `any` when a type is truly unknown, forcing safe type checking.
```typescript
// ✓ GOOD: Specific types
function results_merge(
    base: ProjectionResult,
    overlay: ProjectionResult
): ProjectionResult {
    ...
}

// ✗ BAD: `any` loses all type safety
function results_merge(base: any, overlay: any): any {
    ...
}
```

---

## Import Organization

Use a tool like ESLint (`eslint-plugin-import`) or Prettier (`@trivago/prettier-plugin-sort-imports` or a similar plugin) to automatically enforce a consistent import order.

**Recommended Order:**
1. Node.js built-ins (`fs`, `path`)
2. Third-party dependencies (`commander`, `chalk`)
3. Local project modules (`../utils/cli.js`)

```typescript
// Node.js built-ins
import fs from 'fs';
import path from 'path';

// Third-party
import { Command } from 'commander';
import chalk from 'chalk';

// Local
import { BaseGroupHandler } from '../handlers/baseGroupHandler.js';
import { ChrisIO } from '@fnndsc/cumin';
```

---

## Documentation

**Documentation Standard: JSDoc**

All exported code (modules, classes, functions, interfaces) must be documented using JSDoc.

### File-Level Docstrings
**Every file** must have a JSDoc block at the top explaining:
- Purpose and scope
- Key components provided
- Usage examples (if applicable)
- Dependencies or assumptions

```typescript
/**
 * @file Projection engine for financial forecasting.
 *
 * This module transforms assumption configurations into multi-year financial projections.
 * It implements deterministic calculations for revenue streams, expenses, and cash flow
 * based on site growth trajectories and funding scenarios.
 *
 * @module
 */
import { ScenarioAssumptions, ProjectionResult } from './models';
...
```

### Function/Method Docstrings
Use **explicit JSDoc** with complete parameter and return documentation:

```typescript
/**
 * Calculate projected site count for a given year based on compound growth.
 *
 * Applies exponential growth from initial pilot site count starting at the pilot
 * start year. Returns zero for years before pilot launch.
 *
 * @param assumptions - Scenario configuration containing pilot_sites parameters.
 * @param year - Target projection year as integer (e.g., 2027).
 * @returns Projected number of active sites as a float.
 *
 * @example
 * ```
 * const assumptions = {
 *   pilotSites: { startYear: 2027, initialSites: 2.0, annualGrowth: 0.25 }
 * };
 * const count = siteTrajectory_calculate(assumptions, 2029);
 * // count will be 3.125
 * ```
 */
function siteTrajectory_calculate(assumptions: ScenarioAssumptions, year: number): number {
    ...
}
```

### Complex Docstring Examples

**With raised exceptions:**
```typescript
/**
 * Loads a financial assumption book from a YAML configuration file.
 *
 * @param path - Filesystem path to the YAML configuration file.
 * @returns An AssumptionBook instance.
 * @throws {Error} If the file is not found or if required keys are missing.
 */
function assumptionBook_load(path: string): AssumptionBook {
    if (!fs.existsSync(path)) {
        throw new Error(`File not found at path: ${path}`);
    }
    ...
}
```

**Interface/Type documentation:**
```typescript
/**
 * Container for multi-year financial projection output.
 *
 * @property scenario - Human-readable scenario name (e.g., "base").
 * @property columns - Ordered list of metric names matching keys in each row dict.
 * @property rows - List of yearly financial snapshots, one object per year.
 */
interface ProjectionResult {
    scenario: string;
    columns: string[];
    rows: Array<Record<string, number>>;
}
```

### Comments
Use sparingly—prefer clear naming. Comments explain **why** unusual decisions were made:

```typescript
// Convert to millions for readability in financial reports.
const revenueInstall: number = newSites * installFee / 1_000_000;

// Phase 1 grants are amortized equally across phase1_years.
// Use Math.max to avoid division by zero if phase1_years is 0.
if (phase1_years > 0 && year < startYear + phase1_years) {
    return phase1_amount / Math.max(phase1_years, 1);
}
```