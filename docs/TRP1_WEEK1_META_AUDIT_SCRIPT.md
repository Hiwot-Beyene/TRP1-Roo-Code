# TRP1 Week 1: Meta-Audit Video Script / Demo Steps

Use this for the 5-minute demo video (Proof of Execution). Each step can be narrated or shown on screen.

---

## 1. Setup (≈45 s)

1. Open a **fresh workspace** (or a folder with no `.orchestration/` yet).
2. Create or confirm `.orchestration/` with:
    - **active_intents.yaml** – at least one intent, e.g. `INT-001: Build Weather API` with `owned_scope: ["src/**", "*.ts"]`, constraints, acceptance_criteria.
    - Optionally **intent_map.md** and **CLAUDE.md** (can be empty initially).
3. Ensure the Roo Code extension is installed and the chat panel is open.

**Script:** "We start with a workspace that has an orchestration sidecar: active_intents.yaml defines INT-001 for building a Weather API, with scope and constraints."

---

## 2. Parallel “Master Thinker” Workflow (≈1 min)

1. Open **two** chat panels (e.g. split view or two composer instances if the UI allows).
2. **Agent A (Architect):** In one panel, say: "Review the intent map and list what we need for INT-001." Show that the agent can read `.orchestration/intent_map.md` and `active_intents.yaml` and describe the plan.
3. **Agent B (Builder):** In the other panel, say: "Implement INT-001: add a simple weather API in src/." Show that the agent first calls **select_active_intent(INT-001)**, receives the injected context, then uses **write_to_file** with `intent_id` and `mutation_class`.

**Script:** "We run two agents in parallel: one acts as Architect and consults the intent map; the other is the Builder and must select INT-001 before writing any code."

---

## 3. The Trace (≈1 min)

1. After Agent B writes or refactors a file (e.g. `src/weather.ts`), open **.orchestration/agent_trace.jsonl**.
2. Show the **latest line**: it should contain:
    - `intent_id` (e.g. INT-001)
    - `mutation_class` (AST_REFACTOR or INTENT_EVOLUTION)
    - `files[].conversations[].ranges[].content_hash` (sha256 prefix)
    - `related` with the spec/intent ID.
3. Emphasize: "Every write is logged with content hash and intent ID so we get intent–AST correlation."

**Script:** "After a refactor, we open agent_trace.jsonl. Each record links the modified file to the intent and includes a content hash for spatial independence."

---

## 4. The Guardrails (≈1 min)

1. **No intent ID:** In a new turn, ask the agent to "Create src/foo.ts with content 'x'" **without** calling select_active_intent. Show that the **Pre-Hook blocks** the write and returns: "You must cite a valid active Intent ID..."
2. **Scope violation:** Select INT-001 (scope e.g. `src/**`), then ask to write a file **outside** scope (e.g. `docs/out-of-scope.md`). Show the Pre-Hook block: "Scope Violation: INT-001 is not authorized to edit [docs/out-of-scope.md]."
3. **Destructive command (optional):** Ask the agent to run `rm -rf /tmp/something`; show that the command is classified and that approval is required (existing Roo behavior; optional extra HITL can be mentioned if implemented).

**Script:** "Guardrails: writing without an intent is blocked; writing outside the intent’s scope is blocked; the trace and shared CLAUDE.md support the parallel workflow."

---

## 5. Wrap-up (≈30 s)

- Summarize: **Intent–code traceability** via agent_trace.jsonl, **context engineering** via select_active_intent and injected context, **hook architecture** as middleware, and **parallel orchestration** with two agents and shared state.
- Point to ARCHITECTURE_NOTES.md and the `src/hooks/` directory for implementation details.

**Script:** "We’ve shown the full loop: intent selection, scoped writes, trace updates, and guardrails. The implementation lives in src/hooks and the .orchestration sidecar."
