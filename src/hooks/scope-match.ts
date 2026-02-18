import path from "path"

function globToRegex(pattern: string): RegExp {
	const parts = pattern.split("/").map((p) => {
		const escaped = p
			.replace(/[.+^${}()|[\]\\]/g, "\\$&")
			.replace(/\*\*/g, "{{GLOBSTAR}}")
			.replace(/\*/g, "[^/]*")
			.replace(/{{GLOBSTAR}}/g, ".*")
		return escaped
	})
	const joined = parts.join("/")
	const anchored = pattern.startsWith("/") ? `^${joined}` : `^${joined}$`
	return new RegExp(anchored)
}

export function pathMatchesScope(relativePath: string, scopePatterns: string[]): boolean {
	const normalized = path.normalize(relativePath).replace(/\\/g, "/")
	for (const pattern of scopePatterns) {
		const normalizedPattern = path.normalize(pattern).replace(/\\/g, "/")
		const re = globToRegex(normalizedPattern)
		if (re.test(normalized)) return true
	}
	return false
}
