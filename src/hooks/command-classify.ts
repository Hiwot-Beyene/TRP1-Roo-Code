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
