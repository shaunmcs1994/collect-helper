-- Enable pg_cron and pg_net extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA public;

-- Create function to cleanup old collected orders (older than 4 weeks)
CREATE OR REPLACE FUNCTION public.cleanup_old_collected_orders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.orders 
  WHERE status = 'collected' 
  AND collected_at IS NOT NULL
  AND collected_at < NOW() - INTERVAL '4 weeks';
  
  RAISE NOTICE 'Cleaned up old collected orders older than 4 weeks';
END;
$$;