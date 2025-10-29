<template>
  <view class="page" :style="bgStyle">
    <!-- 顶部导航栏 -->
    <view class="header">
      <view class="header-left">
        <view class="back-btn" @click="goBack">
          <text class="back-icon">←</text>
        </view>
        <text class="header-title">我的创作</text>
      </view>
      <view class="header-right">
        <view class="create-btn" @click="goToCreation">
          <text class="create-text">新建</text>
        </view>
      </view>
    </view>

    <!-- 创作列表 -->
    <scroll-view class="creations-content" scroll-y>
      <!-- 统计信息 -->
      <view class="stats-section">
        <view class="stat-item">
          <text class="stat-number">{{ creations.length }}</text>
          <text class="stat-label">总创作数</text>
        </view>
        <view class="stat-item">
          <text class="stat-number">{{ sharedCount }}</text>
          <text class="stat-label">已分享</text>
        </view>
        <view class="stat-item">
          <text class="stat-number">{{ likesCount }}</text>
          <text class="stat-label">获赞数</text>
        </view>
      </view>

      <!-- 筛选标签 -->
      <view class="filter-section">
        <view 
          v-for="filter in filters" 
          :key="filter.key"
          class="filter-tag"
          :class="{ active: activeFilter === filter.key }"
          @click="setFilter(filter.key)"
        >
          <text class="filter-text">{{ filter.label }}</text>
        </view>
      </view>

      <!-- 创作列表 -->
      <view class="creations-list">
        <view 
          v-for="creation in filteredCreations" 
          :key="creation.id"
          class="creation-item"
          @click="viewCreation(creation)"
        >
          <view class="creation-cover">
            <view class="cover-icon">🎵</view>
            <view class="creation-status" :class="creation.status">
              <text class="status-text">{{ getStatusText(creation.status) }}</text>
            </view>
          </view>
          <view class="creation-info">
            <view class="creation-header">
              <text class="creation-name">{{ creation.name }}</text>
              <view class="creation-actions">
                <view class="action-btn" @click.stop="editCreation(creation)">
                  <text class="action-icon">✏️</text>
                </view>
                <view class="action-btn" @click.stop="deleteCreation(creation)">
                  <text class="action-icon">🗑️</text>
                </view>
              </view>
            </view>
            <text class="creation-desc">{{ creation.description }}</text>
            <view class="creation-meta">
              <text class="meta-item">{{ creation.categoryName }}</text>
              <text class="meta-item">{{ formatDuration(creation.duration) }}</text>
              <text class="meta-item">{{ formatDate(creation.createdAt) }}</text>
            </view>
            <view class="creation-stats">
              <view class="stat">
                <text class="stat-icon">👁️</text>
                <text class="stat-value">{{ creation.views || 0 }}</text>
              </view>
              <view class="stat">
                <text class="stat-icon">❤️</text>
                <text class="stat-value">{{ creation.likes || 0 }}</text>
              </view>
              <view class="stat">
                <text class="stat-icon">💬</text>
                <text class="stat-value">{{ creation.comments || 0 }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 空状态 -->
        <view class="empty-state" v-if="filteredCreations.length === 0">
          <view class="empty-icon">🎨</view>
          <text class="empty-title">暂无创作</text>
          <text class="empty-desc">开始创作您的第一个白噪音作品吧！</text>
          <view class="empty-action" @click="goToCreation">
            <text class="action-text">开始创作</text>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useGlobalTheme } from '@/composables/useGlobalTheme'
import { useThemeStore } from '@/stores/theme'

const themeStore = useThemeStore(); themeStore.load()
const { bgStyle } = useGlobalTheme()

// 筛选选项
const filters = ref([
  { key: 'all', label: '全部' },
  { key: 'draft', label: '草稿' },
  { key: 'published', label: '已发布' },
  { key: 'shared', label: '已分享' }
])

const activeFilter = ref('all')

// 创作数据
const creations = ref([])

// 计算属性
const filteredCreations = computed(() => {
  if (activeFilter.value === 'all') {
    return creations.value
  }
  return creations.value.filter(creation => creation.status === activeFilter.value)
})

const sharedCount = computed(() => {
  return creations.value.filter(creation => creation.status === 'shared').length
})

const likesCount = computed(() => {
  return creations.value.reduce((total, creation) => total + (creation.likes || 0), 0)
})

onMounted(() => {
  loadCreations()
})

// 加载创作数据
function loadCreations() {
  // 模拟从本地存储加载数据
  const savedCreations = uni.getStorageSync('userCreations') || []
  
  // 如果没有数据，显示示例数据
  if (savedCreations.length === 0) {
    creations.value = [
      {
        id: '1',
        name: '雨夜沉思',
        description: '雨声与轻柔的背景音乐',
        category: 'nature',
        categoryName: '自然',
        duration: 180,
        status: 'published',
        createdAt: new Date('2024-01-15').toISOString(),
        views: 156,
        likes: 23,
        comments: 5
      },
      {
        id: '2',
        name: '城市清晨',
        description: '清晨的城市环境音',
        category: 'environment',
        categoryName: '环境',
        duration: 120,
        status: 'draft',
        createdAt: new Date('2024-01-20').toISOString(),
        views: 0,
        likes: 0,
        comments: 0
      }
    ]
  } else {
    creations.value = savedCreations
  }
}

