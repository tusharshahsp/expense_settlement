import { BrowserRouter, Navigate, Route, Routes, Link, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import SignUpPage from "./pages/SignUpPage";
import ProfileViewPage from "./pages/ProfileViewPage";
import ProfileEditPage from "./pages/ProfileEditPage";
import CreateGroupPage from "./pages/CreateGroupPage";
import GroupsPage from "./pages/GroupsPage";
import ExpensesPage from "./pages/ExpensesPage";
import AddExpensePage from "./pages/AddExpensePage";
import EditExpensePage from "./pages/EditExpensePage";

export function PrivateRoute({ children }: { children: JSX.Element }) {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/signup" replace />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/home"
        element={
          <PrivateRoute>
            <HomePage />
          </PrivateRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <PrivateRoute>
            <ProfileViewPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/profile/edit"
        element={
          <PrivateRoute>
            <ProfileEditPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/groups/create"
        element={
          <PrivateRoute>
            <CreateGroupPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/groups"
        element={
          <PrivateRoute>
            <GroupsPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/expenses"
        element={
          <PrivateRoute>
            <ExpensesPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/expenses/add"
        element={
          <PrivateRoute>
            <AddExpensePage />
          </PrivateRoute>
        }
      />
      <Route
        path="/expenses/:expenseId/edit"
        element={
          <PrivateRoute>
            <EditExpensePage />
          </PrivateRoute>
        }
      />
      <Route path="*" element={<Navigate to="/signup" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppNavBar />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

function AppNavBar() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return null;
  }

  function handleLogout() {
    setUser(null);
    navigate("/login");
  }

  return (
    <nav className="navbar navbar-expand-lg bg-light mb-4">
      <div className="container">
        <Link className="navbar-brand fw-semibold" to="/home">
          Expense App
        </Link>
        <div className="collapse navbar-collapse show">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            <li className="nav-item">
              <Link className="nav-link" to="/home">
                Home
              </Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/profile">
                Profile
              </Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/groups">
                Groups
              </Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/expenses">
                Expenses
              </Link>
            </li>
          </ul>
          <span className="navbar-text me-3 text-muted">{user.email}</span>
          <button className="btn btn-outline-danger btn-sm" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
