# Git Push Troubleshooting Guide

## Common Issues and Solutions

### Issue 1: "Everything up-to-date"

**Symptom:**
```
Everything up-to-date
```

**Cause:** No new commits to push. Changes weren't committed.

**Solution:**
```bash
# Check if you have uncommitted changes
git status

# If you see modified files, add and commit them
git add .
git commit -m "Your commit message"
git push origin main
```

---

### Issue 2: "Failed to push some refs"

**Symptom:**
```
! [rejected]        main -> main (fetch first)
error: failed to push some refs to 'github.com/...'
```

**Cause:** Remote repository has commits you don't have locally.

**Solution:**
```bash
# Pull the latest changes first
git pull origin main --rebase

# Then push
git push origin main
```

---

### Issue 3: "Authentication failed"

**Symptom:**
```
remote: Invalid username or password
fatal: Authentication failed
```

**Cause:** Git credentials expired or incorrect.

**Solution:**

**Option A: Use Personal Access Token (Recommended)**
1. Go to GitHub → Settings → Developer settings → Personal access tokens
2. Generate new token (classic) with `repo` scope
3. Copy the token
4. When pushing, use token as password

**Option B: Update Credentials**
```bash
# Windows Credential Manager
git config --global credential.helper wincred

# Or use GitHub CLI
gh auth login
```

---

### Issue 4: "Permission denied (publickey)"

**Symptom:**
```
Permission denied (publickey).
fatal: Could not read from remote repository.
```

**Cause:** SSH key not set up or incorrect.

**Solution:**

**Option A: Switch to HTTPS**
```bash
# Check current remote URL
git remote -v

# If it's SSH (git@github.com:...), change to HTTPS
git remote set-url origin https://github.com/drorcommit-spec/newcapacityplanning.git
```

**Option B: Set up SSH key**
```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "your_email@example.com"

# Add to GitHub: Settings → SSH and GPG keys → New SSH key
# Copy public key
cat ~/.ssh/id_ed25519.pub
```

---

### Issue 5: "Merge conflicts"

**Symptom:**
```
CONFLICT (content): Merge conflict in file.txt
Automatic merge failed; fix conflicts and then commit the result.
```

**Cause:** Same file modified both locally and remotely.

**Solution:**
```bash
# 1. Check which files have conflicts
git status

# 2. Open conflicted files and resolve conflicts
# Look for markers: <<<<<<<, =======, >>>>>>>

# 3. After resolving, add the files
git add .

# 4. Continue the rebase
git rebase --continue

# 5. Push
git push origin main
```

---

### Issue 6: "Repository not found"

**Symptom:**
```
remote: Repository not found.
fatal: repository 'https://github.com/...' not found
```

**Cause:** Wrong repository URL or no access.

**Solution:**
```bash
# Check remote URL
git remote -v

# Update to correct URL
git remote set-url origin https://github.com/drorcommit-spec/newcapacityplanning.git

# Verify
git remote -v
```

---

## Diagnostic Commands

### Check Current Status
```bash
# See what's changed
git status

# See uncommitted changes
git diff

# See staged changes
git diff --cached

# See commit history
git log --oneline -5
```

### Check Remote Connection
```bash
# View remote URLs
git remote -v

# Test connection
git ls-remote origin

# Check if ahead/behind
git status -sb
```

### Check Authentication
```bash
# View git config
git config --list

# Check credential helper
git config credential.helper

# Test GitHub connection
ssh -T git@github.com
```

---

## Prevention Tips

### 1. Always Pull Before Push
```bash
git pull origin main --rebase
git push origin main
```

### 2. Commit Regularly
```bash
# Don't accumulate too many changes
git add .
git commit -m "Descriptive message"
```

### 3. Use Safe Deploy Script
```bash
# Use the provided script that handles common issues
safe-deploy.bat
```

### 4. Check Status Before Committing
```bash
git status
git diff
```

---

## Quick Reference Scripts

### Diagnose Issues
```bash
diagnose-git.bat
```

### Safe Deployment
```bash
safe-deploy.bat
```

### Force Push (Use with Caution!)
```bash
# Only if you're sure and working alone
git push origin main --force
```

---

## When to Use Each Script

| Script | When to Use |
|--------|-------------|
| `safe-deploy.bat` | Normal deployment, handles most issues |
| `diagnose-git.bat` | When push fails, to understand why |
| `fix-and-deploy.bat` | After fixing specific build errors |
| `commit-and-deploy.bat` | Quick commit and push |

---

## Getting Help

If none of these solutions work:

1. Run `diagnose-git.bat` and save the output
2. Check GitHub repository settings
3. Verify you have write access to the repository
4. Check GitHub status: https://www.githubstatus.com/
5. Try pushing from GitHub Desktop or VS Code

---

## Common Workflow

**Normal workflow:**
```bash
# 1. Make changes to files
# 2. Check what changed
git status

# 3. Add changes
git add .

# 4. Commit
git commit -m "Description of changes"

# 5. Pull latest (in case others pushed)
git pull origin main --rebase

# 6. Push
git push origin main
```

**Using safe script:**
```bash
# Just run this - it handles everything
safe-deploy.bat
```

---

## Emergency Recovery

**If everything is broken:**
```bash
# 1. Save your changes
git stash

# 2. Reset to remote
git fetch origin
git reset --hard origin/main

# 3. Apply your changes back
git stash pop

# 4. Commit and push
git add .
git commit -m "Recovery commit"
git push origin main
```

**⚠️ Warning:** This will overwrite local changes with remote. Use only if necessary!
