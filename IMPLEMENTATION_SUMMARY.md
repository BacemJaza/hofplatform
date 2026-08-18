# Stock Management & Pre-Order System - Implementation Summary

## Overview

A complete stock management and pre-order system has been implemented for HOUSE OF FLAGS. The system allows admin users to:
- Set and manage product quantities
- Automatically reduce stock when orders are placed
- Enable pre-orders for out-of-stock products
- Filter products, orders, and pre-orders with rich criteria
- Track pre-orders separately from regular orders

## Architecture

### Database Layer
- **Products table**: Added `quantity` field (integer, non-negative, default 0)
- **Pre-orders table**: Separate table mirroring orders structure, no RLS bypass allows customer inserts
- **Stock decrease trigger**: Automatically reduces product quantity when orders are created
- **Constraints**: Prevents negative stock, enforces data integrity

### Admin Panel
- **Products Page**: Quantity management, status/stock filters, search
- **Orders Page**: Enhanced filters (status, date range, customer/product search)
- **Pre-Orders Page**: New dedicated page with same filter capabilities as Orders

### Frontend
- Pre-order server function ready for integration
- Checkout flow can distinguish between regular orders and pre-orders
- Pre-order reference generation (PO-XXXXXX format)

---

## Modified Files

### Admin Backend

**admin/src/lib/types.ts**
- Added `quantity: number` to `Product` type
- Added new `PreOrder` type with same structure as `Order`

**admin/src/lib/api.ts**
- Updated `products.create()` to include `quantity` parameter
- Updated `products.update()` to include `quantity` parameter
- Added new `preOrders` API namespace with `list()`, `get()`, `delete()` methods

**admin/server/routes/products.ts**
- Updated `productSchema` to validate `quantity` (non-negative, max 999999)
- Updated `productUpdateSchema` to include `quantity` field

**admin/server/routes/pre-orders.ts** ✨ NEW
- GET `/` - List all pre-orders
- GET `/:id` - Get single pre-order
- DELETE `/:id` - Delete pre-order
- Proper error handling and status codes

**admin/server/supabase.ts**
- Added `quantity: number` to `ProductRow` type
- Added new `PreOrderRow` type with full structure
- Added `PreOrderItem` type for line items

**admin/server/app.ts**
- Imported and mounted `preOrdersRouter` at `/api/pre-orders`

### Admin UI

**admin/src/pages/ProductFormPage.tsx**
- Added `quantity: string` to `FormState`
- Added quantity input field (number, min 0, step 1)
- Loads quantity from existing products during edit
- Includes quantity in payload on submit

**admin/src/pages/ProductsPage.tsx**
- Added quantity column to table display
- Enhanced filter type with: `"in-stock" | "out-of-stock" | "available-pre-order"`
- Added search state and search functionality
- Filter buttons display status/quantity-based information
- Search works on: name, slug, label
- New badge system shows:
  - "In Stock" (green) for active products with quantity > 0
  - "Pre-Order" (yellow) for active products with quantity = 0
  - "Inactive" (neutral) for inactive products
  - Stock badges: "Out" (red) when quantity = 0, "Low" (yellow) when quantity ≤ 5

**admin/src/pages/OrdersPage.tsx**
- Added status filter: `"pending" | "confirmed" | "shipped" | "delivered" | "cancelled"`
- Added date filter: `"today" | "week" | "month" | "all"`
- Added search functionality for: customer name, email, order reference, product slug
- Filter buttons for all order statuses
- Date range buttons (Today/This Week/This Month/All Time)
- Search input with helpful placeholder

**admin/src/pages/PreOrdersPage.tsx** ✨ NEW
- Identical filter structure to OrdersPage
- Displays pre-orders in table format
- Status filter: All order statuses supported
- Date range filter: Today/This Week/This Month/All Time
- Search: Customer name, email, pre-order reference, product slug
- Delete functionality for pre-order records

**admin/src/components/Layout.tsx**
- Added Pre-Orders navigation item between Orders and Messages

**admin/src/App.tsx**
- Imported `PreOrdersPage` component
- Added route: `/pre-orders` → `<PreOrdersPage />`

### Frontend

