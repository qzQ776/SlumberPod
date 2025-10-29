-- 插入特定用户数据到SlumberPod枕眠APP数据库
-- 用户信息：手机号15933787572，微信号TCZW314，昵称程橙

-- 注意：由于使用了Supabase内置认证系统，我们需要先创建auth.users记录
-- 在实际应用中，用户应该通过微信登录流程自动创建
-- 这里我们使用一个技巧来插入示例用户数据

-- 1. 首先检查是否已经有对应的auth.users记录
-- 如果没有，我们需要创建一个示例的认证用户
-- 在实际微信登录中，这个步骤由Supabase认证系统自动完成

-- 使用Supabase的auth.admin API来创建用户（需要管理员权限）
-- 注意：这只是一个示例，实际部署时应该通过微信登录流程创建用户

-- 2. 插入用户资料到profiles表
-- 这里我们使用一个有效的UUID，并确保auth.users中有对应的记录

-- 首先检查是否已经有对应的auth.users记录，如果没有则创建
-- 注意：在实际生产环境中，用户应该通过认证流程创建

-- 使用一个有效的UUID来创建用户记录
DO $$
DECLARE
    user_id UUID := '11111111-1111-1111-1111-111111111111';
BEGIN
    -- 检查auth.users表中是否已存在该用户ID
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = user_id) THEN
        -- 如果不存在，则插入一个示例用户记录
        -- 注意：这需要管理员权限，实际部署时应通过认证流程创建
        INSERT INTO auth.users (
            id,
            instance_id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            invited_at,
            confirmation_token,
            confirmation_sent_at,
            recovery_token,
            recovery_sent_at,
            email_change_token_new,
            email_change,
            email_change_sent_at,
            last_sign_in_at,
            raw_app_meta_data,
            raw_user_meta_data,
            is_super_admin,
            created_at,
            updated_at,
            phone,
            phone_confirmed_at,
            phone_change,
            phone_change_token,
            phone_change_sent_at,
            email_change_token_current,
            email_change_confirm_status,
            banned_until,
            reauthentication_token,
            reauthentication_sent_at,
            is_sso_user,
            deleted_at
        ) VALUES (
            user_id,
            '00000000-0000-0000-0000-000000000000',
            'authenticated',
            'authenticated',
            'chengcheng@example.com',
            '',
            NOW(),
            NOW(),
            '',
            NOW(),
            '',
            NOW(),
            '',
            '',
            NOW(),
            NOW(),
            '{"provider": "wechat", "providers": ["wechat"]}',
            '{"wechat_id": "TCZW314", "phone_number": "15933787572"}',
            false,
            NOW(),
            NOW(),
            '15933787572',
            NOW(),
            '',
            '',
            NOW(),
            '',
            0,
            NULL,
            '',
            NOW(),
            false,
            NULL
        );
    END IF;
END $$;

-- 3. 插入用户资料到profiles表
INSERT INTO profiles (
    id, 
    wechat_id, 
    phone_number, 
    username, 
    avatar_url, 
    bio, 
    created_at, 
    updated_at
) VALUES (
    '11111111-1111-1111-1111-111111111111',
    'TCZW314',
    '15933787572',
    '程橙',
    '/avatars/chengcheng.png',
    '热爱睡眠和放松音乐的程橙，希望通过白噪音改善睡眠质量',
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    wechat_id = EXCLUDED.wechat_id,
    phone_number = EXCLUDED.phone_number,
    username = EXCLUDED.username,
    avatar_url = EXCLUDED.avatar_url,
    bio = EXCLUDED.bio,
    updated_at = NOW();

-- 3. 为用户插入一些个性化数据

-- 插入用户收藏
INSERT INTO user_favorites (id, user_id, audio_id, created_at) VALUES
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', (SELECT id FROM audios WHERE title = '轻柔细雨'), NOW()),
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', (SELECT id FROM audios WHERE title = '海浪拍岸'), NOW()),
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', (SELECT id FROM audios WHERE title = '森林鸟鸣'), NOW());

-- 插入用户睡眠记录
INSERT INTO sleep_records (id, user_id, start_time, end_time, duration, quality_rating, notes, audio_ids) VALUES
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '2024-10-26 22:30:00+08:00', '2024-10-27 06:30:00+08:00', 480, 4, '使用了轻柔细雨白噪音，入睡很快', ARRAY[(SELECT id FROM audios WHERE title = '轻柔细雨')]),
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '2024-10-25 23:15:00+08:00', '2024-10-26 07:00:00+08:00', 465, 5, '深度睡眠质量很好', ARRAY[(SELECT id FROM audios WHERE title = '海浪拍岸')]),
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '2024-10-24 22:45:00+08:00', '2024-10-25 06:45:00+08:00', 480, 4, '森林鸟鸣让人感觉很放松', ARRAY[(SELECT id FROM audios WHERE title = '森林鸟鸣')]);

