import type { BotMessage } from "../../hooks/useLibrarianBot";

type Entry = NonNullable<BotMessage["proposals"]>[number];

interface Props {
  proposal: Entry;
  onConfirm: (id: string) => void;
  onDismiss: (id: string) => void;
}

const STAGE = { "to-read": "to read", reading: "reading", finished: "finished" } as const;

/** A staged addition. Nothing is on the shelf until the reader presses Confirm. */
export function ProposalCard({ proposal, onConfirm, onDismiss }: Props) {
  return (
    <div className="proposal">
      <span className="eyebrow">Staged for your shelf ({STAGE[proposal.stage]})</span>
      <ul className="proposal__titles">
        {proposal.works.map((w) => (
          <li key={w.id}>
            <span>{w.title}</span> - {w.author}
          </li>
        ))}
      </ul>
      {proposal.state === "pending" && (
        <div className="proposal__actions">
          <button className="btn btn--solid btn--small" onClick={() => onConfirm(proposal.id)}>
            Confirm
          </button>
          <button className="btn btn--quiet btn--small" onClick={() => onDismiss(proposal.id)}>
            Dismiss
          </button>
        </div>
      )}
      {proposal.state === "confirmed" && <div className="notice notice--ok">Added to your shelf.</div>}
      {proposal.state === "dismissed" && <div className="notice">Dismissed. Nothing was saved.</div>}
      {proposal.state === "failed" && <div className="notice notice--error">That proposal could not be applied.</div>}
    </div>
  );
}
