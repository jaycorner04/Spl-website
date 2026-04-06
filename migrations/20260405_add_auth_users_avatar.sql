IF COL_LENGTH(N'dbo.auth_users', N'avatar') IS NULL
BEGIN
  ALTER TABLE dbo.auth_users
  ADD avatar NVARCHAR(500) NULL;
END;
