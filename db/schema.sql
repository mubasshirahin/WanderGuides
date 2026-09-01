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
    BookingType   NVARCHAR(20) NOT NULL DEFAULT 'direct' CHECK (BookingType IN ('direct','bid_accepted')),
    TotalAmount   DECIMAL(10,2) NOT NULL,
    FinalPrice    DECIMAL(10,2) NULL,
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
-- Groups a guide user (Users.Id) to its listing with hourly/daily rates.
-- =============================================

CREATE TABLE Guides (
    Id          INT IDENTITY PRIMARY KEY,
    UserID      INT NULL UNIQUE,
    FullName    NVARCHAR(100) NOT NULL,
    Email       NVARCHAR(150) NOT NULL UNIQUE,
    Phone       NVARCHAR(30) NULL,
    City        NVARCHAR(100) NULL,
    Bio         NVARCHAR(MAX) NULL,
    Specialties NVARCHAR(255) NULL,
    Languages   NVARCHAR(255) NULL,
    RatePerDay  DECIMAL(10,2) NOT NULL DEFAULT 0,
    HourlyRate  DECIMAL(10,2) NULL,
    DailyRate   DECIMAL(10,2) NULL,
    Rating      DECIMAL(3,2) NOT NULL DEFAULT 0,
    TotalReviews INT NOT NULL DEFAULT 0,
    IsActive    BIT NOT NULL DEFAULT 1,
    CreatedAt   DATETIME2 DEFAULT SYSUTCDATETIME(),
    UpdatedAt   DATETIME2 DEFAULT SYSUTCDATETIME(),

    CONSTRAINT FK_Guides_User FOREIGN KEY (UserID) REFERENCES Users(Id)
);

-- Index on Email for fast lookups
CREATE INDEX IX_Guides_Email ON Guides(Email);

-- Index on City for directory filtering
CREATE INDEX IX_Guides_City ON Guides(City);

-- Index on UserID for lookups by guide account
CREATE INDEX IX_Guides_UserID ON Guides(UserID);

-- =============================================
-- CustomTourRequests Table Schema
-- Tourists post custom tour requests for guides to bid on
-- =============================================

CREATE TABLE CustomTourRequests (
    RequestID   INT IDENTITY PRIMARY KEY,
    TouristID   INT NOT NULL,
    Title       NVARCHAR(150) NOT NULL,
    Destination NVARCHAR(100) NOT NULL,
    StartDate   DATE NOT NULL,
    EndDate     DATE NOT NULL,
    GroupSize   INT NOT NULL DEFAULT 1,
    Budget      DECIMAL(10,2) NOT NULL,
    Description NVARCHAR(MAX) NULL,
    Status      NVARCHAR(20) NOT NULL DEFAULT 'open' CHECK (Status IN ('open','fulfilled','cancelled')),
    CreatedAt   DATETIME2 DEFAULT SYSUTCDATETIME(),

    CONSTRAINT FK_CustomTourRequests_Tourist FOREIGN KEY (TouristID) REFERENCES Users(Id),
    CONSTRAINT CHK_CustomTourRequests_Dates CHECK (EndDate >= StartDate),
    CONSTRAINT CHK_CustomTourRequests_Budget CHECK (Budget >= 0)
);

CREATE INDEX IX_CustomTourRequests_Tourist ON CustomTourRequests(TouristID);
CREATE INDEX IX_CustomTourRequests_Status ON CustomTourRequests(Status);
CREATE INDEX IX_CustomTourRequests_Destination ON CustomTourRequests(Destination);

-- =============================================
-- TourBids Table Schema
-- Guides place bids/offers on custom tour requests
-- =============================================

CREATE TABLE TourBids (
    BidID           INT IDENTITY PRIMARY KEY,
    RequestID       INT NOT NULL,
    GuideID         INT NOT NULL,
    OfferedPrice    DECIMAL(10,2) NOT NULL,
    ProposalMessage NVARCHAR(MAX) NULL,
    Status          NVARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (Status IN ('pending','accepted','rejected')),
    CreatedAt       DATETIME2 DEFAULT SYSUTCDATETIME(),

    CONSTRAINT FK_TourBids_Request FOREIGN KEY (RequestID) REFERENCES CustomTourRequests(RequestID),
    CONSTRAINT FK_TourBids_Guide FOREIGN KEY (GuideID) REFERENCES Users(Id),
    CONSTRAINT CHK_TourBids_Price CHECK (OfferedPrice >= 0)
);

CREATE INDEX IX_TourBids_Request ON TourBids(RequestID);
CREATE INDEX IX_TourBids_Guide ON TourBids(GuideID);
CREATE INDEX IX_TourBids_Status ON TourBids(Status);



-- =============================================
-- Conversations Table Schema
-- Stores active chat sessions between a Tourist and a Guide
-- =============================================

CREATE TABLE Conversations (
    ConversationID INT IDENTITY PRIMARY KEY,
    TouristID      INT NOT NULL,
    GuideID        INT NOT NULL,
    LastMessage    NVARCHAR(MAX) NULL,
    LastMessageAt  DATETIME2 DEFAULT SYSUTCDATETIME(),

    CONSTRAINT FK_Conversations_Tourist FOREIGN KEY (TouristID) REFERENCES Users(Id),
    CONSTRAINT FK_Conversations_Guide   FOREIGN KEY (GuideID)   REFERENCES Users(Id),
    CONSTRAINT UQ_Conversations_Pair UNIQUE (TouristID, GuideID)
);

