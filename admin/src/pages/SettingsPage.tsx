import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError } from "@/lib/api";
import {
  Button,
  Card,
  ErrorBanner,
  Field,
  Input,
  PageHeader,
  Spinner,
} from "@/components/ui";

export function SettingsPage() {
  const [deliveryFee, setDeliveryFee] = useState("8");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { settings } = await api.settings.get();
        setDeliveryFee(String(settings.delivery_fee_tnd));
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Failed to load settings.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSaved(false);
    setSaving(true);

    try {
      const { settings } = await api.settings.update({
        delivery_fee_tnd: Number(deliveryFee),
      });
      setDeliveryFee(String(settings.delivery_fee_tnd));
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <>
      <PageHeader
        title="Settings"
        description="Global store configuration. Changes apply to new checkouts immediately."
      />

      {error && <ErrorBanner message={error} />}
      {saved && (
        <p className="mb-4 text-sm text-green-700">Delivery fee saved.</p>
      )}

      <Card className="max-w-md">
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Delivery fee (TND)">
            <Input
              type="number"
              min="0"
              step="1"
              value={deliveryFee}
              onChange={(e) => setDeliveryFee(e.target.value)}
              required
            />
          </Field>
          <p className="text-xs text-muted">
            Shown at checkout and added to every new order total. Existing orders keep the fee
            that was charged at purchase time.
          </p>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save settings"}
          </Button>
        </form>
      </Card>
    </>
  );
}
