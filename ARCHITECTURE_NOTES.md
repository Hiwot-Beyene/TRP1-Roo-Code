# Architecture Notes

## System Overview

The extension adds an intent-code traceability and orchestration layer on top of Roo Code. Three layers are enforced: **Webview** (presentation, postMessage only), **Extension Host** (conversation, API, tool dispatch), and **Hook Engine** (middleware: intent validation, scope check, trace append, context injection). The agent is the Task plus the presentAssistantMessage loop and the tools; it does not act on the workspace without going through the tool layer, and mutating tools call the hook before and after the operation. Persistence is file-based under `.orchestration/` (active_intents.yaml, agent_trace.jsonl, intent_map.md, CLAUDE.md). No vector database.

## Core Components

| Component                   | Responsibility                                                                                                                            |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **ClineProvider / Task**    | Conversation state, cwd, API config. Holds active intent ID and read-hash map (set by HookManager).                                       |
| **presentAssistantMessage** | Iterates assistant blocks; dispatches tool_use to tool.handle(). No hook logic.                                                           |
| **HookEngine**              | Public API for hooks. Facade that delegates to HookManager.                                                                               |
| **HookManager**             | Implements pre/post hooks; holds get/set for active intent and read-hash; delegates to ContextLayer, IntentPipeline, CorrelationService.  |
| **ContextLayer**            | getIntentContext(cwd, intentId): read active_intents, find intent, return allowed + injectedContext (XML). buildIntentContextXml(intent). |
| **IntentPipeline**          | validateIntentForWrite(task, relPath, args): intent present, in catalog, path in scope, not in .intentignore, optimistic lock.            |
| **CorrelationService**      | appendWriteTrace(input): build AgentTraceRecord, append to agent_trace.jsonl.                                                             |
| **orchestration-io**        | Paths and read/write for .orchestration/\* and .intentignore.                                                                             |
| **content-hash**            | contentHashPrefix(content): deterministic SHA-256 prefix.                                                                                 |
| **scope-match**             | pathMatchesScope(relPath, patterns): path vs glob patterns.                                                                               |

## Agent Architecture

The agent is not a single process; it is **Task + presentAssistantMessage + tools**. The model receives the system prompt (including the intent protocol when .orchestration/ exists) and conversation history; it emits tool_use blocks. The host runs each block through the corresponding tool’s handle(). Tools that mutate the workspace (select_active_intent, write_to_file, record_lesson) call the hook: pre-hook for validation and context, post-hook for trace and CLAUDE. **Intent flow:** User request → model chooses intent ID → select_active_intent(intent_id) → hook loads context from active_intents → context pushed as tool result → task’s active intent set → write_to_file (with or without explicit intent_id) → preWriteFile checks intent and scope → write → postWriteFile appends trace.

## Hook Lifecycle

1. **Trigger:** Tool invocation (e.g. WriteToFileTool.execute).
2. **Pre phase:** Tool calls hookEngine.preWriteFile(task, relPath, args). HookManager runs validateIntentForWrite (IntentPipeline). Returns { allowed, message? }. If !allowed, tool pushes message and returns; no file write.
3. **Tool action:** If allowed, tool performs diff, approval, file write.
4. **Post phase:** Tool calls hookEngine.postWriteFile(task, relPath, content, opts). HookManager runs appendWriteTrace (CorrelationService). One record appended to agent_trace.jsonl.
5. **Agent notification:** Tool pushes a result string to the conversation (success or error from pre-hook).

Hooks are synchronous and in-process. No event bus; tools call the manager directly.

## Intent Detection Pipeline

**Source:** active_intents.yaml. **Detection:** The model is instructed (system prompt) to analyze the user request and call select_active_intent(intent_id). The hook does not infer intent; it validates that the ID exists. **Steps:** (1) getIntentContext(cwd, intentId); (2) if intent missing, return not allowed; (3) else return allowed + buildIntentContextXml(intent); (4) tool sets active intent on task and pushes context. So the pipeline is: validate ID → load context → inject. The agent “references the context DB” by calling select_active_intent (or by passing intent_id in write_to_file).

## File Correlation Mechanism

