-- Initial schema for DND Campaign Manager.
-- This migration sets up auth-linked campaign data, graph-style entity links, and visibility controls.

create extension if not exists pgcrypto;

-- Restrict role values to known application roles.
create type public.campaign_role as enum ('DM', 'PLAYER');

-- Core campaign record owned by a DM user.
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  setting text,
  summary text,
  theme_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Membership table used for authorization and invite acceptance tracking.
create table if not exists public.campaign_members (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.campaign_role not null default 'PLAYER',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  unique (campaign_id, user_id)
);

-- Generic entity table for items, NPCs, PCs, locations, lore, events, etc.
create table if not exists public.entities (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  type text not null,
  name text not null,
  description text,
  stats jsonb not null default '{}'::jsonb,
  tags text[] not null default '{}',
  is_visible_to_players boolean not null default false,
  visibility_overrides jsonb not null default '{}'::jsonb,
  image_url text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Many-to-many graph edges so entities can be linked in both directions.
create table if not exists public.entity_links (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  from_entity_id uuid not null references public.entities(id) on delete cascade,
  to_entity_id uuid not null references public.entities(id) on delete cascade,
  relation_type text not null,
  notes text,
  created_at timestamptz not null default now(),
  unique (from_entity_id, to_entity_id, relation_type)
);

-- Optional image metadata for gallery/history support beyond the primary image_url.
create table if not exists public.entity_images (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  entity_id uuid not null references public.entities(id) on delete cascade,
  storage_path text not null,
  alt_text text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Helpful indexes for dashboard filtering and graph queries.
create index if not exists idx_campaign_members_user_id on public.campaign_members (user_id);
create index if not exists idx_entities_campaign_id on public.entities (campaign_id);
create index if not exists idx_entities_type on public.entities (type);
create index if not exists idx_entity_links_campaign_id on public.entity_links (campaign_id);

-- Keep updated_at current for mutable tables.
create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger campaigns_touch_updated_at
before update on public.campaigns
for each row execute function public.touch_updated_at();

create trigger entities_touch_updated_at
before update on public.entities
for each row execute function public.touch_updated_at();

-- Enable row-level security for all user-facing tables.
alter table public.campaigns enable row level security;
alter table public.campaign_members enable row level security;
alter table public.entities enable row level security;
alter table public.entity_links enable row level security;
alter table public.entity_images enable row level security;

-- Access helper: true when the authenticated user belongs to the campaign.
create or replace function public.is_campaign_member(target_campaign_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.campaign_members cm
    where cm.campaign_id = target_campaign_id
      and cm.user_id = auth.uid()
      and cm.status = 'active'
  );
$$;

-- Access helper: true when the authenticated user is a DM in the campaign.
create or replace function public.is_campaign_dm(target_campaign_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.campaign_members cm
    where cm.campaign_id = target_campaign_id
      and cm.user_id = auth.uid()
      and cm.role = 'DM'
      and cm.status = 'active'
  );
$$;

-- Campaign policies: members can read, only DMs can mutate.
drop policy if exists campaigns_select_member on public.campaigns;
create policy campaigns_select_member on public.campaigns
for select using (public.is_campaign_member(id));

drop policy if exists campaigns_insert_owner on public.campaigns;
create policy campaigns_insert_owner on public.campaigns
for insert with check (owner_user_id = auth.uid());

drop policy if exists campaigns_update_dm on public.campaigns;
create policy campaigns_update_dm on public.campaigns
for update using (public.is_campaign_dm(id));

drop policy if exists campaigns_delete_dm on public.campaigns;
create policy campaigns_delete_dm on public.campaigns
for delete using (public.is_campaign_dm(id));

-- Membership policies: members can read, DMs manage membership.
drop policy if exists campaign_members_select_member on public.campaign_members;
create policy campaign_members_select_member on public.campaign_members
for select using (public.is_campaign_member(campaign_id));

drop policy if exists campaign_members_manage_dm on public.campaign_members;
create policy campaign_members_manage_dm on public.campaign_members
for all using (public.is_campaign_dm(campaign_id)) with check (public.is_campaign_dm(campaign_id));

-- Entity policies: members can read visible entities, DMs can read/write all.
drop policy if exists entities_select_visible on public.entities;
create policy entities_select_visible on public.entities
for select using (
  public.is_campaign_dm(campaign_id)
  or (
    public.is_campaign_member(campaign_id)
    and is_visible_to_players = true
  )
);

drop policy if exists entities_mutate_dm on public.entities;
create policy entities_mutate_dm on public.entities
for all using (public.is_campaign_dm(campaign_id)) with check (public.is_campaign_dm(campaign_id));

-- Link policies follow same DM/member visibility model as entities.
drop policy if exists entity_links_select_member on public.entity_links;
create policy entity_links_select_member on public.entity_links
for select using (public.is_campaign_member(campaign_id));

drop policy if exists entity_links_mutate_dm on public.entity_links;
create policy entity_links_mutate_dm on public.entity_links
for all using (public.is_campaign_dm(campaign_id)) with check (public.is_campaign_dm(campaign_id));

-- Image metadata policies align with campaign access.
drop policy if exists entity_images_select_member on public.entity_images;
create policy entity_images_select_member on public.entity_images
for select using (public.is_campaign_member(campaign_id));

drop policy if exists entity_images_mutate_dm on public.entity_images;
create policy entity_images_mutate_dm on public.entity_images
for all using (public.is_campaign_dm(campaign_id)) with check (public.is_campaign_dm(campaign_id));

-- Storage bucket for campaign media.
insert into storage.buckets (id, name, public)
values ('campaign-assets', 'campaign-assets', false)
on conflict (id) do nothing;

-- Storage policies: campaign members can read, DMs can write/delete.
drop policy if exists campaign_assets_read_member on storage.objects;
create policy campaign_assets_read_member on storage.objects
for select using (
  bucket_id = 'campaign-assets'
  and public.is_campaign_member((storage.foldername(name))[1]::uuid)
);

drop policy if exists campaign_assets_write_dm on storage.objects;
create policy campaign_assets_write_dm on storage.objects
for insert with check (
  bucket_id = 'campaign-assets'
  and public.is_campaign_dm((storage.foldername(name))[1]::uuid)
);

drop policy if exists campaign_assets_update_dm on storage.objects;
create policy campaign_assets_update_dm on storage.objects
for update using (
  bucket_id = 'campaign-assets'
  and public.is_campaign_dm((storage.foldername(name))[1]::uuid)
);

drop policy if exists campaign_assets_delete_dm on storage.objects;
create policy campaign_assets_delete_dm on storage.objects
for delete using (
  bucket_id = 'campaign-assets'
  and public.is_campaign_dm((storage.foldername(name))[1]::uuid)
);
