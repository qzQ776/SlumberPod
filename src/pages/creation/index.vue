<template>
  <view class="page" :style="bgStyle">
    <!-- 顶部导航栏 -->
    <view class="header">
      <view class="header-left">
        <view class="back-btn" @click="goBack">
          <text class="back-icon">←</text>
        </view>
        <text class="header-title">创作白噪音</text>
      </view>
      <view class="header-right">
        <view class="save-btn" @click="saveCreation" :class="{ disabled: !isValid }" :disabled="!isValid">
          <text class="save-text">保存</text>
        </view>
      </view>
    </view>

    <!-- 创作内容 -->
    <scroll-view class="creation-content" scroll-y>
      <!-- 创作基本信息 -->
      <view class="creation-form">
        <view class="form-section">
          <text class="section-title">基本信息</text>
          <view class="input-group">
            <text class="input-label">作品名称</text>
            <input 
              v-model="creationData.name" 
              class="input" 
              placeholder="请输入作品名称"
              maxlength="20"
            />
            <text class="char-count">{{ creationData.name.length }}/20</text>
          </view>
          
          <view class="input-group">
            <text class="input-label">作品描述</text>
            <textarea 
              v-model="creationData.description" 
              class="textarea" 
              placeholder="描述你的白噪音作品..."
              maxlength="200"
            />
            <text class="char-count">{{ creationData.description.length }}/200</text>
          </view>
          
          <view class="input-group">
            <text class="input-label">作品分类</text>
            <view class="category-tags">
              <view 
                v-for="category in categories" 
                :key="category.id" 
                class="category-tag"
                :class="{ active: creationData.category === category.id }"
                @click="creationData.category = category.id"
              >
                <text class="category-icon">{{ category.icon }}</text>
                <text class="category-name">{{ category.name }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 音频录制 -->
        <view class="form-section">
          <text class="section-title">音频录制</text>
          <view class="recording-section">
            <view class="recording-controls">
              <view class="record-btn" @click="toggleRecording" :class="{ recording: isRecording }">
                <text class="record-icon">{{ isRecording ? '⏹️' : '🎤' }}</text>
                <text class="record-text">{{ isRecording ? '停止录制' : '开始录制' }}</text>
              </view>
              
              <view class="audio-preview" v-if="audioUrl">
                <text class="preview-title">录制预览</text>
                <view class="audio-player">
                  <text class="play-btn" @click="togglePlayback">{{ isPlaying ? '⏸️' : '▶' }}</text>
                  <view class="progress-bar">
                    <view class="progress" :style="{ width: progress + '%' }"></view>
                  </view>
                  <text class="duration">{{ formatTime(currentTime) }}/{{ formatTime(duration) }}</text>
                </view>
              </view>
            </view>
            
            <view class="recording-tips">
              <text class="tip-text">💡 录制提示：</text>
              <text class="tip-desc">• 在安静的环境下录制</text>
              <text class="tip-desc">• 保持设备稳定</text>
              <text class="tip-desc">• 录制时长建议30秒-5分钟</text>
            </view>
          </view>
        </view>

        <!-- 音效混合 -->
        <view class="form-section">
          <text class="section-title">音效混合</text>
          <view class="mixer-section">
            <view class="mixer-controls">
              <view class="mixer-item" v-for="(sound, index) in soundLayers" :key="index">
                <view class="sound-info">
                  <text class="sound-name">{{ sound.name }}</text>
                  <text class="sound-volume">{{ sound.volume }}%</text>
                </view>
                <view class="volume-control">
                  <text class="volume-icon" @click="decreaseVolume(index)">🔉</text>
                  <input 
                    type="range" 
                    v-model="sound.volume" 
                    min="0" 
                    max="100" 
                    class="volume-slider"
                  />
                  <text class="volume-icon" @click="increaseVolume(index)">🔊</text>
                </view>
                <view class="sound-actions">
                  <text class="action-btn" @click="removeSound(index)">🗑️</text>
                </view>
              </view>
            </view>
            
            <view class="add-sound-btn" @click="showSoundLibrary">
              <text class="add-icon">➕</text>
              <text class="add-text">添加音效</text>
            </view>
          </view>
        </view>

        <!-- 分享设置 -->
        <view class="form-section">
          <text class="section-title">分享设置</text>
          <view class="share-settings">
            <view class="setting-item">
              <text class="setting-label">分享到社区</text>
              <view class="switch" @click="creationData.shareToCommunity = !creationData.shareToCommunity">
                <view class="switch-track" :class="{ active: creationData.shareToCommunity }">
                  <view class="switch-thumb" :class="{ active: creationData.shareToCommunity }"></view>
                </view>
              </view>
            </view>
            
            <view class="setting-item">
              <text class="setting-label">设为公开</text>
              <view class="switch" @click="creationData.isPublic = !creationData.isPublic">
                <view class="switch-track" :class="{ active: creationData.isPublic }">
                  <view class="switch-thumb" :class="{ active: creationData.isPublic }"></view>
                </view>
              </view>
            </view>
            
            <view class="setting-item">
              <text class="setting-label">允许下载</text>
              <view class="switch" @click="creationData.allowDownload = !creationData.allowDownload">
                <view class="switch-track" :class="{ active: creationData.allowDownload }">
                  <view class="switch-thumb" :class="{ active: creationData.allowDownload }"></view>
                </view>
              </view>
            </view>
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

// 创作数据
const creationData = ref({
  name: '',
  description: '',
  category: '',
  shareToCommunity: true,
  isPublic: true,
  allowDownload: true
})

// 分类选项
const categories = ref([
  { id: 'nature', name: '自然', icon: '🌿' },
  { id: 'home', name: '居家', icon: '🏠' },
  { id: 'environment', name: '环境', icon: '🏙️' },
  { id: 'instrument', name: '乐器', icon: '🎵' },
  { id: 'other', name: '其他', icon: '🎨' }
])

// 音频录制相关
const isRecording = ref(false)
const isPlaying = ref(false)
const audioUrl = ref('')
const currentTime = ref(0)
const duration = ref(0)
const progress = ref(0)

// 音效混合层
const soundLayers = ref([
  { name: '基础音效', volume: 80 }
])

// 验证表单
const isValid = computed(() => {
  return creationData.value.name.trim() && 
         creationData.value.category && 
         audioUrl.value
})

// 返回上一页
function goBack() {
  try {
    uni.navigateBack()
  } catch(e) {
    if(typeof location !== 'undefined') location.hash = '#/pages/home/index'
  }
}

// 保存创作
function saveCreation() {
  if (!isValid.value) return
  
  uni.showLoading({ title: '保存中...' })
  
  // 模拟保存过程
  setTimeout(() => {
    uni.hideLoading()
    uni.showToast({
      title: '创作保存成功！',
      icon: 'success'
    })
    
    // 如果选择了分享到社区，跳转到分享页面
    if (creationData.value.shareToCommunity) {
      setTimeout(() => {
        uni.navigateTo({
          url: '/pages/creation/share?id=' + Date.now()
        })
      }, 1500)
    } else {
      setTimeout(() => {
        goBack()
      }, 1500)
    }
  }, 2000)
}

// 切换录制状态
function toggleRecording() {
  if (isRecording.value) {
    // 停止录制
    isRecording.value = false
    audioUrl.value = 'https://example.com/audio/' + Date.now() + '.mp3'
    duration.value = 120 // 模拟2分钟音频
  } else {
    // 开始录制
    isRecording.value = true
    uni.showToast({
      title: '开始录制...',
      icon: 'none'
    })
  }
}

// 切换播放状态
function togglePlayback() {
  if (isPlaying.value) {
    isPlaying.value = false
  } else {
    isPlaying.value = true
    // 模拟播放进度更新
    const interval = setInterval(() => {
      if (currentTime.value < duration.value) {
        currentTime.value += 1
        progress.value = (currentTime.value / duration.value) * 100
      } else {
        isPlaying.value = false
        clearInterval(interval)
      }
    }, 1000)
  }
}

// 格式化时间
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// 音量控制
function increaseVolume(index) {
  if (soundLayers.value[index].volume < 100) {
    soundLayers.value[index].volume += 10
  }
}

function decreaseVolume(index) {
  if (soundLayers.value[index].volume > 0) {
    soundLayers.value[index].volume -= 10
  }
}

function removeSound(index) {
  soundLayers.value.splice(index, 1)
}

// 显示音效库
function showSoundLibrary() {
  uni.showActionSheet({
    itemList: ['雨声', '海浪', '风声', '鸟鸣', '键盘声', '城市噪音'],
    success: (res) => {
      const sounds = ['雨声', '海浪', '风声', '鸟鸣', '键盘声', '城市噪音']
      soundLayers.value.push({
        name: sounds[res.tapIndex],
        volume: 50
      })
    }
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

.save-btn {
  padding: 8px 16px;
  background: var(--uni-color-primary, #007aff);
  color: white;
  border-radius: 16px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.save-btn.disabled {
  background: var(--muted, #ccc);
  opacity: 0.6;
  cursor: not-allowed;
}

.save-btn:not(.disabled):active {
  transform: scale(0.95);
}

.save-text {
  font-weight: 500;
}

/* 创作内容 */
.creation-content {
  flex: 1;
  padding: 16px;
}

.creation-form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-section {
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

.input-group {
  margin-bottom: 20px;
}

.input-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--fg, #333);
  display: block;
  margin-bottom: 8px;
}

.input, .textarea {
  width: 100%;
  background: var(--input-bg, #f8f9fa);
  border: 2px solid var(--border, #f0f0f0);
  border-radius: 12px;
  padding: 12px 16px;
  font-size: 14px;
  color: var(--fg, #333);
  outline: none;
  transition: all 0.2s;
}

.input:focus, .textarea:focus {
  border-color: var(--uni-color-primary, #007aff);
}

.textarea {
  min-height: 80px;
  resize: none;
}

.char-count {
  font-size: 12px;
  color: var(--muted, #999);
  text-align: right;
  display: block;
  margin-top: 4px;
}

/* 分类标签 */
.category-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.category-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: var(--input-bg, #f8f9fa);
  border: 2px solid transparent;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s;
}

.category-tag.active {
  background: var(--uni-color-primary, #007aff);
  border-color: var(--uni-color-primary, #007aff);
}

.category-tag.active .category-name {
  color: white;
}

.category-tag:active {
  transform: scale(0.95);
}

.category-icon {
  font-size: 14px;
}

.category-name {
  font-size: 12px;
  font-weight: 500;
  color: var(--fg, #333);
}

/* 录制控制 */
.recording-controls {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.record-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: var(--input-bg, #f8f9fa);
  border: 2px solid var(--border, #f0f0f0);
  border-radius: 25px;
  cursor: pointer;
  transition: all 0.2s;
}

.record-btn.recording {
  background: #ff3b30;
  border-color: #ff3b30;
  color: white;
}

.record-btn:active {
  transform: scale(0.95);
}

.record-icon {
  font-size: 16px;
}

.record-text {
  font-size: 14px;
  font-weight: 500;
}

.audio-preview {
  background: var(--input-bg, #f8f9fa);
  border-radius: 12px;
  padding: 16px;
}

.preview-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--fg, #333);
  display: block;
  margin-bottom: 12px;
}

.audio-player {
  display: flex;
  align-items: center;
  gap: 12px;
}

.play-btn {
  font-size: 20px;
  cursor: pointer;
  transition: all 0.2s;
}

.play-btn:active {
  transform: scale(0.9);
}

.progress-bar {
  flex: 1;
  height: 4px;
  background: var(--border, #f0f0f0);
  border-radius: 2px;
  overflow: hidden;
}

.progress {
  height: 100%;
  background: var(--uni-color-primary, #007aff);
  transition: width 0.3s;
}

.duration {
  font-size: 12px;
  color: var(--muted, #999);
  min-width: 80px;
}

.recording-tips {
  background: rgba(0, 122, 255, 0.05);
  border-radius: 12px;
  padding: 12px;
  margin-top: 12px;
}

.tip-text {
  font-size: 12px;
  font-weight: 500;
  color: var(--uni-color-primary, #007aff);
  display: block;
  margin-bottom: 6px;
}

.tip-desc {
  font-size: 11px;
  color: var(--muted, #666);
  display: block;
  line-height: 1.4;
}

/* 音效混合器 */
.mixer-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--input-bg, #f8f9fa);
  border-radius: 12px;
  margin-bottom: 8px;
}

.sound-info {
  flex: 1;
  min-width: 0;
}

.sound-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--fg, #333);
  display: block;
  margin-bottom: 2px;
}

.sound-volume {
  font-size: 12px;
  color: var(--muted, #999);
}

.volume-control {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 2;
}

.volume-icon {
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.volume-icon:active {
  transform: scale(0.9);
}

.volume-slider {
  flex: 1;
  height: 4px;
  background: var(--border, #f0f0f0);
  border-radius: 2px;
  outline: none;
}

.sound-actions {
  margin-left: auto;
}

.action-btn {
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:active {
  transform: scale(0.9);
}

.add-sound-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: var(--input-bg, #f8f9fa);
  border: 2px dashed var(--border, #f0f0f0);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  justify-content: center;
}

.add-sound-btn:active {
  transform: scale(0.95);
  border-color: var(--uni-color-primary, #007aff);
}

.add-icon {
  font-size: 14px;
}

.add-text {
  font-size: 14px;
  color: var(--muted, #666);
}

/* 分享设置 */
.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--border, #f0f0f0);
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-label {
  font-size: 14px;
  color: var(--fg, #333);
}

.switch {
  cursor: pointer;
}

.switch-track {
  width: 44px;
  height: 24px;
  background: var(--border, #f0f0f0);
  border-radius: 12px;
  position: relative;
  transition: all 0.3s;
}

.switch-track.active {
  background: var(--uni-color-primary, #007aff);
}

.switch-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  background: white;
  border-radius: 50%;
  transition: all 0.3s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.switch-thumb.active {
  left: 22px;
}
</style>