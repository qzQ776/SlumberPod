-- 修复audios表的行级安全策略问题
-- 为audios表添加插入策略

-- 方法1：允许任何人插入音频记录（简化版本）
DROP POLICY IF EXISTS "允许插入音频记录" ON audios;
CREATE POLICY "允许插入音频记录" ON audios FOR INSERT WITH CHECK (true);

-- 方法2：或者临时禁用RLS（不推荐用于生产）
-- ALTER TABLE audios DISABLE ROW LEVEL SECURITY;

-- 检查当前策略
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'audios';