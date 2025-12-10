# SlumberPod 数据库表结构文档

**项目名称**：SlumberPod（睡眠辅助类应用）**文档版本**：V1.0**更新时间**：2025-11-05**说明**：本文档整理数据库初始化脚本中的 19 张表结构，按「业务模块」分类，包含每张表的核心作用、字段详情、索引及外键关联规则，便于开发与维护时快速查阅。

## 一、通用约定

1. 字段类型说明

   ：

   - `tinyint(1)`：默认用于布尔值（1 = 是 / 启用，0 = 否 / 禁用），如`is_deleted`、`is_enabled`。
   - `varchar(n)`：用于短文本（如名称、URL、关键词），长度根据业务场景定义（如`openid`用 128 位适配微信标识）。
   - `text`：用于长文本或 JSON 格式数据（如用户偏好`settings`、音频描述`description`）。
   - 时间字段：`created_at`默认`CURRENT_TIMESTAMP`（创建时自动填充），`updated_at`默认`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`（更新时自动刷新）。

2. 外键级联策略

   ：

   - `ON DELETE CASCADE`：主表数据删除时，从表关联数据同步删除（如用户删除，其收藏记录同步删除）。
   - `ON DELETE SET NULL`：主表数据删除时，从表关联字段设为 NULL（如音频删除，帖子关联的`audio_id`设为 NULL，保留帖子内容）。

3. 索引类型

   ：

   - 主键索引（PRIMARY KEY）：确保字段唯一性，默认自增（`AUTO_INCREMENT`）或使用业务唯一标识（如`users.openid`）。
   - 唯一索引（UNIQUE KEY）：防止字段重复（如`uk_user_audio`避免同一用户重复收藏同一音频）。
   - 普通索引（KEY）：优化查询效率（如`idx_user_played`加速 “用户最近播放记录” 查询）。

## 二、用户模块（2 张表）

### 2.1 表名：`users`（用户核心信息表）

#### 核心作用

存储用户基础信息（微信授权数据、个人资料、睡眠统计），是所有业务的基础表。

#### 字段详情

| 字段名               | 类型          | 默认值                                        | 是否主键 | 备注                                                         |
| -------------------- | ------------- | --------------------------------------------- | -------- | ------------------------------------------------------------ |
| openid               | varchar(128)  | -                                             | 是       | 微信唯一标识，作为用户主键（确保跨设备用户唯一性）           |
| unionid              | varchar(128)  | NULL                                          | 否       | 微信多平台统一标识（若用户关联多个公众号 / 小程序，此值唯一） |
| nickname             | varchar(128)  | NULL                                          | 否       | 用户昵称（微信授权获取，支持修改）                           |
| avatar_url           | varchar(512)  | NULL                                          | 否       | 用户头像 URL（微信授权获取，支持修改）                       |
| gender               | tinyint(1)    | 0                                             | 否       | 性别（0 = 未知，1 = 男，2 = 女）                             |
| city                 | varchar(64)   | NULL                                          | 否       | 城市（微信授权获取）                                         |
| country              | varchar(64)   | NULL                                          | 否       | 国家（微信授权获取）                                         |
| province             | varchar(64)   | NULL                                          | 否       | 省份（微信授权获取）                                         |
| language             | varchar(32)   | NULL                                          | 否       | 语言（如 zh_CN，微信授权获取）                               |
| session_key          | varchar(256)  | NULL                                          | 否       | 微信会话密钥（临时存储，用于解密用户信息，过期需重新获取）   |
| settings             | text          | NULL                                          | 否       | 用户偏好设置（JSON 格式，如`{"theme":"dark","playSpeed":1.2}`） |
| bio                  | varchar(512)  | NULL                                          | 否       | 个人简介（用户自定义）                                       |
| birthday             | date          | NULL                                          | 否       | 生日（用户自定义）                                           |
| total_sleep_duration | decimal(10,2) | 0.00                                          | 否       | 累计睡眠时长（单位：小时，自动统计）                         |
| preferred_category   | varchar(64)   | NULL                                          | 否       | 偏好音频类别（如 “自然”“雨声”，用于个性化推荐）              |
| is_deleted           | tinyint(1)    | 0                                             | 否       | 是否注销（1 = 是，0 = 否，实现软删除，避免数据丢失）         |
| created_at           | datetime      | CURRENT_TIMESTAMP                             | 否       | 创建时间（用户首次授权时间）                                 |
| updated_at           | datetime      | CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 否       | 更新时间（用户信息修改时自动刷新）                           |

#### 索引列表

| 索引类型    | 索引字段     | 用途                       |
| ----------- | ------------ | -------------------------- |
| PRIMARY KEY | openid       | 唯一标识用户               |
| KEY         | idx_nickname | 优化 “按昵称搜索用户” 场景 |

