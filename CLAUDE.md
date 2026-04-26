# Project Instructions for AI Agents

This file provides context and conventions for AI coding agents working on this codebase.

## Build & Test

```bash
npm install
npm run typecheck    # tsc --noEmit — must pass before any commit
npm run lint         # biome check — must pass before any commit
npm run test         # vitest run (28 tests) — must pass before any commit
npm run dev          # vercel dev — local server on :3000
```

All three quality gates must pass before opening a PR.

## Architecture Overview

This is a GitHub App that runs five review agents in parallel and merges their findings into a single structured review posted to GitHub.

### Request flow

```text
POST /api/github/webhook
  → signature verification (HMAC-SHA256)
  → issue_comment.created → parseReviewCommand() → maybeSubmitReview()
  → pull_request.opened/synchronize → maybeSubmitReview() (if REVIEW_ENABLED)
```

### Two-layer review architecture

**Agent layer** (`src/review.ts` → `runAgent()`): Five Anthropic API calls fire in parallel via `Promise.allSettled()`. Each call uses a focused system prompt (`buildAgentSystemPrompt(skillPath, customPrompt)` from `src/prompt.ts`) with prompt caching enabled. All agents share the same user message (`buildUserMessage()` — PR metadata + serialized diff). `Promise.allSettled` ensures one agent failure doesn't abort the whole review.

**Merge layer** (`src/review.ts` → `mergeReviews()`): After all agents settle, findings are merged:

- Inline comments deduplicated by `path:line` key; when two agents flag the same location, the one from a `REQUEST_CHANGES` agent wins (more conservative)
- General findings deduplicated by title (case-insensitive)
- Final `event`: `REQUEST_CHANGES` if any agent returned it; `COMMENT` otherwise

**Diff anchor validation** (`buildReviewComments()`): Before submission, every inline comment is checked against the set of valid right-side line numbers extracted from the unified diff (`collectRightSideLines()`). Comments referencing lines not in the diff are dropped silently rather than erroring the review. Up to 10 inline comments are submitted per review.

**Fallback retry** (`src/github-app.ts` → `maybeSubmitReview()`): If the GitHub Reviews API rejects the POST (e.g. a bad anchor slipped through), the bot retries with an empty `comments` array so the review body is never completely lost.

### Key files

| File | Responsibility |
| --- | --- |
| `src/anthropic.ts` | Anthropic client singleton (lazy init) |
| `src/config.ts` | Environment variable parsing and defaults |
| `src/commands.ts` | Slash command parsing, `isTrustedAuthorAssociation()` |
| `src/github-app.ts` | Octokit setup, draft PR check, submit + fallback retry |
| `src/prompt.ts` | `buildUserMessage()`, `buildAgentSystemPrompt(skillPath, customPrompt)` |
| `src/review.ts` | `runAgent()`, `mergeReviews()`, `buildReviewComments()`, `buildReview()` |
| `src/testing.ts` | Shared test fixtures (`buildModelReview`, `buildAnthropicToolUseResponse`, etc.) |
| `skills/*.md` | Vendored skill frameworks loaded at runtime by `buildAgentSystemPrompt()` |

### The five agent skills

Each skill file is loaded by `buildAgentSystemPrompt(skillPath, ...)` in `src/prompt.ts`. YAML frontmatter is stripped at load time.

| Skill file | Framework | Focus |
| --- | --- | --- |
| `skills/code-reviewer.md` | `pr-review-toolkit:code-reviewer` | Bug detection, project compliance, ≥80% confidence threshold |
| `skills/silent-failure-hunter.md` | `pr-review-toolkit:silent-failure-hunter` | Swallowed exceptions, empty catch blocks, silent fallbacks |
| `skills/pr-test-analyzer.md` | `pr-review-toolkit:pr-test-analyzer` | Test coverage gaps, criticality scoring 1–10 |
| `skills/security-sast.md` | `security-scanning:security-sast` | Injection, path traversal, XSS, hardcoded secrets |
| `skills/code-review-and-quality.md` | `addyosmani:code-review-and-quality` | 5-axis checklist: correctness, readability, architecture, security, performance |

`skills/code-review-excellence/SKILL.md` is not used at runtime — it was the source document for the review mindset philosophy embedded in the skill files above.

## Conventions & Patterns

- **TypeScript ESM** — `"type": "module"` in `package.json`; all imports use `.js` extensions even for `.ts` source files
- **No default exports** — named exports only
- **Vitest** for tests; test files colocated with source (`src/*.test.ts`)
- **Biome** for lint + format; run `npm run lint -- --write` to auto-fix
- **Conventional commits** for commit messages (`feat:`, `fix:`, `refactor:`, etc.)
- **No mocking of real skill files in tests** — `./prompt.js` is mocked wholesale in `review.test.ts`; the test mock exports `buildUserMessage` and `buildAgentSystemPrompt`
- **Structured output via tool use** — the `submit_review` tool schema is the single source of truth for `ModelReview`; the model is forced to call it via `tool_choice: { type: "tool", name: "submit_review" }`
- **Prompt caching** — `cache_control: { type: "ephemeral" }` on every agent's system prompt; the user message (diff) is not cached because it changes per PR

## Adding or replacing a skill

1. Add or update a `.md` file in `skills/`
2. Add its path to the `AGENT_SKILLS` array in `src/review.ts`
3. Run `npm test` — no test changes required unless the skill changes the output schema

## Environment variables

See `.env.example` for all variables. `REVIEW_ENABLED=true` is required to post reviews; without it the bot logs but does not submit.
