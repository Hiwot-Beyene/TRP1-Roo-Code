/**
 * Checks whether the user's prompt text matches the selected intent.
 * Used to ensure the AI selects an intent that aligns with what the user asked for.
 */
import type { ActiveIntent } from "./orchestration-types"

/** Message-like shape (role + content) to avoid coupling to Task/ApiMessage. */
export interface MessageLike {
	role: string
	content: unknown
}

/**
 * Extracts the last user message text from a conversation history.
 * Used to compare the user's request against the selected intent.
 */
export function getLastUserMessageText(messages: MessageLike[]): string | undefined {
	for (let i = messages.length - 1; i >= 0; i--) {
		const msg = messages[i]
		if (msg.role !== "user") continue
		const content = msg.content
		if (Array.isArray(content)) {
			const text = content
				.filter(
					(c): c is { type: "text"; text: string } =>
						typeof c === "object" && c !== null && (c as { type?: string }).type === "text" && "text" in c,
				)
				.map((c) => c.text)
				.join(" ")
			return text.trim() || undefined
		}
		if (typeof content === "string") return content.trim() || undefined
		return undefined
	}
	return undefined
}

function normalizeWords(s: string): string[] {
	return s
		.toLowerCase()
		.replace(/\s+/g, " ")
		.split(/\W+/)
		.filter((w) => w.length >= 2)
}

/**
 * Returns whether the user's prompt text matches the selected intent.
 * Match is true if:
 * - User message is missing/empty (cannot verify; allow).
 * - User message contains the intent ID (e.g. "INT-001").
 * - At least one significant word from the intent name appears in the user message.
 * - A phrase from acceptance_criteria appears in the user message.
 */
export function promptMatchesIntent(
	userMessage: string | undefined,
	intent: ActiveIntent,
): { match: boolean; reason?: string } {
	if (!userMessage || !userMessage.trim()) {
		return { match: true }
	}

	const normalized = userMessage.toLowerCase().trim()

	// User explicitly mentioned this intent ID
	if (normalized.includes(intent.id.toLowerCase())) {
		return { match: true }
	}

	const userWords = new Set(normalizeWords(userMessage))

	// Intent name words (e.g. "Build Weather API" -> build, weather, api)
	const nameWords = normalizeWords(intent.name)
	const nameMatch = nameWords.some((w) => userWords.has(w))
	if (nameMatch) {
		return { match: true }
	}

	// Acceptance criteria: if any criterion's first few words appear in user message, consider it a match
	for (const criterion of intent.acceptance_criteria) {
		const words = normalizeWords(criterion)
		if (words.length === 0) continue
		const phrase = words.slice(0, 3).join(" ")
		if (phrase && normalized.includes(phrase)) {
			return { match: true }
		}
		// Single significant word from criterion in user message
		if (words.some((w) => userWords.has(w))) {
			return { match: true }
		}
	}

	return {
		match: false,
		reason: `The user's request does not appear to match the selected intent. Selected intent: "${intent.name}" (${intent.id}). Please select an intent that matches what the user asked for, or ask the user to clarify.`,
	}
}
