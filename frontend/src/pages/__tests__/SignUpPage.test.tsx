import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";

import { signup } from "../../api";
import SignUpPage from "../SignUpPage";

vi.mock("../../api", () => ({
  signup: vi.fn().mockResolvedValue({
    id: "1",
    name: "Demo",
    email: "demo@example.com",
    created_at: new Date().toISOString(),
  }),
}));

const mockedSignup = vi.mocked(signup);

describe("SignUpPage", () => {
  it("shows success message after signup", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <SignUpPage />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText(/name/i), "Demo User");
    await user.type(screen.getByLabelText(/email/i), "demo@example.com");
    await user.type(screen.getByLabelText(/password/i), "demopass");

    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/account created!/i)).toBeInTheDocument();
    });
    expect(mockedSignup).toHaveBeenCalledWith({
      name: "Demo User",
      email: "demo@example.com",
      password: "demopass",
    });
  });
});
