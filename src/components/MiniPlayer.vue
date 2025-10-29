<template>
  <view v-if="visible && track" class="mini" :style="barStyle" @touchstart="onTouchStart" @touchmove="onTouchMove" @touchend="onTouchEnd">
    <image class="thumb" :src="track.cover" mode="cover" @click="toggle" />
    <view class="info" @click="openPlayer">
      <text class="title">{{ track.name }}</text>
      <text class="sub">{{ track.author }}</text>
      <view class="progress"><view class="inner" :style="{ width: progressPct + '%' }"></view></view>
    </view>
    <view class="actions">
      <button class="icon" @click="prev">⏮</button>
      <button class="icon" @click="toggle">{{ playing ? '⏸' : '▶️' }}</button>
      <button class="icon" @click="next">⏭</button>
      <button class="icon" @click="close">✕</button>
    </view>
  </view>
</template>
<script setup>
import { ref, watch, computed, onMounted } from 'vue'
import { usePlayerStore } from '@/stores/player'
import { useGlobalTheme } from '@/composables/useGlobalTheme'
const store = usePlayerStore()
const { bgStyle } = useGlobalTheme()
const track = computed(()=> store.currentTrack)
const playing = computed(()=> store.isPlaying)
const progressPct = computed(()=>{
  if (!store.durationMs) return 0
  return Math.min(100, Math.round((store.positionMs / store.durationMs) * 100))
})
const barStyle = computed(()=> ({ background: 'var(--card-bg)', color: 'var(--card-fg)' }))
const visible = ref(true)
watch(track, ()=>{ if(track.value) { visible.value = true; setBottomSafe(true) } else { setBottomSafe(false) } })
function setBottomSafe(on){ if(typeof document!=='undefined'){ document.documentElement.style.setProperty('--bottom-safe', on? '72px' : '0px') } }
function toggle(){ if (!track.value) return; store.isPlaying ? store.pause() : store.play() }
function prev(){ store.prev() }
function next(){ store.next() }
function close(){ visible.value = false; setBottomSafe(false) }
function openPlayer(){ try{ uni.navigateTo({ url:'/pages/player/index' }) } catch(e){ if(typeof location!=='undefined') location.hash = '#/pages/player/index' } }
let startY = 0, deltaY = 0
function onTouchStart(e){ startY = e.touches?.[0]?.clientY || 0; deltaY = 0 }
function onTouchMove(e){ const y = e.touches?.[0]?.clientY || 0; deltaY = startY - y }
function onTouchEnd(){ if(deltaY > 40) close() }
onMounted(()=>{ setBottomSafe(!!track.value) })
</script>
<style scoped>
.mini{ position: fixed; left: 12px; right: 12px; bottom: 12px; z-index: 999; display:flex; align-items:center; gap:10px; padding:10px 12px; border-radius:14px; box-shadow: 0 6px 20px rgba(0,0,0,.2); backdrop-filter: blur(6px) }
.thumb{ width:40px; height:40px; border-radius:8px }
.info{ flex:1; display:flex; flex-direction:column }
.title{ font-size:14px; font-weight:600 }
.sub{ font-size:12px; color: var(--muted) }
.progress{ margin-top:6px; width:100%; height:4px; border-radius:999px; background: var(--input-bg); overflow:hidden }
.inner{ height:100%; background: var(--accent) }
.actions{ display:flex; align-items:center; gap:6px }
.icon{ padding:6px 10px; border-radius:10px; background: var(--input-bg); color: var(--fg) }
</style>
