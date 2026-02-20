/**
 * Interceptor registry: register and run pre/post write hooks in order.
 * Hooks can be added without changing HookManager or host (tool) logic.
 *
 * Example — register a custom pre-write hook (e.g. in extension activation):
 *   import { hookRegistry } from "./hooks"
 *   hookRegistry.registerPreWriteHook({ name: "my-gate", execute: async (task, relPath, args) => ({ allowed: true }) }, 10)
 * Lower order runs first; default built-in hooks use order 0.
 */
import type { Task } from "../core/task/Task"
import type { MutationClass, PostWriteTraceOpts } from "./orchestration-types"
import type { IPreWriteHook, IPostWriteHook, PreHookResult, PostHookResult } from "./hook-types"

export type { IPreWriteHook, IPostWriteHook, PreHookResult, PostHookResult } from "./hook-types"
export type { HookOrder } from "./hook-types"

interface OrderedPre {
	order: number
	hook: IPreWriteHook
}

interface OrderedPost {
	order: number
	hook: IPostWriteHook
}

export class HookRegistry {
	private preWriteHooks: OrderedPre[] = []
	private postWriteHooks: OrderedPost[] = []

	/**
	 * Register a pre-write hook. Lower order runs first; same order = registration order.
	 */
	registerPreWriteHook(hook: IPreWriteHook, order: number = 0): void {
		this.preWriteHooks.push({ order, hook })
		this.preWriteHooks.sort((a, b) => a.order - b.order || 0)
	}

	/**
	 * Register a post-write hook. Lower order runs first; same order = registration order.
	 */
	registerPostWriteHook(hook: IPostWriteHook, order: number = 0): void {
		this.postWriteHooks.push({ order, hook })
		this.postWriteHooks.sort((a, b) => a.order - b.order || 0)
	}

	/**
	 * Run all pre-write hooks in order. First hook that returns allowed: false
	 * short-circuits and that result is returned; otherwise returns { allowed: true }.
	 */
	async runPreWriteHooks(
		task: Task,
		relPath: string,
		args: { intent_id?: string; mutation_class?: MutationClass },
	): Promise<PreHookResult> {
		for (const { hook } of this.preWriteHooks) {
			const result = await hook.execute(task, relPath, args)
			if (!result.allowed) return result
		}
		return { allowed: true }
	}

	/**
	 * Run all post-write hooks in order. All run; failures are logged and do not
	 * change the overall success (write already happened).
	 */
	async runPostWriteHooks(
		task: Task,
		relPath: string,
		content: string,
		opts: PostWriteTraceOpts,
	): Promise<PostHookResult> {
		for (const { hook } of this.postWriteHooks) {
			try {
				await hook.execute(task, relPath, content, opts)
			} catch (err) {
				console.warn(`[HookRegistry] Post-write hook "${hook.name ?? "anonymous"}" failed:`, err)
			}
		}
		return { success: true }
	}
}

export const hookRegistry = new HookRegistry()
