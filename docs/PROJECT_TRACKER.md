# DND Campaign Manager - Project Tracker

## Status
- [x] Create base project directory at `C:\Users\jtgre\App Ideas\DND`
- [x] Create initial folder structure
- [x] Initialize git repository
- [x] Connect repository to GitHub remote
- [x] Scaffold Next.js app in `apps/web`
- [x] Set up initial Supabase migration structure in `supabase/migrations`
- [x] Implement core schema v1 (campaigns, entities, links, visibility)
- [x] Add JWT-based API auth guard (replaces temporary `x-user-id` header flow)
- [x] Build initial dashboard UI wired to `/api/campaigns` and `/api/entities`
- [x] Add cookie-session fallback in API auth guard for SSR/browser auth flows
- [x] Add entity-link API and dashboard UI for relationship management
- [x] Replace manual token auth with dedicated `/auth` page and route guards
- [x] Add role-aware dashboard boundaries for DM vs Player create actions
- [x] Add entity detail pages with reverse-linked relationship sections
- [x] Add entity-level edit/delete API and DM-only controls on detail page
- [x] Add entity list filtering (type + text search) in dashboard
- [x] Add richer association navigation patterns on entity detail pages
- [ ] Configure hosted Supabase project (auth/storage keys + linked project)
- [ ] Build DM and player auth/roles
- [ ] Build advanced entity CRUD + association graph UI
- [ ] Add image upload and media management
- [ ] Add reveal/hide controls (record + field level)
- [ ] Add Stripe subscriptions and tier gating
- [ ] Deploy production stack

## Initial Folder Layout
- `apps/web` - Next.js frontend
- `supabase` - SQL migrations, RLS policies, functions
- `docs` - planning docs and product specs
- `scripts` - setup and utility scripts

## Immediate Next Actions
1. Create/link Supabase cloud project and apply `supabase/migrations/202602080001_init.sql`.
2. Expand CRUD to include edit/delete flows and stronger filtering.
3. Redesign UI with a smooth, aesthetically polished fantasy/DND visual theme.

## Notes
- We will update this file as milestones change.
- API routes now require `Authorization: Bearer <supabase_access_token>` on protected endpoints.
- Hosted Supabase connectivity verified on February 10, 2026:
  - `campaigns` and `entity_links` tables are queryable with service role key.
  - App is configured locally via `apps/web/.env.local`.
  - Auth setting `mailer_autoconfirm` is currently `false` (email confirmation ON), but requested mode is OFF.
  - Remaining manual step in Supabase Dashboard: Authentication > Providers > Email > disable "Confirm email".
