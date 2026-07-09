# Agent Workflow Rules

These rules apply to Codex and automation work in this repository.

## Clean Main

- Keep `main` clean, deployable, and aligned with `origin/main`.
- Start every task with `git status --short`.
- If the repo is dirty, stop before editing. Classify every modified or untracked file as related to the current task, generated automation output, stale leftover work, unknown, or user-owned work.
- Do not mix unrelated work in one commit. UI/code, news refreshes, roster refreshes, contract refreshes, and production data refreshes must stay separate.
- Do not push or deploy without explicit user approval.

## Branch Lanes

- Feature/UI/code work: `codex/feature-<short-topic>` or another clearly scoped `codex/` branch.
- News refreshes: `codex/review-news-refresh-YYYY-MM-DD`.
- Roster refreshes: `codex/review-roster-refresh-YYYY-MM-DD`.
- Contract refreshes: `codex/review-contract-refresh-YYYY-MM-DD`.
- Production data refreshes: `codex/review-production-data-refresh-YYYY-MM-DD`.

Use separate worktrees or branches for recurring automation so failed runs never leave `main` dirty.

## Review Policy

- Low-risk news-only generated refreshes may be auto-committed only after their checks pass.
- Roster policy, cap math, contract logic, parser behavior, data-model changes, and generated roster/contract data require review before production deploy.
- Failed automation must preserve logs or review artifacts without dirtying `main`.

## Required Checks By Lane

- News: run the news refresh tests, including `pnpm test src/lib/news.test.ts tests/news-refresh-cli.test.ts` when those files are relevant.
- Roster: run `pnpm roster` and roster/player-contract tests when roster overlays or transaction data change.
- Contracts: validate JSON, run the contract import script, and run player-contract tests.
- UI/code: run targeted tests where available, `pnpm lint`, and `pnpm build` when the change could affect build output.
- All lanes: run `git diff --check` before asking for commit approval.

See `docs/workflow-guardrails.md` for the full workflow.
