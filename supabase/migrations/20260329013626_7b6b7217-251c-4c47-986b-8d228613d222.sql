
-- Create storage bucket for medical records
INSERT INTO storage.buckets (id, name, public) VALUES ('medical-records', 'medical-records', false);

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload own medical records"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'medical-records' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow users to read their own files
CREATE POLICY "Users can read own medical records"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'medical-records' AND (storage.foldername(name))[1] = auth.uid()::text);
