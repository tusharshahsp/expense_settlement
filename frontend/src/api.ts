export type SignupPayload = {
  name: string;
  email: string;
  password: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type Group = {
  id: string;
  name: string;
  owner_id: string;
  description?: string | null;
  created_at: string;
  member_count?: number | null;
};

export type GroupMember = {
  id: string;
  name: string;
  email: string;
};

export type ExpenseStatus = "assigned" | "paid" | "refunded" | "approved" | "claimed" | "denied";

export type Expense = {
  id: string;
  group_id: string;
  payer_id: string;
  payer_name: string;
  payer_email: string;
  amount: number;
  note?: string | null;
  status: ExpenseStatus;
  created_at: string;
};

export type GroupBalance = {
  user_id: string;
  name: string;
  email: string;
  paid: number;
  owed: number;
  balance: number;
};

export type GroupDetail = Group & {
  members: GroupMember[];
  expenses: Expense[];
  total_expense: number;
  balances: GroupBalance[];
};

export type User = {
  id: string;
  name: string;
  email: string;
  created_at: string;
  role?: string;
  age?: number | null;
  gender?: string | null;
  address?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  groups?: Group[] | null;
};

export type UserProfileUpdate = {
  name?: string;
  age?: number;
  gender?: string;
  address?: string;
  bio?: string;
};

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Request failed");
  }

  return (await response.json()) as T;
}

export async function signup(payload: SignupPayload): Promise<User> {
  return request<User>("/signup", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function login(payload: LoginPayload): Promise<User> {
  return request<User>("/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchProfile(userId: string): Promise<User> {
  return request<User>(`/users/${userId}`);
}

export async function updateProfile(userId: string, payload: UserProfileUpdate): Promise<User> {
  return request<User>(`/users/${userId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function uploadAvatar(userId: string, file: File): Promise<User> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/users/${userId}/avatar`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Unable to upload avatar");
  }

  return (await response.json()) as User;
}

export async function fetchUserGroups(userId: string): Promise<Group[]> {
  return request<Group[]>(`/users/${userId}/groups`);
}

export async function createGroup(payload: {
  owner_id: string;
  name: string;
  description?: string;
}): Promise<GroupDetail> {
  return request<GroupDetail>("/groups", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchGroup(groupId: string): Promise<GroupDetail> {
  return request<GroupDetail>(`/groups/${groupId}`);
}

export async function addGroupMember(
  groupId: string,
  payload: { requester_id: string; user_email: string }
): Promise<GroupDetail> {
  return request<GroupDetail>(`/groups/${groupId}/members`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function addGroupExpense(
  groupId: string,
  payload: { payer_email: string; amount: number; note?: string; status: ExpenseStatus }
): Promise<GroupDetail> {
  return request<GroupDetail>(`/groups/${groupId}/expenses`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type ExpenseUpdatePayload = {
  payer_email?: string;
  amount?: number;
  note?: string;
  status?: ExpenseStatus;
};

export async function updateGroupExpense(
  groupId: string,
  expenseId: string,
  payload: ExpenseUpdatePayload
): Promise<GroupDetail> {
  return request<GroupDetail>(`/groups/${groupId}/expenses/${expenseId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteGroupExpense(groupId: string, expenseId: string): Promise<GroupDetail> {
  return request<GroupDetail>(`/groups/${groupId}/expenses/${expenseId}`, {
    method: "DELETE",
  });
}