#### 外键关联

无

### 2.2 表名：`play_settings`（用户播放设置表）

#### 核心作用

存储用户音频播放的个性化设置（如播放模式、定时关闭时长），确保用户播放体验一致性。

#### 字段详情

| 字段名        | 类型         | 默认值                                        | 是否主键 | 备注                                                         |
| ------------- | ------------ | --------------------------------------------- | -------- | ------------------------------------------------------------ |
| id            | bigint(20)   | AUTO_INCREMENT                                | 是       | 自增主键                                                     |
| openid        | varchar(128) | -                                             | 否       | 关联用户（对应`users.openid`）                               |
| play_mode     | varchar(32)  | 'list_loop'                                   | 否       | 播放模式（single_loop = 单曲循环，list_loop = 列表循环，single_once = 单曲一次） |
| timer_minutes | int(11)      | 0                                             | 否       | 定时关闭时长（单位：分钟，0 = 不开启定时）                   |
| created_at    | datetime     | CURRENT_TIMESTAMP                             | 否       | 创建时间                                                     |
| updated_at    | datetime     | CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 否       | 更新时间（设置修改时自动刷新）                               |

#### 索引列表

| 索引类型    | 索引字段         | 用途                          |
| ----------- | ---------------- | ----------------------------- |
| PRIMARY KEY | id               | 唯一标识设置记录              |
| UNIQUE KEY  | uk_user_settings | 确保 “一个用户仅一条设置记录” |
| KEY         | openid           | 快速查询用户的播放设置        |

#### 外键关联

| 外键字段 | 关联表  | 关联字段 | 级联策略          |
| -------- | ------- | -------- | ----------------- |
| openid   | `users` | openid   | ON DELETE CASCADE |

## 三、音频模块（4 张表）

### 3.1 表名：`audio_categories`（音频分类表）

#### 核心作用

定义音频的分类体系（如一级分类 “自然”，二级分类 “雨声”“风声”），支持多级分类与排序。

#### 字段详情

| 字段名      | 类型        | 默认值            | 是否主键 | 备注                                                         |
| ----------- | ----------- | ----------------- | -------- | ------------------------------------------------------------ |
| category_id | tinyint(4)  | AUTO_INCREMENT    | 是       | 分类自增 ID                                                  |
| name        | varchar(32) | -                 | 否       | 分类名称（如 “自然”“雨声”“免费”，需唯一）                    |
| parent_id   | tinyint(4)  | 0                 | 否       | 父分类 ID（0 = 一级分类，非 0 = 二级分类，如 “雨声” 的 parent_id=“自然” 的 category_id） |
| sort_order  | tinyint(4)  | 0                 | 否       | 排序权重（值越大，分类在前端展示越靠前）                     |
| is_free     | tinyint(1)  | 0                 | 否       | 是否免费分类（1 = 是，0 = 否，用于筛选免费音频）             |
| created_at  | datetime    | CURRENT_TIMESTAMP | 否       | 创建时间                                                     |

#### 索引列表

| 索引类型    | 索引字段         | 用途                       |
| ----------- | ---------------- | -------------------------- |
| PRIMARY KEY | category_id      | 唯一标识分类               |
| UNIQUE KEY  | uk_category_name | 防止分类名称重复           |
| KEY         | idx_parent       | 快速查询某父分类下的子分类 |

#### 外键关联

无

### 3.2 表名：`audios`（音频核心信息表）

#### 核心作用

存储音频的基础信息（标题、URL、时长）与统计数据（播放量、收藏量），区分 “系统音频” 与 “用户创作音频”。

#### 字段详情

| 字段名           | 类型          | 默认值                                        | 是否主键 | 备注                                                         |
| ---------------- | ------------- | --------------------------------------------- | -------- | ------------------------------------------------------------ |
| audio_id         | bigint(20)    | AUTO_INCREMENT                                | 是       | 音频自增 ID                                                  |
| owner_openid     | varchar(128)  | NULL                                          | 否       | 音频上传者（系统音频为 NULL，用户创作音频对应`users.openid`） |
| title            | varchar(255)  | -                                             | 否       | 音频标题（必填，如 “深夜雨声助眠”）                          |
| description      | text          | NULL                                          | 否       | 音频描述（可选，补充音频详情）                               |
| cover_url        | varchar(512)  | NULL                                          | 否       | 音频封面图 URL（可选，无封面时用默认图）                     |
| audio_url        | varchar(1024) | -                                             | 否       | 音频文件 URL（必填，存储在 OSS 等对象存储服务）              |
| duration_seconds | int(11)       | NULL                                          | 否       | 音频时长（单位：秒，如 3600=1 小时）                         |
| is_public        | tinyint(1)    | 1                                             | 否       | 是否公开（1 = 是，0 = 否，用户创作音频可设为私有）           |
| type             | varchar(32)   | -                                             | 否       | 音频类型（system = 系统音频，user_created = 用户创作音频）   |
| is_user_creation | tinyint(1)    | 0                                             | 否       | 是否用户创作（1 = 是，0 = 否，与`type`字段联动，便于筛选）   |
| play_count       | int(11)       | 0                                             | 否       | 播放量（用户播放一次 + 1，自动统计）                         |
| favorite_count   | int(11)       | 0                                             | 否       | 收藏量（用户收藏一次 + 1，取消收藏 - 1，自动统计）           |
| created_at       | datetime      | CURRENT_TIMESTAMP                             | 否       | 创建时间（系统音频为录入时间，用户创作音频为上传时间）       |
| updated_at       | datetime      | CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 否       | 更新时间（音频信息修改时自动刷新）                           |

