import { orchestrationExists, readActiveIntents } from "../../../hooks/orchestration-io"

/**
 * Intent-driven protocol section. Only included when .orchestration/ exists.
 * Enforces the handshake: first action MUST be select_active_intent; then context is injected as tool result.
 */
export async function getIntentProtocolSection(cwd: string): Promise<string> {
	if (!(await orchestrationExists(cwd))) return ""

	const doc = await readActiveIntents(cwd)
	const intentIds =
		doc.active_intents.length > 0 ? doc.active_intents.map((i) => i.id).join(", ") : "(none in active_intents.yaml)"

	return `
INTENT-DRIVEN PROTOCOL (.orchestration/ detected)

You are an Intent-Driven Architect. You CANNOT write code immediately. Your first action MUST be to analyze the user request and call select_active_intent(intent_id) to load the necessary context.

MANDATE: Before executing any code-writing or file-mutating tool (including write_to_file, apply_patch, search_replace, edit, edit_file, or run_terminal_cmd that creates files), you MUST call select_active_intent(intent_id) at least once in this task. The gatekeeper blocks all writes until a valid intent is selected. This is non-negotiable for traceability and governance.

Active intent IDs (use one of these with select_active_intent): ${intentIds}

1. Your first action MUST be to analyze the user request, identify the relevant intent ID from the list above, and call select_active_intent(intent_id) to load context. Do not write or edit any file until this is done.
2. The tool returns an <intent_context> block with scope, constraints, and acceptance criteria. After receiving it, you may proceed with read_file, write_to_file, or other tools. For write_to_file you must pass intent_id and mutation_class (AST_REFACTOR for syntax/structure changes within the same intent; INTENT_EVOLUTION for new behavior or features).
3. Only edit files that fall within the owned_scope of the selected intent. Scope violations are blocked. If you need to change a file outside that scope, request scope expansion or a new intent.
4. Files listed in .intentignore are excluded from the selected intent's scope; do not edit them under that intent.
5. Concurrency (parallel agents): If a write is rejected with "Stale File: [path] was modified since you read it", another agent or the user changed the file. Re-read the file with read_file and then retry your edit.
6. Lesson recording: When a verification step (linter or test) fails, call record_lesson(lesson) to append the lesson to .orchestration/CLAUDE.md so parallel agents can avoid the same failure.
`
}