-- 插入用户闹钟设置
INSERT INTO alarms (id, user_id, title, alarm_time, repeat_days, audio_ids, is_nap) VALUES
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '程橙的晚间睡眠', '22:30:00', ARRAY[1,2,3,4,5], ARRAY[(SELECT id FROM audios WHERE title = '轻柔细雨')], false),
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '程橙的午间小憩', '13:00:00', ARRAY[1,2,3,4,5], ARRAY[(SELECT id FROM audios WHERE title = '森林鸟鸣')], true);

-- 插入用户播放历史
INSERT INTO play_history (id, user_id, audio_id, play_duration) VALUES
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', (SELECT id FROM audios WHERE title = '轻柔细雨'), 1800),
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', (SELECT id FROM audios WHERE title = '海浪拍岸'), 1200),
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', (SELECT id FROM audios WHERE title = '森林鸟鸣'), 900);

-- 插入用户社区帖子
INSERT INTO community_posts (id, user_id, title, content, image_urls, like_count, comment_count) VALUES
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '程橙的睡眠改善分享', '大家好，我是程橙！通过使用SlumberPod的白噪音功能，我的睡眠质量有了明显提升。特别喜欢轻柔细雨这个音频，每晚都能很快入睡。', ARRAY['/images/chengcheng-sleep.jpg'], 15, 8),
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '推荐给失眠的朋友', '如果你也像我一样有失眠问题，强烈推荐试试海浪拍岸这个音频，特别适合深度放松。', ARRAY[]::TEXT[], 12, 5);

-- 插入用户AI解梦记录
INSERT INTO dream_analysis (id, user_id, dream_content, analysis_result, mood_rating, tags) VALUES
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '梦见在海边散步，感觉很平静', '海边散步的梦通常代表内心的平静和对自由的向往，可能暗示你需要更多的放松时间。', 4, ARRAY['海边','平静','放松']),
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '梦见和家人一起吃饭聊天', '家庭聚餐的梦象征对亲情的珍视，可能提示你需要更多与家人相处的时间。', 5, ARRAY['家庭','亲情','温暖']);

-- 插入用户创作
INSERT INTO user_creations (id, user_id, title, description, audio_url, is_public, like_count) VALUES
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '程橙的雨声混音', '结合了细雨和雨滴声的个人创作，适合睡前放松', '/user-audio/chengcheng-rain-mix.mp3', true, 8);

-- 插入用户反馈
INSERT INTO feedback_records (id, user_id, sleep_record_id, feedback_content, rating, is_resolved) VALUES
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', (SELECT id FROM sleep_records WHERE user_id = '11111111-1111-1111-1111-111111111111' LIMIT 1), '睡眠记录功能很实用，希望能增加更多统计图表', 5, true);

-- 输出插入成功信息
SELECT '用户数据插入成功！用户信息：手机号15933787572，微信号TCZW314，昵称程橙' as result;