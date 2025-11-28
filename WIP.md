# Work In Progress: Cumin - Infrastructure Evolution

**Date:** Today's date (November 28, 2025)
**Goal:** Continue evolving `cumin` as the robust, environment-agnostic infrastructure layer for the ChRIS ecosystem.

## Current State

### Architectural Changes
-   **Enhanced `IStorageProvider`**: The storage abstraction (`IStorageProvider` in `src/io/io.ts`) has been significantly improved to include `readBinary` and `join` methods.
-   **Node.js Binary I/O**: `NodeStorageProvider` (`src/io/node_io.ts`) now fully implements `readBinary`, allowing efficient handling of non-textual files.
-   **`ChrisIO` Local Uploads**: `ChrisIO` (`src/io/chrisIO.ts`) now features `uploadLocalPath` for recursive local file/directory uploads to ChRIS, utilizing the `IStorageProvider`.
-   **Feed Context Fix**: `objContext_create` (`src/resources/chrisObjContext.ts`) has been updated to correctly register and instantiate `ChRISFeedGroup`, resolving previous "Unknown object context type" errors.

### Style & Typing
-   **Pervasive Typing**: Ensured explicit types throughout new and modified code.
-   **RPN Naming**: Consistent application of RPN naming conventions.

## Next Steps / To-Do
1.  **Expand cumin Test Coverage:** Add comprehensive unit tests for `chrisConnection.ts`, `chrisContext.ts`, `chrisFeed.ts`, `chrisFileBrowser.ts`, `chrisFiles.ts`, `chrisIO.ts`, `chrisPluginMetaPlugins.ts`, `chrisPlugins.ts`, `chrisEmbeddedResourceGroup.ts`, `chrisObjContext.ts`, `chrisResourceGroup.ts`, and `chrisResources.ts`.
2.  **Build Pipeline:** Ensure `tsc` build outputs correct types and module formats for both Node.js and browser consumption.
3.  **Resolve Jest fs/promises Mocking in cumin:** Address persistent issues with mocking `fs/promises` in the Jest environment for `NodeStorageProvider` tests.