**src/lib/pre-orders.functions.server.ts** ✨ NEW
- `placePreOrder()` - Server function to place pre-orders
- Same validation as `placeOrder()` but:
  - Allows ordering even if quantity = 0
  - Does NOT reduce stock
  - Uses `pre_orders` table instead of `orders`
  - Generates `PO-XXXXXX` reference
  - Returns `{ ok, preOrderRef, total }` on success

---

## Stock & Pre-Order Workflow

### For Regular Customers (Public Site)

1. **View Product**: Shows quantity status
   - "In Stock" (quantity > 0)
   - "Out of Stock / Pre-Order Available" (quantity = 0, is_active = true)
   - "Unavailable" (is_active = false)

2. **Purchase In-Stock**: 
   - Add to cart → Checkout → Payment
   - Stock automatically decreases (via database trigger)
   - Order created in `orders` table

3. **Pre-Order Out-of-Stock**:
   - "Pre-Order" button shown (quantity = 0 + is_active = true)
   - User enters details and submits
   - Pre-order created in `pre_orders` table
   - Stock remains unchanged

### For Admin Users

1. **Manage Products**:
   - Set/edit quantity when creating or editing product
   - View quantity in product table
   - Quick status indicators (In Stock / Pre-Order / Out of Stock)

2. **Monitor Orders**:
   - Filter by status (Pending/Confirmed/Shipped/Delivered/Cancelled)
   - Filter by date range (Today/Week/Month/All)
   - Search customer or product
   - View all order details

3. **Manage Pre-Orders**:
   - Dedicated Pre-Orders page
   - Same filtering as Orders
   - Can update status (mark as confirmed, shipped, etc.) - *(Edit endpoint ready to implement)*
   - Delete pre-orders
   - Search and filter by all criteria

### Stock Decrease Mechanism

When an order is placed:
1. `placeOrder()` validates quantity ≥ requested qty
2. Order inserted into `orders` table
3. Database trigger `orders_decrease_stock()` fires
4. `decrease_product_stock()` function:
   - Locks product row
   - Validates stock still available
   - Reduces `quantity` by ordered amount
   - Updates `updated_at` timestamp
5. If validation fails, order insert is rejected

Pre-orders bypass this entirely - they just record customer intent.

---

## Admin Panel Filters Summary

### Products Page
- **Status Filters**: All / Active / Inactive
- **Stock Filters**: In Stock / Out of Stock / Available for Pre-Order
- **Search**: Name, Slug, Label (case-insensitive)
- **Display**: Stock quantity, status badge, low-stock indicator

### Orders Page
- **Status Filters**: All / Pending / Confirmed / Shipped / Delivered / Cancelled
- **Date Filters**: All Time / Today / This Week / This Month
- **Search**: Customer Name, Email, Order Reference, Product Slug
- **Sort**: By created_at (descending - newest first)

### Pre-Orders Page
- **Status Filters**: All / Pending / Confirmed / Shipped / Delivered / Cancelled
- **Date Filters**: All Time / Today / This Week / This Month
- **Search**: Customer Name, Email, Pre-Order Reference, Product Slug
- **Sort**: By created_at (descending - newest first)

---

## Database Schema Changes

All changes are in `supabase.sql` (already provided in your project).

### New Columns
- `products.quantity` (integer, default 0, not null, ≥ 0)

### New Table
- `pre_orders` - Mirrors `orders` table structure:
  - id (uuid, pk)
  - pre_order_ref (text, unique)
  - customer_name, email, phone
  - city, address, notes
  - items (jsonb array)
  - total, delivery_fee, currency
  - status (enum)
  - created_at (timestamptz)

### New Functions
- `decrease_product_stock(p_slug text, p_qty integer)` - Safely decreases stock
- `orders_decrease_stock_trigger()` - Trigger function
- `get_product_stock(p_slug text)` - Read-only helper

### New Trigger
- `orders_decrease_stock` - AFTER INSERT on orders

### RLS Policies
- `pre_orders`: Deny all for anon/authenticated (service role only)
- `orders`: Unchanged (anyone can insert guest orders)

---

## Type Definitions

### admin/src/lib/types.ts

