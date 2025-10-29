<template>
  <scroll-view class="page" scroll-y :style="bgStyle">
    <view class="section">
      <text class="title">帮助与客服</text>
      <view class="faq">
        <view class="q">
          <text class="q-title">Q: 如何收藏喜欢的声音？</text>
          <text class="q-content">在声音卡片的菜单中选择收藏即可，已收藏内容会显示在“我喜欢的”。</text>
        </view>
        <view class="q">
          <text class="q-title">Q: 播放列表如何管理？</text>
          <text class="q-content">在“队列”页面可以移除或清空当前播放列表。</text>
        </view>
      </view>
      <view class="contact">
        <text class="label">联系客服</text>
        <button class="btn" @click="contact">打开客服页面</button>
      </view>
    </view>
  </scroll-view>
</template>
<script setup>
import { useGlobalTheme } from '@/composables/useGlobalTheme'
const { bgStyle } = useGlobalTheme()
function contact(){ try{ window.open('https://ask.dcloud.net.cn/', '_blank') }catch(e){ uni.showToast({ title:'请复制客服链接：ask.dcloud.net.cn', icon:'none' }) } }
</script>
<style scoped>
.page{ min-height:100vh }
.section{ padding: 12px 16px }
.title{ font-size:18px; font-weight:600; color: var(--fg); margin-bottom:8px }
.faq{ background: var(--card-bg); color: var(--card-fg); border-radius:12px; padding:12px; box-shadow:0 1px 4px var(--shadow) }
.q{ margin-bottom:10px }
.q-title{ font-weight:600; color: var(--fg) }
.q-content{ color: var(--muted) }
.contact{ margin-top:12px; display:flex; align-items:center; gap:8px }
.label{ font-size:12px; color: var(--muted) }
.btn{ padding:6px 10px; border-radius:8px; background: var(--input-bg); color: var(--fg) }
</style>
