import type OpenAI from "openai"

const DESCRIPTION = `Select the active intent (requirement/task) you are working on. You MUST call this before writing or editing any file when the workspace has .orchestration/active_intents.yaml. It loads context (scope, constraints, acceptance criteria) for that intent. Use the intent_id from active_intents.yaml (e.g. INT-001, REQ-001).`

export default {
	type: "function",
	function: {
		name: "select_active_intent",
		description: DESCRIPTION,
		strict: true,
		parameters: {
			type: "object",
			properties: {
				intent_id: {
					type: "string",
					description: "Intent ID from .orchestration/active_intents.yaml (e.g. INT-001)",
				},
			},
			required: ["intent_id"],
			additionalProperties: false,
		},
	},
} satisfies OpenAI.Chat.ChatCompletionTool