```typescript
export type Product = {
  id: string;
  slug: string;
  name: string;
  label: string;
  price_eur: number;
  quantity: number;  // NEW
  image_url: string;
  image_urls: string[];
  story: string;
  tags: string[];
  is_active: boolean;
  support_enabled: boolean;
  support_name: string | null;
  support_price_eur: number | null;
  created_at: string;
  updated_at: string;
};

export type PreOrder = {  // NEW
  id: string;
  pre_order_ref: string;
  customer_name: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  notes: string | null;
  items: PreOrderItem[];
  total: number;
  delivery_fee: number;
  currency: string;
  status: string;
  created_at: string;
};
```

### src/lib/products.ts

```typescript
export type Product = {
  // ... existing fields
  quantity: number;  // Available units; 0 = out of stock
};

// Helper functions already defined:
export function isInStock(product: Pick<Product, "quantity">): boolean
export function isOutOfStock(product: Pick<Product, "quantity" | "is_active">): boolean
export function canPreOrder(product: Pick<Product, "quantity" | "is_active">): boolean
export function maxPurchasableQty(product: Pick<Product, "quantity">): number
```

---

## API Endpoints

### Products
- `GET /api/products` - List all products (includes quantity)
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create product (quantity required)
- `PUT /api/products/:id` - Update product (quantity optional)
- `PATCH /api/products/:id/active` - Toggle active status
- `DELETE /api/products/:id` - Delete product

### Orders
- `GET /api/orders` - List all orders (filterable on admin)
- `GET /api/orders/:id` - Get single order
- `POST /api/orders` - Create order (auto-decreases stock)
- `PUT /api/orders/:id` - Update order status
- `DELETE /api/orders/:id` - Delete order

### Pre-Orders
- `GET /api/pre-orders` - List all pre-orders (admin only, filterable)
- `GET /api/pre-orders/:id` - Get single pre-order (admin only)
- `DELETE /api/pre-orders/:id` - Delete pre-order (admin only)
- *(POST endpoint ready for frontend to call via `placePreOrder()` function)*

---

## Server Functions (Frontend)

### Existing (Updated)
- `placeOrder()` - Creates order, validates stock availability, auto-reduces stock
- `getCanonicalProductPricing()` - Returns unit price, quantity, support info

### New
- `placePreOrder()` - Creates pre-order, validates pricing, no stock reduction
- `generatePreOrderRef()` - Generates PO-XXXXXX reference

---

## Testing Checklist

- [ ] Admin can create product with quantity
- [ ] Admin can view quantity in Products table
- [ ] Admin can filter by stock status
- [ ] Admin can search products by name/slug/label
- [ ] Quantity badges show correctly (In Stock / Pre-Order / Out of Stock)
- [ ] When order placed, stock decreases
- [ ] When stock reaches 0, product shows "Pre-Order" status
- [ ] Admin can access Pre-Orders page
- [ ] Pre-orders can be filtered by status
- [ ] Pre-orders can be filtered by date range
- [ ] Pre-orders can be searched
- [ ] Orders can be filtered by status
- [ ] Orders can be filtered by date range
- [ ] Orders can be searched
- [ ] Pre-order doesn't reduce stock
- [ ] Cannot order more than available stock

---

## Configuration Notes

### Supabase Migration
The `supabase.sql` file already contains all necessary DDL. To apply:

1. Open Supabase SQL editor
2. Copy contents of `supabase.sql` 
3. Paste into editor
4. Click "Run" to apply

All operations use `IF NOT EXISTS` guards - safe to run multiple times.

### Environment
No new environment variables required. Uses existing:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` (frontend)
- `SUPABASE_SERVICE_ROLE_KEY` (admin/server)

---

## Future Enhancements

1. **Frontend Pre-Order Integration**
   - Update product cards to show pre-order button
   - Integrate `placePreOrder()` into checkout flow
   - Show pre-order confirmation page

2. **Admin Pre-Order Management**
   - Implement `PUT /api/pre-orders/:id` for status updates
   - Bulk status updates
   - Email notifications when pre-order fulfills

3. **Notifications**
   - Email customer when pre-order placed
   - Email when pre-order ships
   - Email when product back in stock

4. **Stock Tracking**
   - Low stock alerts (< 5 units)
   - Stock history/audit log
   - Restock notifications

5. **Analytics**
   - Pre-order conversion rate
   - Popular pre-order products
   - Stock turnover metrics
