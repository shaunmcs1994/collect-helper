-- Add color column to product_emojis table for custom product colors
ALTER TABLE public.product_emojis 
ADD COLUMN IF NOT EXISTS color text DEFAULT NULL;