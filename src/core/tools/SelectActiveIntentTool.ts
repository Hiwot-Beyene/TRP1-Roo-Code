import { Task } from "../task/Task"
import { formatResponse } from "../prompts/responses"
import type { ToolUse } from "../../shared/tools"
import { BaseTool, ToolCallbacks } from "./BaseTool"
import { hookEngine, setActiveIntentId } from "../../hooks/HookEngine"

interface SelectActiveIntentParams {
	intent_id: string
}

export class SelectActiveIntentTool extends BaseTool<"select_active_intent"> {
	readonly name = "select_active_intent" as const

	async execute(params: SelectActiveIntentParams, task: Task, callbacks: ToolCallbacks): Promise<void> {
		const { pushToolResult } = callbacks
		const intentId = params.intent_id?.trim()
		if (!intentId) {
			task.consecutiveMistakeCount++
			task.recordToolError("select_active_intent")
			pushToolResult(
				formatResponse.toolError(
					"select_active_intent requires intent_id from .orchestration/active_intents.yaml.",
				),
			)
			return
		}

		const result = await hookEngine.preSelectActiveIntent(task.cwd, intentId)
		if (!result.allowed) {
			task.consecutiveMistakeCount++
			task.recordToolError("select_active_intent")
			pushToolResult(formatResponse.toolError(result.message ?? "Intent selection denied."))
			return
		}

		task.consecutiveMistakeCount = 0
		setActiveIntentId(task, intentId)
		const message =
			result.injectedContext ??
			`Intent ${intentId} selected. No constraints loaded (orchestration not configured).`
		pushToolResult(message)
	}
}

export const selectActiveIntentTool = new SelectActiveIntentTool()
