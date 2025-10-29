<template>
  <view>
    <slot />
    <MiniPlayer />
  </view>
</template>
<script>
import MiniPlayer from '@/components/MiniPlayer.vue'
import { usePlayerStore } from '@/stores/player'
import { getHour, getThemeByHour, baseColors, textColors } from '@/utils/timeTheme'
export default {
  components: { MiniPlayer },
  onLaunch() {
    const store = usePlayerStore()
    const s = uni.getStorageSync('playerState')
    if (s && typeof s === 'object') {
      store.playlist = s.playlist || []
      store.currentTrack = s.currentTrack || null
      store.positionMs = s.positionMs || 0
      store.durationMs = s.durationMs || 0
      store.volume = s.volume ?? 0.8
      store.isMuted = s.isMuted || false
      store.loopMode = s.loopMode || 'all'
    }
  },
  onShow() {
    const h = getHour()
    const t = getThemeByHour(h)
    try {
      uni.setNavigationBarColor({
        frontColor: textColors[t] === '#0f172a' ? '#000000' : '#ffffff',
        backgroundColor: baseColors[t]
      })
    } catch (e) {}
  },
  onHide() {
    const store = usePlayerStore()
    const s = {
      playlist: store.playlist,
      currentTrack: store.currentTrack,
      positionMs: store.positionMs,
      durationMs: store.durationMs,
      volume: store.volume,
      isMuted: store.isMuted,
      loopMode: store.loopMode,
    }
    uni.setStorageSync('playerState', s)
  }
}
</script>

<style>
/* 全局背景和文字颜色由 theme 驱动 */
html, body, #app { height: 100%; }
.page { min-height: 100vh; padding-bottom: var(--bottom-safe, 0); }
</style>