#### 索引列表

| 索引类型    | 索引字段             | 用途                       |
| ----------- | -------------------- | -------------------------- |
| PRIMARY KEY | audio_id             | 唯一标识音频               |
| KEY         | idx_owner            | 快速查询某用户创作的音频   |
| KEY         | idx_type             | 快速筛选 “系统 / 用户音频” |
| KEY         | idx_title            | 优化 “按标题搜索音频” 场景 |
| KEY         | idx_is_user_creation | 快速筛选 “用户创作音频”    |

#### 外键关联

| 外键字段     | 关联表  | 关联字段 | 级联策略           |
| ------------ | ------- | -------- | ------------------ |
| owner_openid | `users` | openid   | ON DELETE SET NULL |

### 3.3 表名：`audio_category_mapping`（音频 - 分类映射表）

#### 核心作用

解决 “音频 - 分类” 的多对多关系（一个音频可归属于多个分类，一个分类可包含多个音频），实现灵活的分类管理。

#### 字段详情

| 字段名      | 类型       | 默认值         | 是否主键 | 备注                                           |
| ----------- | ---------- | -------------- | -------- | ---------------------------------------------- |
| id          | bigint(20) | AUTO_INCREMENT | 是       | 自增主键                                       |
| audio_id    | bigint(20) | -              | 否       | 关联音频（对应`audios.audio_id`）              |
| category_id | tinyint(4) | -              | 否       | 关联分类（对应`audio_categories.category_id`） |

#### 索引列表

| 索引类型    | 索引字段          | 用途                            |
| ----------- | ----------------- | ------------------------------- |
| PRIMARY KEY | id                | 唯一标识映射记录                |
| UNIQUE KEY  | uk_audio_category | 防止 “同一音频重复关联同一分类” |
| KEY         | idx_category      | 快速查询某分类下的所有音频      |

#### 外键关联

| 外键字段    | 关联表             | 关联字段    | 级联策略          |
| ----------- | ------------------ | ----------- | ----------------- |
| audio_id    | `audios`           | audio_id    | ON DELETE CASCADE |
| category_id | `audio_categories` | category_id | ON DELETE CASCADE |

### 3.4 表名：`play_history`（播放历史表）

#### 核心作用

记录用户的音频播放记录，支持 “最近播放”“断点续播” 功能。

#### 字段详情

| 字段名           | 类型         | 默认值         | 是否主键 | 备注                                                         |
| ---------------- | ------------ | -------------- | -------- | ------------------------------------------------------------ |
| history_id       | bigint(20)   | AUTO_INCREMENT | 是       | 自增主键                                                     |
| openid           | varchar(128) | -              | 否       | 关联用户（对应`users.openid`）                               |
| audio_id         | bigint(20)   | -              | 否       | 关联音频（对应`audios.audio_id`）                            |
| played_at        | datetime     | -              | 否       | 播放时间（用户开始播放的时间，必填）                         |
| position_seconds | int(11)      | 0              | 否       | 上次播放位置（单位：秒，用于断点续播，如用户播放到 60 秒退出，下次从 60 秒开始） |
| device_info      | varchar(255) | NULL           | 否       | 播放设备信息（如 “微信小程序 - Android”“iOS App”，用于多设备同步） |

#### 索引列表

| 索引类型    | 索引字段        | 用途                                                |
| ----------- | --------------- | --------------------------------------------------- |
| PRIMARY KEY | history_id      | 唯一标识播放记录                                    |
| KEY         | idx_user_played | 按 “用户 + 播放时间倒序” 查询，优化 “最近播放” 展示 |
| KEY         | idx_audio       | 快速查询某音频的所有播放记录                        |

#### 外键关联

| 外键字段 | 关联表   | 关联字段 | 级联策略          |
| -------- | -------- | -------- | ----------------- |
| openid   | `users`  | openid   | ON DELETE CASCADE |
| audio_id | `audios` | audio_id | ON DELETE CASCADE |

