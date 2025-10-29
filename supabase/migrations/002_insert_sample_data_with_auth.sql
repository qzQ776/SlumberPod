-- 插入示例数据到SlumberPod枕眠APP数据库（适配Supabase认证）
-- 注意：profiles表需要先有对应的auth.users记录，这里我们使用示例数据

-- 1. 首先插入音频分类数据（不依赖用户数据）
INSERT INTO audio_categories (id, name, description, icon_url) VALUES
('11111111-1111-1111-1111-111111111111', '全部', '所有类型的白噪音', '/icons/all.png'),
('22222222-2222-2222-2222-222222222222', '雨声', '各种雨声白噪音', '/icons/rain.png'),
('33333333-3333-3333-3333-333333333333', '海洋', '海浪、海风等海洋声音', '/icons/ocean.png'),
('44444444-4444-4444-4444-444444444444', '森林', '鸟鸣、风声等自然声音', '/icons/forest.png'),
('55555555-5555-5555-5555-555555555555', '城市', '城市环境音', '/icons/city.png'),
('66666666-6666-6666-6666-666666666666', '冥想', '冥想音乐和引导音', '/icons/meditation.png'),
('77777777-7777-7777-7777-777777777777', 'ASMR', 'ASMR触发音', '/icons/asmr.png');

-- 2. 插入音频数据（使用系统默认作者）
INSERT INTO audios (id, title, description, audio_url, duration, category_id, play_count, like_count) VALUES
(gen_random_uuid(), '轻柔细雨', '轻柔的雨滴声，帮助放松入睡', '/audio/light-rain.mp3', 1800, '22222222-2222-2222-2222-222222222222', 1500, 120),
(gen_random_uuid(), '海浪拍岸', '持续的海浪声，营造海洋氛围', '/audio/ocean-waves.mp3', 3600, '33333333-3333-3333-3333-333333333333', 2300, 180),
(gen_random_uuid(), '森林鸟鸣', '清晨森林中的鸟鸣声', '/audio/forest-birds.mp3', 2700, '44444444-4444-4444-4444-444444444444', 1800, 95),
(gen_random_uuid(), '城市夜晚', '城市夜晚的轻微交通声', '/audio/city-night.mp3', 2400, '55555555-5555-5555-5555-555555555555', 1200, 80),
(gen_random_uuid(), '冥想钟声', '适合冥想的钟声', '/audio/meditation-bell.mp3', 1800, '66666666-6666-6666-6666-666666666666', 900, 60),
(gen_random_uuid(), '暴雨倾盆', '强烈的暴雨声，适合深度睡眠', '/audio/heavy-rain.mp3', 3000, '22222222-2222-2222-2222-222222222222', 2000, 150),
(gen_random_uuid(), '海边微风', '轻柔的海风声音', '/audio/sea-breeze.mp3', 2100, '33333333-3333-3333-3333-333333333333', 1700, 110),
(gen_random_uuid(), '溪流潺潺', '山间溪流的声音', '/audio/stream.mp3', 3300, '44444444-4444-4444-4444-444444444444', 1400, 85),
(gen_random_uuid(), '咖啡馆环境', '咖啡馆的背景音', '/audio/cafe.mp3', 2700, '55555555-5555-5555-5555-555555555555', 1100, 70),
(gen_random_uuid(), '引导冥想', '专业的冥想引导语音', '/audio/guided-meditation.mp3', 1800, '66666666-6666-6666-6666-666666666666', 800, 55);

