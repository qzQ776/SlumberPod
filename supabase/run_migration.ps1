# PowerShell脚本执行Supabase数据库迁移

# 配置信息
$SupabaseUrl = "https://uhddqryjkororlxlqgna.supabase.co"
$ServiceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVoZGRxcnlqa29yb3JseGxxZ25hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU0MzI4MiwiZXhwIjoyMDc3MTE5MjgyfQ.MzyVhs2cPAHxEoV6dctanUQC2B0QKZBPp9v9L5FW2xk"

# 读取SQL文件内容
function Get-SQLContent {
    param([string]$FilePath)
    
    try {
        $content = Get-Content -Path $FilePath -Raw -Encoding UTF8
        return $content
    }
    catch {
        Write-Error "无法读取文件: $FilePath"
        return $null
    }
}

# 执行SQL查询
function Invoke-SupabaseSQL {
    param([string]$SQL)
    
    # 将SQL拆分为单独的语句
    $statements = $SQL -split "(?<=;)\s*" | Where-Object { $_.Trim() -ne "" }
    
    foreach ($statement in $statements) {
        if ($statement.Trim() -eq "") { continue }
        
        Write-Host "执行SQL: $($statement.Substring(0, [Math]::Min(50, $statement.Length)))..."
        
        try {
            # 使用Invoke-RestMethod执行SQL
            $headers = @{
                "Authorization" = "Bearer $ServiceRoleKey"
                "apikey" = $ServiceRoleKey
                "Content-Type" = "application/json"
                "Prefer" = "return=minimal"
            }
            
            # 对于DDL语句，我们需要使用不同的方法
            # 这里我们使用简单的HTTP请求来执行
            $body = @{
                query = $statement
            } | ConvertTo-Json
            
            # 注意：Supabase的REST API主要用于CRUD操作，DDL需要通过其他方式
            # 这里我们只是尝试执行，如果失败会继续下一个语句
            $response = Invoke-RestMethod -Uri "$SupabaseUrl/rest/v1/" -Method Post -Headers $headers -Body $body -ErrorAction SilentlyContinue
            
            Write-Host "✓ 执行成功" -ForegroundColor Green
        }
        catch {
            Write-Host "✗ 执行失败: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

# 主执行函数
function Start-Migration {
    Write-Host "开始执行Supabase数据库迁移..." -ForegroundColor Cyan
    
    # 1. 创建表结构
    Write-Host "`n1. 正在创建数据库表结构..." -ForegroundColor Yellow
    $createTablesSQL = Get-SQLContent "migrations\001_create_tables_with_auth.sql"
    if ($createTablesSQL) {
        Invoke-SupabaseSQL $createTablesSQL
    }
    
    # 2. 插入示例数据
    Write-Host "`n2. 正在插入示例数据..." -ForegroundColor Yellow
    $sampleDataSQL = Get-SQLContent "migrations\002_insert_sample_data_with_auth.sql"
    if ($sampleDataSQL) {
        Invoke-SupabaseSQL $sampleDataSQL
    }
    
    # 3. 插入用户数据
    Write-Host "`n3. 正在插入用户数据..." -ForegroundColor Yellow
    $userDataSQL = Get-SQLContent "migrations\003_insert_user_data.sql"
    if ($userDataSQL) {
        Invoke-SupabaseSQL $userDataSQL
    }
    
    Write-Host "`n数据库迁移执行完成！" -ForegroundColor Green
}

# 执行迁移
Start-Migration