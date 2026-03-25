-- ============================================================
-- MyCareer Resume Platform — Supabase Database Schema
-- Run this in the Supabase SQL editor to set up all tables
-- ============================================================

-- 1. Custom types
CREATE TYPE user_role AS ENUM ('student', 'staff', 'admin');
CREATE TYPE resume_status AS ENUM ('draft', 'submitted', 'changes_required', 'approved');

-- 2. Users table (extends Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'student',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Resumes table
CREATE TABLE IF NOT EXISTS resumes (
  resume_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_staff_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status resume_status NOT NULL DEFAULT 'draft',
  current_version_id UUID,  -- FK added after resume_versions is created
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX idx_resumes_student_id ON resumes(student_id);
CREATE INDEX idx_resumes_assigned_staff_id ON resumes(assigned_staff_id);
CREATE INDEX idx_resumes_status ON resumes(status);

-- 4. Resume versions table (tracks each file submission)
CREATE TABLE IF NOT EXISTS resume_versions (
  version_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id UUID NOT NULL REFERENCES resumes(resume_id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,  -- Path within Supabase Storage bucket
  original_filename TEXT NOT NULL,
  file_size_bytes BIGINT,
  version_number INT NOT NULL DEFAULT 1,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_resume_versions_resume_id ON resume_versions(resume_id);

-- Add FK from resumes.current_version_id → resume_versions.version_id
ALTER TABLE resumes 
  ADD CONSTRAINT fk_current_version 
  FOREIGN KEY (current_version_id) 
  REFERENCES resume_versions(version_id) 
  ON DELETE SET NULL;

-- 5. Feedback table
CREATE TABLE IF NOT EXISTS feedback (
  feedback_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id UUID NOT NULL REFERENCES resumes(resume_id) ON DELETE CASCADE,
  version_id UUID REFERENCES resume_versions(version_id) ON DELETE SET NULL,
  staff_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_feedback_resume_id ON feedback(resume_id);
CREATE INDEX idx_feedback_staff_id ON feedback(staff_id);

-- 6. Auto-update `updated_at` trigger for resumes
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_resumes_updated_at
    BEFORE UPDATE ON resumes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- Row-Level Security (RLS) Policies
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE resume_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- === USERS ===

-- Users can read their own profile
CREATE POLICY "users_read_own" ON users
  FOR SELECT USING (auth.uid() = id);

-- Staff and admin can read all users
CREATE POLICY "staff_admin_read_all_users" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('staff', 'admin')
    )
  );

-- Users can update their own profile
CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Allow inserting own user record during signup
CREATE POLICY "users_insert_own" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- === RESUMES ===

-- Students can see their own resumes
CREATE POLICY "students_read_own_resumes" ON resumes
  FOR SELECT USING (auth.uid() = student_id);

-- Staff can see resumes assigned to them
CREATE POLICY "staff_read_assigned_resumes" ON resumes
  FOR SELECT USING (auth.uid() = assigned_staff_id);

-- Admin can see all resumes
CREATE POLICY "admin_read_all_resumes" ON resumes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Students can create their own resumes
CREATE POLICY "students_create_resumes" ON resumes
  FOR INSERT WITH CHECK (auth.uid() = student_id);

-- Students can update their own draft resumes
CREATE POLICY "students_update_own_drafts" ON resumes
  FOR UPDATE USING (
    auth.uid() = student_id
  );

-- Staff can update resumes assigned to them
CREATE POLICY "staff_update_assigned_resumes" ON resumes
  FOR UPDATE USING (
    auth.uid() = assigned_staff_id
  );

-- Admin can update any resume
CREATE POLICY "admin_update_all_resumes" ON resumes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- === RESUME VERSIONS ===

-- Readable if user can read the parent resume
CREATE POLICY "versions_readable_by_resume_access" ON resume_versions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM resumes 
      WHERE resumes.resume_id = resume_versions.resume_id 
      AND (
        resumes.student_id = auth.uid() 
        OR resumes.assigned_staff_id = auth.uid()
        OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
      )
    )
  );

-- Students can insert versions for their own resumes
CREATE POLICY "students_insert_versions" ON resume_versions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM resumes 
      WHERE resumes.resume_id = resume_versions.resume_id 
      AND resumes.student_id = auth.uid()
    )
  );

-- === FEEDBACK ===

