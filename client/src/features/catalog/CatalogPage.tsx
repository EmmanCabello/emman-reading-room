import { useNavigate, useSearchParams } from "react-router-dom";
import { useSession } from "../auth/SessionProvider";
import { useCatalogSearch, type CatalogFilters } from "../../hooks/useCatalogSearch";
import { useUserShelf } from "../../hooks/useUserShelf";
import { WorkCard } from "../../shell/WorkCard";
import { useClaimCard } from "./useClaimCard";
import { SearchAutocomplete } from "./SearchAutoComplete";

export function CatalogPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { patron } = useSession();
  const { stageOf, keep } = useUserShelf();
  const { claim, pendingId, feedback } = useClaimCard();

  const filters: CatalogFilters = {
    q: params.get("q") ?? "",
    room: params.get("room") ?? "",
    sort: (params.get("sort") as CatalogFilters["sort"]) ?? (params.get("q") ? "relevance" : "title"),
    page: Number(params.get("page") ?? 1) || 1
  };
  const { result, rooms, loading, error } = useCatalogSearch(filters);

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    if (!("page" in patch)) next.delete("page");
    setParams(next);
  };

  const totalPages = result ? Math.max(1, Math.ceil(result.total / result.pageSize)) : 1;
  const totalWorks = rooms.reduce((n, r) => n + r.count, 0);

  async function shelve(workId: number) {
    if (!patron) return navigate("/sign-in", { state: { from: "/" } });
    await keep(workId, "to-read");
  }

  return (
    <div className="page">
      <header className="page__head">
        
        <span className="eyebrow">The catalogue</span>
        <h1>{filters.q ? `Results for "${filters.q}"` : "Browse the reading rooms"}</h1>
        <p className="muted">
          {totalWorks || "Hundreds of"} public-domain works. Claim a one-page bibliographic card for any title; the full texts live on Project Gutenberg.
        </p>
        <SearchAutocomplete />
      </header>

      <div className="rooms" role="tablist" aria-label="Reading rooms">
        <button className={`room-tab${!filters.room ? " room-tab--active" : ""}`} onClick={() => update({ room: null })}>
          All rooms <small>{totalWorks}</small>
        </button>
        {rooms.map((r) => (
          <button
            key={r.key}
            className={`room-tab${filters.room === r.key ? " room-tab--active" : ""}`}
            onClick={() => update({ room: r.key })}
          >
            {r.label} <small>{r.count}</small>
          </button>
        ))}
      </div>

      <div className="catalog-bar">
        <span className="muted">{result ? `${result.total} title${result.total === 1 ? "" : "s"}` : "Loading..."}</span>
        <label className="muted" style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
          Order by
          <select value={filters.sort} onChange={(e) => update({ sort: e.target.value })}>
            {filters.q && <option value="relevance">Relevance</option>}
            <option value="title">Title</option>
            <option value="author">Author</option>
            <option value="year">Year published</option>
          </select>
        </label>
      </div>

      {error && <div className="notice notice--error">{error}. Is the API running on port 4100?</div>}

      {result && result.items.length === 0 && !loading && (
        <div className="empty">Nothing matched. Try an author surname or a broader subject.</div>
      )}

      <div className="ledger" style={{ opacity: loading ? 0.6 : 1 }}>
        {result?.items.map((work) => (
          <WorkCard
            key={work.id}
            work={work}
            shelfStage={stageOf(work.id)}
            claiming={pendingId === work.id}
            feedback={feedback}
            onClaim={claim}
            onShelve={shelve}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <nav className="pager" aria-label="Pages">
          <button className="btn btn--small" disabled={filters.page <= 1} onClick={() => update({ page: String(filters.page - 1) })}>
            Previous
          </button>
          <span className="muted">
            Page {filters.page} of {totalPages}
          </span>
          <button
            className="btn btn--small"
            disabled={filters.page >= totalPages}
            onClick={() => update({ page: String(filters.page + 1) })}
          >
            Next
          </button>
        </nav>
      )}
    </div>
  );
}
