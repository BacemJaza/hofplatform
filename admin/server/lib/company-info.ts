import { env } from "../env";
import { supabase, type SiteSettingsRow } from "../supabase";

export type CompanyInfo = {
  name: string;
  address: string | null;
  email: string | null;
  phone: string | null;
  logoUrl: string | null;
};

export async function loadCompanyInfo(): Promise<CompanyInfo> {
  const { data } = await supabase.from("site_settings").select("*").eq("id", 1).maybeSingle();
  const row = data as SiteSettingsRow | null;
  return {
    name: row?.company_name?.trim() || "HOUSE OF FLAGS",
    address: row?.company_address?.trim() || null,
    email: row?.company_email?.trim() || "houseofflagstn@gmail.com",
    phone: row?.company_phone?.trim() || "+216 53 069 199",
    logoUrl: resolveLogoUrl(row?.company_logo_url),
  };
}

function resolveLogoUrl(path: string | null | undefined): string | null {
  const value = path?.trim();
  if (!value) return `${env.storefrontUrl.replace(/\/$/, "")}/favicon.ico`;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/")) return `${env.storefrontUrl.replace(/\/$/, "")}${value}`;
  return value;
}
