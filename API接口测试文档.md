# SlumberPod API 接口测试文档

## 基础信息

- **服务地址**: `http://localhost:3003`
- **认证方式**: Bearer Token (微信JWT)
- **默认端口**: 3003

## 认证说明

所有需要认证的接口都需要在请求头中添加：
```
Authorization: Bearer {token}
```

Token可以通过微信登录接口获取。

## 接口列表

### 1. 健康检查

**GET** `/api/health`

**描述**: 检查服务是否正常运行

**响应示例**:
```json
{
  "status": "OK",
  "message": "SlumberPod API服务运行正常",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### 2. 用户相关接口

#### 2.1 获取用户信息

**GET** `/api/users/{openid}`

**参数**:
- `openid` (路径参数): 用户openid

**响应示例**:
```json
{
  "success": true,
  "data": {
    "openid": "user_openid_123",
    "nickname": "微信用户",
    "avatar_url": "https://example.com/avatar.jpg",
    "gender": 1,
    "city": "北京",
    "province": "北京",
    "country": "中国",
    "created_at": "2024-01-01T12:00:00.000Z",
    "last_login_at": "2024-01-01T12:00:00.000Z"
  }
}
```

#### 2.2 更新用户信息 (需要认证)

**PUT** `/api/users/profile`

**请求头**:
```
Authorization: Bearer {token}
```

**请求体**:
```json
{
  "nickname": "新昵称",
  "avatar_url": "https://example.com/new_avatar.jpg",
  "gender": 1,
  "city": "上海",
  "province": "上海",
  "country": "中国",
  "bio": "个人简介",
  "birthday": "1990-01-01",
  "phone": "13800138000"
}
```

#### 2.3 获取用户统计信息 (需要认证)

**GET** `/api/users/{openid}/stats`

**参数**:
- `openid` (路径参数): 用户openid

**响应示例**:
```json
{
  "success": true,
  "data": {
    "favorites": 10,
    "playHistory": 50,
    "userCreations": 5,
    "communityPosts": 3,
    "sleepSessions": 30,
    "totalSleepDuration": 150,
    "preferredCategory": "自然声音"
  }
}
```

#### 2.4 获取用户最近活动 (需要认证)

**GET** `/api/users/{openid}/activities?limit=10`

**参数**:
- `openid` (路径参数): 用户openid
- `limit` (查询参数): 返回数量，默认10

### 3. 音频相关接口

#### 3.1 获取音频列表

**GET** `/api/audios?category_id=1&limit=20&offset=0`

**参数**:
- `category_id` (可选): 分类ID
- `limit` (可选): 每页数量，默认20
- `offset` (可选): 偏移量，默认0

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "audio_id": 1,
      "title": "雨声",
      "description": "自然雨声",
      "cover_url": "https://example.com/cover.jpg",
      "audio_url": "https://example.com/audio.mp3",
      "duration_seconds": 3600,
      "play_count": 100,
      "favorite_count": 20,
      "owner_nickname": "创作者",
      "owner_avatar": "https://example.com/avatar.jpg"
    }
  ],
  "total": 100
}
```

#### 3.2 获取音频详情

**GET** `/api/audios/{id}`

**参数**:
- `id` (路径参数): 音频ID

#### 3.3 增加播放次数

**POST** `/api/audios/{id}/play`

### 4. 播放列表相关接口 (需要认证)

#### 4.1 获取用户播放列表

**GET** `/api/playlists`

#### 4.2 创建播放列表

**POST** `/api/playlists`

**请求体**:
```json
{
  "name": "我的播放列表",
  "isDefault": false
}
```

#### 4.3 获取播放列表详情

**GET** `/api/playlists/{playlistId}`

#### 4.4 添加音频到播放列表

**POST** `/api/playlists/{playlistId}/items`

**请求体**:
```json
{
  "audioId": 1,
  "position": 0
}
```

#### 4.5 从播放列表移除音频

**DELETE** `/api/playlists/{playlistId}/items/{audioId}`

### 5. 播放设置相关接口 (需要认证)

#### 5.1 获取播放设置

**GET** `/api/play-settings`

**响应示例**:
```json
{
  "success": true,
  "data": {
    "play_mode": "list_loop",
    "timer_minutes": 0
  }
}
```

#### 5.2 更新播放设置

**PUT** `/api/play-settings`

**请求体**:
```json
{
  "play_mode": "single_loop",
  "timer_minutes": 30
}
```

### 6. 小憩任务相关接口 (需要认证)

#### 6.1 获取小憩任务

