# Code Overview

## Repository Sections
- `apps/web`: Next.js frontend app (UI, routes, styles).
- `supabase`: Reserved for database migrations, auth policies, and backend functions.
- `docs`: Project planning and technical documentation.
- `scripts`: Utility scripts for setup and maintenance.

## Frontend Sections (`apps/web`)
- `src/app/layout.tsx`: Global app wrapper, metadata, and shared font setup.
- `src/app/page.tsx`: Current home route UI with starter content and CTA blocks.
- `src/app/globals.css`: Global CSS tokens, dark mode token overrides, and body defaults.
- `public/*`: Static assets used by routes/components.
- `package.json`: App scripts and dependency manifest.

## Why This Structure
- Keeps frontend isolated so backend and docs can evolve independently.
- Makes it easy to review key files quickly before changes.
- Supports scaling to a monorepo layout as features grow.