## 四、互动模块（5 张表）

### 4.1 表名：`favorites`（收藏表）

#### 核心作用

记录用户收藏的音频，支持 “我的收藏” 功能，防止重复收藏。

#### 字段详情

| 字段名     | 类型         | 默认值            | 是否主键 | 备注                              |
| ---------- | ------------ | ----------------- | -------- | --------------------------------- |
| id         | bigint(20)   | AUTO_INCREMENT    | 是       | 自增主键                          |
| openid     | varchar(128) | -                 | 否       | 关联用户（对应`users.openid`）    |
| audio_id   | bigint(20)   | -                 | 否       | 关联音频（对应`audios.audio_id`） |
| created_at | datetime     | CURRENT_TIMESTAMP | 否       | 收藏时间                          |

#### 索引列表

| 索引类型    | 索引字段      | 用途                            |
| ----------- | ------------- | ------------------------------- |
| PRIMARY KEY | id            | 唯一标识收藏记录                |
| UNIQUE KEY  | uk_user_audio | 防止 “同一用户重复收藏同一音频” |
| KEY         | idx_audio     | 快速查询某音频的所有收藏用户    |

#### 外键关联

| 外键字段 | 关联表   | 关联字段 | 级联策略          |
| -------- | -------- | -------- | ----------------- |
| openid   | `users`  | openid   | ON DELETE CASCADE |
| audio_id | `audios` | audio_id | ON DELETE CASCADE |

### 4.2 表名：`search_history`（搜索历史表）

#### 核心作用

记录用户的搜索关键词与热门搜索数据，支持 “历史搜索”“热门推荐” 功能。

#### 字段详情

| 字段名       | 类型         | 默认值                                        | 是否主键 | 备注                                                         |
| ------------ | ------------ | --------------------------------------------- | -------- | ------------------------------------------------------------ |
| id           | bigint(20)   | AUTO_INCREMENT                                | 是       | 自增主键                                                     |
| openid       | varchar(128) | NULL                                          | 否       | 关联用户（NULL = 匿名搜索，非 NULL = 用户搜索，对应`users.openid`） |
| keyword      | varchar(255) | -                                             | 否       | 搜索关键词（必填，如 “雨声”“助眠”）                          |
| is_hot       | tinyint(1)   | 0                                             | 否       | 是否热门搜索（1 = 是，0 = 否，用于标记高频搜索词）           |
| search_count | int(11)      | 0                                             | 否       | 热门搜索点击次数（仅`is_hot=1`时有效，用于热门排序）         |
| created_at   | datetime     | CURRENT_TIMESTAMP                             | 否       | 创建时间（搜索发生时间）                                     |
| updated_at   | datetime     | CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 否       | 更新时间（`search_count`增加时自动刷新）                     |

#### 索引列表

| 索引类型    | 索引字段         | 用途                                                    |
| ----------- | ---------------- | ------------------------------------------------------- |
| PRIMARY KEY | id               | 唯一标识搜索记录                                        |
| KEY         | idx_user_keyword | 快速查询用户的历史搜索（去重）                          |
| KEY         | idx_hot_count    | 按 “热门标记 + 点击次数倒序” 排序，优化 “热门搜索” 展示 |

#### 外键关联

| 外键字段 | 关联表  | 关联字段 | 级联策略          |
| -------- | ------- | -------- | ----------------- |
| openid   | `users` | openid   | ON DELETE CASCADE |

### 4.3 表名：`posts`（社区帖子表）

#### 核心作用

存储用户发布的社区内容（如睡眠心得、音频推荐），支持帖子与音频关联。

#### 字段详情

| 字段名        | 类型         | 默认值                                        | 是否主键 | 备注                                                         |
| ------------- | ------------ | --------------------------------------------- | -------- | ------------------------------------------------------------ |
| post_id       | bigint(20)   | AUTO_INCREMENT                                | 是       | 自增主键                                                     |
| author_openid | varchar(128) | -                                             | 否       | 帖子作者（对应`users.openid`）                               |
| title         | varchar(255) | NULL                                          | 否       | 帖子标题（可选，无标题时用默认格式如 “用户的分享”）          |
| content       | text         | -                                             | 否       | 帖子内容（必填，如 “昨晚听雨声睡了 8 小时，很舒服”）         |
| cover_image   | varchar(512) | NULL                                          | 否       | 帖子封面图 URL（可选，无封面时用默认图）                     |
| audio_id      | bigint(20)   | NULL                                          | 否       | 关联音频（NULL = 无关联音频，非 NULL = 关联`audios.audio_id`，用于推荐音频） |
| like_count    | int(11)      | 0                                             | 否       | 帖子点赞数（用户点赞 + 1，取消点赞 - 1，自动统计）           |
| comment_count | int(11)      | 0                                             | 否       | 帖子评论数（用户评论 + 1，删除评论 - 1，自动统计）           |
| status        | varchar(20)  | 'published'                                   | 否       | 帖子状态（published = 已发布，draft = 草稿，deleted = 已删除） |
| created_at    | datetime     | CURRENT_TIMESTAMP                             | 否       | 创建时间                                                     |
| updated_at    | datetime     | CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 否       | 更新时间（帖子修改、点赞 / 评论数变化时自动刷新）            |

