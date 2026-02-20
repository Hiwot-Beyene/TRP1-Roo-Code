/**
 * Intent-code correlation: append trace records to agent_trace.jsonl (Agent Trace Schema).
 * Each record includes: intent_id (REQ-ID), mutation_class, files[].conversations[].ranges[].content_hash
 * (SHA-256 prefix), and related: [{ type: "specification", value: intent_id }]. Machine-readable only.
 */
import { randomUUID } from "crypto"
import type { AgentTraceRecord, MutationClass } from "../orchestration-types"
import { appendAgentTrace, ensureOrchestrationDir, orchestrationExists } from "../orchestration-io"
import { contentHashPrefix } from "../content-hash"

async function getVcsRevisionId(cwd: string): Promise<string> {
	try {
		const { execSync } = await import("child_process")
		return execSync("git rev-parse HEAD", { cwd, encoding: "utf-8" }).trim()
	} catch {
		return "unknown"
	}
}

export interface WriteTraceInput {
	cwd: string
	relPath: string
	content: string
	intent_id: string
	mutation_class: MutationClass
	startLine?: number
	endLine?: number
	sessionLogId?: string
	modelId?: string
}

export async function appendWriteTrace(input: WriteTraceInput): Promise<boolean> {
	if (!(await orchestrationExists(input.cwd))) return true
	await ensureOrchestrationDir(input.cwd)
	const contentHash = contentHashPrefix(input.content)
	const startLine = input.startLine ?? 1
	const endLine = input.endLine ?? input.content.split("\n").length
	const record: AgentTraceRecord = {
		id: randomUUID(),
		timestamp: new Date().toISOString(),
		vcs: { revision_id: await getVcsRevisionId(input.cwd) },
		intent_id: input.intent_id,
		mutation_class: input.mutation_class,
		files: [
			{
				relative_path: input.relPath,
				conversations: [
					{
						url: input.sessionLogId ?? "",
						contributor: { entity_type: "AI", model_identifier: input.modelId },
						ranges: [{ start_line: startLine, end_line: endLine, content_hash: contentHash }],
						related: [{ type: "specification", value: input.intent_id }],
					},
				],
			},
		],
	}
	await appendAgentTrace(input.cwd, record)
	return true
}
