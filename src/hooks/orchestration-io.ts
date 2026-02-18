import path from "path"
import fs from "fs/promises"
import * as yaml from "yaml"
import type { ActiveIntentsDoc, ActiveIntent, AgentTraceRecord } from "./orchestration-types"

const ORCH_DIR = ".orchestration"
const ACTIVE_INTENTS_FILE = "active_intents.yaml"
const AGENT_TRACE_FILE = "agent_trace.jsonl"
const INTENT_MAP_FILE = "intent_map.md"
const CLAUDE_FILE = "CLAUDE.md"
const INTENT_IGNORE_FILE = ".intentignore"

export function getOrchestrationDir(cwd: string): string {
	return path.join(cwd, ORCH_DIR)
}

export function getActiveIntentsPath(cwd: string): string {
	return path.join(getOrchestrationDir(cwd), ACTIVE_INTENTS_FILE)
}

export function getAgentTracePath(cwd: string): string {
	return path.join(getOrchestrationDir(cwd), AGENT_TRACE_FILE)
}

export function getIntentMapPath(cwd: string): string {
	return path.join(getOrchestrationDir(cwd), INTENT_MAP_FILE)
}

export function getClaudePath(cwd: string): string {
	return path.join(getOrchestrationDir(cwd), CLAUDE_FILE)
}

export function getIntentIgnorePath(cwd: string): string {
	return path.join(cwd, INTENT_IGNORE_FILE)
}

export async function ensureOrchestrationDir(cwd: string): Promise<void> {
	const dir = getOrchestrationDir(cwd)
	await fs.mkdir(dir, { recursive: true })
}

export async function readActiveIntents(cwd: string): Promise<ActiveIntentsDoc> {
	const filePath = getActiveIntentsPath(cwd)
	try {
		const raw = await fs.readFile(filePath, "utf-8")
		const parsed = yaml.parse(raw) as ActiveIntentsDoc
		if (!parsed?.active_intents) return { active_intents: [] }
		return parsed
	} catch {
		return { active_intents: [] }
	}
}

export async function writeActiveIntents(cwd: string, doc: ActiveIntentsDoc): Promise<void> {
	await ensureOrchestrationDir(cwd)
	const filePath = getActiveIntentsPath(cwd)
	await fs.writeFile(filePath, yaml.stringify(doc), "utf-8")
}

export function findIntentById(doc: ActiveIntentsDoc, intentId: string): ActiveIntent | undefined {
	return doc.active_intents.find((i) => i.id === intentId)
}

export async function appendAgentTrace(cwd: string, record: AgentTraceRecord): Promise<void> {
	await ensureOrchestrationDir(cwd)
	const filePath = getAgentTracePath(cwd)
	const line = JSON.stringify(record) + "\n"
	await fs.appendFile(filePath, line, "utf-8")
}

export async function readIntentIgnore(cwd: string): Promise<string[]> {
	const filePath = getIntentIgnorePath(cwd)
	try {
		const raw = await fs.readFile(filePath, "utf-8")
		return raw
			.split("\n")
			.map((l) => l.trim())
			.filter((l) => l && !l.startsWith("#"))
	} catch {
		return []
	}
}

export async function appendClaudeLesson(cwd: string, lesson: string): Promise<void> {
	await ensureOrchestrationDir(cwd)
	const filePath = getClaudePath(cwd)
	const block = `\n## Lesson (${new Date().toISOString()})\n${lesson}\n`
	await fs.appendFile(filePath, block, "utf-8")
}

export async function readIntentMap(cwd: string): Promise<string> {
	const filePath = getIntentMapPath(cwd)
	try {
		return await fs.readFile(filePath, "utf-8")
	} catch {
		return ""
	}
}

export async function updateIntentMap(cwd: string, content: string): Promise<void> {
	await ensureOrchestrationDir(cwd)
	const filePath = getIntentMapPath(cwd)
	await fs.writeFile(filePath, content, "utf-8")
}

export async function orchestrationExists(cwd: string): Promise<boolean> {
	const dir = getOrchestrationDir(cwd)
	try {
		await fs.access(dir)
		return true
	} catch {
		return false
	}
}
