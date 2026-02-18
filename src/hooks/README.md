# Hooks: Intent and governance middleware

The hook layer sits between the agent’s tool calls and execution. It enforces intent selection, scope, traceability, and governance when `.orchestration/` exists.

## Interception contract

- **All mutating tools go through the hook.** There is no code path that performs a write without calling the hook.
- **Pre-hook:** Runs before the tool’s side effect. If it returns `allowed: false`, the tool aborts and returns the hook message to the agent; the side effect does not run.
- **Post-hook:** Runs after a successful side effect (e.g. trace append). Best-effort only; post-hook failure does not change the tool’s reported success.

Flow: `Tool.handle() → tool.execute() → preHook (must pass) → operation → postHook`.

## Responsibilities

| Component              | Responsibility                                                                                                                         |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **HookEngine**         | Public API. Single entry point for tools; delegates to HookManager.                                                                    |
| **HookManager**        | Orchestrator. Composes ContextLayer, IntentPipeline, CorrelationService; no direct I/O from tools.                                     |
| **ContextLayer**       | Intent context: reads `active_intents.yaml`, validates intent ID, returns single-intent XML (scope, constraints, acceptance criteria). |
| **IntentPipeline**     | Write gate: when `.orchestration/` exists, validates intent_id, scope, .intentignore, optimistic read-hash before allowing write.      |
| **CorrelationService** | Trace: appends write records to `agent_trace.jsonl` for intent–code traceability.                                                      |

## Tool wiring

- `select_active_intent`: calls `hookEngine.preSelectActiveIntent(cwd, intentId)`; on success, sets active intent on task and returns injected context.
- `write_to_file`: calls `hookEngine.preWriteFile(task, relPath, args)` before any write; on allow, performs write then `hookEngine.postWriteFile(...)` for trace.
- `record_lesson`: calls `hookEngine.recordLesson(task, lesson)` to append to CLAUDE.md.

Types: `orchestration-types.ts` (ActiveIntent, MutationClass, etc.); `HookLifecycle.ts` (PreHookInput/Output, PostHookInput/Output). HookManager uses PreHookResult/PostHookResult for tool-facing results.
