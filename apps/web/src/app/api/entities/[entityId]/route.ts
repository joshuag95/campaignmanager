import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth/request-user";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { entityUpdateInputSchema } from "@/lib/validators/entity-update";

type MembershipRow = {
  role: "DM" | "PLAYER";
  status: string;
};

type EntityRow = {
  id: string;
  campaign_id: string;
  type: string;
  name: string;
  description: string | null;
  stats: Record<string, unknown>;
  tags: string[];
  is_visible_to_players: boolean;
  image_url: string | null;
  created_at: string;
  updated_at: string;
};

type LinkRow = {
  id: string;
  campaign_id: string;
  from_entity_id: string;
  to_entity_id: string;
  relation_type: string;
  notes: string | null;
  created_at: string;
};

async function getEntityAndMembership(entityId: string, userId: string) {
  const supabase = createServiceSupabaseClient();

  const { data: entity, error: entityError } = await supabase
    .from("entities")
    .select("id, campaign_id, type, name, description, stats, tags, is_visible_to_players, image_url, created_at, updated_at")
    .eq("id", entityId)
    .single<EntityRow>();

  if (entityError || !entity) {
    return { error: NextResponse.json({ error: "Entity not found." }, { status: 404 }) };
  }

  const { data: membership, error: memberError } = await supabase
    .from("campaign_members")
    .select("role, status")
    .eq("campaign_id", entity.campaign_id)
    .eq("user_id", userId)
    .single<MembershipRow>();

  if (memberError || !membership || membership.status !== "active") {
    return { error: NextResponse.json({ error: "Not authorized for this campaign." }, { status: 403 }) };
  }

  return {
    supabase,
    entity,
    membership,
  };
}

// GET /api/entities/:entityId
// Returns one entity with outgoing + incoming links and related entities.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entityId: string }> },
) {
  const userId = await getAuthenticatedUserId(request);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized. Provide a valid bearer token." }, { status: 401 });
  }

  const { entityId } = await params;
  const result = await getEntityAndMembership(entityId, userId);

  if ("error" in result) {
    return result.error;
  }

  const { supabase, entity, membership } = result;

  if (membership.role !== "DM" && !entity.is_visible_to_players) {
    return NextResponse.json({ error: "Entity not visible to players." }, { status: 403 });
  }

  const { data: links, error: linksError } = await supabase
    .from("entity_links")
    .select("id, campaign_id, from_entity_id, to_entity_id, relation_type, notes, created_at")
    .eq("campaign_id", entity.campaign_id)
    .or(`from_entity_id.eq.${entity.id},to_entity_id.eq.${entity.id}`)
    .returns<LinkRow[]>();

  if (linksError) {
    return NextResponse.json({ error: linksError.message }, { status: 500 });
  }

  const allLinks = links ?? [];
  const counterpartIds = Array.from(
    new Set(
      allLinks.map((link) => (link.from_entity_id === entity.id ? link.to_entity_id : link.from_entity_id)),
    ),
  );

  let counterpartQuery = supabase
    .from("entities")
    .select("id, type, name, is_visible_to_players")
    .eq("campaign_id", entity.campaign_id)
    .in("id", counterpartIds);

  if (membership.role !== "DM") {
    counterpartQuery = counterpartQuery.eq("is_visible_to_players", true);
  }

  const { data: counterpartEntities, error: counterpartError } = await counterpartQuery;

  if (counterpartError) {
    return NextResponse.json({ error: counterpartError.message }, { status: 500 });
  }

  const counterpartMap = new Map(
    (counterpartEntities ?? []).map((counterpart: { id: string; type: string; name: string }) => [
      counterpart.id,
      counterpart,
    ]),
  );

  const outgoingLinks = allLinks
    .filter((link) => link.from_entity_id === entity.id)
    .filter((link) => counterpartMap.has(link.to_entity_id))
    .map((link) => ({
      ...link,
      related_entity: counterpartMap.get(link.to_entity_id),
    }));

  const incomingLinks = allLinks
    .filter((link) => link.to_entity_id === entity.id)
    .filter((link) => counterpartMap.has(link.from_entity_id))
    .map((link) => ({
      ...link,
      related_entity: counterpartMap.get(link.from_entity_id),
    }));

  return NextResponse.json({
    entity,
    membershipRole: membership.role,
    outgoingLinks,
    incomingLinks,
  });
}

// PATCH /api/entities/:entityId
// Updates one entity. DM-only.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ entityId: string }> },
) {
  const userId = await getAuthenticatedUserId(request);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized. Provide a valid bearer token." }, { status: 401 });
  }

  const { entityId } = await params;
  const result = await getEntityAndMembership(entityId, userId);

  if ("error" in result) {
    return result.error;
  }

  const { supabase, entity, membership } = result;

  if (membership.role !== "DM") {
    return NextResponse.json({ error: "Only DMs can update entities." }, { status: 403 });
  }

  const json = await request.json().catch(() => null);
  const parsed = entityUpdateInputSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updatePayload: Record<string, unknown> = {};
  if (parsed.data.type !== undefined) updatePayload.type = parsed.data.type;
  if (parsed.data.name !== undefined) updatePayload.name = parsed.data.name;
  if (parsed.data.description !== undefined) updatePayload.description = parsed.data.description;
  if (parsed.data.stats !== undefined) updatePayload.stats = parsed.data.stats;
  if (parsed.data.tags !== undefined) updatePayload.tags = parsed.data.tags;
  if (parsed.data.isVisibleToPlayers !== undefined) {
    updatePayload.is_visible_to_players = parsed.data.isVisibleToPlayers;
  }
  if (parsed.data.imageUrl !== undefined) updatePayload.image_url = parsed.data.imageUrl;

  const { data, error } = await supabase
    .from("entities")
    .update(updatePayload)
    .eq("id", entity.id)
    .select("id, campaign_id, type, name, description, stats, tags, is_visible_to_players, image_url, created_at, updated_at")
    .single<EntityRow>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ entity: data });
}

// DELETE /api/entities/:entityId
// Deletes one entity. DM-only.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ entityId: string }> },
) {
  const userId = await getAuthenticatedUserId(request);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized. Provide a valid bearer token." }, { status: 401 });
  }

  const { entityId } = await params;
  const result = await getEntityAndMembership(entityId, userId);

  if ("error" in result) {
    return result.error;
  }

  const { supabase, entity, membership } = result;

  if (membership.role !== "DM") {
    return NextResponse.json({ error: "Only DMs can delete entities." }, { status: 403 });
  }

  const { error } = await supabase.from("entities").delete().eq("id", entity.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
