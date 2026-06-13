# NoA GitHub and Vercel Deployment

NoA is now prepared as a Vercel-hosted web app backed by Vercel API routes.

## GitHub

The project is intended to push to:

```text
https://github.com/TruShotMedia/NoA.git
```

For normal updates, run:

```bash
./push-update.sh
```

Or with a custom commit message:

```bash
./push-update.sh "Describe this NoA update"
```

## Vercel

Create a Vercel project from the GitHub repo and use:

```text
Framework preset: Vite
Build command: npm run build
Output directory: dist
Install command: npm install
```

## Environment Variables

Add these in Vercel Project Settings -> Environment Variables:

```env
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini

SUPABASE_URL=
SUPABASE_ANON_KEY=

N8N_WEBHOOK_URL=
N8N_SHARED_SECRET=

NOTION_TOKEN=
NOTION_TASKS_DATABASE_ID=36ff2ec220f2808ba6a8cfa333adefb5
NOTION_PIPELINE_VIEW_ID=36ff2ec220f280f18188000c8a4ed4e7
NOTION_TASKS_VIEW_ID=370f2ec220f2816791d9000c3aadc277
NOTION_JOBS_DATABASE_ID=36ff2ec220f280da9c3ac1072b0ef022

XERO_CLIENT_ID=
XERO_CLIENT_SECRET=
XERO_REFRESH_TOKEN=
XERO_TENANT_ID=
```

Voice and offline wake-word features are intentionally disabled in the Vercel build.
