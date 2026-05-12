-- Task Attachments (File Upload)
-- First Supabase Storage integration

-- ============================
-- ATTACHMENTS COLUMN
-- ============================
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- ============================
-- STORAGE BUCKET
-- ============================
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
  'task-attachments',
  'task-attachments',
  true,
  false,
  10485760, -- 10MB
  ARRAY['image/*', 'video/*', 'application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
ON CONFLICT (id) DO NOTHING;

-- ============================
-- STORAGE RLS POLICIES
-- ============================
-- Allow authenticated users to read any file in task-attachments
CREATE POLICY "task_attachments_select_policy"
ON storage.objects FOR SELECT
USING (bucket_id = 'task-attachments');

-- Allow authenticated users to upload to task-attachments
CREATE POLICY "task_attachments_insert_policy"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'task-attachments');

-- Allow authenticated users to delete from task-attachments
CREATE POLICY "task_attachments_delete_policy"
ON storage.objects FOR DELETE
USING (bucket_id = 'task-attachments');
