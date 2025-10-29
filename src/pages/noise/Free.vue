<template>
  <view class="page" :style="bgStyle">
    <view class="topbar">
      <button class="back" @click="goBack">‹</button>
      <text class="title">自由组合</text>
      <view class="actions">
        <button class="icon" @click="openSearch">🔍</button>
        <view v-if="player.currentTrack" class="playing-icon" @click="openPlayerQuick">
          <image class="cover" :src="player.currentTrack.cover" mode="aspectFill" />
          <view v-if="player.isPlaying" class="playing-indicator"></view>
        </view>
        <view v-else class="player-icon" @click="openPlayerQuick">
          <text class="icon">▶</text>
        </view>
      </view>
    </view>

    <view class="tabs">
      <view v-for="c in categories" :key="c" :class="['tab', { active: c===activeCat }]" @click="activeCat=c">{{ c }}</view>
    </view>

    <scroll-view class="grid" scroll-y>
      <view class="item" v-for="n in filteredNoises" :key="n.id">
        <button class="thumb" :class="{ playing: isPlaying(n.id) }" @click="toggle(n)">
          <text class="icon">{{ getNoiseIcon(n.name) }}</text>
        </button>
        <text class="name">{{ n.name }}</text>
      </view>
    </scroll-view>

    <view class="player-bar" v-if="playingList.length">
      <text>正在播放：{{ playingList.length }} 个声音</text>
    </view>

    <!-- 小色子与小框框播放器（底部浮窗） -->
    <view class="mini-player">
      <view class="mini-left">
        <button class="mini-dice" @click="randomizeMini">
          <text>🎲</text>
        </button>
      </view>
      <view class="mini-center">
        <view v-for="(n, idx) in randomNoises" :key="n?.id || idx" class="mini-box">
          <button class="mini-thumb" :class="{ on: isMiniPlaying(n?.id) }" @click="toggleMini(n)">
            <text class="icon">{{ getNoiseIcon(n?.name) }}</text>
          </button>
          <text class="mini-name">{{ n?.name || '—' }}</text>
        </view>
      </view>
      <view class="mini-right">
        <button class="mini-play" @click="goToPlayer">
          <text v-if="anyPlaying">⮝</text>
          <text v-else>▶</text>
        </button>
      </view>
    </view>

    <!-- 播放详情浮窗（定时圆环） -->
    <view v-if="showDetail" class="detail-overlay" @click.self="closeDetail">
      <view class="detail-card">
        <view class="timer-circle" ref="circleRef">
          <svg viewBox="0 0 200 200" class="svg-wrap">
            <circle cx="100" cy="100" r="80" class="bg-ring" />
            <circle cx="100" cy="100" r="80" class="progress-ring" :stroke-dasharray="circumference" :stroke-dashoffset="circumference - (circumference * timerPercent)" />
            <!-- knob -->
            <circle :cx="knobX" :cy="knobY" r="8" class="knob" @touchstart.stop.prevent="startDrag" @touchmove.stop.prevent="onDrag" @touchend.stop.prevent="endDrag" />
          </svg>
          <text class="timer-text">{{ formattedRemaining }}</text>
        </view>
        <view class="detail-actions">
          <button class="btn" @click="startTimer">开始定时</button>
          <button class="btn" @click="cancelTimer">取消</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useGlobalTheme } from '@/composables/useGlobalTheme'
import { allNoises } from '@/data/noises'
import { usePlayerStore } from '@/stores/player'

const { bgStyle } = useGlobalTheme()
const player = usePlayerStore()

const categories = ['全部','免费','雨声','自然','环境','ASMR']
const activeCat = ref('全部')
const playing = ref(new Set())

// mini player state
const randomNoises = ref([null,null,null])
const miniPlaying = ref(new Set())

const filteredNoises = computed(()=>{
  if(activeCat.value==='全部') return allNoises
  return allNoises.filter(n=> n.category === activeCat.value || (activeCat.value==='雨声' && n.name.includes('雨')))
})

function getNoiseIcon(name){
  const map = { '海浪':'🌊','雨声':'🌧️','壁炉':'🔥','树林':'🌲','地铁':'🚇' }
  return map[name] || '🎵'
}

function toggle(noise){
  // legacy list play toggles (not used by mini player)
  if(!noise) return
  if(playing.value.has(noise.id)){
    playing.value.delete(noise.id)
    player.stopById?.(noise.id)
  } else {
    playing.value.add(noise.id)
    player.play?.(noise)
  }
}

function isPlaying(id){ return playing.value.has(id) }
function isMiniPlaying(id){ return miniPlaying.value.has(id) }

