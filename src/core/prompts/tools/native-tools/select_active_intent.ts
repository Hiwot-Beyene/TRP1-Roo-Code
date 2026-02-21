import type OpenAI from "openai"

const DESCRIPTION = `Select the active intent (requirement/task) and load its context (scope, constraints, acceptance criteria, and plan from intent_map.md). When the user has already specified a single intent in their message (e.g. "Work on INT-001", "Implement INT-001"), you do NOT have to call this first—you may pass that intent_id directly in write_to_file. Call this when the user did not specify an intent or when you want the full context (scope, constraints, plan) before implementing. Use intent_id from active_intents.yaml (e.g. INT-001).`

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
