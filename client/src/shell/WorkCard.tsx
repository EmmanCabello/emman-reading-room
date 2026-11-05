import { Link } from "react-router-dom";
import type { ClaimFeedback } from "../features/catalog/useClaimCard";
import type { Stage, Work } from "../lib/types";

const STAGE_LABEL: Record<Stage, string> = {
  "to-read": "On your shelf: to read",
  reading: "On your shelf: reading",
  finished: "On your shelf: finished"
};

interface Props {
  work: Work;
  shelfStage: Stage | null;
  claiming: boolean;
  feedback: ClaimFeedback | null;
  onClaim: (workId: number) => void;
  onShelve?: (workId: number) => void;
}

export function WorkCard({ work, shelfStage, claiming, feedback, onClaim, onShelve }: Props) {
  const note = feedback && feedback.workId === work.id ? feedback : null;
  return (
    <article className="volume">
      <div className="volume__meta">
        <span>{work.room.label}</span>
        <span>{work.yearLabel}</span>
      </div>
      <div style={{ display: "grid", gap: 6, alignContent: "start" }}>
        <Link className="volume__title" to={`/work/${work.id}`}>
          {work.title}
        </Link>
        <span className="volume__author">{work.author}</span>
        <p className="volume__summary">{work.summary}</p>
        {shelfStage && <span className="volume__badge">{STAGE_LABEL[shelfStage]}</span>}
      </div>
      <div>
        <div className="volume__actions">
          <button className="btn btn--solid btn--small" disabled={claiming} onClick={() => onClaim(work.id)}>
            {claiming ? "Claiming..." : "Claim card"}
          </button>
          {onShelve && !shelfStage && (
            <button className="btn btn--small" onClick={() => onShelve(work.id)}>
              Add to shelf
            </button>
          )}
          <Link className="btn btn--quiet btn--small" to={`/work/${work.id}`}>
            Record
          </Link>
        </div>
        {note && (
          <div className={`notice ${note.kind === "ok" ? "notice--ok" : "notice--error"}`} style={{ marginTop: 8, fontSize: 13 }}>
            {note.text}
          </div>
        )}
      </div>
    </article>
  );
}
