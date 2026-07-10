class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    credentials: "include",
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message =
      typeof body.error === "string"
        ? body.error
        : res.status === 401
          ? "Unauthorized"
          : "Request failed";
    throw new ApiError(message, res.status, body.error);
  }

  return body as T;
}

export const api = {
  auth: {
    me: () => request<{ authenticated: boolean }>("/api/auth/me"),
    login: (code: string) =>
      request<{ ok: true }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ code }),
      }),
    logout: () =>
      request<{ ok: true }>("/api/auth/logout", { method: "POST" }),
  },

  products: {
    list: () => request<{ products: import("./types").Product[] }>("/api/products"),
    get: (id: string) =>
      request<{ product: import("./types").Product }>(`/api/products/${id}`),
    create: (data: Omit<import("./types").Product, "id" | "created_at" | "updated_at">) =>
      request<{ product: import("./types").Product }>("/api/products", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<import("./types").Product>) =>
      request<{ product: import("./types").Product }>(`/api/products/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    toggleActive: (id: string, is_active: boolean) =>
      request<{ product: import("./types").Product }>(`/api/products/${id}/active`, {
        method: "PATCH",
        body: JSON.stringify({ is_active }),
      }),
    delete: (id: string) =>
      request<{ ok: true }>(`/api/products/${id}`, { method: "DELETE" }),
  },

  orders: {
    list: () => request<{ orders: import("./types").Order[] }>("/api/orders"),
    get: (id: string) =>
      request<{ order: import("./types").Order }>(`/api/orders/${id}`),
    create: (data: Omit<import("./types").Order, "id" | "created_at">) =>
      request<{ order: import("./types").Order }>("/api/orders", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<import("./types").Order>) =>
      request<{ order: import("./types").Order }>(`/api/orders/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ ok: true }>(`/api/orders/${id}`, { method: "DELETE" }),
  },

  messages: {
    list: () => request<{ messages: import("./types").Message[] }>("/api/messages"),
    get: (id: string) =>
      request<{ message: import("./types").Message }>(`/api/messages/${id}`),
    delete: (id: string) =>
      request<{ ok: true }>(`/api/messages/${id}`, { method: "DELETE" }),
  },
};

export { ApiError };
