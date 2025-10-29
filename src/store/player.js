import { defineStore } from 'pinia'

export const usePlayerStore = defineStore('player', {
  state: () => ({
    currentTrack: null,
    isPlaying: false,
    playlist: [],
    positionMs: 0,
    durationMs: 0,
    volume: 0.8,
    isMuted: false,
    previousVolume: 0.8,
    loopMode: 'all',
  }),
  getters: {
    currentIndex(state){
      if (!state.currentTrack) return -1
      return state.playlist.findIndex(t=>t.id===state.currentTrack.id)
    },
    hasNext(state){
      if (state.playlist.length === 0) return false
      if (state.loopMode === 'all') return state.playlist.length > 1
      if (state.loopMode === 'one') return true
      // off
      const idx = state.playlist.findIndex(t=>t.id===state.currentTrack?.id)
      return idx >= 0 && idx < state.playlist.length - 1
    },
    hasPrev(state){
      if (state.playlist.length === 0) return false
      if (state.loopMode === 'all') return state.playlist.length > 1
      if (state.loopMode === 'one') return true
      // off
      const idx = state.playlist.findIndex(t=>t.id===state.currentTrack?.id)
      return idx > 0
    }
  },
  actions: {
    setPlaylist(list) { this.playlist = list || [] },
    play(track) {
      if (track) this.currentTrack = track
      this.isPlaying = true
    },
    pause() { this.isPlaying = false },
    setLoopMode(mode){ this.loopMode = mode },
    next() {
      if (!this.currentTrack || this.playlist.length === 0) return
      const idx = this.playlist.findIndex(t => t.id === this.currentTrack.id)
      if (this.loopMode === 'one') {
        // 继续当前
        this.isPlaying = true
        return
      }
      if (this.loopMode === 'off') {
        if (idx < 0 || idx === this.playlist.length - 1) return
        this.currentTrack = this.playlist[idx + 1]
        this.isPlaying = true
        return
      }
      // all 循环
      const nextIdx = (idx + 1) % this.playlist.length
      this.currentTrack = this.playlist[nextIdx]
      this.isPlaying = true
    },
    prev() {
      if (!this.currentTrack || this.playlist.length === 0) return
      const idx = this.playlist.findIndex(t => t.id === this.currentTrack.id)
      if (this.loopMode === 'one') {
        this.isPlaying = true
        return
      }
      if (this.loopMode === 'off') {
        if (idx <= 0) return
        this.currentTrack = this.playlist[idx - 1]
        this.isPlaying = true
        return
      }
      const prevIdx = (idx - 1 + this.playlist.length) % this.playlist.length
      this.currentTrack = this.playlist[prevIdx]
      this.isPlaying = true
    },
    seek(ms) { this.positionMs = Math.max(0, Math.min(ms, this.durationMs)) },
    setVolume(v) { this.volume = Math.max(0, Math.min(v, 1)) },
    toggleMute() {
      if (this.isMuted) {
        this.isMuted = false
        this.volume = this.previousVolume || 0.8
      } else {
        this.isMuted = true
        this.previousVolume = this.volume
        this.volume = 0
      }
    },
    addToQueue(track) {
      if (!track) return
      const exists = this.playlist.some(t => t.id === track.id)
      if (!exists) this.playlist = [...this.playlist, track]
    }
  }
})
