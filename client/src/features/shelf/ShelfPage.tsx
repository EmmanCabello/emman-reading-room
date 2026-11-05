import { Link } from "react-router-dom";
import { useUserShelf } from "../../hooks/useUserShelf";
import type { ShelfEntry, Stage } from "../../lib/types";
import { useSession } from "../auth/SessionProvider";
import { useClaimCard } from "../catalog/useClaimCard";

const COLUMNS: Array<{ key: Stage; label: string; next?: Stage; nextLabel?: string }> = [
  { key: "to-read", label: "To read", next: "reading", nextLabel: "Start reading" },
  { key: "reading", label: "Reading", next: "finished", nextLabel: "Mark finished" },
  { key: "finished", label: "Finished" }
];

export function ShelfPage() {
  const { patron } = useSession();
  const { shelf, loading, keep, drop, unpin } = useUserShelf();
  const { claim, pendingId, feedback } = useClaimCard();

  if (!patron) {
    return (
      <div className="page">
        <header className="page__head">
          <span className="eyebrow">My shelf</span>
          <h1>Your shelf follows you</h1>
          <p className="muted">Sign in to keep titles and bookmarks that stay in sync between the web app and the phone app.</p>
        </header>
        <Link className="btn btn--solid" to="/sign-in" state={{ from: "/shelf" }}>
          Sign in
        </Link>
      </div>
    );
  }

  const byStage = (stage: Stage): ShelfEntry[] => shelf.entries.filter((e) => e.stage === stage);

  return (
    <div className="page">
      <header className="page__head">
        <span className="eyebrow">My shelf</span>
        <h1>{shelf.entries.length ? "What you are keeping" : "Your shelf is empty"}</h1>
        <p className="muted">
          Shared with the phone app through the same API{loading ? " - refreshing..." : "."} Ask the Curator to stage titles for you; they only land here after you confirm.
        </p>
      </header>

      <div className="shelf-grid">
        {COLUMNS.map((col) => (
          <section key={col.key} className="shelf-col" aria-label={col.label}>
            <div className="shelf-col__head">
              <span>{col.label}</span>
              <span>{byStage(col.key).length}</span>
            </div>
            {byStage(col.key).map((entry) => (
              <article key={entry.workId} className="shelf-item">
                <Link className="shelf-item__title" to={`/work/${entry.workId}`}>
                  {entry.work.title}
                </Link>
                <span className="muted" style={{ fontSize: 13 }}>
                  {entry.work.author}, {entry.work.yearLabel}
                </span>
                <div className="shelf-item__row">
                  {col.next && (
                    <button className="btn btn--solid btn--small" onClick={() => keep(entry.workId, col.next!)}>
                      {col.nextLabel}
                    </button>
                  )}
                  <button className="btn btn--small" disabled={pendingId === entry.workId} onClick={() => claim(entry.workId)}>
                    Card
                  </button>
                  <button className="btn btn--quiet btn--small" onClick={() => drop(entry.workId)}>
                    Remove
                  </button>
                </div>
                {feedback?.workId === entry.workId && (
                  <div className={`notice ${feedback.kind === "ok" ? "notice--ok" : "notice--error"}`} style={{ fontSize: 12.5 }}>
                    {feedback.text}
                  </div>
                )}
              </article>
            ))}
          </section>
        ))}
      </div>

      <section className="pins">
        <span className="eyebrow">Bookmarks</span>
        {shelf.pins.length === 0 && <div className="empty">No bookmarks yet. Open any record and pin a place.</div>}
        {shelf.pins.map((p) => (
          <div key={p.id} className="pin-row">
            <div>
              <Link className="shelf-item__title" to={`/work/${p.workId}`}>
                {p.work.title}
              </Link>
              <div className="muted" style={{ fontSize: 13 }}>
                {p.locator || "Bookmarked"}
              </div>
            </div>
            <button className="btn btn--quiet btn--small" onClick={() => unpin(p.id)}>
              Remove
            </button>
          </div>
        ))}
      </section>
    </div>
  );
}
