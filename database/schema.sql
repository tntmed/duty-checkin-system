-- ============================================================
-- Duty Check-in System - Oracle Database Schema
-- ============================================================

-- ============================================================
-- Drop tables in reverse dependency order
-- ============================================================
BEGIN EXECUTE IMMEDIATE 'DROP TABLE attachments CASCADE CONSTRAINTS'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE incidents CASCADE CONSTRAINTS'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE checklist_logs CASCADE CONSTRAINTS'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE checklist_templates CASCADE CONSTRAINTS'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE duties CASCADE CONSTRAINTS'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE duty_shifts CASCADE CONSTRAINTS'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE user_roles CASCADE CONSTRAINTS'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE roles CASCADE CONSTRAINTS'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE users CASCADE CONSTRAINTS'; EXCEPTION WHEN OTHERS THEN NULL; END;
/

-- ============================================================
-- Drop sequences
-- ============================================================
BEGIN EXECUTE IMMEDIATE 'DROP SEQUENCE seq_users'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP SEQUENCE seq_roles'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP SEQUENCE seq_user_roles'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP SEQUENCE seq_duty_shifts'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP SEQUENCE seq_duties'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP SEQUENCE seq_checklist_templates'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP SEQUENCE seq_checklist_logs'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP SEQUENCE seq_incidents'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP SEQUENCE seq_attachments'; EXCEPTION WHEN OTHERS THEN NULL; END;
/

-- ============================================================
-- Create sequences
-- ============================================================
CREATE SEQUENCE seq_users START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE seq_roles START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE seq_user_roles START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE seq_duty_shifts START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE seq_duties START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE seq_checklist_templates START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE seq_checklist_logs START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE seq_incidents START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE seq_attachments START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;

-- ============================================================
-- Create tables
-- ============================================================

