IF OBJECT_ID(N'dbo.audit_logs', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.audit_logs (
    id INT NOT NULL PRIMARY KEY,
    actor_user_id INT NULL,
    actor_email NVARCHAR(255) NOT NULL,
    actor_role NVARCHAR(50) NOT NULL,
    action NVARCHAR(100) NOT NULL,
    resource_name NVARCHAR(100) NOT NULL,
    resource_id INT NULL,
    method NVARCHAR(10) NOT NULL,
    status NVARCHAR(50) NOT NULL,
    detail NVARCHAR(MAX) NULL,
    ip_address NVARCHAR(100) NULL,
    created_at NVARCHAR(64) NOT NULL
  );
END;
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'IX_teams_franchise_id'
    AND object_id = OBJECT_ID(N'dbo.teams')
)
BEGIN
  CREATE INDEX IX_teams_franchise_id ON dbo.teams(franchise_id);
END;
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'IX_players_team_id'
    AND object_id = OBJECT_ID(N'dbo.players')
)
BEGIN
  CREATE INDEX IX_players_team_id ON dbo.players(team_id);
END;
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'IX_approvals_status'
    AND object_id = OBJECT_ID(N'dbo.approvals')
)
BEGIN
  CREATE INDEX IX_approvals_status ON dbo.approvals(status);
END;
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'IX_invoices_status'
    AND object_id = OBJECT_ID(N'dbo.invoices')
)
BEGIN
  CREATE INDEX IX_invoices_status ON dbo.invoices(status);
END;
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'IX_audit_logs_created_at'
    AND object_id = OBJECT_ID(N'dbo.audit_logs')
)
BEGIN
  CREATE INDEX IX_audit_logs_created_at ON dbo.audit_logs(created_at DESC);
END;
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'IX_audit_logs_resource_name_resource_id'
    AND object_id = OBJECT_ID(N'dbo.audit_logs')
)
BEGIN
  CREATE INDEX IX_audit_logs_resource_name_resource_id
    ON dbo.audit_logs(resource_name, resource_id);
END;
GO