#### 索引列表

| 索引类型    | 索引字段    | 用途                                         |
| ----------- | ----------- | -------------------------------------------- |
| PRIMARY KEY | post_id     | 唯一标识帖子                                 |
| KEY         | idx_author  | 快速查询某用户发布的所有帖子                 |
| KEY         | idx_created | 按 “创建时间倒序” 排序，优化 “最新帖子” 展示 |
| KEY         | idx_status  | 快速筛选 “已发布 / 草稿 / 已删除” 的帖子     |

#### 外键关联

| 外键字段      | 关联表   | 关联字段 | 级联策略           |
| ------------- | -------- | -------- | ------------------ |
| author_openid | `users`  | openid   | ON DELETE CASCADE  |
| audio_id      | `audios` | audio_id | ON DELETE SET NULL |

### 4.4 表名：`post_likes`（帖子点赞表）

#### 核心作用

记录用户对帖子的点赞行为，防止重复点赞，支持 “我的点赞” 功能。

#### 字段详情

| 字段名     | 类型         | 默认值            | 是否主键 | 备注                            |
| ---------- | ------------ | ----------------- | -------- | ------------------------------- |
| id         | bigint(20)   | AUTO_INCREMENT    | 是       | 自增主键                        |
| post_id    | bigint(20)   | -                 | 否       | 关联帖子（对应`posts.post_id`） |
| openid     | varchar(128) | -                 | 否       | 关联用户（对应`users.openid`）  |
| created_at | datetime     | CURRENT_TIMESTAMP | 否       | 点赞时间                        |

#### 索引列表

| 索引类型    | 索引字段     | 用途                            |
| ----------- | ------------ | ------------------------------- |
| PRIMARY KEY | id           | 唯一标识点赞记录                |
| UNIQUE KEY  | uk_post_user | 防止 “同一用户重复点赞同一帖子” |
| KEY         | idx_user     | 快速查询某用户点赞的所有帖子    |

#### 外键关联

| 外键字段 | 关联表  | 关联字段 | 级联策略          |
| -------- | ------- | -------- | ----------------- |
| post_id  | `posts` | post_id  | ON DELETE CASCADE |
| openid   | `users` | openid   | ON DELETE CASCADE |

### 4.5 表名：`comments`（评论表）

#### 核心作用

存储用户对 “帖子” 或 “音频” 的评论，支持 “评论回复”（层级评论）功能。

#### 字段详情

| 字段名        | 类型         | 默认值            | 是否主键 | 备注                                                         |
| ------------- | ------------ | ----------------- | -------- | ------------------------------------------------------------ |
| comment_id    | bigint(20)   | AUTO_INCREMENT    | 是       | 自增主键                                                     |
| target_type   | varchar(20)  | -                 | 否       | 评论目标类型（post = 帖子，audio = 音频，必填）              |
| target_id     | bigint(20)   | -                 | 否       | 评论目标 ID（对应`posts.post_id`或`audios.audio_id`，必填）  |
| author_openid | varchar(128) | -                 | 否       | 评论作者（对应`users.openid`，必填）                         |
| parent_id     | bigint(20)   | NULL              | 否       | 父评论 ID（NULL = 一级评论，非 NULL = 回复评论，对应`comments.comment_id`） |
| content       | text         | -                 | 否       | 评论内容（必填，如 “这个音频真的有用！”）                    |
| like_count    | int(11)      | 0                 | 否       | 评论点赞数（用户点赞 + 1，取消点赞 - 1，自动统计）           |
| created_at    | datetime     | CURRENT_TIMESTAMP | 否       | 创建时间                                                     |

#### 索引列表

| 索引类型    | 索引字段   | 用途                                                         |
| ----------- | ---------- | ------------------------------------------------------------ |
| PRIMARY KEY | comment_id | 唯一标识评论                                                 |
| KEY         | idx_target | 按 “目标类型 + 目标 ID + 时间倒序” 查询，优化 “某帖子 / 音频的最新评论” 展示 |
| KEY         | idx_author | 快速查询某用户发布的所有评论                                 |
| KEY         | idx_parent | 快速查询某评论的所有回复                                     |

#### 外键关联

