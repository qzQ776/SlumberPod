# 闹钟功能 API 文档

## 概述
SlumberPod 闹钟功能提供完整的闹钟管理服务，包括创建、查询、更新、删除闹钟，以及闹钟提醒、统计等功能。

## 接口概览

### 基础闹钟管理
- `GET /api/alarms` - 获取用户所有闹钟
- `GET /api/alarms/enabled` - 获取用户启用的闹钟
- `POST /api/alarms` - 创建新闹钟
- `GET /api/alarms/:alarmId` - 获取闹钟详情
- `PUT /api/alarms/:alarmId` - 更新闹钟
- `DELETE /api/alarms/:alarmId` - 删除闹钟
- `PATCH /api/alarms/:alarmId/toggle` - 启用/禁用闹钟
- `POST /api/alarms/batch` - 批量操作闹钟

### 闹钟提醒服务
- `GET /api/alarms/reminder/check` - 检查并触发闹钟提醒
- `GET /api/alarms/reminder/today` - 获取今日闹钟安排
- `GET /api/alarms/reminder/stats` - 获取闹钟统计信息
- `POST /api/alarms/reminder/backup` - 备份闹钟设置
- `POST /api/alarms/reminder/restore` - 恢复闹钟设置

## 详细接口说明

### 1. 获取用户所有闹钟
```http
GET /api/alarms
```

**响应示例：**
```json
{
  "success": true,
  "data": [
    {
      "alarm_id": 1,
      "openid": "user_openid",
      "alarm_time": "08:30:00",
      "repeat_days": [1, 2, 3, 4, 5],
      "label": "起床闹钟",
      "snooze_duration": 5,
      "vibration": true,
      "volume": 80,
      "is_enabled": true,
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "count": 1
}
```

### 2. 创建闹钟
```http
POST /api/alarms
Content-Type: application/json

{
  "label": "起床闹钟",
  "alarm_time": "2024-01-01T08:30:00.000Z",
  "repeat_days": "1,2,3,4,5",
  "snooze_duration": 5,
  "vibration": true,
  "volume": 80
}
```

**参数说明：**
- `label`: 闹钟标签（必填）
- `alarm_time`: 闹钟时间（必填，ISO 格式）
- `repeat_days`: 重复规则，逗号分隔的数字（1-7，1=周一，7=周日）
- `snooze_duration`: 再睡一会时长（分钟）
- `vibration`: 是否振动
- `volume`: 音量（0-100）

### 3. 更新闹钟
```http
PUT /api/alarms/1
Content-Type: application/json

{
  "label": "更新后的闹钟",
  "is_enabled": false
}
```

### 4. 批量操作闹钟
```http
POST /api/alarms/batch
Content-Type: application/json

{
  "operations": [
    {
      "action": "enable",
      "alarm_id": 1
    },
    {
      "action": "delete", 
      "alarm_id": 2
    }
  ]
}
```

**支持的操作类型：**
- `enable`: 启用闹钟
- `disable`: 禁用闹钟
- `delete`: 删除闹钟
- `update`: 更新闹钟（需提供 data 字段）

### 5. 检查闹钟提醒
```http
GET /api/alarms/reminder/check
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "enabledAlarms": [...],
    "activeAlarms": [...],
    "currentTime": "2024-01-01T08:30:00.000Z",
    "totalEnabled": 3,
    "activeCount": 1
  }
}
```

### 6. 获取今日闹钟安排
```http
GET /api/alarms/reminder/today
```

### 7. 获取闹钟统计
```http
GET /api/alarms/reminder/stats
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "total": 5,
    "enabled": 3,
    "disabled": 2,
    "repeatStats": {
      "daily": 1,
      "weekdays": 2,
      "weekend": 1,
      "custom": 0,
      "once": 1
    },
    "timeStats": {
      "morning": 3,
      "afternoon": 1,
      "evening": 1,
      "night": 0
    }
  }
}
```

## 数据库表结构

```sql
CREATE TABLE alarms (
  alarm_id bigint(20) NOT NULL AUTO_INCREMENT,
  openid varchar(128) NOT NULL COMMENT '用户ID',
  alarm_time time NOT NULL COMMENT '闹钟时间',
  repeat_days varchar(20) DEFAULT NULL COMMENT '重复规则',
  label varchar(128) DEFAULT NULL COMMENT '闹钟备注',
  snooze_duration int(11) DEFAULT 0 COMMENT '再睡一会时长',
  vibration tinyint(1) DEFAULT 1 COMMENT '振动',
  volume int(11) DEFAULT 80 COMMENT '音量',
  is_enabled tinyint(1) NOT NULL DEFAULT 1 COMMENT '是否启用',
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (alarm_id)
);
```

## 业务逻辑

### 闹钟提醒触发规则
1. **重复闹钟**: 检查当前星期是否在重复规则中
2. **一次性闹钟**: 检查创建日期是否为今天
3. **时间匹配**: 检查当前时间是否与闹钟时间匹配

### 数据验证
- 闹钟时间必须为有效的时间格式
- 重复规则必须为1-7的数字，用逗号分隔
- 音量必须在0-100范围内

## 错误码

| 错误码 | 描述 |
|--------|------|
| 400 | 请求参数错误 |
| 404 | 闹钟不存在 |
| 500 | 服务器内部错误 |

## 使用示例

### 创建工作日闹钟
```javascript
const response = await fetch('/api/alarms', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    label: '工作日起床',
    alarm_time: '2024-01-01T07:30:00.000Z',
    repeat_days: '1,2,3,4,5',
    snooze_duration: 10,
    vibration: true,
    volume: 85
  })
});
```

### 批量禁用所有闹钟
```javascript
const response = await fetch('/api/alarms', {
  method: 'GET'
});
const { data: alarms } = await response.json();

const operations = alarms.map(alarm => ({
  action: 'disable',
  alarm_id: alarm.alarm_id
}));

const batchResponse = await fetch('/api/alarms/batch', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ operations })
});
```