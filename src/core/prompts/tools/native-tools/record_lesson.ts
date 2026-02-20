import type OpenAI from "openai"

const DESCRIPTION = `Append a "Lesson Learned" to .orchestration/CLAUDE.md for the shared brain (parallel orchestration). You MUST call this when a verification step (linter or test) fails: record what failed and how to fix it so other agents avoid the same mistake. Also call when making an architectural decision that parallel agents should know.`

export default {
	type: "function",
	function: {
		name: "record_lesson",
		description: DESCRIPTION,
		strict: true,
		parameters: {
			type: "object",
			properties: {
				lesson: {
					type: "string",
					description: "The lesson or decision to record (one short paragraph).",
				},
			},
			required: ["lesson"],
			additionalProperties: false,
		},
	},
} satisfies OpenAI.Chat.ChatCompletionTool