| 外键字段      | 关联表     | 关联字段   | 级联策略          |
| ------------- | ---------- | ---------- | ----------------- |
| author_openid | `users`    | openid     | ON DELETE CASCADE |
| parent_id     | `comments` | comment_id | ON DELETE CASCADE |

## 五、睡眠管理模块（5 张表）

### 5.1 表名：`alarms`（闹钟表）

#### 核心作用

存储用户的闹钟设置（如起床时间、重复规则），支持多闹钟与自定义配置。

#### 字段详情

| 字段名          | 类型         | 默认值                                        | 是否主键 | 备注                                                         |
| --------------- | ------------ | --------------------------------------------- | -------- | ------------------------------------------------------------ |
| alarm_id        | bigint(20)   | AUTO_INCREMENT                                | 是       | 自增主键                                                     |
| openid          | varchar(128) | -                                             | 否       | 关联用户（对应`users.openid`）                               |
| alarm_time      | time         | -                                             | 否       | 闹钟时间（必填，如 08:30:00，24 小时制）                     |
| repeat_days     | varchar(20)  | NULL                                          | 否       | 重复规则（1-7 代表周一到周日，如 “1,2,3”= 周一至周三重复，NULL = 不重复） |
| label           | varchar(128) | NULL                                          | 否       | 闹钟备注（如 “起床闹钟”“午休闹钟”，可选）                    |
| snooze_duration | int(11)      | 0                                             | 否       | 再睡一会时长（单位：分钟，0 = 关闭，可选 5/10/15）           |
| vibration       | tinyint(1)   | 1                                             | 否       | 振动开关（1 = 开启，0 = 关闭）                               |
| volume          | int(11)      | 80                                            | 否       | 闹钟音量（0-100，默认 80）                                   |
| is_enabled      | tinyint(1)   | 1                                             | 否       | 是否启用（1 = 是，0 = 否，关闭后闹钟不触发）                 |
| created_at      | datetime     | CURRENT_TIMESTAMP                             | 否       | 创建时间                                                     |
| updated_at      | datetime     | CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 否       | 更新时间（闹钟设置修改时自动刷新）                           |

#### 索引列表

| 索引类型    | 索引字段         | 用途                                                         |
| ----------- | ---------------- | ------------------------------------------------------------ |
| PRIMARY KEY | alarm_id         | 唯一标识闹钟                                                 |
| KEY         | idx_user_enabled | 按 “用户 + 是否启用 + 闹钟时间” 查询，优化 “用户启用的闹钟” 筛选 |

#### 外键关联

| 外键字段 | 关联表  | 关联字段 | 级联策略          |
| -------- | ------- | -------- | ----------------- |
| openid   | `users` | openid   | ON DELETE CASCADE |

### 5.2 表名：`sleep_timers`（小憩定时任务表）

#### 核心作用

存储用户的小憩或定时任务（如 “科学小眠 10 分钟”“高效午休 24 分钟”），记录任务状态与时长。

#### 字段详情

| 字段名           | 类型         | 默认值            | 是否主键 | 备注                                                         |
| ---------------- | ------------ | ----------------- | -------- | ------------------------------------------------------------ |
| timer_id         | bigint(20)   | AUTO_INCREMENT    | 是       | 自增主键                                                     |
| openid           | varchar(128) | -                 | 否       | 关联用户（对应`users.openid`）                               |
| type             | varchar(32)  | -                 | 否       | 任务类型（必填，如 “小憩”“科学小眠 10”“高效午休 24”“自定义”） |
| duration_minutes | int(11)      | -                 | 否       | 任务时长（单位：分钟，必填，如 10=10 分钟小憩）              |
| start_time       | datetime     | -                 | 否       | 开始时间（必填，任务触发的时间）                             |
| end_time         | datetime     | -                 | 否       | 结束时间（必填，由`start_time`+`duration_minutes`计算得出）  |
| status           | varchar(20)  | 'active'          | 否       | 任务状态（active = 进行中，completed = 已完成，必填）        |
| created_at       | datetime     | CURRENT_TIMESTAMP | 否       | 创建时间                                                     |

#### 索引列表

| 索引类型    | 索引字段            | 用途                                                    |
| ----------- | ------------------- | ------------------------------------------------------- |
| PRIMARY KEY | timer_id            | 唯一标识定时任务                                        |
| KEY         | idx_user_start_time | 按 “用户 + 开始时间倒序” 查询，优化 “用户历史任务” 展示 |

#### 外键关联

| 外键字段 | 关联表  | 关联字段 | 级联策略          |
| -------- | ------- | -------- | ----------------- |
| openid   | `users` | openid   | ON DELETE CASCADE |

### 5.3 表名：`sleep_sessions`（睡眠会话表）

#### 核心作用

记录用户的睡眠会话（从开始入睡到结束睡眠的完整过程），关联伴随睡眠的音频。

#### 字段详情

