<template>
  <scroll-view class="page" scroll-y :style="bgStyle">
    <!-- 顶部导航栏 -->
    <view class="header">
      <SearchBar />
      <view class="header-right">
        <!-- 消息图标 -->
        <view class="message-icon" @click="goToMessages">
          <text class="message-badge" v-if="unreadCount > 0">{{ unreadCount > 99 ? '99+' : unreadCount }}</text>
          <text class="message-symbol">💬</text>
        </view>
        
        <!-- 播放器图标 -->
        <view v-if="currentTrack" class="playing-icon" @click="goToPlayer">
          <image class="cover" :src="currentTrack.cover" mode="aspectFill" />
          <view v-if="isPlaying" class="playing-indicator"></view>
        </view>
        <view v-else class="player-icon" @click="goToPlayer">
          <text class="icon">▶</text>
        </view>
      </view>
    </view>
    
    <BannerCarousel />
    
    <!-- 两个图片风格卡片：听白噪音 & 我的创作 -->
    <view class="two-card-wrap" style="padding:12px 16px; display:flex; gap:12px;">
      <view class="img-card left" @click="goToFree" style="flex:1; border-radius:14px; padding:18px; color:#07261a; background:linear-gradient(135deg,#bff2df 0%,#61c291 100%);">
        <text style="font-size:18px;font-weight:700; margin-bottom:6px; display:block;">听白噪音</text>
        <text style="font-size:12px; opacity:0.9; display:block;">1000+ 自由组合</text>
      </view>
      <view class="img-card right" @click="goToCreation" style="flex:1; border-radius:14px; padding:18px; color:#0f1538; background:linear-gradient(135deg,#d1d7ff 0%,#8b82ff 100%);">
        <text style="font-size:18px;font-weight:700; margin-bottom:6px; display:block;">我的创作</text>
        <text style="font-size:12px; opacity:0.9; display:block;">记录并分享你的声音</text>
      </view>
    </view>
    
    <view class="section">
      <text class="section-title">推荐白噪音</text>
      <view class="grid">
        <NoiseCard v-for="n in noises" :key="n.id" :item="n" />
      </view>
    </view>
    <view class="section">
      <text class="section-title">最近播放</text>
      <view class="grid">
        <NoiseCard v-for="n in recent" :key="n.id" :item="n" />
      </view>
    </view>
  </scroll-view>
</template>
<script setup>
import { ref, onMounted } from 'vue'
import SearchBar from '@/components/SearchBar.vue'
import BannerCarousel from '@/components/BannerCarousel.vue'
import NoiseCard from '@/components/NoiseCard.vue'
import { useGlobalTheme } from '@/composables/useGlobalTheme'
import { useThemeStore } from '@/stores/theme'
import { usePlayerStore } from '@/stores/player'
import { storeToRefs } from 'pinia'
import AudioService from '../../server/audioService.js'

const themeStore = useThemeStore(); themeStore.load()
const { bgStyle } = useGlobalTheme()

// 音频数据
const noises = ref([])
const recent = ref([])
const loading = ref(false)

// 加载音频数据
const loadAudioData = async () => {
  loading.value = true
  try {
    // 获取推荐音频
    const recommendedAudios = await AudioService.getRandomAudios(8)
    noises.value = recommendedAudios.map(audio => ({
      id: audio.id,
      title: audio.title,
      cover: audio.cover_url || '/static/images/default-cover.jpg',
      duration: formatDuration(audio.duration),
      playCount: audio.play_count || 0,
      category: audio.audio_categories?.name
    }))
    
    // 获取最近播放（模拟数据，实际应从播放历史获取）
    const recentAudios = await AudioService.getRandomAudios(4)
    recent.value = recentAudios.map(audio => ({
      id: audio.id,
      title: audio.title,
      cover: audio.cover_url || '/static/images/default-cover.jpg',
      duration: formatDuration(audio.duration),
      playCount: audio.play_count || 0
    }))
    
  } catch (error) {
    console.error('加载音频数据失败:', error)
    uni.showToast({
      title: '加载失败，请重试',
      icon: 'none'
    })
    
    // 降级处理：使用模拟数据
    noises.value = [
      { id: 1, title: '雨声', cover: '/static/images/rain.jpg', duration: '30:00', playCount: 1234 },
      { id: 2, title: '海浪', cover: '/static/images/wave.jpg', duration: '45:00', playCount: 856 },
      { id: 3, title: '森林', cover: '/static/images/forest.jpg', duration: '60:00', playCount: 932 },
      { id: 4, title: '篝火', cover: '/static/images/fire.jpg', duration: '30:00', playCount: 567 }
    ]
    recent.value = [
      { id: 5, title: '溪流', cover: '/static/images/stream.jpg', duration: '40:00', playCount: 234 },
      { id: 6, title: '风声', cover: '/static/images/wind.jpg', duration: '35:00', playCount: 189 }
    ]
  } finally {
    loading.value = false
  }
}

// 格式化时长
const formatDuration = (seconds) => {
  if (!seconds) return '00:00'
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
}

// 播放音频
const playAudio = async (audio) => {
  try {
    // 增加播放次数
    await AudioService.incrementPlayCount(audio.id)
    
    // 跳转到播放页面
    uni.navigateTo({
      url: `/pages/player/index?id=${audio.id}&title=${encodeURIComponent(audio.title)}`
    })
    
  } catch (error) {
    console.error('播放音频失败:', error)
    uni.showToast({
      title: '播放失败',
      icon: 'none'
    })
  }
}

// 播放器状态
const playerStore = usePlayerStore()
const { currentTrack, isPlaying } = storeToRefs(playerStore)

