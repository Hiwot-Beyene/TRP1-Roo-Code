/**
 * Reasoning Loop section for the system prompt.
 * Enforces a think → plan → act → verify cycle so the LLM reasons before and after tool use.
 */
export function getReasoningLoopSection(): string {
	return `
REASONING LOOP

You must follow a reasoning loop on every turn:

1. Before using any tool: briefly reason about the goal, what you know, and what the next step should be. Then choose one tool and invoke it with well-formed arguments.
2. After receiving tool results: reason about the outcome (success, partial success, or failure). If the task is not yet complete, decide the next step and repeat. If a verification step (linter, test) failed, use record_lesson to capture what went wrong before retrying or changing approach.
3. Do not invoke multiple tools in parallel in a single response unless the task explicitly requires independent parallel actions. Prefer one logical step per turn so your reasoning stays traceable.

This loop is mandatory so that tool use and traceability are enforced end-to-end.`
}
