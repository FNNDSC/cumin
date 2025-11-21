# Cumin 🌿

`cumin` is a backend utility library that provides a high-level, object-oriented interface for interacting with the ChRIS API. It is designed to run in a Node.js environment and is the data and state management backend for the [`chili`](../chili/README.md) CLI.

## Abstract

`cumin` simplifies interactions with a ChRIS instance by abstracting away the direct complexities of the underlying REST API. It provides object-oriented wrappers for ChRIS resources (like Feeds, Plugins, and Files) and manages connection state, authentication credentials, and local context persistence using the filesystem.

## Role in the Ecosystem

This library is intended to be the "backend" for a client application running in a Node.js environment. It is **not suitable for browser use** due to its direct reliance on the Node.js runtime and filesystem for its operations. The `chili` CLI tool is the primary consumer of this library.

## Core Features

-   Object-oriented wrappers for major ChRIS resources.
-   Handles authentication and session management.
-   Persists connection details and application context to the local filesystem.
-   Provides helper methods for common operations like searching, listing, and resource creation.

### Coding Style

This project adheres to a specific set of TypeScript coding standards outlined in the main style guide. Before contributing, please review the [TypeScript Style Guide](TYPESCRIPT-STYLE-GUIDE.md).

## Developer Setup

To build the `cumin` library from source, follow these steps:

1.  **Install dependencies:**
    ```bash
    npm install
    ```

2.  **Compile the TypeScript code:**
    ```bash
    npm run build
    ```
This will compile the source code from `src/` into the `dist/` directory.

---
_-30-_