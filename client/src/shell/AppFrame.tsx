import type { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { useSession } from "../features/auth/SessionProvider";
import { useUserShelf } from "../hooks/useUserShelf";
import { AllowanceGauge } from "./AllowanceGauge";
import { Header } from "./Header";
import { LibrarianOverlay } from "./LibrarianOverlay";

function Spine() {
  const { patron, signOut } = useSession();
  const { shelf } = useUserShelf();
  const link = ({ isActive }: { isActive: boolean }) => `spine__link${isActive ? " spine__link--active" : ""}`;

  return (
    <aside className="spine">
      <Link to="/" className="spine__mark">
        <span className="spine__crest" aria-hidden>
          E
        </span>
        <span className="spine__name">Emman Reading Room</span>
        <span className="spine__tag">Classic science, history &amp; ideas</span>
      </Link>

      <nav className="spine__nav" aria-label="Main">
        <NavLink to="/" end className={link}>
          Catalogue
        </NavLink>
        <NavLink to="/shelf" className={link}>
          My shelf
          {patron && <span className="spine__count">{shelf.entries.length}</span>}
        </NavLink>
        {patron?.role === "admin" && (
          <NavLink to="/curation" className={link}>
            Curation office
          </NavLink>
        )}
      </nav>

      <div className="spine__foot">
        <AllowanceGauge />
        {patron && (
          <div className="who">
            <div>
              <div className="who__name">{patron.displayName}</div>
              <div className="who__mail">{patron.email}</div>
            </div>
            <button className="btn btn--quiet btn--small" onClick={signOut}>
              Sign out
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

/** Layout container: spine rail on the left, header + page on the right, curator overlay on top. */
export function AppFrame({ children }: { children: ReactNode }) {
  return (
    <div className="frame">
      <Spine />
      <div className="workcol">
        <Header />
        <main>{children}</main>
      </div>
      <LibrarianOverlay />
    </div>
  );
}
