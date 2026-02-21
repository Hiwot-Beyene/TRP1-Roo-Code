import { orchestrationExists, readActiveIntents, readIntentMap } from "../../../hooks/orchestration-io"

/**
 * Intent-driven protocol section. Only included when .orchestration/ exists.
 * Injects the intent plan (intent_map.md) so the agent uses it while building; supports parallel work per intent.
 */
export async function getIntentProtocolSection(cwd: string): Promise<string> {
	if (!(await orchestrationExists(cwd))) return ""

	const [doc, planContent] = await Promise.all([readActiveIntents(cwd), readIntentMap(cwd)])
	const intentIds =
		doc.active_intents.length > 0 ? doc.active_intents.map((i) => i.id).join(", ") : "(none in active_intents.yaml)"

	let out = `
INTENT-DRIVEN PROTOCOL (.orchestration/ detected)

Active intent IDs: ${intentIds}
`

	if (planContent.trim()) {
		out += `

<intent_plan>
Development plan from .orchestration/intent_map.md — use this while building. Multiple tasks can work in parallel on different intents from this plan; each task must select or pass one intent_id for writes.
</intent_plan>

\`\`\`markdown
${planContent.trim()}
\`\`\`
`
	}

	out += `

1. **When the user has already specified a single intent** (e.g. "Work on INT-001", "Implement INT-001"): You MAY proceed directly to read_file, write_to_file, or other tools under that intent. You do NOT have to call select_active_intent first. For write_to_file pass intent_id and mutation_class (AST_REFACTOR or INTENT_EVOLUTION).

2. **When the user has NOT specified an intent**, or mentioned multiple intents: Your first action MUST be to call select_active_intent(intent_id) to load scope/constraints. The gatekeeper blocks writes until a valid intent is selected or inferred. For write_to_file you must pass intent_id and mutation_class.

3. Only edit files within the owned_scope of the intent. Scope violations are blocked. Files in .intentignore are excluded.

4. Concurrency: If a write is rejected with "Stale File: [path] was modified since you read it", re-read the file and retry. Parallel work across intents is supported (each task uses one intent_id).

5. When a verification step (linter or test) fails, call record_lesson(lesson) to append to .orchestration/CLAUDE.md.
`
	return out
}
