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
      width_cm: number;
      height_cm: number;
      price_eur: number;
      discount_percent: number;
      quantity: number;
      image_urls: string[];
      story: string;
      tags: string[];
      is_active: boolean;
      status: "active" | "inactive" | "coming_soon";
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
        width_cm: number;
        height_cm: number;
        price_eur: number;
        discount_percent: number;
        quantity: number;
        image_urls: string[];
        story: string;
        tags: string[];
        is_active: boolean;
        status?: "active" | "inactive" | "coming_soon";
        support_enabled: boolean;
        support_name: string | null;
        support_price_eur: number | null;
      }>,
    ) =>
      request<{ product: import("./types").Product }>(`/api/products/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    setStatus: (id: string, status: "active" | "inactive" | "coming_soon") =>
      request<{ product: import("./types").Product }>(`/api/products/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
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

  sales: {
    stats: (params: {
      from: string;
      to: string;
      granularity: import("./types").SalesGranularity;
    }) => {
      const search = new URLSearchParams({
        from: params.from,
        to: params.to,
        granularity: params.granularity,
      });
      return request<{ stats: import("./types").SalesStats }>(`/api/sales?${search.toString()}`);
    },
  },

  expenses: {
    list: (params: {
      from: string;
      to: string;
      page?: number;
      pageSize?: number;
      q?: string;
    }) => {
      const search = new URLSearchParams({
        from: params.from,
        to: params.to,
        page: String(params.page ?? 1),
        pageSize: String(params.pageSize ?? 25),
      });
      if (params.q?.trim()) search.set("q", params.q.trim());
      return request<{
        expenses: import("./types").Expense[];
        pagination: import("./types").ExpensePagination;
      }>(`/api/expenses?${search.toString()}`);
    },
    dashboard: (params: { from: string; to: string }) => {
      const search = new URLSearchParams({ from: params.from, to: params.to });
      return request<{ dashboard: import("./types").BillingDashboard }>(
        `/api/expenses/dashboard?${search.toString()}`,
      );
    },
    get: (id: string) =>
      request<{ expense: import("./types").Expense }>(`/api/expenses/${id}`),
    create: (data: {
      invoice_number?: string | null;
      supplier_name?: string | null;
      title: string;
      description?: string | null;
      category: string;
      payment_date: string;
      payment_status: import("./types").ExpensePaymentStatus;
      amount_ht: number;
      vat_enabled: boolean;
      vat_rate?: number | null;
      currency?: string;
      notes?: string | null;
    }) =>
      request<{ expense: import("./types").Expense }>("/api/expenses", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (
      id: string,
      data: Partial<{
        invoice_number: string | null;
        supplier_name: string | null;
        title: string;
        description: string | null;
        category: string;
        payment_date: string;
        payment_status: import("./types").ExpensePaymentStatus;
        amount_ht: number;
        vat_enabled: boolean;
        vat_rate: number | null;
        currency: string;
        notes: string | null;
      }>,
    ) =>
      request<{ expense: import("./types").Expense }>(`/api/expenses/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    void: (id: string) =>
      request<{ expense: import("./types").Expense }>(`/api/expenses/${id}/void`, {
        method: "PATCH",
      }),
    attachmentUrl: (id: string) =>
      request<{ url: string }>(`/api/expenses/${id}/attachment-url`),
    uploadAttachment: async (id: string, file: File) => {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/expenses/${id}/attachment`, {
        method: "POST",
        body: form,
        credentials: "include",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new ApiError(
          typeof body.error === "string" ? body.error : "Upload failed",
          res.status,
          body.error,
        );
      }
      return body as { expense: import("./types").Expense };
    },
    downloadPdf: async (id: string, filename: string) => {
      const res = await fetch(`/api/expenses/${id}/pdf`, { credentials: "include" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new ApiError(
          typeof body.error === "string" ? body.error : "PDF download failed",
          res.status,
          body.error,
        );
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
    },
  },

  discounts: {
    list: () => request<{ discounts: import("./types").Discount[] }>("/api/discounts"),
    get: (id: string) =>
      request<{ discount: import("./types").Discount }>(`/api/discounts/${id}`),
    create: (data: {
      code: string;
      discount_percent: number;
      is_active?: boolean;
    }) =>
      request<{ discount: import("./types").Discount }>("/api/discounts", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (
      id: string,
      data: Partial<{
        code: string;
        discount_percent: number;
        is_active: boolean;
      }>,
    ) =>
      request<{ discount: import("./types").Discount }>(`/api/discounts/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    setStatus: (id: string, is_active: boolean) =>
      request<{ discount: import("./types").Discount }>(`/api/discounts/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ is_active }),
      }),
    delete: (id: string) =>
      request<{ ok: true }>(`/api/discounts/${id}`, { method: "DELETE" }),
  },
};

export { ApiError };
