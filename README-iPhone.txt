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
