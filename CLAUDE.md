# Final Slate Build: Standing Rules For Coding Sessions

## Checkpoint Rule (Certified By The User, November 6, 2026)

The user has given standing permission, for the whole duration of this build, to open a pull request **and merge it into `main`** at every stopping point:

- when a coherent piece of work is finished and its checks pass;
- before a context window is likely to reset, or when a session or environment limit is near;
- before switching to a large new item from `RESUME-HERE.md`.

At each checkpoint:

1. Run `npm run check` and the relevant `npm run e2e` tests. Never merge red checks; fix them or record the failure in `RESUME-HERE.md` first.
2. Update `RESUME-HERE.md` (and the affected reports) so the next session can continue without rereading everything.
3. Commit, push the working branch, open a pull request into `main` that summarizes the work and its test evidence, and merge it.
4. Continue on the working branch, restarted from the updated `main`.

This permission covers opening and merging pull requests into `main` for this repository's build work only. It does not cover force-pushing, rewriting history, deleting branches with unmerged work, deploying, or changing other repositories.

## Other Rules

- One primary agent only: no sub-agents, parallel agents or delegation.
- Read `RESUME-HERE.md` first; it lists remaining work in order.
- Keep `.playwright-mcp/`, `test-results/` and other generated artifacts out of commits.
- Report implemented, tested, source-verified, modeled and unverified work separately. Never claim unrun checks.
