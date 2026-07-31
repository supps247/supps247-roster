# Supps247 Cloud Roster

This version is connected to the supplied Supabase project and works as a static website. Your accountant only needs a browser.

## 1. Create the database

1. Open your Supabase project.
2. Go to **SQL Editor**.
3. Create a new query.
4. Paste all contents of `setup.sql` and press **Run**.

## 2. Create login accounts

In Supabase, go to **Authentication -> Users -> Add user**.

Create one account for yourself and one for your accountant. Use **Create user** and set passwords. The app does not provide public sign-up.

## 3. Put the app online without Node.js

### Netlify Drop

1. Open Netlify Drop in a browser.
2. Drag the entire `supps247-supabase-roster` folder into the page.
3. Netlify gives you a website address.
4. Open it and sign in with a Supabase user.

### Other static hosting

The folder also works on Vercel, Cloudflare Pages, GitHub Pages, or normal website hosting. Upload `index.html`, `app.js`, and `styles.css` together.

## Security

- The publishable key in `app.js` is safe to use in a browser.
- Never place a Supabase `service_role` or secret key in this folder.
- Database access is restricted to authenticated Supabase users.
- Anyone with a valid account can edit the roster, so only create accounts for authorised staff.

## Backup

Use **Download JSON backup** inside the app. Roster CSV export is also available for payroll/accounting.
