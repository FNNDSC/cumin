# Searchable Test Coverage Summary

## Overview

Complete test coverage for the Searchable class and its integration with ChRIS resource searching.

## Test Files

### 1. `searchable.test.ts` - Unit Tests
**64 tests** covering all aspects of the Searchable class:

#### Static Factory Methods (17 tests)
- `Searchable.from()` - Auto-detection of searchable types
- `Searchable.simple()` - Plain name searchables
- `Searchable.compound()` - Key:value pair searchables
- `Searchable.batch()` - Batch operations with ++ separator

#### Type Checking (3 tests)
- `isSimple()`
- `isCompound()`
- `isBatch()`

#### Conversion Methods (10 tests)
- `toQueryParams()` - Convert to API parameters
- `toBatchSearchables()` - Split batch into individual searchables
- `toNormalizedString()` - Get API-ready format

#### Validation (8 tests)
- `validate()` - Validate searchable format
- Edge cases: empty strings, whitespace, invalid formats

#### Accessors & Serialization (5 tests)
- `raw` - Get original input
- `type` - Get searchable type
- `toString()` - String representation
- `toJSON()` - JSON serialization

#### Edge Cases (9 tests)
- Special characters in plugin names
- Multiple colons in values (URLs)
- Consecutive ++ separators
- Unicode characters
- Very long strings
- Empty values

#### Real-world Use Cases (7 tests)
- Plugin search by name
- Plugin search by ID
- Plugin search by name and version
- Feed search by owner
- File search by pattern
- Batch plugin deletion
- Context URI searchables

#### Backward Compatibility (3 tests)
- Plain string inputs
- Preserves old `pluginString_makeSearchable()` behavior
- Preserves old `++` splitting logic

### 2. `searchable-integration.test.ts` - Integration Tests
**30 tests** verifying integration with refactored code:

#### ChRISPlugin Integration (12 tests)
- `pluginString_makeSearchable()` - Deprecated method still works
- `pluginIDs_resolve()` - Accepts both strings and Searchable objects
- `pluginIDs_getFromSearchable()` - String/object handling

#### Mixed Usage (2 tests)
- String vs Searchable produces same result
- Both normalize to same API call

#### Error Handling (3 tests)
- Empty search results
- Null search results
- API errors

#### Real-world Scenarios (5 tests)
- Search by exact name
- Search by version
- Multiple matches with warning
- Batch components handled individually
- Context URI format

#### Type Safety (3 tests)
- String literal types
- Searchable type
- Union type `string | Searchable`

## Coverage Statistics

### searchable.ts
```
File           | % Stmts | % Branch | % Funcs | % Lines |
---------------|---------|----------|---------|---------|
searchable.ts  |   100   |   100    |   100   |   100   |
```

### Integration Coverage
```
File                    | % Stmts | % Branch | % Funcs | % Lines |
------------------------|---------|----------|---------|---------|
chrisPlugins.ts         |   35    |   42.85  |  33.33  |   35    |
searchable.ts           |   86.04 |   77.77  |  78.94  |   85    |
```

## Test Execution

All tests pass successfully:
```
Test Suites: 7 passed, 7 total
Tests:       166 passed, 166 total
Time:        6.739 s
```

### Searchable-specific tests:
- **Unit tests**: 64 passed
- **Integration tests**: 30 passed
- **Total**: 94 searchable-related tests

## Key Test Scenarios

### 1. Simple Searchables
```typescript
Searchable.from('pl-dircopy')
→ Type: simple
→ Normalized: "name: pl-dircopy"
→ Params: { name: "pl-dircopy" }
```

### 2. Compound Searchables
```typescript
Searchable.from('name:pl-dircopy,version:1.3.2')
→ Type: compound
→ Normalized: "name:pl-dircopy,version:1.3.2"
→ Params: { name: "pl-dircopy", version: "1.3.2" }
```

### 3. Batch Searchables
```typescript
Searchable.from('id:77++id:33++name:pl-test')
→ Type: batch
→ Split into: [Searchable(id:77), Searchable(id:33), Searchable(name:pl-test)]
```

### 4. Backward Compatibility
```typescript
// Old way (still works)
await plugin.pluginIDs_resolve('pl-dircopy');

// New way (explicit)
await plugin.pluginIDs_resolve(Searchable.from('pl-dircopy'));

// Both produce identical results
```

## Test Quality Metrics

- **Comprehensive**: Tests cover all public methods and properties
- **Edge cases**: Tests handle empty strings, whitespace, special characters, Unicode
- **Integration**: Tests verify refactored code works with both string and Searchable inputs
- **Backward compatible**: Tests ensure old code patterns still work
- **Type safe**: Tests verify TypeScript type checking works correctly
- **Real-world**: Tests include actual use cases from plugin, feed, and file operations

## Running the Tests

### Run all searchable tests:
```bash
npm test -- searchable
```

### Run only unit tests:
```bash
npm test -- searchable.test.ts
```

### Run only integration tests:
```bash
npm test -- searchable-integration.test.ts
```

### Run with coverage:
```bash
npm test -- --coverage searchable
```

## Maintenance

When adding new searchable features:

1. Add unit tests to `searchable.test.ts`
2. Add integration tests to `searchable-integration.test.ts`
3. Ensure 100% coverage is maintained on `searchable.ts`
4. Update this document with new test scenarios
