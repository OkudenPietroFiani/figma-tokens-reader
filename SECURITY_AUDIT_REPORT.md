# Security Audit Report
**Date:** 2025-11-08
**Repository:** figma-tokens-reader
**Auditor:** Claude (Automated Security Review)

---

## Executive Summary

This security audit reviewed the figma-tokens-reader repository for sensitive data exposure, security vulnerabilities, and potential risks. The audit found **NO CRITICAL SECURITY ISSUES** with hardcoded secrets or sensitive data committed to GitHub. However, several **MEDIUM to HIGH priority security concerns** were identified that should be addressed to improve the overall security posture of the application.

---

## ✅ Positive Findings

### 1. No Hardcoded Secrets
- **Status:** ✅ PASS
- No hardcoded API keys, tokens, passwords, or credentials found in the codebase
- The only occurrence of `ghp_` is a placeholder in an HTML input field (ui-old.html:955)

### 2. Clean Git History
- **Status:** ✅ PASS
- No accidentally committed secrets found in git history
- No deleted sensitive files (.env, .pem, .key files) in git history
- Git log analysis shows no suspicious credential commits

### 3. No Sensitive Files Tracked
- **Status:** ✅ PASS
- No `.env` files or similar configuration files with secrets
- No certificate files (.pem, .key, .cert) found in repository
- No `credentials.json` or similar files committed

### 4. Proper .gitignore Configuration
- **Status:** ✅ PASS
- Excludes `node_modules/`, logs, IDE files, and temporary files
- Excludes `package-lock.json` (prevents lock file conflicts)

### 5. Network Access Restriction
- **Status:** ✅ PASS
- `manifest.json` properly restricts network access to `https://api.github.com` only
- No unrestricted network access configured

---

## ⚠️ Security Concerns Identified

### 1. GitHub Personal Access Token Storage (HIGH PRIORITY)
**Location:** `src/backend/services/StorageService.ts:69-82`, `src/backend/services/StorageService.ts:88-100`

**Issue:**
GitHub Personal Access Tokens (PATs) are stored in plain text in Figma's `clientStorage`:

```typescript
// StorageService.ts - Lines 69-82
async saveGitHubConfig(config: GitHubConfig): Promise<Result<void>> {
  const serialized = JSON.stringify(config);
  await figma.clientStorage.setAsync(STORAGE_KEYS.GITHUB_CONFIG, serialized);
  // config contains: { token, owner, repo, branch, files }
}
```

**Risk:**
- GitHub PATs grant access to user repositories
- If an attacker gains access to Figma's client storage, they can extract tokens
- Tokens are stored indefinitely unless manually cleared
- No encryption or obfuscation applied

**Recommendation:**
1. **Document security implications** in README and code comments
2. **Warn users** that tokens are stored locally and may persist
3. **Add token expiration checks** and prompt users to re-authenticate periodically
4. **Consider implementing token encryption** before storage (though keys would still need to be managed)
5. **Provide a "Clear Token" button** in the UI for easy credential removal
6. **Recommend users create tokens with minimal scope** (read-only repository access)

**Alternative Approach:**
- Consider implementing OAuth flow instead of PAT storage
- Use short-lived tokens that expire after session

---

### 2. Cross-Site Scripting (XSS) Vulnerabilities (MEDIUM-HIGH PRIORITY)
**Location:** Multiple files using `innerHTML`

**Issue:**
Multiple instances of `innerHTML` usage with potentially unsanitized data:

**Critical Instances:**

1. **ImportScreen.ts:249-259** - File paths from GitHub API injected into HTML:
```typescript
fileList.innerHTML = `
  <div class="file-list-header">Select files to sync (${files.length} found)</div>
  ${files.map(file => `
    <div class="file-item">
      <input type="checkbox" class="file-checkbox" value="${file}" id="file-${file}" checked>
      <label for="file-${file}">
        <div class="file-name">${file.split('/').pop()}</div>
        <div class="file-path">${file}</div>
      </label>
    </div>
  `).join('')}
`;
```

**Risk:**
- If GitHub API returns malicious file paths containing `<script>` tags or event handlers
- Attacker-controlled repository could inject XSS payloads via file names
- Could lead to token theft, session hijacking, or malicious actions

**Example Attack:**
```
File path: `<img src=x onerror=alert(document.cookie)>.json`
```

**Other Vulnerable Locations:**
- `src/frontend/components/TokenScreen.ts:126-130` - File names in tabs
- `src/frontend/components/TokenScreen.ts:159-170` - Token tree content
- `src/frontend/components/ScopeScreen.ts:214` - Collection names
- `ui.js`, `ui.html`, `ui-old.html` - Multiple instances

**Recommendation:**
1. **Use textContent instead of innerHTML** where possible:
   ```typescript
   element.textContent = userInput; // Safe
   // Instead of: element.innerHTML = userInput; // Unsafe
   ```

