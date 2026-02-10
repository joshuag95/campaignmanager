"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type Campaign = {
  id: string;
  name: string;
  setting: string | null;
  summary: string | null;
  created_at: string;
  updated_at: string;
};

type Entity = {
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

type EntityLink = {
  id: string;
  campaign_id: string;
  from_entity_id: string;
  to_entity_id: string;
  relation_type: string;
  notes: string | null;
  created_at: string;
};

export function CampaignDashboard() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [entities, setEntities] = useState<Entity[]>([]);
  const [links, setLinks] = useState<EntityLink[]>([]);
  const [message, setMessage] = useState("Loading campaigns...");

  // Form state for creating campaigns.
  const [campaignName, setCampaignName] = useState("");
  const [campaignSetting, setCampaignSetting] = useState("");
  const [campaignSummary, setCampaignSummary] = useState("");

  // Form state for creating entities.
  const [entityType, setEntityType] = useState("NPC");
  const [entityName, setEntityName] = useState("");
  const [entityDescription, setEntityDescription] = useState("");
  const [entityTagsCsv, setEntityTagsCsv] = useState("");
  const [entityVisibleToPlayers, setEntityVisibleToPlayers] = useState(false);

  // Form state for creating links between entities.
  const [linkFromEntityId, setLinkFromEntityId] = useState("");
  const [linkToEntityId, setLinkToEntityId] = useState("");
  const [linkRelationType, setLinkRelationType] = useState("ally");
  const [linkNotes, setLinkNotes] = useState("");

  const jsonHeaders = useMemo(
    () => ({
      "Content-Type": "application/json",
    }),
    [],
  );

  async function selectCampaign(campaignId: string) {
    setSelectedCampaignId(campaignId);
    await Promise.all([loadEntities(campaignId), loadLinks(campaignId)]);
  }

  // Loads campaigns available to the authenticated user.
  async function loadCampaigns() {
    const response = await fetch("/api/campaigns", {
      method: "GET",
    });

    const payload = (await response.json()) as { campaigns?: Campaign[]; error?: string };
    if (!response.ok) {
      setMessage(payload.error ?? "Failed to load campaigns.");
      return;
    }

    const nextCampaigns = payload.campaigns ?? [];
    setCampaigns(nextCampaigns);

    const nextSelectedCampaignId =
      selectedCampaignId && nextCampaigns.some((campaign) => campaign.id === selectedCampaignId)
        ? selectedCampaignId
        : nextCampaigns[0]?.id ?? "";

    if (nextSelectedCampaignId) {
      await selectCampaign(nextSelectedCampaignId);
    } else {
      setSelectedCampaignId("");
      setEntities([]);
      setLinks([]);
    }

    setMessage(`Loaded ${nextCampaigns.length} campaign(s).`);
  }

  // Loads entities for the selected campaign.
  async function loadEntities(campaignId: string) {
    if (!campaignId) {
      setEntities([]);
      return;
    }

    const response = await fetch(`/api/entities?campaignId=${campaignId}`, {
      method: "GET",
    });

    const payload = (await response.json()) as { entities?: Entity[]; error?: string };
    if (!response.ok) {
      setMessage(payload.error ?? "Failed to load entities.");
      return;
    }

    const nextEntities = payload.entities ?? [];
    setEntities(nextEntities);
    setLinkFromEntityId((prev) =>
      prev && nextEntities.some((entity) => entity.id === prev) ? prev : nextEntities[0]?.id ?? "",
    );
    setLinkToEntityId((prev) => {
      if (prev && nextEntities.some((entity) => entity.id === prev)) {
        return prev;
      }

      const fallback = nextEntities.find((entity) => entity.id !== nextEntities[0]?.id);
      return fallback?.id ?? nextEntities[0]?.id ?? "";
    });
  }

  // Loads relationship links for the selected campaign.
  async function loadLinks(campaignId: string) {
    if (!campaignId) {
      setLinks([]);
      return;
    }

    const response = await fetch(`/api/entity-links?campaignId=${campaignId}`, {
      method: "GET",
    });

    const payload = (await response.json()) as { links?: EntityLink[]; error?: string };
    if (!response.ok) {
      setMessage(payload.error ?? "Failed to load entity links.");
      return;
    }

    setLinks(payload.links ?? []);
  }

  // Creates a campaign and refreshes the campaign list.
  async function handleCreateCampaign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!campaignName.trim()) {
      setMessage("Campaign name is required.");
      return;
    }

    const response = await fetch("/api/campaigns", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        name: campaignName.trim(),
        setting: campaignSetting.trim() || undefined,
        summary: campaignSummary.trim() || undefined,
      }),
    });

    const payload = (await response.json()) as { campaign?: Campaign; error?: string };
    if (!response.ok) {
      setMessage(payload.error ?? "Failed to create campaign.");
      return;
    }

    setCampaignName("");
    setCampaignSetting("");
    setCampaignSummary("");
    await loadCampaigns();
    setMessage(`Created campaign: ${payload.campaign?.name ?? "unknown"}.`);
  }

  // Creates an entity in the selected campaign and refreshes entity list.
  async function handleCreateEntity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedCampaignId) {
      setMessage("Select a campaign first.");
      return;
    }

    if (!entityName.trim()) {
      setMessage("Entity name is required.");
      return;
    }

    const response = await fetch("/api/entities", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        campaignId: selectedCampaignId,
        type: entityType,
        name: entityName.trim(),
        description: entityDescription.trim() || undefined,
        tags: entityTagsCsv
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        isVisibleToPlayers: entityVisibleToPlayers,
      }),
    });

    const payload = (await response.json()) as { entity?: Entity; error?: string };
    if (!response.ok) {
      setMessage(payload.error ?? "Failed to create entity.");
      return;
    }

    setEntityName("");
    setEntityDescription("");
    setEntityTagsCsv("");
    await loadEntities(selectedCampaignId);
    setMessage(`Created entity: ${payload.entity?.name ?? "unknown"}.`);
  }

  // Creates a directional link between two entities.
  async function handleCreateLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedCampaignId) {
      setMessage("Select a campaign first.");
      return;
    }

    if (!linkFromEntityId || !linkToEntityId) {
      setMessage("Select both entities for the relationship.");
      return;
    }

    if (linkFromEntityId === linkToEntityId) {
      setMessage("Link source and destination must be different entities.");
      return;
    }

    if (!linkRelationType.trim()) {
      setMessage("Relationship type is required.");
      return;
    }

    const response = await fetch("/api/entity-links", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        campaignId: selectedCampaignId,
        fromEntityId: linkFromEntityId,
        toEntityId: linkToEntityId,
        relationType: linkRelationType.trim(),
        notes: linkNotes.trim() || undefined,
      }),
    });

    const payload = (await response.json()) as { link?: EntityLink; error?: string };
    if (!response.ok) {
      setMessage(payload.error ?? "Failed to create entity link.");
      return;
    }

    setLinkNotes("");
    await loadLinks(selectedCampaignId);
    setMessage("Created relationship link.");
  }

  async function handleSignOut() {
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      setMessage(error.message);
      return;
    }

    router.replace("/auth");
    router.refresh();
  }

  useEffect(() => {
    void loadCampaigns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const entitiesById = useMemo(() => {
    return new Map(entities.map((entity) => [entity.id, entity]));
  }, [entities]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_20%_20%,#f5f0dd_0,#efe7ce_40%,#e8dcc0_100%)] text-zinc-900">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 md:px-8">
        <section className="rounded-2xl border border-zinc-800/10 bg-white/80 p-6 shadow-sm backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">DND Campaign Manager</h1>
              <p className="mt-2 text-sm text-zinc-700">
                API integration dashboard for campaigns, entities, and relationship links.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700"
            >
              Sign Out
            </button>
          </div>
          <p className="mt-4 rounded-md bg-zinc-900 px-3 py-2 text-sm text-zinc-100">{message}</p>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-zinc-800/10 bg-white/80 p-6 shadow-sm backdrop-blur">
            <h2 className="text-xl font-semibold">Campaigns</h2>
            <form className="mt-4 flex flex-col gap-3" onSubmit={handleCreateCampaign}>
              <input
                value={campaignName}
                onChange={(event) => setCampaignName(event.target.value)}
                placeholder="Campaign name"
                className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
              />
              <input
                value={campaignSetting}
                onChange={(event) => setCampaignSetting(event.target.value)}
                placeholder="Setting (Forgotten Realms, Homebrew...)"
                className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
              />
              <textarea
                value={campaignSummary}
                onChange={(event) => setCampaignSummary(event.target.value)}
                placeholder="Campaign summary"
                className="min-h-24 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="rounded-md bg-amber-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-600"
              >
                Create Campaign
              </button>
            </form>
            <ul className="mt-4 space-y-2">
              {campaigns.map((campaign) => (
                <li key={campaign.id}>
                  <button
                    type="button"
                    onClick={() => void selectCampaign(campaign.id)}
                    className={`w-full rounded-md border px-3 py-2 text-left text-sm transition ${
                      selectedCampaignId === campaign.id
                        ? "border-amber-600 bg-amber-50"
                        : "border-zinc-300 bg-white hover:bg-zinc-50"
                    }`}
                  >
                    <p className="font-semibold">{campaign.name}</p>
                    <p className="text-xs text-zinc-600">{campaign.setting ?? "No setting"}</p>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-zinc-800/10 bg-white/80 p-6 shadow-sm backdrop-blur">
            <h2 className="text-xl font-semibold">Entities</h2>
            <p className="mt-1 text-xs text-zinc-600">
              Selected campaign: {selectedCampaignId || "none"}
            </p>
            <form className="mt-4 flex flex-col gap-3" onSubmit={handleCreateEntity}>
              <select
                value={entityType}
                onChange={(event) => setEntityType(event.target.value)}
                className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
              >
                <option>NPC</option>
                <option>PC</option>
                <option>Item</option>
                <option>Location</option>
                <option>Lore</option>
                <option>Event</option>
              </select>
              <input
                value={entityName}
                onChange={(event) => setEntityName(event.target.value)}
                placeholder="Entity name"
                className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
              />
              <textarea
                value={entityDescription}
                onChange={(event) => setEntityDescription(event.target.value)}
                placeholder="Entity description"
                className="min-h-24 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
              />
              <input
                value={entityTagsCsv}
                onChange={(event) => setEntityTagsCsv(event.target.value)}
                placeholder="Tags (comma separated)"
                className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={entityVisibleToPlayers}
                  onChange={(event) => setEntityVisibleToPlayers(event.target.checked)}
                />
                Visible to players
              </label>
              <button
                type="submit"
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700"
              >
                Create Entity
              </button>
            </form>
            <ul className="mt-4 space-y-2">
              {entities.map((entity) => (
                <li key={entity.id} className="rounded-md border border-zinc-300 bg-white p-3 text-sm">
                  <p className="font-semibold">
                    {entity.name} <span className="text-zinc-500">({entity.type})</span>
                  </p>
                  <p className="mt-1 text-zinc-700">{entity.description || "No description provided."}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Tags: {entity.tags.length > 0 ? entity.tags.join(", ") : "none"}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-zinc-800/10 bg-white/80 p-6 shadow-sm backdrop-blur">
            <h2 className="text-xl font-semibold">Entity Links</h2>
            <p className="mt-1 text-xs text-zinc-600">
              Connect entities and inspect reverse-linked relationships.
            </p>
            <form className="mt-4 flex flex-col gap-3" onSubmit={handleCreateLink}>
              <select
                value={linkFromEntityId}
                onChange={(event) => setLinkFromEntityId(event.target.value)}
                className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">From entity</option>
                {entities.map((entity) => (
                  <option key={entity.id} value={entity.id}>
                    {entity.name} ({entity.type})
                  </option>
                ))}
              </select>
              <select
                value={linkToEntityId}
                onChange={(event) => setLinkToEntityId(event.target.value)}
                className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">To entity</option>
                {entities.map((entity) => (
                  <option key={entity.id} value={entity.id}>
                    {entity.name} ({entity.type})
                  </option>
                ))}
              </select>
              <input
                value={linkRelationType}
                onChange={(event) => setLinkRelationType(event.target.value)}
                placeholder="Relation type (ally, owns, located_in...)"
                className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
              />
              <textarea
                value={linkNotes}
                onChange={(event) => setLinkNotes(event.target.value)}
                placeholder="Optional notes"
                className="min-h-20 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700"
              >
                Create Link
              </button>
            </form>

            <ul className="mt-4 space-y-2">
              {links.map((link) => {
                const fromEntity = entitiesById.get(link.from_entity_id);
                const toEntity = entitiesById.get(link.to_entity_id);

                return (
                  <li key={link.id} className="rounded-md border border-zinc-300 bg-white p-3 text-sm">
                    <p className="font-semibold">
                      {fromEntity?.name ?? "Unknown"} <span className="text-zinc-500">[{link.relation_type}]</span>{" "}
                      {toEntity?.name ?? "Unknown"}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {fromEntity?.type ?? "?"} -&gt; {toEntity?.type ?? "?"}
                    </p>
                    <p className="mt-1 text-zinc-700">{link.notes || "No notes."}</p>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}
