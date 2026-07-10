import { useState, type FormEvent } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button, Card, ErrorBanner, Input, Label } from "@/components/ui";
import { ApiError } from "@/lib/api";

export function LoginPage() {
  const { login } = useAuth();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(code);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm shadow-sm">
        <p className="text-[10px] uppercase tracking-[0.3em] text-muted">Admin</p>
        <h1 className="mt-2 text-xl font-semibold">HOUSE OF FLAGS</h1>
        <p className="mt-1 text-sm text-muted">Enter your access code to continue.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          {error && <ErrorBanner message={error} />}
          <div>
            <Label htmlFor="code">Access code</Label>
            <Input
              id="code"
              type="password"
              autoComplete="current-password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Your secret word"
              autoFocus
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading || !code.trim()}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
