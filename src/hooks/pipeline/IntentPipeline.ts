/**
 * Intent detection pipeline: validate intent ID against context DB, then
 * load and return curated context. Gate for "agent must reference context before acting".
 *
 * Phase 2 boundaries: .intentignore excludes paths from the selected intent's scope;
 * owned_scope enforces which files the intent is authorized to edit (scope violation
 * returns "Scope Violation: {intent_id} is not authorized to edit [filename].").
 */
import path from "path"
import fs from "fs/promises"
import { readActiveIntents, findIntentById, readIntentIgnore, orchestrationExists } from "../orchestration-io"
import { pathMatchesScope } from "../scope-match"
import type { MutationClass } from "../orchestration-types"
import { contentHashPrefix } from "../content-hash"
import type { Task } from "../../core/task/Task"
import { getActiveIntentId, getReadHash, setActiveIntentId } from "../taskState"
import { getLastUserMessageText } from "../prompt-intent-match"

export interface WriteGateResult {
	allowed: boolean
	message?: string
}

/** Phase 1: exact error per spec — "block execution and return an error: 'You must cite a valid active Intent ID.'" */
export const GATEKEEPER_BLOCKED_DISPLAY_MESSAGE = "You must cite a valid active Intent ID."

/**
 * Write gate: intent, scope, .intentignore, optimistic lock. Only runs when
 * .orchestration/ exists; otherwise returns allowed: true so existing write
 * behavior is unchanged. Stale-file check only blocks when a read-hash was
 * previously set for this path (same-task read-then-write).
 */
export async function validateIntentForWrite(
	task: Task,
	relPath: string,
	args: { intent_id?: string; mutation_class?: MutationClass },
): Promise<WriteGateResult> {
	const cwd = task.cwd
	if (!(await orchestrationExists(cwd))) return { allowed: true }

	const doc = await readActiveIntents(cwd)
	let intentId = args.intent_id ?? getActiveIntentId(task)
	if (!intentId) {
		// Infer intent from last user message (e.g. "Work on INT-001") so trace can be recorded.
		const userText = getLastUserMessageText(task.apiConversationHistory)
		if (userText) {
			const mentioned = doc.active_intents.filter((i) => userText.toLowerCase().includes(i.id.toLowerCase()))
			if (mentioned.length === 1) {
				intentId = mentioned[0].id
				setActiveIntentId(task, intentId)
			}
		}
	}
	if (!intentId) {
		return { allowed: false, message: "You must cite a valid active Intent ID." }
	}

	const intent = findIntentById(doc, intentId)
	if (!intent) {
		return { allowed: false, message: "You must cite a valid active Intent ID." }
	}

	const ignorePatterns = await readIntentIgnore(cwd)
	if (ignorePatterns.length > 0 && pathMatchesScope(relPath, ignorePatterns)) {
		return {
			allowed: false,
			message: `Scope Violation: "${relPath}" is listed in .intentignore. Request scope expansion or remove from .intentignore.`,
		}
	}

	if (!pathMatchesScope(relPath, intent.owned_scope)) {
		return {
			allowed: false,
			message: `Scope Violation: ${intentId} is not authorized to edit [${relPath}]. Request scope expansion.`,
		}
	}

	const absolutePath = path.resolve(cwd, relPath)
	let currentHash: string | undefined
	try {
		const content = await fs.readFile(absolutePath, "utf-8")
		currentHash = contentHashPrefix(content)
	} catch {
		// New file
	}
	const expectedHash = getReadHash(task, relPath)
	if (expectedHash !== undefined && currentHash !== undefined && currentHash !== expectedHash) {
		return {
			allowed: false,
			message: `Stale File: [${relPath}] was modified since you read it. Re-read the file and try again.`,
		}
	}
	return { allowed: true }
}
