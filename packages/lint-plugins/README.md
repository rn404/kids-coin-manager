# @workspace/lint-plugins

Custom lint rules for the workspace.

## Rules

### explicit-boolean-comparison

Enforces explicit boolean comparisons instead of using negation operators (`!` and `!!`).

**Policy:**

- All `!` and `!!` operators are detected and reported as errors
- Single negation (`!`): reported as 1 violation
- Double negation (`!!`): reported as 1 violation
- Use `deno-lint-ignore` for exceptions where negation is necessary

**❌ Bad:**

```typescript
if (!foo) {}
const bar = !!baz // Detected twice (double negation)
while (!success) {}
```

**✅ Good:**

```typescript
if (foo === null) {}
if (foo === false) {}
const bar = baz !== null
while (success === false) {}
```

**Exception (when necessary):**

```typescript
// deno-lint-ignore internal/explicit-boolean-comparison
if (!complexCondition) {}
```

### import-order

Enforces a consistent import ordering within each file.

**Rules:**

1. All import statements must form a contiguous block at the top of the file — no non-import statements between them.
2. `import type` statements must come before `import` (value) statements.
3. Within each block (`import type` / `import`), the sub-order is:
   - bare specifiers (e.g. `fresh`, `@preact/signals`)
   - `jsr:` imports
   - `npm:` imports
   - `https://` imports
   - `@workspace/*` (internal monorepo packages)
   - `../` (relative, parent directory)
   - `./` (relative, same directory)

**✅ Good:**

```typescript
import type { A } from 'external-lib'
import type { B } from '@workspace/ui'
import type { C } from '../shared'
import { D } from 'external-lib'
import { E } from '@workspace/ui'
import { F } from '../shared'
import { G } from './local'
```

**❌ Bad:**

```typescript
// value import before type import
import { A } from 'external-lib'
import type { B } from 'external-lib'

// @workspace before 3rd party
import { C } from '@workspace/ui'
import { D } from 'external-lib'

// import after non-import statement
import { E } from 'external-lib'
const x = 1
import { F } from '@workspace/ui'
```

**Exception (when necessary):**

```typescript
// deno-lint-ignore internal/import-order
import 'side-effect-that-must-come-last'
```

### no-default-export

Disallows default exports. Named exports improve refactorability and discoverability.

**❌ Bad:**

```typescript
export default function foo() {}
export default class Bar {}
```

**✅ Good:**

```typescript
function foo() {}
class Bar {}
export { Bar, foo }
```

**Exception (when required by a framework convention):**

```typescript
// deno-lint-ignore internal/no-default-export
export default plugin
```

### no-inline-export

Disallows inline named exports. Declaring first and exporting at the bottom keeps exports predictable and scannable in one place.

**❌ Bad:**

```typescript
export const foo = 42
export type Bar = string
```

**✅ Good:**

```typescript
const foo = 42
type Bar = string
export { foo }
export type { Bar }
```

**Exception (when required by a framework convention):**

```typescript
// deno-lint-ignore internal/no-inline-export
export const handler = ...
```

## Usage

This plugin is automatically enabled in the workspace via `deno.json`:

```json
{
  "lint": {
    "plugins": ["./packages/lint-plugins/mod.ts"],
    "rules": {
      "tags": ["fresh", "recommended"]
    }
  }
}
```

## Testing

Run tests with:

```bash
deno test packages/lint-plugins/
```
