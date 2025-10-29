-- 创建SlumberPod枕眠APP数据库表结构（使用Supabase内置认证）
-- 项目ID: uhddqryjkororlxlqgna

-- 1. 用户资料表（扩展Supabase auth.users表）
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    wechat_id VARCHAR(100) UNIQUE, -- 微信号
    phone_number VARCHAR(20) UNIQUE, -- 手机号
    username VARCHAR(50) UNIQUE NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 音频分类表
CREATE TABLE IF NOT EXISTS audio_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,
    description TEXT,
    icon_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 音频表
CREATE TABLE IF NOT EXISTS audios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(100) NOT NULL,
    description TEXT,
    audio_url TEXT NOT NULL,
    duration INTEGER NOT NULL, -- 音频时长（秒）
    category_id UUID REFERENCES audio_categories(id),
    author_id UUID REFERENCES profiles(id), -- 引用profiles表
    play_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 用户收藏表
CREATE TABLE IF NOT EXISTS user_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id),
    audio_id UUID REFERENCES audios(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, audio_id)
);

-- 5. 睡眠记录表
CREATE TABLE IF NOT EXISTS sleep_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    duration INTEGER NOT NULL, -- 睡眠时长（分钟）
    quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
    notes TEXT,
    audio_ids UUID[], -- 使用的音频ID数组
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. 社区帖子表
CREATE TABLE IF NOT EXISTS community_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id),
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    image_urls TEXT[],
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. 评论表
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id),
    post_id UUID REFERENCES community_posts(id),
    content TEXT NOT NULL,
    like_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. 闹钟提醒表
CREATE TABLE IF NOT EXISTS alarms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id),
    title VARCHAR(100) NOT NULL,
    alarm_time TIME NOT NULL,
    repeat_days INTEGER[], -- 重复天数（0-6，0=周日）
    audio_ids UUID[], -- 使用的音频ID数组
    is_nap BOOLEAN DEFAULT FALSE, -- 是否是小憩闹钟
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. AI解梦记录表
CREATE TABLE IF NOT EXISTS dream_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id),
    dream_content TEXT NOT NULL,
    analysis_result TEXT NOT NULL,
    mood_rating INTEGER CHECK (mood_rating >= 1 AND mood_rating <= 5),
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. 用户创作表
CREATE TABLE IF NOT EXISTS user_creations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id),
    title VARCHAR(100) NOT NULL,
    description TEXT,
    audio_url TEXT NOT NULL,
    is_public BOOLEAN DEFAULT TRUE,
    like_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. 播放历史表
CREATE TABLE IF NOT EXISTS play_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id),
    audio_id UUID REFERENCES audios(id),
    play_duration INTEGER NOT NULL, -- 播放时长（秒）
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. 反馈记录表
CREATE TABLE IF NOT EXISTS feedback_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id),
    sleep_record_id UUID REFERENCES sleep_records(id),
    feedback_content TEXT NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    is_resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_audios_category_id ON audios(category_id);
CREATE INDEX IF NOT EXISTS idx_audios_author_id ON audios(author_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_sleep_records_user_id ON sleep_records(user_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_user_id ON community_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_alarms_user_id ON alarms(user_id);
CREATE INDEX IF NOT EXISTS idx_dream_analysis_user_id ON dream_analysis(user_id);
CREATE INDEX IF NOT EXISTS idx_user_creations_user_id ON user_creations(user_id);
CREATE INDEX IF NOT EXISTS idx_play_history_user_id ON play_history(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_records_user_id ON feedback_records(user_id);

-- 启用行级安全策略（RLS）
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audios ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE sleep_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE alarms ENABLE ROW LEVEL SECURITY;
ALTER TABLE dream_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_creations ENABLE ROW LEVEL SECURITY;
ALTER TABLE play_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_records ENABLE ROW LEVEL SECURITY;

-- 创建RLS策略
CREATE POLICY "所有人可查看音频" ON audios FOR SELECT USING (true);
CREATE POLICY "所有人可查看音频分类" ON audio_categories FOR SELECT USING (true);
CREATE POLICY "用户可查看所有用户资料" ON profiles FOR SELECT USING (true);
CREATE POLICY "用户可管理自己的资料" ON profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "用户可管理自己的收藏" ON user_favorites FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "用户可管理自己的睡眠记录" ON sleep_records FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "用户可管理自己的闹钟" ON alarms FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "用户可管理自己的解梦记录" ON dream_analysis FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "用户可管理自己的创作" ON user_creations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "用户可管理自己的播放历史" ON play_history FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "用户可管理自己的反馈" ON feedback_records FOR ALL USING (auth.uid() = user_id);

-- 社区相关的RLS策略
CREATE POLICY "所有人可查看社区帖子" ON community_posts FOR SELECT USING (true);
CREATE POLICY "用户可创建帖子" ON community_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "用户可更新自己的帖子" ON community_posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "用户可删除自己的帖子" ON community_posts FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "所有人可查看评论" ON comments FOR SELECT USING (true);
CREATE POLICY "用户可创建评论" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "用户可更新自己的评论" ON comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "用户可删除自己的评论" ON comments FOR DELETE USING (auth.uid() = user_id);