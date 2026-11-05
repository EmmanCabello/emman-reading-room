import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { call } from "../../lib/api";
import type { Stage, Work } from "../../lib/types";
import { useUserShelf } from "../../hooks/useUserShelf";
import { useSession } from "../auth/SessionProvider";
import { useClaimCard } from "./useClaimCard";

const STAGES: Array<{ key: Stage; label: string }> = [
  { key: "to-read", label: "To read" },
  { key: "reading", label: "Reading" },
  { key: "finished", label: "Finished" }
];

export function WorkPage() {
  const { workId } = useParams();
  const navigate = useNavigate();
  const { patron } = useSession();
  const { stageOf, keep, drop, pin, shelf, unpin } = useUserShelf();
  const { claim, pendingId, feedback } = useClaimCard();

  const [work, setWork] = useState<Work | null>(null);
  const [related, setRelated] = useState<Work[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [locator, setLocator] = useState("");

  useEffect(() => {
    setWork(null);
    setError(null);
    call<{ work: Work; related: Work[] }>(`/catalog/${workId}`)
      .then((r) => {
        setWork(r.work);
        setRelated(r.related);
      })
      .catch((e: Error) => setError(e.message));
  }, [workId]);

  if (error) return <div className="page"><div className="notice notice--error">{error}</div></div>;
  if (!work) return <div className="page muted">Opening the record...</div>;

  const stage = stageOf(work.id);
  const myPins = shelf.pins.filter((p) => p.workId === work.id);
  const needSignIn = () => navigate("/sign-in", { state: { from: `/work/${work.id}` } });

  return (
    <div className="page">
      <p style={{ marginBottom: 14 }}>
        <Link to="/">← Back to the catalogue</Link>
      </p>
      <div className="record">
        <article className="record__sheet">
          <span className="eyebrow">{work.room.label}</span>
          <h1 className="record__title">{work.title}</h1>
          <div className="record__author">
            {work.author} <span className="muted">{work.authorLife && `(${work.authorLife})`}</span>
          </div>
          <p>{work.summary}</p>
          <dl className="record__facts">
            <dt>Catalogue no.</dt>
            <dd>ERR-{String(work.id).padStart(4, "0")}</dd>
            <dt>First published</dt>
            <dd>{work.yearLabel}</dd>
            <dt>Rights</dt>
            <dd>Public domain in the United States</dd>
            <dt>Project Gutenberg</dt>
            <dd>
              <a href={work.gutenberg.url} target="_blank" rel="noreferrer">
                {work.gutenberg.available ? `Free e-book #${work.gutenberg.id}` : "Search the Gutenberg catalogue"}
              </a>
            </dd>
          </dl>
        </article>

        <div className="record__margin">
          <section className="margin-box">
            <h2>Bibliographic card</h2>
            <p className="muted" style={{ fontSize: 13.5 }}>
              A one-page card with this record and the Gutenberg link. It never contains the book text.
            </p>
            <button className="btn btn--solid" disabled={pendingId === work.id} onClick={() => claim(work.id)}>
              {pendingId === work.id ? "Claiming..." : "Claim card (PDF)"}
            </button>
            {feedback?.workId === work.id && (
              <div className={`notice ${feedback.kind === "ok" ? "notice--ok" : "notice--error"}`}>{feedback.text}</div>
            )}
          </section>

          <section className="margin-box">
            <h2>My shelf</h2>
            {patron ? (
              <>
                <div className="stage-switch">
                  {STAGES.map((s) => (
                    <button
                      key={s.key}
                      className={`btn btn--small ${stage === s.key ? "btn--solid" : ""}`}
                      onClick={() => keep(work.id, s.key)}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
                {stage && (
                  <button className="btn btn--quiet btn--small" onClick={() => drop(work.id)}>
                    Remove from shelf
                  </button>
                )}
                <form
                  className="pin-form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await pin(work.id, locator);
                    setLocator("");
                  }}
                >
                  <input
                    style={{ flex: 1, minHeight: 34, padding: "0 10px", border: "1.5px solid var(--border-strong)", borderRadius: 8 }}
                    value={locator}
                    onChange={(e) => setLocator(e.target.value)}
                    placeholder="Bookmark, e.g. Book II, ch. 4"
                    maxLength={200}
                  />
                  <button className="btn btn--small" type="submit">
                    Pin
                  </button>
                </form>
                {myPins.map((p) => (
                  <div key={p.id} className="pin-row" style={{ padding: "6px 10px" }}>
                    <span style={{ fontSize: 13 }}>{p.locator || "Bookmarked"}</span>
                    <button className="btn btn--quiet btn--small" onClick={() => unpin(p.id)}>
                      Remove
                    </button>
                  </div>
                ))}
              </>
            ) : (
              <button className="btn" onClick={needSignIn}>
                Sign in to keep a shelf
              </button>
            )}
          </section>

          {related.length > 0 && (
            <section className="margin-box">
              <h2>Nearby on the shelves</h2>
              <ul className="related">
                {related.map((r) => (
                  <li key={r.id}>
                    <Link to={`/work/${r.id}`}>{r.title}</Link>
                    <small>
                      {r.author}, {r.yearLabel}
                    </small>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
