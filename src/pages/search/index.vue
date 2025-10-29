<template>
  <view class="page" :style="bgStyle">
    <!-- 顶部搜索栏 -->
    <view class="search-header">
      <view class="search-bar">
        <view class="back-btn" @click="goBack">
          <text class="back-icon">←</text>
        </view>
        <view class="search-input-wrapper">
          <text class="search-icon">🔍</text>
          <input 
            v-model="searchText" 
            class="search-input" 
            placeholder="搜索白噪音/专辑/作者"
            @confirm="handleSearch"
            @input="handleInput"
            focus
          />
          <view v-if="searchText" class="clear-btn" @click="clearSearch">
            <text class="clear-icon">×</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 搜索内容区域 -->
    <scroll-view class="search-content" scroll-y>
      <!-- 热门搜索 -->
      <view v-if="!searchText" class="section">
        <text class="section-title">热门搜索</text>
        <view class="hot-tags">
          <view 
            v-for="tag in hotTags" 
            :key="tag" 
            class="tag"
            @click="searchByTag(tag)"
          >
            <text class="tag-text">{{ tag }}</text>
          </view>
        </view>
      </view>

      <!-- 搜索历史 -->
      <view v-if="!searchText && searchHistory.length > 0" class="section">
        <view class="section-header">
          <text class="section-title">搜索历史</text>
          <view class="clear-history" @click="clearHistory">
            <text class="clear-text">清空</text>
          </view>
        </view>
        <view class="history-list">
          <view 
            v-for="item in searchHistory" 
            :key="item" 
            class="history-item"
            @click="searchByTag(item)"
          >
            <text class="history-icon">🕒</text>
            <text class="history-text">{{ item }}</text>
            <view class="delete-btn" @click.stop="deleteHistoryItem(item)">
              <text class="delete-icon">×</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 搜索结果 -->
      <view v-if="searchText" class="section">
        <text class="section-title">搜索结果</text>
        <view class="search-results">
          <view 
            v-for="result in searchResults" 
            :key="result.id" 
            class="result-item"
            @click="playResult(result)"
          >
            <image class="result-cover" :src="result.cover" mode="aspectFill" />
            <view class="result-info">
              <text class="result-name">{{ result.name }}</text>
              <text class="result-author">{{ result.author }}</text>
            </view>
            <text class="play-icon">▶</text>
          </view>
        </view>
        
        <view v-if="searchResults.length === 0" class="empty-state">
          <text class="empty-icon">🔍</text>
          <text class="empty-text">暂无搜索结果</text>
          <text class="empty-desc">换个关键词试试吧</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useGlobalTheme } from '@/composables/useGlobalTheme'
import { useThemeStore } from '@/stores/theme'
import { allNoises } from '@/data/noises'

const themeStore = useThemeStore(); themeStore.load()
const { bgStyle } = useGlobalTheme()

// 搜索相关数据
const searchText = ref('')
const searchHistory = ref(['海浪', '雨声', '自然声', '睡眠'])

// 热门搜索标签
const hotTags = ref([
  '海浪', '雨声', '壁炉', '树林', 
  '地铁', '自然声', '居家', '环境',
  '睡眠', '放松', '专注', '冥想'
])

// 搜索结果
const searchResults = computed(() => {
  if (!searchText.value.trim()) return []
  
  const query = searchText.value.toLowerCase()
  return allNoises.filter(noise => 
    noise.name.toLowerCase().includes(query) ||
    noise.author.toLowerCase().includes(query) ||
    noise.category.toLowerCase().includes(query)
  )
})

// 返回上一页
function goBack() {
  try {
    uni.navigateBack()
  } catch(e) {
    if(typeof location !== 'undefined') location.hash = '#/pages/home/index'
  }
}

// 处理搜索
function handleSearch() {
  if (searchText.value.trim()) {
    addToHistory(searchText.value.trim())
  }
}

// 处理输入
function handleInput() {
  // 实时搜索逻辑
}

// 清空搜索
function clearSearch() {
  searchText.value = ''
}

// 通过标签搜索
function searchByTag(tag) {
  searchText.value = tag
  addToHistory(tag)
}

