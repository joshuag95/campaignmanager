import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth/request-user";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { entityLinkInputSchema } from "@/lib/validators/entity-link";

type MembershipRow = {
  role: "DM" | "PLAYER";
  status: string;
};

type EntityLinkRow = {
  id: string;
  campaign_id: string;
  from_entity_id: string;
  to_entity_id: string;
  relation_type: string;
  notes: string | null;
  created_at: string;
};

// GET /api/entity-links?campaignId=<uuid>&entityId=<optional>
// Returns links for a campaign, optionally scoped to a specific entity id.
export async function GET(request: NextRequest) {
  const userId = await getAuthenticatedUserId(request);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized. Provide a valid bearer token." }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const campaignId = searchParams.get("campaignId");
  const entityId = searchParams.get("entityId");

  if (!campaignId) {
    return NextResponse.json({ error: "campaignId is required." }, { status: 400 });
  }

  const supabase = createServiceSupabaseClient();

  const { data: membership, error: memberError } = await supabase
    .from("campaign_members")
    .select("role, status")
    .eq("campaign_id", campaignId)
    .eq("user_id", userId)
    .single<MembershipRow>();

  if (memberError || !membership || membership.status !== "active") {
    return NextResponse.json({ error: "Not authorized for this campaign." }, { status: 403 });
  }

  let query = supabase
    .from("entity_links")
    .select("id, campaign_id, from_entity_id, to_entity_id, relation_type, notes, created_at")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false });

  if (entityId) {
    query = query.or(`from_entity_id.eq.${entityId},to_entity_id.eq.${entityId}`);
  }

  const { data, error } = await query.returns<EntityLinkRow[]>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const links = data ?? [];

  // Non-DM users only receive links where both linked entities are visible to players.
  if (membership.role !== "DM" && links.length > 0) {
    const entityIds = Array.from(new Set(links.flatMap((link) => [link.from_entity_id, link.to_entity_id])));
    const { data: visibleEntities, error: visibilityError } = await supabase
      .from("entities")
      .select("id")
      .eq("campaign_id", campaignId)
      .eq("is_visible_to_players", true)
      .in("id", entityIds);

    if (visibilityError) {
      return NextResponse.json({ error: visibilityError.message }, { status: 500 });
    }

    const visibleIdSet = new Set((visibleEntities ?? []).map((row: { id: string }) => row.id));
    return NextResponse.json({
      links: links.filter(
        (link) => visibleIdSet.has(link.from_entity_id) && visibleIdSet.has(link.to_entity_id),
      ),
    });
  }

  return NextResponse.json({ links });
}

// POST /api/entity-links
// Creates a directional relationship between two entities in the same campaign.
// Only DMs can create links.
export async function POST(request: NextRequest) {
  const userId = await getAuthenticatedUserId(request);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized. Provide a valid bearer token." }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = entityLinkInputSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = createServiceSupabaseClient();

  const { data: membership, error: memberError } = await supabase
    .from("campaign_members")
    .select("role, status")
    .eq("campaign_id", parsed.data.campaignId)
    .eq("user_id", userId)
    .single<MembershipRow>();

  if (memberError || !membership || membership.status !== "active" || membership.role !== "DM") {
    return NextResponse.json({ error: "Only DMs can create entity links." }, { status: 403 });
  }

  const { data: entities, error: entitiesError } = await supabase
    .from("entities")
    .select("id")
    .eq("campaign_id", parsed.data.campaignId)
    .in("id", [parsed.data.fromEntityId, parsed.data.toEntityId]);

  if (entitiesError) {
    return NextResponse.json({ error: entitiesError.message }, { status: 500 });
  }

  if ((entities ?? []).length !== 2) {
    return NextResponse.json({ error: "Both entities must exist in the selected campaign." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("entity_links")
    .insert({
      campaign_id: parsed.data.campaignId,
      from_entity_id: parsed.data.fromEntityId,
      to_entity_id: parsed.data.toEntityId,
      relation_type: parsed.data.relationType.trim(),
      notes: parsed.data.notes?.trim() || null,
    })
    .select("id, campaign_id, from_entity_id, to_entity_id, relation_type, notes, created_at")
    .single<EntityLinkRow>();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "This relationship already exists." }, { status: 409 });
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ link: data }, { status: 201 });
}
