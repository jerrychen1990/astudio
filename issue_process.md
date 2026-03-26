# GitHub Issue Flow Process

## Override Rule

- Default process document: this file
- Repository override: if `<repo-root>/issue_process.md` exists, use the repository file as the authoritative process description for that repository

## Scope

This workflow is for issue-driven work with GitHub, local worktrees, PR creation, confirmation checkpoints, and post-merge cleanup.

## Preconditions

- Run from a git repository root
- Ensure `gh` is authenticated
- Default worktree root: `<repo-root>/.worktrees`
- Default base branch: `main`

Helpers shipped with the skill:

- `scripts/issue-start.sh`
- `scripts/issue-finish.sh`
- `scripts/notify-confirmation.sh`
- `scripts/issue-post-merge.sh`

## Start Phase

1. Read the issue and comments.
   - Prefer `gh issue view <issue-number> --json number,title,body,url,comments`
   - If needed, also run `gh issue view <issue-number> --comments`
2. Create a dedicated branch and worktree with `issue-start.sh`.
3. Use the generated worktree path for all implementation work.
4. Treat issue comments as part of the task definition.
5. Before implementation, produce a short plan:
   - issue understanding
   - comment-derived requirements
   - proposed solution
   - risks or assumptions
   - minimal verification plan

## Confirmation Modes

Choose one mode at the start of the run.

### Manual Mode

- Stop at `plan`
- Stop at `commit`
- Stop at `pr`
- If Feishu confirmation is enabled, notify at all three gates

### Auto Mode

- Do not stop or notify at `plan`
- Do not stop or notify at `commit`
- Still stop at `pr`
- If Feishu confirmation is enabled, notify only at `pr`
- Do not merge automatically unless the user explicitly confirms

If the user says "自动执行", interpret that as `auto` mode unless they also explicitly request merge automation.

## Feishu Notification

Feishu notification is optional per run. When enabled, use:

```bash
scripts/notify-confirmation.sh --gate <plan|commit|pr> --issue <issue-number> --bot "<bot-name>" --summary-file <file>
```

Rules:

- `plan`: notify only when Feishu confirmation is enabled for the run
- `commit`: notify only when Feishu confirmation is enabled for the run
- `pr`: notify when Feishu confirmation is enabled for the run
- In `auto` mode, only the `pr` gate should notify

The bot name may be:

- a stable key such as `approval`
- a configured Chinese display name such as `审批机器人`

## Finish Phase

1. Run the smallest useful verification.
2. Before any commit is created, stay in the current worktree and start the DV environment service for user validation.
3. Wait for the user to test against that running DV service and explicitly confirm that the result is acceptable.
4. In `manual` mode, stop for commit confirmation.
5. Create the commit with `issue-finish.sh` only after the DV validation and explicit user confirmation are both complete.
6. Push the branch.
7. Create the PR.
8. Stop at the PR gate.
9. Merge only after explicit user confirmation.

Rules for the commit gate:

- Start the DV environment service from the current worktree, not from the repository root or another sibling worktree
- Keep the service available until the user finishes testing or explicitly says it can be stopped
- Do not create the commit if the DV service has not been started, if the user has not tested yet, or if the user has not clearly approved moving forward

Common command:

```bash
scripts/issue-finish.sh --issue <issue-number> --message "<commit-message>"
```

Merge during the same run:

```bash
scripts/issue-finish.sh --issue <issue-number> --message "<commit-message>" --merge
```

## Worktree Handling

- Skill-created worktrees live under `<repo-root>/.worktrees`
- `issue-start.sh` adds `.worktrees/` to `<repo-root>/.git/info/exclude`
- This avoids repository `.gitignore` changes for local-only worktrees

## Cleanup Rules

### During Same Run

- If `issue-finish.sh --merge` is used and merge succeeds, the current worktree should be removed automatically

### After External Merge

If the PR is merged outside the current Codex run, finish the workflow with:

```bash
scripts/issue-post-merge.sh --branch "<branch-name>"
```

This does:

- verify the PR is merged
- remove the corresponding non-main worktree
- try to delete the local branch
- `git checkout main`
- `git pull --ff-only`

## Reopen / Revisit Behavior

Stale worktrees can interfere with later issue handling because:

- an existing local branch can block a new `issue-start.sh`
- an existing worktree path can block a new `issue-start.sh`

If an issue is reopened or resumed later, clean up merged or abandoned worktrees before starting a new run.

## Notes

- `notify-confirmation.sh` is a helper, not an implicit background trigger
- `issue-post-merge.sh --watch` supports polling, not passive GitHub event subscription
- If a repository provides its own `scripts/issue-start.sh` or `scripts/issue-finish.sh`, repository-specific behavior may override the skill defaults
