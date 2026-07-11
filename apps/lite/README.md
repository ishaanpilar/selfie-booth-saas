# Selfie Booth Lite

A zero-backend selfie booth: open the page, take a photo (or a 3-shot
strip), pick a filter, then download the PNG or print it via the browser's
native print dialog (which also covers "save as PDF" — every browser's
print dialog offers that as a destination). Nothing is uploaded; there is no
database, no auth, no server round-trip after the initial page load.

Reuses `@selfie-booth/core`'s camera capture, filter/editing, and film-strip
renderer verbatim — the same engine the full platform uses — so behavior
stays identical between the two apps.

## Run locally

```bash
npm install        # from the repo root
npm run dev:lite    # http://localhost:3000
```

## Deploy to Vercel

This app lives inside an npm-workspaces monorepo, so when creating the
Vercel project:

1. Import this repository.
2. Set **Root Directory** to `apps/lite`.
3. Leave the build/install commands on their defaults — Vercel auto-detects
   the npm workspace root and runs `npm install` there, then
   `next build` inside `apps/lite`.
4. No environment variables are required. Optionally set
   `NEXT_PUBLIC_FULL_APP_URL` to point the "want more?" banner at your
   deployment of the full platform (`apps/web`); it defaults to
   `https://selfiebooth.app`.

## What's intentionally left out

No accounts, no events/booths, no template editor, no real printer
integration, no offline queue — that's the full platform (`apps/web`) in
this same repo. This app exists so a single person can get a working photo
booth on the internet in one deploy, no setup beyond `git push`.
