import type OpenAI from "openai"

const WRITE_TO_FILE_DESCRIPTION = `Request to write content to a file. This tool is primarily used for creating new files or for scenarios where a complete rewrite of an existing file is intentionally required. If the file exists, it will be overwritten. If it doesn't exist, it will be created. This tool will automatically create any directories needed to write the file.

**Important:** You should prefer using other editing tools over write_to_file when making changes to existing files, since write_to_file is slower and cannot handle large files. Use write_to_file primarily for new file creation.

When using this tool, use it directly with the desired content. You do not need to display the content before using the tool. ALWAYS provide the COMPLETE file content in your response. This is NON-NEGOTIABLE. Partial updates or placeholders like '// rest of code unchanged' are STRICTLY FORBIDDEN. Failure to do so will result in incomplete or broken code.

When creating a new project, organize all new files within a dedicated project directory unless the user specifies otherwise. Structure the project logically, adhering to best practices for the specific type of project being created.

Example: Writing a configuration file
{ "path": "frontend-config.json", "content": "{\\n  \\"apiEndpoint\\": \\"https://api.example.com\\",\\n  \\"theme\\": {\\n    \\"primaryColor\\": \\"#007bff\\"\\n  }\\n}" }`

const PATH_PARAMETER_DESCRIPTION = `The path of the file to write to (relative to the current workspace directory)`

const CONTENT_PARAMETER_DESCRIPTION = `The content to write to the file. ALWAYS provide the COMPLETE intended content of the file, without any truncation or omissions. You MUST include ALL parts of the file, even if they haven't been modified. Do NOT include line numbers in the content.`

const INTENT_ID_DESCRIPTION = `When .orchestration/active_intents.yaml exists, pass the intent ID you are working on (e.g. INT-001). If the user already specified an intent in their message (e.g. "Work on INT-001"), use that intent_id here—you do not need to call select_active_intent first. If the user did not specify an intent, call select_active_intent first to load context, then pass that intent_id here. Writes are blocked without a valid intent_id.`

const MUTATION_CLASS_DESCRIPTION = `When orchestration is enabled, this is REQUIRED: AST_REFACTOR for syntax/structure changes (same intent); INTENT_EVOLUTION for new behavior or features. Semantic classification for traceability.`

export default {
	type: "function",
	function: {
		name: "write_to_file",
		description: WRITE_TO_FILE_DESCRIPTION,
		strict: true,
		parameters: {
			type: "object",
			properties: {
				path: {
					type: "string",
					description: PATH_PARAMETER_DESCRIPTION,
				},
				content: {
					type: "string",
					description: CONTENT_PARAMETER_DESCRIPTION,
				},
				intent_id: {
					type: "string",
					description: INTENT_ID_DESCRIPTION,
				},
				mutation_class: {
					type: "string",
					enum: ["AST_REFACTOR", "INTENT_EVOLUTION"],
					description: MUTATION_CLASS_DESCRIPTION,
				},
			},
			required: ["path", "content"],
			additionalProperties: false,
		},
	},
} satisfies OpenAI.Chat.ChatCompletionTool
