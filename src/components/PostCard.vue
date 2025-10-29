<template>
  <view class="post">
    <!-- 用户信息区域 -->
    <view class="header">
      <image class="avatar" :src="post.author.avatar" @click="viewProfile" />
      <view class="author-info">
        <text class="name">{{ post.author.name }}</text>
        <text class="time">{{ post.time }}</text>
      </view>
      <view class="more-actions">
        <button class="more-btn" @click="showMoreActions">⋯</button>
      </view>
    </view>
    
    <!-- 内容区域 -->
    <view class="content-area">
      <text class="content" @click="viewDetail">{{ post.content }}</text>
      
      <!-- 图片展示 -->
      <view v-if="post.image" class="image-container">
        <image 
          class="post-image" 
          :src="post.image" 
          mode="aspectFill" 
          @click="previewImage"
        />
      </view>
      
      <!-- 话题标签 -->
      <view v-if="hasTopics" class="topics">
        <text 
          v-for="topic in extractTopics(post.content)" 
          :key="topic" 
          class="topic-tag"
          @click="searchTopic(topic)"
        >
          {{ topic }}
        </text>
      </view>
    </view>
    
    <!-- 互动区域 -->
    <view class="actions">
      <view class="action-group">
        <button 
          class="action-btn" 
          :class="{ liked: isLiked }" 
          @click="handleLike"
        >
          <text class="action-icon">{{ isLiked ? '❤️' : '🤍' }}</text>
          <text class="action-count">{{ post.likes }}</text>
        </button>
        
        <button class="action-btn" @click="handleComment">
          <text class="action-icon">💬</text>
          <text class="action-count">{{ post.comments.length }}</text>
        </button>
        
        <button class="action-btn" @click="handleShare">
          <text class="action-icon">↗️</text>
          <text class="action-text">分享</text>
        </button>
      </view>
      
      <view class="stats">
        <text class="stat-text">{{ post.comments.length }}条评论</text>
        <text class="stat-text">·</text>
        <text class="stat-text">{{ post.likes }}个赞</text>
      </view>
    </view>
    
    <!-- 评论预览 -->
    <view v-if="post.comments.length > 0" class="comments-preview">
      <view 
        v-for="comment in post.comments.slice(0, 2)" 
        :key="comment.id" 
        class="comment-item"
      >
        <text class="comment-author">{{ comment.author.name }}：</text>
        <text class="comment-content">{{ comment.content }}</text>
      </view>
      <text 
        v-if="post.comments.length > 2" 
        class="view-all-comments"
        @click="viewDetail"
      >
        查看全部{{ post.comments.length }}条评论
      </text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({ 
  post: { 
    type: Object, 
    required: true 
  } 
})

const emit = defineEmits(['like', 'comment', 'share'])

const isLiked = ref(false)

// 计算属性
const hasTopics = computed(() => {
  return extractTopics(props.post.content).length > 0
})

// 方法
function extractTopics(content) {
  const topicRegex = /#([^#\s]+)#/g
  const matches = content.match(topicRegex) || []
  return matches.slice(0, 3) // 最多显示3个话题
}

function handleLike() {
  isLiked.value = !isLiked.value
  emit('like', props.post.id)
}

function handleComment() {
  emit('comment', props.post.id)
}

function handleShare() {
  emit('share', props.post.id)
}

function viewProfile() {
  uni.navigateTo({
    url: `/pages/profile/index?userId=${props.post.author.name}`
  })
}

function viewDetail() {
  uni.navigateTo({
    url: `/pages/community/detail?id=${props.post.id}`
  })
}

function previewImage() {
  if (props.post.image) {
    uni.previewImage({
      urls: [props.post.image]
    })
  }
}

function searchTopic(topic) {
  uni.navigateTo({
    url: `/pages/community/search?keyword=${encodeURIComponent(topic)}`
  })
}

function showMoreActions() {
  uni.showActionSheet({
    itemList: ['举报', '不感兴趣', '收藏'],
    success: (res) => {
      switch (res.tapIndex) {
        case 0:
          uni.showToast({ title: '举报成功', icon: 'success' })
          break
        case 1:
          uni.showToast({ title: '已标记', icon: 'success' })
          break
        case 2:
          uni.showToast({ title: '收藏成功', icon: 'success' })
          break
      }
    }
  })
}
</script>

<style scoped>
.post { 
  background: #fff; 
  border-radius: 12px; 
  padding: 16px; 
  margin-bottom: 16px; 
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  transition: transform 0.2s;
}

.post:active {
  transform: scale(0.98);
}

/* 头部区域 */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  margin-right: 12px;
}

.author-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.name {
  font-weight: 600;
  color: #333;
  font-size: 14px;
  margin-bottom: 2px;
}

.time {
  font-size: 12px;
  color: #999;
}

.more-btn {
  background: none;
  border: none;
  font-size: 18px;
  color: #999;
  padding: 4px;
}

/* 内容区域 */
.content-area {
  margin-bottom: 16px;
}

.content {
  color: #333;
  font-size: 15px;
  line-height: 1.5;
  margin-bottom: 12px;
  display: block;
}

.image-container {
  margin: 12px 0;
}

.post-image {
  width: 100%;
  height: 200px;
  border-radius: 8px;
}

.topics {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.topic-tag {
  color: #007aff;
  font-size: 13px;
  padding: 4px 8px;
  background: #f0f7ff;
  border-radius: 12px;
}

/* 互动区域 */
.actions {
  border-top: 1px solid #f0f0f0;
  border-bottom: 1px solid #f0f0f0;
  padding: 12px 0;
  margin-bottom: 12px;
}

.action-group {
  display: flex;
  justify-content: space-around;
  margin-bottom: 8px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  transition: background 0.2s;
}

.action-btn:active {
  background: #f5f5f5;
}

.action-btn.liked {
  color: #ff3852;
}

.action-icon {
  font-size: 16px;
}

.action-count, .action-text {
  font-size: 13px;
  color: #666;
}

.action-btn.liked .action-count {
  color: #ff3852;
}

.stats {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.stat-text {
  font-size: 12px;
  color: #999;
}

/* 评论预览 */
.comments-preview {
  padding-top: 8px;
}

.comment-item {
  display: flex;
  margin-bottom: 6px;
  font-size: 13px;
  line-height: 1.4;
}

.comment-author {
  color: #007aff;
  font-weight: 500;
  margin-right: 4px;
}

.comment-content {
  color: #333;
  flex: 1;
}

.view-all-comments {
  color: #999;
  font-size: 12px;
  margin-top: 4px;
  display: block;
}
</style>
