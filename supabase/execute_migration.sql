-- 使用service_role密钥执行数据库迁移
-- 项目ID: uhddqryjkororlxlqgna
-- Service Role: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVoZGRxcnlqa29yb3JseGxxZ25hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU0MzI4MiwiZXhwIjoyMDc3MTE5MjgyfQ.MzyVhs2cPAHxEoV6dctanUQC2B0QKZBPp9v9L5FW2xk

-- 首先检查当前数据库状态
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;