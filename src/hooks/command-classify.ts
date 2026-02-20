import type { CommandKind } from "./orchestration-types"

const DESTRUCTIVE_PREFIXES = [
	"rm ",
	"rm -",
	"rmdir",
	"del ",
	"format ",
	"mkfs",
	"dd ",
	"git push --force",
	"git reset --hard",
	"npm uninstall",
	"pnpm remove",
	"yarn remove",
]

export function classifyCommand(command: string): CommandKind {
	const c = command.trim().toLowerCase()
	for (const prefix of DESTRUCTIVE_PREFIXES) {
		if (c.startsWith(prefix.toLowerCase())) return "destructive"
	}
	if (/\brm\s+-rf\b/.test(c) || /\brm\s+-fr\b/.test(c)) return "destructive"
	return "safe"
}

/**
 * True if the command is likely to create or modify files in the workspace
 * (e.g. redirections, touch, cp, mv). Used to enforce intent gate on execute_command.
 */
export function isFileWritingCommand(command: string): boolean {
	const c = command.trim()
	if (!c) return false
	// Redirections: > file, >> file (create/overwrite or append)
	if (/>/.test(c) || />>/.test(c)) return true
	const lower = c.toLowerCase()
	// touch creates or updates file mtime
	if (lower.startsWith("touch ")) return true
	// cp / mv / copy write to destination
	if (/\b(cp|mv|copy)\s+/.test(lower)) return true
	// mkdir creates directories
	if (/\bmkdir\s+/.test(lower)) return true
	return false
}
