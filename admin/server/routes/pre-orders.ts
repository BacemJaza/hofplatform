import { Router } from "express";
import { requireAuth } from "../auth";
import { supabase, type PreOrderRow } from "../supabase";

export const preOrdersRouter = Router();
preOrdersRouter.use(requireAuth);

preOrdersRouter.get("/", async (_req, res) => {
  const { data, error } = await supabase
    .from("pre_orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ preOrders: data as PreOrderRow[] });
});

preOrdersRouter.get("/:id", async (req, res) => {
  const { data, error } = await supabase
    .from("pre_orders")
    .select("*")
    .eq("id", req.params.id)
    .maybeSingle();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  if (!data) {
    res.status(404).json({ error: "Pre-order not found." });
    return;
  }
  res.json({ preOrder: data as PreOrderRow });
});

preOrdersRouter.delete("/:id", async (req, res) => {
  const { error } = await supabase.from("pre_orders").delete().eq("id", req.params.id);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ ok: true });
});

// Convert pre-order to order
preOrdersRouter.post("/:id/activate", async (req, res) => {
  const preOrderId = req.params.id;

  try {
    // Get the pre-order
    const { data: preOrder, error: preOrderError } = await supabase
      .from("pre_orders")
      .select("*")
      .eq("id", preOrderId)
      .maybeSingle();

    if (preOrderError) {
      res.status(500).json({ error: preOrderError.message });
      return;
    }

    if (!preOrder) {
      res.status(404).json({ error: "Pre-order not found." });
      return;
    }

    // Generate order reference from pre-order reference (PO-XXXX -> OR-XXXX)
    const orderRef = preOrder.pre_order_ref.replace(/^PO-/, "OR-");

    // Create order with same data
    const orderData = {
      order_ref: orderRef,
      customer_name: preOrder.customer_name,
      email: preOrder.email,
      phone: preOrder.phone,
      city: preOrder.city,
      address: preOrder.address,
      notes: preOrder.notes,
      items: preOrder.items,
      total: preOrder.total,
      delivery_fee: preOrder.delivery_fee,
      currency: preOrder.currency,
      status: "confirmed",
    };

    const { data: newOrder, error: orderError } = await supabase
      .from("orders")
      .insert(orderData)
      .select("*")
      .single();

    if (orderError) {
      const message =
        orderError.code === "23505" ? "An order with this reference already exists." : orderError.message;
      res.status(orderError.code === "23505" ? 409 : 500).json({ error: message });
      return;
    }

    // Delete the pre-order
    await supabase.from("pre_orders").delete().eq("id", preOrderId);

    res.json({ ok: true, order: newOrder });
  } catch (err) {
    res.status(500).json({ error: "Failed to activate pre-order." });
  }
});

export default preOrdersRouter;
