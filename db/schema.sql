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

-- =============================================
-- Bookings Table Schema
-- Connects a tourist (User) to a guide (User)
-- =============================================

CREATE TABLE Bookings (
    Id            INT IDENTITY PRIMARY KEY,
    TouristUserId INT NOT NULL,
    GuideId       INT NOT NULL,
    StartDate     DATE NOT NULL,
    EndDate       DATE NOT NULL,
    Status        NVARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (Status IN ('pending','confirmed','completed','cancelled')),
    TotalAmount   DECIMAL(10,2) NOT NULL,
    Notes         NVARCHAR(500) NULL,
    CreatedAt     DATETIME2 DEFAULT SYSUTCDATETIME(),

    CONSTRAINT FK_Bookings_Tourist FOREIGN KEY (TouristUserId) REFERENCES Users(Id),
    CONSTRAINT FK_Bookings_Guide FOREIGN KEY (GuideId) REFERENCES Users(Id),
    CONSTRAINT CHK_Bookings_Dates CHECK (EndDate >= StartDate)
);

-- Indexes for common lookups
CREATE INDEX IX_Bookings_Tourist ON Bookings(TouristUserId);
CREATE INDEX IX_Bookings_Guide ON Bookings(GuideId);
CREATE INDEX IX_Bookings_Status ON Bookings(Status);

-- =============================================
-- Reviews Table Schema
-- One review per booking enforced by UNIQUE constraint on BookingId
-- =============================================

CREATE TABLE Reviews (
    Id           INT IDENTITY PRIMARY KEY,
    BookingId    INT NOT NULL,
    TouristUserId INT NOT NULL,
    GuideId      INT NOT NULL,
    Rating       TINYINT NOT NULL CHECK (Rating >= 1 AND Rating <= 5),
    Comment      NVARCHAR(MAX) NULL,
    CreatedAt    DATETIME2 DEFAULT SYSUTCDATETIME(),

    CONSTRAINT FK_Reviews_Booking FOREIGN KEY (BookingId) REFERENCES Bookings(Id),
    CONSTRAINT FK_Reviews_Tourist FOREIGN KEY (TouristUserId) REFERENCES Users(Id),
    CONSTRAINT FK_Reviews_Guide FOREIGN KEY (GuideId) REFERENCES Users(Id),
    CONSTRAINT UQ_Reviews_Booking UNIQUE (BookingId)
);

CREATE INDEX IX_Reviews_Guide ON Reviews(GuideId);
CREATE INDEX IX_Reviews_Tourist ON Reviews(TouristUserId);

-- =============================================
-- Guides Table Schema
-- Standalone guide profiles for the Guide Directory
-- =============================================

CREATE TABLE Guides (
    Id          INT IDENTITY PRIMARY KEY,
    FullName    NVARCHAR(100) NOT NULL,
    Email       NVARCHAR(150) NOT NULL UNIQUE,
    Phone       NVARCHAR(30) NULL,
    City        NVARCHAR(100) NULL,
    Bio         NVARCHAR(MAX) NULL,
    Specialties NVARCHAR(255) NULL,
    Languages   NVARCHAR(255) NULL,
    RatePerDay  DECIMAL(10,2) NOT NULL DEFAULT 0,
    Rating      DECIMAL(3,2) NOT NULL DEFAULT 0,
    IsActive    BIT NOT NULL DEFAULT 1,
    CreatedAt   DATETIME2 DEFAULT SYSUTCDATETIME(),
    UpdatedAt   DATETIME2 DEFAULT SYSUTCDATETIME()
);

-- Index on Email for fast lookups
CREATE INDEX IX_Guides_Email ON Guides(Email);

-- Index on City for directory filtering
CREATE INDEX IX_Guides_City ON Guides(City);


