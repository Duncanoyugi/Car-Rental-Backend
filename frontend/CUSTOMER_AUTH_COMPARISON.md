# Registration/Login Failure Analysis: Backend vs Frontend Mismatch

## Root Cause
**Frontend ignores backend's auto-login token from registration**, forcing a login attempt on **unverified email** → backend blocks with `\"Please verify your email before logging in.\"`

## Detailed Comparison

### Backend Logic (from CUSTOMER_AUTH_FLOW.md)
\`\`\`
POST /auth/register:
1. Create User: role='CUSTOMER', isEmailVerified=false
2. Send async verify email (may fail silently → console.error)
3. Generate JWT (unverified ok for register)
4. RETURN {access_token, user} ← Frontend IGNORES this

POST /auth/login (CUSTOMER):
- REQUIRES isEmailVerified=true
- Throw UnauthorizedException if false
\`\`\`

### Frontend Logic (from CUSTOMER_AUTH_FLOW.md)
\`\`\`
RegisterPage.tsx:
POST /auth/register → unwrap() → navigate('/login?registered=true')
❌ NO: dispatch(loginSuccess(result)) or store token

LoginPage.tsx:
POST /auth/login → loginSuccess(token) → if role='CUSTOMER' → /customer/dashboard
❌ FAILS: Backend blocks unverified CUSTOMER
\`\`\`

## Why It Fails (Step-by-Step)
\`\`\`
1. User /register → fills form → submit
2. Frontend → backend/register → User created (unverified)
3. Backend RETURNS token → Frontend REDIRECTS to /login (ignores token!)
4. User /login → submit email/pw
5. Backend checks: role='CUSTOMER' && !isEmailVerified → \"Please verify your email\"
6. Frontend: ErrorMessage displays → stuck
\`\`\`

## Additional Issues
1. **Email Delivery**: Backend email async/non-blocking; fails → no verify link → permanent block.
2. **No Verify UI**: Frontend lacks \`/verify-email?token=...\` page → can't complete flow.
3. **Social Auth**: Works (backend auto-verifies), but email register broken.
4. **Persistence**: localStorage token only on explicit loginSuccess.

## Evidence from Code
\`\`\`ts
// Backend auth.service.register():
return { access_token: jwt, user }  // Frontend doesn't use!

// Frontend RegisterPage onSubmit():
await registerUser(data).unwrap();  // Ignores result!
navigate('/login?registered=true');

// Backend auth.service.login():
if (user.role === 'CUSTOMER' && !user.isEmailVerified) {
  throw new UnauthorizedException('Please verify your email before logging in.');
}
\`\`\`

## Quick Fixes (Prioritized)

### Fix 1: Frontend Use Register Token (5 min) ⭐ **RECOMMENDED**
**RegisterPage.tsx** \`onSubmit\`:
\`\`\`tsx
const result = await registerUser(data).unwrap();
dispatch(loginSuccess(result));  // Store token!
navigate(result.user.role === 'CUSTOMER' ? '/customer/dashboard' : ...);
\`\`\`
→ Bypasses verify for now (matches backend intent).

### Fix 2: Add Email Verify Page (10 min)
- Create \`/verify-email?token=...\` → call backend /auth/verify-email → auto-login.

### Fix 3: Backend Allow Unverified Post-Register (2 min)
Remove login verify check or add \`justRegistered\` flag.

### Fix 4: Fix Email Delivery (test)
\`\`\`bash
# Check backend logs: \"Failed to send...\"
npm run start:dev
\`\`\`
- Use real SMTP.

### Fix 5: Frontend Notice
Login error: if \"verify email\" → resend/check link.

## Test Commands
\`\`\`bash
# Backend test
cd backend && npm run start:dev

# Frontend dev
cd frontend && yarn dev

# Manual: register → expect dashboard (post-fix)
\`\`\`

## Recommendation
**Fix 1 first** → immediate usability. Then verify flow.

This mismatch explains failures. Backend ready; frontend needs token handling.

