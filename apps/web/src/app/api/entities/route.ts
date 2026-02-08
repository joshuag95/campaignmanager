import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { entityInputSchema } from "@/lib/validators/entity";

// GET /api/entities?campaignId=<uuid>&type=<optional>
// Returns entities for a campaign, with optional type filtering.
// TODO: replace x-user-id header checks with session-based auth middleware.
export async function GET(request: NextRequest) {
  const userId = request.headers.get("x-user-id");

  if (!userId) {
    return NextResponse.json({ error: "Missing x-user-id header." }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const campaignId = searchParams.get("campaignId");
  const type = searchParams.get("type");

  if (!campaignId) {
    return NextResponse.json({ error: "campaignId is required." }, { status: 400 });
  }

  const supabase = createServiceSupabaseClient();

  const { data: membership, error: memberError } = await supabase
    .from("campaign_members")
    .select("role, status")
    .eq("campaign_id", campaignId)
    .eq("user_id", userId)
    .single();

  if (memberError || !membership || membership.status !== "active") {
    return NextResponse.json({ error: "Not authorized for this campaign." }, { status: 403 });
  }

  let query = supabase
    .from("entities")
    .select("id, campaign_id, type, name, description, stats, tags, is_visible_to_players, image_url, created_at, updated_at")
    .eq("campaign_id", campaignId)
    .order("updated_at", { ascending: false });

  if (type) {
    query = query.eq("type", type);
  }

  if (membership.role !== "DM") {
    query = query.eq("is_visible_to_players", true);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ entities: data ?? [] });
}

// POST /api/entities
// Creates a new entity (Item, NPC, PC, Location, Event, Lore, etc.).
// Only DMs can create entities.
export async function POST(request: NextRequest) {
  const userId = request.headers.get("x-user-id");

  if (!userId) {
    return NextResponse.json({ error: "Missing x-user-id header." }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = entityInputSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = createServiceSupabaseClient();

  const { data: membership, error: memberError } = await supabase
    .from("campaign_members")
    .select("role, status")
    .eq("campaign_id", parsed.data.campaignId)
    .eq("user_id", userId)
    .single();

  if (memberError || !membership || membership.status !== "active" || membership.role !== "DM") {
    return NextResponse.json({ error: "Only DMs can create entities." }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("entities")
    .insert({
      campaign_id: parsed.data.campaignId,
      type: parsed.data.type,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      stats: parsed.data.stats ?? {},
      tags: parsed.data.tags ?? [],
      is_visible_to_players: parsed.data.isVisibleToPlayers ?? false,
      image_url: parsed.data.imageUrl ?? null,
      created_by: userId,
    })
    .select("id, campaign_id, type, name, description, stats, tags, is_visible_to_players, image_url, created_at, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ entity: data }, { status: 201 });
}
