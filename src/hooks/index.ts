export { hookEngine, getActiveIntentId, setActiveIntentId, setReadHash, getReadHash } from "./HookEngine"
export type { HookContext, PreHookResult, PostHookResult } from "./HookEngine"
export { hookManager } from "./HookManager"
export { getIntentContext, buildIntentContextXml } from "./context/ContextLayer"
export { getLastUserMessageText, promptMatchesIntent } from "./prompt-intent-match"
export type { MessageLike } from "./prompt-intent-match"
export { appendWriteTrace } from "./correlation/CorrelationService"
export { validateIntentForWrite } from "./pipeline/IntentPipeline"
export {
	HookPhase,
	type HookContract,
	type PreHookInput,
	type PreHookOutput,
	type PostHookInput,
	type PostHookOutput,
} from "./lifecycle/HookLifecycle"
export { contentHashPrefix, sha256Content } from "./content-hash"
export { pathMatchesScope } from "./scope-match"
export {
	readActiveIntents,
	writeActiveIntents,
	appendAgentTrace,
	readIntentIgnore,
	appendClaudeLesson,
	getOrchestrationDir,
	getActiveIntentsPath,
	getAgentTracePath,
	getIntentMapPath,
	getClaudePath,
	orchestrationExists,
} from "./orchestration-io"
export type {
	ActiveIntent,
	ActiveIntentsDoc,
	AgentTraceRecord,
	MutationClass,
	PostWriteTraceOpts,
} from "./orchestration-types"
