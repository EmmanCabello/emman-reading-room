import type { BotMessage } from "../../hooks/useLibrarianBot";
import { ProposalCard } from "./ProposalCard";

interface Props {
  message: BotMessage;
  onConfirm: (id: string) => void;
  onDismiss: (id: string) => void;
}

export function CuratorBubble({ message, onConfirm, onDismiss }: Props) {
  const mine = message.role === "reader";
  return (
    <>
      <div className={`bubble${mine ? " bubble--reader" : ""}`}>
        {message.text}
        {message.trace && message.trace.length > 0 && (
          <div className="bubble__trace">
            Tools used:{" "}
            {message.trace.map((step, i) => (
              <span key={i}>
                {i > 0 && " → "}
                <code>{step.tool}</code>
              </span>
            ))}
          </div>
        )}
      </div>
      {message.proposals?.map((p) => (
        <ProposalCard key={p.id} proposal={p} onConfirm={onConfirm} onDismiss={onDismiss} />
      ))}
    </>
  );
}
