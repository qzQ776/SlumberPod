<template>
  <view class="page" :style="bgStyle">
    <!-- 顶部导航栏 -->
    <view class="header">
      <view class="header-left">
        <view class="back-btn" @click="goBack">
          <text class="back-icon">←</text>
        </view>
        <text class="header-title">分享创作</text>
      </view>
    </view>

    <!-- 分享内容 -->
    <scroll-view class="share-content" scroll-y>
      <!-- 成功提示 -->
      <view class="success-section">
        <view class="success-icon">🎉</view>
        <text class="success-title">创作保存成功！</text>
        <text class="success-desc">您的白噪音作品已成功保存并可以分享到社区</text>
      </view>

      <!-- 作品预览 -->
      <view class="preview-section">
        <text class="section-title">作品预览</text>
        <view class="creation-card">
          <view class="creation-cover">
            <view class="cover-icon">🎵</view>
            <view class="play-overlay" @click="previewAudio">
              <text class="play-icon">▶</text>
            </view>
          </view>
          <view class="creation-info">
            <text class="creation-name">{{ creationData.name }}</text>
            <text class="creation-desc">{{ creationData.description }}</text>
            <view class="creation-meta">
              <text class="meta-item">{{ creationData.categoryName }}</text>
              <text class="meta-item">{{ formatDuration(creationData.duration) }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 分享选项 -->
      <view class="share-section">
        <text class="section-title">分享到</text>
        <view class="share-options">
          <view class="share-option" @click="shareToCommunity">
            <view class="option-icon">👥</view>
            <view class="option-info">
              <text class="option-title">分享到社区</text>
              <text class="option-desc">让其他用户发现您的作品</text>
            </view>
            <view class="option-arrow">→</view>
          </view>

          <view class="share-option" @click="copyShareLink">
            <view class="option-icon">🔗</view>
            <view class="option-info">
              <text class="option-title">复制分享链接</text>
              <text class="option-desc">通过链接分享给朋友</text>
            </view>
            <view class="option-arrow">→</view>
          </view>

          <view class="share-option" @click="downloadAudio">
            <view class="option-icon">⬇️</view>
            <view class="option-info">
              <text class="option-title">下载音频文件</text>
              <text class="option-desc">保存到本地设备</text>
            </view>
            <view class="option-arrow">→</view>
          </view>
        </view>
      </view>

      <!-- 下一步操作 -->
      <view class="action-section">
        <view class="action-btn primary" @click="goToCommunity">
          <text class="btn-text">查看社区</text>
        </view>
        <view class="action-btn secondary" @click="createAnother">
          <text class="btn-text">继续创作</text>
        </view>
        <view class="action-btn outline" @click="goToMyCreations">
          <text class="btn-text">我的创作</text>
        </view>
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

// 从路由参数获取创作数据
const creationData = ref({
  id: '',
  name: '我的白噪音作品',
  description: '这是一段描述文字...',
  category: 'nature',
  categoryName: '自然',
  duration: 120,
  audioUrl: ''
})

onMounted(() => {
  // 从路由参数获取创作ID
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  const options = currentPage.options
  
  if (options.id) {
    creationData.value.id = options.id
    // 模拟从本地存储获取创作数据
    loadCreationData(options.id)
  }
})

// 加载创作数据
function loadCreationData(id) {
  // 模拟从本地存储加载数据
  const savedCreations = uni.getStorageSync('userCreations') || []
  const creation = savedCreations.find(item => item.id === id)
  
  if (creation) {
    creationData.value = { ...creationData.value, ...creation }
  }
}

// 返回上一页
function goBack() {
  try {
    uni.navigateBack()
  } catch(e) {
    if(typeof location !== 'undefined') location.hash = '#/pages/home/index'
  }
}

// 预览音频
function previewAudio() {
  if (!creationData.value.audioUrl) {
    uni.showToast({
      title: '音频文件不存在',
      icon: 'none'
    })
    return
  }
  
  uni.showToast({
    title: '开始播放预览',
    icon: 'none'
  })
  
  // 这里可以集成音频播放器
  // uni.createInnerAudioContext().src = creationData.value.audioUrl
  // uni.createInnerAudioContext().play()
}

// 格式化时长
function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}分${secs}秒`
}

// 分享到社区
function shareToCommunity() {
  uni.showLoading({ title: '分享中...' })
  
  setTimeout(() => {
    uni.hideLoading()
    uni.showToast({
      title: '已分享到社区',
      icon: 'success'
    })
    
    // 更新创作状态为已分享
    updateCreationStatus('shared')
  }, 1500)
}

// 复制分享链接
function copyShareLink() {
  const shareLink = `https://slumberpod.com/share/${creationData.value.id}`
  
  // 模拟复制到剪贴板
  uni.setClipboardData({
    data: shareLink,
    success: () => {
      uni.showToast({
        title: '链接已复制',
        icon: 'success'
      })
    }
  })
}

