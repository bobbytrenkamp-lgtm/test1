# Supabase Authentication Setup

This guide enables the account system — sign-in, profiles, preference sync, and saved items — for the US Data Center & AI Policy Tracker.

## Overview

Authentication is built on [Supabase](https://supabase.com), a hosted Postgres database with built-in auth. Only the public project URL and anonymous (anon) key are stored in the frontend. All user data is protected by Row Level Security (RLS) policies enforced on the Supabase server. The site works without any Supabase configuration — auth is an additive layer.

---

## Step 1 — Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and sign in or create a free account.
2. Click **New project**.
3. Enter a project name (e.g. `dc-ai-tracker`), set a database password (store it securely — you will not need it in the frontend), and choose a region.
4. Wait about 60–90 seconds for provisioning to complete.

---

## Step 2 — Run the database schema

1. In your project dashboard, go to **SQL Editor → New query**.
2. Open `data/supabase_schema.sql` from this repository and paste the entire contents.
3. Click **Run** (Cmd/Ctrl+Enter).
4. Confirm the output shows no errors.

This creates three tables with RLS enforced:

| Table | Purpose |
|-------|---------|
| `profiles` | Display name and avatar, auto-created on signup via trigger |
| `user_preferences` | Per-key preference store (`theme`, stock favorites, map bookmarks) |
| `saved_items` | Saved counties, news articles, and stocks |

---

## Step 3 — Get your API credentials

1. Go to **Settings → API** in your Supabase project.
2. Copy the **Project URL** (format: `https://xxxxxxxxxxx.supabase.co`).
3. Copy the **anon / public** key listed under "Project API keys".
4. **Do not copy the `service_role` key** — it must never appear in frontend code or the repository.

---

## Step 4 — Update the config file

Open `js/supabase-config.js` and replace the two placeholder values:

```js
window.APP_CONFIG = {
  SUPABASE_URL: 'https://xxxxxxxxxxx.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
};
```

The anon key is safe to commit to GitHub — it is designed to be public and is scoped to exactly what the RLS policies allow. No other secrets belong in this file.

---

## Step 5 — Configure redirect URLs in Supabase

Password-reset emails contain a link that redirects back to your site. You must register the site URL:

1. Go to **Authentication → URL Configuration**.
2. Set **Site URL** to:
   ```
   https://bobbytrenkamp-lgtm.github.io/test1/
   ```
3. Add the same URL to **Redirect URLs**.

Without this step, password-reset links will redirect incorrectly.

---

## Step 6 — (Optional) Adjust email confirmation settings

By default Supabase requires users to confirm their email before signing in.

1. Go to **Authentication → Providers → Email**.
2. Toggle **Confirm email** on or off.
   - **On** (recommended): users receive a confirmation email and must click it before signing in.
   - **Off**: users can sign in immediately after creating an account.

---

## Step 7 — Push and deploy

```bash
git add js/supabase-config.js
git commit -m "Enable Supabase auth — configure project URL and anon key"
git push origin main
```

GitHub Pages deploys automatically within about 60 seconds.

---

## Verification checklist

Visit `https://bobbytrenkamp-lgtm.github.io/test1/` after deploying and confirm:

- [ ] A person icon appears in the header (between the `?` button and the theme toggle)
- [ ] Clicking it opens the sign-in modal
- [ ] Creating an account with email and password succeeds
- [ ] Email confirmation arrives and the link works (if confirmation is enabled)
- [ ] Signing in shows your initials in the header button
- [ ] Clicking the initials button opens the account slide-in panel
- [ ] The Profile tab shows your display name and email
- [ ] Editing display name and saving works
- [ ] The Preferences tab allows theme switching and it applies immediately
- [ ] Signing out works and returns to the person-icon button
- [ ] "Forgot password" sends a reset email
- [ ] Clicking the reset link opens the site and shows the password-reset form
- [ ] Setting a new password works

---

## Architecture notes

**Security model**

- The anon key allows only what RLS permits: each user can read and write their own rows only. No cross-user access is possible through the frontend.
- `user_id` is always taken from the server-side session (`auth.uid()`), never from a value supplied by the client.
- All user-provided text (display names, notes) is rendered via `textContent` in the frontend — never `innerHTML`.
- No passwords, hashes, or service-role keys are stored in this repository.

**Session persistence**

- Supabase persists the session token in `localStorage` automatically.
- Sessions are refreshed silently via `autoRefreshToken: true`.
- Clearing `localStorage` (or using private/incognito mode) signs the user out.

**Preference sync**

On every sign-in, the cloud value for each synced key (`theme`, stock favorites, map bookmarks) takes priority over the local value. If the cloud has no value for a key but localStorage does, the local value is uploaded. This prevents accidental erasure of personalized settings.

**Account deletion**

Supabase authentication accounts cannot be securely deleted from frontend JavaScript alone (`supabase.auth.admin.deleteUser()` requires the service-role key, which must never be in the browser). To delete an account, delete the user from **Supabase Dashboard → Authentication → Users → Delete user**. The `on delete cascade` constraint on all tables ensures all associated data is removed automatically.
