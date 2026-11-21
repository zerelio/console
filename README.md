# Zerelio Console

The Zerelio Console is the management UI for the Zerelio platform. Built with Next.js 16 and Tailwind CSS 4, it provides a real-time view of your discovery data — including plugins, scopes, runs, resources, and compliance findings — giving operators full visibility and control over their Zerelio deployment.

![screenshot]

## Stack

- **Next.js 16** — React framework with App Router
- **Tailwind CSS 4** — utility-first styling
- **TypeScript**

## Configuration

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_ZERELIO_API_URL` | `http://localhost:8080` | Base URL of the Zerelio backend API |

Copy `.env.local.example` to `.env.local` and adjust as needed.

## Local Development

```bash
npm install
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

## Authentication

Log in with an email and password, or via SSO if OIDC is configured on the backend.

## Backend

The Console connects to [zerelio/knowledge](https://github.com/zerelio/knowledge) for all data.
