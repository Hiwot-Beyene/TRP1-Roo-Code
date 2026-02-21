# Hook layer: interceptor registry and pluggable pre/post behaviors

This directory implements a **true interceptor/registry pattern**: hooks can be registered and ordered without changing HookManager or host (tool) logic.

## Registry and interfaces

- **`HookRegistry`** (`HookRegistry.ts`): Central registry. Use `registerPreWriteHook(hook, order)` and `registerPostWriteHook(hook, order)` to add behavior. Lower `order` runs first.
- **`IPreWriteHook`** (`hook-types.ts`): Pluggable pre-write interceptor. `execute(task, relPath, args)` returns `{ allowed, message? }`; first hook that returns `allowed: false` blocks the write.
- **`IPostWriteHook`** (`hook-types.ts`): Pluggable post-write interceptor. `execute(task, relPath, content, opts)` runs after the file write (e.g. append to trace).

Host (tools) still call `hookEngine.preWriteFile` / `hookEngine.postWriteFile`; HookManager delegates to `hookRegistry.runPreWriteHooks` / `runPostWriteHooks`. No host or HookManager changes needed to add or reorder hooks.

## Adding a custom hook

```ts
import { hookRegistry } from "./hooks"

hookRegistry.registerPreWriteHook(
	{
		name: "my-gate",
		execute: async (task, relPath, args) => ({ allowed: true }),
	},
	10, // order (default 0)
)
```

Built-in hooks (intent pipeline, trace append) are registered in `default-hooks.ts` at module load.
