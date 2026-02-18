/**
 * Hook lifecycle phases and contract. Hooks are invoked in defined phases;
 * tools call the manager, which runs registered handlers per phase.
 * Keeps hook logic out of the main execution loop.
 */
export const enum HookPhase {
	PreTool = "pre",
	PostTool = "post",
}

export interface HookContract<TInput, TOutput> {
	phase: HookPhase
	/** Tool name this hook is for (e.g. "select_active_intent", "write_to_file") */
	toolName: string
	/** Run the hook; must not throw—return result with allowed: false on failure */
	run(input: TInput): Promise<TOutput>
}

export interface PreHookInput {
	cwd: string
	toolName: string
	toolArgs: Record<string, unknown>
}

export interface PreHookOutput {
	allowed: boolean
	message?: string
	injectedContext?: string
}

export interface PostHookInput {
	cwd: string
	toolName: string
	toolArgs: Record<string, unknown>
	/** Result of the tool execution (e.g. written content for write_to_file) */
	payload?: unknown
}

export interface PostHookOutput {
	success: boolean
	message?: string
}
