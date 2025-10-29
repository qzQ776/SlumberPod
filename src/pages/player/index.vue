<template>
  <view class="page">
    <!-- Top small bar -->
    <view class="topbar">
      <button class="collapse" @click="uni.navigateBack()">˅</button>
      <button class="share">⤴</button>
    </view>

    <!-- Circular timer UI -->
    <view class="timer-wrap">
      <svg viewBox="0 0 300 300" class="timer-svg" ref="svgRef">
        <!-- outer ring -->
        <circle cx="150" cy="150" r="110" class="ring-bg" />
        <circle cx="150" cy="150" r="110" class="ring-progress" :stroke-dasharray="circumference" :stroke-dashoffset="circumference - (circumference * timerPercent)" />
        <!-- tick marks & numbers -->
        <g class="ticks">
          <circle cx="150" cy="40" r="3" class="tick" />
          <text x="150" y="30" class="tick-label">120</text>
          <circle cx="238" cy="150" r="3" class="tick" />
          <text x="250" y="154" class="tick-label">30</text>
          <circle cx="150" cy="260" r="3" class="tick" />
          <text x="150" y="275" class="tick-label">60</text>
          <circle cx="62" cy="150" r="3" class="tick" />
          <text x="38" y="154" class="tick-label">90</text>
          <!-- infinity at top center -->
          <text x="150" y="18" class="tick-label">∞</text>
        </g>

        <!-- three layered triangles -->
        <g class="triangles" transform="translate(150,150)">
          <!-- enlarged triangles -->
          <polygon points="0,-70 60,35 -60,35" class="tri tri1" />
          <polygon points="0,-110 95,60 -95,60" class="tri tri2" />
          <polygon points="0,-150 130,85 -130,85" class="tri tri3" />
        </g>

        <!-- knob -->
        <circle :cx="knobX" :cy="knobY" r="10" class="knob" @touchstart.stop.prevent="startDrag" @touchmove.stop.prevent="onDrag" @touchend.stop.prevent="endDrag" @mousedown.stop.prevent="startDragMouse" @mousemove.stop.prevent="onDragMouse" @mouseup.stop.prevent="endDragMouse" />
      </svg>
      <text class="timer-center" v-if="showTime">{{ formattedRemaining }}</text>

    </view>

    <!-- meta area -->
    <view class="meta">
      <text class="name">{{ playlistTitle }}</text>
      <text class="author">{{ threeNames }}</text>
    </view>

    <!-- small tags -->
    <view class="tags">
      <text class="tag">音量</text>
      <text class="tag">标注</text>
      <text class="tag">音效</text>
    </view>

    <!-- controls -->
    <view class="controls">
      <button class="ctrl" @click="showPlayModeModal = true">{{ getLoopIcon() }}</button>
      <button class="ctrl" @click="prev">◀◀</button>
      <button class="play-btn" @click="toggle">{{ store.isPlaying ? '⏸' : '▶' }}</button>
      <button class="ctrl" @click="next">▶▶</button>
      <button class="ctrl">≡</button>
    </view>

    <!-- Play Mode Modal -->
    <view class="modal-overlay" v-if="showPlayModeModal" @click="showPlayModeModal = false">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">播放设置</text>
          <button class="modal-close" @click="showPlayModeModal = false">×</button>
        </view>
        
        <!-- Play Mode Options -->
        <view class="modal-section">
          <text class="section-title">播放模式</text>
          <view class="mode-options">
            <view class="mode-option" :class="{ active: store.loopMode === 'one' }" @click="setLoopMode('one')">
              <text class="mode-icon">①</text>
              <text class="mode-label">单曲循环</text>
            </view>
            <view class="mode-option" :class="{ active: store.loopMode === 'all' }" @click="setLoopMode('all')">
              <text class="mode-icon">🔁</text>
              <text class="mode-label">列表循环</text>
            </view>
            <view class="mode-option" :class="{ active: store.loopMode === 'off' }" @click="setLoopMode('off')">
              <text class="mode-icon">→</text>
              <text class="mode-label">单曲一次</text>
            </view>
          </view>
        </view>
        
        <!-- Timer Options -->
        <view class="modal-section">
          <text class="section-title">定时关闭</text>
          <view class="timer-options">
            <view class="timer-option" :class="{ active: timerMinutes === 0 }" @click="setTimer(0)">
              <text class="timer-label">关闭</text>
            </view>
            <view class="timer-option" :class="{ active: timerMinutes === 15 }" @click="setTimer(15)">
              <text class="timer-label">15分钟</text>
            </view>
            <view class="timer-option" :class="{ active: timerMinutes === 30 }" @click="setTimer(30)">
              <text class="timer-label">30分钟</text>
            </view>
            <view class="timer-option" :class="{ active: timerMinutes === 45 }" @click="setTimer(45)">
              <text class="timer-label">45分钟</text>
            </view>
            <view class="timer-option" :class="{ active: timerMinutes === 60 }" @click="setTimer(60)">
              <text class="timer-label">60分钟</text>
            </view>
            <view class="timer-option" :class="{ active: timerMinutes === 90 }" @click="setTimer(90)">
              <text class="timer-label">90分钟</text>
            </view>
          </view>
          
          <!-- Custom Timer -->
          <view class="custom-timer">
            <text class="custom-label">自定义时间</text>
            <view class="custom-input-group">
              <input 
                class="custom-input" 
                type="number" 
                v-model="customTimerMinutes" 
                placeholder="分钟" 
                min="1" 
                max="120"
              />
              <button class="custom-confirm" @click="setCustomTimer">确定</button>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>