// 随机白噪音功能
const randomNoises = ref([])
const playingNoises = ref(new Set())

// 初始化随机白噪音
const initializeRandomNoises = () => {
  randomNoises.value = getRandomNoises(3)
}

// 获取随机白噪音
const getRandomNoises = (count) => {
  const shuffled = [...noises].sort(() => 0.5 - Math.random())
  return shuffled.slice(0, count)
}

// 随机化白噪音
const randomizeNoises = () => {
  // 停止所有正在播放的白噪音
  playingNoises.value.clear()
  randomNoises.value = getRandomNoises(3)
}

// 切换白噪音播放状态
const toggleNoisePlay = (noise) => {
  if (playingNoises.value.has(noise.id)) {
    playingNoises.value.delete(noise.id)
  } else {
    playingNoises.value.add(noise.id)
  }
}

// 检查白噪音是否正在播放
const isPlayingNoise = (noiseId) => {
  return playingNoises.value.has(noiseId)
}

// 获取白噪音图标
const getNoiseIcon = (name) => {
  const iconMap = {
    '海浪': '🌊',
    '雨声': '🌧️',
    '壁炉': '🔥',
    '树林': '🌲',
    '地铁': '🚇',
    '自然声': '🌿',
    '居家': '🏠',
    '环境': '🏙️'
  }
  return iconMap[name] || '🎵'
}

// 初始化
onMounted(() => {
  loadAudioData()
  initializeRandomNoises()
})

// 跳转到播放页面
function goToPlayer() {
  try {
    uni.navigateTo({ url: '/pages/player/index' })
  } catch(e) {
    if(typeof location !== 'undefined') location.hash = '#/pages/player/index'
  }
}

// 跳转到消息页面
function goToMessages() {
  try {
    uni.navigateTo({ url: '/pages/messages/index' })
  } catch(e) {
    if(typeof location !== 'undefined') location.hash = '#/pages/messages/index'
  }
}

// 跳转到创作页面
function goToCreation() {
  try {
    uni.navigateTo({ url: '/pages/creation/index' })
  } catch(e) {
    if(typeof location !== 'undefined') location.hash = '#/pages/creation/index'
  }
}

// 跳转到自由组合页面（听白噪音）
function goToFree(){
  try{ uni.navigateTo({ url: '/pages/noise/Free' }) }catch(e){ if(typeof location!=='undefined') location.hash = '#/pages/noise/Free' }
}

// 未读消息数量（模拟数据）
const unreadCount = ref(3)
</script>
<style scoped>
.page { min-height:100vh }

/* 顶部导航栏 */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  position: relative;
}

.header-right {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 消息图标 */
.message-icon {
  position: relative;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--card-bg, #ffffff);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.2s;
}

.message-icon:active {
  transform: scale(0.95);
  opacity: 0.8;
}

.message-symbol {
  font-size: 18px;
}

.message-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 16px;
  height: 16px;
  border-radius: 8px;
  background: #ff3b30;
  color: white;
  font-size: 10px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  border: 2px solid white;
  animation: pulse 1.5s infinite;
}

/* 默认播放图标 */
.player-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--uni-color-primary, #007aff);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 122, 255, 0.3);
}

.player-icon .icon {
  color: white;
  font-size: 14px;
  font-weight: bold;
}

/* 正在播放图标 */
.playing-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.playing-icon .cover {
  width: 100%;
  height: 100%;
  border-radius: 50%;
}

.playing-indicator {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ff3b30;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.2); opacity: 0.7; }
  100% { transform: scale(1); opacity: 1; }
}

/* 创作模块 */
.creation-section {
  padding: 20px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  margin: 12px 16px;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.3);
  color: white;
}

.creation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.creation-title {
  font-size: 18px;
  font-weight: 600;
}

.creation-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  background: rgba(255, 255, 255, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 25px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
  backdrop-filter: blur(10px);
}

.creation-btn:active {
  transform: scale(0.95);
  background: rgba(255, 255, 255, 0.3);
}

.creation-icon {
  font-size: 16px;
}

.creation-text {
  font-weight: 500;
}

.creation-desc {
  opacity: 0.9;
}

.desc-text {
  font-size: 13px;
  line-height: 1.4;
}

/* 随机白噪音色子区域 */
.dice-section {
  padding: 16px;
  background: var(--card-bg, #ffffff);
  margin: 12px 16px;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.dice-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.dice-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--fg, #333);
}

.dice-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: var(--uni-color-primary, #007aff);
  color: white;
  border-radius: 20px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.dice-btn:active {
  transform: scale(0.95);
  opacity: 0.8;
}

.dice-icon {
  font-size: 16px;
}

.dice-text {
  font-weight: 500;
}

.dice-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.dice-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 8px;
  background: var(--input-bg, #f8f9fa);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.dice-item.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-color: #5a67d8;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.dice-item:active {
  transform: scale(0.95);
}

.dice-icon-wrapper {
  position: relative;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  margin-bottom: 8px;
}

.dice-item.active .dice-icon-wrapper {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(4px);
}

.noise-icon {
  font-size: 24px;
}

.playing-dot {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #ff3b30;
  border: 2px solid white;
  animation: pulse 1.5s infinite;
}

.noise-name {
  font-size: 12px;
  font-weight: 500;
  color: var(--muted, #666);
  text-align: center;
}

.dice-item.active .noise-name {
  color: white;
}

.section { padding: 12px 16px }
.section-title { font-size:16px; font-weight:600; margin-bottom:8px }
.grid { display:flex; flex-wrap:wrap; justify-content:space-between }
</style>
