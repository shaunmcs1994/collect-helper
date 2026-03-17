
CREATE TABLE public.print_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_date DATE NOT NULL,
  printed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  printed_by UUID REFERENCES auth.users(id),
  location_filter TEXT NOT NULL DEFAULT 'all',
  order_count INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE public.print_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view print_logs"
  ON public.print_logs FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert print_logs"
  ON public.print_logs FOR INSERT TO authenticated
  WITH CHECK (true);
