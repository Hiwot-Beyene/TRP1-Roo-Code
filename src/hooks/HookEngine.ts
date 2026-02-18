/**
 * Hook Engine: public API for the middleware layer. All intent- and write-related
 * tools MUST call these methods; the middleware fully intercepts the tool flow
 * (pre-hook before side effect, post-hook after). Delegates to HookManager.
 */
import type { MutationClass, PostWriteTraceOpts } from "./orchestration-types"
import type { Task } from "../core/task/Task"
import { hookManager } from "./HookManager"

export type { PreHookResult, PostHookResult } from "./HookManager"
export { getActiveIntentId, setActiveIntentId, setReadHash, getReadHash } from "./taskState"

export interface HookContext {
	task: Task
	toolName: string
	toolArgs?: Record<string, unknown>
}

export const hookEngine = {
	preSelectActiveIntent: (cwd: string, intentId: string) => hookManager.preSelectActiveIntent(cwd, intentId),
	preWriteFile: (task: Task, relPath: string, args: { intent_id?: string; mutation_class?: MutationClass }) =>
		hookManager.preWriteFile(task, relPath, args),
	postWriteFile: (task: Task, relPath: string, content: string, opts: PostWriteTraceOpts) =>
		hookManager.postWriteFile(task, relPath, content, opts),
	requestHITLForIntentEvolution: (message: string) => hookManager.requestHITLForIntentEvolution(message),
	recordLesson: (task: Task, lesson: string) => hookManager.recordLesson(task, lesson),
	classifyCommand: (cmd: string) => hookManager.classifyCommand(cmd),
}
