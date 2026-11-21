
import { Link, useLocation } from "react-router-dom";
import { useSession } from "../features/auth/SessionProvider";
import { SearchAutocomplete } from "../features/catalog/SearchAutoComplete";

const TITLES: Record<string, string> = {
  "/": "Catalogue",
  "/shelf": "My shelf",
  "/curation": "Curation office",
  "/sign-in": "Reader entrance"
};

/** Header: page label, unified catalogue search, and account control. */
export function Header() {
  const { patron } = useSession();
  const location = useLocation();

  const label = location.pathname.startsWith("/work/")
    ? "Record"
    : (TITLES[location.pathname] ?? "Reading Room");

  return (
    <header className="masthead">
      <span className="masthead__title">{label}</span>

      <div className="masthead__search">
        <SearchAutocomplete />
      </div>

      <div className="masthead__end">
        {patron ? (
          <span className="muted" style={{ fontSize: 13 }}>
            {patron.role === "admin" ? "Curator" : "Reader"}:{" "}
            <strong>{patron.displayName}</strong>
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
