<template>
  <view class="page" :style="bgStyle">
    <!-- 顶部导航栏 -->
    <view class="header">
      <view class="header-left">
        <view class="back-btn" @click="goBack">
          <text class="back-icon">←</text>
        </view>
        <text class="header-title">消息详情</text>
      </view>
      <view class="header-right">
        <view class="action-btn" @click="handleAction">
          <text class="action-icon">⋯</text>
        </view>
      </view>
    </view>

    <!-- 消息详情内容 -->
    <scroll-view class="message-detail" scroll-y>
      <!-- 消息头部 -->
      <view class="message-header">
        <view class="message-avatar">
          <text class="avatar-symbol">{{ messageDetail.avatar }}</text>
        </view>
        <view class="message-info">
          <text class="message-sender">{{ messageDetail.sender }}</text>
          <text class="message-time">{{ messageDetail.time }}</text>
        </view>
      </view>

      <!-- 消息内容 -->
      <view class="message-content">
        <text class="message-title">{{ messageDetail.title }}</text>
        <text class="message-body">{{ messageDetail.content }}</text>
        
        <!-- 消息附件或额外内容 -->
        <view v-if="messageDetail.attachments" class="message-attachments">
          <view 
            v-for="attachment in messageDetail.attachments" 
            :key="attachment.id" 
            class="attachment-item"
            @click="handleAttachment(attachment)"
          >
            <text class="attachment-icon">{{ attachment.icon }}</text>
            <view class="attachment-info">
              <text class="attachment-name">{{ attachment.name }}</text>
              <text class="attachment-size">{{ attachment.size }}</text>
            </view>
            <text class="download-icon">⬇️</text>
          </view>
        </view>

        <!-- 操作按钮 -->
        <view v-if="messageDetail.actions" class="message-actions">
          <view 
            v-for="action in messageDetail.actions" 
            :key="action.id" 
            class="action-btn"
            :class="{ primary: action.primary }"
            @click="handleMessageAction(action)"
          >
            <text class="action-text">{{ action.text }}</text>
          </view>
        </view>
      </view>

      <!-- 相关推荐 -->
      <view v-if="messageDetail.related" class="related-section">
        <text class="section-title">相关推荐</text>
        <view class="related-list">
          <view 
            v-for="item in messageDetail.related" 
            :key="item.id" 
            class="related-item"
            @click="handleRelatedItem(item)"
          >
            <image class="related-cover" :src="item.cover" mode="aspectFill" />
            <view class="related-info">
              <text class="related-name">{{ item.name }}</text>
              <text class="related-desc">{{ item.desc }}</text>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useGlobalTheme } from '@/composables/useGlobalTheme'
import { useThemeStore } from '@/stores/theme'
import { onLoad } from '@dcloudio/uni-app'

const themeStore = useThemeStore(); themeStore.load()
const { bgStyle } = useGlobalTheme()

// 消息详情数据
const messageDetail = ref({})

// 页面加载时获取消息ID
onLoad((options) => {
  const messageId = options.id
  loadMessageDetail(messageId)
})

// 加载消息详情
function loadMessageDetail(messageId) {
  // 根据消息ID获取对应的详情数据
  const messageData = getMessageDataById(messageId)
  messageDetail.value = messageData
}

