# NoA

NoA is a cloud-deployable personal AI operating system for Noah, tasks, jobs, pipeline views, memory, approvals, and connected services.

This build is optimized for GitHub -> Vercel deployment. Voice and offline wake-word features are intentionally disabled in this version.

## Core Stack

- React + TypeScript + Vite frontend
- Vercel API routes for backend-safe integration calls
- OpenAI for Noah responses
- Notion for tasks, pipeline, and upcoming jobs
- Supabase for durable event logging and future memory storage
- n8n for workflow webhooks
- Xero for accounting context

## Run Locally

```bash
npm install
npm run dev
```

Local app:

```text
http://127.0.0.1:5178
```

Build check:

```bash
npm run build
```

## Push Updates

Run:

```bash
./push-update.sh
```

On Windows, you can double-click:

```text
Push NoA Update.bat
```

The script initializes Git if needed, points the project to `https://github.com/TruShotMedia/NoA.git`, builds the app, commits changes, and pushes to `main`.

## Deploy To Vercel

Create a Vercel project from:

```text
https://github.com/TruShotMedia/NoA.git
```

Use:

```text
Framework preset: Vite
Build command: npm run build
Output directory: dist
Install command: npm install
```

Full deployment notes are in `DEPLOYMENT.md`.
