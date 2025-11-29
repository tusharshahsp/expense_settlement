import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login, type LoginPayload } from "../api";
import { useAuth } from "../auth";

const emptyForm: LoginPayload = {
  email: "",
  password: "",
};

function LoginPage() {
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setUser } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const authenticated = await login(form);
      setUser(authenticated);
      navigate("/home");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to login");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="app-shell">
      <header>
        <h1>Welcome back</h1>
        <p>Log in to view your dashboard.</p>
      </header>

      <main className="grid">
        <section className="card">
          <h2>Log in</h2>
          <form onSubmit={handleSubmit} className="form">
            <label>
              <span>Email</span>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, email: event.target.value }))
                }
                placeholder="you@example.com"
                required
              />
            </label>

            <label>
              <span>Password</span>
              <input
                name="password"
                type="password"
                value={form.password}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, password: event.target.value }))
                }
                placeholder="Enter your password"
                required
                minLength={6}
              />
            </label>

            {error && <p className="error">{error}</p>}

            <button type="submit" disabled={submitting}>
              {submitting ? "Signing in..." : "Sign in"}
            </button>

            <p>
              Need an account? <Link to="/signup">Create one</Link>
            </p>
          </form>
        </section>
      </main>
    </div>
  );
}

export default LoginPage;
