# 🎯 闹钟接口Apifox测试文档

## 📋 基本信息

**服务器地址**: `http://localhost:3003`  
**认证方式**: Bearer Token (微信登录后获取)  
**Content-Type**: `application/json`

## 🔑 认证信息

### 获取Token
先通过微信登录接口获取access_token：
```
POST /api/auth/wechat-login
Content-Type: application/json

{
  "code": "微信登录code"
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "openid": "o6_bmjrPTlm6_2sgVt7hMZOPfL2M",
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 7200
  }
}
```

### 请求头设置
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

## 📊 基础闹钟接口测试用例

### 1. 获取用户所有闹钟
**接口**: `GET /api/alarms`

**测试用例**:
- **名称**: 获取用户闹钟列表
- **描述**: 获取当前用户的所有闹钟设置
- **期望响应**: 200 OK
- **响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "alarm_id": 1,
      "label": "起床闹钟",
      "alarm_time": "07:00:00",
      "repeat_days": "1,2,3,4,5",
      "snooze_duration": 5,
      "vibration": 1,
      "volume": 80,
      "is_enabled": 1
    }
  ]
}
```

### 2. 创建闹钟
**接口**: `POST /api/alarms`

**测试用例1**: 创建工作日闹钟
- **名称**: 创建工作日闹钟
- **请求体**:
```json
{
  "label": "工作日起床",
  "alarm_time": "2024-01-01T07:30:00.000Z",
  "repeat_days": [1, 2, 3, 4, 5],
  "snooze_duration": 5,
  "vibration": true,
  "volume": 80
}
```
- **期望响应**: 201 Created

**测试用例2**: 创建每日闹钟
- **名称**: 创建每日闹钟
- **请求体**:
```json
{
  "label": "每日提醒",
  "alarm_time": "2024-01-01T22:00:00.000Z",
  "repeat_days": [1, 2, 3, 4, 5, 6, 7],
  "snooze_duration": 10,
  "vibration": false,
  "volume": 60
}
```

### 3. 获取闹钟详情
**接口**: `GET /api/alarms/{alarmId}`

**测试用例**:
- **名称**: 获取闹钟详情
- **路径参数**: `alarmId` = 1
- **期望响应**: 200 OK

### 4. 更新闹钟
**接口**: `PUT /api/alarms/{alarmId}`

**测试用例**:
- **名称**: 更新闹钟设置
- **路径参数**: `alarmId` = 1
- **请求体**:
```json
{
  "label": "起床闹钟(修改)",
  "alarm_time": "2024-01-01T07:00:00.000Z",
  "repeat_days": [1, 2, 3, 4],
  "snooze_duration": 10,
  "vibration": true,
  "volume": 90
}
```

### 5. 删除闹钟
**接口**: `DELETE /api/alarms/{alarmId}`

**测试用例**:
- **名称**: 删除闹钟
- **路径参数**: `alarmId` = 1
- **期望响应**: 200 OK

### 6. 启用/禁用闹钟
**接口**: `PATCH /api/alarms/{alarmId}/toggle`

**测试用例1**: 禁用闹钟
- **名称**: 禁用闹钟
- **路径参数**: `alarmId` = 1
- **请求体**:
```json
{
  "enabled": false
}
```

**测试用例2**: 启用闹钟
- **名称**: 启用闹钟
- **路径参数**: `alarmId` = 1
- **请求体**:
```json
{
  "enabled": true
}
```

### 7. 获取启用的闹钟
**接口**: `GET /api/alarms/enabled`

**测试用例**:
- **名称**: 获取启用的闹钟
- **期望响应**: 200 OK

### 8. 批量操作闹钟
**接口**: `POST /api/alarms/batch`

**测试用例**: 批量启用闹钟
- **名称**: 批量操作测试
- **请求体**:
```json
{
  "operations": [
    {
      "action": "enable",
      "alarm_id": 1
    },
    {
      "action": "update",
      "alarm_id": 2,
      "data": {
        "label": "批量更新测试"
      }
    }
  ]
}
```

## 🎯 闹钟提醒服务接口测试用例

### 9. 检查闹钟提醒
**接口**: `GET /api/alarms/reminder/check`

**测试用例**:
- **名称**: 检查闹钟提醒
- **描述**: 检查当前时间是否有需要触发的闹钟
- **期望响应**: 200 OK

### 10. 获取今日闹钟安排
**接口**: `GET /api/alarms/reminder/today`

**测试用例**:
- **名称**: 获取今日闹钟安排
- **期望响应**: 200 OK
- **响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "alarm_id": 1,
      "label": "起床闹钟",
      "alarm_time": "07:30:00",
      "trigger_time": "2024-01-01T07:30:00.000Z"
    }
  ]
}
```

### 11. 获取闹钟统计信息
**接口**: `GET /api/alarms/reminder/stats`

**测试用例**:
- **名称**: 获取闹钟统计
- **期望响应**: 200 OK
- **响应示例**:
```json
{
  "success": true,
  "data": {
    "total": 5,
    "enabled": 3,
    "disabled": 2,
    "stats": {
      "repeat_types": {
        "daily": 2,
        "weekdays": 1,
        "weekend": 1,
        "custom": 1
      },
      "time_ranges": {
        "morning": 2,
        "afternoon": 1,
        "evening": 1,
        "night": 1
      }
    }
  }
}
```

### 12. 备份闹钟设置
**接口**: `POST /api/alarms/reminder/backup`

