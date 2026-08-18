-- =============================================
-- Users Table Schema
-- Stores both Tourist and Tour Guide accounts
-- Differentiated by Role column
-- =============================================

CREATE TABLE Users (
    Id          INT IDENTITY PRIMARY KEY,
    FullName    NVARCHAR(100) NOT NULL,
    Email       NVARCHAR(150) NOT NULL UNIQUE,
    PasswordHash NVARCHAR(255) NOT NULL,
    Role        NVARCHAR(20) NOT NULL CHECK (Role IN ('tourist', 'guide')),
    Phone       NVARCHAR(30) NULL,
    AvatarUrl   NVARCHAR(500) NULL,
    Bio         NVARCHAR(MAX) NULL,
    IsActive    BIT NOT NULL DEFAULT 1,
    CreatedAt   DATETIME2 DEFAULT SYSUTCDATETIME(),
    UpdatedAt   DATETIME2 DEFAULT SYSUTCDATETIME()
);

-- Index on Email for fast login lookups
CREATE INDEX IX_Users_Email ON Users(Email);

-- Index on Role for filtering by account type
CREATE INDEX IX_Users_Role ON Users(Role);
