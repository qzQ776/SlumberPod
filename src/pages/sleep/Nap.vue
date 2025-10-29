<template>
  <view class="page" :style="bgStyle">
    <view class="overlay" />
    <view class="top-chips">
      <view class="chip" :class="{ active: isCustom }" @click="setPreset(0)">自定义</view>
      <view class="chip" :class="{ active: minutes===10 && !isCustom }" @click="setPreset(10)">科学小眠 10'</view>
      <view class="chip" :class="{ active: minutes===24 && !isCustom }" @click="setPreset(24)">高效午休 24'</view>
    </view>

    <view class="center-area">
      <div class="dial-wrap" @touchstart.passive="onTouchStart" @touchmove.passive="onTouchMove" @touchend="onTouchEnd">
        <svg class="dial-svg" viewBox="0 0 200 200">
          <defs>
            <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" :stop-color="palette.start" />
              <stop offset="100%" :stop-color="palette.end" />
            </linearGradient>
          </defs>
          <circle class="ring-bg" cx="100" cy="100" r="80" />
          <g class="ticks-group">
            <line v-for="t in ticks" :key="t" :x1="100" :y1="20" :x2="100" :y2="24" :transform="`rotate(${t*6} 100 100)`" stroke="rgba(255,255,255,0.12)" stroke-width="1" />
          </g>
          <circle class="ring-progress" cx="100" cy="100" r="80" :stroke="`url(#g1)`" :stroke-dasharray="circumference" :stroke-dashoffset="dashOffset" />
        </svg>

        <!-- 支持自定义滚轮视觉：中间显示当前、上一、下一 -->
        <view class="scroller" v-if="isCustom">
          <text class="scroller-item faint">{{ prevMinute }}</text>
          <text class="scroller-item current">{{ minutes }}</text>
          <text class="scroller-item faint">{{ nextMinute }}</text>
        </view>

        <!-- 非自定义显示大号分钟 -->
        <view class="time-number" v-else>
          <text class="minutes">{{ displayMinutes }}</text>
          <text class="unit">分钟</text>
        </view>

        <text class="wake-text">将于 {{ wakeText }} 唤醒你</text>
      </div>
    </view>

    <view class="bottom-bar">
      <view class="left-icon">≡</view>
      <button class="start-btn" @click="toggleStart">
        <view :class="['start-icon', { running }]">{{ running ? '■' : icon }}</view>
      </button>
      <view class="right-icon">◎</view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onUnmounted, watch } from 'vue'
import { useSleepStore } from '@/stores/sleep'
import { useGlobalTheme } from '@/composables/useGlobalTheme'

const sleep = useSleepStore()
const { bgStyle } = useGlobalTheme()

const minutes = ref(24)
const isCustom = ref(false)
const running = ref(false)
const remain = ref(minutes.value * 60) // seconds
let tickTimer = null
let rafId = null
let touchStartY = 0
let touchDelta = 0

const paletteMap = {
  green: { start: '#6CC07B', end: '#2EA56B' },
  pink: { start: '#FF8AB8', end: '#FF5E9E' },
  blue: { start: '#7FB3FF', end: '#4B8BFF' }
}

const paletteKey = ref('green')
const palette = computed(() => paletteMap[paletteKey.value])
const ticks = Array.from({length:60}, (_,i)=>i)
const circumference = 2 * Math.PI * 80
const dashOffset = ref(circumference)
const targetDash = ref(circumference)
const displayMinutes = computed(()=> Math.ceil(remain.value/60))

const wakeText = computed(()=>{
  const t = new Date(Date.now() + remain.value*1000)
  return `${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}`
})

const icon = computed(()=> paletteKey.value==='green'?'⚡':(paletteKey.value==='pink'?'☕':'⏳'))

const prevMinute = computed(()=> Math.max(1, minutes.value - 1))
const nextMinute = computed(()=> Math.min(180, minutes.value + 1))

function setPreset(m){
  isCustom.value = m === 0
  minutes.value = m || (isCustom.value ? 30 : minutes.value)
  paletteKey.value = m===10? 'pink' : m===24? 'green' : m===90? 'blue' : 'green'
  remain.value = minutes.value * 60
  updateDashInstant()
}

function updateDashInstant(){
  const total = minutes.value*60 || 1
  const progress = (total - remain.value) / total
  targetDash.value = circumference * (1 - progress)
  dashOffset.value = targetDash.value
}

function animateDash(){
  const ease = 0.12
  function step(){
    dashOffset.value += (targetDash.value - dashOffset.value) * ease
    rafId = requestAnimationFrame(step)
  }
  if(rafId) cancelAnimationFrame(rafId)
  rafId = requestAnimationFrame(step)
}

