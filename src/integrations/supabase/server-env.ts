// Server-only Supabase env resolution for Lovable + standard Supabase setups.

function isServerSecretKey(key: string | undefined): key is string {
  if (!key) return false;
  // Lovable secret keys and classic Supabase JWT service-role keys.
  return key.startsWith("sb_secret_") || key.startsWith("eyJ");
}

function getEnvValue(name: string): string | undefined {
  const fromProcess = process.env[name];
  if (fromProcess) return fromProcess;

  const fromImportMeta = (import.meta as ImportMeta & { env?: Record<string, string | boolean | undefined> }).env?.[name];
  return typeof fromImportMeta === "string" ? fromImportMeta : undefined;
}

export function getServerSupabaseUrl(): string | undefined {
  return getEnvValue("SUPABASE_URL") || getEnvValue("VITE_SUPABASE_URL");
}

export function getServerSupabaseServiceRoleKey(): string | undefined {
  const candidateKeys = [
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_SECRET_KEY",
    "SUPABASE_PUBLISHABLE_KEY",
    "VITE_SUPABASE_SERVICE_ROLE_KEY",
    "VITE_SUPABASE_SECRET_KEY",
    "VITE_SUPABASE_PUBLISHABLE_KEY",
  ];

  for (const keyName of candidateKeys) {
    const value = getEnvValue(keyName);
    if (value && isServerSecretKey(value)) {
      return value;
    }
  }

  return undefined;
}