-- users
CREATE TABLE users (
    id               NUMBER PRIMARY KEY,
    employee_code    VARCHAR2(50) UNIQUE NOT NULL,
    full_name        VARCHAR2(200) NOT NULL,
    hashed_password  VARCHAR2(255) NOT NULL,
    email            VARCHAR2(200),
    is_active        NUMBER(1) DEFAULT 1 NOT NULL,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- roles
CREATE TABLE roles (
    id          NUMBER PRIMARY KEY,
    name        VARCHAR2(100) UNIQUE NOT NULL,
    description VARCHAR2(500),
    is_active   NUMBER(1) DEFAULT 1 NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- user_roles
CREATE TABLE user_roles (
    id          NUMBER PRIMARY KEY,
    user_id     NUMBER NOT NULL,
    role_id     NUMBER NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_ur_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_ur_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    CONSTRAINT uq_user_role UNIQUE (user_id, role_id)
);

-- duty_shifts
CREATE TABLE duty_shifts (
    id         NUMBER PRIMARY KEY,
    name       VARCHAR2(100) NOT NULL,
    start_time VARCHAR2(10) NOT NULL,
    end_time   VARCHAR2(10) NOT NULL,
    is_active  NUMBER(1) DEFAULT 1 NOT NULL
);

-- duties
CREATE TABLE duties (
    id                NUMBER PRIMARY KEY,
    user_id           NUMBER NOT NULL,
    role_id           NUMBER NOT NULL,
    shift_id          NUMBER NOT NULL,
    duty_date         DATE NOT NULL,
    checkin_time      TIMESTAMP,
    checkout_time     TIMESTAMP,
    attendance_status VARCHAR2(20) DEFAULT 'PRESENT' NOT NULL,
    notes             VARCHAR2(1000),
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_duty_user  FOREIGN KEY (user_id)  REFERENCES users(id),
    CONSTRAINT fk_duty_role  FOREIGN KEY (role_id)  REFERENCES roles(id),
    CONSTRAINT fk_duty_shift FOREIGN KEY (shift_id) REFERENCES duty_shifts(id),
    CONSTRAINT chk_attendance CHECK (attendance_status IN ('PRESENT','LATE','ABSENT','EXCUSED'))
);

-- checklist_templates
CREATE TABLE checklist_templates (
    id          NUMBER PRIMARY KEY,
    role_id     NUMBER NOT NULL,
    item_order  NUMBER DEFAULT 0 NOT NULL,
    item_text   VARCHAR2(500) NOT NULL,
    is_required NUMBER(1) DEFAULT 1 NOT NULL,
    is_active   NUMBER(1) DEFAULT 1 NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_ct_role FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- checklist_logs
CREATE TABLE checklist_logs (
    id          NUMBER PRIMARY KEY,
    duty_id     NUMBER NOT NULL,
    template_id NUMBER NOT NULL,
    status      VARCHAR2(20) DEFAULT 'NA' NOT NULL,
    remark      VARCHAR2(1000),
    checked_at  TIMESTAMP,
    CONSTRAINT fk_cl_duty     FOREIGN KEY (duty_id)     REFERENCES duties(id) ON DELETE CASCADE,
    CONSTRAINT fk_cl_template FOREIGN KEY (template_id) REFERENCES checklist_templates(id),
    CONSTRAINT chk_cl_status  CHECK (status IN ('OK','NOT_OK','NA'))
);

-- incidents
CREATE TABLE incidents (
    id              NUMBER PRIMARY KEY,
    duty_id         NUMBER NOT NULL,
    incident_type   VARCHAR2(20) NOT NULL,
    detail          CLOB NOT NULL,
    impact          VARCHAR2(20) DEFAULT 'NONE' NOT NULL,
    status          VARCHAR2(20) DEFAULT 'OPEN' NOT NULL,
    reported_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    resolved_at     TIMESTAMP,
    assigned_to     NUMBER,
    resolution_note VARCHAR2(2000),
    CONSTRAINT fk_inc_duty       FOREIGN KEY (duty_id)      REFERENCES duties(id) ON DELETE CASCADE,
    CONSTRAINT fk_inc_assigned   FOREIGN KEY (assigned_to)  REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT chk_inc_type      CHECK (incident_type IN ('INCIDENT','ROUTINE','MAINTENANCE')),
    CONSTRAINT chk_inc_impact    CHECK (impact IN ('NONE','MINOR','MAJOR','CRITICAL')),
    CONSTRAINT chk_inc_status    CHECK (status IN ('OPEN','IN_PROGRESS','RESOLVED','CLOSED'))
);

-- attachments
CREATE TABLE attachments (
    id               NUMBER PRIMARY KEY,
    file_name        VARCHAR2(255) NOT NULL,
    file_path        VARCHAR2(500) NOT NULL,
    file_size        NUMBER,
    mime_type        VARCHAR2(100),
    duty_id          NUMBER,
    checklist_log_id NUMBER,
    incident_id      NUMBER,
    uploaded_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_att_duty     FOREIGN KEY (duty_id)          REFERENCES duties(id) ON DELETE SET NULL,
    CONSTRAINT fk_att_cl       FOREIGN KEY (checklist_log_id) REFERENCES checklist_logs(id) ON DELETE SET NULL,
    CONSTRAINT fk_att_incident FOREIGN KEY (incident_id)      REFERENCES incidents(id) ON DELETE SET NULL
);

-- ============================================================
-- Triggers for auto-increment via sequences
-- ============================================================

CREATE OR REPLACE TRIGGER trg_users_bi
BEFORE INSERT ON users
FOR EACH ROW
BEGIN
    IF :NEW.id IS NULL THEN
        SELECT seq_users.NEXTVAL INTO :NEW.id FROM DUAL;
    END IF;
END;
/

CREATE OR REPLACE TRIGGER trg_roles_bi
BEFORE INSERT ON roles
FOR EACH ROW
BEGIN
    IF :NEW.id IS NULL THEN
        SELECT seq_roles.NEXTVAL INTO :NEW.id FROM DUAL;
    END IF;
END;
/

CREATE OR REPLACE TRIGGER trg_user_roles_bi
BEFORE INSERT ON user_roles
FOR EACH ROW
BEGIN
    IF :NEW.id IS NULL THEN
        SELECT seq_user_roles.NEXTVAL INTO :NEW.id FROM DUAL;
    END IF;
END;
/

CREATE OR REPLACE TRIGGER trg_duty_shifts_bi
BEFORE INSERT ON duty_shifts
FOR EACH ROW
BEGIN
    IF :NEW.id IS NULL THEN
        SELECT seq_duty_shifts.NEXTVAL INTO :NEW.id FROM DUAL;
    END IF;
END;
/

CREATE OR REPLACE TRIGGER trg_duties_bi
BEFORE INSERT ON duties
FOR EACH ROW
BEGIN
    IF :NEW.id IS NULL THEN
        SELECT seq_duties.NEXTVAL INTO :NEW.id FROM DUAL;
    END IF;
END;
/

CREATE OR REPLACE TRIGGER trg_checklist_templates_bi
BEFORE INSERT ON checklist_templates
FOR EACH ROW
BEGIN
    IF :NEW.id IS NULL THEN
        SELECT seq_checklist_templates.NEXTVAL INTO :NEW.id FROM DUAL;
    END IF;
END;
/

CREATE OR REPLACE TRIGGER trg_checklist_logs_bi
BEFORE INSERT ON checklist_logs
FOR EACH ROW
BEGIN
    IF :NEW.id IS NULL THEN
        SELECT seq_checklist_logs.NEXTVAL INTO :NEW.id FROM DUAL;
    END IF;
END;
/

CREATE OR REPLACE TRIGGER trg_incidents_bi
BEFORE INSERT ON incidents
FOR EACH ROW
BEGIN
    IF :NEW.id IS NULL THEN
        SELECT seq_incidents.NEXTVAL INTO :NEW.id FROM DUAL;
    END IF;
END;
/

CREATE OR REPLACE TRIGGER trg_attachments_bi
BEFORE INSERT ON attachments
FOR EACH ROW
BEGIN
    IF :NEW.id IS NULL THEN
        SELECT seq_attachments.NEXTVAL INTO :NEW.id FROM DUAL;
    END IF;
END;
/

-- Trigger to auto-update updated_at on users
CREATE OR REPLACE TRIGGER trg_users_bu
BEFORE UPDATE ON users
FOR EACH ROW
BEGIN
    :NEW.updated_at := CURRENT_TIMESTAMP;
END;
/

COMMIT;
