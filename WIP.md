# Work In Progress: Browser Compatibility & Style Refactoring

**Date:** 2025-11-21
**Goal:** Decouple `cumin` from Node.js `fs` for browser compatibility and align with `TYPESCRIPT-STYLE-GUIDE.md` (RPN naming, JSDoc).

## Current State

### Architectural Changes
-   **Storage Abstraction:** Introduced `IStorageProvider` interface in `src/io/io.ts`.
-   **Node Implementation:** Added `NodeStorageProvider` in `src/io/node_io.ts` implementing `IStorageProvider` using `fs`.
-   **Async Core:** Refactored `ConnectionConfig`, `SessionConfig`, `ChRISConnection`, `ChrisContext`, and `ChrisIO` to be asynchronous and use the injected storage provider.
-   **Chili Integration:** Updated `chili/src/index.ts` to initialize `cumin` with `NodeStorageProvider` asynchronously.

### Style Updates (RPN & JSDoc)
-   Applied RPN naming (e.g., `client_get`, `context_set`) and JSDoc to:
    -   `src/connect/chrisConnection.ts`
    -   `src/io/chrisIO.ts`
    -   `src/resources/chrisResources.ts`
    -   `src/resources/chrisResourceGroup.ts`
    -   `src/resources/chrisEmbeddedResourceGroup.ts`
    -   `src/feeds/chrisFeed.ts`
    -   `src/filebrowser/chrisFileBrowser.ts`
    -   `src/filebrowser/chrisFiles.ts`
    -   `src/activities/chrisActivity.ts`
    -   `src/plugins/chrisPlugins.ts`
    -   `src/error/errorStack.ts`
    -   `src/utils/keypair.ts`
    -   `src/config/config.ts`
    -   `src/context/chrisContext.ts`

## Completed Tasks
-   [x] Define `IStorageProvider` interface.
-   [x] Implement `NodeStorageProvider`.
-   [x] Refactor `ConnectionConfig` & `SessionConfig` to use storage provider.
-   [x] Refactor `ChRISConnection` (async, storage, RPN).
-   [x] Refactor `ChrisContext` (async, storage, JSDoc).
-   [x] Refactor `ChrisIO` (async, storage, RPN).
-   [x] Refactor remaining `cumin` files for RPN naming and JSDoc (`utils/keypair.ts`, `error/errorStack.ts`, `config/config.ts`, `context/chrisContext.ts`).
-   [x] Create `BrowserStorageProvider` implementing `IStorageProvider`.
-   [x] Updated `chili` entry point and other `chili` files to use new `cumin` RPN naming.
-   [x] Fix compilation errors in `cumin` and `chili`.
-   [x] Verify `cumin` tests pass.
-   [x] **Complete Style Guide Enforcement:** Reviewed remaining files in `cumin` and `chili` to ensure full compliance with RPN naming and JSDoc requirements.
-   [x] Added Jest test suite for `cumin` (`config.ts`, `keypair.ts`, `errorStack.ts`, `io.ts`).

## Next Steps / To-Do
1.  **Build Pipeline:** Ensure `tsc` build outputs correct types and module formats for both Node.js and browser consumption.
2.  **Resolve Jest fs/promises Mocking in cumin:** Address persistent issues with mocking `fs/promises` in the Jest environment for `NodeStorageProvider` tests.
3.  **Expand cumin Test Coverage:** Add comprehensive unit tests for `chrisConnection.ts`, `chrisContext.ts`, `chrisFeed.ts`, `chrisFileBrowser.ts`, `chrisFiles.ts`, `chrisIO.ts`, `chrisPluginMetaPlugins.ts`, `chrisPlugins.ts`, `chrisEmbeddedResourceGroup.ts`, `chrisObjContext.ts`, `chrisResourceGroup.ts`, and `chrisResources.ts`.
