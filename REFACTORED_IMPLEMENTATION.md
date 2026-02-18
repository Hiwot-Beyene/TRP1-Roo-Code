# Refactored Implementation Summary

## Design Decisions

- **Hook Engine as facade:** `HookEngine.ts` exposes the same API as before (`hookEngine.preSelectActiveIntent`, `preWriteFile`, `postWriteFile`, etc.) and delegates to `HookManager`. All tools keep importing from `hooks/HookEngine`; no call-site changes.
- **HookManager as orchestrator:** Holds task state (active intent ID, read-hash map) and delegates intent context to `ContextLayer`, write gate to `IntentPipeline`, trace append to `CorrelationService`. Single place for hook implementation.
- **Context layer:** `getIntentContext(cwd, intentId)` reads active_intents, finds intent, returns `{ allowed, message?, injectedContext? }`. `buildIntentContextXml(intent)` produces the XML block. Curated single-intent only.
- **Correlation service:** `appendWriteTrace(input)` builds an `AgentTraceRecord` (intent_id, mutation_class, content_hash in ranges, related spec) and appends one line to agent_trace.jsonl. Deterministic content hash via `contentHashPrefix`.
- **Intent pipeline:** `validateIntentForWrite(task, relPath, args)` runs the write gate: intent present, intent in catalog, path not in .intentignore, path in owned_scope, and optimistic lock (current file hash vs task read-hash). Returns `{ allowed, message? }`.
- **Lifecycle types:** `HookLifecycle.ts` defines `HookPhase`, `HookContract<TIn, TOut>`, and Pre/Post input-output types. Prepares for a future hook registry without changing current call flow.

## Key Files (Excerpts)

### HookEngine.ts (facade)

```ts
import { hookManager } from "./HookManager"
export const hookEngine = {
	preSelectActiveIntent: (cwd, intentId) => hookManager.preSelectActiveIntent(cwd, intentId),
	preWriteFile: (task, relPath, args) => hookManager.preWriteFile(task, relPath, args),
	postWriteFile: (task, relPath, content, opts) => hookManager.postWriteFile(task, relPath, content, opts),
	recordLesson: (task, lesson) => hookManager.recordLesson(task, lesson),
	classifyCommand: (cmd) => hookManager.classifyCommand(cmd),
	requestHITLForIntentEvolution: (msg) => hookManager.requestHITLForIntentEvolution(msg),
}
export { getActiveIntentId, setActiveIntentId, setReadHash, getReadHash } from "./HookManager"
```

### HookManager.ts (state + delegation)

- Exposes `getActiveIntentId`, `setActiveIntentId`, `setReadHash`, `getReadHash` (task-scoped state).
- `preSelectActiveIntent(cwd, intentId)` → `getIntentContext(cwd, intentId)` from ContextLayer.
- `preWriteFile(task, relPath, args)` → `validateIntentForWrite(task, relPath, args)` from IntentPipeline.
- `postWriteFile(task, relPath, content, opts)` → `appendWriteTrace({ cwd, relPath, content, ...opts })` from CorrelationService.
- `recordLesson(task, lesson)` → `appendClaudeLesson(task.cwd, lesson)` from orchestration-io.

### context/ContextLayer.ts

- `getIntentContext(cwd, intentId)`: if no .orchestration, return allowed; else read active_intents, findIntentById; if missing return not allowed; else return allowed + `buildIntentContextXml(intent)`.
- `buildIntentContextXml(intent)`: single XML block with intent_id, name, status, owned_scope, constraints, acceptance_criteria.

### correlation/CorrelationService.ts

- `appendWriteTrace(input)`: build AgentTraceRecord (id, timestamp, vcs.revision_id, intent_id, mutation_class, files[].relative_path, conversations[].ranges[].content_hash, related specification). Append one JSON line to agent_trace.jsonl via orchestration-io.

### pipeline/IntentPipeline.ts

- `validateIntentForWrite(task, relPath, args)`: orchestration exists? intent_id (from args or task)? intent in catalog? relPath not in .intentignore? relPath in intent.owned_scope? current file hash === task read-hash (or new file)? Return allowed or message.

### lifecycle/HookLifecycle.ts

- `HookPhase`: PreTool | PostTool.
- `HookContract<TIn, TOut>`: phase, toolName, run(input).
- PreHookInput/Output, PostHookInput/Output types for future registry.

## Extension and Agent Flow (Unchanged)

- `extension.ts` activates the provider. No orchestration logic.
- Agent = Task + presentAssistantMessage + tools. presentAssistantMessage switches on block.name and calls tool.handle(). Tools that need orchestration call hookEngine.\* before/after their effect. No hook logic inside the switch.

## Observability

- No dedicated logging module in this refactor. Trace is the observability artifact: every orchestrated write is one line in agent_trace.jsonl with intent_id, mutation_class, content_hash. Failures are returned as PreHookResult.message and pushed as tool results to the conversation.
