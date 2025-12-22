# Publishing @d4ia/* packages to npm

This document describes the process of publishing `@d4ia/*` packages to the npm registry using **pnpm**.

## Prerequisites

1. **npm Account** – You must have an account on npmjs.com.
2. **Authorization** – Log in to npm via the terminal:
```bash
npm login
```


3. **npm Organization** – Ensure you have access to the `@d4ia` organization on npm, or create it.

## Packages to be Published

* **@d4ia/proto** – Core protocol package (publish this first).
* **@d4ia/blockchain-bridge** – Blockchain bridge.
* **@d4ia/langchain** – LangChain adapters (depends on `@d4ia/proto`).

---

## Publishing Process

### 1. Preparation

Ensure all packages are built:

```bash
pnpm run build
```

### 2. Publishing Individual Packages

#### Publish @d4ia/proto (first, as others depend on it):

```bash
pnpm run publish:proto
```

#### Publish @d4ia/blockchain-bridge:

```bash
pnpm run publish:blockchain-bridge
```

#### Publish @d4ia/langchain:

```bash
pnpm run publish:langchain
```

### 3. Publishing All Packages at Once

```bash
pnpm run publish:all
```

This will automatically publish the packages in the correct order (proto → blockchain-bridge → langchain).

---

## Verifying the Publication

After publishing, you can check if the packages are available:

```bash
npm view @d4ia/proto
npm view @d4ia/blockchain-bridge
npm view @d4ia/langchain
```

## Installing Published Packages

Once published, other users can install the packages:

```bash
npm install @d4ia/proto
npm install @d4ia/blockchain-bridge
npm install @d4ia/langchain
```

Or all at once:

```bash
npm install @d4ia/proto @d4ia/blockchain-bridge @d4ia/langchain
```