<script setup>
import { onLoad, onUnload } from '@dcloudio/uni-app'
import { computed, watch, ref, onMounted } from 'vue'
import PlayerControls from '@/components/PlayerControls.vue'
import { usePlayerStore } from '@/stores/player'
import { useHistoryStore } from '@/stores/history'
import { useFavoritesStore } from '@/stores/favorites'
import AudioService from '../../server/audioService.js'

const store = usePlayerStore()
const historyStore = useHistoryStore()
const favStore = useFavoritesStore(); favStore.load()
historyStore.load()
const track = computed(()=> store.currentTrack)
const isFav = computed(()=> !!track.value && favStore.items.some(x=>x.id===track.value.id))
function toggleFav(){ if(!track.value) return; favStore.toggle(track.value) }

// three selected noises (for triangle corners)
const threeTracks = ref([null,null,null])
const playlistTitle = computed(()=> '白噪音')
const threeNames = computed(()=> threeTracks.value.map(n=>n?.name||'').filter(Boolean).join(' | '))
function getNoiseIcon(n){ if(!n) return '♪'; return getNoiseIconFromName(n.name) }
function getNoiseIconFromName(name){ const map = { '海浪':'🌊','雨声':'🌧️','壁炉':'🔥','树林':'🌲','地铁':'🚇' }; return map[name] || '🎵' }

// positions for triangle corner icons (absolute px)
const threePositions = ref([{left:0,top:0},{left:0,top:0},{left:0,top:0}])
function updateTriPositions(){
  const svgRect = svgRef.value?.getBoundingClientRect?.() || null
  if(!svgRect) return

n  // compute center and scale based on SVG (300x300 viewBox)
  const scale = svgRect.width / 300
  const cx = svgRect.left + (150 * scale)
  const cy = svgRect.top + (150 * scale)
  // place icons evenly around outer ring, slightly outside radius
  const outerRadius = 110 * scale
  const offsetOut = 36 * scale // distance beyond ring to place icons
  const r = outerRadius + offsetOut
  // angles for three icons: top (-90deg), bottom-left (150deg), bottom-right (30deg)
  const angles = [-90, 150, 30]
  threePositions.value = angles.map(a=>{
    const rad = a * Math.PI / 180
    const x = cx + r * Math.cos(rad)
    const y = cy + r * Math.sin(rad)
    return { left: x + 'px', top: y + 'px' }
  })
}
function triStyle(idx){ const p = threePositions.value[idx] || {left:'0px', top:'0px'}; return { left: p.left, top: p.top, transform: 'translate(-50%,-50%)' } }



