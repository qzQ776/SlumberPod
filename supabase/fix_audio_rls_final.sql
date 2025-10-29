-- 修复audios表的行级安全策略问题
-- 为audios表添加插入策略

-- 1. 首先检查当前的RLS策略
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'audios';

-- 2. 如果audios表没有插入策略，则添加一个
-- 方法1：允许任何人插入音频记录（简化版本）
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'audios' AND policyname = '允许插入音频记录'
    ) THEN
        CREATE POLICY "允许插入音频记录" ON audios FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- 方法2：或者使用服务端角色插入（更安全）
-- DO $$ 
-- BEGIN 
--     IF NOT EXISTS (
--         SELECT 1 FROM pg_policies 
--         WHERE tablename = 'audios' AND policyname = '服务端可插入音频'
--     ) THEN
--         CREATE POLICY "服务端可插入音频" ON audios FOR INSERT WITH CHECK (auth.role() = 'service_role');
--     END IF;
-- END $$;

-- 3. 验证策略是否已创建
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'audios';

-- 4. 如果以上方法都不行，可以临时禁用RLS（不推荐用于生产）
-- ALTER TABLE audios DISABLE ROW LEVEL SECURITY;