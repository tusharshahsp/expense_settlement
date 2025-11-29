import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { addGroupExpense, fetchUserGroups, type ExpenseStatus, type Group } from "../api";
import { useAuth } from "../auth";
import { EXPENSE_STATUS_OPTIONS } from "../constants";

function AddExpensePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedGroupId = searchParams.get("group");
  const [groups, setGroups] = useState<Group[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [form, setForm] = useState({
    groupId: "",
    payer_email: user?.email ?? "",
    amount: "",
    note: "",
    status: "assigned" as ExpenseStatus,
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }
    setLoadingGroups(true);
    fetchUserGroups(user.id)
      .then((data) => {
        setGroups(data);
        if (data.length > 0) {
          const preferred =
            requestedGroupId && data.some((group) => group.id === requestedGroupId)
              ? requestedGroupId
              : data[0].id;
          setForm((prev) => ({ ...prev, groupId: preferred }));
        }
      })
      .catch((err) => {
        console.error(err);
        setError("Unable to load your groups");
      })
      .finally(() => setLoadingGroups(false));
  }, [requestedGroupId, user]);

  if (!user) {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.groupId) {
      setError("Select a group first");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await addGroupExpense(form.groupId, {
        payer_email: form.payer_email,
        amount: Number(form.amount),
        note: form.note || undefined,
        status: form.status,
      });
      const backUrl = form.groupId ? `/expenses?group=${form.groupId}` : "/expenses";
      navigate(backUrl, { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to add expense";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">Add expense</h2>
        <Link
          to={form.groupId ? `/expenses?group=${form.groupId}` : "/expenses"}
          className="btn btn-outline-secondary btn-sm"
        >
          Back to expenses
        </Link>
      </div>

      {loadingGroups ? (
        <p>Loading your groups...</p>
      ) : groups.length === 0 ? (
        <div className="alert alert-warning">
          You are not part of any groups. Create one first from the groups page.
        </div>
      ) : (
        <form className="card p-4" onSubmit={handleSubmit}>
          {error && <div className="alert alert-danger">{error}</div>}
          <div className="mb-3">
            <label className="form-label">Group</label>
            <select
              className="form-select"
              value={form.groupId}
              onChange={(event) => setForm((prev) => ({ ...prev, groupId: event.target.value }))}
              required
            >
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>

          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Payer email</label>
              <input
                type="email"
                className="form-control"
                value={form.payer_email}
                onChange={(event) => setForm((prev) => ({ ...prev, payer_email: event.target.value }))}
                required
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Amount</label>
              <input
                type="number"
                className="form-control"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
                required
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Status</label>
              <select
                className="form-select text-capitalize"
                value={form.status}
                onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as ExpenseStatus }))}
              >
                {EXPENSE_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-3 mt-3">
            <label className="form-label">Note</label>
            <input
              type="text"
              className="form-control"
              placeholder="Optional memo"
              value={form.note}
              onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
            />
          </div>

          <button className="btn btn-success" type="submit" disabled={submitting}>
            {submitting ? "Saving..." : "Save expense"}
          </button>
        </form>
      )}
    </div>
  );
}

export default AddExpensePage;
