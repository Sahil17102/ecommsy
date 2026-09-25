# Box and Beyond

Multi-courier shipping aggregator for Box and Beyond. Sellers enter shipment
details once and get the best rates across courier partners, with B2B and B2C
flows, COD remittance, billing, KYC, and admin tooling.

> Forked from the previous `courier-aggregator` codebase. Differences:
> - **DB:** Postgres + Drizzle ORM (originally MongoDB/Mongoose).
> - **Theme:** Box and Beyond orange (`#EA580C`) + purple (`#7C3AED`).
> - **Removed:** Sentry, WhatsApp/lead-magnet, manual courier &
>   serviceability, admin RBAC (role presets, audit logs, scoped staff).

## Stack

- **Server:** Node.js, Express, TypeScript, Drizzle ORM, Postgres
- **Admin:** Vite + React 18 + Ant Design (Box and Beyond theme)
- **Client (seller portal + landing):** Vite + React 18 + Tailwind + Ant Design
- **Integrations kept:** Delhivery + courier providers, Razorpay, Google OAuth, AWS S3

## Setup

```bash
# Install root + all workspaces
npm install

# Provide env files
cp server/.env.example server/.env    # set DATABASE_URL etc.
cp client/.env.example client/.env    # if present

# Push schema to Postgres (creates tables)
npm run db:push --workspace=server
```

Required server env:

```
DATABASE_URL=postgres://user:pass@localhost:5432/box_and_beyond
PORT=3001
CLIENT_URL=http://localhost:5173
ADMIN_URL=http://localhost:5174
JWT_SECRET=...
# plus integration creds (Delhivery, Razorpay, S3, Google OAuth)
```

## Run

```bash
npm run dev          # API + client
npm run dev:all      # API + client + admin
```

- API: http://localhost:3001
- Client: http://localhost:5173
- Admin: http://localhost:5174

## Project structure

```
box-and-beyond/
├── admin/      # Vite + Ant Design admin portal
├── client/     # Vite + React seller portal + public landing
├── server/     # Express API
│   ├── src/
│   │   ├── db/schema.ts        # Drizzle Postgres schema (source of truth)
│   │   ├── db/migrations/      # drizzle-kit generated migrations
│   │   ├── config/db.ts        # Postgres connection
│   │   ├── routes/, controllers/, services/, models/, seeds/
│   └── drizzle.config.ts
├── ER_DIAGRAM.md   # Source schema (Mongo collections) used to derive Drizzle tables
├── PHASE2.md       # Remaining Mongoose → Drizzle conversion work
└── package.json    # npm workspaces root
```

## Theme

All colors come from `admin/src/theme/theme.ts` and `client/src/theme/theme.ts`
(identical files — keep in sync). Update the palette there; CSS variables and
the Tailwind config consume the tokens automatically.

## Logo

Drop the official Box and Beyond logo at:

- `admin/public/box-and-beyond-logo.svg` (preferred — vector) or `.png`
- `client/public/box-and-beyond-logo.svg` or `.png`
- `admin/public/favicon.png`, `client/public/favicon.png` (favicon.jpg
  placeholders are still in place from the fork)

The `AppLogo` components in both `admin/src/components/common/AppLogo.tsx` and
`client/src/components/common/AppLogo.tsx` reference these paths.

## Migration status

This fork's structural scaffolding is done. The Mongoose→Drizzle controller /
service rewrite is tracked in `PHASE2.md` — see that file for the per-file work
list before running the server.
