-- ============================================================
-- Duty Check-in System - Seed Data
-- ============================================================

-- ============================================================
-- Roles
-- ============================================================
INSERT INTO roles (id, name, description) VALUES (seq_roles.NEXTVAL, 'Duty Officer', 'Primary duty officer responsible for overall shift management');
INSERT INTO roles (id, name, description) VALUES (seq_roles.NEXTVAL, 'Assistant', 'Assistant duty officer supporting primary officer');
INSERT INTO roles (id, name, description) VALUES (seq_roles.NEXTVAL, 'Programmer', 'Technical programmer on duty for system support');
INSERT INTO roles (id, name, description) VALUES (seq_roles.NEXTVAL, 'Maintenance', 'Maintenance staff responsible for equipment and facility upkeep');

-- ============================================================
-- Duty Shifts
-- ============================================================
INSERT INTO duty_shifts (id, name, start_time, end_time) VALUES (seq_duty_shifts.NEXTVAL, 'Morning', '06:00', '14:00');
INSERT INTO duty_shifts (id, name, start_time, end_time) VALUES (seq_duty_shifts.NEXTVAL, 'Afternoon', '14:00', '22:00');
INSERT INTO duty_shifts (id, name, start_time, end_time) VALUES (seq_duty_shifts.NEXTVAL, 'Night', '22:00', '06:00');

-- ============================================================
-- Users
-- Default password: password123
-- ============================================================
INSERT INTO users (id, employee_code, full_name, hashed_password, email) VALUES (
    seq_users.NEXTVAL,
    'EMP001',
    'System Admin',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TqznmCEjgwfQfmMhT1iLLsJqEZSW',
    'admin@company.com'
);
INSERT INTO users (id, employee_code, full_name, hashed_password, email) VALUES (
    seq_users.NEXTVAL,
    'EMP002',
    'John Smith',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TqznmCEjgwfQfmMhT1iLLsJqEZSW',
    'john.smith@company.com'
);

-- ============================================================
-- User Roles
-- EMP001 (id=1) gets all 4 roles
-- EMP002 (id=2) gets roles 1,2
-- ============================================================
INSERT INTO user_roles (id, user_id, role_id) VALUES (seq_user_roles.NEXTVAL, 1, 1);
INSERT INTO user_roles (id, user_id, role_id) VALUES (seq_user_roles.NEXTVAL, 1, 2);
INSERT INTO user_roles (id, user_id, role_id) VALUES (seq_user_roles.NEXTVAL, 1, 3);
INSERT INTO user_roles (id, user_id, role_id) VALUES (seq_user_roles.NEXTVAL, 1, 4);
INSERT INTO user_roles (id, user_id, role_id) VALUES (seq_user_roles.NEXTVAL, 2, 1);
INSERT INTO user_roles (id, user_id, role_id) VALUES (seq_user_roles.NEXTVAL, 2, 2);

-- ============================================================
-- Checklist Templates - Role 1: Duty Officer
-- ============================================================
INSERT INTO checklist_templates (id, role_id, item_order, item_text, is_required) VALUES (seq_checklist_templates.NEXTVAL, 1, 1, 'Verify all staff attendance and sign-in log', 1);
INSERT INTO checklist_templates (id, role_id, item_order, item_text, is_required) VALUES (seq_checklist_templates.NEXTVAL, 1, 2, 'Check and review equipment status and operational readiness', 1);
INSERT INTO checklist_templates (id, role_id, item_order, item_text, is_required) VALUES (seq_checklist_templates.NEXTVAL, 1, 3, 'Conduct security perimeter inspection and log findings', 1);
INSERT INTO checklist_templates (id, role_id, item_order, item_text, is_required) VALUES (seq_checklist_templates.NEXTVAL, 1, 4, 'Review and acknowledge pending incident reports from previous shift', 1);
INSERT INTO checklist_templates (id, role_id, item_order, item_text, is_required) VALUES (seq_checklist_templates.NEXTVAL, 1, 5, 'Confirm communication systems are fully operational', 1);
INSERT INTO checklist_templates (id, role_id, item_order, item_text, is_required) VALUES (seq_checklist_templates.NEXTVAL, 1, 6, 'Update shift handover logbook with current status', 1);
INSERT INTO checklist_templates (id, role_id, item_order, item_text, is_required) VALUES (seq_checklist_templates.NEXTVAL, 1, 7, 'Brief team on tasks, priorities, and any special instructions for shift', 1);