-- 3. 插入社区帖子数据（使用系统默认用户）
INSERT INTO community_posts (id, title, content, image_urls, like_count, comment_count) VALUES
(gen_random_uuid(), '分享我的睡眠改善经验', '通过使用白噪音，我的睡眠质量得到了显著提升。每天睡前听30分钟雨声，入睡时间缩短了50%！', ARRAY['/images/sleep-improvement.jpg'], 25, 8),
(gen_random_uuid(), '推荐几个优质的白噪音', '我发现这几个白噪音特别适合助眠：1. 轻柔细雨 2. 海浪拍岸 3. 森林鸟鸣。大家试试看！', ARRAY['/audio/recommendation1.jpg','/audio/recommendation2.jpg'], 42, 15),
(gen_random_uuid(), '如何选择适合自己的白噪音', '根据不同的睡眠问题选择不同的白噪音类型：失眠选雨声，焦虑选海浪，压力大选森林声音。', ARRAY[]::TEXT[], 18, 6),
(gen_random_uuid(), '创建白噪音的技巧分享', '分享一些创作白噪音的心得：1. 录制真实环境音 2. 注意音质纯净 3. 控制音量平衡。', ARRAY['/images/creation-tips.jpg'], 30, 12),
(gen_random_uuid(), '睡眠记录功能使用体验', '使用睡眠记录功能帮助我更好地了解睡眠模式，发现深度睡眠时间增加了20%。', ARRAY[]::TEXT[], 22, 9),
(gen_random_uuid(), '白噪音对婴儿睡眠的影响', '给宝宝使用白噪音后，夜间醒来的次数明显减少，睡眠更加安稳。', ARRAY['/images/baby-sleep.jpg'], 35, 11),
(gen_random_uuid(), '不同季节的白噪音选择', '春天听鸟鸣，夏天听雨声，秋天听风声，冬天听壁炉声，让睡眠更有季节感。', ARRAY[]::TEXT[], 28, 7),
(gen_random_uuid(), '白噪音与冥想结合', '将白噪音与冥想引导结合，可以更好地放松身心，提高睡眠质量。', ARRAY['/images/meditation.jpg'], 19, 5),
(gen_random_uuid(), '旅行中的睡眠解决方案', '出差旅行时带上白噪音APP，即使在陌生环境也能快速入睡。', ARRAY[]::TEXT[], 31, 10),
(gen_random_uuid(), '白噪音的音量控制技巧', '合适的音量是关键：太小声没效果，太大声影响睡眠。建议在40-60分贝之间。', ARRAY['/images/volume-control.jpg'], 26, 8);

-- 4. 插入评论数据
INSERT INTO comments (id, post_id, content, like_count) VALUES
(gen_random_uuid(), (SELECT id FROM community_posts LIMIT 1), '感谢分享！我也试试看，希望能改善我的失眠问题。', 3),
(gen_random_uuid(), (SELECT id FROM community_posts LIMIT 1), '确实有效，我的睡眠也改善了，现在每天都能睡够8小时。', 5),
(gen_random_uuid(), (SELECT id FROM community_posts LIMIT 1 OFFSET 1), '第一个推荐的很不错，雨声特别适合我这种容易焦虑的人。', 2),
(gen_random_uuid(), (SELECT id FROM community_posts LIMIT 1 OFFSET 2), '很有用的分类建议，我之前一直选错类型。', 4),
(gen_random_uuid(), (SELECT id FROM community_posts LIMIT 1 OFFSET 3), '期待更多创作技巧，我也想尝试录制自己的白噪音。', 1),
(gen_random_uuid(), (SELECT id FROM community_posts LIMIT 1 OFFSET 4), '睡眠记录功能确实很实用，可以量化睡眠质量。', 6),
(gen_random_uuid(), (SELECT id FROM community_posts LIMIT 1 OFFSET 5), '对婴儿也有效吗？我正为宝宝的睡眠发愁。', 3),
(gen_random_uuid(), (SELECT id FROM community_posts LIMIT 1 OFFSET 6), '季节选择建议很有创意，让睡眠更有仪式感。', 2),
(gen_random_uuid(), (SELECT id FROM community_posts LIMIT 1 OFFSET 7), '冥想结合白噪音，双重放松效果更好。', 4),
(gen_random_uuid(), (SELECT id FROM community_posts LIMIT 1 OFFSET 8), '旅行必备！再也不怕酒店环境嘈杂了。', 7);

