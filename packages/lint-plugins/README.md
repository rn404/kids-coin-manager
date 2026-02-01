# @workspace/lint-plugins

Custom lint rules for the workspace.

## Rules

### explicit-boolean-comparison

Enforces explicit boolean comparisons instead of using negation operators (`!` and `!!`).

**Policy:**

- All `!` and `!!` operators are detected and reported as errors
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
// deno-lint-ignore explicit-boolean-comparison
if (!complexCondition) {}
```

## Usage

This plugin is automatically enabled in the workspace via `deno.json`:

```json
{
  "lint": {
    "plugins": ["./packages/lint-plugins/mod.ts"],
    "rules": {
      "include": ["explicit-boolean-comparison"]
    }
  }
}
```

## Testing

Run tests with:

```bash
deno test packages/lint-plugins/
```

## Detection

- **Single negation (`!`)**: Detected as 1 violation with message "Use explicit boolean comparisons instead of negation operator (!)"
- **Double negation (`!!`)**: Detected as 1 violation with message "Use explicit boolean comparisons instead of double negation (!!)"
- **No exceptions**: All negations are reported; use `deno-lint-ignore` for intentional cases
