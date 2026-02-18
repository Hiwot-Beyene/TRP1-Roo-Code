# TRP1 Week 1: Step-by-Step Testing Guide

Follow this guide to verify the implementation against the Proof of Execution (Demo) and Evaluation Rubric.

---

## Prerequisites

- Repository cloned, `pnpm install` done.
- VS Code with the Roo Code extension (build from this repo: `pnpm build` then Run/Debug "Extension", or `pnpm vsix` and install the VSIX).
- Workspace root = project root (where `.orchestration/` will live).

---

## 1. Setup

1. **Ensure `.orchestration/` exists** in the workspace root with:
    - `active_intents.yaml` (see repo root `.orchestration/active_intents.yaml` for sample).
    - Empty or sample `intent_map.md` and `CLAUDE.md`.
2. **Optional:** Add `.intentignore` in the workspace root with path patterns (one per line) that should be excluded from any intent’s scope for testing guardrails.
3. Open the Roo Code chat panel.

**Verify:** Listing the workspace shows `.orchestration/active_intents.yaml`.

---

## 2. Intent Protocol and select_active_intent

1. In chat, ask: _"What intents are available? Use select_active_intent for INT-001."_
2. **Expected:** The model calls `select_active_intent` with `intent_id: "INT-001"`. The tool returns an XML block `<intent_context>` with name, status, owned_scope, constraints, acceptance_criteria.
3. **Verify:** No error; the reply includes the injected context.

**Then:** Ask to write a file **inside** scope (e.g. "Create src/hello.ts with export function hello() { return 'hi' } for INT-001"). The agent should be able to call `write_to_file` with `path`, `content`, and optionally `intent_id: "INT-001"`, `mutation_class: "INTENT_EVOLUTION"`.

**Verify:** File is created and `.orchestration/agent_trace.jsonl` has a new line with that file, intent_id, mutation_class, and a content_hash in ranges.

---

## 3. Trace Updates (Intent–AST Correlation)

1. Ask the agent to refactor the file just created (e.g. rename the function or add a comment) and to use `mutation_class: "AST_REFACTOR"` and the same intent_id.
2. **Verify:** After the write:
    - `.orchestration/agent_trace.jsonl` has another record.
    - The record has `mutation_class: "AST_REFACTOR"`, the same `intent_id`, and a **content_hash** for the modified range/content.
3. Open `agent_trace.jsonl` and confirm:
    - `files[].conversations[].ranges[].content_hash` is present.
    - `related` contains the intent/spec ID.

---

## 4. Guardrails

### 4.1 Write without intent

1. Start a **new** chat (or new task) so there is no active intent.
2. Ask: _"Write to src/other.ts with content 'test'."_ Do **not** ask the agent to call select_active_intent first.
3. **Expected:** Pre-Hook blocks the write. Tool result message should say you must cite a valid active Intent ID and call select_active_intent first.

### 4.2 Scope violation

1. Select an intent whose `owned_scope` does **not** include `docs/` (e.g. INT-001 with scope `src/**`, `*.ts`).
2. Ask: _"Create docs/out-of-scope.md with content 'nope'."_
3. **Expected:** Pre-Hook blocks with a scope violation message (e.g. "INT-001 is not authorized to edit [docs/out-of-scope.md]. Request scope expansion.").

### 4.3 .intentignore (if used)

1. Add a path to `.intentignore` that would otherwise be in scope (e.g. `src/ignored.txt`).
2. Select INT-001 and ask to write `src/ignored.txt`.
3. **Expected:** Pre-Hook blocks with a message about `.intentignore` or scope.

---

## 5. Parallel Orchestration (Two Agents)

1. Open two chat panels (e.g. split or two composer instances).
2. **Panel A:** _"You are the Architect. Read .orchestration/intent_map.md and active_intents.yaml and summarize what INT-001 needs."_
3. **Panel B:** _"You are the Builder. First call select_active_intent(INT-001), then add a new file under src/ for INT-001."_
4. **Verify:**
    - Panel B only writes after select_active_intent and writes within scope.
    - After Panel B writes, `agent_trace.jsonl` grows and Panel A can still read intent_map and CLAUDE.md (shared brain).

Optional: Have Panel B run a linter/test; if you implemented "lesson recording" on failure, a failure should append to `CLAUDE.md`.

---

## 6. Optimistic Locking (Stale File)

1. Select INT-001 and ask the agent to read a file in scope (e.g. `src/hello.ts`) and then **edit it**.
2. **Before** the agent sends the write: manually change that file on disk (e.g. add a line in another editor).
3. Let the agent send the write.
4. **Expected:** Pre-Hook compares current file hash to the hash at read time; if different, it blocks with a "Stale File" message and asks the agent to re-read.

(If the agent only writes without a prior read in the same turn, the read-hash may not be set; then this check only applies when the agent had previously read the file in the same session/task and we stored the hash.)

---

## 7. Verification Checklist (Rubric)

| Metric                     | How to verify                                                                                                            |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Intent–AST correlation** | agent_trace.jsonl has intent_id, content_hash, mutation_class (AST_REFACTOR vs INTENT_EVOLUTION).                        |
| **Context engineering**    | select_active_intent returns constraints/scope; agent cannot write without selecting intent when .orchestration/ exists. |
| **Hook architecture**      | Logic in `src/hooks/`; WriteToFileTool and SelectActiveIntentTool call hookEngine; no orchestration logic in UI.         |
| **Parallel orchestration** | Two panels; both use same .orchestration/; trace and CLAUDE.md shared; scope and intent enforced.                        |

---

## 8. Build and Run

- **Typecheck:** `pnpm run check-types` (from repo root).
- **Build extension:** `pnpm build` then Run/Debug "Extension" in VS Code, or `pnpm vsix` and install the VSIX.
- **Lint:** `pnpm lint` if needed.

If any step fails, check:

- `.orchestration/active_intents.yaml` exists and has at least one intent with `owned_scope`.
- No typo in intent_id (e.g. INT-001 vs INT001).
- Paths in scope use globs that match your files (e.g. `src/**` for `src/hello.ts`).