// 返回上一页
function goBack() {
  try {
    uni.navigateBack()
  } catch(e) {
    if(typeof location !== 'undefined') location.hash = '#/pages/profile/index'
  }
}

// 设置筛选
function setFilter(filter) {
  activeFilter.value = filter
}

// 获取状态文本
function getStatusText(status) {
  const statusMap = {
    'draft': '草稿',
    'published': '已发布',
    'shared': '已分享'
  }
  return statusMap[status] || '未知'
}

// 格式化时长
function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}分${secs}秒`
}

// 格式化日期
function formatDate(dateString) {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 7) return `${days}天前`
  if (days < 30) return `${Math.floor(days / 7)}周前`
  
  return date.toLocaleDateString('zh-CN', { 
    month: 'short', 
    day: 'numeric' 
  })
}

// 查看创作详情
function viewCreation(creation) {
  uni.navigateTo({
    url: `/pages/creation/detail?id=${creation.id}`
  })
}

// 编辑创作
function editCreation(creation) {
  uni.navigateTo({
    url: `/pages/creation/edit?id=${creation.id}`
  })
}

// 删除创作
function deleteCreation(creation) {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除创作"${creation.name}"吗？此操作不可恢复。`,
    success: (res) => {
      if (res.confirm) {
        // 从本地存储删除
        const savedCreations = uni.getStorageSync('userCreations') || []
        const updatedCreations = savedCreations.filter(item => item.id !== creation.id)
        uni.setStorageSync('userCreations', updatedCreations)
        
        // 更新列表
        creations.value = creations.value.filter(item => item.id !== creation.id)
        
        uni.showToast({
          title: '删除成功',
          icon: 'success'
        })
      }
    }
  })
}

// 跳转到创作页面
function goToCreation() {
  uni.navigateTo({
    url: '/pages/creation/index'
  })
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: var(--bg, #f8f9fa);
}

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

.create-btn {
  padding: 8px 16px;
  background: var(--uni-color-primary, #007aff);
  color: white;
  border-radius: 16px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.create-btn:active {
  transform: scale(0.95);
}

.create-text {
  font-weight: 500;
}

.creations-content {
  flex: 1;
  padding: 16px;
}

.stats-section {
  display: flex;
  justify-content: space-around;
  background: var(--card-bg, #ffffff);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.stat-item {
  text-align: center;
}

.stat-number {
  display: block;
  font-size: 24px;
  font-weight: 600;
  color: var(--uni-color-primary, #007aff);
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: var(--muted, #666);
}

.filter-section {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.filter-tag {
  padding: 6px 12px;
  background: var(--input-bg, #f8f9fa);
  border: 1px solid var(--border, #f0f0f0);
  border-radius: 16px;
  font-size: 12px;
  color: var(--muted, #666);
  cursor: pointer;
  transition: all 0.2s;
}

.filter-tag.active {
  background: var(--uni-color-primary, #007aff);
  border-color: var(--uni-color-primary, #007aff);
  color: white;
}

.filter-tag:active {
  transform: scale(0.95);
}

.filter-text {
  font-weight: 500;
}

.creations-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.creation-item {
  background: var(--card-bg, #ffffff);
  border-radius: 16px;
  padding: 16px;
  display: flex;
  gap: 12px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.creation-item:active {
  transform: scale(0.98);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

.creation-cover {
  position: relative;
  width: 80px;
  height: 80px;
  background: var(--input-bg, #f8f9fa);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.cover-icon {
  font-size: 32px;
}

.creation-status {
  position: absolute;
  top: 4px;
  right: 4px;
  padding: 2px 6px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 500;
}

.creation-status.draft {
  background: #ffd700;
  color: #333;
}

.creation-status.published {
  background: #34c759;
  color: white;
}

.creation-status.shared {
  background: #007aff;
  color: white;
}

.status-text {
  font-size: 10px;
}

.creation-info {
  flex: 1;
  min-width: 0;
}

.creation-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.creation-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--fg, #333);
  flex: 1;
  margin-right: 8px;
}

.creation-actions {
  display: flex;
  gap: 4px;
}

.action-btn {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--input-bg, #f8f9fa);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:active {
  transform: scale(0.9);
}

.action-icon {
  font-size: 12px;
}

.creation-desc {
  font-size: 14px;
  color: var(--muted, #666);
  line-height: 1.4;
  margin-bottom: 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.creation-meta {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.meta-item {
  font-size: 12px;
  color: var(--muted, #999);
  background: var(--input-bg, #f8f9fa);
  padding: 2px 8px;
  border-radius: 10px;
}

.creation-stats {
  display: flex;
  gap: 12px;
}

.stat {
  display: flex;
  align-items: center;
  gap: 4px;
}

.stat-icon {
  font-size: 12px;
}

.stat-value {
  font-size: 12px;
  color: var(--muted, #666);
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  background: var(--card-bg, #ffffff);
  border-radius: 16px;
  margin-top: 40px;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-title {
  display: block;
  font-size: 18px;
  font-weight: 600;
  color: var(--fg, #333);
  margin-bottom: 8px;
}

.empty-desc {
  display: block;
  font-size: 14px;
  color: var(--muted, #666);
  margin-bottom: 20px;
}

.empty-action {
  display: inline-block;
  padding: 10px 20px;
  background: var(--uni-color-primary, #007aff);
  color: white;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.empty-action:active {
  transform: scale(0.95);
}

.action-text {
  font-weight: 500;
}
</style>