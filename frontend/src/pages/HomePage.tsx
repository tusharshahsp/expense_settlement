import { Link, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../api";
import { useAuth } from "../auth";

function HomePage() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return null;
  }

  const avatarSrc = user.avatar_url ? `${API_BASE_URL}${user.avatar_url}` : null;

  function handleLogout() {
    setUser(null);
    navigate("/login");
  }

  return (
    <div className="page-wrapper">
      <div className="container py-5">
        <section className="page-hero mb-4">
          <div className="d-flex flex-column flex-lg-row justify-content-between align-items-start gap-4">
            <div>
              <h1>Welcome back, {user.name || "friend"} 👋</h1>
              <p>Manage your profile, groups and shared expenses from a single place.</p>
              <div className="hero-actions">
                <Link to="/groups/create" className="btn btn-light text-primary fw-semibold">
                  Create group
                </Link>
                <Link to="/expenses" className="btn btn-outline-light">
                  View expenses
                </Link>
              </div>
            </div>
            <div className="text-center">
              {avatarSrc ? (
                <img src={avatarSrc} alt="Profile avatar" className="avatar shadow" />
              ) : (
                <div className="rounded-circle bg-white bg-opacity-25 text-center p-4">
                  <p className="mb-0">Upload an avatar to personalize your workspace.</p>
                </div>
              )}
            </div>
          </div>
        </section>

        <div className="row g-4">
          <div className="col-12 col-lg-4">
            <div className="section-card h-100">
              <div className="section-title">
                <h3>Quick profile</h3>
                <span className="stat-pill">{user.email}</span>
              </div>
              <ul className="profile-details">
                <li>
                  <small className="text-muted text-uppercase fw-bold">Name</small>
                  <span>{user.name || "—"}</span>
                </li>
                <li>
                  <small className="text-muted text-uppercase fw-bold">Address</small>
                  <span>{user.address || "—"}</span>
                </li>
                <li>
                  <small className="text-muted text-uppercase fw-bold">Member since</small>
                  <span>{new Date(user.created_at).toLocaleDateString()}</span>
                </li>
              </ul>
              <div className="d-grid gap-2">
                <Link to="/profile" className="btn btn-outline-primary">
                  View profile
                </Link>
                <Link to="/profile/edit" className="btn btn-outline-secondary">
                  Edit profile
                </Link>
              </div>
            </div>
          </div>

          <div className="col-12 col-lg-4">
            <div className="section-card h-100">
              <div className="section-title">
                <h3>Groups & friends</h3>
                <span className="stat-pill">{user.groups?.length ?? 0} active</span>
              </div>
              <p className="text-muted">
                Build groups for trips, events or shared expenses. Invite friends so everyone stays in
                sync.
              </p>
              <div className="d-grid gap-2">
                <Link to="/groups" className="btn btn-primary">
                  Manage groups
                </Link>
                <Link to="/groups/create" className="btn btn-outline-primary">
                  Start a new group
                </Link>
              </div>
            </div>
          </div>

          <div className="col-12 col-lg-4">
            <div className="section-card h-100">
              <div className="section-title">
                <h3>Expenses</h3>
                <span className="stat-pill">Stay balanced</span>
              </div>
              <p className="text-muted">
                Track contributions and keep everyone accountable with simple, friendly tools.
              </p>
              <div className="d-grid gap-2 mb-3">
                <Link to="/expenses" className="btn btn-success">
                  Open dashboard
                </Link>
                <Link to="/expenses/add" className="btn btn-outline-success">
                  Add expense
                </Link>
              </div>
              <button type="button" className="btn btn-link text-danger p-0" onClick={handleLogout}>
                Log out of workspace
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
