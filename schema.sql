-- ============================================================
-- BATARA-AI Database Schema
-- PostgreSQL 15+
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- for gen_random_uuid()

CREATE TYPE user_role AS ENUM ('student', 'it_smart', 'instructor', 'admin');
CREATE TYPE review_status AS ENUM ('pending', 'reviewed', 'needs_revision', 'approved');

-- ============================================================
-- USERS & AUTH
-- ============================================================

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(150) NOT NULL,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255),           -- nullable: OAuth-only accounts have no password
    role            user_role NOT NULL DEFAULT 'student',
    institution     VARCHAR(200),
    avatar_url      VARCHAR(500),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_role ON users(role);

CREATE TABLE oauth_accounts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider            VARCHAR(50) NOT NULL,      -- e.g. 'google'
    provider_user_id    VARCHAR(255) NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (provider, provider_user_id)
);

CREATE INDEX idx_oauth_accounts_user_id ON oauth_accounts(user_id);

-- ============================================================
-- CLASSES & ENROLLMENT
-- ============================================================

CREATE TABLE classes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(200) NOT NULL,
    institution     VARCHAR(200),
    instructor_id   UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_classes_instructor_id ON classes(instructor_id);

CREATE TABLE class_enrollments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id        UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    student_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    enrolled_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (class_id, student_id)
);

CREATE INDEX idx_class_enrollments_student_id ON class_enrollments(student_id);

-- ============================================================
-- PROJECTS (BLOCK WORKSPACE)
-- ============================================================

CREATE TABLE projects (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    class_id            UUID REFERENCES classes(id) ON DELETE SET NULL,
    title               VARCHAR(200) NOT NULL,
    description         TEXT,
    workspace_json      JSONB NOT NULL DEFAULT '{}',   -- Blockly XML/state
    generated_code      TEXT,                            -- generated Python output
    is_published        BOOLEAN NOT NULL DEFAULT false,
    thumbnail_url       VARCHAR(500),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_projects_owner_id ON projects(owner_id);
CREATE INDEX idx_projects_class_id ON projects(class_id);
CREATE INDEX idx_projects_is_published ON projects(is_published) WHERE is_published = true;

CREATE TABLE project_versions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    workspace_json  JSONB NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_project_versions_project_id ON project_versions(project_id, created_at DESC);

-- ============================================================
-- FORUM
-- ============================================================

CREATE TABLE forum_threads (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID REFERENCES projects(id) ON DELETE SET NULL, -- nullable: general topic threads allowed
    title           VARCHAR(200) NOT NULL,
    created_by      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_forum_threads_project_id ON forum_threads(project_id);

CREATE TABLE forum_posts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id       UUID NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
    author_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content         TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_forum_posts_thread_id ON forum_posts(thread_id, created_at);

-- ============================================================
-- GALLERY
-- ============================================================

CREATE TABLE gallery_likes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (project_id, user_id)
);

CREATE INDEX idx_gallery_likes_project_id ON gallery_likes(project_id);

-- ============================================================
-- INSTRUCTOR REVIEW
-- ============================================================

CREATE TABLE instructor_reviews (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    instructor_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status          review_status NOT NULL DEFAULT 'pending',
    comment         TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_instructor_reviews_project_id ON instructor_reviews(project_id);

-- ============================================================
-- ACTIVITY LOG (for performance / usage analysis, feeds Locust + IMI/SUS reporting)
-- ============================================================

CREATE TABLE activity_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    action_type     VARCHAR(100) NOT NULL,      -- e.g. 'login', 'save_project', 'run_simulation', 'publish_project'
    metadata        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id, created_at DESC);
CREATE INDEX idx_activity_logs_action_type ON activity_logs(action_type);

-- ============================================================
-- AUTO-UPDATE updated_at TIMESTAMPS
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();