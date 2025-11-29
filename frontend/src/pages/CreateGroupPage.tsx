import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createGroup } from "../api";
import { useAuth } from "../auth";

function CreateGroupPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", description: "" });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!user) {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await createGroup({
        owner_id: user.id,
        name: form.name,
        description: form.description || undefined,
      });
      navigate("/groups", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create group");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container py-4">
      <button className="btn btn-link mb-3" onClick={() => navigate(-1)}>
        &larr; Back
      </button>
      <div className="card p-4 shadow-sm">
        <h2 className="mb-3">Create a new group</h2>
        <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
          <div>
            <label className="form-label">Group name</label>
            <input
              type="text"
              className="form-control"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
          </div>
          <div>
            <label className="form-label">Description (optional)</label>
            <textarea
              className="form-control"
              rows={3}
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, description: event.target.value }))
              }
            />
          </div>
          {error && <div className="alert alert-danger">{error}</div>}
          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? "Creating..." : "Create group"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default CreateGroupPage;
