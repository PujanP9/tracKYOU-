# tracKYOU — iPhone-ready PWA

This package keeps the uploaded tracKYOU calendar UI and adds the pieces needed to use it on an iPhone:

- the original calendar, goals, reminders, work/income and search logic are preserved
- responsive mobile layout and touch-friendly controls
- iPhone safe-area support
- Add to Home Screen / standalone PWA support
- offline app-shell caching after the first successful load
- service-worker notification support

## Put it on your iPhone

For iPhone, the files need to be served from an HTTPS website. Opening the HTML directly from the Files app will not give you a real installed PWA or reliable background notifications.

### GitHub Pages route

1. Create a GitHub repository, for example `trackyou`.
2. Upload everything in this folder to the repository root.
3. Enable GitHub Pages: Deploy from branch → `main` → `/ (root)`.
4. Open the generated HTTPS address in Safari on your iPhone.
5. Tap Share → Add to Home Screen → Add.
6. Open tracKYOU from the new Home Screen icon.

## Notifications

The package registers a service worker and is ready for web-push notifications. On iPhone, web notifications require the site to be installed to the Home Screen and notification permission to be granted.

A pure HTML/PWA package cannot reliably wake itself at arbitrary reminder times while completely closed. Reliable scheduled reminders require a push-notification backend/server. This package does not pretend a browser timer is reliable.

## Local testing

From this folder run:

`python3 -m http.server 8000`

Then open `http://localhost:8000/`.

---------------------------------------------------------------
Update (v4)
- Works offline from the first launch (Supabase library, fonts and icons are bundled in this repo).
- "Continue without an account" on the sign-in screen = use the app on this phone only (no reminders).
- Reminders now cover timed tasks (15 min before), timed events (1 h and 15 min before),
  work sessions (15 min before) and reminders (1 h, 15 min, at the time).
- Settings → Cloud sync → "Send test notification" checks the whole chain in about a minute.
- The server side is in supabase/ (function + migrations). If reminders stop arriving, run
  supabase/migrations/20261008_fix_permissions_and_app_state.sql once in the Supabase SQL Editor.
- Old files kept for reference: clean/, Logo tracKYOU.png, icon-180.png, icon-512.png.