function startTimer(){
  if(tickTimer) clearInterval(tickTimer)
  tickTimer = setInterval(()=>{
    if(remain.value>0){
      remain.value -= 1
      const total = minutes.value*60 || 1
      const progress = (total - remain.value) / total
      targetDash.value = circumference * (1 - progress)
    } else {
      stopTimer()
      uni.showToast({ title: '小憩结束', icon: 'none' })
    }
  }, 1000)
  animateDash()
}

function stopTimer(){
  if(tickTimer) clearInterval(tickTimer); tickTimer = null; running.value=false
  if(rafId) cancelAnimationFrame(rafId); rafId = null
}

function toggleStart(){
  if(running.value){ stopTimer(); }
  else { running.value=true; startTimer(); sleep.startNap(minutes.value) }
}

function onTouchStart(e){
  if(!isCustom.value) return
  touchStartY = e.touches ? e.touches[0].clientY : e.clientY
  touchDelta = 0
}
function onTouchMove(e){
  if(!isCustom.value) return
  const y = e.touches ? e.touches[0].clientY : e.clientY
  touchDelta = y - touchStartY
}
function onTouchEnd(){
  if(!isCustom.value) return
  const threshold = 20
  if(touchDelta < -threshold){ // swipe up -> increase minutes
    minutes.value = Math.min(180, minutes.value + 1)
  } else if(touchDelta > threshold){ // swipe down -> decrease
    minutes.value = Math.max(1, minutes.value - 1)
  }
  touchDelta = 0
  remain.value = minutes.value * 60
  updateDashInstant()
  animateDash()
}

onUnmounted(()=>{ if(tickTimer) clearInterval(tickTimer); if(rafId) cancelAnimationFrame(rafId) })

watch(minutes,(v)=>{ remain.value = v*60; updateDashInstant(); animateDash(); })

// 初始化为高效午休 24'
setPreset(24)
</script>

<style scoped>
.page{ position:relative; min-height:100vh; overflow:hidden }
.overlay{ position:absolute; inset:0; background: rgba(255,255,255,0.06); backdrop-filter: blur(6px); z-index:1 }
.top-chips{ position:relative; z-index:5; display:flex; gap:12px; padding:18px 16px 0 }
.chip{ padding:8px 14px; border-radius:18px; background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.9); font-weight:600 }
.chip.active{ background: rgba(255,255,255,0.95); color: var(--accent, #111) }

.center-area{ position:relative; z-index:5; display:flex; flex-direction:column; align-items:center; margin-top:18px }
.dial-wrap{ position:relative; width:320px; height:320px; display:flex; align-items:center; justify-content:center }
.dial-svg{ width:100%; height:100%; transform:rotate(-90deg) }
.ring-bg{ fill:none; stroke: rgba(255,255,255,0.06); stroke-width:12 }
.ring-progress{ fill:none; stroke-width:12; stroke-linecap:round; transition: stroke-dashoffset 0.6s linear }
.ticks-group line{ opacity:0.9 }

.scroller{ position:absolute; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px }
.scroller-item{ font-size:28px; color: rgba(255,255,255,0.5) }
.scroller-item.current{ font-size:56px; font-weight:800; color:#fff; text-shadow:0 6px 18px rgba(0,0,0,0.35) }
.scroller-item.faint{ font-size:28px; opacity:0.3 }

.time-number{ position:absolute; display:flex; flex-direction:row; align-items:baseline; gap:8px }
.minutes{ font-size:64px; font-weight:800; color:#fff; text-shadow:0 6px 18px rgba(0,0,0,0.35) }
.unit{ font-size:18px; color:rgba(255,255,255,0.9) }
.wake-text{ position:absolute; bottom:-36px; left:0; right:0; text-align:center; color:rgba(255,255,255,0.85); font-size:14px }

.bottom-bar{ position:absolute; z-index:5; left:0; right:0; bottom:48px; display:flex; justify-content:space-around; align-items:center; padding:0 32px }
.start-btn{ width:72px; height:72px; border-radius:50%; background:#fff; display:flex; align-items:center; justify-content:center; box-shadow:0 8px 30px rgba(0,0,0,0.25); transition: transform 0.15s ease }
.start-btn:active{ transform: scale(0.96) }
.start-icon{ font-size:28px }
.start-icon.running{ color:#ff4d4f }
.left-icon, .right-icon{ color:rgba(255,255,255,0.9); font-size:20px }
</style>