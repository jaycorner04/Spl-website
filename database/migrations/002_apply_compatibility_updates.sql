IF COL_LENGTH(N'dbo.auth_users', N'franchise_id') IS NULL
BEGIN
  ALTER TABLE dbo.auth_users
  ADD franchise_id INT NULL;
END;
GO

IF COL_LENGTH(N'dbo.franchises', N'status') IS NULL
BEGIN
  ALTER TABLE dbo.franchises
  ADD status NVARCHAR(50) NULL;
END;
GO

IF COL_LENGTH(N'dbo.players', N'squad_role') IS NULL
BEGIN
  ALTER TABLE dbo.players
  ADD squad_role NVARCHAR(50) NULL;
END;
GO

;WITH ranked_players AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY COALESCE(team_id, -id)
      ORDER BY id ASC
    ) AS row_num
  FROM dbo.players
)
UPDATE players
SET squad_role = CASE
  WHEN ranked_players.row_num <= 11 THEN N'Playing XI'
  ELSE N'Reserve'
END
FROM dbo.players AS players
INNER JOIN ranked_players ON ranked_players.id = players.id
WHERE players.squad_role IS NULL OR LTRIM(RTRIM(players.squad_role)) = N'';
GO