| 字段名     | 类型         | 默认值         | 是否主键 | 备注                                                         |
| ---------- | ------------ | -------------- | -------- | ------------------------------------------------------------ |
| session_id | bigint(20)   | AUTO_INCREMENT | 是       | 自增主键                                                     |
| openid     | varchar(128) | -              | 否       | 关联用户（对应`users.openid`）                               |
| audio_id   | bigint(20)   | NULL           | 否       | 关联音频（NULL = 无音频伴随，非 NULL = 关联`audios.audio_id`） |
| start_time | datetime     | -              | 否       | 开始时间（用户点击 “开始睡眠” 的时间，必填）                 |
| end_time   | datetime     | NULL           | 否       | 结束时间（用户点击 “结束睡眠” 的时间，NULL = 睡眠未结束）    |
| auto_stop  | tinyint(1)   | 1              | 否       | 是否自动停止（1 = 是，0 = 否，自动停止时音频播放完或定时结束后标记睡眠结束） |

#### 索引列表

| 索引类型    | 索引字段      | 用途                                                    |
| ----------- | ------------- | ------------------------------------------------------- |
| PRIMARY KEY | session_id    | 唯一标识睡眠会话                                        |
| KEY         | idx_user_time | 按 “用户 + 开始时间倒序” 查询，优化 “睡眠历史记录” 展示 |

#### 外键关联

| 外键字段 | 关联表   | 关联字段 | 级联策略           |
| -------- | -------- | -------- | ------------------ |
| openid   | `users`  | openid   | ON DELETE CASCADE  |
| audio_id | `audios` | audio_id | ON DELETE SET NULL |

### 5.4 表名：`sleep_feedback`（睡眠反馈表）

#### 核心作用

存储用户的睡眠反馈（如睡眠质量、睡前活动），用于个性化睡眠建议与产品优化。

#### 字段详情

| 字段名               | 类型         | 默认值            | 是否主键 | 备注                                                         |
| -------------------- | ------------ | ----------------- | -------- | ------------------------------------------------------------ |
| feedback_id          | bigint(20)   | AUTO_INCREMENT    | 是       | 自增主键                                                     |
| openid               | varchar(128) | -                 | 否       | 关联用户（对应`users.openid`）                               |
| sleep_quality        | varchar(64)  | -                 | 否       | 睡眠质量（必填，如 “良好”“一般”“较差”）                      |
| sleep_problems       | json         | -                 | 否       | 睡眠问题（必填，JSON 数组，如`["多梦","易醒","入睡困难"]`）  |
| pre_sleep_activities | json         | -                 | 否       | 睡前活动（必填，JSON 数组，如`["饮用咖啡","使用电子设备超1小时","运动"]`） |
| other                | varchar(255) | NULL              | 否       | 其他备注（可选，补充反馈详情）                               |
| mental_state         | varchar(64)  | -                 | 否       | 心理状态（必填，如 “无压力”“轻微压力”“较大压力”）            |
| is_shared            | tinyint(1)   | 0                 | 否       | 是否同步到社区（1 = 是，0 = 否，用户可选择公开反馈）         |
| created_at           | datetime     | CURRENT_TIMESTAMP | 否       | 创建时间（反馈提交时间）                                     |

#### 索引列表

| 索引类型    | 索引字段            | 用途                                                    |
| ----------- | ------------------- | ------------------------------------------------------- |
| PRIMARY KEY | feedback_id         | 唯一标识反馈记录                                        |
| KEY         | idx_user_created_at | 按 “用户 + 提交时间倒序” 查询，优化 “用户反馈历史” 展示 |

#### 外键关联

| 外键字段 | 关联表  | 关联字段 | 级联策略          |
| -------- | ------- | -------- | ----------------- |
| openid   | `users` | openid   | ON DELETE CASCADE |

### 5.5 表名：`feedback_reminders`（反馈提醒表）

#### 核心作用

存储用户的睡眠反馈提醒（如 “起床后 30 分钟提醒提交睡眠反馈”），管理提醒状态。

#### 字段详情

| 字段名      | 类型         | 默认值            | 是否主键 | 备注                                                         |
| ----------- | ------------ | ----------------- | -------- | ------------------------------------------------------------ |
| reminder_id | bigint(20)   | AUTO_INCREMENT    | 是       | 自增主键                                                     |
| openid      | varchar(128) | -                 | 否       | 关联用户（对应`users.openid`）                               |
| feedback_id | bigint(20)   | NULL              | 否       | 关联反馈（NULL = 未提交反馈，非 NULL = 已提交反馈，对应`sleep_feedback.feedback_id`） |
| remind_time | datetime     | -                 | 否       | 提醒时间（必填，如起床后 30 分钟的时间点）                   |
| status      | varchar(20)  | 'pending'         | 否       | 提醒状态（pending = 待提醒，reminded = 已提醒，completed = 已完成，必填） |
| created_at  | datetime     | CURRENT_TIMESTAMP | 否       | 创建时间（提醒设置时间）                                     |

