import { useState, type FormEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ApiError } from "../../lib/api";
import { useSession } from "./SessionProvider";

const READER = { email: "emman@emman.local", password: "Emman123!" };
const CURATOR = { email: "emman.admin@emman.local", password: "EmmanAdmin123!" };

export function SignInPage() {
  const { signIn, register } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const goBack = (location.state as { from?: string } | null)?.from ?? "/";

  const [email, setEmail] = useState(READER.email);
  const [password, setPassword] = useState(READER.password);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [regError, setRegError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
      navigate(goBack, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  async function enroll(e: FormEvent) {
    e.preventDefault();
    setRegError(null);
    try {
      await register(newName, newEmail, newPassword);
      navigate(goBack, { replace: true });
    } catch (err) {
      setRegError(err instanceof ApiError ? err.message : "Could not create the account.");
    }
  }

  return (
    <div className="page">
      <header className="page__head">
        <span className="eyebrow">Reader entrance</span>
        <h1>Sign in to the Reading Room</h1>
        <p className="muted">Signed-in readers may claim up to 10 different cards and keep a shelf that follows them to the phone app.</p>
      </header>

      <div className="sign-in">
        <form className="panel" onSubmit={submit}>
          <h2>Sign in</h2>
          <label className="field">
            Email
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="username" required />
          </label>
          <label className="field">
            Password
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          {error && <div className="notice notice--error">{error}</div>}
          <button className="btn btn--solid" disabled={busy} type="submit">
            {busy ? "Signing in..." : "Sign in"}
          </button>

          <div className="cred">
            <strong>Emman test accounts</strong>
            <span>
              Reader: <code>emman@emman.local</code> / <code>Emman123!</code>
            </span>
            <span>
              Admin: <code>emman.admin@emman.local</code> / <code>EmmanAdmin123!</code>
            </span>
            <span style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <button
                type="button"
                className="btn btn--small"
                onClick={() => {
                  setEmail(READER.email);
                  setPassword(READER.password);
                }}
              >
                Fill reader
              </button>
              <button
                type="button"
                className="btn btn--small"
                onClick={() => {
                  setEmail(CURATOR.email);
                  setPassword(CURATOR.password);
                }}
              >
                Fill admin
              </button>
            </span>
          </div>
        </form>

        <form className="panel" onSubmit={enroll}>
          <h2>New reader</h2>
          <label className="field">
            Display name
            <input value={newName} onChange={(e) => setNewName(e.target.value)} required maxLength={60} />
          </label>
          <label className="field">
            Email
            <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} type="email" required />
          </label>
          <label className="field">
            Password (8+ characters)
            <input
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              type="password"
              minLength={8}
              autoComplete="new-password"
              required
            />
          </label>
          {regError && <div className="notice notice--error">{regError}</div>}
          <button className="btn" type="submit">
            Create account
          </button>
        </form>
      </div>
    </div>
  );
}
