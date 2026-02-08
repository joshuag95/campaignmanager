# Supabase Setup

## Purpose
This folder contains SQL migrations and backend policy rules for the DND Campaign Manager.

## Structure
- `migrations/`: Ordered SQL files applied to create and evolve schema.

## Applying migrations
1. Install Supabase CLI.
2. Link project: `supabase link --project-ref <project-ref>`.
3. Push schema: `supabase db push`.

## Notes
- RLS policies in migrations enforce DM/player access boundaries.
- Storage bucket and object policies are included in the initial migration.
