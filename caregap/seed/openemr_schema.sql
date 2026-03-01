-- Minimal OpenEMR table schema for CareGap standalone deployment.
-- Creates only the tables CareGap reads from — no full OpenEMR needed.

CREATE TABLE IF NOT EXISTS patient_data (
    id BIGINT AUTO_INCREMENT,
    pid BIGINT NOT NULL,
    pubpid VARCHAR(255) DEFAULT NULL,
    uuid BINARY(16) DEFAULT NULL,
    fname VARCHAR(255) DEFAULT NULL,
    lname VARCHAR(255) DEFAULT NULL,
    DOB DATE DEFAULT NULL,
    sex VARCHAR(16) DEFAULT NULL,
    street VARCHAR(255) DEFAULT NULL,
    city VARCHAR(255) DEFAULT NULL,
    state VARCHAR(50) DEFAULT NULL,
    postal_code VARCHAR(20) DEFAULT NULL,
    phone_home VARCHAR(30) DEFAULT NULL,
    phone_cell VARCHAR(30) DEFAULT NULL,
    email VARCHAR(255) DEFAULT NULL,
    race VARCHAR(255) DEFAULT NULL,
    ethnicity VARCHAR(255) DEFAULT NULL,
    date DATETIME DEFAULT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY idx_pid (pid),
    KEY idx_uuid (uuid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS form_encounter (
    id BIGINT AUTO_INCREMENT,
    uuid BINARY(16) DEFAULT NULL,
    date DATETIME DEFAULT NULL,
    reason TEXT DEFAULT NULL,
    facility_id BIGINT DEFAULT NULL,
    pid BIGINT DEFAULT NULL,
    encounter BIGINT NOT NULL,
    onset_date DATE DEFAULT NULL,
    PRIMARY KEY (id),
    KEY idx_encounter (encounter),
    KEY idx_pid (pid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS forms (
    id BIGINT AUTO_INCREMENT,
    date DATETIME DEFAULT NULL,
    encounter BIGINT DEFAULT NULL,
    form_name VARCHAR(255) DEFAULT NULL,
    form_id BIGINT DEFAULT NULL,
    pid BIGINT DEFAULT NULL,
    user VARCHAR(255) DEFAULT NULL,
    groupname VARCHAR(255) DEFAULT NULL,
    authorized TINYINT DEFAULT 0,
    formdir VARCHAR(255) DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    PRIMARY KEY (id),
    KEY idx_encounter (encounter),
    KEY idx_pid (pid),
    KEY idx_formdir (formdir)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS form_vitals (
    id BIGINT AUTO_INCREMENT,
    uuid BINARY(16) DEFAULT NULL,
    date DATETIME DEFAULT NULL,
    pid BIGINT DEFAULT NULL,
    user VARCHAR(255) DEFAULT NULL,
    authorized TINYINT DEFAULT 0,
    activity TINYINT DEFAULT 1,
    bps VARCHAR(40) DEFAULT NULL,
    bpd VARCHAR(40) DEFAULT NULL,
    weight FLOAT DEFAULT NULL,
    height FLOAT DEFAULT NULL,
    temperature FLOAT DEFAULT NULL,
    pulse FLOAT DEFAULT NULL,
    respiration FLOAT DEFAULT NULL,
    BMI FLOAT DEFAULT NULL,
    PRIMARY KEY (id),
    KEY idx_uuid (uuid),
    KEY idx_pid (pid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS lists (
    id BIGINT AUTO_INCREMENT,
    uuid BINARY(16) DEFAULT NULL,
    date DATETIME DEFAULT NULL,
    type VARCHAR(30) DEFAULT NULL,
    title VARCHAR(255) DEFAULT NULL,
    diagnosis VARCHAR(255) DEFAULT NULL,
    begdate DATE DEFAULT NULL,
    enddate DATE DEFAULT NULL,
    activity TINYINT DEFAULT 1,
    pid BIGINT DEFAULT NULL,
    user VARCHAR(255) DEFAULT NULL,
    groupname VARCHAR(255) DEFAULT NULL,
    PRIMARY KEY (id),
    KEY idx_pid_type (pid, type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS procedure_order (
    procedure_order_id BIGINT AUTO_INCREMENT,
    uuid BINARY(16) DEFAULT NULL,
    provider_id BIGINT DEFAULT NULL,
    patient_id BIGINT DEFAULT NULL,
    date_collected DATETIME DEFAULT NULL,
    date_ordered DATE DEFAULT NULL,
    order_status VARCHAR(32) DEFAULT NULL,
    procedure_order_type VARCHAR(32) DEFAULT NULL,
    PRIMARY KEY (procedure_order_id),
    KEY idx_patient (patient_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS procedure_order_code (
    procedure_order_id BIGINT NOT NULL,
    procedure_order_seq INT NOT NULL DEFAULT 1,
    procedure_code VARCHAR(64) DEFAULT NULL,
    procedure_name VARCHAR(255) DEFAULT NULL,
    procedure_type VARCHAR(32) DEFAULT NULL,
    PRIMARY KEY (procedure_order_id, procedure_order_seq)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS procedure_report (
    procedure_report_id BIGINT AUTO_INCREMENT,
    uuid BINARY(16) DEFAULT NULL,
    procedure_order_id BIGINT DEFAULT NULL,
    procedure_order_seq INT DEFAULT 1,
    date_collected DATETIME DEFAULT NULL,
    date_report DATETIME DEFAULT NULL,
    report_status VARCHAR(32) DEFAULT NULL,
    PRIMARY KEY (procedure_report_id),
    KEY idx_order (procedure_order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS procedure_result (
    procedure_result_id BIGINT AUTO_INCREMENT,
    uuid BINARY(16) DEFAULT NULL,
    procedure_report_id BIGINT DEFAULT NULL,
    result_code VARCHAR(64) DEFAULT NULL,
    result_text VARCHAR(255) DEFAULT NULL,
    result VARCHAR(255) DEFAULT NULL,
    units VARCHAR(32) DEFAULT NULL,
    `range` VARCHAR(128) DEFAULT NULL,
    abnormal VARCHAR(16) DEFAULT NULL,
    date DATETIME DEFAULT NULL,
    result_status VARCHAR(32) DEFAULT NULL,
    PRIMARY KEY (procedure_result_id),
    KEY idx_report (procedure_report_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