-- 5. 插入闹钟数据
INSERT INTO alarms (id, title, alarm_time, repeat_days, audio_ids, is_nap) VALUES
(gen_random_uuid(), '晚间睡眠', '22:30:00', ARRAY[1,2,3,4,5], ARRAY[(SELECT id FROM audios LIMIT 1), (SELECT id FROM audios LIMIT 1 OFFSET 1)], false),
(gen_random_uuid(), '午间小憩', '13:00:00', ARRAY[1,2,3,4,5], ARRAY[(SELECT id FROM audios LIMIT 1 OFFSET 2)], true),
(gen_random_uuid(), '周末放松', '23:00:00', ARRAY[6,0], ARRAY[(SELECT id FROM audios LIMIT 1 OFFSET 3), (SELECT id FROM audios LIMIT 1 OFFSET 4)], false),
(gen_random_uuid(), '清晨唤醒', '06:30:00', ARRAY[1,2,3,4,5], ARRAY[(SELECT id FROM audios LIMIT 1 OFFSET 5)], false),
(gen_random_uuid(), '午后休息', '14:30:00', ARRAY[1,2,3,4,5], ARRAY[(SELECT id FROM audios LIMIT 1 OFFSET 6)], true),
(gen_random_uuid(), '深度睡眠', '23:30:00', ARRAY[1,2,3,4,5], ARRAY[(SELECT id FROM audios LIMIT 1 OFFSET 7)], false),
(gen_random_uuid(), '快速小憩', '12:30:00', ARRAY[1,2,3,4,5], ARRAY[(SELECT id FROM audios LIMIT 1 OFFSET 8)], true),
(gen_random_uuid(), '周末晚睡', '00:30:00', ARRAY[6,0], ARRAY[(SELECT id FROM audios LIMIT 1 OFFSET 9)], false),
(gen_random_uuid(), '工作日早起', '05:30:00', ARRAY[1,2,3,4,5], ARRAY[(SELECT id FROM audios LIMIT 1)], false),
(gen_random_uuid(), '冥想时刻', '21:00:00', ARRAY[1,2,3,4,5], ARRAY[(SELECT id FROM audios LIMIT 1 OFFSET 4)], false);

-- 6. 插入AI解梦记录数据
INSERT INTO dream_analysis (id, dream_content, analysis_result, mood_rating, tags) VALUES
(gen_random_uuid(), '梦见自己在飞翔，感觉很自由', '飞翔的梦通常代表对自由的渴望和摆脱束缚的愿望，可能暗示你在现实生活中寻求更多的自主权。', 4, ARRAY['自由','飞翔','积极']),
(gen_random_uuid(), '梦见考试迟到，很焦虑', '考试迟到的梦可能反映现实生活中的压力和对表现的担忧，建议适当放松，调整心态。', 2, ARRAY['焦虑','压力','工作']),
(gen_random_uuid(), '梦见和家人一起吃饭', '家庭聚餐的梦通常象征对家庭温暖和亲情的渴望，可能提示你需要更多家庭时间。', 5, ARRAY['家庭','温暖','亲情']),
(gen_random_uuid(), '梦见迷路找不到方向', '迷路的梦可能表示在现实生活中感到迷茫，需要重新审视目标和方向。', 3, ARRAY['迷茫','方向','探索']),
(gen_random_uuid(), '梦见捡到钱很开心', '捡钱的梦通常代表好运和机遇，可能暗示近期会有意外收获。', 4, ARRAY['好运','机遇','财富']),
(gen_random_uuid(), '梦见被追赶很害怕', '被追赶的梦往往反映逃避现实问题的心理，需要勇敢面对挑战。', 2, ARRAY['恐惧','逃避','压力']),
(gen_random_uuid(), '梦见回到童年时光', '童年梦通常代表对简单快乐的怀念，可能提示你需要更多放松和娱乐。', 5, ARRAY['童年','怀念','快乐']),
(gen_random_uuid(), '梦见下雨感觉很平静', '下雨的梦象征情绪释放和净化，可能表示内心需要清理和更新。', 4, ARRAY['平静','净化','情绪']),
(gen_random_uuid(), '梦见动物很友好', '友好动物的梦代表和谐的人际关系，可能暗示社交生活顺利。', 4, ARRAY['动物','友好','社交']),
(gen_random_uuid(), '梦见学习新技能', '学习梦通常代表成长和发展的愿望，可能提示你需要提升自我。', 4, ARRAY['学习','成长','发展']);

