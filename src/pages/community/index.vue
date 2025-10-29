<template>
  <view class="page">
    <!-- 顶部导航栏 -->
    <view class="nav-header">
      <view class="nav-tabs">
        <text 
          v-for="tab in tabs" 
          :key="tab" 
          :class="['nav-tab', tab === activeTab ? 'active' : '']"
          @click="switchTab(tab)"
        >
          {{ tab }}
        </text>
      </view>
      <view class="nav-actions">
        <button class="nav-btn" @click="showSearch">
          <text class="nav-icon">🔍</text>
        </button>
        <button class="nav-btn" @click="showMessages">
          <text class="nav-icon">✉</text>
        </button>
      </view>
    </view>

    <!-- 内容区域 -->
    <scroll-view class="content" scroll-y :style="bgStyle">
      <view class="section">
        <CommunityComposer @submit="createPost" />
        
        <!-- 帖子列表 -->
        <view v-if="filteredPosts.length > 0">
          <PostCard 
            v-for="post in filteredPosts" 
            :key="post.id" 
            :post="post" 
            @like="onLike" 
            @comment="onComment" 
          />
        </view>
        
        <!-- 空状态 -->
        <view v-else class="empty-state">
          <text class="empty-icon">💭</text>
          <text class="empty-text">暂无内容，快来发布第一条动态吧！</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import CommunityComposer from '@/components/CommunityComposer.vue'
import PostCard from '@/components/PostCard.vue'
import { useGlobalTheme } from '@/composables/useGlobalTheme'
import { useThemeStore } from '@/stores/theme'
import CommunityService from '../../server/communityService.js'

const themeStore = useThemeStore()
themeStore.load()
const { bgStyle } = useGlobalTheme()

// 导航标签
const tabs = ['关注', '综合', '最新']
const activeTab = ref('最新') // 默认选中"最新"

// 帖子数据
const posts = ref([])
const loading = ref(false)
const currentPage = ref(1)
const hasMore = ref(true)

