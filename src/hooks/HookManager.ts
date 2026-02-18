/**
 * Hook manager: facade over context layer, correlation service, and intent pipeline.
 * Isolated middleware; tools call the manager, not the execution loop.
 * Composable and fail-safe: each hook returns a result; no throws for business rules.
 */
import * as vscode from "vscode"
import type { MutationClass } from "./orchestration-types"
import { orchestrationExists, appendClaudeLesson } from "./orchestration-io"
import { getIntentContext } from "./context/ContextLayer"
import { appendWriteTrace } from "./correlation/CorrelationService"
import { validateIntentForWrite } from "./pipeline/IntentPipeline"
import { classifyCommand as classifyCommandKind } from "./command-classify"
import type { Task } from "../core/task/Task"

export interface PreHookResult {
	allowed: boolean
	message?: string
	injectedContext?: string
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
		}
	}

	async preWriteFile(
		task: Task,
		relPath: string,
		args: { intent_id?: string; mutation_class?: MutationClass },
	): Promise<PreHookResult> {
		return validateIntentForWrite(task, relPath, args)
	}

	async postWriteFile(
		task: Task,
		relPath: string,
		content: string,
		opts: {
			intent_id: string
			mutation_class: MutationClass
			startLine?: number
			endLine?: number
			sessionLogId?: string
			modelId?: string
		},
	): Promise<PostHookResult> {
		if (!(await orchestrationExists(task.cwd))) return { success: true }
		await appendWriteTrace({
			cwd: task.cwd,
			relPath,
			content,
			intent_id: opts.intent_id,
			mutation_class: opts.mutation_class,
			startLine: opts.startLine,
			endLine: opts.endLine,
			sessionLogId: opts.sessionLogId,
			modelId: opts.modelId,
		})
		return { success: true }
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
