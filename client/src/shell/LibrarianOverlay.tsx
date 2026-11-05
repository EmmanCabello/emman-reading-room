import { useEffect, useRef, useState, type FormEvent } from "react";
import { CuratorBubble } from "../features/librarian/CuratorBubble";
import { useLibrarianBot } from "../hooks/useLibrarianBot";

const PROMPTS = [
  "Books about polar exploration",
  "Compare Mill's On Liberty with Thoreau's Civil Disobedience",
  "Tell me about Frankenstein",
  "Save the second one"
];

export function LibrarianOverlay() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const { status, messages, busy, ask, confirm, dismiss, signedIn } = useLibrarianBot();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy, open]);

  function submit(e: FormEvent) {
    e.preventDefault();
    const text = draft;
    setDraft("");
    void ask(text);
  }

  if (!open) {
    return (
      <button className="curator-toggle" onClick={() => setOpen(true)}>
        Ask the Curator
      </button>
    );
  }

  return (
    <aside className="curator" aria-label="Archival Research Curator">
      <div className="curator__head">
        <div>
          <h2>Archival Research Curator</h2>
          <div className="curator__mode">
            {status ? `${status.mode === "online" ? "Online model" : "Offline planner"}` : "Connecting..."}
            {!signedIn && " · sign in to stage titles"}
          </div>
        </div>
        <button className="btn btn--quiet btn--small" onClick={() => setOpen(false)}>
          Close
        </button>
      </div>

      <div className="curator__log">
        {messages.map((m) => (
          <CuratorBubble key={m.id} message={m} onConfirm={confirm} onDismiss={dismiss} />
        ))}
        {busy && <div className="bubble muted">Looking through the shelves...</div>}
        <div ref={endRef} />
      </div>

      <div className="curator__chips">
        {PROMPTS.map((p) => (
          <button key={p} className="chip" onClick={() => void ask(p)} disabled={busy}>
            {p}
          </button>
        ))}
      </div>

      <form className="curator__form" onSubmit={submit}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask about a subject, author or title"
          aria-label="Message to the curator"
          maxLength={800}
        />
        <button className="btn btn--solid" type="submit" disabled={busy || !draft.trim()}>
          Send
        </button>
      </form>
    </aside>
  );
}
