/**
 * Task-scoped orchestration state: active intent ID and read-hash map.
 * Shared by HookManager and IntentPipeline to avoid circular dependency.
 */
import type { Task } from "../core/task/Task"

const ACTIVE_INTENT_KEY = "orchestration:activeIntentId"
const READ_HASH_KEY = "_orchestrationReadHash"

export function getActiveIntentId(task: Task): string | undefined {
	return (task as unknown as { [ACTIVE_INTENT_KEY]?: string })[ACTIVE_INTENT_KEY]
}

export function setActiveIntentId(task: Task, intentId: string | undefined): void {
	;(task as unknown as { [ACTIVE_INTENT_KEY]?: string })[ACTIVE_INTENT_KEY] = intentId
}

export function setReadHash(task: Task, relPath: string, contentHash: string): void {
	const t = task as unknown as { [READ_HASH_KEY]?: Record<string, string> }
	if (!t[READ_HASH_KEY]) t[READ_HASH_KEY] = {}
	t[READ_HASH_KEY][relPath] = contentHash
}

export function getReadHash(task: Task, relPath: string): string | undefined {
	return (task as unknown as { [READ_HASH_KEY]?: Record<string, string> })[READ_HASH_KEY]?.[relPath]
}