-- ============================================================
-- Checklist Templates - Role 2: Assistant
-- ============================================================
INSERT INTO checklist_templates (id, role_id, item_order, item_text, is_required) VALUES (seq_checklist_templates.NEXTVAL, 2, 1, 'Assist duty officer with staff attendance verification', 1);
INSERT INTO checklist_templates (id, role_id, item_order, item_text, is_required) VALUES (seq_checklist_templates.NEXTVAL, 2, 2, 'Check supply inventory levels and report shortages', 1);
INSERT INTO checklist_templates (id, role_id, item_order, item_text, is_required) VALUES (seq_checklist_templates.NEXTVAL, 2, 3, 'Verify visitor log entries are complete and accurate', 1);
INSERT INTO checklist_templates (id, role_id, item_order, item_text, is_required) VALUES (seq_checklist_templates.NEXTVAL, 2, 4, 'Monitor and document all incoming communications', 1);
INSERT INTO checklist_templates (id, role_id, item_order, item_text, is_required) VALUES (seq_checklist_templates.NEXTVAL, 2, 5, 'Prepare and distribute shift activity summary report', 1);
INSERT INTO checklist_templates (id, role_id, item_order, item_text, is_required) VALUES (seq_checklist_templates.NEXTVAL, 2, 6, 'Coordinate with maintenance for any pending work orders', 0);

-- ============================================================
-- Checklist Templates - Role 3: Programmer
-- ============================================================
INSERT INTO checklist_templates (id, role_id, item_order, item_text, is_required) VALUES (seq_checklist_templates.NEXTVAL, 3, 1, 'Verify all critical system services are running and healthy', 1);
INSERT INTO checklist_templates (id, role_id, item_order, item_text, is_required) VALUES (seq_checklist_templates.NEXTVAL, 3, 2, 'Check application server logs for errors or warnings', 1);
INSERT INTO checklist_templates (id, role_id, item_order, item_text, is_required) VALUES (seq_checklist_templates.NEXTVAL, 3, 3, 'Confirm database backup completed successfully', 1);
INSERT INTO checklist_templates (id, role_id, item_order, item_text, is_required) VALUES (seq_checklist_templates.NEXTVAL, 3, 4, 'Review network monitoring dashboard for anomalies', 1);
INSERT INTO checklist_templates (id, role_id, item_order, item_text, is_required) VALUES (seq_checklist_templates.NEXTVAL, 3, 5, 'Test API endpoints and verify response times are within SLA', 1);
INSERT INTO checklist_templates (id, role_id, item_order, item_text, is_required) VALUES (seq_checklist_templates.NEXTVAL, 3, 6, 'Document any system incidents or maintenance performed', 1);
INSERT INTO checklist_templates (id, role_id, item_order, item_text, is_required) VALUES (seq_checklist_templates.NEXTVAL, 3, 7, 'Review and update deployment pipeline status', 0);

-- ============================================================
-- Checklist Templates - Role 4: Maintenance
-- ============================================================
INSERT INTO checklist_templates (id, role_id, item_order, item_text, is_required) VALUES (seq_checklist_templates.NEXTVAL, 4, 1, 'Inspect all mechanical equipment for proper operation', 1);
INSERT INTO checklist_templates (id, role_id, item_order, item_text, is_required) VALUES (seq_checklist_templates.NEXTVAL, 4, 2, 'Check HVAC systems and verify temperature readings are within range', 1);
INSERT INTO checklist_templates (id, role_id, item_order, item_text, is_required) VALUES (seq_checklist_templates.NEXTVAL, 4, 3, 'Verify electrical panels and circuit breakers are in normal state', 1);
INSERT INTO checklist_templates (id, role_id, item_order, item_text, is_required) VALUES (seq_checklist_templates.NEXTVAL, 4, 4, 'Inspect fire suppression and alarm systems are operational', 1);
INSERT INTO checklist_templates (id, role_id, item_order, item_text, is_required) VALUES (seq_checklist_templates.NEXTVAL, 4, 5, 'Log all maintenance activities and work orders completed', 1);
INSERT INTO checklist_templates (id, role_id, item_order, item_text, is_required) VALUES (seq_checklist_templates.NEXTVAL, 4, 6, 'Report any equipment requiring repair or replacement to supervisor', 0);

COMMIT;