-- 7. 插入用户创作数据
INSERT INTO user_creations (id, title, description, audio_url, is_public, like_count) VALUES
(gen_random_uuid(), '我的雨声混音', '结合了不同雨声的创作，包含细雨、中雨、暴雨的渐变效果。', '/user-audio/my-rain-mix.mp3', true, 15),
(gen_random_uuid(), '森林冥想', '原创的森林环境音，包含鸟鸣、风声、溪流声的自然组合。', '/user-audio/forest-meditation.mp3', false, 8),
(gen_random_uuid(), '城市清晨', '记录城市清晨的声音，包含鸟鸣、轻微交通声、晨练声。', '/user-audio/city-morning.mp3', true, 12),
(gen_random_uuid(), '海边日落', '海边日落时分的环境音，海浪声渐变柔和。', '/user-audio/sunset-beach.mp3', true, 9),
(gen_random_uuid(), '山间瀑布', '山间瀑布的录音，水流声层次丰富。', '/user-audio/mountain-waterfall.mp3', false, 6),
(gen_random_uuid(), '雨林探险', '热带雨林的环境音，包含多种鸟类和昆虫声。', '/user-audio/rainforest.mp3', true, 11),
(gen_random_uuid(), '雪夜安静', '雪夜的寂静环境音，偶尔有雪落声。', '/user-audio/snowy-night.mp3', true, 7),
(gen_random_uuid(), '咖啡馆工作', '咖啡馆的背景音，适合工作学习时使用。', '/user-audio/cafe-working.mp3', false, 10),
(gen_random_uuid(), '图书馆安静', '图书馆的安静环境音，翻书声轻微。', '/user-audio/library-quiet.mp3', true, 8),
(gen_random_uuid(), '火车旅行', '火车行驶的声音，有节奏的轨道声。', '/user-audio/train-journey.mp3', true, 13);

-- 8. 插入播放历史数据
INSERT INTO play_history (id, audio_id, play_duration) VALUES
(gen_random_uuid(), (SELECT id FROM audios LIMIT 1), 600),
(gen_random_uuid(), (SELECT id FROM audios LIMIT 1 OFFSET 1), 1200),
(gen_random_uuid(), (SELECT id FROM audios LIMIT 1 OFFSET 2), 900),
(gen_random_uuid(), (SELECT id FROM audios LIMIT 1 OFFSET 3), 1800),
(gen_random_uuid(), (SELECT id FROM audios LIMIT 1 OFFSET 4), 300),
(gen_random_uuid(), (SELECT id FROM audios LIMIT 1 OFFSET 5), 1500),
(gen_random_uuid(), (SELECT id FROM audios LIMIT 1 OFFSET 6), 800),
(gen_random_uuid(), (SELECT id FROM audios LIMIT 1 OFFSET 7), 2100),
(gen_random_uuid(), (SELECT id FROM audios LIMIT 1 OFFSET 8), 400),
(gen_random_uuid(), (SELECT id FROM audios LIMIT 1 OFFSET 9), 1200);

