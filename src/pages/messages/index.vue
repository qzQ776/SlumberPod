<template>
  <view class="page" :style="bgStyle">
    <!-- 顶部导航栏 -->
    <view class="header">
      <view class="header-left">
        <view class="back-btn" @click="goBack">
          <text class="back-icon">←</text>
        </view>
        <text class="header-title">消息</text>
      </view>
      <view class="header-right">
        <view class="search-icon" @click="goToSearch">
          <text class="search-symbol">🔍</text>
        </view>
      </view>
    </view>

    <!-- 消息列表 -->
    <scroll-view class="message-list" scroll-y>
      <view 
        v-for="message in messages" 
        :key="message.id" 
        class="message-item"
        :class="{ unread: !message.read }"
        @click="openMessage(message)"
      >
        <view class="message-avatar">
          <text class="avatar-symbol">{{ message.avatar }}</text>
        </view>
        <view class="message-content">
          <view class="message-header">
            <text class="message-sender">{{ message.sender }}</text>
            <text class="message-time">{{ message.time }}</text>
          </view>
          <text class="message-preview">{{ message.preview }}</text>
        </view>
        <view v-if="!message.read" class="unread-dot"></view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useGlobalTheme } from '@/composables/useGlobalTheme'
import { useThemeStore } from '@/stores/theme'

const themeStore = useThemeStore(); themeStore.load()
const { bgStyle } = useGlobalTheme()

// 消息数据
const messages = ref([
  {
    id: 1,
    sender: '系统通知',
    avatar: '📢',
    preview: '欢迎使用SlumberPod！新版本已上线，快来体验吧～',
    time: '12:30',
    read: false
  },
  {
    id: 2,
    sender: '白噪音推荐',
    avatar: '🎵',
    preview: '为您推荐：雨声白噪音，帮助您更好地入睡',
    time: '昨天',
    read: false
  },
  {
    id: 3,
    sender: '睡眠报告',
    avatar: '📊',
    preview: '您的睡眠质量分析报告已生成，点击查看详情',
    time: '前天',
    read: true
  },
  {
    id: 4,
    sender: '社区互动',
    avatar: '👥',
    preview: '有人回复了您的帖子：关于改善睡眠的建议',
    time: '3天前',
    read: true
  },
  {
    id: 5,
    sender: '活动提醒',
    avatar: '🎉',
    preview: '本周六有睡眠健康讲座，欢迎参加！',
    time: '1周前',
    read: true
  }
])

// 返回上一页
function goBack() {
  try {
    uni.navigateBack()
  } catch(e) {
    if(typeof location !== 'undefined') location.hash = '#/pages/home/index'
  }
}

// 跳转到搜索页面
function goToSearch() {
  try {
    uni.navigateTo({ url: '/pages/search/index' })
  } catch(e) {
    if(typeof location !== 'undefined') location.hash = '#/pages/search/index'
  }
}

// 打开消息详情
function openMessage(message) {
  if (!message.read) {
    message.read = true
  }
  // 跳转到消息详情页面
  try {
    uni.navigateTo({ 
      url: `/pages/messages/detail?id=${message.id}` 
    })
  } catch(e) {
    if(typeof location !== 'undefined') location.hash = `#/pages/messages/detail?id=${message.id}`
  }
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

.search-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--input-bg, #f8f9fa);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.search-icon:active {
  transform: scale(0.95);
  opacity: 0.8;
}

.search-symbol {
  font-size: 16px;
}

/* 消息列表 */
.message-list {
  flex: 1;
  padding: 0;
}

.message-item {
  display: flex;
  align-items: center;
  padding: 16px;
  background: var(--card-bg, #ffffff);
  border-bottom: 1px solid var(--border, #f0f0f0);
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.message-item:active {
  background: var(--input-bg, #f8f9fa);
}

.message-item.unread {
  background: rgba(0, 122, 255, 0.05);
}

.message-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--input-bg, #f8f9fa);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  flex-shrink: 0;
}

.avatar-symbol {
  font-size: 20px;
}

.message-content {
  flex: 1;
  min-width: 0;
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.message-sender {
  font-size: 16px;
  font-weight: 600;
  color: var(--fg, #333);
}

.message-time {
  font-size: 12px;
  color: var(--muted, #999);
}

.message-preview {
  font-size: 14px;
  color: var(--muted, #666);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.unread-dot {
  position: absolute;
  top: 50%;
  right: 16px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ff3b30;
  transform: translateY(-50%);
}
</style>