// mini player actions
function randomizeMini(){
  // pick 3 random noises from filtered list
  const pool = filteredNoises.value
  const shuffled = [...pool].sort(()=>0.5 - Math.random())
  randomNoises.value = [shuffled[0]||null, shuffled[1]||null, shuffled[2]||null]
  // reset mini playing state
  miniPlaying.value.clear()
}

function toggleMini(noise){
  if(!noise) return
  if(miniPlaying.value.has(noise.id)){
    miniPlaying.value.delete(noise.id)
    player.stopById?.(noise.id)
  } else {
    miniPlaying.value.add(noise.id)
    player.play?.(noise)
  }
}

const anyPlaying = computed(()=> miniPlaying.value.size > 0)

function togglePlayAll(){
  if(anyPlaying.value){
    // stop all
    for(const id of Array.from(miniPlaying.value)){
      player.stopById?.(id)
    }
    miniPlaying.value.clear()
  } else {
    // play all three
    for(const n of randomNoises.value){
      if(n && !miniPlaying.value.has(n.id)){
        miniPlaying.value.add(n.id)
        player.play?.(n)
      }
    }
  }
}

// expose detail control
function openDetail(){ showDetail.value = true }
function setDurationMinutes(m){ durationMinutes.value = m; remainingSeconds.value = m*60 }


function openSearch(){
  try{ uni.navigateTo({ url: '/pages/search/index' }) }catch(e){ location.hash='#/pages/search/index' }
}

// renamed to avoid conflict: openPlayerDetail
function openPlayerDetail(noise){
  try{ uni.navigateTo({ url: `/pages/player/index?id=${noise.id}` }) }catch(e){ location.hash = `#/pages/player/index?id=${noise.id}` }
}

function openPlayerQuick(){
  // go to player main page
  try{ uni.navigateTo({ url: '/pages/player/index' }) }catch(e){ location.hash = '#/pages/player/index' }
}

function goToPlayer(){
  // navigate to player detail page and pass current first mini noise id if available
  const first = randomNoises.value[0]
  const id = first?.id ? `?id=${first.id}` : ''
  try{ uni.navigateTo({ url: `/pages/player/index${id}` }) }catch(e){ location.hash = `#/pages/player/index${id}` }
}

function goBack(){ try{ uni.navigateBack() }catch(e){ history.back() } }

const playingList = computed(()=> Array.from(playing.value))

onMounted(()=>{ randomizeMini() })

// detail overlay state
const showDetail = ref(false)
const circleRef = ref(null)
const knobAngle = ref(0) // degrees
const durationMinutes = ref(30)
let timerId = null

const radius = 80
const circumference = 2 * Math.PI * radius
const timerPercent = computed(()=> (durationMinutes.value % 120) / 120)

const knobPos = computed(()=>{
  const angle = (knobAngle.value - 90) * (Math.PI/180)
  const x = 100 + radius * Math.cos(angle)
  const y = 100 + radius * Math.sin(angle)
  return { x, y }
})

const knobX = computed(()=> knobPos.value.x)
const knobY = computed(()=> knobPos.value.y)

const remainingSeconds = ref(durationMinutes.value * 60)
const formattedRemaining = computed(()=>{
  const mm = String(Math.floor(remainingSeconds.value/60)).padStart(2,'0')
  const ss = String(remainingSeconds.value%60).padStart(2,'0')
  return `${mm}:${ss}`
})

function onMiniPlayClick(){
  if(anyPlaying.value){
    // open detail overlay
    showDetail.value = true
  } else {
    togglePlayAll()
  }
}

function closeDetail(){ showDetail.value = false }

function startTimer(){
  // start countdown and stop playback when reaches 0
  remainingSeconds.value = durationMinutes.value * 60
  if(timerId) clearInterval(timerId)
  timerId = setInterval(()=>{
    remainingSeconds.value -= 1
    if(remainingSeconds.value <= 0){
      clearInterval(timerId); timerId = null
      // stop all mini playing
      for(const id of Array.from(miniPlaying.value)) player.stopById?.(id)
      miniPlaying.value.clear()
      showDetail.value = false
    }
  }, 1000)
}

function cancelTimer(){ if(timerId){ clearInterval(timerId); timerId=null } showDetail.value=false }

// drag handling
let dragging = false
function startDrag(e){ dragging = true }
function onDrag(e){ if(!dragging) return
  const touch = e.touches && e.touches[0]
  if(!touch) return
  const rect = circleRef.value?.getBoundingClientRect?.() || { left:0, top:0 }
  const cx = rect.left + 100; const cy = rect.top + 100
  const dx = touch.clientX - cx; const dy = touch.clientY - cy
  let ang = Math.atan2(dy, dx) * 180 / Math.PI + 90
  if(ang < 0) ang += 360
  knobAngle.value = ang
  durationMinutes.value = Math.round((ang / 360) * 120)
  remainingSeconds.value = durationMinutes.value * 60
}
function endDrag(e){ dragging=false }

