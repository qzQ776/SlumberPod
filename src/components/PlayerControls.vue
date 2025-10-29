<template>
  <view class="controls">
    <view class="row">
      <button class="btn" @click="$emit('prev')">上一首</button>
      <button class="btn primary" @click="$emit('toggle')">{{ playing ? '暂停' : '播放' }}</button>
      <button class="btn" @click="$emit('next')">下一首</button>
    </view>
    <view class="row">
      <input class="range" type="range" min="0" :max="durationMs" :value="positionMs" @input="onSeek" />
    </view>
    <view class="row">
      <text>{{ format(positionMs) }} / {{ format(durationMs) }}</text>
    </view>
  </view>
</template>
<script setup>
const props = defineProps({ playing:Boolean, positionMs:Number, durationMs:Number, volume:Number, muted:Boolean, hasPrev:Boolean, hasNext:Boolean, loopMode:String })
const emit = defineEmits(['seek','toggle','prev','next','volume','muteToggle','toggleLoop'])
function onSeek(e){ emit('seek', Number(e.detail.value)) }
function onVolume(e){ emit('volume', Number(e.detail.value)) }
function format(ms){ const s=Math.floor(ms/1000); const mm=String(Math.floor(s/60)).padStart(2,'0'); const ss=String(s%60).padStart(2,'0'); return `${mm}:${ss}` }
</script>
<style scoped>
.controls{ padding:12px 16px; border-top:1px solid #eee; backdrop-filter:saturate(1.2) blur(6px) }
.row{ display:flex; align-items:center; justify-content:center; gap:10px; margin-top:8px }
.space-between{ justify-content:space-between }
.btn{ padding:8px 12px; border-radius:8px; background:#f2f3f5; color:#333; transition: all .2s ease }
.btn:active{ transform: scale(0.98) }
.primary{ background:#111; color:#fff }
.range{ width:100% }
.vol{ display:flex; align-items:center; gap:8px }
.vol-range{ width:120px }
</style>
