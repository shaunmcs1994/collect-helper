

## Problem

When you mark an order as collected, the code checks `if (order?.shopifyOrderId)` before calling the fulfill function. But `shopifyOrderId` is never populated from the database (there's no `shopify_order_id` column), so it's always `undefined` and the fulfillment call is **silently skipped**.

The edge function already supports looking up orders by `orderNumber` alone, so the fix is simple.

## Fix

**File: `src/context/OrderContext.tsx` (~line 321)**

Change the guard condition from checking for `shopifyOrderId` to simply always attempting fulfillment for any order that has an order number. The edge function already handles cases where the order isn't found in Shopify (returns `skipped: true` for manual orders).

```typescript
// Before:
if (order?.shopifyOrderId) {

// After:
if (order?.orderNumber) {
```

This is a one-line change. The edge function will:
- Find the order by number in Shopify and fulfill it, OR
- Return gracefully if the order doesn't exist in Shopify (manual orders)

No database migration needed. No new components.

