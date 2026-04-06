IF OBJECT_ID(N'dbo.teams', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.teams (
    id INT NOT NULL PRIMARY KEY,
    team_name NVARCHAR(255) NOT NULL,
    city NVARCHAR(255) NULL,
    owner NVARCHAR(255) NULL,
    coach NVARCHAR(255) NULL,
    vice_coach NVARCHAR(255) NULL,
    primary_color NVARCHAR(100) NULL,
    logo NVARCHAR(500) NULL,
    venue NVARCHAR(255) NULL,
    franchise_id INT NULL,
    status NVARCHAR(50) NULL,
    budget_left INT NULL
  );
END;
GO

IF OBJECT_ID(N'dbo.players', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.players (
    id INT NOT NULL PRIMARY KEY,
    full_name NVARCHAR(255) NOT NULL,
    role NVARCHAR(100) NULL,
    squad_role NVARCHAR(50) NULL,
    team_id INT NULL,
    team_name NVARCHAR(255) NULL,
    batting_style NVARCHAR(100) NULL,
    bowling_style NVARCHAR(100) NULL,
    photo NVARCHAR(500) NULL,
    created_at NVARCHAR(64) NULL,
    date_of_birth NVARCHAR(32) NULL,
    mobile NVARCHAR(50) NULL,
    email NVARCHAR(255) NULL,
    status NVARCHAR(50) NULL,
    salary INT NULL
  );
END;
GO

IF OBJECT_ID(N'dbo.performances', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.performances (
    id INT NOT NULL PRIMARY KEY,
    player_id INT NOT NULL,
    player_name NVARCHAR(255) NULL,
    team_id INT NULL,
    team_name NVARCHAR(255) NULL,
    matches INT NULL,
    runs INT NULL,
    wickets INT NULL,
    batting_average FLOAT NULL,
    strike_rate FLOAT NULL,
    economy FLOAT NULL,
    fours INT NULL,
    sixes INT NULL,
    best_bowling NVARCHAR(50) NULL,
    dot_ball_percentage FLOAT NULL,
    catches INT NULL,
    stumpings INT NULL,
    updated_at NVARCHAR(64) NULL
  );
END;
GO

IF OBJECT_ID(N'dbo.matches', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.matches (
    id INT NOT NULL PRIMARY KEY,
    team_a_id INT NULL,
    team_b_id INT NULL,
    teamA NVARCHAR(255) NOT NULL,
    teamB NVARCHAR(255) NOT NULL,
    [date] NVARCHAR(64) NOT NULL,
    [time] NVARCHAR(64) NOT NULL,
    venue NVARCHAR(255) NOT NULL,
    status NVARCHAR(50) NOT NULL,
    teamAScore NVARCHAR(50) NULL,
    teamBScore NVARCHAR(50) NULL,
    result NVARCHAR(500) NULL,
    umpire NVARCHAR(255) NULL
  );
END;
GO

IF OBJECT_ID(N'dbo.venues', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.venues (
    id INT NOT NULL PRIMARY KEY,
    ground_name NVARCHAR(255) NOT NULL,
    location NVARCHAR(255) NOT NULL,
    city NVARCHAR(255) NOT NULL,
    capacity INT NULL,
    contact_person NVARCHAR(255) NULL,
    contact_phone NVARCHAR(50) NULL
  );
END;
GO

IF OBJECT_ID(N'dbo.franchises', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.franchises (
    id INT NOT NULL PRIMARY KEY,
    company_name NVARCHAR(255) NOT NULL,
    owner_name NVARCHAR(255) NULL,
    address NVARCHAR(500) NULL,
    website NVARCHAR(500) NULL,
    logo NVARCHAR(500) NULL,
    status NVARCHAR(50) NULL
  );
END;
GO

IF OBJECT_ID(N'dbo.approvals', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.approvals (
    id INT NOT NULL PRIMARY KEY,
    request_type NVARCHAR(255) NOT NULL,
    requested_by NVARCHAR(255) NOT NULL,
    subject NVARCHAR(500) NOT NULL,
    [date] NVARCHAR(64) NOT NULL,
    priority NVARCHAR(50) NOT NULL,
    status NVARCHAR(50) NOT NULL,
    notes NVARCHAR(1000) NULL
  );
END;
GO

IF OBJECT_ID(N'dbo.invoices', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.invoices (
    id INT NOT NULL PRIMARY KEY,
    invoice_code NVARCHAR(100) NOT NULL,
    party NVARCHAR(255) NOT NULL,
    category NVARCHAR(100) NOT NULL,
    amount INT NOT NULL,
    due_date NVARCHAR(64) NOT NULL,
    status NVARCHAR(50) NOT NULL,
    flow NVARCHAR(50) NOT NULL,
    issued_date NVARCHAR(64) NULL,
    notes NVARCHAR(1000) NULL
  );
END;
GO

IF OBJECT_ID(N'dbo.auctions', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.auctions (
    id INT NOT NULL PRIMARY KEY,
    player_name NVARCHAR(255) NOT NULL,
    player_role NVARCHAR(100) NULL,
    team_id INT NULL,
    team_name NVARCHAR(255) NULL,
    base_price INT NOT NULL,
    sold_price INT NULL,
    status NVARCHAR(50) NOT NULL,
    bid_round INT NULL,
    paddle_number NVARCHAR(50) NULL,
    notes NVARCHAR(1000) NULL
  );
END;
GO

IF OBJECT_ID(N'dbo.project_content', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.project_content (
    resource_name NVARCHAR(100) NOT NULL PRIMARY KEY,
    content_json NVARCHAR(MAX) NOT NULL,
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END;
GO

IF OBJECT_ID(N'dbo.auth_users', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.auth_users (
    id INT NOT NULL PRIMARY KEY,
    full_name NVARCHAR(255) NOT NULL,
    email NVARCHAR(255) NOT NULL UNIQUE,
    employee_id NVARCHAR(100) NOT NULL UNIQUE,
    franchise_id INT NULL,
    role NVARCHAR(50) NOT NULL,
    status NVARCHAR(50) NOT NULL,
    salt NVARCHAR(64) NOT NULL,
    iterations INT NOT NULL,
    key_length INT NOT NULL,
    digest NVARCHAR(50) NOT NULL,
    password_hash NVARCHAR(255) NOT NULL,
    created_at NVARCHAR(64) NOT NULL,
    updated_at NVARCHAR(64) NULL
  );
END;
GO

IF OBJECT_ID(N'dbo.password_reset_tokens', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.password_reset_tokens (
    id INT NOT NULL PRIMARY KEY,
    user_id INT NOT NULL,
    token_hash NVARCHAR(255) NOT NULL,
    expires_at NVARCHAR(64) NOT NULL,
    created_at NVARCHAR(64) NOT NULL,
    used_at NVARCHAR(64) NULL
  );
END;
GO
