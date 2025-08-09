-- Database initialization script for TiDB
-- This script creates the database, tables, and default user

-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS helfy_db;
USE helfy_db;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    token TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_token (token(255))
);

-- Create user activity table for logging
CREATE TABLE IF NOT EXISTS user_activity (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_timestamp (timestamp),
    INDEX idx_action (action)
);

-- Create audit log table for database changes
CREATE TABLE IF NOT EXISTS audit_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    table_name VARCHAR(255) NOT NULL,
    operation VARCHAR(50) NOT NULL,
    old_values JSON,
    new_values JSON,
    user_id INT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_table_name (table_name),
    INDEX idx_operation (operation),
    INDEX idx_timestamp (timestamp)
);

-- Insert default admin user (password: admin123)
-- Password hash for 'admin123' using bcrypt with 10 rounds
INSERT IGNORE INTO users (username, email, password) 
VALUES (
    'admin', 
    'admin@example.com', 
    '$2b$10$8K1p/a0dQ2jdDpEXbihkbOXL1.k3r2X.YQrqx9rJO6YqLrJ5hOxWa'
);

-- Insert a test user (password: test123)
-- Password hash for 'test123' using bcrypt with 10 rounds
INSERT IGNORE INTO users (username, email, password)
VALUES (
    'testuser',
    'test@example.com',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'
);

-- Create triggers for Change Data Capture simulation
-- Note: TiDB doesn't support traditional triggers, so we'll handle this in application code
-- These are placeholder comments for documentation

-- DELIMITER $$
-- 
-- CREATE TRIGGER users_audit_insert 
--     AFTER INSERT ON users 
--     FOR EACH ROW 
-- BEGIN
--     INSERT INTO audit_log (table_name, operation, new_values, timestamp)
--     VALUES ('users', 'INSERT', JSON_OBJECT('id', NEW.id, 'username', NEW.username, 'email', NEW.email), NOW());
-- END$$
-- 
-- CREATE TRIGGER users_audit_update 
--     AFTER UPDATE ON users 
--     FOR EACH ROW 
-- BEGIN
--     INSERT INTO audit_log (table_name, operation, old_values, new_values, timestamp)
--     VALUES ('users', 'UPDATE', 
--         JSON_OBJECT('id', OLD.id, 'username', OLD.username, 'email', OLD.email, 'token', OLD.token),
--         JSON_OBJECT('id', NEW.id, 'username', NEW.username, 'email', NEW.email, 'token', NEW.token),
--         NOW());
-- END$$
-- 
-- CREATE TRIGGER users_audit_delete 
--     AFTER DELETE ON users 
--     FOR EACH ROW 
-- BEGIN
--     INSERT INTO audit_log (table_name, operation, old_values, timestamp)
--     VALUES ('users', 'DELETE', JSON_OBJECT('id', OLD.id, 'username', OLD.username, 'email', OLD.email), NOW());
-- END$$
-- 
-- CREATE TRIGGER user_activity_audit_insert 
--     AFTER INSERT ON user_activity 
--     FOR EACH ROW 
-- BEGIN
--     INSERT INTO audit_log (table_name, operation, new_values, user_id, timestamp)
--     VALUES ('user_activity', 'INSERT', 
--         JSON_OBJECT('id', NEW.id, 'user_id', NEW.user_id, 'action', NEW.action, 'ip_address', NEW.ip_address),
--         NEW.user_id, NOW());
-- END$$
-- 
-- DELIMITER ;

-- Display table information
SELECT 'Tables created successfully' as Status;
SHOW TABLES;

-- Display default users
SELECT id, username, email, created_at FROM users;
