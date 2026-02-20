/**
 * Hook manager: facade over context layer and the hook registry.
 * Tools call the manager; pre/post write behavior is delegated to the registry so
 * hooks can be registered and ordered without changing this class or host logic.
 */
import * as vscode from "vscode"
import type { MutationClass, PostWriteTraceOpts } from "./orchestration-types"
import { appendClaudeLesson } from "./orchestration-io"
import { getIntentContext } from "./context/ContextLayer"
import { hookRegistry } from "./HookRegistry"
import { classifyCommand as classifyCommandKind } from "./command-classify"
import type { Task } from "../core/task/Task"
import type { ActiveIntent } from "./orchestration-types"

export interface PreHookResult {
	allowed: boolean
	message?: string
	injectedContext?: string
	/** Set when allowed and orchestration is enabled; used for prompt-vs-intent matching. */
	intent?: ActiveIntent
}

export interface PostHookResult {
	success: boolean
	message?: string
}

import { getActiveIntentId, setActiveIntentId, getReadHash, setReadHash } from "./taskState"
export { getActiveIntentId, setActiveIntentId, getReadHash, setReadHash }

export class HookManager {
	async preSelectActiveIntent(cwd: string, intentId: string): Promise<PreHookResult> {
		const result = await getIntentContext(cwd, intentId)
		return {
			allowed: result.allowed,
			message: result.message,
			injectedContext: result.injectedContext,
			intent: result.intent,
		}
	}

	/**
	 * Pre-write: run all registered pre-write hooks in order. First hook that
	 * returns allowed: false blocks the write (interceptor pattern).
	 */
	async preWriteFile(
		task: Task,
		relPath: string,
		args: { intent_id?: string; mutation_class?: MutationClass },
	): Promise<PreHookResult> {
		return hookRegistry.runPreWriteHooks(task, relPath, args)
	}

	/**
	 * Post-write: run all registered post-write hooks in order. Best-effort;
	 * hook failures are logged and do not change the reported success.
	 */
	async postWriteFile(
		task: Task,
		relPath: string,
		content: string,
		opts: PostWriteTraceOpts,
	): Promise<PostHookResult> {
		return hookRegistry.runPostWriteHooks(task, relPath, content, opts)
	}

	async requestHITLForIntentEvolution(message: string): Promise<boolean> {
		const choice = await vscode.window.showWarningMessage(message, { modal: true }, "Approve", "Reject")
		return choice === "Approve"
	}

	async recordLesson(task: Task, lesson: string): Promise<void> {
		await appendClaudeLesson(task.cwd, lesson)
	}

	classifyCommand(cmd: string) {
		return classifyCommandKind(cmd)
	}
}

export const hookManager = new HookManager()
