import "dotenv/config";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function assertServiceRoleKey(key: string): string {
  if (key.startsWith("sb_publishable_")) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is a publishable key. Use the Supabase secret/service_role key so admin writes can bypass RLS.",
    );
  }

  // Legacy JWT anon keys start with eyJ and have role "anon".
  if (key.startsWith("eyJ")) {
    try {
      const payload = JSON.parse(
        Buffer.from(key.split(".")[1] ?? "", "base64url").toString("utf8"),
      ) as { role?: string };
      if (payload.role === "anon") {
        throw new Error(
          "SUPABASE_SERVICE_ROLE_KEY is an anon JWT. Use the service_role secret from Supabase → Project Settings → API.",
        );
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes("SUPABASE_SERVICE_ROLE_KEY")) {
        throw err;
      }
    }
  }

  return key;
}

export const env = {
  port: Number(process.env.PORT ?? 3001),
  adminAccessCode: required("ADMIN_ACCESS_CODE"),
  sessionSecret: required("SESSION_SECRET"),
  supabaseUrl: required("SUPABASE_URL"),
  supabaseServiceRoleKey: assertServiceRoleKey(required("SUPABASE_SERVICE_ROLE_KEY")),
  isProduction: process.env.NODE_ENV === "production",
};
