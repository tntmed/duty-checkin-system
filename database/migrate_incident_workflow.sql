-- ============================================================
-- Migration: Incident Workflow upgrade
-- Run this once against an existing database
-- ============================================================

-- Add assigned_to column (nullable FK to users)
ALTER TABLE incidents ADD assigned_to NUMBER;
ALTER TABLE incidents ADD CONSTRAINT fk_inc_assigned
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL;

-- Add resolution_note column
ALTER TABLE incidents ADD resolution_note VARCHAR2(2000);

-- Widen status check constraint to include CLOSED
ALTER TABLE incidents DROP CONSTRAINT chk_inc_status;
ALTER TABLE incidents ADD CONSTRAINT chk_inc_status
    CHECK (status IN ('OPEN','IN_PROGRESS','RESOLVED','CLOSED'));

COMMIT;
