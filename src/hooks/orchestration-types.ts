export type IntentStatus = "DRAFT" | "IN_PROGRESS" | "COMPLETED"

export interface ActiveIntent {
	id: string
	name: string
	status: IntentStatus
	owned_scope: string[]
	constraints: string[]
	acceptance_criteria: string[]
}

export interface ActiveIntentsDoc {
	active_intents: ActiveIntent[]
}

export type MutationClass = "AST_REFACTOR" | "INTENT_EVOLUTION"

export interface PostWriteTraceOpts {
	intent_id?: string
	mutation_class?: MutationClass
	startLine?: number
	endLine?: number
	sessionLogId?: string
	modelId?: string
}

export interface AgentTraceRange {
	start_line: number
	end_line: number
	content_hash: string
}

export interface AgentTraceContributor {
	entity_type: "AI" | "human"
	model_identifier?: string
}

export interface AgentTraceConversation {
	url: string
	contributor: AgentTraceContributor
	ranges: AgentTraceRange[]
	related: Array<{ type: string; value: string }>
}

export interface AgentTraceFile {
	relative_path: string
	conversations: AgentTraceConversation[]
}

export interface AgentTraceRecord {
	id: string
	timestamp: string
	vcs: { revision_id: string }
	files: AgentTraceFile[]
	intent_id?: string
	mutation_class?: MutationClass
}

export type CommandKind = "safe" | "destructive"