2. **Implement HTML sanitization** for user-controlled data:
   ```typescript
   function escapeHtml(unsafe: string): string {
     return unsafe
       .replace(/&/g, "&amp;")
       .replace(/</g, "&lt;")
       .replace(/>/g, "&gt;")
       .replace(/"/g, "&quot;")
       .replace(/'/g, "&#039;");
   }
   ```

3. **Use DOMPurify library** for complex HTML sanitization
4. **Implement Content Security Policy (CSP)** headers if possible in Figma plugin environment

---

### 3. Missing Security Headers and Configurations (LOW-MEDIUM PRIORITY)

**Issue:**
No `.env.example` file or documentation about environment variables

**Recommendation:**
1. Create `.env.example` to document expected environment variables (even if empty)
2. Add security documentation to README

---

### 4. Dependency Management (MEDIUM PRIORITY)

**Issue:**
- `package-lock.json` is excluded from git (in `.gitignore`)
- Cannot run `npm audit` to check for vulnerable dependencies
- No way to verify dependency integrity across installations

**Current Dependencies:**
```json
"devDependencies": {
  "@figma/eslint-plugin-figma-plugins": "*",
  "@figma/plugin-typings": "*",
  "@typescript-eslint/eslint-plugin": "^6.12.0",
  "@typescript-eslint/parser": "^6.12.0",
  "esbuild": "^0.25.11",
  "eslint": "^8.54.0",
  "typescript": "^5.3.2"
}
```

**Recommendation:**
1. **Include `package-lock.json` in git** to ensure consistent dependency versions
2. **Run `npm audit`** regularly to check for vulnerabilities
3. **Set up automated dependency scanning** (Dependabot, Snyk, etc.)
4. **Update `.gitignore`** to remove `package-lock.json` exclusion

---

### 5. Input Validation (LOW-MEDIUM PRIORITY)

**Issue:**
Limited validation on user inputs for GitHub configuration

**Locations:**
- `src/frontend/components/ImportScreen.ts:191-232` - GitHub fetch files handler
- Repository URL parsing uses regex but doesn't validate thoroughly

**Recommendation:**
1. **Validate GitHub URLs** more strictly
2. **Validate branch names** (prevent command injection via branch names)
3. **Add rate limiting** for API requests
4. **Validate file paths** from GitHub API before processing

---

### 6. Error Information Disclosure (LOW PRIORITY)

**Issue:**
Detailed error messages may expose internal implementation details

**Locations:**
- `src/services/githubService.ts:30-31` - Exposes GitHub API error details
- Various console.error statements throughout codebase

**Recommendation:**
1. **Sanitize error messages** shown to users
2. **Log detailed errors** for debugging but show generic messages to users
3. **Remove sensitive info** from error messages in production

---

## 🔒 Additional Security Recommendations

### 1. Security Policy
- Create `SECURITY.md` file documenting:
  - How to report security vulnerabilities
  - Security update policy
  - Supported versions

### 2. Environment Configuration
Update `.gitignore` to explicitly exclude:
```gitignore
# Secrets and credentials
.env
.env.*
!.env.example
*.pem
*.key
*.cert
credentials.json
secrets.json

# Security
.secret
.secrets/
```

### 3. Code Review Checklist
Implement security-focused code review process:
- [ ] No hardcoded credentials
- [ ] Input validation on all user inputs
- [ ] HTML sanitization for innerHTML usage
- [ ] Proper error handling without information disclosure
- [ ] Dependency updates reviewed for security

### 4. Documentation
Add security section to README.md:
- Token storage implications
- Recommended GitHub token scopes
- Security best practices for users
- How to clear stored credentials

---

## Summary of Recommended Actions

### Immediate Actions (HIGH Priority)
1. ✅ Add warning to README about GitHub token storage
2. ✅ Update `.gitignore` to exclude additional secret patterns
3. ⚠️ Fix XSS vulnerabilities in `innerHTML` usage
4. ⚠️ Add HTML sanitization function

### Short-term Actions (MEDIUM Priority)
1. Include `package-lock.json` in repository
2. Run `npm audit` and fix any vulnerabilities
3. Implement input validation for all user inputs
4. Add "Clear Credentials" functionality in UI

### Long-term Actions (LOW Priority)
1. Consider OAuth flow instead of PAT storage
2. Implement Content Security Policy
3. Add automated security scanning to CI/CD
4. Create SECURITY.md file

---

## Conclusion

The repository is **SAFE for public use** with no critical security issues found. However, the identified concerns around token storage and XSS vulnerabilities should be addressed to improve security posture. The recommended actions above will significantly enhance the security of this Figma plugin.

**Overall Security Rating:** ⚠️ MEDIUM (Safe, but improvements needed)

---

**Audit Complete**
