import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  fetchGroup,
  updateGroupExpense,
  type ExpenseStatus,
  type GroupDetail,
} from "../api";
import { useAuth } from "../auth";
import { EXPENSE_STATUS_OPTIONS } from "../constants";

function EditExpensePage() {
  const { user } = useAuth();
  const { expenseId } = useParams<{ expenseId: string }>();
  const [searchParams] = useSearchParams();
  const groupId = searchParams.get("group");
  const navigate = useNavigate();

  const [groupDetail, setGroupDetail] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    payer_email: "",
    amount: "",
    note: "",
    status: "assigned" as ExpenseStatus,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user || !groupId || !expenseId) {
      return;
    }
    setLoading(true);
    setError(null);
    fetchGroup(groupId)
      .then((detail) => {
        setGroupDetail(detail);
        const expense = detail.expenses.find((entry) => entry.id === expenseId);
        if (!expense) {
          setError("Expense not found in this group.");
          return;
        }
        setForm({
          payer_email: expense.payer_email,
          amount: expense.amount.toString(),
          note: expense.note ?? "",
          status: expense.status,
        });
      })
      .catch((err) => {
        console.error(err);
        setError("Unable to load expense details.");
      })
      .finally(() => setLoading(false));
  }, [expenseId, groupId, user]);

  if (!user) {
    return null;
  }

  if (!groupId) {
    return (
      <div className="container py-4">
        <div className="alert alert-warning">A group id is required to edit an expense.</div>
        <Link to="/expenses" className="btn btn-secondary">
          Back to expenses
        </Link>
      </div>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!expenseId) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await updateGroupExpense(groupId, expenseId, {
        payer_email: form.payer_email,
        amount: Number(form.amount),
        note: form.note || undefined,
        status: form.status,
      });
      navigate(`/expenses?group=${groupId}`, { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to update expense";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  const backLink = `/expenses?group=${groupId}`;

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">Edit expense</h2>
        <Link to={backLink} className="btn btn-outline-secondary btn-sm">
          Back to expenses
        </Link>
      </div>

      {loading ? (
        <p>Loading expense details...</p>
      ) : error ? (
        <div className="alert alert-danger">{error}</div>
      ) : !groupDetail ? (
        <p className="text-muted">Select an expense to edit.</p>
      ) : (
        <form className="card p-4" onSubmit={handleSubmit}>
          <div className="mb-3">
            <small className="text-muted">Group</small>
            <div className="fw-semibold">{groupDetail.name}</div>
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
            {submitting ? "Saving..." : "Update expense"}
          </button>
        </form>
      )}
    </div>
  );
}

export default EditExpensePage;
