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
1. Complete the final hosted Supabase auth toggle: disable `Confirm email` in Dashboard (`Authentication > Providers > Email`).
2. Validate end-to-end auth flow after toggle (sign up, sign in, role-gated dashboard behavior).
3. Start UI polish pass for fantasy/DND visual redesign.

## Session Handoff (February 10, 2026)
### Completed this session
- Hosted Supabase credentials configured locally in `apps/web/.env.local` (not committed).
- Hosted connectivity verified: `campaigns` and `entity_links` query successfully via service role key.
- Implemented and shipped:
  - Dedicated auth page + middleware route guards.
  - DM vs Player role-aware dashboard boundaries.
  - Entity detail page with reverse associations and navigation.
  - DM-only edit/delete entity API + detail-page controls.
  - Dashboard entity filtering (type + search).
- Web app checks pass:
  - `npm run lint --prefix apps/web`
  - `npm run build --prefix apps/web`

### Remaining to resume next session
- Manual Supabase dashboard change still pending:
  - set `mailer_autoconfirm=true` by disabling "Confirm email".
- Run live auth smoke test against hosted project after that toggle.
- Continue product roadmap:
  - advanced entity CRUD workflows,
  - image/media management,
  - reveal/hide controls,
  - subscriptions and deployment.

## Notes
- We will update this file as milestones change.
- API routes now require `Authorization: Bearer <supabase_access_token>` on protected endpoints.
- Hosted Supabase connectivity verified on February 10, 2026:
  - `campaigns` and `entity_links` tables are queryable with service role key.
  - App is configured locally via `apps/web/.env.local`.
  - Auth setting `mailer_autoconfirm` is currently `false` (email confirmation ON), but requested mode is OFF.
  - Remaining manual step in Supabase Dashboard: Authentication > Providers > Email > disable "Confirm email".
