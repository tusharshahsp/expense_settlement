import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  deleteGroupExpense,
  fetchGroup,
  fetchUserGroups,
  type Group,
  type GroupDetail,
} from "../api";
import { useAuth } from "../auth";

type DetailView = "history" | "summary";

function ExpensesPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedGroupId = searchParams.get("group");

  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [selectedGroup, setSelectedGroup] = useState<GroupDetail | null>(null);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedExpenseId, setSelectedExpenseId] = useState<string>("");
  const [detailView, setDetailView] = useState<DetailView>("history");

  if (!user) {
    return null;
  }

  useEffect(() => {
    setLoadingGroups(true);
    setError(null);
    fetchUserGroups(user.id)
      .then((data) => {
        setGroups(data);
      })
      .catch((err) => {
        console.error(err);
        setError("Unable to load your groups");
      })
      .finally(() => setLoadingGroups(false));
  }, [user.id]);

  useEffect(() => {
    if (groups.length === 0) {
      setSelectedGroupId("");
      return;
    }
    const candidate =
      requestedGroupId && groups.some((group) => group.id === requestedGroupId)
        ? requestedGroupId
        : groups[0].id;
    setSelectedGroupId((prev) => (prev === candidate ? prev : candidate));
    if (candidate && candidate !== requestedGroupId) {
      setSearchParams({ group: candidate });
    }
  }, [groups, requestedGroupId, setSearchParams]);

  useEffect(() => {
    if (!selectedGroupId) {
      setSelectedGroup(null);
      setSelectedExpenseId("");
      return;
    }
    setLoadingDetail(true);
    setDetailError(null);
    fetchGroup(selectedGroupId)
      .then((detail) => {
        setSelectedGroup(detail);
        setSelectedExpenseId("");
        setDetailView("history");
      })
      .catch((err) => {
        console.error(err);
        setDetailError("Unable to load group expenses");
        setSelectedGroup(null);
        setSelectedExpenseId("");
      })
      .finally(() => setLoadingDetail(false));
  }, [selectedGroupId]);

  async function handleDelete(expenseId: string) {
    if (!selectedGroupId) {
      return;
    }
    if (!window.confirm("Are you sure you want to delete this expense?")) {
      return;
    }
    setDeletingId(expenseId);
    setDetailError(null);
    try {
      const updated = await deleteGroupExpense(selectedGroupId, expenseId);
      setSelectedGroup(updated);
      if (!updated.expenses.some((expense) => expense.id === selectedExpenseId)) {
        setSelectedExpenseId("");
      }
    } catch (err) {
      console.error(err);
      setDetailError(err instanceof Error ? err.message : "Unable to delete expense");
    } finally {
      setDeletingId(null);
    }
  }

  const addExpenseLink =
    selectedGroupId && selectedGroupId.length > 0
      ? `/expenses/add?group=${encodeURIComponent(selectedGroupId)}`
      : "/expenses/add";

  const selectedExpense = useMemo(
    () => selectedGroup?.expenses.find((expense) => expense.id === selectedExpenseId) ?? null,
    [selectedGroup, selectedExpenseId]
  );

  const expenseSummary = useMemo(() => {
    if (!selectedExpense || !selectedGroup) {
      return [];
    }
    const memberCount = selectedGroup.members.length;
    const share = memberCount ? selectedExpense.amount / memberCount : 0;
    return selectedGroup.members.map((member) => {
      const paid = member.id === selectedExpense.payer_id ? selectedExpense.amount : 0;
      const owes = share - paid;
      return {
        ...member,
        paid,
        share,
        owes,
      };
    });
  }, [selectedExpense, selectedGroup]);

  return (
    <div className="page-wrapper">
      <div className="container py-5 flex-column gap-4">
        <div className="section-card">
          <div className="section-title">
            <div>
              <h3>Expense management</h3>
              <p className="text-muted mb-0">Select a group to manage its expenses.</p>
            </div>
            <Link to={addExpenseLink} className="btn btn-primary">
              + Add expense
            </Link>
          </div>

          {loadingGroups ? (
            <p>Loading...</p>
          ) : error ? (
            <div className="alert alert-danger mb-0">{error}</div>
          ) : groups.length === 0 ? (
            <p className="text-muted">You are not part of any groups yet.</p>
          ) : (
            <div className="row g-3 align-items-end">
              <div className="col-md-6">
                <label className="form-label">Select a group</label>
                <select
                  className="form-select"
                  value={selectedGroupId}
                  onChange={(event) => {
                    setSelectedGroupId(event.target.value);
                    setSearchParams(event.target.value ? { group: event.target.value } : {});
                  }}
                >
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {selectedGroup && (
          <div className="flex-column gap-4">
            <div className="expense-stats">
              <div className="stat-card">
                <p className="text-muted text-uppercase mb-1">Total assigned</p>
                <h4>${selectedGroup.total_expense.toFixed(2)}</h4>
                <small>Across all recorded expenses</small>
              </div>
              <div className="stat-card">
                <p className="text-muted text-uppercase mb-1">Group members</p>
                <h4>{selectedGroup.members.length}</h4>
                <small>Actively sharing costs</small>
              </div>
              <div className="stat-card">
                <p className="text-muted text-uppercase mb-1">Expenses logged</p>
                <h4>{selectedGroup.expenses.length}</h4>
                <small>Latest first</small>
              </div>
              <div className="stat-card">
                <p className="text-muted text-uppercase mb-1">Avg per member</p>
                <h4>
                  $
                  {selectedGroup.members.length
                    ? (selectedGroup.total_expense / selectedGroup.members.length).toFixed(2)
                    : "0.00"}
                </h4>
                <small>Equal share assumption</small>
              </div>
            </div>

            <div className="section-card table-card">
              <div className="section-title flex-wrap">
                <div>
                  <h3>{selectedGroup.name}</h3>
                  <p className="text-muted mb-0">{selectedGroup.description || "No description"}</p>
                </div>
              </div>
              {detailError && <div className="alert alert-danger">{detailError}</div>}
              {loadingDetail ? (
                <p>Loading...</p>
              ) : selectedGroup.expenses.length === 0 ? (
                <p className="text-muted">No expenses recorded yet.</p>
              ) : (
                <table className="table align-middle expense-table">
                  <thead>
                    <tr>
                      <th>Payer</th>
                      <th>Amount</th>
                      <th>Note</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {selectedGroup.expenses.map((expense) => (
                      <tr
                        key={expense.id}
                        className={expense.id === selectedExpenseId ? "table-active" : undefined}
                      >
                        <td>
                          <div className="fw-semibold">{expense.payer_name}</div>
                          <small className="text-muted">{expense.payer_email}</small>
                        </td>
                        <td>${expense.amount.toFixed(2)}</td>
                        <td>{expense.note || "—"}</td>
                        <td className="text-capitalize">{expense.status}</td>
                        <td>{new Date(expense.created_at).toLocaleString()}</td>
                        <td className="flex-column flex-md-row gap-2">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => {
                              setSelectedExpenseId(expense.id);
                              setDetailView("history");
                            }}
                          >
                            View details
                          </button>
                          <Link
                            to={`/expenses/${expense.id}/edit?group=${selectedGroupId}`}
                            className="btn btn-sm btn-outline-primary"
                          >
                            Edit
                          </Link>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            type="button"
                            onClick={() => handleDelete(expense.id)}
                            disabled={deletingId === expense.id}
                          >
                            {deletingId === expense.id ? "Deleting..." : "Delete"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            {selectedExpense && (
              <div className="section-card expense-detail-card">
                <div className="section-title flex-wrap align-items-start">
                  <div>
                    <h3>{selectedExpense.note || "Expense detail"}</h3>
                    <p className="text-muted mb-0">
                      Paid by {selectedExpense.payer_name} on{" "}
                      {new Date(selectedExpense.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="expense-detail-tabs">
                    <button
                      type="button"
                      className={detailView === "history" ? "tab-chip active" : "tab-chip"}
                      onClick={() => setDetailView("history")}
                    >
                      History
                    </button>
                    <button
                      type="button"
                      className={detailView === "summary" ? "tab-chip active" : "tab-chip"}
                      onClick={() => setDetailView("summary")}
                    >
                      Summary
                    </button>
                    <button
                      type="button"
                      className="tab-chip ghost"
                      onClick={() => setSelectedExpenseId("")}
                    >
                      Hide
                    </button>
                  </div>
                </div>
                {detailView === "history" ? (
                  <div className="detail-grid">
                    <div>
                      <small className="text-muted text-uppercase fw-semibold">Payer</small>
                      <p className="mb-0">
                        {selectedExpense.payer_name}
                        <br />
                        <span className="text-muted">{selectedExpense.payer_email}</span>
                      </p>
                    </div>
                    <div>
                      <small className="text-muted text-uppercase fw-semibold">Amount</small>
                      <p className="mb-0 fs-5">${selectedExpense.amount.toFixed(2)}</p>
                    </div>
                    <div>
                      <small className="text-muted text-uppercase fw-semibold">Status</small>
                      <p className="mb-0 text-capitalize">{selectedExpense.status}</p>
                    </div>
                    <div>
                      <small className="text-muted text-uppercase fw-semibold">Note</small>
                      <p className="mb-0">{selectedExpense.note || "No note provided"}</p>
                    </div>
                  </div>
                ) : (
                  <table className="table align-middle expense-table">
                    <thead>
                      <tr>
                        <th>Member</th>
                        <th>Paid</th>
                        <th>Share</th>
                        <th>Owes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenseSummary.map((entry) => (
                        <tr key={entry.id}>
                          <td>
                            <div className="fw-semibold">{entry.name}</div>
                            <small className="text-muted">{entry.email}</small>
                          </td>
                          <td>${entry.paid.toFixed(2)}</td>
                          <td>${entry.share.toFixed(2)}</td>
                          <td className={entry.owes > 0 ? "text-danger" : entry.owes < 0 ? "text-success" : ""}>
                            ${entry.owes.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ExpensesPage;
