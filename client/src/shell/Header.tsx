import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useSession } from "../features/auth/SessionProvider";

const TITLES: Record<string, string> = {
  "/": "Catalogue",
  "/shelf": "My shelf",
  "/curation": "Curation office",
  "/sign-in": "Reader entrance"
};

/** Header: page label, catalogue search, and the account control. */
export function Header() {
  const { patron } = useSession();
  const location = useLocation();
  const navigate = useNavigate();
  const [term, setTerm] = useState("");

  const label = location.pathname.startsWith("/work/") ? "Record" : (TITLES[location.pathname] ?? "Reading Room");

  function search(e: FormEvent) {
    e.preventDefault();
    navigate(term.trim() ? `/?q=${encodeURIComponent(term.trim())}` : "/");
  }

  return (
    <header className="masthead">
      <span className="masthead__title">{label}</span>
      <form className="masthead__search" onSubmit={search} role="search">
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search titles, authors, subjects"
          aria-label="Search the catalogue"
        />
        <button className="btn btn--small" type="submit">
          Search
        </button>
      </form>
      <div className="masthead__end">
        {patron ? (
          <span className="muted" style={{ fontSize: 13 }}>
            {patron.role === "admin" ? "Curator" : "Reader"}: <strong>{patron.displayName}</strong>
          </span>
        ) : (
          <Link className="btn btn--solid btn--small" to="/sign-in">
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
