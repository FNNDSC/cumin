```
  ____                _
 / ___|   _ ___  ____(_)_ __
| |  | | | | '_ \| '_ \| '_ \
| |__| |_| | | | | | | | | | |
 \____\__,_|_| |_|_| |_|_| |_|
```
**Cumin Underpins Management Infrastructure Needs**

`cumin` is the infrastructure and state management layer of the ChRIS interface ecosystem. It is a backend library that handles the "dirty work" of connecting to ChRIS, managing authentication tokens, and persisting user sessions.

## Installation

```bash
npm install @fnndsc/cumin
```

Requires Node.js ≥ 20.12. Ships with TypeScript type definitions.

## Usage

```typescript
import { ChRISConnection, ChrisContext, ChrisIO } from "@fnndsc/cumin";

// The context engine remembers the active user, CUBE URL, and working directory
const context = new ChrisContext();
await context.init();
const cubeURL: string | null = await context.ChRISURL_get();
```

See [Core Features](#core-features) for the full API surface.

## Abstract

`cumin` abstracts the ChRIS REST API into a stateful, object-oriented environment. It is responsible for:
1.  **Connection Management**: Handling authentication, token storage, and client initialization.
2.  **Context Persistence**: Implementing the "Context" engine that remembers the active User, CUBE URL, and Working Directory.
3.  **IO & Storage**: Providing an abstraction (`IStorageProvider`) for filesystem access, enabling support for both Node.js (via `fs`) and other environments.

## Role in the Ecosystem

In the "Sandwich Model" architecture, `cumin` is the bottom layer (just above the raw API client).

-   **Consumers**: Primarily [`salsa`](https://github.com/FNNDSC/salsa) (logic) and [`chili`](https://github.com/FNNDSC/chili) (CLI state).
-   **Environment**: Designed for Node.js but architected with interfaces to support browser environments.

## Core Features

-   **`ChrisContext`**: The state machine for multi-tenant, multi-backend sessions.
-   **`ChRISConnection`**: Wrapper for the low-level API client.
-   **`IStorageProvider`**: Abstraction interface for reading/writing config and data.
    -   Includes `readBinary` for binary file uploads.
    -   Includes recursive directory traversal helpers.
-   **`ChrisIO`**: High-level IO operations, including recursive directory uploading (`uploadLocalPath`).
-   **`ChRISResource.resources_getAll()`**: Generic pagination handler.
-   **`ListCache`** (`listCache_get()`): Session-scoped directory listing cache for the VFS.
-   **`ProcCache`** (`procCache_get()`): Session-scoped job monitoring cache. Stores all visible plugin instances as a DAG (two flat maps: `instances` keyed by ID, `children`/`feedRoots` for tree traversal). Structure is permanent once built; only non-terminal instance statuses are refreshed on read. Powers the `/proc/feeds/` VFS provider in salsa.

## Developer Setup

To build the `cumin` library from source:

1.  **Install dependencies:**
    ```bash
    npm install
    ```

2.  **Compile:**
    ```bash
    npm run build
    ```

## License

MIT — part of the [ChRIS Project](https://chrisproject.org).

---
_-30-_