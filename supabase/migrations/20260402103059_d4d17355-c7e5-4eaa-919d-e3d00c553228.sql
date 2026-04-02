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