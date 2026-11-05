import { Link } from "react-router-dom";
import { useSession } from "../features/auth/SessionProvider";

export function AllowanceGauge() {
  const { allowance, patron } = useSession();
  if (!allowance) return null;
  return (
    <div className="gauge" aria-label="Card allowance">
      <div className="gauge__label">
        <span>{allowance.audience === "guest" ? "Guest allowance" : "Reader allowance"}</span>
        <span>
          {allowance.used}/{allowance.cap}
        </span>
      </div>
      <div className="gauge__pips">
        {Array.from({ length: allowance.cap }, (_, i) => (
          <span key={i} className={`gauge__pip${i < allowance.used ? " gauge__pip--used" : ""}`} />
        ))}
      </div>
      <div className="gauge__hint">
        {allowance.remaining === 0
          ? "Allowance used. Titles already claimed stay free to download."
          : `${allowance.remaining} different title${allowance.remaining === 1 ? "" : "s"} left.`}
        {!patron && (
          <>
            {" "}
            <Link to="/sign-in">Sign in</Link> for 10.
          </>
        )}
      </div>
    </div>
  );
}
