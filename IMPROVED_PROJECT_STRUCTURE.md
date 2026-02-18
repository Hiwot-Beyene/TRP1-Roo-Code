# Improved Project Structure

## Directory Tree (Orchestration & Hooks)

```
src/
├── extension.ts                    # Entry; activates provider
├── core/
│   ├── assistant-message/
│   │   └── presentAssistantMessage.ts   # Tool dispatch loop; no hook logic
│   ├── task/
│   │   └── Task.ts                      # Conversation state; cwd; no orchestration
│   ├── prompts/
│   │   ├── system.ts                    # System prompt; includes intent protocol section
│   │   └── sections/
│   │       └── intent-protocol.ts       # Intent-driven protocol text
│   └── tools/
│       ├── BaseTool.ts
│       ├── SelectActiveIntentTool.ts    # Calls hookEngine.preSelectActiveIntent
│       ├── WriteToFileTool.ts           # Calls hookEngine.preWriteFile, postWriteFile
│       ├── RecordLessonTool.ts          # Calls hookEngine.recordLesson
│       └── ...
├── hooks/                               # Middleware layer (isolated)
│   ├── index.ts                         # Public API
│   ├── HookEngine.ts                    # Facade; delegates to HookManager
│   ├── HookManager.ts                   # Orchestrates context, pipeline, correlation
│   ├── orchestration-types.ts           # ActiveIntent, AgentTraceRecord, MutationClass
│   ├── orchestration-io.ts              # Read/write .orchestration/* and .intentignore
│   ├── content-hash.ts                  # SHA-256 content hash (deterministic)
│   ├── scope-match.ts                   # Path vs glob patterns
│   ├── command-classify.ts              # Safe vs destructive command
│   ├── lifecycle/
│   │   └── HookLifecycle.ts             # HookPhase, HookContract, I/O types
│   ├── context/
│   │   └── ContextLayer.ts              # getIntentContext, buildIntentContextXml
│   ├── correlation/
│   │   └── CorrelationService.ts        # appendWriteTrace (intent → content_hash)
│   └── pipeline/
│       └── IntentPipeline.ts            # validateIntentForWrite (gate)
├── shared/
│   └── tools.ts                         # NativeToolArgs, ToolUse, tool names
└── ...

.orchestration/                           # Workspace sidecar (machine-managed)
├── active_intents.yaml                  # Intent catalog (context DB source)
├── agent_trace.jsonl                    # Append-only trace ledger
├── intent_map.md                        # Human-readable intent → files
└── CLAUDE.md                            # Shared brain (lessons)

.intentignore                            # Optional; deny-list path patterns
```

## Explanations

| Path                        | Responsibility                                                                                                             |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **hooks/**                  | Middleware only. No UI; no tool execution. Single dependency direction: tools → hooks.                                     |
| **hooks/HookEngine.ts**     | Public API used by tools. Thin facade over HookManager so existing imports remain valid.                                   |
| **hooks/HookManager.ts**    | Implementation: pre/post hooks, task state (active intent, read-hash), delegation to context/correlation/pipeline.         |
| **hooks/lifecycle/**        | Defines HookPhase (Pre/Post), HookContract, and input/output types for hook handlers. Enables future registry-based hooks. |
| **hooks/context/**          | Context enrichment. Reads active_intents, builds single-intent XML. No full dump.                                          |
| **hooks/correlation/**      | Writes AgentTraceRecord to agent_trace.jsonl. Intent ID and content_hash per write.                                        |
| **hooks/pipeline/**         | Write gate: validate intent, scope, .intentignore, optimistic lock. Used by HookManager.preWriteFile.                      |
| **orchestration-io**        | File I/O for .orchestration/\* and .intentignore. Single place for paths and read/write.                                   |
| **content-hash**            | Deterministic SHA-256 prefix for spatial independence in trace.                                                            |
| **scope-match**             | Path vs glob (owned_scope, .intentignore). Pure function.                                                                  |
| **core/tools/\***           | Call hookEngine only; no direct orchestration-io or correlation.                                                           |
| **presentAssistantMessage** | Dispatches by tool name; no hook logic.                                                                                    |
| **.orchestration/**         | Persistence for intent catalog, trace, intent map, shared brain.                                                           |

## Dependency Rules

- `core/*` may depend on `hooks` (via HookEngine). `hooks` must not depend on `core/assistant-message` or `core/webview`.
- `hooks` may depend on `core/task` only for the Task type and cwd; no dependency on prompt building or UI.
- Within `hooks`: HookManager uses context, correlation, pipeline, orchestration-io, command-classify. Context and pipeline use orchestration-io and scope-match. Correlation uses orchestration-io and content-hash.
