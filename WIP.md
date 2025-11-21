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

## Completed Tasks
-   [x] Define `IStorageProvider` interface.
-   [x] Implement `NodeStorageProvider`.
-   [x] Refactor `ConnectionConfig` & `SessionConfig` to use storage provider.
-   [x] Refactor `ChRISConnection` (async, storage, RPN).
-   [x] Refactor `ChrisContext` (async, storage, JSDoc).
-   [x] Refactor `ChrisIO` (async, storage, RPN).
-   [x] Update `chili` entry point.
-   [x] Fix compilation errors in `cumin` and `chili`.
-   [x] Verify `cumin` tests pass.

## Next Steps / To-Do
1.  **Complete Style Guide Enforcement:** Review remaining files in `cumin` (e.g., `utils/`, `error/`) and all of `chili` to ensure full compliance with RPN naming and JSDoc requirements.
2.  **Browser Storage Provider:** Create a `BrowserStorageProvider` (implementing `IStorageProvider`) using `localStorage` or `IndexedDB` for the web UI.
3.  **Chili Logic Extraction:** Further separate CLI-specific logic (presentation) from business logic in `chili` handlers to maximize code sharing with the browser.
4.  **Build Pipeline:** Ensure `tsc` build outputs correct types and module formats for both Node.js and browser consumption.
