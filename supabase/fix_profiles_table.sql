-- 修复profiles表的外键约束问题
-- 由于Supabase认证服务有问题，我们需要修改表结构以支持独立用户创建

-- 方法1: 移除外键约束（推荐）
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 方法2: 或者创建一个新的独立用户表（如果需要保留原有结构）
-- CREATE TABLE IF NOT EXISTS app_users (
--     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--     email VARCHAR(255) UNIQUE,
--     phone_number VARCHAR(20) UNIQUE,
--     username VARCHAR(50) UNIQUE NOT NULL,
--     avatar_url TEXT,
--     bio TEXT,
--     password_hash TEXT NOT NULL,
--     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- );

-- 启用行级安全策略
-- ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "用户可管理自己的资料" ON app_users FOR ALL USING (auth.uid() = id);

-- 检查修改结果
SELECT 
    table_name, 
    constraint_name, 
    constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'profiles';