// timer UI state
const svgRef = ref(null)
const radius = 110
const circumference = 2 * Math.PI * radius
const knobAngle = ref(0)
const durationMinutes = ref(30)
const remainingSeconds = ref(durationMinutes.value*60)
const timerPercent = computed(()=> (knobAngle.value % 360) / 360)
const formattedRemaining = computed(()=>{
  const mm = String(Math.floor(remainingSeconds.value/60)).padStart(2,'0')
  const ss = String(remainingSeconds.value%60).padStart(2,'0')
  return `${mm}:${ss}`
})
const knobPos = computed(()=>{
  const ang = (knobAngle.value - 90) * (Math.PI/180)
  const x = 150 + radius * Math.cos(ang)
  const y = 150 + radius * Math.sin(ang)
  return { x, y }
})
const knobX = computed(()=> knobPos.value.x)
const knobY = computed(()=> knobPos.value.y)


let timerId = null
let dragging = false
const showTime = ref(false)
let hideTimeout = null
let startPoint = null

// Play mode modal
const showPlayModeModal = ref(false)
const timerMinutes = ref(0)
const customTimerMinutes = ref('')

// Get loop mode icon
function getLoopIcon() {
  switch(store.loopMode) {
    case 'one': return '①'
    case 'all': return '🔁'
    case 'off': return '→'
    default: return '①'
  }
}

// Set loop mode
function setLoopMode(mode) {
  store.setLoopMode(mode)
}

// Set timer
function setTimer(minutes) {
  timerMinutes.value = minutes
  if (minutes === 0) {
    cancelTimer()
  } else {
    durationMinutes.value = minutes
    remainingSeconds.value = minutes * 60
    knobAngle.value = (minutes / 120) * 360
    startTimer()
  }
  showPlayModeModal.value = false
}

// Set custom timer
function setCustomTimer() {
  const minutes = parseInt(customTimerMinutes.value)
  if (minutes && minutes >= 1 && minutes <= 120) {
    setTimer(minutes)
    customTimerMinutes.value = ''
  }
}

function startDrag(e){ 
  e.preventDefault?.();
  dragging = true; 
  if(hideTimeout) clearTimeout(hideTimeout); 
  startPoint = e && e.touches && e.touches[0] ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null; 
}
function startDragMouse(e){ 
  e.preventDefault?.();
  dragging = true; 
  if(hideTimeout) clearTimeout(hideTimeout); 
  startPoint = { x: e.clientX, y: e.clientY } 
}

function toggleCorner(idx){ const n = threeTracks.value[idx]; if(!n) return; // toggle individual play
  const exists = store.playlist.some(t=>t.id===n.id)
  if(!exists) store.addToQueue(n)
  // play single track
  store.play(n)
}
function onDrag(e){ 
  if(!dragging) return; 
  e.preventDefault?.();
  showTime.value = true; 
  const touch = e.touches && e.touches[0]; 
  if(!touch) return; 
  const rect = svgRef.value?.getBoundingClientRect?.() || { left:0, top:0, width:300, height:300 }; 
  const cx = rect.left + (rect.width/2); 
  const cy = rect.top + (rect.height/2); 
  const dx = touch.clientX - cx; 
  const dy = touch.clientY - cy; 
  let ang = Math.atan2(dy, dx) * 180 / Math.PI + 90; 
  if(ang < 0) ang += 360; 
  knobAngle.value = ang; 
  durationMinutes.value = Math.round((ang / 360) * 120); 
  remainingSeconds.value = durationMinutes.value * 60 
}
function onDragMouse(e){ 
  if(!dragging) return; 
  e.preventDefault?.();
  showTime.value = true; 
  const rect = svgRef.value?.getBoundingClientRect?.() || { left:0, top:0, width:300, height:300 }; 
  const cx = rect.left + (rect.width/2); 
  const cy = rect.top + (rect.height/2); 
  const dx = e.clientX - cx; 
  const dy = e.clientY - cy; 
  let ang = Math.atan2(dy, dx) * 180 / Math.PI + 90; 
  if(ang < 0) ang += 360; 
  knobAngle.value = ang; 
  durationMinutes.value = Math.round((ang / 360) * 120); 
  remainingSeconds.value = durationMinutes.value * 60 
}
function endDrag(e){ 
  e.preventDefault?.();
  dragging=false; 
  if(hideTimeout) clearTimeout(hideTimeout); 
  hideTimeout = setTimeout(()=>{ showTime.value = false; hideTimeout = null }, 800) 
}
function endDragMouse(e){ 
  e.preventDefault?.();
  dragging=false; 
  if(hideTimeout) clearTimeout(hideTimeout); 
  hideTimeout = setTimeout(()=>{ showTime.value = false; hideTimeout = null }, 800) 
}

