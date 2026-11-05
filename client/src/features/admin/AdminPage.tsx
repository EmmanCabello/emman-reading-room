import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { call } from "../../lib/api";
import type { AdminOverview, AdminPatron, Room } from "../../lib/types";
import { useSession } from "../auth/SessionProvider";

const TILE_LABELS: Array<[string, string]> = [
  ["works", "Titles"],
  ["patrons", "Accounts"],
  ["retrievals", "Reader claims"],
  ["guestRetrievals", "Guest claims"],
  ["shelfItems", "Shelved"],
  ["pins", "Bookmarks"],
  ["pendingProposals", "Staged by Curator"]
];

export function AdminPage() {
  const { patron } = useSession();
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [patrons, setPatrons] = useState<AdminPatron[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [o, p, r] = await Promise.all([
        call<AdminOverview>("/admin/overview"),
        call<{ patrons: AdminPatron[] }>("/admin/patrons"),
        call<{ rooms: Room[] }>("/catalog/rooms")
      ]);
      setOverview(o);
      setPatrons(p.patrons);
      setRooms(r.rooms);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the curation office.");
    }
  }, []);

  useEffect(() => {
    if (patron?.role === "admin") void load();
  }, [patron, load]);

  if (!patron || patron.role !== "admin") {
    return (
      <div className="page">
        <header className="page__head">
          <span className="eyebrow">Curation office</span>
          <h1>Curators only</h1>
          <p className="muted">Sign in with a curator account (emman.admin@emman.local) to manage the catalogue and allowances.</p>
        </header>
        <Link className="btn btn--solid" to="/sign-in" state={{ from: "/curation" }}>
          Sign in
        </Link>
      </div>
    );
  }

  async function resetPatron(id: string, name: string) {
    const r = await call<{ cleared: number }>(`/admin/patrons/${id}/claims`, { method: "DELETE" });
    setMessage(`Cleared ${r.cleared} claim(s) for ${name}.`);
    await load();
  }

  async function resetGuest(ip: string) {
    const r = await call<{ cleared: number }>(`/admin/guests/${encodeURIComponent(ip)}/claims`, { method: "DELETE" });
    setMessage(`Cleared ${r.cleared} claim(s) for ${ip}.`);
    await load();
  }

  return (
    <div className="page">
      <header className="page__head">
        <span className="eyebrow">Curation office</span>
        <h1>Reading room at a glance</h1>
      </header>

      {error && <div className="notice notice--error">{error}</div>}
      {message && <div className="notice notice--ok" style={{ marginBottom: 16 }}>{message}</div>}

      {overview && (
        <>
          <div className="tiles">
            {TILE_LABELS.map(([key, label]) => (
              <div className="tile" key={key}>
                <strong>{overview.totals[key] ?? 0}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>

          <div className="curation-split">
            <section>
              <h2 className="eyebrow" style={{ marginBottom: 8 }}>Most claimed cards</h2>
              <div className="table-wrap">
                <table className="ledger-table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Claims</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.popular.length === 0 && (
                      <tr>
                        <td colSpan={2} className="muted">No reader claims yet.</td>
                      </tr>
                    )}
                    {overview.popular.map((p) => (
                      <tr key={p.work.id}>
                        <td>
                          <Link className="title-strong" to={`/work/${p.work.id}`}>{p.work.title}</Link>
                        </td>
                        <td>{p.claims}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 className="eyebrow" style={{ marginBottom: 8 }}>Guest IPs by claims</h2>
              <div className="table-wrap">
                <table className="ledger-table">
                  <thead>
                    <tr>
                      <th>IP address</th>
                      <th>Claims</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {overview.guests.length === 0 && (
                      <tr>
                        <td colSpan={3} className="muted">No guest claims yet.</td>
                      </tr>
                    )}
                    {overview.guests.map((g) => (
                      <tr key={g.ip}>
                        <td>{g.ip}</td>
                        <td>{g.claims}</td>
                        <td>
                          <button className="btn btn--quiet btn--small" onClick={() => resetGuest(g.ip)}>
                            Reset
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <h2 className="eyebrow" style={{ marginBottom: 8 }}>Accounts</h2>
          <div className="table-wrap" style={{ marginBottom: 24 }}>
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Claimed</th>
                  <th>Shelved</th>
                  <th>Bookmarks</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {patrons.map((p) => (
                  <tr key={p.id}>
                    <td>{p.displayName}</td>
                    <td>{p.email}</td>
                    <td>{p.role}</td>
                    <td>{p.claimed}</td>
                    <td>{p.shelved}</td>
                    <td>{p.pins}</td>
                    <td>
                      <button className="btn btn--quiet btn--small" onClick={() => resetPatron(p.id, p.displayName)}>
                        Reset claims
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 className="eyebrow" style={{ marginBottom: 8 }}>Recent claims</h2>
          <div className="table-wrap" style={{ marginBottom: 24 }}>
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Reader</th>
                  <th>Title</th>
                </tr>
              </thead>
              <tbody>
                {overview.recent.length === 0 && (
                  <tr>
                    <td colSpan={3} className="muted">Nothing claimed yet.</td>
                  </tr>
                )}
                {overview.recent.map((r, i) => (
                  <tr key={i}>
                    <td>{new Date(r.claimedAt).toLocaleString()}</td>
                    <td>{r.patron}</td>
                    <td>{r.work.title}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <AddTitleForm rooms={rooms} onDone={(t) => { setMessage(`Added "${t}" to the catalogue.`); void load(); }} />
        </>
      )}
    </div>
  );
}

function AddTitleForm({ rooms, onDone }: { rooms: Room[]; onDone: (title: string) => void }) {
  const [form, setForm] = useState({ title: "", author: "", year: "", summary: "", roomKey: "", gutenbergId: "" });
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    const room = rooms.find((r) => r.key === (form.roomKey || rooms[0]?.key));
    if (!room) return;
    try {
      await call("/admin/works", {
        method: "POST",
        body: {
          title: form.title,
          author: form.author,
          year: Number(form.year),
          summary: form.summary,
          roomKey: room.key,
          roomLabel: room.label,
          gutenbergId: form.gutenbergId ? Number(form.gutenbergId) : null
        }
      });
      onDone(form.title);
      setForm({ title: "", author: "", year: "", summary: "", roomKey: "", gutenbergId: "" });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add the title.");
    }
  }

  return (
    <form className="panel" onSubmit={submit}>
      <h2>Add a title to the catalogue</h2>
      <div className="form-grid">
        <label className="field">
          Title
          <input value={form.title} onChange={set("title")} required />
        </label>
        <label className="field">
          Author
          <input value={form.author} onChange={set("author")} required />
        </label>
        <label className="field">
          First published (negative for BCE)
          <input value={form.year} onChange={set("year")} type="number" required />
        </label>
        <label className="field">
          Reading room
          <select value={form.roomKey || rooms[0]?.key || ""} onChange={set("roomKey")}>
            {rooms.map((r) => (
              <option key={r.key} value={r.key}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Gutenberg ebook number (optional)
          <input value={form.gutenbergId} onChange={set("gutenbergId")} type="number" min={1} />
        </label>
        <label className="field span-2">
          Summary
          <textarea value={form.summary} onChange={set("summary")} required maxLength={600} />
        </label>
      </div>
      {error && <div className="notice notice--error">{error}</div>}
      <div>
        <button className="btn btn--solid" type="submit">
          Add title
        </button>
      </div>
    </form>
  );
}
