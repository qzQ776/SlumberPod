<template>
  <scroll-view class="page" scroll-y :style="bgStyle">
    <view class="hero" :style="bgStyle">
      <text class="greet">{{ greet }}</text>
      <text class="sub">听听深睡脑波，可以减少睡前大脑兴奋</text>
    </view>
    <view class="section">
      <view class="record card" :style="cardStyle">
        <text class="title">记录睡眠</text>
        <text class="desc">记录梦话呼噜声</text>
      </view>
    </view>
    <view class="section actions">
      <view class="circle" @click="goNap"><text>小憩</text></view>
      <view class="circle" @click="goAlarm"><text>闹钟与提醒</text></view>
      <view class="circle" @click="ritual"><text>睡前仪式</text></view>
    </view>
  </scroll-view>
</template>
<script setup>
import { computed } from 'vue'
import { useGlobalTheme } from '@/composables/useGlobalTheme'
import { useThemeStore } from '@/stores/theme'
const themeStore = useThemeStore(); themeStore.load()
const { hour, theme, bgStyle } = useGlobalTheme()

const cardStyle = computed(()=> ({ background: 'var(--card-bg)', color:'var(--card-fg)' }))

const greet = computed(()=>{
  const h = hour.value
  if(h>=5 && h<10) return '早上好'
  if(h>=10 && h<17) return '下午好'
  if(h>=17 && h<21) return '晚上好'
  return '晚安'
})
function goNap(){ uni.navigateTo({ url:'/pages/sleep/Nap' }) }
function goAlarm(){ uni.navigateTo({ url:'/pages/sleep/Alarm' }) }
function ritual(){ uni.showToast({ title:'睡前仪式 敬请期待', icon:'none' }) }
</script>
<style scoped>
.page { min-height:100vh }
.section { padding: 12px 16px }
.hero{ height:180px; padding: 12px 16px; color: var(--fg); border-bottom-left-radius: 24px; border-bottom-right-radius: 24px }
.greet{ font-size:26px; font-weight:700 }
.sub{ margin-top:6px; color: var(--muted) }
.card{ background: var(--card-bg); color: var(--card-fg); border-radius:12px; padding:12px; box-shadow:0 1px 4px var(--shadow) }
.title{ font-size:16px; font-weight:600 }
.desc{ margin-top:4px; color: var(--muted) }
.actions{ display:flex; justify-content:space-around; align-items:center; padding: 0 16px }
.circle{ width:88px; height:88px; border-radius:50%; background: var(--input-bg); display:flex; align-items:center; justify-content:center; color: var(--fg) }
</style>
