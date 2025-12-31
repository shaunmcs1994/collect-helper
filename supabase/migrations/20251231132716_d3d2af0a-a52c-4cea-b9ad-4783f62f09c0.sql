-- Add custom cake fields to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS is_custom_cake boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS custom_notes text,
ADD COLUMN IF NOT EXISTS custom_images jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Create storage bucket for cake photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('cake-photos', 'cake-photos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for cake-photos bucket
CREATE POLICY "Authenticated users can upload cake photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'cake-photos');

CREATE POLICY "Authenticated users can update cake photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'cake-photos');

CREATE POLICY "Authenticated users can delete cake photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'cake-photos');

CREATE POLICY "Anyone can view cake photos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'cake-photos');