import { Task } from "../task/Task"
import { formatResponse } from "../prompts/responses"
import type { ToolUse } from "../../shared/tools"
import { BaseTool, ToolCallbacks } from "./BaseTool"
import { hookEngine } from "../../hooks/HookEngine"

interface RecordLessonParams {
	lesson: string
}

export class RecordLessonTool extends BaseTool<"record_lesson"> {
	readonly name = "record_lesson" as const

	async execute(params: RecordLessonParams, task: Task, callbacks: ToolCallbacks): Promise<void> {
		const { pushToolResult } = callbacks
		const lesson = params.lesson?.trim()
		if (!lesson) {
			task.recordToolError("record_lesson")
			pushToolResult(formatResponse.toolError("record_lesson requires a non-empty lesson."))
			return
		}
		await hookEngine.recordLesson(task, lesson)
		task.consecutiveMistakeCount = 0
		pushToolResult("Lesson recorded to .orchestration/CLAUDE.md.")
	}
}

export const recordLessonTool = new RecordLessonTool()