</script>

<style scoped>
.page{ padding:12px 16px; min-height:100vh }
.topbar{ display:flex; align-items:center; justify-content:space-between; padding:8px 6px }
.back{ background:transparent; border:none; font-size:22px; position:relative; left:0 }
.title{ font-size:18px; font-weight:700; text-align:center; flex:1 }
.actions{ display:flex; gap:8px; min-width:110px; justify-content:flex-end }
.icon{ background:transparent; border:none; font-size:18px }

/* reuse home header player styles */
.playing-icon{ width:36px; height:36px; border-radius:6px; overflow:hidden; position:relative }
.playing-icon .cover{ width:100%; height:100% }
.playing-indicator{ position:absolute; right:0; bottom:0; width:10px; height:10px; background:var(--accent,#2EA56B); border-radius:999px; box-shadow:0 0 6px rgba(46,165,107,0.6) }
.player-icon{ width:36px; height:36px; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.06); border-radius:6px }

.tabs{ display:flex; gap:8px; margin:12px 0 }
.tab{ padding:8px 12px; background:rgba(0,0,0,0.05); border-radius:18px }
.tab.active{ background:var(--accent, #2EA56B); color:#fff }

.grid{ display:flex; flex-wrap:wrap; gap:12px }
.item{ width:25%; display:flex; flex-direction:column; align-items:center }
.thumb{ width:64px; height:64px; border-radius:12px; background:rgba(0,0,0,0.06); border:none; display:flex; align-items:center; justify-content:center }
.thumb.playing{ background:var(--accent, #2EA56B); color:#fff }
.icon{ font-size:22px }
.name{ margin-top:6px; font-size:12px; text-align:center }
.play-circle{ margin-top:6px; width:34px; height:34px; border-radius:50%; background:rgba(0,0,0,0.06); border:none }

.player-bar{ position:fixed; bottom:12px; left:16px; right:16px; background:rgba(255,255,255,0.06); padding:10px 12px; border-radius:12px; text-align:center }

/* mini player - floating style */
.mini-player{ position:fixed; left:50%; transform:translateX(-50%); bottom:22px; display:flex; align-items:center; gap:14px; background:rgba(20,24,28,0.7); padding:10px 14px; border-radius:18px; box-shadow:0 10px 30px rgba(0,0,0,0.45); backdrop-filter: blur(8px); max-width:640px; width:calc(100% - 64px); z-index:1200 }
.mini-dice{ width:44px; height:44px; display:flex; align-items:center; justify-content:center; border-radius:10px; background:rgba(255,255,255,0.06); border:none; color:#fff }
.mini-center{ display:flex; gap:14px; flex:1; justify-content:center }
.mini-box{ display:flex; flex-direction:column; align-items:center }
.mini-thumb{ width:52px; height:52px; border-radius:12px; background:rgba(255,255,255,0.06); display:flex; align-items:center; justify-content:center; border:none; color:#ddd }
.mini-thumb.on{ background:linear-gradient(135deg,var(--accent,#2EA56B),#1f8a5e); color:#fff; box-shadow:0 6px 18px rgba(0,0,0,0.35) }
.mini-name{ font-size:12px; margin-top:6px; color:#ddd; max-width:70px; text-align:center }
.mini-play{ width:44px; height:44px; border-radius:22px; background:rgba(255,255,255,0.06); border:none; display:flex; align-items:center; justify-content:center; color:#fff }

.detail-overlay{ position:fixed; left:0; top:0; right:0; bottom:0; display:flex; align-items:flex-end; justify-content:center; z-index:1300 }
.detail-card{ width:100%; max-width:720px; background:linear-gradient(180deg, rgba(0,0,0,0.55), rgba(0,0,0,0.7)); padding:36px; border-top-left-radius:18px; border-top-right-radius:18px; box-shadow:0 -10px 30px rgba(0,0,0,0.5) }
.timer-circle{ width:200px; height:200px; margin:0 auto; position:relative }
.svg-wrap{ width:100%; height:100% }
.bg-ring{ fill:none; stroke:rgba(255,255,255,0.06); stroke-width:6 }
.progress-ring{ fill:none; stroke:#fff; stroke-width:6; transform:rotate(-90deg); transform-origin:center }
.knob{ fill:#fff }
.timer-text{ position:absolute; left:0; right:0; top:86px; text-align:center; color:#fff; font-size:20px }
.detail-actions{ display:flex; gap:12px; justify-content:center; margin-top:18px }
.btn{ background:rgba(255,255,255,0.06); color:#fff; padding:10px 16px; border-radius:10px; border:none }
</style>