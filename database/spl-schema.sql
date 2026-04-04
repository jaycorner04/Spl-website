IF DB_ID(N'SPLSqlServer') IS NULL
BEGIN
  CREATE DATABASE [SPLSqlServer];
END;
GO

USE [SPLSqlServer];
GO

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
    logo NVARCHAR(500) NULL
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