// 下载音频文件
function downloadAudio() {
  if (!creationData.value.audioUrl) {
    uni.showToast({
      title: '音频文件不存在',
      icon: 'none'
    })
    return
  }
  
  uni.showLoading({ title: '下载中...' })
  
  setTimeout(() => {
    uni.hideLoading()
    uni.showToast({
      title: '下载完成',
      icon: 'success'
    })
  }, 2000)
}

// 更新创作状态
function updateCreationStatus(status) {
  const savedCreations = uni.getStorageSync('userCreations') || []
  const index = savedCreations.findIndex(item => item.id === creationData.value.id)
  
  if (index !== -1) {
    savedCreations[index].status = status
    savedCreations[index].sharedAt = new Date().toISOString()
    uni.setStorageSync('userCreations', savedCreations)
  }
}

// 跳转到社区
function goToCommunity() {
  uni.switchTab({
    url: '/pages/community/index'
  })
}

// 继续创作
function createAnother() {
  uni.navigateTo({
    url: '/pages/creation/index'
  })
}

// 查看我的创作
function goToMyCreations() {
  uni.navigateTo({
    url: '/pages/creations/index'
  })
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.header {
  padding: 20rpx 30rpx;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.back-btn {
  padding: 10rpx;
  border-radius: 10rpx;
  background: rgba(255, 255, 255, 0.2);
}

.back-icon {
  font-size: 36rpx;
  color: white;
}

.header-title {
  font-size: 36rpx;
  font-weight: 600;
  color: white;
}

.share-content {
  height: calc(100vh - 120rpx);
  padding: 30rpx;
}

.success-section {
  text-align: center;
  padding: 60rpx 0;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 20rpx;
  margin-bottom: 40rpx;
}

.success-icon {
  font-size: 80rpx;
  margin-bottom: 20rpx;
}

.success-title {
  display: block;
  font-size: 36rpx;
  font-weight: 600;
  color: white;
  margin-bottom: 10rpx;
}

.success-desc {
  display: block;
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.8);
}

.section-title {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: white;
  margin-bottom: 30rpx;
}

.creation-card {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 20rpx;
  padding: 30rpx;
  display: flex;
  align-items: center;
  gap: 30rpx;
}

.creation-cover {
  position: relative;
  width: 120rpx;
  height: 120rpx;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cover-icon {
  font-size: 48rpx;
}

.play-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s;
}

.creation-cover:hover .play-overlay {
  opacity: 1;
}

.play-icon {
  color: white;
  font-size: 36rpx;
}

.creation-info {
  flex: 1;
}

.creation-name {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: white;
  margin-bottom: 10rpx;
}

.creation-desc {
  display: block;
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 15rpx;
  line-height: 1.4;
}

.creation-meta {
  display: flex;
  gap: 20rpx;
}

.meta-item {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.6);
  background: rgba(255, 255, 255, 0.1);
  padding: 5rpx 15rpx;
  border-radius: 15rpx;
}

.share-options {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 20rpx;
  overflow: hidden;
}

.share-option {
  padding: 30rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
  border-bottom: 1rpx solid rgba(255, 255, 255, 0.1);
}

.share-option:last-child {
  border-bottom: none;
}

.option-icon {
  font-size: 48rpx;
}

.option-info {
  flex: 1;
}

.option-title {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: white;
  margin-bottom: 5rpx;
}

.option-desc {
  display: block;
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.7);
}

.option-arrow {
  font-size: 32rpx;
  color: rgba(255, 255, 255, 0.5);
}

.action-section {
  margin-top: 60rpx;
}

.action-btn {
  padding: 30rpx;
  border-radius: 15rpx;
  text-align: center;
  margin-bottom: 20rpx;
  transition: all 0.3s;
}

.action-btn.primary {
  background: rgba(255, 255, 255, 0.9);
}

.action-btn.secondary {
  background: rgba(255, 255, 255, 0.2);
  border: 2rpx solid rgba(255, 255, 255, 0.5);
}

.action-btn.outline {
  background: transparent;
  border: 2rpx solid rgba(255, 255, 255, 0.3);
}

.btn-text {
  font-size: 32rpx;
  font-weight: 600;
  color: white;
}

.action-btn.primary .btn-text {
  color: #667eea;
}
</style>