// 根据消息ID获取消息数据
function getMessageDataById(messageId) {
  const messageMap = {
    1: {
      id: 1,
      sender: '系统通知',
      avatar: '📢',
      title: '欢迎使用SlumberPod！',
      content: '感谢您选择SlumberPod睡眠助手！\n\n新版本v2.0.0已正式上线，带来了以下重要更新：\n\n✨ 新增AI解梦功能，智能分析您的梦境\n🎵 优化白噪音播放体验，支持组合播放\n🌙 改进睡眠监测算法，更精准的睡眠报告\n👥 社区功能升级，与更多用户交流睡眠经验\n\n我们致力于为您提供更好的睡眠体验，如有任何问题或建议，欢迎随时联系我们！',
      time: '2024-01-15 12:30',
      attachments: [
        {
          id: 1,
          icon: '📋',
          name: '更新日志.txt',
          size: '2.1KB'
        },
        {
          id: 2,
          icon: '🎯',
          name: '新功能介绍.pdf',
          size: '1.5MB'
        }
      ],
      actions: [
        { id: 1, text: '立即体验', primary: true },
        { id: 2, text: '查看详情' }
      ]
    },
    2: {
      id: 2,
      sender: '白噪音推荐',
      avatar: '🎵',
      title: '为您推荐：雨声白噪音',
      content: '根据您的睡眠习惯分析，我们为您推荐这款优质的雨声白噪音：\n\n🌧️ 雨声白噪音特点：\n• 自然真实的雨滴声，帮助快速入睡\n• 持续30分钟，覆盖整个入睡阶段\n• 音量渐变设计，避免突然中断\n• 专业音频处理，无杂音干扰\n\n💡 使用建议：\n• 睡前30分钟开始播放\n• 配合舒适的卧具和环境\n• 保持房间温度适宜\n• 避免使用电子设备',
      time: '2024-01-14 20:15',
      related: [
        {
          id: 1,
          cover: 'https://picsum.photos/seed/rain/80/80',
          name: '雨声白噪音',
          desc: '自然雨滴声，帮助放松入睡'
        },
        {
          id: 2,
          cover: 'https://picsum.photos/seed/ocean/80/80',
          name: '海浪声',
          desc: '轻柔海浪，营造宁静氛围'
        },
        {
          id: 3,
          cover: 'https://picsum.photos/seed/fire/80/80',
          name: '壁炉声',
          desc: '温暖火焰声，冬季最佳选择'
        }
      ],
      actions: [
        { id: 1, text: '立即播放', primary: true },
        { id: 2, text: '收藏此白噪音' }
      ]
    },
    3: {
      id: 3,
      sender: '睡眠报告',
      avatar: '📊',
      title: '您的睡眠质量分析报告',
      content: '📈 睡眠数据分析（2024-01-13）\n\n🛌 总睡眠时间：7小时25分钟\n⭐ 睡眠质量评分：85分（良好）\n🌙 深睡时长：2小时15分钟\n🌅 浅睡时长：4小时10分钟\n🌀 快速眼动期：1小时\n\n📋 详细分析：\n• 入睡时间：22:45\n• 醒来时间：06:10\n• 夜间醒来次数：2次\n• 平均心率：65次/分钟\n• 呼吸频率：14次/分钟\n\n💡 改善建议：\n• 建议保持22:30前入睡\n• 深睡比例可进一步提升\n• 减少夜间饮水，避免起夜',
      time: '2024-01-14 08:00',
      attachments: [
        {
          id: 1,
          icon: '📈',
          name: '睡眠趋势图.png',
          size: '156KB'
        },
        {
          id: 2,
          icon: '📋',
          name: '详细数据报告.pdf',
          size: '890KB'
        }
      ],
      actions: [
        { id: 1, text: '查看详细报告', primary: true },
        { id: 2, text: '分享报告' },
        { id: 3, text: '导出数据' }
      ]
    },
    4: {
      id: 4,
      sender: '社区互动',
      avatar: '👥',
      title: '有人回复了您的帖子',
      content: '用户「睡眠小助手」回复了您在社区发布的帖子：\n\n💬 原帖标题：关于改善睡眠质量的建议\n📝 回复内容：\n"感谢您的分享！关于您提到的睡前放松方法，我补充几点：\n\n1. 渐进式肌肉放松法效果很好\n2. 4-7-8呼吸法可以帮助快速入睡\n3. 避免睡前使用蓝光设备\n4. 保持卧室温度在18-22℃为宜\n\n希望这些建议对您有帮助！"\n\n👥 社区互动数据：\n• 帖子浏览量：1,245次\n• 点赞数：89次\n• 收藏数：34次\n• 回复数：23条',
      time: '2024-01-13 16:20',
      related: [
        {
          id: 1,
          cover: 'https://picsum.photos/seed/community/80/80',
          name: '睡眠改善讨论',
          desc: '热门话题，参与讨论获得积分'
        },
        {
          id: 2,
          cover: 'https://picsum.photos/seed/topic/80/80',
          name: '健康睡眠指南',
          desc: '专业医生提供的睡眠建议'
        }
      ],
      actions: [
        { id: 1, text: '查看回复', primary: true },
        { id: 2, text: '回复评论' },
        { id: 3, text: '分享帖子' }
      ]
    },
    5: {
      id: 5,
      sender: '活动提醒',
      avatar: '🎉',
      title: '本周六睡眠健康讲座',
      content: '🎯 活动主题：科学睡眠与健康生活\n📅 活动时间：2024-01-20 14:00-16:00\n📍 活动地点：线上直播（会议链接将在活动前发送）\n👨‍🏫 主讲嘉宾：\n• 张医生 - 睡眠医学专家\n• 李教授 - 心理学博士\n• 王营养师 - 健康饮食顾问\n\n📋 讲座内容：\n1. 睡眠周期的科学原理\n2. 常见睡眠问题的解决方法\n3. 饮食与睡眠的关系\n4. 心理健康对睡眠的影响\n5. 现场问答互动环节\n\n🎁 参与福利：\n• 前100名参与者可获得睡眠监测手环\n• 现场抽奖送出10份专业睡眠咨询\n• 所有参与者获得电子版睡眠指南',
      time: '2024-01-12 10:00',
      attachments: [
        {
          id: 1,
          icon: '📅',
          name: '活动日程表.pdf',
          size: '1.2MB'
        },
        {
          id: 2,
          icon: '👥',
          name: '嘉宾介绍.docx',
          size: '890KB'
        }
      ],
      actions: [
        { id: 1, text: '立即报名', primary: true },
        { id: 2, text: '添加到日历' },
        { id: 3, text: '分享活动' }
      ]
    }
  }
  
  return messageMap[messageId] || {
    id: messageId,
    sender: '未知发件人',
    avatar: '❓',
    title: '消息不存在',
    content: '抱歉，该消息不存在或已被删除。',
    time: '未知时间'
  }
}

