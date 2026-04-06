IF OBJECT_ID(N'dbo.bootstrap_migrations', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.bootstrap_migrations (
    migration_name NVARCHAR(255) NOT NULL PRIMARY KEY,
    applied_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END;
GO

IF OBJECT_ID(N'dbo.bootstrap_state', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.bootstrap_state (
    state_key NVARCHAR(120) NOT NULL PRIMARY KEY,
    state_value NVARCHAR(255) NOT NULL,
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END;
GO
