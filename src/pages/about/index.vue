<template>
  <scroll-view class="page" scroll-y :style="bgStyle">
    <view class="section">
      <text class="title">关于 SlumberPod</text>
      <view class="card">
        <text class="line">应用：SlumberPod</text>
        <text class="line">版本：v0.1.0</text>
        <text class="line">简介：白噪音与睡眠训练的轻应用</text>
      </view>
      <view class="card">
        <text class="line">开源协议：MIT（示例）</text>
        <text class="line">技术栈：uni-app + Vue3 + Pinia</text>
      </view>
    </view>
  </scroll-view>
</template>
<script setup>
import { useGlobalTheme } from '@/composables/useGlobalTheme'
const { bgStyle } = useGlobalTheme()
</script>
<style scoped>
.page{ min-height:100vh }
.section{ padding: 12px 16px }
.title{ font-size:18px; font-weight:600; color: var(--fg); margin-bottom:8px }
.card{ background: var(--card-bg); color: var(--card-fg); border-radius:12px; padding:12px; box-shadow:0 1px 4px var(--shadow); margin-bottom:10px }
.line{ display:block; margin-bottom:6px }
</style>
