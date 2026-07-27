---
description: Create a new git worktree under .worktrees/
agent: build
---

Create a git worktree from the name the user typed after `/worktree `.

Steps:
1. Take everything after `/worktree ` as the raw name.
2. Sanitize it: replace spaces with `-`, remove any character that is not a letter, number, `-`, or `_`, collapse consecutive `-` into one, and strip leading/trailing `-`.
3. Run: `mkdir -p .worktrees && git worktree add ".worktrees/<sanitized-name>"`

Do not ask questions, do not explain. Just run the command.