**Trace record:** Each write produces one AgentTraceRecord: id, timestamp, vcs.revision_id, intent_id, mutation_class, files[].relative_path, files[].conversations[].ranges[].content_hash, files[].conversations[].related (type "specification", value intent_id). **Content hash:** SHA-256 of the written content (UTF-8), prefix "sha256:" + first 32 hex chars. **Correlation:** To get “code for intent I,” scan agent_trace.jsonl for records where intent_id === I; collect (relative_path, content_hash, mutation_class). Machine-readable only; intent_map.md is a human-readable summary.

## Prompt Builder (System Prompt Construction)

**Location:** The system prompt given to the LLM is built in **`src/core/prompts/system.ts`**. The exported `SYSTEM_PROMPT` async function calls `generatePrompt()`, which concatenates all sections. To enforce the Reasoning Loop or change any instructions given to the model, add or edit section helpers in **`src/core/prompts/sections/`** and include them in `generatePrompt()`. Sections include: role definition, tool use, capabilities, rules, system info, **reasoning loop**, intent protocol (when .orchestration/ exists), objective, and custom instructions. The Task obtains the prompt via `getSystemPrompt()` which calls `SYSTEM_PROMPT(...)`.

## Context Enrichment Strategy

**System prompt:** Includes an intent protocol section: when .orchestration/ exists, the model must call select_active_intent before writing and must pass intent_id and mutation_class in write_to_file. **Injection:** Only the selected intent’s data (id, name, status, owned_scope, constraints, acceptance_criteria) is returned as the tool result of select_active_intent. No full active_intents dump. **CLAUDE.md:** Appended by record_lesson; the model can read_file when it needs shared lessons. Not auto-injected.

## Extension–Agent Communication Model

**Webview ↔ Host:** postMessage only. No file or tool access from Webview. **Host ↔ Model:** Host builds prompt and history, sends to API; model returns blocks. **Host ↔ Tools:** presentAssistantMessage passes (task, block, callbacks) to tool.handle(). **Tools ↔ Hook:** Tools call hookEngine.pre*(...) and hookEngine.post*(...). Hook returns result; tool pushes result to conversation via pushToolResult. No callback from hook to model except through the tool result string.

## Persistence Strategy

**Location:** Workspace root: .orchestration/ (active_intents.yaml, agent_trace.jsonl, intent_map.md, CLAUDE.md), .intentignore (optional). **Read/write:** orchestration-io. HookManager and CorrelationService use it; tools do not. **Concurrency:** Multiple tasks can read and append. appendFile is used for trace and CLAUDE; no file locking. Collision avoidance is by content (optimistic lock on file content), not by locking the trace file.

## Scalability Considerations

**Trace size:** Append-only; query by intent or file is O(n) in lines. For large n, consider indexing or archival. **Intent count:** active_intents is read per pre-hook; file is small. **Parallel panels:** Shared .orchestration/; optimistic locking prevents overwriting the same file when another agent or user changed it. **Context window:** Single-intent injection and optional read of CLAUDE.md keep token growth bounded.

## Risk Mitigation and Behavioral Guarantees

Cross-cutting validation and trace logic is designed so existing workflows are unchanged when orchestration is off, and write success is never reported as failure due to trace/scope/locking implementation details.

1. **No-op when .orchestration/ is absent:** Every hook path checks `orchestrationExists(cwd)` first. When the directory is missing, pre-hooks return `allowed: true` and post-hooks return `success: true` without running intent, scope, or trace logic. No new validation gates or metadata are applied; write_to_file and other tools behave as before.

2. **Trace append is best-effort:** The file write is performed by the tool before postWriteFile runs. If appending to agent_trace.jsonl fails (e.g. disk full, permissions), the failure is caught in HookManager.postWriteFile, logged with `console.warn`, and the hook still returns `success: true`. The user-facing tool result reflects the successful write; the trace record for that write may be missing. Trace does not block or fail the write path.

3. **Scope and locking only when orchestration is enabled:** Intent requirement, owned_scope, .intentignore, and read-hash (optimistic lock) checks run only after `orchestrationExists(cwd)` is true. The stale-file check blocks only when a read-hash was previously set for that path (e.g. same task read-then-write); if no read-hash exists, the write is not blocked. Review and testing should focus on workspaces that have .orchestration/ and active intents; others are unchanged.
