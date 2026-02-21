/**
 * Context enrichment: builds curated intent context from active_intents.
 * Single-intent injection only; no full dump. Agent must reference context before acting.
 */
import type { ActiveIntent } from "../orchestration-types"
import { readActiveIntents, findIntentById, orchestrationExists, readIntentMap } from "../orchestration-io"

export interface IntentContextResult {
	allowed: boolean
	message?: string
	injectedContext?: string
	intent?: ActiveIntent
}

export function buildIntentContextXml(intent: ActiveIntent): string {
	const scope = intent.owned_scope.join(", ")
	const constraints = intent.constraints.join("\n")
	const criteria = intent.acceptance_criteria.join("\n")
	return `<intent_context>
<intent_id>${intent.id}</intent_id>
<name>${intent.name}</name>
<status>${intent.status}</status>
<owned_scope>${scope}</owned_scope>
<constraints>
${constraints}
</constraints>
<acceptance_criteria>
${criteria}
</acceptance_criteria>
</intent_context>`
}

/**
 * When .orchestration/ is absent, returns allowed immediately so existing workflows
 * and tool protocol are unchanged. No validation gates or metadata required.
 */
export async function getIntentContext(cwd: string, intentId: string): Promise<IntentContextResult> {
	if (!(await orchestrationExists(cwd))) {
		return { allowed: true, message: "Orchestration not configured; intent not required." }
	}
	const doc = await readActiveIntents(cwd)
	const intent = findIntentById(doc, intentId)
	if (!intent) {
		return {
			allowed: false,
			message: "You must cite a valid active Intent ID.",
		}
	}
	let injectedContext = buildIntentContextXml(intent)
	const planContent = await readIntentMap(cwd)
	if (planContent.trim()) {
		injectedContext += `\n<current_plan_from_intent_map>\nThe following is the current development plan from .orchestration/intent_map.md. Use it to guide your implementation for this intent.\n\n${planContent}\n</current_plan_from_intent_map>`
	}
	return {
		allowed: true,
		injectedContext,
		intent,
	}
}
