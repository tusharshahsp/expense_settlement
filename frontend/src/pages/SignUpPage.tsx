import { FormEvent, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signup, type SignupPayload } from "../api";

const emptyForm: SignupPayload = {
  name: "",
  email: "",
  password: "",
};

const REDIRECT_DELAY_MS = 2000;

function SignUpPage() {
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const redirectTimerRef = useRef<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) {
        window.clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await signup(form);
      setForm(emptyForm);
      setSuccessMessage("Account created! Redirecting you to the login page...");
      if (redirectTimerRef.current) {
        window.clearTimeout(redirectTimerRef.current);
      }
      redirectTimerRef.current = window.setTimeout(() => {
        navigate("/login");
      }, REDIRECT_DELAY_MS);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign up");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="app-shell">
      <header>
        <h1>Join the Expense App</h1>
        <p>Create your account to start tracking expenses.</p>
      </header>

      <main className="grid">
        <section className="card">
          <h2>Sign up</h2>
          <form onSubmit={handleSubmit} className="form">
            <label>
              <span>Name</span>
              <input
                name="name"
                type="text"
                value={form.name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder="Alex Doe"
                required
              />
            </label>

            <label>
              <span>Email</span>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, email: event.target.value }))
                }
                placeholder="alex@example.com"
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
                placeholder="At least 6 characters"
                required
                minLength={6}
              />
            </label>

            {error && <p className="error">{error}</p>}
            {successMessage && !error && (
              <p className="success">{successMessage}</p>
            )}

            <button type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Create account"}
            </button>

            <p>
              Already have an account? <Link to="/login">Log in</Link>
            </p>
          </form>
        </section>
      </main>
    </div>
  );
}

export default SignUpPage;
