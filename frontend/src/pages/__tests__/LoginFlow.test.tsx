import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";

import { AppRoutes } from "../../App";
import { login } from "../../api";
import { AuthProvider } from "../../auth";

vi.mock("../../api", () => ({
  login: vi.fn().mockResolvedValue({
    id: "42",
    name: "Casey",
    email: "casey@example.com",
    created_at: new Date().toISOString(),
  }),
  signup: vi.fn(),
  updateProfile: vi.fn(),
  uploadAvatar: vi.fn(),
  fetchUserGroups: vi.fn().mockResolvedValue([]),
  createGroup: vi.fn(),
  fetchGroup: vi.fn(),
  addGroupMember: vi.fn(),
}));

const mockedLogin = vi.mocked(login);

describe("Login flow", () => {
  it("navigates to dashboard after successful login", async () => {
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={["/login"]}>
          <AppRoutes />
        </MemoryRouter>
      </AuthProvider>
    );

    await user.type(screen.getByLabelText(/email/i), "casey@example.com");
    await user.type(screen.getByLabelText(/password/i), "secret123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /create group/i })).toBeInTheDocument();
    });

    expect(mockedLogin).toHaveBeenCalledWith({
      email: "casey@example.com",
      password: "secret123",
    });
  });
});
