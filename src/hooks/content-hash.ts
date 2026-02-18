import { createHash } from "crypto"

export function sha256Content(content: string): string {
	return createHash("sha256").update(content, "utf8").digest("hex")
}

export function contentHashPrefix(content: string): string {
	return `sha256:${sha256Content(content).slice(0, 32)}`
}
