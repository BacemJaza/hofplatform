# Pre-Order System - Customer-Facing Implementation

## ✅ COMPLETE - Pre-Order Button & Out-of-Stock Handling

All customer-facing pre-order functionality has been successfully implemented.

---

## 📋 Changes Made

### 1. **New Pre-Order Page** (`src/routes/pre-order.tsx`)
- 🆕 Complete pre-order form for out-of-stock products
- Accepts customer details (name, email, phone, city, address, notes)
- Quantity selector (1-20 units)
- Support add-on option (if available)
- Displays product summary with pricing
- Shows pre-order confirmation with reference number (PO-XXXXXX)
- Matches existing UI style and patterns
- Fully integrated with `placePreOrder()` server function

**Features:**
- Back link to product page
- Real-time total calculation
- Out-of-stock warning message
- Success confirmation with pre-order reference
- Toast notifications for errors
- Form validation

### 2. **Product Buy Card** (`src/components/product-buy-card.tsx`)
- ✏️ Automatically shows "Pre-Order" button when `product.quantity === 0`
- ✏️ Shows "Buy It" button (with quantity selector) when in stock
- Conditional rendering based on stock status
- Pre-order button links to `/pre-order?slug=product-slug`
- Maintains existing UI styling

**Behavior:**
```
OUT OF STOCK (quantity = 0):
  Single "Pre-Order" button → Links to pre-order form

IN STOCK (quantity > 0):
  Quantity counter + "Buy It" button → Goes to checkout
```

### 3. **Product Detail Page** (`src/routes/product.$slug.tsx`)
- ✏️ Same out-of-stock detection as product cards
- ✏️ Shows "Pre-Order" button when `product.quantity === 0`
- ✏️ Shows "Add to Cart" button when in stock
- Conditional rendering with `canPreOrder()` helper
- Pre-order button links to `/pre-order?slug=product-slug`

**Behavior:**
```
OUT OF STOCK (quantity = 0):
  Single "Pre-Order" button → Links to pre-order form

IN STOCK (quantity > 0):
  Support options + Quantity selection + "Add to Cart" → Checkout
```

### 4. **Checkout Protection** (`src/routes/checkout.tsx`)
- ✏️ Added validation to prevent checkout with out-of-stock items
- ✏️ Shows error toast with product names if items are out of stock
- ✏️ Displays warning badge on each out-of-stock item in cart
- Prevents form submission if any items are out of stock
- User-friendly error message: "X is out of stock. Please use Pre-Order instead."

**Behavior:**
```
Customer adds out-of-stock item to cart → Tries to checkout:
  ❌ Error toast appears
  ⚠️  Badge shows on out-of-stock items: "⚠️ Out of stock — use Pre-Order"
  Form does NOT submit
  Customer must remove item or use pre-order
```

---

## 🔄 Customer Flow

### Regular Order Flow (In Stock)
```
1. Customer views product
   ↓
2. Sees quantity selector + "Buy It" button
   ↓
3. Sets quantity → Clicks "Buy It"
   ↓
4. Taken to checkout
   ↓
5. Completes order → Stock auto-decreases
```

### Pre-Order Flow (Out of Stock)
```
1. Customer views product
   ↓
2. Sees "Pre-Order" button (no quantity selector)
   ↓
3. Clicks "Pre-Order"
   ↓
4. Taken to pre-order form page
   ↓
5. Fills contact info + selects quantity
   ↓
6. Submits → Gets pre-order reference (PO-XXXXXX)
   ↓
7. Stock UNCHANGED
```

### Checkout with Mixed Cart
```
Customer has both in-stock and out-of-stock items in cart:
  
1. Tries to checkout
   ↓
2. Validation runs → Finds out-of-stock items
   ↓
3. Error toast: "Product Name is out of stock. Please use Pre-Order instead."
   ↓
4. Form disabled
   ↓
5. Customer must either:
   - Remove the out-of-stock item, OR
   - Go back and pre-order it separately
```

---

## 🎯 Key Features

### For Customers

| Feature | Benefit |
|---------|---------|
| Automatic button switching | No confusion - see right button for product status |
| Pre-order form | Easy way to reserve out-of-stock items |
| Checkout protection | Can't accidentally try to buy unavailable items |
| Pre-order reference | Easy tracking of pre-order status |
| Clear messaging | Knows exactly what to do when out of stock |

### Implementation Details

**Stock Status Detection:**
- Uses `canPreOrder(product)` helper function
- Checks: `product.quantity === 0 && product.is_active === true`

**Pre-Order Button:**
- Appears when product is out of stock but active
- Routes to `/pre-order?slug=product-slug`
- Pre-order form loads product details automatically

**Out-of-Stock Prevention:**
- Checkout validates each cart item
- Checks `product.quantity === 0`
- Blocks submission with user-friendly error
- Shows visual warning on out-of-stock items

---

## 🔗 Related Server Function

The pre-order form calls the existing `placePreOrder()` server function from `src/lib/pre-orders.functions.server.ts`:

**Features:**
- Validates product availability (allows even if quantity = 0)
- Validates pricing and delivery fees
- Prevents duplicate submissions (15-second window)
- Stores in `pre_orders` table (doesn't reduce stock)
- Returns pre-order reference (PO-XXXXXX)

---

## 📱 User Experience

### Mobile
- Pre-order button displays full-width on mobile
- Form is responsive and mobile-friendly
- Touch-friendly quantity selector (+/- buttons)

### Desktop
- Pre-order button displays inline
- Large form layout with product summary on left
- Clear visual hierarchy

### Accessibility
- Proper labels on all form inputs
- Semantic HTML structure
- Error messages are clear and actionable
- Toast notifications for feedback

---

## 🎨 UI/UX Consistency

All new components follow existing patterns:

- **Button styling**: Matches existing "Buy It" button
- **Form fields**: Same input style as checkout form
- **Colors**: Uses existing color scheme (border-hairline, text colors)
- **Typography**: Matches existing heading and text styles
- **Spacing**: Consistent padding and gaps
- **Toast notifications**: Uses existing `sonner` toast library

---

## 📊 What Users See

### Out-of-Stock Product (Product Card)
```
[Product Image with "Limited" badge]
Product Name
$99.99

┌─────────────────────────┐
│  Pre-Order — $99.99     │
└─────────────────────────┘
```

### Out-of-Stock Product (Detail Page)
```
Product details...
Support option (if available)

┌──────────────────────────────┐
│  Pre-Order — $99.99          │
└──────────────────────────────┘
```

### Pre-Order Form
```
[Back Link]

Left Side:              Right Side:
Product Summary         Contact Form:
- Base price            - Name
- Support (if added)    - Email
- Total                 - Phone
                        - City
                        - Address
                        - Notes
                        
                        Quantity: 1-20
                        Support: Yes/No
                        
                        [Confirm Pre-Order]
```

### Checkout Warning
```
Cart Item:
[Image] Product Name
        Qty 2
        
        ⚠️ Out of stock — use Pre-Order
```

---

## ✅ Testing Checklist

- [x] Pre-order button appears when quantity = 0
- [x] Buy button appears when quantity > 0
- [x] Pre-order button navigates to form with product slug
- [x] Pre-order form loads product details correctly
- [x] Quantity selector works (1-20)
- [x] Support option works (if enabled on product)
- [x] Form validation works (all fields required)
- [x] Pre-order submission works
- [x] Pre-order confirmation shows reference number
- [x] Checkout validation catches out-of-stock items
- [x] Error message displays clearly
- [x] Out-of-stock warning badge shows in cart
- [x] Responsive design works on mobile/tablet/desktop

---

## 🔗 Integration Points

1. **Product Data**: Uses `product.quantity` field (already available)
2. **Pre-Order Function**: Calls `placePreOrder()` from `src/lib/pre-orders.functions.server.ts`
3. **Product Helper**: Uses `canPreOrder()` from `src/lib/products.ts`
4. **Routing**: Uses TanStack React Router (existing pattern)
5. **Styling**: Uses existing Tailwind CSS setup

---

## 📝 Files Modified

1. `src/components/product-buy-card.tsx` - Added pre-order button logic
2. `src/routes/product.$slug.tsx` - Added pre-order button logic
3. `src/routes/checkout.tsx` - Added out-of-stock validation
4. `src/routes/pre-order.tsx` - NEW pre-order form page

---

## 🚀 How It Works

### Step-by-Step Flow

**Scenario 1: Customer buys in-stock product**

```
1. Customer browses products
2. Finds in-stock item (quantity > 0)
3. Sees "Buy It" button + quantity selector
4. Selects quantity, clicks "Buy It"
5. Cart store updated
6. Redirected to checkout
7. Completes order
8. Stock automatically decreases
```

**Scenario 2: Customer pre-orders out-of-stock product**

```
1. Customer browses products
2. Finds out-of-stock item (quantity = 0)
3. Sees "Pre-Order" button only
4. Clicks "Pre-Order"
5. Redirected to /pre-order?slug=product-slug
6. Pre-order form loads with product details
7. Fills in contact info
8. Selects quantity (with support if available)
9. Clicks "Confirm Pre-Order"
10. placePreOrder() server function called
11. Pre-order created in database
12. Gets reference number (PO-XXXXXX)
13. Confirmation message shown
14. Stock UNCHANGED
15. Admin can manage pre-order from admin panel
```

**Scenario 3: Customer tries to checkout with out-of-stock items**

```
1. Customer adds out-of-stock item to cart (somehow)
2. Tries to proceed to checkout
3. Checkout form onSubmit fires
4. Validation checks each item's quantity
5. Finds quantity = 0 item
6. Toast error shows: "Product Name is out of stock. Please use Pre-Order instead."
7. Form submission blocked
8. Warning badge appears on out-of-stock item
9. Customer must remove item or pre-order separately
```

---

## 🎓 Technical Details

### canPreOrder() Helper
```typescript
export function canPreOrder(product: Pick<Product, "quantity" | "is_active">): boolean {
  return product.is_active && product.quantity === 0;
}
```

### Pre-Order Route
- Route: `/pre-order?slug=product-slug`
- Loads product by slug
- Renders pre-order form
- Submits via `placePreOrder()` server function

### Checkout Validation
```typescript
const outOfStockItems = items.filter((item) => {
  const product = products.find((p) => p.slug === item.slug);
  return product && product.quantity === 0;
});

if (outOfStockItems.length > 0) {
  // Show error and block submission
}
```

---

## 🎉 Summary

The pre-order system is now complete and customer-ready:

✅ **Product Cards**: Show "Pre-Order" or "Buy It" based on stock  
✅ **Product Pages**: Show "Pre-Order" or "Add to Cart" based on stock  
✅ **Pre-Order Form**: Full form for out-of-stock items  
✅ **Checkout Protection**: Prevents ordering out-of-stock items  
✅ **Error Messages**: Clear user-friendly messages  
✅ **Responsive Design**: Works on all device sizes  
✅ **Integration**: Works with existing server functions  

Customers can now seamlessly choose between buying in-stock items or pre-ordering out-of-stock items!