**测试用例**:
- **名称**: 备份闹钟设置
- **期望响应**: 200 OK

### 13. 恢复闹钟设置
**接口**: `POST /api/alarms/reminder/restore`

**测试用例**:
- **名称**: 恢复闹钟设置
- **请求体**:
```json
{
  "backup_data": {
    "backup_time": "2024-01-01T10:00:00.000Z",
    "alarms": [
      {
        "label": "起床闹钟",
        "alarm_time": "07:30:00",
        "repeat_days": [1,2,3,4,5]
      }
    ]
  }
}
```

## 🚀 测试环境准备

### 1. 启动服务
```bash
cd SlumberPod
npm install
npm start
```

### 2. 测试数据准备
运行以下命令创建测试数据：
```bash
node test_complete_alarm_system.js
```

### 3. Apifox导入
1. 打开Apifox
2. 选择"导入" → "OpenAPI"
3. 粘贴以下OpenAPI规范：

```yaml
openapi: 3.0.0
info:
  title: SlumberPod 闹钟API
  version: 1.0.0
  description: 枕眠APP闹钟管理接口
servers:
  - url: http://localhost:3003
    description: 本地开发环境

paths:
  /api/alarms:
    get:
      summary: 获取用户所有闹钟
      tags: [闹钟管理]
      responses:
        '200':
          description: 成功获取闹钟列表
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  data:
                    type: array
                    items:
                      type: object
                      properties:
                        alarm_id:
                          type: integer
                        label:
                          type: string
                        alarm_time:
                          type: string
    post:
      summary: 创建闹钟
      tags: [闹钟管理]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                label:
                  type: string
                alarm_time:
                  type: string
                repeat_days:
                  type: array
                  items:
                    type: integer
      responses:
        '201':
          description: 创建成功

  /api/alarms/{alarmId}:
    get:
      summary: 获取闹钟详情
      tags: [闹钟管理]
      parameters:
        - name: alarmId
          in: path
          required: true
          schema:
            type: integer
      responses:
        '200':
          description: 成功获取闹钟详情
    put:
      summary: 更新闹钟
      tags: [闹钟管理]
      parameters:
        - name: alarmId
          in: path
          required: true
          schema:
            type: integer
      responses:
        '200':
          description: 更新成功
    delete:
      summary: 删除闹钟
      tags: [闹钟管理]
      parameters:
        - name: alarmId
          in: path
          required: true
          schema:
            type: integer
      responses:
        '200':
          description: 删除成功
```

## 🎯 测试执行顺序建议

### 基础功能测试顺序
1. ✅ 获取用户所有闹钟 (GET /api/alarms)
2. ✅ 创建闹钟 (POST /api/alarms)
3. ✅ 获取闹钟详情 (GET /api/alarms/{id})
4. ✅ 更新闹钟 (PUT /api/alarms/{id})
5. ✅ 启用/禁用闹钟 (PATCH /api/alarms/{id}/toggle)
6. ✅ 获取启用的闹钟 (GET /api/alarms/enabled)
7. ✅ 批量操作测试 (POST /api/alarms/batch)
8. ✅ 删除闹钟 (DELETE /api/alarms/{id})

### 提醒服务测试顺序
9. ✅ 获取今日闹钟安排 (GET /api/alarms/reminder/today)
10. ✅ 获取闹钟统计信息 (GET /api/alarms/reminder/stats)
11. ✅ 检查闹钟提醒 (GET /api/alarms/reminder/check)
12. ✅ 备份闹钟设置 (POST /api/alarms/reminder/backup)
13. ✅ 恢复闹钟设置 (POST /api/alarms/reminder/restore)

## 📋 测试报告模板

### 测试结果记录
| 接口名称 | 测试状态 | 响应时间 | 结果验证 | 备注 |
|---------|---------|---------|---------|------|
| 获取用户所有闹钟 | ✅ 通过 | 200ms | 数据正确返回 | |
| 创建闹钟 | ✅ 通过 | 150ms | 闹钟创建成功 | |
| 获取闹钟详情 | ✅ 通过 | 120ms | 详情数据正确 | |
| 更新闹钟 | ✅ 通过 | 180ms | 更新成功 | |
| 启用/禁用闹钟 | ✅ 通过 | 100ms | 状态切换正确 | |

### 性能指标
- 平均响应时间: < 200ms
- 并发用户数: 支持10个并发用户
- 错误率: < 1%

## 🆘 常见问题排查

### 1. 认证失败
**问题**: 401 Unauthorized
**解决方案**: 
- 检查Authorization头是否正确
- 确认token是否过期
- 重新获取access_token

### 2. 参数错误
**问题**: 400 Bad Request
**解决方案**:
- 检查请求体JSON格式
- 验证必填字段是否完整
- 确认时间格式是否正确

### 3. 服务器错误
**问题**: 500 Internal Server Error
**解决方案**:
- 检查服务器日志
- 确认数据库连接正常
- 重启服务

### 4. 闹钟不触发
**问题**: 闹钟未按预期触发
**解决方案**:
- 检查闹钟是否启用
- 验证重复规则设置
- 确认当前时间是否在闹钟时间内

## 📞 技术支持

如有测试问题，请检查：
1. 服务器是否正常启动
2. 数据库连接是否正常
3. 认证token是否有效
4. 接口参数是否正确

**测试负责人**: 开发团队  
**联系方式**: 项目组内部沟通  
**更新日期**: 2024-01-01