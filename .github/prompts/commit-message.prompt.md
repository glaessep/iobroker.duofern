---
agent: agent
---

# Commit Message Prompt

Write your commit message for the **staged files/changes** using the **Conventional Commits** format. This ensures clarity, traceability, and compatibility with automation tools.

**Do not include any files that are not staged.**
**Do not stage or commit files yourself—just generate the commit message.**
**Write it as copy-pastable text only.**

---

## Check Staged Files

Before writing your commit message, verify which files are staged:

```bash
git diff --cached --name-status
```

This shows all staged files with their status (M=modified, A=added, D=deleted, etc.).

---

## Guidelines 
Follow the instructions from the [CONTRIBUTING.md](../../CONTRIBUTING.md) file.

### Examples
**Good:**
- feat(parser): add support for nested trace blocks
- fix(git): handle dirty state detection for untracked files
- docs: update architecture overview in ENGINE.md

**Bad:**
- update code
- bugfix
- changes

### Tips
- Use the imperative mood in the description ("add", not "added" or "adds").
- Keep the first line under 72 characters.
- Use the body to explain *why* if the change is complex.
- For breaking changes, add `BREAKING CHANGE:` in the footer.
