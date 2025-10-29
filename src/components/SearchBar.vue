<template>
  <view class="search" @click="goToSearch">
    <view class="search-wrapper">
      <text class="search-icon">🔍</text>
      <text class="placeholder">搜索白噪音/专辑/作者</text>
    </view>
  </view>
</template>

<script setup>
// 跳转到搜索页面
function goToSearch() {
  try {
    uni.navigateTo({ url: '/pages/search/index' })
  } catch(e) {
    if(typeof location !== 'undefined') location.hash = '#/pages/search/index'
  }
}
</script>
<style scoped>
.search { 
  padding: 12px 16px; 
  cursor: pointer;
}

.search-wrapper {
  width: 100%;
  background: var(--input-bg, #f2f3f5);
  border-radius: 20px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
}

.search:active .search-wrapper {
  transform: scale(0.98);
  opacity: 0.8;
}

.search-icon {
  font-size: 16px;
  color: var(--muted, #999);
}

.placeholder {
  font-size: 14px;
  color: var(--muted, #999);
  flex: 1;
}
</style>
