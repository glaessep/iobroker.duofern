---
agent: agent
---

# Commit Message Prompt

Write your commit message for the **staged files/changes** using the **Conventional Commits** format. This ensures clarity, traceability, and compatibility with automation tools.

## OUTPUT FORMAT (CRITICAL)

**Output the commit message in a single markdown code block with NO additional commentary.**

### ❌ WRONG - Do NOT output:

```
Here's your commit message:

feat(parser): add support for device type detection

This commit adds...
```

### ❌ WRONG - Do NOT output:

```
I've analyzed the staged changes. Here's the commit message:

feat(parser): add support for device type detection
```

### ✅ CORRECT - Output this exactly:

````
```
feat(parser): add support for device type detection

Add device type detection based on the first two hex digits
of the device code. This enables automatic capability detection
for future features.
```
````

**RULES:**

- NO introductory text like "Here's your commit message:" or "I've analyzed the changes and..."
- NO explanations before or after the code block
- Put the ENTIRE commit message inside a single markdown code block (```)
- The FIRST LINE inside the code block MUST be the commit type (feat:, fix:, docs:, etc.)
- The code block makes it easy to copy-paste into `git commit` or a git client

**Do not include any files that are not staged.**
**Do not stage or commit files yourself—just generate the commit message.**

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

### Structure

1. **Header**: `<type>(<scope>): <description>` (max 72 chars)
2. **Body**: (Optional) Detailed explanation of the change.
3. **Footer**: (Optional) Breaking changes or issue references.

### Template

Your output should be a single code block following this structure:

````
```
<type>(<scope>): <description>

[optional body paragraph explaining why this change was made]

[optional footer with issue references or breaking changes]
```
````

**Example output (exactly as it should appear):**

````
```
feat(protocol): add tilt position control for blinds

Implement tilt position commands (0-100) for DuoFern blinds
with support for both absolute positioning and incremental
adjustments. This enables fine-grained control of blind slats.

Closes #42
```
````

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
- Use the body to explain _why_ if the change is complex.
- For breaking changes, add `BREAKING CHANGE:` in the footer.
