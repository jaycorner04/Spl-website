param(
  [Parameter(Mandatory = $true)]
  [string]$PayloadPath
)

function Convert-DbValue {
  param([object]$Value)

  if ($null -eq $Value -or $Value -is [System.DBNull]) {
    return $null
  }

  if ($Value -is [datetime]) {
    return $Value.ToUniversalTime().ToString("o")
  }

  if ($Value -is [decimal] -or $Value -is [double] -or $Value -is [single]) {
    return [double]$Value
  }

  if (
    $Value -is [byte] -or
    $Value -is [int16] -or
    $Value -is [int32] -or
    $Value -is [int64] -or
    $Value -is [uint16] -or
    $Value -is [uint32] -or
    $Value -is [uint64]
  ) {
    return [int64]$Value
  }

  if ($Value -is [bool]) {
    return [bool]$Value
  }

  if ($Value -is [byte[]]) {
    return [System.Convert]::ToBase64String($Value)
  }

  return $Value
}

$ErrorActionPreference = "Stop"
$payload = Get-Content -LiteralPath $PayloadPath -Raw | ConvertFrom-Json
$connection = New-Object System.Data.SqlClient.SqlConnection $payload.connectionString

try {
  $connection.Open()
  $command = $connection.CreateCommand()
  $command.CommandText = [string]$payload.query
  $command.CommandTimeout = if ($null -ne $payload.commandTimeoutSeconds) { [int]$payload.commandTimeoutSeconds } else { 120 }

  foreach ($parameter in @($payload.parameters)) {
    $sqlParameter = $command.Parameters.AddWithValue(
      [string]$parameter.name,
      $(if ($null -eq $parameter.value) { [System.DBNull]::Value } else { $parameter.value })
    )
    if ($null -eq $parameter.value) {
      $sqlParameter.Value = [System.DBNull]::Value
    }
  }

  if ([bool]$payload.expectRows) {
    $adapter = New-Object System.Data.SqlClient.SqlDataAdapter $command
    $table = New-Object System.Data.DataTable
    [void]$adapter.Fill($table)

    $columns = @()
    foreach ($column in $table.Columns) {
      $columns += [string]$column.ColumnName
    }

    $rows = @()
    foreach ($row in $table.Rows) {
      $rowValues = @()
      foreach ($column in $table.Columns) {
        $rowValues += ,(Convert-DbValue $row[$column.ColumnName])
      }
      $rows += ,@($rowValues)
    }

    @{
      columns = $columns
      rows = $rows
      rowcount = $table.Rows.Count
    } | ConvertTo-Json -Depth 20 -Compress
  } else {
    $rowCount = $command.ExecuteNonQuery()
    @{
      rowcount = $rowCount
    } | ConvertTo-Json -Depth 5 -Compress
  }
} finally {
  if ($connection.State -ne [System.Data.ConnectionState]::Closed) {
    $connection.Close()
  }
}