// 添加到搜索历史
function addToHistory(query) {
  if (!query.trim()) return
  
  // 移除重复项
  searchHistory.value = searchHistory.value.filter(item => item !== query)
  
  // 添加到开头
  searchHistory.value.unshift(query)
  
  // 限制历史记录数量
  if (searchHistory.value.length > 10) {
    searchHistory.value = searchHistory.value.slice(0, 10)
  }
}

// 删除单个历史记录
function deleteHistoryItem(item) {
  searchHistory.value = searchHistory.value.filter(history => history !== item)
}

// 清空历史记录
function clearHistory() {
  uni.showModal({
    title: '确认清空',
    content: '确定要清空所有搜索历史吗？',
    success: (res) => {
      if (res.confirm) {
        searchHistory.value = []
      }
    }
  })
}

// 播放搜索结果
function playResult(result) {
  uni.showToast({
    title: `播放：${result.name}`,
    icon: 'none'
  })
  // 这里可以添加实际的播放逻辑
}

onMounted(() => {
  // 页面加载时的初始化逻辑
})
</script>

<style scoped>
.page { min-height: 100vh; }

/* 顶部搜索栏 */
.search-header {
  background: var(--card-bg, #ffffff);
  border-bottom: 1px solid var(--border, #f0f0f0);
  position: sticky;
  top: 0;
  z-index: 100;
}

.search-bar {
  display: flex;
  align-items: center;
  padding: 12px 16px;
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

.search-input-wrapper {
  flex: 1;
  position: relative;
  background: var(--input-bg, #f8f9fa);
  border-radius: 20px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-icon {
  font-size: 16px;
  color: var(--muted, #999);
}

.search-input {
  flex: 1;
  height: 40px;
  font-size: 16px;
  color: var(--fg, #333);
  background: transparent;
  border: none;
  outline: none;
}

.clear-btn {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--muted, #ccc);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.clear-btn:active {
  transform: scale(0.9);
}

.clear-icon {
  font-size: 16px;
  color: white;
  font-weight: bold;
}

/* 搜索内容区域 */
.search-content {
  flex: 1;
  padding: 16px;
}

.section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--fg, #333);
  margin-bottom: 12px;
  display: block;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.clear-history {
  padding: 4px 8px;
  background: var(--input-bg, #f8f9fa);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.clear-history:active {
  transform: scale(0.95);
}

.clear-text {
  font-size: 12px;
  color: var(--muted, #999);
}

/* 热门搜索标签 */
.hot-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag {
  padding: 8px 16px;
  background: var(--input-bg, #f8f9fa);
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.tag:active {
  transform: scale(0.95);
  background: var(--uni-color-primary, #007aff);
}

.tag:active .tag-text {
  color: white;
}

.tag-text {
  font-size: 14px;
  color: var(--fg, #333);
}

/* 搜索历史 */
.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.history-item {
  display: flex;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--border, #f0f0f0);
  cursor: pointer;
  transition: all 0.2s;
}

.history-item:active {
  background: var(--input-bg, #f8f9fa);
}

.history-icon {
  font-size: 16px;
  margin-right: 12px;
  color: var(--muted, #999);
}

.history-text {
  flex: 1;
  font-size: 14px;
  color: var(--fg, #333);
}

.delete-btn {
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

.delete-btn:active {
  transform: scale(0.9);
}

.delete-icon {
  font-size: 16px;
  color: var(--muted, #999);
  font-weight: bold;
}

/* 搜索结果 */
.search-results {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.result-item {
  display: flex;
  align-items: center;
  padding: 12px;
  background: var(--card-bg, #ffffff);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.result-item:active {
  transform: scale(0.98);
  background: var(--input-bg, #f8f9fa);
}

.result-cover {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  margin-right: 12px;
}

.result-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.result-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--fg, #333);
}

.result-author {
  font-size: 14px;
  color: var(--muted, #666);
}

.play-icon {
  font-size: 16px;
  color: var(--uni-color-primary, #007aff);
  padding: 8px;
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
  opacity: 0.5;
}

.empty-text {
  font-size: 16px;
  color: var(--muted, #666);
  margin-bottom: 8px;
}

.empty-desc {
  font-size: 14px;
  color: var(--muted, #999);
}
</style>