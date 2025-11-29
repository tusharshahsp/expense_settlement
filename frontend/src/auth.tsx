import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import type { User } from "./api";

const STORAGE_KEY = "expense-app:user";

type AuthContextValue = {
  user: User | null;
  setUser: Dispatch<SetStateAction<User | null>>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStoredUser(): User | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as User) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => readStoredUser());

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (user) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, [user]);

  const value = useMemo(() => ({ user, setUser }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
