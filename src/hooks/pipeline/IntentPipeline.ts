/**
 * Intent detection pipeline: validate intent ID against context DB, then
 * load and return curated context. Gate for "agent must reference context before acting".
 */
import path from "path"
import fs from "fs/promises"
import { readActiveIntents, findIntentById, readIntentIgnore, orchestrationExists } from "../orchestration-io"
import { pathMatchesScope } from "../scope-match"
import type { MutationClass } from "../orchestration-types"
import { contentHashPrefix } from "../content-hash"
import type { Task } from "../../core/task/Task"
import { getActiveIntentId, getReadHash } from "../taskState"

export interface WriteGateResult {
	allowed: boolean
	message?: string
}

export async function validateIntentForWrite(
	task: Task,
	relPath: string,
	args: { intent_id?: string; mutation_class?: MutationClass },
): Promise<WriteGateResult> {
	const cwd = task.cwd
	if (!(await orchestrationExists(cwd))) return { allowed: true }

	const intentId = args.intent_id ?? getActiveIntentId(task)
	if (!intentId) {
		return {
			allowed: false,
			message:
				"You must cite a valid active Intent ID before writing files. Call select_active_intent(intent_id) first, then use write_to_file with intent_id in the arguments.",
		}
	}

	const doc = await readActiveIntents(cwd)
	const intent = findIntentById(doc, intentId)
	if (!intent) {
		return { allowed: false, message: `Invalid intent_id: "${intentId}". Not found in active_intents.yaml.` }
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
