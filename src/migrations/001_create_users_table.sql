-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS poscanalyst;
USE poscanalyst;

-- Drop table if exists (for fresh start)
DROP TABLE IF EXISTS users;

-- Create users table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    plan_type ENUM('free', 'basic', 'pro', 'enterprise') DEFAULT 'free',
    status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
    country VARCHAR(2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    INDEX idx_created_at (created_at),
    INDEX idx_plan_type (plan_type),
    INDEX idx_status (status)
);

-- Insert mock data with growth patterns
-- We'll create data showing:
-- 1. Steady growth over the past 60 days
-- 2. A surge in the last 7-14 days (simulating growth trigger)
-- 3. Realistic daily variations

DELIMITER $$

CREATE PROCEDURE generate_users()
BEGIN
    DECLARE i INT DEFAULT 1;
    DECLARE base_date DATETIME;
    DECLARE days_ago INT;
    DECLARE daily_users INT;
    DECLARE hour_offset INT;
    DECLARE plan VARCHAR(20);
    DECLARE country_code VARCHAR(2);
    DECLARE status_val VARCHAR(20);
    
    -- Generate users for the past 60 days
    WHILE i <= 2000 DO
        -- Determine how many days ago this user was created
        -- Recent days have more users (growth pattern)
        SET days_ago = FLOOR(60 * (1 - POW(RAND(), 2))); -- Bias towards recent days
        
        -- Add some hourly variation
        SET hour_offset = FLOOR(RAND() * 24);
        SET base_date = DATE_SUB(NOW(), INTERVAL days_ago DAY);
        SET base_date = DATE_ADD(base_date, INTERVAL hour_offset HOUR);
        
        -- Determine plan type (more paid users in recent signups)
        IF days_ago < 7 THEN
            SET plan = CASE 
                WHEN RAND() < 0.6 THEN 'free'
                WHEN RAND() < 0.8 THEN 'basic'
                WHEN RAND() < 0.95 THEN 'pro'
                ELSE 'enterprise'
            END;
        ELSE
            SET plan = CASE 
                WHEN RAND() < 0.8 THEN 'free'
                WHEN RAND() < 0.95 THEN 'basic'
                ELSE 'pro'
            END;
        END IF;
        
        -- Random country (weighted distribution)
        SET country_code = CASE 
            WHEN RAND() < 0.4 THEN 'US'
            WHEN RAND() < 0.6 THEN 'GB'
            WHEN RAND() < 0.7 THEN 'CA'
            WHEN RAND() < 0.8 THEN 'DE'
            WHEN RAND() < 0.9 THEN 'FR'
            ELSE 'AU'
        END;
        
        -- Status (most users active, some recent ones might be inactive)
        SET status_val = CASE 
            WHEN RAND() < 0.9 THEN 'active'
            WHEN RAND() < 0.98 THEN 'inactive'
            ELSE 'suspended'
        END;
        
        -- Insert user
        INSERT INTO users (
            email, 
            username, 
            first_name, 
            last_name, 
            plan_type, 
            status,
            country,
            created_at,
            last_login
        ) VALUES (
            CONCAT('user', i, '@example.com'),
            CONCAT('user', i),
            CONCAT('First', i),
            CONCAT('Last', i),
            plan,
            status_val,
            country_code,
            base_date,
            CASE 
                WHEN status_val = 'active' AND RAND() < 0.7 
                THEN DATE_ADD(base_date, INTERVAL FLOOR(RAND() * days_ago) DAY)
                ELSE NULL 
            END
        );
        
        SET i = i + 1;
    END WHILE;
    
    -- Add surge users for the last 7 days (simulating 50%+ growth)
    SET i = 2001;
    WHILE i <= 2500 DO
        SET days_ago = FLOOR(RAND() * 7); -- Last 7 days only
        SET hour_offset = FLOOR(RAND() * 24);
        SET base_date = DATE_SUB(NOW(), INTERVAL days_ago DAY);
        SET base_date = DATE_ADD(base_date, INTERVAL hour_offset HOUR);
        
        -- These surge users are more likely to be on paid plans
        SET plan = CASE 
            WHEN RAND() < 0.4 THEN 'free'
            WHEN RAND() < 0.7 THEN 'basic'
            WHEN RAND() < 0.9 THEN 'pro'
            ELSE 'enterprise'
        END;
        
        INSERT INTO users (
            email, 
            username, 
            first_name, 
            last_name, 
            plan_type, 
            status,
            country,
            created_at,
            last_login
        ) VALUES (
            CONCAT('surge_user', i, '@example.com'),
            CONCAT('surge_user', i),
            CONCAT('Surge', i),
            CONCAT('Growth', i),
            plan,
            'active',
            CASE 
                WHEN RAND() < 0.5 THEN 'US'
                WHEN RAND() < 0.7 THEN 'GB'
                ELSE 'CA'
            END,
            base_date,
            DATE_ADD(base_date, INTERVAL FLOOR(RAND() * days_ago) DAY)
        );
        
        SET i = i + 1;
    END WHILE;
END$$

DELIMITER ;

-- Execute the procedure to generate users
CALL generate_users();

-- Drop the procedure after use
DROP PROCEDURE generate_users;

-- Show summary statistics
SELECT 
    'Total Users' as metric,
    COUNT(*) as value
FROM users
UNION ALL
SELECT 
    'Users Last 7 Days',
    COUNT(*)
FROM users 
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
UNION ALL
SELECT 
    'Users Previous 7 Days',
    COUNT(*)
FROM users 
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY) 
AND created_at < DATE_SUB(NOW(), INTERVAL 7 DAY)
UNION ALL
SELECT 
    'Growth Rate Last 7 Days',
    CONCAT(
        ROUND(
            ((SELECT COUNT(*) FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)) - 
             (SELECT COUNT(*) FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY) AND created_at < DATE_SUB(NOW(), INTERVAL 7 DAY))) 
            / 
            (SELECT COUNT(*) FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY) AND created_at < DATE_SUB(NOW(), INTERVAL 7 DAY)) 
            * 100, 2
        ), '%'
    );

-- Show daily breakdown for last 14 days
SELECT 
    DATE(created_at) as signup_date,
    COUNT(*) as daily_signups,
    GROUP_CONCAT(DISTINCT plan_type) as plans_signed_up
FROM users 
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY)
GROUP BY DATE(created_at)
ORDER BY signup_date DESC;