**GET** `/api/sleep-timers?status=active`

**参数**:
- `status` (可选): 状态筛选，active/completed

#### 6.2 创建小憩任务

**POST** `/api/sleep-timers`

**请求体**:
```json
{
  "type": "scientific_10",
  "duration_minutes": 10,
  "start_time": "2024-01-01T14:00:00.000Z"
}
```

#### 6.3 结束小憩任务

**POST** `/api/sleep-timers/{timerId}/complete`

### 7. 闹钟相关接口 (需要认证)

#### 7.1 获取用户闹钟

**GET** `/api/alarms`

#### 7.2 创建闹钟

**POST** `/api/alarms`

**请求体**:
```json
{
  "label": "起床闹钟",
  "alarm_time": "2024-01-01T07:00:00.000Z",
  "repeat_days": "1,2,3,4,5",
  "snooze_duration": 5,
  "vibration": true,
  "volume": 80
}
```

#### 7.3 更新闹钟

**PUT** `/api/alarms/{alarmId}`

#### 7.4 启用/禁用闹钟

**PATCH** `/api/alarms/{alarmId}/toggle`

**请求体**:
```json
{
  "enabled": true
}
```

### 8. 搜索相关接口 (需要认证)

#### 8.1 获取热门搜索

**GET** `/api/search/hot?limit=10`

#### 8.2 获取用户搜索历史

**GET** `/api/search?limit=10`

#### 8.3 记录搜索行为

**POST** `/api/search`

**请求体**:
```json
{
  "keyword": "雨声"
}
```

#### 8.4 清空搜索历史

**DELETE** `/api/search`

### 9. 睡眠记录相关接口 (需要认证)

#### 9.1 获取睡眠记录

**GET** `/api/sleep/records?limit=30&offset=0`

#### 9.2 添加睡眠记录

**POST** `/api/sleep/records`

**请求体**:
```json
{
  "sleep_date": "2024-01-01",
  "sleep_time": "2024-01-01T22:00:00.000Z",
  "wake_time": "2024-01-02T06:00:00.000Z",
  "sleep_duration": 480,
  "sleep_quality": 85,
  "notes": "睡眠质量良好"
}
```

### 10. 收藏相关接口 (需要认证)

#### 10.1 获取用户收藏

**GET** `/api/favorites?limit=20&offset=0`

#### 10.2 添加/取消收藏

**POST** `/api/favorites`

**请求体**:
```json
{
  "audio_id": 1
}
```

### 11. 播放历史相关接口 (需要认证)

#### 11.1 获取播放历史

**GET** `/api/play-history?limit=20&offset=0`

#### 11.2 添加播放记录

**POST** `/api/play-history`

**请求体**:
```json
{
  "audio_id": 1,
  "play_duration": 300
}
```

## 测试数据准备

### 1. 获取测试Token

首先通过微信登录接口获取测试token：

**POST** `/api/wechat/login`

**请求体**:
```json
{
  "code": "test_code_123"
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "openid": "test_openid_123",
      "nickname": "测试用户"
    }
  }
}
```

### 2. 测试用户数据

- **openid**: `test_openid_123`
- **音频ID**: `1` (假设已存在)
- **播放列表ID**: `1` (创建后获取)
- **闹钟ID**: `1` (创建后获取)

## 错误码说明

| 状态码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 400 | 请求参数错误 |
| 401 | 未授权访问 |
| 403 | 禁止访问 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

## 测试建议

1. **按模块测试**: 建议按照功能模块顺序测试
2. **依赖关系**: 注意接口间的依赖关系（如需要先创建资源再操作）
3. **数据验证**: 测试各种边界情况和异常情况
4. **性能测试**: 对于列表接口测试分页和性能

## 环境配置

确保以下环境变量已配置：

```bash
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=password
DB_NAME=slumberpod

# JWT密钥
JWT_SECRET=slumberpod_wechat_secret_key

# 服务端口
PORT=3003
```

## 快速测试脚本

以下是一个简单的测试脚本示例：

```javascript
// 设置基础URL和token
const baseURL = 'http://localhost:3003';
const token = 'your_test_token';

// 测试健康检查
fetch(`${baseURL}/api/health`)
  .then(response => response.json())
  .then(data => console.log('健康检查:', data));

// 测试获取音频列表
fetch(`${baseURL}/api/audios?limit=5`)
  .then(response => response.json())
  .then(data => console.log('音频列表:', data));
```

这个文档包含了所有主要接口的详细信息，你可以直接导入到Apifox中进行测试。