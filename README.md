# Cumin 🌿

`cumin` is the infrastructure and state management layer of the ChRIS interface ecosystem. It is a Node.js backend library that handles the "dirty work" of connecting to ChRIS, managing authentication tokens, and persisting user sessions.

## Abstract

`cumin` abstracts the ChRIS REST API into a stateful, object-oriented environment. It is responsible for:
1.  **Connection Management**: Handling authentication, token storage, and client initialization.
2.  **Context Persistence**: Implementing the "Context" engine that remembers the active User, CUBE URL, and Working Directory across sessions.
3.  **Resource Factories**: Providing the `objContext_create` factory that dynamically resolves API resources (like "Plugins" or "Files") based on the current context.

## Role in the Ecosystem

In the "Sandwich Model" architecture, `cumin` is the bottom layer (just above the raw API client).

-   **Consumers**: It is primarily consumed by [`salsa`](../salsa/README.md) (to execute logic) and [`chili`](../chili/README.md) (to manage CLI state).
-   **Environment**: It is designed for Node.js environments (relying on the local filesystem for state persistence).

## Core Features

-   **`ChrisContext`**: The state machine for multi-tenant, multi-backend sessions.
-   **`ChRISConnection`**: Wrapper for the low-level API client.
-   **`keypair.ts`**: The parser for "Searchable" strings (e.g., `name:demo, version:1.0`).

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
