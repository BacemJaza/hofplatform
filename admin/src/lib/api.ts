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

function formatFieldErrors(error: unknown): string {
  if (!error || typeof error !== "object") return "Request failed";
  const parts: string[] = [];
  for (const [field, value] of Object.entries(error as Record<string, unknown>)) {
    if (Array.isArray(value) && value.length > 0) {
      parts.push(`${field}: ${value.join(", ")}`);
    } else if (typeof value === "string" && value) {
      parts.push(`${field}: ${value}`);
    }
  }
  return parts.length > 0 ? parts.join(" · ") : "Please check the form fields.";
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
        : body.error && typeof body.error === "object"
          ? formatFieldErrors(body.error)
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
    create: (data: {
      slug: string;
      name: string;
      label: string;
      price_eur: number;
      quantity: number;
      image_urls: string[];
      story: string;
      tags: string[];
      is_active: boolean;
      support_enabled: boolean;
      support_name: string | null;
      support_price_eur: number | null;
    }) =>
      request<{ product: import("./types").Product }>("/api/products", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (
      id: string,
      data: Partial<{
        slug: string;
        name: string;
        label: string;
        price_eur: number;
        quantity: number;
        image_urls: string[];
        story: string;
        tags: string[];
        is_active: boolean;
        support_enabled: boolean;
        support_name: string | null;
        support_price_eur: number | null;
      }>,
    ) =>
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
    create: (
      data: Omit<import("./types").Order, "id" | "created_at"> & {
        delivery_fee?: number;
      },
    ) =>
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

  preOrders: {
    list: () => request<{ preOrders: import("./types").PreOrder[] }>("/api/pre-orders"),
    get: (id: string) =>
      request<{ preOrder: import("./types").PreOrder }>(`/api/pre-orders/${id}`),
    delete: (id: string) =>
      request<{ ok: true }>(`/api/pre-orders/${id}`, { method: "DELETE" }),
    activate: (id: string) =>
      request<{ ok: true; order: import("./types").Order }>(`/api/pre-orders/${id}/activate`, {
        method: "POST",
      }),
  },

  messages: {
    list: () => request<{ messages: import("./types").Message[] }>("/api/messages"),
    get: (id: string) =>
      request<{ message: import("./types").Message }>(`/api/messages/${id}`),
    delete: (id: string) =>
      request<{ ok: true }>(`/api/messages/${id}`, { method: "DELETE" }),
  },

  settings: {
    get: () => request<{ settings: import("./types").SiteSettings }>("/api/settings"),
    update: (data: { delivery_fee_tnd: number }) =>
      request<{ settings: import("./types").SiteSettings }>("/api/settings", {
        method: "PUT",
        body: JSON.stringify(data),
      }),
  },
};

export { ApiError };
