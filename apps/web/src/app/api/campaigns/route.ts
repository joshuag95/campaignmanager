import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth/request-user";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { campaignInputSchema } from "@/lib/validators/campaign";

// GET /api/campaigns
// Returns all campaigns (ordered) visible to the authenticated user.
export async function GET(request: NextRequest) {
  const userId = await getAuthenticatedUserId(request);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized. Provide a valid bearer token." }, { status: 401 });
  }

  const supabase = createServiceSupabaseClient();

  const { data, error } = await supabase
    .from("campaign_members")
    .select("role, campaigns(id, name, setting, summary, created_at, updated_at)")
    .eq("user_id", userId)
    .eq("status", "active");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const campaignsWithRoles = (data ?? []).flatMap(
    (row: {
      campaigns: Array<{
        id: string;
        name: string;
        setting: string | null;
        summary: string | null;
        created_at: string;
        updated_at: string;
      }>;
      role: "DM" | "PLAYER";
    }) =>
      (row.campaigns ?? []).map((campaign) => ({
        ...campaign,
        role: row.role,
      })),
  );
  return NextResponse.json({ campaigns: campaignsWithRoles });
}

// POST /api/campaigns
// Creates a campaign and inserts the owner as DM member.
export async function POST(request: NextRequest) {
  const userId = await getAuthenticatedUserId(request);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized. Provide a valid bearer token." }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = campaignInputSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = createServiceSupabaseClient();

  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .insert({
      owner_user_id: userId,
      name: parsed.data.name,
      setting: parsed.data.setting ?? null,
      summary: parsed.data.summary ?? null,
    })
    .select("id, name, setting, summary, created_at, updated_at")
    .single();

  if (campaignError || !campaign) {
    return NextResponse.json({ error: campaignError?.message ?? "Failed to create campaign." }, { status: 500 });
  }

  const { error: memberError } = await supabase.from("campaign_members").insert({
    campaign_id: campaign.id,
    user_id: userId,
    role: "DM",
    status: "active",
  });

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  return NextResponse.json({ campaign }, { status: 201 });
}
