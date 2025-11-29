import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API_BASE_URL, fetchProfile, fetchUserGroups, type Group } from "../api";
import { useAuth } from "../auth";

function ProfileViewPage() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groups, setGroups] = useState<Group[]>(user?.groups ?? []);

  useEffect(() => {
    if (!user) {
      return;
    }
    setLoading(true);
    setError(null);
    fetchProfile(user.id)
      .then((profile) => {
        setUser(profile);
        return fetchUserGroups(profile.id);
      })
      .then((userGroups) => {
        setGroups(userGroups);
        setUser((prev) => (prev ? { ...prev, groups: userGroups } : prev));
      })
      .catch((err) => {
        console.error(err);
        setError("Unable to load profile");
      })
      .finally(() => setLoading(false));
  }, [user?.id, setUser]);

  if (!user) {
    return null;
  }

  const avatarSrc = user.avatar_url ? `${API_BASE_URL}${user.avatar_url}` : null;

  return (
    <div className="page-wrapper">
      <div className="container py-5">
        <div className="row g-4">
          <div className="col-lg-4">
            <section className="section-card h-100">
              <div className="section-title">
                <h3>Profile overview</h3>
                <span className="stat-pill">{user.email}</span>
              </div>
              {loading && <p>Loading profile...</p>}
              {error && <p className="error">{error}</p>}
              <div className="text-center mb-3">
                {avatarSrc ? (
                  <img src={avatarSrc} alt="Profile avatar" className="avatar shadow-sm" />
                ) : (
                  <div className="text-muted small">No avatar uploaded yet</div>
                )}
              </div>
              <ul className="profile-details">
                <li>
                  <small className="text-muted text-uppercase fw-semibold">Name</small>
                  <span>{user.name || "—"}</span>
                </li>
                <li>
                  <small className="text-muted text-uppercase fw-semibold">Age</small>
                  <span>{user.age ?? "—"}</span>
                </li>
                <li>
                  <small className="text-muted text-uppercase fw-semibold">Gender</small>
                  <span>{user.gender || "—"}</span>
                </li>
                <li>
                  <small className="text-muted text-uppercase fw-semibold">Address</small>
                  <span>{user.address || "—"}</span>
                </li>
                <li>
                  <small className="text-muted text-uppercase fw-semibold">Bio</small>
                  <span>{user.bio || "—"}</span>
                </li>
              </ul>
              <div className="d-grid gap-2 mt-3">
                <Link to="/profile/edit" className="btn btn-primary">
                  Edit profile
                </Link>
                <button type="button" className="btn btn-outline-secondary" onClick={() => navigate("/home")}>
                  Back to home
                </button>
              </div>
            </section>
          </div>

          <div className="col-lg-8">
            <section className="section-card h-100">
              <div className="section-title">
                <h3>Groups</h3>
                <span className="stat-pill">{groups.length} active</span>
              </div>
              {groups.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  You are not part of any group yet. <Link to="/groups/create">Create one</Link> to get started.
                </div>
              ) : (
                <div className="table-responsive table-card">
                  <table className="table align-middle">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groups.map((group) => (
                        <tr key={group.id}>
                          <td className="fw-semibold">{group.name}</td>
                          <td>{group.description || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfileViewPage;
