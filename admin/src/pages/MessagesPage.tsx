import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { Message } from "@/lib/types";
import { formatDate } from "@/lib/format";
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorBanner,
  PageHeader,
  Spinner,
} from "@/components/ui";

export function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [selected, setSelected] = useState<Message | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setError("");
    try {
      const { messages: data } = await api.messages.list();
      setMessages(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load messages.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.messages.delete(deleteId);
      setMessages((prev) => prev.filter((m) => m.id !== deleteId));
      if (selected?.id === deleteId) setSelected(null);
      setDeleteId(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete message.");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <>
      <PageHeader title="Messages" description="Contact form submissions (read & delete)." />

      {error && <ErrorBanner message={error} />}

      {messages.length === 0 ? (
        <EmptyState message="No messages yet." />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-background/60 text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">From</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {messages.map((message) => (
                  <tr
                    key={message.id}
                    className={`cursor-pointer hover:bg-background/40 ${
                      selected?.id === message.id ? "bg-background/60" : ""
                    }`}
                    onClick={() => setSelected(message)}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium">{message.full_name}</p>
                      <p className="text-xs text-muted">{message.email}</p>
                      <p className="mt-1 line-clamp-1 text-xs text-muted">{message.notes}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted whitespace-nowrap">
                      {formatDate(message.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteId(message.id);
                        }}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Card>
            {selected ? (
              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted">From</p>
                  <p className="mt-1 font-medium">{selected.full_name}</p>
                  <a href={`mailto:${selected.email}`} className="text-sm text-muted hover:underline">
                    {selected.email}
                  </a>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted">Received</p>
                  <p className="mt-1 text-sm">{formatDate(selected.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted">Message</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{selected.notes}</p>
                </div>
                <Button variant="danger" onClick={() => setDeleteId(selected.id)}>
                  Delete message
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted">Select a message to read the full content.</p>
            )}
          </Card>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Delete message"
        message="This permanently removes the contact message."
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
        loading={deleting}
      />
    </>
  );
}