#### 索引列表

| 索引类型    | 索引字段             | 用途                                                  |
| ----------- | -------------------- | ----------------------------------------------------- |
| PRIMARY KEY | reminder_id          | 唯一标识提醒记录                                      |
| KEY         | idx_user_remind_time | 按 “用户 + 提醒时间正序” 查询，优化 “待触发提醒” 筛选 |

#### 外键关联

| 外键字段    | 关联表           | 关联字段    | 级联策略           |
| ----------- | ---------------- | ----------- | ------------------ |
| openid      | `users`          | openid      | ON DELETE CASCADE  |
| feedback_id | `sleep_feedback` | feedback_id | ON DELETE SET NULL |

## 六、播放列表模块（2 张表）

### 6.1 表名：`playlists`（播放列表主表）

#### 核心作用

存储用户的播放列表主信息（如列表名称、是否默认列表），支持多列表管理。

#### 字段详情

| 字段名      | 类型         | 默认值                                        | 是否主键 | 备注                                                   |
| ----------- | ------------ | --------------------------------------------- | -------- | ------------------------------------------------------ |
| playlist_id | bigint(20)   | AUTO_INCREMENT                                | 是       | 自增主键                                               |
| openid      | varchar(128) | -                                             | 否       | 关联用户（对应`users.openid`）                         |
| name        | varchar(128) | -                                             | 否       | 列表名称（必填，如 “我的助眠列表”“工作专注列表”）      |
| is_default  | tinyint(1)   | 0                                             | 否       | 是否默认列表（1 = 是，0 = 否，用户仅能有一个默认列表） |
| created_at  | datetime     | CURRENT_TIMESTAMP                             | 否       | 创建时间                                               |
| updated_at  | datetime     | CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 否       | 更新时间（列表名称修改时自动刷新）                     |

#### 索引列表

| 索引类型    | 索引字段        | 用途                          |
| ----------- | --------------- | ----------------------------- |
| PRIMARY KEY | playlist_id     | 唯一标识播放列表              |
| UNIQUE KEY  | uk_user_default | 确保 “一个用户仅一个默认列表” |
| KEY         | idx_user        | 快速查询某用户的所有播放列表  |

#### 外键关联

| 外键字段 | 关联表  | 关联字段 | 级联策略          |
| -------- | ------- | -------- | ----------------- |
| openid   | `users` | openid   | ON DELETE CASCADE |

### 6.2 表名：`playlist_items`（播放列表项表）

#### 核心作用

存储播放列表中的音频项（如 “我的助眠列表” 包含的 3 个音频），定义音频在列表中的排序。

#### 字段详情

| 字段名      | 类型       | 默认值            | 是否主键 | 备注                                                         |
| ----------- | ---------- | ----------------- | -------- | ------------------------------------------------------------ |
| id          | bigint(20) | AUTO_INCREMENT    | 是       | 自增主键                                                     |
| playlist_id | bigint(20) | -                 | 否       | 关联播放列表（对应`playlists.playlist_id`）                  |
| audio_id    | bigint(20) | -                 | 否       | 关联音频（对应`audios.audio_id`）                            |
| position    | int(11)    | -                 | 否       | 列表内排序位置（必填，如 1 = 第 1 位，2 = 第 2 位，用于控制播放顺序） |
| added_at    | datetime   | CURRENT_TIMESTAMP | 否       | 添加时间（音频加入列表的时间）                               |

#### 索引列表

| 索引类型    | 索引字段          | 用途                                           |
| ----------- | ----------------- | ---------------------------------------------- |
| PRIMARY KEY | id                | 唯一标识列表项                                 |
| UNIQUE KEY  | uk_playlist_audio | 防止 “同一列表重复添加同一音频”                |
| KEY         | idx_playlist      | 快速查询某列表内的所有音频（按 position 排序） |

#### 外键关联

| 外键字段    | 关联表      | 关联字段    | 级联策略          |
| ----------- | ----------- | ----------- | ----------------- |
| playlist_id | `playlists` | playlist_id | ON DELETE CASCADE |
| audio_id    | `audios`    | audio_id    | ON DELETE CASCADE |

## 七、文档说明

1. **表结构变更**：若后续需新增字段或修改索引，需同步更新此文档，确保文档与实际数据库结构一致。
2. **数据迁移**：若涉及历史数据迁移，需参考此文档中的字段含义与关联关系，避免数据丢失或关联错误。
3. **查询示例**：如需常见查询 SQL（如 “查询用户最近播放的 10 条音频”“统计某分类下的音频数量”），可基于此文档扩展查询脚本。