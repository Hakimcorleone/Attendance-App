# Team Attendance + WFH Dashboard

Dark blue Next.js app for daily leave updates, recurring WFH schedules, and a shared dashboard.

## What this app does

- Staff choose their name first before using the app.
- Normal users can:
  - submit leave for themselves only
  - view the WFH page
  - view the dashboard
- Admin can:
  - choose any date
  - submit for any staff
  - remove leave records
  - change WFH schedules
- Leave types included:
  - AL, MC, EL, RL, PL, ML, HL, CL, Others

## Important note about security

This version uses a **soft identity gate** for staff and an **admin PIN** for admin actions.
That means it is fast and practical for internal team use, but it is **not full authentication**.
If you want truly secure user-by-user identity later, the next upgrade is Supabase Auth with email or magic links.

## 1) Create Supabase project

Create a new project in Supabase. The official Next.js quickstart says you can create a project, then use the project URL and the publishable key from the Connect dialog. It also notes that Supabase is moving toward the newer publishable and secret keys.

After your project is ready:

- open **SQL Editor**
- paste the contents of `supabase/schema.sql`
- run it once

That will create:

- `team_members`
- `daily_attendance`

and seed your 10 staff names.

## 2) Add environment variables

Copy `.env.example` to `.env.local` and fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
NEXT_PUBLIC_ADMIN_PIN=
```

### Where to get them

From the Supabase project Connect dialog / API Keys page:

- `NEXT_PUBLIC_SUPABASE_URL` = Project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = Publishable key
- `SUPABASE_SECRET_KEY` = Secret key
- `NEXT_PUBLIC_ADMIN_PIN` = any PIN you decide, for example `4321`

The official Supabase quickstart shows `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` as the client-side variables, and notes the migration toward publishable/secret keys.

## 3) Install and run locally

Next.js still recommends creating and running projects with `create-next-app`, and its TypeScript support is built in.

For this project, run:

```bash
npm install
npm run dev
```

Then open:

```bash
http://localhost:3000
```

## 4) Deploy to Vercel

Vercel documents that Next.js is supported with zero-config deployment, and the CLI deployment flow is `vercel --prod`.

### Easiest way

- push this project to GitHub
- import the repo into Vercel
- add the same environment variables in Vercel Project Settings
- deploy

### CLI way

```bash
npm i -g vercel
vercel --prod
```

## 5) Deploy to Netlify

This project can also deploy to Netlify as a Next.js app, but Vercel is the smoother choice for Next.js App Router.

If you still want Netlify:

- push repo to GitHub
- import repo into Netlify
- set environment variables
- let Netlify detect Next.js

## How the data works

### `team_members`
Stores:
- name
- recurring `wfh_days`

### `daily_attendance`
Stores:
- `attendance_date`
- `staff_name`
- `leave_type`
- `note`

There is a unique constraint on `(attendance_date, staff_name)` so each person only has one leave record per date.

## Suggested upgrade after launch

After your first live version, the best next upgrade is:

- real login with Supabase Auth
- real admin table / roles
- audit log for changes
- export CSV / PDF report
- WhatsApp summary generator
