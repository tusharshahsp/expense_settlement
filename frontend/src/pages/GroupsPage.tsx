import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchGroup, fetchUserGroups, addGroupMember, type Group, type GroupDetail } from "../api";
import { useAuth } from "../auth";

function GroupsPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [selectedGroup, setSelectedGroup] = useState<GroupDetail | null>(null);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [memberEmail, setMemberEmail] = useState("");
  const [memberMessage, setMemberMessage] = useState<string | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);

  if (!user) {
    return null;
  }

  useEffect(() => {
    setLoadingGroups(true);
    setError(null);
    fetchUserGroups(user.id)
      .then((data) => {
        setGroups(data);
        if (data.length > 0) {
          setSelectedGroupId(data[0].id);
        } else {
          setSelectedGroupId("");
        }
      })
      .catch((err) => {
        console.error(err);
        setError("Unable to load your groups");
      })
      .finally(() => setLoadingGroups(false));
  }, [user.id]);

  useEffect(() => {
    if (!selectedGroupId) {
      setSelectedGroup(null);
      return;
    }
    setLoadingDetail(true);
    setDetailError(null);
    setMemberMessage(null);
    setShowAddMember(false);
    fetchGroup(selectedGroupId)
      .then((detail) => setSelectedGroup(detail))
      .catch((err) => {
        console.error(err);
        setDetailError("Unable to load group details");
        setSelectedGroup(null);
      })
      .finally(() => setLoadingDetail(false));
  }, [selectedGroupId]);

  async function handleAddMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedGroup || !memberEmail) {
      return;
    }
    setMemberMessage(null);
    setDetailError(null);
    try {
      const updated = await addGroupMember(selectedGroup.id, {
        requester_id: user.id,
        user_email: memberEmail,
      });
      setSelectedGroup(updated);
      setMemberEmail("");
      setMemberMessage("Member added successfully!");
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : "Unable to add member");
    }
  }

  return (
    <div className="page-wrapper">
      <div className="container py-5">
        <div className="section-card mb-4">
          <div className="section-title">
            <div>
              <h3>Your groups</h3>
              <p className="text-muted mb-0">Switch between groups to review members and expenses.</p>
            </div>
            <div className="d-flex flex-wrap gap-2">
              <Link to="/groups" className="btn btn-outline-secondary btn-sm">
                Refresh
              </Link>
              <Link to="/groups/create" className="btn btn-primary btn-sm">
                + Create group
              </Link>
            </div>
          </div>
          {loadingGroups ? (
            <p>Loading...</p>
          ) : error ? (
            <div className="alert alert-danger mb-0">{error}</div>
          ) : groups.length === 0 ? (
            <div className="text-muted">You are not part of any groups yet.</div>
          ) : (
            <div className="row g-3 align-items-end">
              <div className="col-md-6">
                <label className="form-label">Select a group</label>
                <select
                  className="form-select"
                  value={selectedGroupId}
                  onChange={(event) => setSelectedGroupId(event.target.value)}
                >
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name} {group.owner_id === user.id ? "(owner)" : ""}
                    </option>
                  ))}
                </select>
              </div>
              {selectedGroup && selectedGroup.owner_id === user.id && (
                <div className="col-md-6 d-flex justify-content-md-end">
                  <button
                    className="btn btn-outline-success"
                    onClick={() => setShowAddMember((prev) => !prev)}
                  >
                    {showAddMember ? "Hide invite form" : "Invite members"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {selectedGroup && (
          <div className="row g-4">
            <div className="col-lg-8">
              <div className="section-card table-card h-100">
                <div className="section-title">
                  <div>
                    <h3>{selectedGroup.name}</h3>
                    <p className="text-muted mb-0">{selectedGroup.description || "No description"}</p>
                  </div>
                  <span className="stat-pill">{selectedGroup.members.length} members</span>
                </div>
                {loadingDetail ? (
                  <p>Loading group details...</p>
                ) : (
                  <>
                    {detailError && <div className="alert alert-danger">{detailError}</div>}
                    {memberMessage && <div className="alert alert-success">{memberMessage}</div>}
                    <div className="table-responsive">
                      <table className="table align-middle">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Email</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedGroup.members.map((member) => (
                            <tr key={member.id}>
                              <td>{member.name}</td>
                              <td>{member.email}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="col-lg-4">
              <div className="section-card h-100">
                <div className="section-title">
                  <h3>Add members</h3>
                  <span className="stat-pill">Owner only</span>
                </div>
                {selectedGroup.owner_id !== user.id ? (
                  <p className="text-muted">Only the group owner can invite new people.</p>
                ) : showAddMember ? (
                  <form className="d-flex flex-column gap-3" onSubmit={handleAddMember}>
                    <label className="form-label">
                      Email address
                      <input
                        type="email"
                        className="form-control"
                        value={memberEmail}
                        onChange={(event) => setMemberEmail(event.target.value)}
                        placeholder="person@example.com"
                        required
                      />
                    </label>
                    <button className="btn btn-success" type="submit">
                      Add member
                    </button>
                  </form>
                ) : (
                  <p className="text-muted">Click “Invite members” above to open the form.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default GroupsPage;