// 返回上一页
function goBack() {
  try {
    uni.navigateBack()
  } catch(e) {
    if(typeof location !== 'undefined') location.hash = '#/pages/messages/index'
  }
}

// 处理操作按钮
function handleAction() {
  uni.showActionSheet({
    itemList: ['标记为未读', '删除消息', '举报消息'],
    success: (res) => {
      const actions = ['markAsUnread', 'deleteMessage', 'reportMessage']
      const action = actions[res.tapIndex]
      handleMessageAction({ id: action })
    }
  })
}

// 处理消息操作
function handleMessageAction(action) {
  switch(action.id) {
    case 1:
    case '立即体验':
    case '立即播放':
    case '查看详细报告':
    case '查看回复':
    case '立即报名':
      uni.showToast({
        title: `执行操作：${action.text}`,
        icon: 'success'
      })
      break
    case 'markAsUnread':
      uni.showToast({ title: '已标记为未读', icon: 'success' })
      break
    case 'deleteMessage':
      uni.showModal({
        title: '确认删除',
        content: '确定要删除这条消息吗？',
        success: (res) => {
          if (res.confirm) {
            uni.showToast({ title: '消息已删除', icon: 'success' })
            setTimeout(() => {
              goBack()
            }, 1500)
          }
        }
      })
      break
    case 'reportMessage':
      uni.showToast({ title: '已举报该消息', icon: 'success' })
      break
    default:
      uni.showToast({
        title: `操作：${action.text}`,
        icon: 'none'
      })
  }
}

// 处理附件点击
function handleAttachment(attachment) {
  uni.showToast({
    title: `打开附件：${attachment.name}`,
    icon: 'none'
  })
}

// 处理相关推荐点击
function handleRelatedItem(item) {
  uni.showToast({
    title: `打开：${item.name}`,
    icon: 'none'
  })
}

