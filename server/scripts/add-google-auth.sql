-- Migration: Add Google OAuth support to Users table
-- Run this script on the TouristGuide database

-- Add Provider column (e.g., 'local', 'google')
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'Provider')
BEGIN
    ALTER TABLE Users ADD Provider NVARCHAR(20) NOT NULL DEFAULT 'local';
    PRINT 'Added Provider column';
END
ELSE
    PRINT 'Provider column already exists';

-- Add ProviderId column (Google's sub/user ID)
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'ProviderId')
BEGIN
    ALTER TABLE Users ADD ProviderId NVARCHAR(255) NULL;
    PRINT 'Added ProviderId column';
END
ELSE
    PRINT 'ProviderId column already exists';

-- Make PasswordHash nullable (Google users won't have a password)
-- First check if PasswordHash currently has a NOT NULL constraint
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'PasswordHash' AND is_nullable = 0)
BEGIN
    ALTER TABLE Users ALTER COLUMN PasswordHash NVARCHAR(255) NULL;
    PRINT 'Made PasswordHash nullable';
END
ELSE
    PRINT 'PasswordHash is already nullable';

-- Add unique index on ProviderId for non-null values
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Users_ProviderId' AND object_id = OBJECT_ID('Users'))
BEGIN
    CREATE UNIQUE INDEX IX_Users_ProviderId ON Users(ProviderId) WHERE ProviderId IS NOT NULL;
    PRINT 'Added unique index on ProviderId';
END
ELSE
    PRINT 'Index IX_Users_ProviderId already exists';

PRINT 'Migration complete!';