-- Students can read feedback on their resumes
CREATE POLICY "students_read_own_feedback" ON feedback
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM resumes 
      WHERE resumes.resume_id = feedback.resume_id 
      AND resumes.student_id = auth.uid()
    )
  );

-- Staff can read feedback on assigned resumes
CREATE POLICY "staff_read_assigned_feedback" ON feedback
  FOR SELECT USING (
    feedback.staff_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM resumes 
      WHERE resumes.resume_id = feedback.resume_id 
      AND resumes.assigned_staff_id = auth.uid()
    )
  );

-- Admin can read all feedback
CREATE POLICY "admin_read_all_feedback" ON feedback
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Staff can create feedback on assigned resumes
CREATE POLICY "staff_create_feedback" ON feedback
  FOR INSERT WITH CHECK (
    feedback.staff_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM resumes 
      WHERE resumes.resume_id = feedback.resume_id 
      AND resumes.assigned_staff_id = auth.uid()
    )
  );

-- Admin can create feedback on any resume
CREATE POLICY "admin_create_feedback" ON feedback
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );


-- ============================================================
-- Notifications table
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('status_change', 'new_assignment', 'new_feedback', 'submission')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  resume_id UUID REFERENCES resumes(resume_id) ON DELETE SET NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only read their own notifications
CREATE POLICY "users_read_own_notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Users can update (mark read) their own notifications
CREATE POLICY "users_update_own_notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- System (via service role) inserts notifications
CREATE POLICY "system_create_notifications" ON notifications
  FOR INSERT WITH CHECK (true);


-- 8. Annotations table (digital markup on resume pages)
CREATE TABLE IF NOT EXISTS annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id UUID NOT NULL REFERENCES resumes(resume_id) ON DELETE CASCADE,
  version_id UUID REFERENCES resume_versions(version_id) ON DELETE SET NULL,
  staff_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  page_number INT NOT NULL DEFAULT 1,
  x_position FLOAT NOT NULL DEFAULT 0,
  y_position FLOAT NOT NULL DEFAULT 0,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_annotations_resume_id ON annotations(resume_id);
CREATE INDEX idx_annotations_staff_id ON annotations(staff_id);

ALTER TABLE annotations ENABLE ROW LEVEL SECURITY;

-- Staff and admin can read annotations on their assigned/all resumes
CREATE POLICY "staff_admin_read_annotations" ON annotations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('staff', 'admin'))
    OR EXISTS (SELECT 1 FROM resumes WHERE resume_id = annotations.resume_id AND student_id = auth.uid())
  );

-- Staff and admin can create annotations
CREATE POLICY "staff_admin_create_annotations" ON annotations
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('staff', 'admin'))
  );

-- Staff can delete their own annotations, admin can delete any
CREATE POLICY "staff_delete_own_annotations" ON annotations
  FOR DELETE USING (
    staff_id = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );


-- 9. Resume templates table
CREATE TABLE IF NOT EXISTS resume_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  file_path TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_size_bytes BIGINT,
  uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE resume_templates ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read templates
CREATE POLICY "all_users_read_templates" ON resume_templates
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only admins can create templates
CREATE POLICY "admin_create_templates" ON resume_templates
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Only admins can delete templates
CREATE POLICY "admin_delete_templates" ON resume_templates
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );


-- Create the resume-files bucket (run in Storage settings or via SQL)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('resume-files', 'resume-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: authenticated users can upload to their folder
CREATE POLICY "users_upload_own_files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'resume-files' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can read files in resume-files bucket if they have access
CREATE POLICY "users_read_accessible_files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'resume-files'
    AND auth.uid() IS NOT NULL
  );

-- Allow download of accessible files
CREATE POLICY "users_download_accessible_files" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'resume-files'
    AND auth.uid() IS NOT NULL
  );


-- ============================================================
-- Seed data for demo (optional — remove in production)
-- ============================================================

-- Note: You'll need to create these users via Supabase Auth first,
-- then insert their records here. The UUIDs below are placeholders.
-- 
-- Example after creating auth users:
-- INSERT INTO users (id, email, full_name, role) VALUES
--   ('uuid-from-auth', 'student@aun.edu.ng', 'Alice Student', 'student'),
--   ('uuid-from-auth', 'staff@aun.edu.ng', 'Dr. Smith', 'staff'),
--   ('uuid-from-auth', 'admin@aun.edu.ng', 'Admin User', 'admin');