onMounted(() => {
  // 页面加载时的初始化逻辑
})
</script>

<style scoped>
.page { min-height: 100vh; }

/* 顶部导航栏 */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--card-bg, #ffffff);
  border-bottom: 1px solid var(--border, #f0f0f0);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.back-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--input-bg, #f8f9fa);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.back-btn:active {
  transform: scale(0.95);
  opacity: 0.8;
}

.back-icon {
  font-size: 16px;
  font-weight: 600;
  color: var(--fg, #333);
}

.header-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--fg, #333);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.action-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--input-bg, #f8f9fa);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:active {
  transform: scale(0.95);
  opacity: 0.8;
}

.action-icon {
  font-size: 20px;
  font-weight: 600;
  color: var(--fg, #333);
}

/* 消息详情内容 */
.message-detail {
  flex: 1;
  padding: 20px 16px;
}

/* 消息头部 */
.message-header {
  display: flex;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border, #f0f0f0);
}

.message-avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: var(--input-bg, #f8f9fa);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
}

.avatar-symbol {
  font-size: 28px;
}

.message-info {
  flex: 1;
}

.message-sender {
  font-size: 18px;
  font-weight: 600;
  color: var(--fg, #333);
  display: block;
  margin-bottom: 4px;
}

.message-time {
  font-size: 14px;
  color: var(--muted, #999);
}

/* 消息内容 */
.message-content {
  background: var(--card-bg, #ffffff);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.message-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--fg, #333);
  display: block;
  margin-bottom: 16px;
  line-height: 1.4;
}

.message-body {
  font-size: 16px;
  color: var(--fg, #333);
  line-height: 1.6;
  white-space: pre-line;
  margin-bottom: 20px;
}

/* 消息附件 */
.message-attachments {
  margin-bottom: 20px;
}

.attachment-item {
  display: flex;
  align-items: center;
  padding: 12px;
  background: var(--input-bg, #f8f9fa);
  border-radius: 12px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.attachment-item:active {
  transform: scale(0.98);
  background: var(--uni-color-primary, #007aff);
}

.attachment-item:active .attachment-name,
.attachment-item:active .attachment-size {
  color: white;
}

.attachment-icon {
  font-size: 20px;
  margin-right: 12px;
}

.attachment-info {
  flex: 1;
}

.attachment-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--fg, #333);
  display: block;
  margin-bottom: 2px;
}

.attachment-size {
  font-size: 12px;
  color: var(--muted, #999);
}

.download-icon {
  font-size: 16px;
  opacity: 0.7;
}

/* 操作按钮 */
.message-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.action-btn {
  flex: 1;
  min-width: 120px;
  padding: 12px 16px;
  background: var(--input-bg, #f8f9fa);
  border-radius: 12px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.action-btn.primary {
  background: var(--uni-color-primary, #007aff);
  border-color: var(--uni-color-primary, #007aff);
}

.action-btn.primary .action-text {
  color: white;
}

.action-btn:active {
  transform: scale(0.95);
}

.action-text {
  font-size: 14px;
  font-weight: 500;
  color: var(--fg, #333);
}

/* 相关推荐 */
.related-section {
  background: var(--card-bg, #ffffff);
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--fg, #333);
  margin-bottom: 16px;
  display: block;
}

.related-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.related-item {
  display: flex;
  align-items: center;
  padding: 12px;
  background: var(--input-bg, #f8f9fa);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.related-item:active {
  transform: scale(0.98);
  background: var(--uni-color-primary, #007aff);
}

.related-item:active .related-name,
.related-item:active .related-desc {
  color: white;
}

.related-cover {
  width: 50px;
  height: 50px;
  border-radius: 8px;
  margin-right: 12px;
}

.related-info {
  flex: 1;
}

.related-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--fg, #333);
  display: block;
  margin-bottom: 2px;
}

.related-desc {
  font-size: 12px;
  color: var(--muted, #999);
}
</style>