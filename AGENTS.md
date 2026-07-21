<!-- BEGIN:nextjs-agent-rules -->
## 1. Next.js and Framework Rules

* **Use the existing App Router structure:** This project uses the Next.js App Router. Create new pages, layouts, route handlers, and related routing files under the `app/` directory. Do not introduce or migrate to the Pages Router unless explicitly requested.

* **Keep Client Components minimal:** Components in the `app/` directory should remain Server Components by default. Add `'use client'` only to components that require client-side features such as React state, effects, event handlers, browser APIs, or client-only state stores. Keep the client boundary as small as practical rather than converting an entire page or layout into a Client Component.

* **Use state management appropriately:** Use local React state for component-specific UI state. Use Zustand only for client state that must be shared across multiple components or routes, and follow the project's existing state-management patterns. Do not introduce Zustand solely because a component contains an event handler.

* **Verify installed versions before coding:** Before using framework or library APIs, inspect the root `package.json`, the relevant lockfile, and existing project code. Write code that is compatible with the versions actually installed in the project. Do not use newer APIs merely because they are available in the latest documentation.

* **Preserve existing conventions:** Follow the project's current package manager, directory structure, naming conventions, and established implementation patterns unless the task explicitly requires a change.

<!-- END:nextjs-agent-rules -->