CREATE INDEX IX_Conversations_Tourist ON Conversations(TouristID);
CREATE INDEX IX_Conversations_Guide   ON Conversations(GuideID);
CREATE INDEX IX_Conversations_LastMessageAt ON Conversations(LastMessageAt);

-- =============================================
-- Messages Table Schema
-- Stores individual chat messages within conversations
-- =============================================

CREATE TABLE Messages (
    MessageID     INT IDENTITY PRIMARY KEY,
    ConversationID INT NOT NULL,
    SenderID      INT NOT NULL,
    ReceiverID    INT NOT NULL,
    MessageText   NVARCHAR(MAX) NOT NULL,
    IsRead        BIT NOT NULL DEFAULT 0,
    CreatedAt     DATETIME2 DEFAULT SYSUTCDATETIME(),

    CONSTRAINT FK_Messages_Conversation FOREIGN KEY (ConversationID) REFERENCES Conversations(ConversationID),
    CONSTRAINT FK_Messages_Sender       FOREIGN KEY (SenderID)      REFERENCES Users(Id),
    CONSTRAINT FK_Messages_Receiver     FOREIGN KEY (ReceiverID)    REFERENCES Users(Id)
);

CREATE INDEX IX_Messages_Conversation ON Messages(ConversationID);
CREATE INDEX IX_Messages_Sender       ON Messages(SenderID);
CREATE INDEX IX_Messages_Receiver     ON Messages(ReceiverID);
CREATE INDEX IX_Messages_CreatedAt    ON Messages(CreatedAt);

-- =============================================
-- TouristProfiles Table Schema
-- Extended profile data for tourist accounts
-- =============================================

CREATE TABLE TouristProfiles (
    ProfileID           INT IDENTITY PRIMARY KEY,
    UserID              INT NOT NULL UNIQUE,
    Bio                 NVARCHAR(MAX) NULL,
    City                NVARCHAR(100) NULL,
    Country             NVARCHAR(100) NULL,
    Languages           NVARCHAR(255) NULL,
    TravelInterests     NVARCHAR(MAX) NULL,
    EmergencyContactName  NVARCHAR(100) NULL,
    EmergencyContactPhone NVARCHAR(50) NULL,
    IsNIDVerified       BIT NOT NULL DEFAULT 0,
    CreatedAt           DATETIME2 DEFAULT SYSUTCDATETIME(),
    UpdatedAt           DATETIME2 DEFAULT SYSUTCDATETIME(),

    CONSTRAINT FK_TouristProfiles_User FOREIGN KEY (UserID) REFERENCES Users(Id)
);

CREATE INDEX IX_TouristProfiles_User ON TouristProfiles(UserID);

-- =============================================
-- GuideReviewsOfTourists Table Schema
-- Guides review tourists after completed bookings
-- =============================================

CREATE TABLE GuideReviewsOfTourists (
    ReviewID    INT IDENTITY PRIMARY KEY,
    GuideID     INT NOT NULL,
    TouristID   INT NOT NULL,
    BookingID   INT NOT NULL,
    Rating      INT NOT NULL CHECK (Rating >= 1 AND Rating <= 5),
    Comment     NVARCHAR(MAX) NULL,
    CreatedAt   DATETIME2 DEFAULT SYSUTCDATETIME(),

    CONSTRAINT FK_GRoT_Guide   FOREIGN KEY (GuideID)   REFERENCES Users(Id),
    CONSTRAINT FK_GRoT_Tourist FOREIGN KEY (TouristID)  REFERENCES Users(Id),
    CONSTRAINT FK_GRoT_Booking FOREIGN KEY (BookingID)  REFERENCES Bookings(Id),
    CONSTRAINT UQ_GRoT_Booking UNIQUE (BookingID)
);

CREATE INDEX IX_GRoT_Tourist ON GuideReviewsOfTourists(TouristID);
CREATE INDEX IX_GRoT_Guide   ON GuideReviewsOfTourists(GuideID);

-- =============================================
-- Bids Table Schema
-- Tourists place custom price offers on a guide's services.
-- GuideUserID references Users.Id (matches Bookings/Reviews FK convention).
-- =============================================

CREATE TABLE Bids (
    BidID        INT IDENTITY PRIMARY KEY,
    TouristID    INT NOT NULL,
    GuideUserID  INT NOT NULL,
    OfferedPrice DECIMAL(10,2) NOT NULL,
    StartDate    DATE NOT NULL,
    EndDate      DATE NOT NULL,
    Message      NVARCHAR(MAX) NULL,
    Status       NVARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (Status IN ('pending','accepted','rejected','cancelled')),
    BookingId    INT NULL,
    CreatedAt    DATETIME2 DEFAULT SYSUTCDATETIME(),

    CONSTRAINT FK_Bids_Tourist FOREIGN KEY (TouristID)   REFERENCES Users(Id),
    CONSTRAINT FK_Bids_Guide   FOREIGN KEY (GuideUserID) REFERENCES Users(Id),
    CONSTRAINT FK_Bids_Booking FOREIGN KEY (BookingId)   REFERENCES Bookings(Id),
    CONSTRAINT CHK_Bids_Dates  CHECK (EndDate >= StartDate),
    CONSTRAINT CHK_Bids_Price  CHECK (OfferedPrice >= 0)
);

CREATE INDEX IX_Bids_Tourist ON Bids(TouristID);
CREATE INDEX IX_Bids_Guide   ON Bids(GuideUserID);
CREATE INDEX IX_Bids_Status  ON Bids(Status);


