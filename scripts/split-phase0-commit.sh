#!/usr/bin/env bash
# Split the single "phase -0" commit into smaller, single-concern commits.
# Run from repo root. After: git push --force-with-lease origin phase-0

set -e
cd "$(git rev-parse --show-toplevel)"
BRANCH=$(git branch --show-current)
if [ "$BRANCH" != "phase-0" ]; then
  echo "Run this on branch phase-0. Current: $BRANCH"
  exit 1
fi

BASE=bfbfaf6d4
SPLIT=c0e7947dd

export GIT_SEQUENCE_EDITOR="sed -i 's/^pick ${SPLIT:0:7}/edit ${SPLIT:0:7}/'"
git rebase -i "$BASE"

if [ ! -d .git/rebase-merge ] && [ ! -d .git/rebase-apply ]; then
  echo "Rebase completed or aborted. Nothing to do."
  exit 0
fi

git reset HEAD^

git add .orchestration/ packages/types/src/tool.ts src/hooks/orchestration-types.ts src/hooks/orchestration-io.ts
git commit -m "chore(orchestration): add sidecar and types

- .orchestration/ active_intents.yaml, intent_map, CLAUDE
- packages/types: select_active_intent tool
- orchestration-types, orchestration-io for intent and trace I/O"

git add src/hooks/HookEngine.ts src/hooks/HookManager.ts src/hooks/context/ src/hooks/pipeline/ src/hooks/correlation/ src/hooks/scope-match.ts src/hooks/taskState.ts src/hooks/lifecycle/ src/hooks/command-classify.ts src/hooks/content-hash.ts src/hooks/index.ts
git commit -m "feat(hooks): add HookEngine, HookManager, pipeline and context

- HookEngine facade, HookManager orchestrator
- ContextLayer, IntentPipeline, CorrelationService, scope-match, taskState
- Hook lifecycle and command-classify"

git add src/core/prompts/sections/index.ts src/core/prompts/sections/intent-protocol.ts src/core/prompts/system.ts src/core/prompts/tools/native-tools/
git commit -m "feat(prompt): add intent protocol to system prompt

- getIntentProtocolSection when .orchestration/ exists
- Tool descriptions for select_active_intent, write_to_file, record_lesson"

git add src/core/tools/SelectActiveIntentTool.ts src/core/tools/WriteToFileTool.ts src/core/tools/RecordLessonTool.ts
git commit -m "feat(tools): wire select_active_intent, write_to_file, record_lesson to hooks

- Pre/post hook calls in tools for intent and trace"

git add src/core/assistant-message/NativeToolCallParser.ts src/core/assistant-message/presentAssistantMessage.ts src/shared/tools.ts
git commit -m "feat(assistant): register new tools in parser and presentAssistantMessage

- select_active_intent in tool list and switch handling"

git add ARCHITECTURE_NOTES.md IMPROVED_PROJECT_STRUCTURE.md REFACTORED_IMPLEMENTATION.md REPORT.md REPORT.pdf docs/
git commit -m "docs: add architecture, testing guide and report

- ARCHITECTURE_NOTES, IMPROVED_PROJECT_STRUCTURE, REFACTORED_IMPLEMENTATION
- TRP1_WEEK1_TESTING_GUIDE, TRP1_WEEK1_META_AUDIT_SCRIPT"

git rebase --continue
echo "Split complete. Log:"
git log --oneline -12
