# Supps247 Roster

Static roster app for Supps247 with Supabase auth, live roster sync, weekly planning, CSV export, and JSON backups.

## Run locally

Open `index.html` in a browser or host the folder as a static site.

## Supabase setup

1. Open your Supabase project.
2. Go to **SQL Editor**.
3. Paste the full contents of `setup.sql`.
4. Run it once.
5. Create one or more Auth users in **Authentication -> Users**.

## Deployment

This repo is ready for static hosting on Vercel, Netlify, or any host that serves `index.html`.

## Notes

- The browser uses the public Supabase key in `app.js`.
- Do not place a `service_role` key in the front end.
