/**
 * Formal hook interfaces for the interceptor/registry pattern.
 * Pre- and post-write hooks are pluggable and orderable without changing host logic.
 */
import type { Task } from "../core/task/Task"
import type { MutationClass, PostWriteTraceOpts } from "./orchestration-types"

/** Result of a pre-write hook. First hook that returns allowed: false blocks the write. */
export interface PreHookResult {
	allowed: boolean
	message?: string
	injectedContext?: string
	intent?: import("./orchestration-types").ActiveIntent
}

/** Result of a post-write hook. Failures are logged; they do not undo the write. */
export interface PostHookResult {
	success: boolean
	message?: string
}

/** Pluggable pre-write interceptor. Run before any file write; may block (allowed: false). */
export interface IPreWriteHook {
	readonly name?: string
	execute(
		task: Task,
		relPath: string,
		args: { intent_id?: string; mutation_class?: MutationClass },
	): Promise<PreHookResult>
}

/** Pluggable post-write interceptor. Run after a file write; best-effort (e.g. trace append). */
export interface IPostWriteHook {
	readonly name?: string
	execute(task: Task, relPath: string, content: string, opts: PostWriteTraceOpts): Promise<PostHookResult>
}

/** Order for hook execution. Lower runs first. Default 0. */
export type HookOrder = number