-- 9. 插入睡眠记录数据
INSERT INTO sleep_records (id, start_time, end_time, duration, quality_rating, notes, audio_ids) VALUES
(gen_random_uuid(), '2024-10-26 22:30:00+08:00', '2024-10-27 06:30:00+08:00', 480, 4, '睡眠质量不错，使用了雨声白噪音', ARRAY[(SELECT id FROM audios LIMIT 1)]),
(gen_random_uuid(), '2024-10-25 23:00:00+08:00', '2024-10-26 07:00:00+08:00', 480, 3, '中途醒来一次', ARRAY[(SELECT id FROM audios LIMIT 1 OFFSET 1)]),
(gen_random_uuid(), '2024-10-24 22:00:00+08:00', '2024-10-25 05:30:00+08:00', 450, 5, '深度睡眠，感觉很好', ARRAY[(SELECT id FROM audios LIMIT 1 OFFSET 2)]),
(gen_random_uuid(), '2024-10-23 23:30:00+08:00', '2024-10-24 07:15:00+08:00', 465, 4, '使用了海浪声，入睡很快', ARRAY[(SELECT id FROM audios LIMIT 1 OFFSET 3)]),
(gen_random_uuid(), '2024-10-22 22:45:00+08:00', '2024-10-23 06:45:00+08:00', 480, 3, '睡眠较浅，多梦', ARRAY[(SELECT id FROM audios LIMIT 1 OFFSET 4)]),
(gen_random_uuid(), '2024-10-21 23:15:00+08:00', '2024-10-22 07:30:00+08:00', 495, 4, '睡眠质量稳定', ARRAY[(SELECT id FROM audios LIMIT 1 OFFSET 5)]),
(gen_random_uuid(), '2024-10-20 22:20:00+08:00', '2024-10-21 06:20:00+08:00', 480, 5, '深度睡眠时间较长', ARRAY[(SELECT id FROM audios LIMIT 1 OFFSET 6)]),
(gen_random_uuid(), '2024-10-19 23:45:00+08:00', '2024-10-20 07:00:00+08:00', 435, 3, '入睡较困难', ARRAY[(SELECT id FROM audios LIMIT 1 OFFSET 7)]),
(gen_random_uuid(), '2024-10-18 22:10:00+08:00', '2024-10-19 06:40:00+08:00', 510, 4, '睡眠时间充足', ARRAY[(SELECT id FROM audios LIMIT 1 OFFSET 8)]),
(gen_random_uuid(), '2024-10-17 23:00:00+08:00', '2024-10-18 07:20:00+08:00', 500, 4, '使用了多种白噪音组合', ARRAY[(SELECT id FROM audios LIMIT 1), (SELECT id FROM audios LIMIT 1 OFFSET 1)]);

-- 10. 插入反馈记录数据
INSERT INTO feedback_records (id, sleep_record_id, feedback_content, rating, is_resolved) VALUES
(gen_random_uuid(), (SELECT id FROM sleep_records LIMIT 1), '睡眠记录功能很实用，可以量化睡眠质量', 5, true),
(gen_random_uuid(), (SELECT id FROM sleep_records LIMIT 1 OFFSET 1), '希望增加更多白噪音类型', 4, false),
(gen_random_uuid(), (SELECT id FROM sleep_records LIMIT 1 OFFSET 2), 'AI解梦功能很有趣，分析很准确', 5, true),
(gen_random_uuid(), (SELECT id FROM sleep_records LIMIT 1 OFFSET 3), '界面设计很美观，操作流畅', 5, true),
(gen_random_uuid(), (SELECT id FROM sleep_records LIMIT 1 OFFSET 4), '建议增加睡眠统计图表', 4, false),
(gen_random_uuid(), (SELECT id FROM sleep_records LIMIT 1 OFFSET 5), '闹钟功能很实用，提醒准时', 5, true),
(gen_random_uuid(), (SELECT id FROM sleep_records LIMIT 1 OFFSET 6), '社区功能互动性很好', 4, true),
(gen_random_uuid(), (SELECT id FROM sleep_records LIMIT 1 OFFSET 7), '希望增加个性化推荐', 3, false),
(gen_random_uuid(), (SELECT id FROM sleep_records LIMIT 1 OFFSET 8), '音频质量很好，没有杂音', 5, true),
(gen_random_uuid(), (SELECT id FROM sleep_records LIMIT 1 OFFSET 9), '整体体验很棒，会推荐给朋友', 5, true);

-- 注意：以下表需要真实的用户数据，将在用户登录后通过前端应用创建：
-- user_favorites（用户收藏）
-- 包含user_id字段的其他表（将在用户登录后创建）

SELECT '示例数据插入成功！所有数据已适配Supabase认证系统。' as result;