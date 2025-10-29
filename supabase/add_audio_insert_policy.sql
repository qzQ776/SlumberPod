-- 为audios表添加插入策略
-- 由于我们移除了外键约束，需要允许服务端插入音频记录

-- 允许任何人插入音频记录（简化版本，实际项目中应该更严格）
CREATE POLICY "允许插入音频记录" ON audios FOR INSERT WITH CHECK (true);

-- 或者更严格的策略：只允许特定角色插入
-- CREATE POLICY "服务端可插入音频" ON audios FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- 检查策略是否已创建
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'audios';