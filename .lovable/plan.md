

## Plan: Add Order-Level Print Audit Logging

### What changes

Currently `print_logs` records *how many* orders were printed but not *which ones*. We'll add a join table that links each print log to the specific order IDs included.

### Database migration

Create a new `print_log_orders` table:

```sql
CREATE TABLE public.print_log_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  print_log_id uuid NOT NULL REFERENCES public.print_logs(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE
);

ALTER TABLE public.print_log_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can insert print_log_orders"
  ON public.print_log_orders FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can view print_log_orders"
  ON public.print_log_orders FOR SELECT TO authenticated USING (true);
```

### Code changes

**`src/context/OrderContext.tsx`** — Update `logPrint` signature to accept an array of order IDs:

- Change signature: `logPrint(dates, location, count)` → `logPrint(dates, location, count, orderIds)`
- After inserting into `print_logs`, insert rows into `print_log_orders` linking each returned print log ID to the order IDs
- Use `.select()` on the print_logs insert to get back the generated IDs

**`src/components/OrderCalendar.tsx`** — Pass order IDs when calling `logPrint`:

- In `SelectedDayModal.handlePrint`: pass `printableOrders.map(o => o.id)` as the fourth argument
- In `MultiDayPrintPreview.handlePrint`: same — pass the IDs of the orders being printed

### Summary
- 1 new table (`print_log_orders`)
- 2 files modified (`OrderContext.tsx`, `OrderCalendar.tsx`)
- No UI changes — this is purely audit logging under the hood