function startTimer(){ if(timerId) clearInterval(timerId); remainingSeconds.value = durationMinutes.value*60; timerId = setInterval(()=>{ remainingSeconds.value -=1; if(remainingSeconds.value <=0){ clearInterval(timerId); timerId=null; // stop playback and close page
      store.pause(); try{ uni.navigateBack() }catch(e){ /* no-op */ }
    } }, 1000) }
function cancelTimer(){ if(timerId){ clearInterval(timerId); timerId=null } }

let audioCtx

onLoad((query)=>{
  audioCtx = uni.createInnerAudioContext()
  audioCtx.autoplay = false
  audioCtx.obeyMuteSwitch = false
  audioCtx.src = ''

  audioCtx.onCanplay(()=>{
    if (audioCtx.duration) store.durationMs = audioCtx.duration * 1000
    if (store.isPlaying) audioCtx.play()
  })
  audioCtx.onTimeUpdate(()=>{
    store.positionMs = audioCtx.currentTime * 1000
  })
  audioCtx.onEnded(()=>{
    store.isPlaying = false
  })

  if(query?.id){
    // 从后端获取音频详情
    AudioService.getAudioDetail(query.id)
      .then(audio => {
        const target = {
          id: audio.id,
          name: audio.title,
          cover: audio.cover_url || '/static/images/default-cover.jpg',
          duration: audio.duration,
          url: audio.audio_url
        }
        if(target){
      store.setPlaylist(allNoises)
      store.play(target)
      historyStore.add(target)
      audioCtx.src = target.src
      store.durationMs = 180000
    }
  } else if (store.currentTrack) {
    audioCtx.src = store.currentTrack.src
  }
})

onUnload(()=>{
  try { audioCtx?.stop(); audioCtx?.destroy() } catch(e) {}
})
function toggle(){
  if (!store.currentTrack) return
  if (store.isPlaying) { fadePause() }
  else { fadePlay() }
}
async function fadePlay(){
  store.play()
  audioCtx.volume = 0
  audioCtx.play()
  await rampVolume(store.volume, 400)
}
async function fadePause(){
  await rampVolume(0, 400)
  audioCtx.pause()
  store.pause()
}
function rampVolume(target, ms){
  return new Promise(resolve=>{
    const steps = 10
    const start = audioCtx.volume
    const delta = (target-start)/steps
    let i=0
    const id = setInterval(()=>{
      i++
      audioCtx.volume = Math.max(0, Math.min(1, start + delta*i))
      if(i>=steps){ clearInterval(id); resolve() }
    }, ms/steps)
  })
}

function seek(ms){
  store.seek(ms)
  audioCtx.seek(ms/1000)
}
function setVolume(v){
  store.setVolume(v)
  audioCtx.volume = store.volume
}
function muteToggle(){
  store.toggleMute()
  audioCtx.volume = store.volume
}
function toggleLoop(){
  const nextMode = store.loopMode==='all' ? 'one' : store.loopMode==='one' ? 'off' : 'all'
  store.setLoopMode(nextMode)
}
function prev(){
  store.prev()
  if (store.currentTrack) { historyStore.add(store.currentTrack); audioCtx.src = store.currentTrack.src; fadePlay() }
}
function next(){
  store.next()
  if (store.currentTrack) { historyStore.add(store.currentTrack); audioCtx.src = store.currentTrack.src; fadePlay() }
}
function goQueue(){ uni.navigateTo({ url:'/pages/queue/index' }) }

watch(()=>store.volume, v=>{ if(audioCtx) audioCtx.volume = v })

onMounted(()=>{
  // initialize knob position from durationMinutes and pick three random noises from playlist
  knobAngle.value = (durationMinutes.value/120) * 360
  const pool = store.playlist.length ? store.playlist : allNoises
  const shuffled = [...pool].sort(()=>0.5 - Math.random())
  threeTracks.value = [shuffled[0]||null, shuffled[1]||null, shuffled[2]||null]
  // compute triangle icon positions after render
  setTimeout(updateTriPositions, 120)
  window.addEventListener?.('resize', updateTriPositions)
})
</script>
<style scoped>
.page{ min-height:100vh; padding-bottom: 24px; background: linear-gradient(180deg,#294a45 0%, #21363a 60%, #0f1516 100%); color: #fff; }
.topbar{ display:flex; justify-content:space-between; align-items:center; padding:10px 12px; position:relative }
.collapse, .share{ background:transparent; border:none; color:#fff; font-size:18px }
.collapse{ position:absolute; left:12px; top:10px }
.share{ position:absolute; right:12px; top:10px }

.nav{ display:flex; justify-content:space-between; align-items:center; padding: 0 16px }
.btn{ padding:6px 10px; border-radius:6px; background:#f2f3f5 }
.heart{ padding:6px 10px; border-radius:999px; background: var(--input-bg); color: var(--fg) }
.cover-wrap{ padding:24px 16px; display:flex; justify-content:center }
.cover{ width:220px; height:220px; border-radius:50%; box-shadow: 0 4px 18px rgba(0,0,0,.15); overflow:hidden }
.spinning{ animation: spin 6s linear infinite }
@keyframes spin{ from{ transform: rotate(0deg) } to{ transform: rotate(360deg) } }
.meta{ padding: 0 16px }
.name{ font-size:18px; font-weight:600; color:#111 }
.author{ margin-top:4px; font-size:14px; color:#666 }
.count{ margin-top:4px; font-size:12px; color:#999 }
.timer-wrap{ padding:28px 0; display:flex; flex-direction:column; align-items:center }
.timer-svg{ width:300px; height:300px }
.ring-bg{ fill:none; stroke:rgba(255,255,255,0.08); stroke-width:6 }
.ring-progress{ fill:none; stroke:#fff; stroke-width:6; transform:rotate(-90deg); transform-origin:center; transition: stroke-dashoffset 300ms linear }
.knob{ fill:#fff; filter: drop-shadow(0 6px 14px rgba(0,0,0,0.35)) }
.timer-center{ position:absolute; left:0; right:0; top:50%; transform:translateY(-50%); font-size:28px; color:#fff; text-align:center; font-weight:700 }
.timer-wrap{ height:420px; position:relative; display:flex; align-items:center; justify-content:center }
.triangle-icons{ position:absolute; left:0; top:0; right:0; bottom:0; pointer-events:none }
.tri-icon{ position:absolute; display:flex; flex-direction:column; align-items:center; pointer-events:auto }
.tri-btn{ width:44px; height:44px; border-radius:22px; background:#fff; display:flex; align-items:center; justify-content:center; border:none }
.tri-label{ margin-top:6px; color:#fff; font-size:12px }
.tri-icon{ position:absolute }
.triangle-icons{ position:relative }
.tri-icon{ left:50%; top:50%; transform:translate(-50%,-50%) }
/* position classes for triangle corner icons relative to timer-wrap center */
.tri-icon.pos-0{ transform: translate(-50%,-50%) translateY(-110px) }
.tri-icon.pos-1{ transform: translate(-50%,-50%) translate(95px,55px) }
.tri-icon.pos-2{ transform: translate(-50%,-50%) translate(-95px,55px) }

/* ensure triangle icons are positioned over the timer, not page bottom */
.timer-wrap{ height:420px; position:relative; display:flex; align-items:center; justify-content:center }
.triangle-icons{ position:absolute; left:0; top:0; right:0; bottom:0; pointer-events:none }
.tri-icon{ position:absolute; left:50%; top:50% }

.ticks .tick{ fill:rgba(255,255,255,0.6) }
.tick-label{ font-size:12px; fill:rgba(255,255,255,0.6); text-anchor:middle }
.triangles .tri{ fill:rgba(255,255,255,0.04) }
.triangles .tri2{ fill:rgba(255,255,255,0.06) }
.triangles .tri3{ fill:rgba(255,255,255,0.08) }
.icons-row{ display:flex; justify-content:space-between; padding:12px 36px }
.icon-left, .icon-right{ color:#fff; opacity:0.8 }
.meta{ padding: 18px 16px }
.name{ font-size:20px; color:#fff; font-weight:700 }
.author{ margin-top:6px; color:#ddd }
.tags{ display:flex; gap:10px; padding:8px 16px }
.tag{ background:rgba(255,255,255,0.06); color:#fff; padding:6px 8px; border-radius:8px }
.controls{ display:flex; align-items:center; justify-content:space-around; padding:18px 36px }
.play-btn{ width:72px; height:72px; border-radius:36px; background:#fff; color:#111; display:flex; align-items:center; justify-content:center; font-size:26px }
.ctrl{ background:transparent; border:none; color:#fff }

/* Modal Styles */
.modal-overlay{ position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.7); display:flex; align-items:center; justify-content:center; z-index:1000 }
.modal-content{ background:#2a3a3a; border-radius:16px; padding:20px; width:320px; max-width:90vw; max-height:80vh; overflow-y:auto }
.modal-header{ display:flex; justify-content:space-between; align-items:center; margin-bottom:20px }
.modal-title{ font-size:18px; font-weight:600; color:#fff }
.modal-close{ background:none; border:none; color:#fff; font-size:24px; width:30px; height:30px; display:flex; align-items:center; justify-content:center }

.modal-section{ margin-bottom:24px }
.section-title{ font-size:14px; color:#ccc; margin-bottom:12px; display:block }

.mode-options{ display:flex; flex-direction:column; gap:8px }
.mode-option{ display:flex; align-items:center; padding:12px 16px; background:rgba(255,255,255,0.05); border-radius:8px; border:1px solid rgba(255,255,255,0.1) }
.mode-option.active{ background:rgba(255,255,255,0.15); border-color:rgba(255,255,255,0.3) }
.mode-icon{ font-size:18px; margin-right:12px; width:24px; text-align:center }
.mode-label{ font-size:14px; color:#fff }

.timer-options{ display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:16px }
.timer-option{ padding:12px 8px; background:rgba(255,255,255,0.05); border-radius:8px; border:1px solid rgba(255,255,255,0.1); text-align:center }
.timer-option.active{ background:rgba(255,255,255,0.15); border-color:rgba(255,255,255,0.3) }
.timer-label{ font-size:14px; color:#fff }

.custom-timer{ margin-top:16px }
.custom-label{ font-size:14px; color:#ccc; margin-bottom:8px; display:block }
.custom-input-group{ display:flex; gap:8px }
.custom-input{ flex:1; background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); border-radius:8px; padding:8px 12px; color:#fff; font-size:14px }
.custom-input::placeholder{ color:#999 }
.custom-confirm{ background:#4a9; border:none; border-radius:8px; padding:8px 16px; color:#fff; font-size:14px }
</style>
