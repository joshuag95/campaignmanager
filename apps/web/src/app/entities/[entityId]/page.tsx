"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

type EntityDetail = {
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

type RelatedLink = {
  id: string;
  relation_type: string;
  notes: string | null;
  related_entity?: {
    id: string;
    type: string;
    name: string;
  };
};

export default function EntityDetailPage() {
  const params = useParams<{ entityId: string }>();
  const router = useRouter();
  const entityId = params.entityId;

  const [entity, setEntity] = useState<EntityDetail | null>(null);
  const [membershipRole, setMembershipRole] = useState<"DM" | "PLAYER" | null>(null);
  const [outgoingLinks, setOutgoingLinks] = useState<RelatedLink[]>([]);
  const [incomingLinks, setIncomingLinks] = useState<RelatedLink[]>([]);
  const [message, setMessage] = useState("Loading entity...");

  const [editType, setEditType] = useState("");
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTagsCsv, setEditTagsCsv] = useState("");
  const [editVisibleToPlayers, setEditVisibleToPlayers] = useState(false);

  const isDm = membershipRole === "DM";

  async function loadEntity() {
    const response = await fetch(`/api/entities/${entityId}`, {
      method: "GET",
    });
    const payload = (await response.json()) as {
      entity?: EntityDetail;
      membershipRole?: "DM" | "PLAYER";
      outgoingLinks?: RelatedLink[];
      incomingLinks?: RelatedLink[];
      error?: string;
    };

    if (!response.ok || !payload.entity) {
      setMessage(payload.error ?? "Failed to load entity.");
      return;
    }

    setEntity(payload.entity);
    setMembershipRole(payload.membershipRole ?? null);
    setOutgoingLinks(payload.outgoingLinks ?? []);
    setIncomingLinks(payload.incomingLinks ?? []);

    setEditType(payload.entity.type);
    setEditName(payload.entity.name);
    setEditDescription(payload.entity.description ?? "");
    setEditTagsCsv(payload.entity.tags.join(", "));
    setEditVisibleToPlayers(payload.entity.is_visible_to_players);
    setMessage("Entity loaded.");
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isDm) {
      setMessage("Only DMs can edit entities.");
      return;
    }

    if (!editName.trim()) {
      setMessage("Entity name is required.");
      return;
    }

    const response = await fetch(`/api/entities/${entityId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: editType,
        name: editName.trim(),
        description: editDescription.trim() || null,
        tags: editTagsCsv
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        isVisibleToPlayers: editVisibleToPlayers,
      }),
    });

    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setMessage(payload.error ?? "Failed to update entity.");
      return;
    }

    await loadEntity();
    setMessage("Entity updated.");
  }

  async function handleDelete() {
    if (!isDm) {
      setMessage("Only DMs can delete entities.");
      return;
    }

    const confirmed = window.confirm("Delete this entity? This cannot be undone.");
    if (!confirmed) {
      return;
    }

    const response = await fetch(`/api/entities/${entityId}`, {
      method: "DELETE",
    });

    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setMessage(payload.error ?? "Failed to delete entity.");
      return;
    }

    router.replace("/");
    router.refresh();
  }

  useEffect(() => {
    void loadEntity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId]);

  const groupedTags = useMemo(() => entity?.tags ?? [], [entity?.tags]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_20%_20%,#f5f0dd_0,#efe7ce_40%,#e8dcc0_100%)] text-zinc-900">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 md:px-8">
        <section className="rounded-2xl border border-zinc-800/10 bg-white/90 p-6 shadow-sm backdrop-blur">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight">Entity Detail</h1>
            <Link className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white" href="/">
              Back to Dashboard
            </Link>
          </div>
          <p className="mt-4 rounded-md bg-zinc-900 px-3 py-2 text-sm text-zinc-100">{message}</p>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-zinc-800/10 bg-white/90 p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Overview</h2>
            <p className="mt-2 text-sm text-zinc-700">
              Role: <span className="font-semibold">{membershipRole ?? "unknown"}</span>
            </p>
            <p className="mt-2 text-sm text-zinc-700">
              Visibility: {entity?.is_visible_to_players ? "Player-visible" : "DM-only"}
            </p>
            <p className="mt-3 text-sm text-zinc-700">{entity?.description || "No description."}</p>
            <p className="mt-3 text-xs text-zinc-600">
              Tags: {groupedTags.length > 0 ? groupedTags.join(", ") : "none"}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800/10 bg-white/90 p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Outgoing Links</h2>
            <ul className="mt-3 space-y-2">
              {outgoingLinks.map((link) => (
                <li key={link.id} className="rounded-md border border-zinc-300 bg-white p-3 text-sm">
                  <p className="font-semibold">
                    [{link.relation_type}] {link.related_entity?.name ?? "Unknown"}
                  </p>
                  <p className="text-xs text-zinc-500">{link.related_entity?.type ?? "?"}</p>
                  <p className="mt-1 text-zinc-700">{link.notes || "No notes."}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-zinc-800/10 bg-white/90 p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Incoming Links</h2>
            <ul className="mt-3 space-y-2">
              {incomingLinks.map((link) => (
                <li key={link.id} className="rounded-md border border-zinc-300 bg-white p-3 text-sm">
                  <p className="font-semibold">
                    {link.related_entity?.name ?? "Unknown"} [{link.relation_type}]
                  </p>
                  <p className="text-xs text-zinc-500">{link.related_entity?.type ?? "?"}</p>
                  <p className="mt-1 text-zinc-700">{link.notes || "No notes."}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-800/10 bg-white/90 p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Edit Entity</h2>
          {!isDm ? (
            <p className="mt-3 rounded-md bg-zinc-100 px-3 py-2 text-sm text-zinc-700">
              Player mode: editing and deleting are limited to DMs.
            </p>
          ) : null}

          <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={handleSave}>
            <input
              disabled={!isDm}
              value={editType}
              onChange={(event) => setEditType(event.target.value)}
              placeholder="Type"
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
            />
            <input
              disabled={!isDm}
              value={editName}
              onChange={(event) => setEditName(event.target.value)}
              placeholder="Name"
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
            />
            <textarea
              disabled={!isDm}
              value={editDescription}
              onChange={(event) => setEditDescription(event.target.value)}
              placeholder="Description"
              className="min-h-28 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm md:col-span-2"
            />
            <input
              disabled={!isDm}
              value={editTagsCsv}
              onChange={(event) => setEditTagsCsv(event.target.value)}
              placeholder="Tags (comma separated)"
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm md:col-span-2"
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                disabled={!isDm}
                type="checkbox"
                checked={editVisibleToPlayers}
                onChange={(event) => setEditVisibleToPlayers(event.target.checked)}
              />
              Visible to players
            </label>
            <div className="flex gap-2 md:justify-end">
              <button
                type="submit"
                disabled={!isDm}
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                Save
              </button>
              <button
                type="button"
                disabled={!isDm}
                onClick={handleDelete}
                className="rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                Delete
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
