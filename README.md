# Selfie Booth SaaS

Enterprise, multi-tenant selfie booth platform: capture, edit, generate
print-ready film strips, and print — on desktop, tablet, and phone, online
or offline — with a full admin dashboard for running booths across many
events and organizations.

## Architecture

npm workspace monorepo, four packages plus one app:

```
apps/
  web/                 Next.js 15 app — booth kiosk UI, admin dashboard, API routes
packages/
  database/             Prisma schema + client (multi-tenant data model)
  auth/                 BetterAuth config, RBAC permission matrix, client hooks
  core/                 Framework-agnostic domain logic:
                           camera/     capture sources (webcam, mobile, DSLR agent)
                           editing/    crop/rotate/filters/stickers/text, non-destructive
                           render/     300 DPI film-strip renderer (bleed, crop marks, QR)
                           printing/   PrinterProvider interface, queue, WebUSB + local agent
  ui/                   Shared React component library + dark-mode theming
```

`packages/core` has no Next.js/browser-storage dependency beyond the DOM —
it's the reusable engine the booth kiosk, the template editor preview, and
(eventually) a headless re-render worker all share.

### Multi-tenancy

Every domain table hangs off `Organization`. Server-side data access always
goes through `requireActiveOrg()` (`apps/web/src/lib/auth-server.ts`), which
derives the tenant id from the session — never from a client-supplied value
— then checks the caller's `Member.role` against the permission matrix in
`packages/auth/src/permissions.ts`.

### Printing

`PrinterProvider` (packages/core/src/types/print.ts) is the single contract
every transport implements: `connect / disconnect / print / cancel / status
/ onStatusChange`. Two implementations ship: `LocalPrintAgentProvider` (the
recommended enterprise path — a native companion process on the booth
machine owns the OS print driver) and `WebUsbPrinterProvider` (optional,
for the subset of dye-sub printers with a workable WebUSB protocol). Jobs
flow through `PrintQueue`, which persists to an injectable
`PrintQueueStorage` (in-memory by default; `apps/web` supplies an IndexedDB
adapter so queued jobs survive offline and a page reload) and retries
failures with exponential backoff.

## Getting started

```bash
cp .env.example .env
# fill in DATABASE_URL, BETTER_AUTH_SECRET (openssl rand -base64 32), Supabase keys

npm install
npm run db:migrate      # create tables
npm run db:seed         # demo organization/event/booth/templates
npm run dev             # http://localhost:3000
```

## Scripts (run from repo root)

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Next.js dev server |
| `npm run build` | Build all workspaces |
| `npm run typecheck` | Typecheck all workspaces |
| `npm run db:migrate` | Apply Prisma migrations |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:seed` | Seed demo data |

## Deployment

Targets Vercel. `apps/web` is the deployed app; `DATABASE_URL` should point
at a pooled Postgres connection (Supabase's pooler or Neon). The local print
agent and any DSLR capture agent run on-premises at the venue, not on
Vercel — see `packages/core/src/printing/local-agent-provider.ts` and
`packages/core/src/camera/dslr-agent-camera-source.ts` for their protocols.
