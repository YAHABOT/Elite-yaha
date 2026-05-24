# Technical Log — V12: Google OAuth + Vercel Deployment

## Summary

Completed two major tasks:
1. **Added Google OAuth login** — users can now sign in via "Continue with Google" button
2. **Deployed to Vercel** — app live at https://yaha-flame.vercel.app with all environment variables configured

---

## Task 1: Google OAuth Integration

### Implementation

**OAuth Flow:**
- User clicks "Continue with Google" button → browser redirects to Google login (via Supabase)
- Google redirects back to `/auth/callback?code=xxx`
- Route handler exchanges code for session → redirect to `/dashboard`

**Files Created:**
- `src/app/auth/callback/route.ts` — OAuth callback handler that exchanges authorization code for session

**Files Modified:**
- `src/components/auth/LoginForm.tsx` — added:
  - Google OAuth button with proper icon (SVG)
  - `handleGoogleSignIn()` function using browser Supabase client
  - Divider UI between email/password form and Google button

**Key Decision:**
Google OAuth must use `createBrowserClient()` (client-side) because it requires redirecting to external Google domain. Server Actions can't initiate OAuth redirects.

---

## Task 2: Vercel Deployment

### Setup

1. **Authenticated with Vercel CLI** — `vercel whoami` → logged in as `yahabot`
2. **Linked project** — `vercel link --yes` → created `.vercel/` config
3. **Added environment variables** (8 total):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GEMINI_API_KEY`
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_WEBHOOK_SECRET`
   - `TELEGRAM_ALLOWED_HANDLES`
   - `NEXT_PUBLIC_APP_URL` (set to production URL)

4. **Deployed** — `vercel deploy --prod --yes`
   - Build succeeded in 21.7s
   - App live at **https://yaha-flame.vercel.app** (aliased from auto-generated URL)

### Build Status

✅ No compilation errors
⚠️ 14 linting warnings (unused imports/variables — not blocking)
✅ All static pages generated
✅ Route handler for `/auth/callback` deployed

---

## Post-Deployment Setup (User Manual Steps)

### Google Cloud Console
1. Create OAuth 2.0 Client ID (Web application)
2. Add authorized redirect URI:
   ```
   https://jfretlgjsthhmlmgmlog.supabase.co/auth/v1/callback
   ```
3. Get Client ID and Client Secret

### Supabase Dashboard
1. **Authentication** → **Sign In / Providers** → **Google**
   - Enable toggle
   - Paste Client ID and Client Secret
   - Save

2. **Authentication** → **URL Configuration**
   - Site URL: `https://yaha-flame.vercel.app`
   - Redirect URLs: add `https://yaha-flame.vercel.app/auth/callback`
   - Save

---

## Bug Fixes (Carried Over from V11)

### 1. Chat Cleanup TypeScript Errors
- Fixed bare `return` statements in `src/lib/db/chat-cleanup.ts`
- Changed `return` → `return deletedIds` (lines 25, 44)
- Cleanup logic already correct (deletes "New Chat" sessions idle 10+ minutes, regardless of message count)

### 2. Sidebar Staleness Issue
- Already implemented in `src/lib/db/chat.ts`
- `getSessions()` runs cleanup synchronously before fetch with 2s timeout
- Deleted sessions filtered from returned list
- No sidebar stale data issue

---

## Current State

✅ **Google OAuth** — Code complete, Supabase/Google Cloud configured by user, **LOGIN WORKING**
✅ **Vercel Deployment** — Live and working at https://yaha-flame.vercel.app
✅ **Environment Variables** — All configured
✅ **Chat Cleanup** — TypeScript fixed, logic correct

**App is fully functional with Google OAuth login on production.**

---

## Files Modified This Session

- `src/components/auth/LoginForm.tsx` — added Google OAuth button
- `src/app/auth/callback/route.ts` — new file, OAuth callback handler
- `src/lib/db/chat-cleanup.ts` — fixed TypeScript return statements

**Deployed:** https://yaha-flame.vercel.app
**Build Time:** 21.7s
**Date:** 2026-03-25
