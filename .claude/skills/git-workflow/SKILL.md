---
name: git-workflow
description: Git workflow for KidsProgress contributors: branch naming, commit message format, when to amend vs new commit, PR submission checklist. Use when committing, pushing, opening a PR, or any git operation.
---

# Git Workflow & Commit Guidelines

## Commit Message Rules

### DO NOT Include in Commit Messages

**NEVER add these lines to commit messages:**
```
馃 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

These tags should **ONLY** be added automatically by hooks or the user's preference, never manually by the assistant.

### Commit Message Structure

Use conventional commit format with clear, concise messages:

```
<type>: <short summary>

<brief description (only key information)>

<breaking changes if any>
```

**IMPORTANT: Keep commit messages concise**
- Include only key information, not wordy explanations
- Avoid verbose descriptions
- Focus on "what" and "why", skip obvious details

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring
- `docs`: Documentation changes
- `style`: Formatting, missing semicolons, etc.
- `test`: Adding tests
- `chore`: Maintenance tasks

### Good Commit Message Examples

```bash
# 鉁?Good - Concise with key info only
git commit -m "feat: Add device management CRUD

- Device model, service, routes
- Device list/edit/remove modals
- i18n support (en/zh)"

# 鉁?Good - Simple and clear
git commit -m "fix: Correct language display in settings page"

# 鉁?Good - Brief explanation
git commit -m "refactor: Split PIN management into set/change/remove modals"
```

### Bad Commit Message Examples

```bash
# 鉁?Bad - Contains generated-by tags
git commit -m "feat: Add device management

馃 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# 鉁?Bad - Too wordy
git commit -m "feat: Add device management

Previously, users could not manage their devices. This was a problem
because users needed to track which devices were trusted. Now we have
implemented a complete device registration system that allows users
to manage all their devices. This includes backend implementation
with device model, service layer, and API routes. On the frontend,
we added device list with full CRUD operations including edit and
remove modals. We also ensured full i18n support for both English
and Chinese languages, and integrated everything into the settings page."

# 鉁?Bad - Too vague
git commit -m "update stuff"

# 鉁?Bad - No context
git commit -m "fix bug"
```

---

## Git Commit Workflow

### Before Committing

1. **Check status:**
   ```bash
   git status
   ```

2. **Review changes:**
   ```bash
   git diff --stat
   ```

3. **Stage files:**
   ```bash
   git add -A  # Add all changes
   # OR
   git add <specific-files>  # Add specific files
   ```

### Creating Commits

1. **Write descriptive commit message:**
   ```bash
   git commit -m "$(cat <<'EOF'
   feat: Implement dual authentication system

   Features:
   - Dual token system with trusted/temporary devices
   - Auto-refresh token mechanism
   - Parent Portal PIN support
   - Device management UI

   Backend:
   - RefreshToken model with JWT implementation
   - Device CRUD operations

   Frontend:
   - Login checkbox for device selection
   - Device management in settings
   - Complete i18n support
   EOF
   )"
   ```

2. **Verify commit:**
   ```bash
   git log -1 --stat
   ```

### Commit Best Practices

#### DO:
- 鉁?Write clear, descriptive commit messages
- 鉁?Group related changes in one commit
- 鉁?Commit frequently with logical boundaries
- 鉁?Include "what" and "why" in the message
- 鉁?Use present tense ("Add feature" not "Added feature")
- 鉁?Reference issue numbers if applicable

#### DON'T:
- 鉂?Include generated-by or co-authored-by tags manually
- 鉂?Write wordy, verbose commit messages
- 鉂?Add git ignored files
- 鉂?Commit broken code
- 鉂?Mix unrelated changes in one commit
- 鉂?Use vague messages like "fix", "update", "changes"
- 鉂?Commit commented-out code
- 鉂?Commit secrets or sensitive data

---

## Branching Strategy

### Branch Naming

```bash
# Feature branches
feature/user-authentication
feature/task-management

# Bug fix branches
fix/login-redirect
fix/token-expiration

# Refactor branches
refactor/api-client
refactor/component-structure
```

### Working with Branches

```bash
# Create and switch to new branch
git checkout -b feature/device-management

# Switch between branches
git checkout main
git checkout feature/device-management

# List branches
git branch -a

# Delete local branch
git branch -d feature/device-management
```

---

## Common Git Operations

### Checking Commit History

```bash
# View recent commits
git log --oneline -10

# View commits ahead of remote
git log origin/main..HEAD --oneline

# View detailed commit info
git log -1 --stat
```

### Undoing Changes

```bash
# Unstage files (keep changes)
git restore --staged <file>

# Discard local changes
git restore <file>

# Amend last commit (if not pushed)
git commit --amend -m "Updated message"
```

### Working with Remote

```bash
# Push commits
git push origin branch-name

# Pull latest changes
git pull origin branch-name

# Fetch without merging
git fetch origin
```

---

## Pre-commit Checklist

Before creating a commit, verify:

- [ ] All tests pass
- [ ] No console.log or debugging code
- [ ] No commented-out code
- [ ] No hardcoded values that should be env vars
- [ ] No sensitive data (API keys, passwords)
- [ ] Code follows project style guidelines
- [ ] i18n translations added if needed
- [ ] Types are properly defined
- [ ] Error handling is in place

---

## Commit Message Template

```bash
<type>: <Short summary (50 chars or less)>

<Detailed description if needed>

Changes:
- <Change 1>
- <Change 2>
- <Change 3>

Backend:
- <Backend change 1>
- <Backend change 2>

Frontend:
- <Frontend change 1>
- <Frontend change 2>

UI/UX:
- <UI/UX improvement 1>
- <UI/UX improvement 2>
```

---

## Error Recovery

### Common Issues

**1. Accidentally committed sensitive data:**
```bash
# Remove from last commit (if not pushed)
git reset --soft HEAD~1
# Remove file from staging
git restore --staged <sensitive-file>
# Add to .gitignore
echo "<sensitive-file>" >> .gitignore
# Commit again without sensitive file
git commit
```

**2. Wrong commit message:**
```bash
# Amend last commit message (if not pushed)
git commit --amend -m "Corrected message"
```

**3. Forgot to add files:**
```bash
# Add files to last commit (if not pushed)
git add <forgotten-files>
git commit --amend --no-edit
```

---

## Remember

> "Good commit messages are documentation for future developers (including yourself)."

> "Never manually add generated-by or co-authored-by tags - let hooks handle that."

> "Commit early, commit often, but always commit with purpose."
