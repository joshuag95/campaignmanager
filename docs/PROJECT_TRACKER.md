# DND Campaign Manager - Project Tracker

## Status
- [x] Create base project directory at `C:\Users\jtgre\App Ideas\DND`
- [x] Create initial folder structure
- [x] Initialize git repository
- [x] Connect repository to GitHub remote
- [x] Scaffold Next.js app in `apps/web`
- [x] Set up initial Supabase migration structure in `supabase/migrations`
- [x] Implement core schema v1 (campaigns, entities, links, visibility)
- [ ] Configure hosted Supabase project (auth/storage keys + linked project)
- [ ] Build DM and player auth/roles
- [ ] Build entity CRUD + association UI
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
2. Add real session auth integration (replace temporary `x-user-id` header flow in API routes).
3. Build campaign + entity frontend pages that call `/api/campaigns` and `/api/entities`.

## Notes
- We will update this file as milestones change.
- API routes currently use `x-user-id` header as a temporary auth bridge until Supabase Auth session middleware is wired.
