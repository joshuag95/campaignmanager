# Code Overview

## Repository Sections
- `apps/web`: Next.js frontend app (UI, routes, styles).
- `supabase`: SQL migrations, auth policies, and backend data-layer setup.
- `docs`: Project planning and technical documentation.
- `scripts`: Utility scripts for setup and maintenance.

## Frontend Sections (`apps/web`)
- `src/app/layout.tsx`: Global app wrapper, metadata, and shared font setup.
- `src/app/page.tsx`: Current home route UI with starter content and CTA blocks.
- `src/app/globals.css`: Global CSS tokens, dark mode token overrides, and body defaults.
- `src/app/api/health/route.ts`: Service health endpoint for quick checks.
- `src/app/api/campaigns/route.ts`: Campaign list/create handlers (temporary header-based auth).
- `src/app/api/entities/route.ts`: Entity list/create handlers with DM/player visibility behavior.
- `src/lib/env.ts`: Runtime environment validation for server utilities.
- `src/lib/auth/request-user.ts`: Bearer token auth helper for protected route handlers.
- `src/lib/supabase/server.ts`: Service-role Supabase client factory for route handlers.
- `src/lib/validators/*`: Shared Zod input schemas for API payload validation.
- `public/*`: Static assets used by routes/components.
- `package.json`: App scripts and dependency manifest.

## Supabase Sections (`supabase`)
- `migrations/202602080001_init.sql`: Initial schema, indexes, triggers, RLS policies, and storage rules.
- `README.md`: How to link/apply migrations with Supabase CLI.

## Why This Structure
- Keeps frontend isolated so backend and docs can evolve independently.
- Makes it easy to review key files quickly before changes.
- Supports scaling to a monorepo layout as features grow.
