import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const DEFAULT_DELIVERY_FEE_TND = 8;

export async function fetchDeliveryFeeTND(): Promise<number> {
  try {
    const { data, error } = await supabaseAdmin
      .from("site_settings")
      .select("delivery_fee_tnd")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      console.error("Failed to load delivery fee from site_settings", error);
      return DEFAULT_DELIVERY_FEE_TND;
    }

    const fee = data?.delivery_fee_tnd;
    if (fee == null || Number.isNaN(Number(fee)) || Number(fee) < 0) {
      return DEFAULT_DELIVERY_FEE_TND;
    }
    return Number(fee);
  } catch (error) {
    console.error("Failed to load delivery fee from site_settings", error);
    return DEFAULT_DELIVERY_FEE_TND;
  }
}

export const getDeliveryFee = createServerFn({ method: "GET" }).handler(async () =>
  fetchDeliveryFeeTND(),
);
