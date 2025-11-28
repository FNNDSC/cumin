# Cumin 🌿

`cumin` is the infrastructure and state management layer of the ChRIS interface ecosystem. It is a backend library that handles the "dirty work" of connecting to ChRIS, managing authentication tokens, and persisting user sessions.

## Abstract

`cumin` abstracts the ChRIS REST API into a stateful, object-oriented environment. It is responsible for:
1.  **Connection Management**: Handling authentication, token storage, and client initialization.
2.  **Context Persistence**: Implementing the "Context" engine that remembers the active User, CUBE URL, and Working Directory.
3.  **IO & Storage**: Providing an abstraction (`IStorageProvider`) for filesystem access, enabling support for both Node.js (via `fs`) and other environments.

## Role in the Ecosystem

In the "Sandwich Model" architecture, `cumin` is the bottom layer (just above the raw API client).

-   **Consumers**: Primarily [`salsa`](../salsa/README.md) (logic) and [`chili`](../chili/README.md) (CLI state).
-   **Environment**: Designed for Node.js but architected with interfaces to support browser environments.

## Core Features

-   **`ChrisContext`**: The state machine for multi-tenant, multi-backend sessions.
-   **`ChRISConnection`**: Wrapper for the low-level API client.
-   **`IStorageProvider`**: Abstraction interface for reading/writing config and data.
    -   Includes `readBinary` for binary file uploads.
    -   Includes recursive directory traversal helpers.
-   **`ChrisIO`**: High-level IO operations, including recursive directory uploading (`uploadLocalPath`).
-   **`ChRISResource.resources_getAll()`**: Generic pagination handler.

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

---
_-30-_