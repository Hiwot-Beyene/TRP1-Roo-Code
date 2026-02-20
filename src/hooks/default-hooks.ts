/**
 * Built-in hook implementations. Registered with the registry at module load
 * so orchestration behavior is pluggable without changing HookManager.
 */
import type { IPreWriteHook, IPostWriteHook } from "./hook-types"
import { validateIntentForWrite } from "./pipeline/IntentPipeline"
import { appendWriteTrace } from "./correlation/CorrelationService"
import { orchestrationExists } from "./orchestration-io"
import { hookRegistry } from "./HookRegistry"

/** Pre-write: intent gate, scope, .intentignore, optimistic lock (Phase 1–4). */
const intentPipelinePreWriteHook: IPreWriteHook = {
	name: "intent-pipeline",
	execute: (task, relPath, args) => validateIntentForWrite(task, relPath, args),
}

/** Post-write: append to agent_trace.jsonl (Phase 3). */
const tracePostWriteHook: IPostWriteHook = {
	name: "trace",
	async execute(task, relPath, content, opts) {
		if (!(await orchestrationExists(task.cwd))) return { success: true }
		try {
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
		} catch (err) {
			console.warn("[orchestration] Trace append failed; write already succeeded.", err)
		}
		return { success: true }
	},
}

/** Register default hooks so orchestration works without host changes. */
export function registerDefaultHooks(): void {
	hookRegistry.registerPreWriteHook(intentPipelinePreWriteHook, 0)
	hookRegistry.registerPostWriteHook(tracePostWriteHook, 0)
}
