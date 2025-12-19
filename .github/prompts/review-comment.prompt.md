# PR Review Comment Handler

## Usage

**To use this prompt:**
1. Make sure you're on the PR branch (the active PR will be automatically detected from the repository context)
2. Reference this prompt in your message: `@workspace /prompts/review-comment.prompt.md`
3. Or simply say: "Review all unresolved comments on PR #2" (replacing with your PR number)

**The PR information is automatically available through:**
- Repository context attachment (shows active PR)
- Current branch name
- You can also explicitly specify: "Review PR #2" if needed

## Objective
Review and address all unresolved review comments on the current pull request syste (available in repository context attachment). Filter for unresolved comments only.

Use the repository owner and name from context:
- Owner: Extract from repository context attachment
- Repo: Extract from repository context attachment  
- PR number: From active PR in repository context, or explicitly provided by userplement the suggested fix or provide a reasoned explanation for not doing so.

## Critical Rules
1. **Individual Thread Responses**: Post a response directly in each review comment thread - do NOT post a single summary comment
2. **Never Resolve**: Never mark comments as resolved - only the user can do this
3. **Read Before Acting**: Carefully read and understand each comment before taking action
4. **Think Before Fixing**: Consider whether the suggested change is appropriate for this codebase
5. **Document Everything**: Every comment must receive a direct response explaining what was done or why it wasn't done

## Workflow

### Step 1: Fetch Review Comments
Activate GitHub PR management tools and fetch all review comments for the active PR. Filter for unresolved comments only.

### Step 2: Analyze Each Comment
For each comment:
- Read the full comment text carefully
- Identify the file and line(s) being discussed
- Understand the concern or suggestion
- Evaluate whether it applies to this project's context and standards
- Check the attached instructions (CONTRIBUTING.md, .github/copilot-instructions.md) for project-specific guidelines

### Step 3: Make a Decision
Decide whether to:
- **Fix**: The comment identifies a valid issue that should be addressed
- **Skip**: The comment is informational, already addressed, or not applicable
- **Discuss**: The comment requires clarification or presents trade-offs

### Step 4: Take Action
If fixing:
1. Make the necessary code changes
2. Test that the changes don't break anything (run lint/build if applicable)
3. Document the fix in the comment thread

If not fixing:
1. Provide a clear, respectful explanation in the comment thread
2. Reference project standards or technical reasons as appropriate

### Step 5: Reply in Comment Thread

**How to Reply to Review Comment Threads:**

Review comments appear inline on specific lines of code. To reply directly to these comments (not as a general PR comment), use the GitHub API endpoint:

```
POST /repos/{owner}/{repo}/pulls/comments/{comment_id}/replies
```

**Implementation:**
```bash
curl -X POST \
  -H "Authorization: token $(gh auth token)" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/{owner}/{repo}/pulls/{pr}/comments/{comment_id}/replies" \
  -d '{"body":"Your response message here"}'
```

**Note:** Do NOT use `mcp_github_add_issue_comment` - that posts general PR comments, not replies to specific review threads.

### Response Format
Use this format for your responses:

**If fixed:**
```
✅ **Fixed!** [Brief description of what was changed]

[Optional: Additional context or explanation]
```

**If not fixing:**
```
💭 **Considered but not fixing:** [Clear explanation]

[Reasoning why this doesn't apply or isn't the right approach]
```

**If needs discussion:**
```
🤔 **Needs clarification:** [Question or concern]

[What you need to understand before proceeding]
```

## Important Notes

- **No Summary Comments**: Do not post a summary comment at the end - each review comment should have its own individual response
- **Respect Project Standards**: Always defer to this project's coding standards, contribution guidelines, and architectural decisions
- **Be Thorough**: Don't skip any unresolved review comments
- **Test Your Changes**: After fixing issues, ensure the code still builds and passes lint checks
- **Commit Separately**: Consider whether changes should be in one commit or multiple focused commits
- **Reference Issues**: If a review comment relates to an issue number, mention it in your response

## Example Scenario

**Review Comment:**
> Consider adding input validation before calling `.toUpperCase()` to prevent potential errors with null/undefined values.

**Action:**
1. Read the comment and locate the code
2. Verify the concern is valid (yes, `toUpperCase()` would throw if called on null)
3. Add validation: `if (!value || value.length !== 6) { return; }`
4. Reply in the review thread:

```
✅ **Fixed!** Added length validation before `.toUpperCase()` call to prevent errors.

Now checking `value.length !== 6` before any string operations, which handles null, undefined, and invalid length inputs.
```

## Error Handling

If you encounter issues:
- **Cannot find comment thread**: Verify the PR number and comment ID are correct
- **Authentication failure**: Check that `gh auth token` works correctly
- **API rate limits**: Wait and retry, or consolidate responses if possible
- **Unclear comment**: Post a clarifying question in the thread rather than guessing

## Success Criteria

You've completed this task successfully when:
- [ ] Every unresolved review comment has received a direct response in its thread
- [ ] All valid issues have been fixed with code changes
- [ ] All responses are clear, professional, and helpful
- [ ] No comments have been resolved (user will do this)
- [ ] Code still builds and passes checks after changes