// 加载帖子数据
const loadPosts = async (page = 1) => {
  if (loading.value) return
  
  loading.value = true
  try {
    const result = await CommunityService.getPosts(page, 20)
    
    if (page === 1) {
      posts.value = result.data.map(post => ({
        id: post.id,
        time: this.formatTime(post.created_at),
        content: post.content,
        image: post.image_urls?.[0] || '',
        likes: post.like_count || 0,
        comments: [], // 评论数据需要单独获取
        author: {
          name: post.profiles?.username || '匿名用户',
          avatar: post.profiles?.avatar_url || '/static/images/default-avatar.jpg'
        }
      }))
    } else {
      posts.value = [...posts.value, ...result.data.map(post => ({
        id: post.id,
        time: this.formatTime(post.created_at),
        content: post.content,
        image: post.image_urls?.[0] || '',
        likes: post.like_count || 0,
        comments: [],
        author: {
          name: post.profiles?.username || '匿名用户',
          avatar: post.profiles?.avatar_url || '/static/images/default-avatar.jpg'
        }
      }))]
    }
    
    hasMore.value = result.data.length === 20
    currentPage.value = page
    
  } catch (error) {
    console.error('加载帖子失败:', error)
    uni.showToast({
      title: '加载失败，请重试',
      icon: 'none'
    })
    
    // 降级处理：使用模拟数据
    if (posts.value.length === 0) {
      posts.value = [
  { 
    id: 'p1', 
    time: '刚刚', 
    content: '昨晚试了雨声+树林组合，很快入睡。推荐给失眠的朋友们！', 
    image: 'https://picsum.photos/seed/p1/800/400', 
    likes: 12, 
    comments: [
      { id: 'c1', content: '这个组合确实不错！', author: { name: 'Dreamer', avatar: 'https://picsum.photos/seed/d1/100' } }
    ], 
    author: { name: 'Sleepy', avatar: 'https://picsum.photos/seed/a1/100' } 
  },
  { 
    id: 'p2', 
    time: '1小时前', 
    content: '有谁用过壁炉声？感觉很温暖~ 特别是冬天的时候', 
    image: '', 
    likes: 7, 
    comments: [], 
    author: { name: 'Cozy', avatar: 'https://picsum.photos/seed/a2/100' } 
  },
  { 
    id: 'p3', 
    time: '3小时前', 
    content: '分享一个助眠技巧：睡前30分钟关闭电子设备，配合海浪声效果更佳', 
    image: 'https://picsum.photos/seed/p3/800/400', 
    likes: 25, 
    comments: [
      { id: 'c2', content: '学到了！今晚试试', author: { name: 'Relax', avatar: 'https://picsum.photos/seed/r1/100' } },
      { id: 'c3', content: '确实有效，已经坚持一周了', author: { name: 'Peace', avatar: 'https://picsum.photos/seed/p2/100' } }
    ], 
    author: { name: 'Expert', avatar: 'https://picsum.photos/seed/a3/100' } 
  }
])

// 计算属性：根据当前标签筛选帖子
const filteredPosts = computed(() => {
  let result = [...posts.value]
  
  switch (activeTab.value) {
    case '关注':
      // 模拟关注列表
      result = result.filter(post => ['Sleepy', 'Expert'].includes(post.author.name))
      break
    case '综合':
      // 综合排序：按热度（点赞数+评论数）
      result.sort((a, b) => {
        const aScore = a.likes + a.comments.length
        const bScore = b.likes + b.comments.length
        return bScore - aScore
      })
      break
    case '最新':
      // 按时间倒序（最新在前）
      result.sort((a, b) => {
        const timeMap = { '刚刚': 0, '1小时前': 1, '3小时前': 3 }
        return timeMap[a.time] - timeMap[b.time]
      })
      break
  }
  
  return result
})

// 方法
function switchTab(tab) {
  activeTab.value = tab
}

function showSearch() {
  uni.showToast({
    title: '搜索功能开发中',
    icon: 'none'
  })
}

function showMessages() {
  uni.showToast({
    title: '消息功能开发中',
    icon: 'none'
  })
}

function onLike(id) { 
  const post = posts.value.find(x => x.id === id)
  if (post) {
    post.likes++
    uni.showToast({ title: '点赞成功', icon: 'success' })
  }
}

function onComment(id) { 
  uni.showModal({
    title: '添加评论',
    editable: true,
    placeholderText: '请输入评论内容',
    success: (res) => {
      if (res.confirm && res.content) {
        const post = posts.value.find(x => x.id === id)
        if (post) {
          post.comments.push({
            id: `c${Date.now()}`,
            content: res.content,
            author: { name: '我', avatar: 'https://picsum.photos/seed/me/100' }
          })
          uni.showToast({ title: '评论成功', icon: 'success' })
        }
      }
    }
  })
}

function createPost(data) {
  const id = `p${Date.now()}`
  posts.value.unshift({ 
    id, 
    time: '刚刚', 
    content: data.content, 
    image: data.image || '', 
    likes: 0, 
    comments: [], 
    author: { name: '我', avatar: 'https://picsum.photos/seed/me/100' } 
  })
  uni.showToast({ title: '发布成功', icon: 'success' })
}

onMounted(() => {
  // 初始化操作
})
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--bg-color, #f5f5f5);
}

/* 顶部导航栏 */
.nav-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
  box-shadow: 0 1px 4px rgba(0,0,0,0.05);
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-tabs {
  display: flex;
  gap: 24px;
  flex: 1;
}

.nav-tab {
  padding: 8px 0;
  font-size: 16px;
  font-weight: 500;
  color: #666;
  position: relative;
  transition: color 0.3s;
}

.nav-tab.active {
  color: #007aff;
  font-weight: 600;
}

.nav-tab.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: #007aff;
  border-radius: 1px;
}

.nav-actions {
  display: flex;
  gap: 12px;
}

.nav-btn {
  background: none;
  border: none;
  padding: 6px;
  border-radius: 6px;
  transition: background 0.2s;
}

.nav-btn:active {
  background: #f5f5f5;
}

.nav-icon {
  font-size: 18px;
}

/* 内容区域 */
.content {
  flex: 1;
  min-height: 0;
}

.section {
  padding: 16px;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-text {
  color: #999;
  font-size: 14px;
}
</style>
